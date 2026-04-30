---
title: Cogni Advisor AI
sdk: docker
app_port: 7860
---

# Cogni Advisor AI (Hugging Face Docker)

This app provides:
- Academic chatbot (`/chatbot/*`) based on retrieval + LLM
- Course recommendation (`/recommendation/*`)
- Home page (`/`)

## Required secrets (Hugging Face Space Settings -> Variables and secrets)

Set at least one LLM key:
- `GEMINI_API_KEY` (recommended)
- or `OPENROUTER_API_KEY`

Also set:
- `EELU_SECRET_KEY` (required for production safety)

Optional:
- `LLM_PROVIDER` (`gemini` or `openrouter`)
- `GEMINI_MODEL`
- `OPENROUTER_MODEL`
- `EELU_PRELOAD` (`1` for preloading models at startup, `0` for lazy load)

Never store real secrets in repository files.

## Run locally (Docker)

From `cogni-advisor-ai/GP`:

```bash
docker build -t cogni-advisor-ai -f dockerfile .
docker run --rm -p 7860:7860 \
  -e EELU_PORT=7860 \
  -e GEMINI_API_KEY=your_key_here \
  -e EELU_SECRET_KEY=replace_me \
  cogni-advisor-ai
```

App URL: `http://localhost:7860`

## Health/smoke checks

- `GET /`
- `POST /chatbot/api/ask` with `{"question":"..."}`
- `POST /recommendation/api/recommend` with valid payload

## Notes for Hugging Face Spaces (Docker)

- Keep Docker image self-contained (data directories are copied in image).
- `run_app.py` supports Space runtime port via `PORT` and fallback to `EELU_PORT`.
- First startup can be slower due to embeddings/index loading; tune with `EELU_PRELOAD`.
