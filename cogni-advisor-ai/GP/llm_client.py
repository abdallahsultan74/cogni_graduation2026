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
        load_dotenv(_DOTENV_PATH, override=False)
except ImportError:
    pass


logger = logging.getLogger(__name__)

GEMINI_DEFAULT_MODEL = "gemini-flash-latest"
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


def _call_gemini(user_prompt: str, system_prompt: str, *, temperature: float, max_tokens: int) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "LLM Error: GEMINI_API_KEY is not set."
    model = os.getenv("GEMINI_MODEL", GEMINI_DEFAULT_MODEL)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    try:
        response = requests.post(
            url=url,
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            data=json.dumps(
                {
                    "system_instruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens,
                    },
                }
            ),
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        candidates = payload.get("candidates") or []
        if not candidates:
            return scrub_key(f"LLM Error: empty Gemini response - {payload}", api_key)
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts).strip()
        return text or scrub_key(f"LLM Error: empty Gemini text - {payload}", api_key)
    except Exception as exc:
        return scrub_key(f"LLM Error: {exc}", api_key)


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