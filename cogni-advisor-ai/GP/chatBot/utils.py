"""RAG pipeline for the EELU bylaw chatbot.

Embedding model: ``BAAI/bge-base-en-v1.5`` (no query/passage prefix needed).
Vector store: FAISS (local, file-backed at ``bylaws_vector_index/``).

If the embedding model changes the local index becomes incompatible — call
:func:`rebuild_vector_store` (or run ``python -m chatBot.rebuild_index``)
to regenerate it.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any

import requests
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

try:  # python-dotenv is a transitive dep via langchain; loading is best-effort
    from dotenv import load_dotenv

    _DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"
    if _DOTENV_PATH.exists():
        load_dotenv(_DOTENV_PATH, override=True)
except ImportError:  # pragma: no cover
    pass


logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
DEFAULT_PROMPT_PATH = BASE_DIR / "prompts" / "system_prompt.txt"
DEFAULT_VECTORSTORE_DIR = BASE_DIR.parent / "bylaws_vector_index"
EMBEDDING_MODEL_NAME = os.environ.get("EELU_EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
INDEX_METADATA_FILE = "index_metadata.json"

_embeddings: Any = None
_vector_store: Any = None
_retriever: Any = None
_llm_cache: dict[str, str] = {}


def get_embeddings():
    """Get or create the embeddings instance (singleton)."""
    global _embeddings
    if _embeddings is None:
        logger.info("Loading embeddings model: %s", EMBEDDING_MODEL_NAME)
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.info("Embeddings model loaded.")
    return _embeddings


def reset_vector_store_cache() -> None:
    """Clear cached retriever/vector store so a rebuild can be reloaded."""
    global _vector_store, _retriever
    _vector_store = None
    _retriever = None


def clear_llm_cache() -> None:
    """Drop cached LLM answers — call after rebuilding the index."""
    _llm_cache.clear()


def get_prompt_text(prompt_path=DEFAULT_PROMPT_PATH) -> str:
    prompt_file = Path(prompt_path)
    if prompt_file.exists():
        return prompt_file.read_text(encoding="utf-8").strip()
    return (
        "You are an academic bylaws assistant for EELU. "
        "Answer only from the retrieved policy context. "
        "Do not cite raw JSON paths or internal data structures. "
        "If the answer is not supported by the provided context, say so clearly."
    )


def _format_value(value: Any) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if value is None:
        return "not specified"
    return str(value)


def _humanize_key(key: str) -> str:
    return key.replace("_", " ").strip()


def _flatten_for_chunk(data: Any, depth: int = 0) -> list[str]:
    """Flatten JSON into prose-ish lines.

    Output is meant for a retriever, not a structural dump. Keys are
    humanized (`min_credit_hours` → `min credit hours`) and nesting is
    rendered with indentation rather than `key -> key -> [idx]` paths so
    the LLM does not echo internal structure verbatim.
    """
    indent = "  " * depth
    lines: list[str] = []

    if isinstance(data, dict):
        for key, value in data.items():
            label = _humanize_key(str(key))
            if isinstance(value, (dict, list)):
                lines.append(f"{indent}{label}:")
                lines.extend(_flatten_for_chunk(value, depth + 1))
            else:
                lines.append(f"{indent}{label}: {_format_value(value)}")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                lines.append(f"{indent}-")
                lines.extend(_flatten_for_chunk(item, depth + 1))
            else:
                lines.append(f"{indent}- {_format_value(item)}")
    else:
        lines.append(f"{indent}{_format_value(data)}")

    return lines


_DISTRIBUTION_BLOCK_ALIASES: dict[str, str] = {
    "first_year_first_semester": (
        "First year first semester | السنة الأولى الترم الأول | سنة أولى ترم أول"
    ),
    "first_year_second_semester": (
        "First year second semester | السنة الأولى الترم الثاني | سنة أولى ترم تاني"
    ),
    "second_year_first_semester": (
        "Second year first semester | السنة الثانية الترم الأول | سنة تانية ترم أول"
    ),
    "second_year_second_semester": (
        "Second year second semester | السنة الثانية الترم الثاني | سنة تانية ترم تاني"
    ),
    "third_year_first_semester": (
        "Third year first semester | السنة الثالثة الترم الأول"
    ),
    "third_year_second_semester": (
        "Third year second semester | السنة الثالثة الترم الثاني"
    ),
    "fourth_year_first_semester": (
        "Fourth year first semester | السنة الرابعة الترم الأول"
    ),
    "fourth_year_second_semester": (
        "Fourth year second semester | السنة الرابعة الترم الثاني"
    ),
}


def _json_chunks(path: Path) -> list[tuple[str, str]]:
    """Return a list of ``(source_label, content)`` chunks from one JSON file.

    Structured eelulaw exports (articles list, distribution blocks) are chunked
    by section for better retrieval. Flat dicts still chunk per top-level key.
    """
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)

    chunks: list[tuple[str, str]] = []
    rel = path.name

    if isinstance(data, dict) and isinstance(data.get("articles"), list):
        for article in data["articles"]:
            if not isinstance(article, dict):
                continue
            aid = article.get("id", "?")
            title = article.get("title_en") or article.get("title") or f"Article {aid}"
            body = "\n".join(_flatten_for_chunk(article))
            chunks.append((rel, f"Article {aid}: {title}\n{body}"))
        return chunks or [(rel, "\n".join(_flatten_for_chunk(data)))]

    if isinstance(data, dict) and isinstance(data.get("blocks"), list):
        for block in data["blocks"]:
            if not isinstance(block, dict):
                continue
            key = str(block.get("key") or "")
            label = block.get("label") or key or "distribution block"
            aliases = _DISTRIBUTION_BLOCK_ALIASES.get(key, "")
            course_codes = [
                str(c.get("code"))
                for c in (block.get("courses") or [])
                if isinstance(c, dict) and c.get("code")
            ]
            header = f"{label}"
            if aliases:
                header += f"\nSearch aliases: {aliases}"
            if course_codes:
                header += f"\nCourse codes: {', '.join(course_codes)}"
            body = "\n".join(_flatten_for_chunk(block))
            chunks.append((rel, f"{header}\n{body}"))
        return chunks

    if isinstance(data, dict) and isinstance(data.get("courses"), dict):
        courses_map = data["courses"]
        batch: list[str] = []
        for code, meta in sorted(courses_map.items()):
            if not isinstance(meta, dict):
                continue
            batch.append(f"{code}: {meta.get('title', '')}\n{meta.get('description', '')}")
            if len(batch) >= 8:
                chunks.append((rel, "Course descriptions\n" + "\n\n".join(batch)))
                batch = []
        if batch:
            chunks.append((rel, "Course descriptions\n" + "\n\n".join(batch)))
        return chunks

    if isinstance(data, dict):
        for key, value in data.items():
            label = _humanize_key(str(key))
            body = "\n".join(_flatten_for_chunk(value))
            chunks.append((path.name, f"{label}\n{body}"))
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            body = "\n".join(_flatten_for_chunk(item))
            chunks.append((path.name, f"item {idx + 1}\n{body}"))
    else:
        chunks.append((path.name, _format_value(data)))
    return chunks


def load_source_documents(folder_path):
    """Load every supported RAG source file as ``(source, content)`` pairs.

    Supported suffixes: ``.json``, ``.txt``, ``.md``.
    """
    source_dir = Path(folder_path)
    if not source_dir.exists():
        raise FileNotFoundError(f"RAG source folder not found: {source_dir}")

    pairs: list[tuple[str, str]] = []
    supported_suffixes = {".json", ".txt", ".md"}

    for path in sorted(source_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in supported_suffixes:
            continue
        if "_archive" in path.parts:
            continue

        rel = path.relative_to(source_dir).as_posix()

        if path.suffix.lower() == ".json":
            for source, content in _json_chunks(path):
                pairs.append((rel, content))
            continue

        text = path.read_text(encoding="utf-8")
        if text.strip():
            pairs.append((rel, text))

    supplemental_dir = BASE_DIR.parent / "recommendation" / "data"
    policy_path = supplemental_dir / "policy.json"
    if policy_path.is_file():
        for source, content in _json_chunks(policy_path):
            pairs.append((f"recommendation/{policy_path.name}", content))

    bylaw_path = supplemental_dir / "bylaw_in.json"
    if bylaw_path.is_file():
        with bylaw_path.open(encoding="utf-8") as handle:
            bylaw = json.load(handle)
        fact_keys = (
            "minimum_attendance_percentage",
            "max_credit_hours_summer_semester",
            "max_credit_hours_summer_semester_with_approval_for_graduation",
            "max_credit_hours_main_semesters",
            "max_credit_hours_main_semesters_with_approval_for_graduation",
            "min_credit_hours_main_semesters",
            "bachelor_degree_required_credit_hours",
            "consequence_of_low_attendance",
        )
        facts = {k: bylaw[k] for k in fact_keys if k in bylaw}
        if facts:
            body = "\n".join(_flatten_for_chunk(facts))
            pairs.append(
                (
                    "recommendation/bylaw_in.json",
                    "Key academic policy facts\n" + body,
                )
            )

    if not pairs:
        raise ValueError(f"No supported source files found in {source_dir}")

    return pairs


# Back-compat alias preserved for any external callers / tests.
def load_source_texts(folder_path):
    return [f"{name}\n{content}" for name, content in load_source_documents(folder_path)]


def _index_metadata_path(vectorstore_dir: Path) -> Path:
    return vectorstore_dir / INDEX_METADATA_FILE


def _write_index_metadata(vectorstore_dir: Path) -> None:
    _index_metadata_path(vectorstore_dir).write_text(
        json.dumps({"embedding_model": EMBEDDING_MODEL_NAME}, indent=2),
        encoding="utf-8",
    )


def _index_is_compatible(vectorstore_dir: Path) -> bool:
    meta_path = _index_metadata_path(vectorstore_dir)
    if not meta_path.exists():
        return False
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    return meta.get("embedding_model") == EMBEDDING_MODEL_NAME


def create_vector_store(
    folder_path=DEFAULT_DATA_DIR,
    vectorstore_path=DEFAULT_VECTORSTORE_DIR,
    force_rebuild: bool = False,
):
    global _vector_store

    vectorstore_dir = Path(vectorstore_path)
    index_file = vectorstore_dir / "index.faiss"

    if _vector_store is not None and not force_rebuild:
        return _vector_store

    if force_rebuild and vectorstore_dir.exists():
        reset_vector_store_cache()
        shutil.rmtree(vectorstore_dir)

    embeddings = get_embeddings()

    if index_file.exists() and _index_is_compatible(vectorstore_dir) and not force_rebuild:
        _vector_store = FAISS.load_local(
            str(vectorstore_dir),
            embeddings,
            allow_dangerous_deserialization=True,
        )
        logger.info("Loaded existing FAISS index from %s", vectorstore_dir)
        return _vector_store

    if index_file.exists() and not _index_is_compatible(vectorstore_dir):
        logger.warning(
            "Index at %s was built with a different embedding model; rebuilding.",
            vectorstore_dir,
        )
        reset_vector_store_cache()
        shutil.rmtree(vectorstore_dir)

    logger.info("Building new FAISS index from %s", folder_path)
    pairs = load_source_documents(folder_path)
    splitter = RecursiveCharacterTextSplitter(chunk_size=1024, chunk_overlap=150)

    chunks: list[tuple[str, str]] = []
    for source, content in pairs:
        for piece in splitter.split_text(content):
            chunks.append((source, piece))

    if not chunks:
        raise RuntimeError(f"No chunks generated from {folder_path}; check source files.")

    texts = [piece for _, piece in chunks]
    metadatas = [{"source": source} for source, _ in chunks]

    _vector_store = FAISS.from_texts(texts=texts, embedding=embeddings, metadatas=metadatas)
    vectorstore_dir.mkdir(parents=True, exist_ok=True)
    _vector_store.save_local(str(vectorstore_dir))
    _write_index_metadata(vectorstore_dir)
    clear_llm_cache()
    logger.info("New vector store saved at %s with %d chunks.", vectorstore_dir, len(chunks))
    return _vector_store


def rebuild_vector_store(folder_path=DEFAULT_DATA_DIR, vectorstore_path=DEFAULT_VECTORSTORE_DIR):
    """Force a full rebuild of the FAISS store from the configured source folder."""
    return create_vector_store(
        folder_path=folder_path,
        vectorstore_path=vectorstore_path,
        force_rebuild=True,
    )


def get_retriever():
    """Get or create the retriever instance (singleton)."""
    global _retriever
    if _retriever is None:
        vector_store = create_vector_store()
        _retriever = vector_store.as_retriever(search_kwargs={"k": 8})
    return _retriever


def call_llm(prompt: str) -> str:
    """Run a chatbot answer through the shared LLM client using the
    bylaw-grounded system prompt. Provider-routing + error scrubbing
    live in ``llm_client``."""
    from llm_client import call_llm as _shared_call_llm
    return _shared_call_llm(prompt, get_prompt_text(), temperature=0.2, max_tokens=2048)


def _is_arabic(text: str) -> bool:
    return any("\u0600" <= ch <= "\u06ff" for ch in text)


def _extract_user_question(text: str) -> str:
    """Return the original user question without injected context prefixes."""
    if not text:
        return ""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return text.strip()
    for line in reversed(lines):
        if line.startswith("[Student context") or line.startswith("[student context"):
            continue
        return line
    return lines[-1]


def _localize_answer(question: str, answer: str) -> str:
    """Ensure fallback / canned English phrases become Arabic when the user asked in Arabic."""
    user_question = _extract_user_question(question)
    if not answer:
        return answer
    lower = answer.lower().strip()
    english_fallbacks = (
        "the bylaws context does not specify this.",
        "the bylaws context does not specify this",
        "the context does not specify this.",
        "the context does not specify this",
        "i don't have enough information in the bylaws for this question.",
    )
    is_english_fallback = (
        lower in english_fallbacks or lower.startswith("the bylaws context does not")
    )
    if is_english_fallback and _is_arabic(user_question):
        return "اللائحة المتاحة لا تحتوي على معلومات كافية عن هذا السؤال."
    if not _is_arabic(user_question):
        return answer
    if is_english_fallback:
        return "اللائحة المتاحة لا تحتوي على معلومات كافية عن هذا السؤال."
    return answer


def call_llm_cached(question: str, context: str) -> str:
    """Call the LLM, caching by (question, context-hash) so a stale context
    cannot poison the answer for a fresh retrieval."""
    key = f"{question.strip()}|{hashlib.sha1(context.encode('utf-8')).hexdigest()}"
    cached = _llm_cache.get(key)
    if cached is not None:
        return cached

    # Strip injected student-context prefix so language detection stays accurate.
    question_for_lang = question.split("\n")[-1] if "\n" in question else question
    if _is_arabic(question_for_lang):
        lang_rule = (
            "IMPORTANT: The question is in Arabic. Your entire answer MUST be in Modern Standard Arabic only. "
            "Never reply in English. If context is insufficient, say exactly: "
            "«اللائحة المتاحة لا تحتوي على معلومات كافية عن هذا السؤال.»"
        )
    else:
        lang_rule = "Reply in English unless the question is clearly in Arabic."

    prompt = (
        f"{lang_rule}\n\n"
        "Answer the question using only the retrieved bylaws context.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Rules:\n"
        "- Answer concisely in plain language (not JSON or internal field names).\n"
        "- Match the question language; never use English fallback text for Arabic questions.\n"
    )
    answer = call_llm(prompt)
    answer = _localize_answer(question, answer)
    if not answer.startswith("LLM Error"):
        if len(_llm_cache) > 200:
            _llm_cache.clear()  # cheap eviction; cache is advisory
        _llm_cache[key] = answer
    return answer


def retrieve_context(user_query, k: int = 8):
    """Retrieve top-k bylaw chunks for a query without calling the LLM."""
    from chatBot.structured_lookup import expand_query_for_retrieval

    search_query = expand_query_for_retrieval(user_query)
    if k != 8:
        retriever = create_vector_store().as_retriever(search_kwargs={"k": k})
    else:
        retriever = get_retriever()

    try:
        docs = retriever.invoke(search_query)
    except AttributeError:
        docs = retriever.get_relevant_documents(user_query)

    return [
        {
            "source": (doc.metadata or {}).get("source") if hasattr(doc, "metadata") else None,
            "content": getattr(doc, "page_content", str(doc)),
            "score": (doc.metadata or {}).get("score") if hasattr(doc, "metadata") else None,
        }
        for doc in docs
    ]


def _user_facing_answer(raw: str) -> str:
    """Map internal LLM errors to a safe user message (no URLs or keys)."""
    if not raw:
        return "عذراً، لم أتمكن من إنشاء إجابة. حاول مرة أخرى."
    if raw.startswith("LLM Error"):
        lower = raw.lower()
        if "gemini_api_key" in lower or "api key" in lower:
            return (
                "خدمة الذكاء الاصطناعي غير مهيأة. "
                "تأكد من ضبط GEMINI_API_KEY في cogni-advisor-ai/GP/.env ثم أعد تشغيل خدمة AI."
            )
        if "quota" in lower or "429" in lower:
            return "تم تجاوز حد استخدام Gemini. حاول لاحقاً."
        if "غير متاح" in raw or "not found" in lower:
            return (
                "نموذج Gemini المستخدم قديم أو غير متاح. "
                "اضبط GEMINI_MODEL=gemini-flash-latest في .env وأعد تشغيل python run_app.py."
            )
        return "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. حاول بعد قليل."
    if raw.startswith("Error:"):
        return "حدث خطأ أثناء معالجة سؤالك. حاول مرة أخرى."
    return raw


def _format_student_context(ctx: dict[str, Any] | None) -> str:
    if not ctx or not isinstance(ctx, dict):
        return ""
    parts: list[str] = []
    if ctx.get("level") is not None:
        parts.append(f"المستوى: {ctx['level']}")
    if ctx.get("major_type"):
        parts.append(f"المسار: {ctx['major_type']}")
    if ctx.get("cumulative_gpa") is not None:
        parts.append(f"المعدل التراكمي: {ctx['cumulative_gpa']}")
    if ctx.get("earned_hours") is not None:
        parts.append(f"الساعات المكتسبة: {ctx['earned_hours']}")
    completed = ctx.get("completed_courses") or []
    if completed:
        parts.append(f"المقررات الناجحة: {', '.join(completed)}")
    failed = ctx.get("failed_courses") or []
    if failed:
        parts.append(f"المقررات الراسبة: {', '.join(failed)}")
    return "\n".join(parts)


def process_query(user_query: str, student_context: dict[str, Any] | None = None):
    """Retrieve context and generate a grounded answer."""
    try:
        from chatBot.structured_lookup import try_plan_answer, try_structured_answer

        user_question = _extract_user_question(user_query)

        plan_answer = try_plan_answer(user_question, student_context)
        if plan_answer:
            return plan_answer

        structured = try_structured_answer(user_question)
        if structured:
            return structured

        ctx_text = _format_student_context(student_context)
        enriched_query = user_query
        if ctx_text:
            enriched_query = f"[Student context:\n{ctx_text}]\n{user_query}"

        chunks = retrieve_context(enriched_query, k=8)
        if not chunks:
            return "لم أجد معلومات كافية في اللائحة لهذا السؤال."
        context = "\n\n".join(
            f"[{chunk['source']}]\n{chunk['content']}" for chunk in chunks
        )
        return _localize_answer(user_query, _user_facing_answer(call_llm_cached(enriched_query, context)))
    except Exception as exc:
        logger.exception("process_query failed")
        return _user_facing_answer(f"Error: {exc}")


def preload_models() -> None:
    """Preload embeddings and vector store at application startup."""
    logger.info("Preloading chatbot models...")
    get_embeddings()
    create_vector_store()
    get_retriever()
    logger.info("Chatbot models preloaded.")
