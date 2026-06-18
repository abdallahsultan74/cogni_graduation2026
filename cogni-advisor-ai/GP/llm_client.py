"""Provider-agnostic LLM client used by both chatbot and recommendation.

Auto-routes to Gemini (preferred) or OpenRouter based on which API key is
present in the environment / .env file. Importing this module is cheap —
it doesn't load embeddings or any heavyweight ML deps, so it's safe to
use from latency-sensitive request paths.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv

    _DOTENV_PATH = Path(__file__).resolve().parent / ".env"
    if _DOTENV_PATH.exists():
        load_dotenv(_DOTENV_PATH, override=True)
except ImportError:
    pass


logger = logging.getLogger(__name__)

GEMINI_DEFAULT_MODEL = "gemini-flash-latest"
# Deprecated aliases that return 404/400 — never use as primary.
GEMINI_DEPRECATED = frozenset(
    {
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-pro",
    }
)
GEMINI_FALLBACK_MODELS = (
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
)
OPENROUTER_DEFAULT_MODEL = "deepseek/deepseek-chat-v3.1:free"


def resolve_provider() -> str:
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit in {"gemini", "openrouter"}:
        return explicit
    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    if os.getenv("OPENROUTER_API_KEY"):
        return "openrouter"
    return "gemini"


def scrub_key(text: str, api_key: str | None = None) -> str:
    if not text:
        return text
    out = str(text)
    if api_key:
        out = out.replace(api_key, "***REDACTED***")
    out = re.sub(r"key=[A-Za-z0-9_\-]+", "key=***REDACTED***", out)
    out = re.sub(r"Bearer\s+[A-Za-z0-9_\-]+", "Bearer ***REDACTED***", out)
    return out


def _gemini_model_candidates() -> list[str]:
    configured = os.getenv("GEMINI_MODEL", GEMINI_DEFAULT_MODEL).strip()
    models: list[str] = []
    if configured and configured not in GEMINI_DEPRECATED:
        models.append(configured)
    for m in GEMINI_FALLBACK_MODELS:
        if m not in models:
            models.append(m)
    return models


def _friendly_gemini_error(status_code: int, payload: dict | None) -> str:
    err = (payload or {}).get("error") or {}
    message = str(err.get("message") or "").lower()
    if status_code == 404 or "not found" in message:
        return "LLM Error: نموذج Gemini غير متاح. حدّث GEMINI_MODEL إلى gemini-flash-latest وأعد تشغيل خدمة AI."
    if status_code == 400 and "api key" in message:
        return "LLM Error: مفتاح GEMINI_API_KEY غير صالح. أنشئ مفتاحاً من Google AI Studio."
    if status_code == 429 or "quota" in message:
        return "LLM Error: تم تجاوز حد استخدام Gemini. حاول لاحقاً أو فعّل الفوترة."
    if status_code in {500, 503} or "unavailable" in message:
        return "LLM Error: خدمة Gemini مشغولة مؤقتاً. حاول مرة أخرى بعد قليل."
    return f"LLM Error: تعذّر الاتصال بـ Gemini (HTTP {status_code})."


def _call_gemini_once(
    api_key: str,
    model: str,
    user_prompt: str,
    system_prompt: str,
    *,
    temperature: float,
    max_tokens: int,
) -> tuple[str | None, str | None]:
    """Return (text, error_message). error_message is set when the call failed."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    try:
        response = requests.post(
            url=url,
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            },
            timeout=60,
        )
        try:
            payload = response.json()
        except ValueError:
            payload = None

        if not response.ok:
            return None, _friendly_gemini_error(response.status_code, payload)

        candidates = (payload or {}).get("candidates") or []
        if not candidates:
            return None, "LLM Error: استجابة فارغة من Gemini."
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts).strip()
        if text:
            return text, None
        return None, "LLM Error: استجابة فارغة من Gemini."
    except requests.RequestException as exc:
        return None, scrub_key(f"LLM Error: {exc}", api_key)


def _call_gemini(user_prompt: str, system_prompt: str, *, temperature: float, max_tokens: int) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "LLM Error: GEMINI_API_KEY is not set."

    models = _gemini_model_candidates()
    last_error = "LLM Error: فشل الاتصال بـ Gemini."
    for model in models:
        logger.info("Gemini request model=%s", model)
        text, err = _call_gemini_once(
            api_key,
            model,
            user_prompt,
            system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if text:
            return text
        last_error = err or last_error
        # Retry on model-not-found / overload; stop on auth/key errors.
        if err and "api key" in err.lower():
            return err

    return last_error


def _call_openrouter(user_prompt: str, system_prompt: str, *, temperature: float, max_tokens: int) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return "LLM Error: OPENROUTER_API_KEY is not set."
    model_name = os.getenv("OPENROUTER_MODEL", OPENROUTER_DEFAULT_MODEL)

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-Title": "CogniAdvisor",
            },
            data=json.dumps(
                {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
            ),
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        return scrub_key(f"LLM Error: {exc}", api_key)


def call_llm(
    user_prompt: str,
    system_prompt: str,
    *,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str:
    provider = resolve_provider()
    if provider == "gemini":
        return _call_gemini(user_prompt, system_prompt, temperature=temperature, max_tokens=max_tokens)
    return _call_openrouter(user_prompt, system_prompt, temperature=temperature, max_tokens=max_tokens)


def is_llm_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENROUTER_API_KEY"))