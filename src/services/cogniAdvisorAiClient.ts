import type {
  CogniAdvisorRecommendPayload,
  CogniAdvisorRecommendResult
} from "./cogniAdvisorAi.types.js";

const DEFAULT_BASE_URL = "http://localhost:7860";

const getBaseUrl = () => {
  const baseUrl = process.env.COGNI_ADVISOR_AI_BASE_URL;
  return (baseUrl && baseUrl.trim()) || DEFAULT_BASE_URL;
};

export const callCogniAdvisorRecommend = async (
  payload: CogniAdvisorRecommendPayload
): Promise<CogniAdvisorRecommendResult> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/recommendation/api/recommend`;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.COGNI_ADVISOR_AI_TIMEOUT_MS ?? 60000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : `AI request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!data || typeof data !== "object") {
      throw new Error("AI response was empty or invalid JSON.");
    }

    return data as CogniAdvisorRecommendResult;
  } finally {
    clearTimeout(timeout);
  }
};

export const callCogniAdvisorAsk = async (
  question: string,
  studentContext?: Record<string, unknown>
): Promise<{ answer: string }> => {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/chatbot/api/ask`;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.COGNI_ADVISOR_AI_TIMEOUT_MS ?? 60000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, student_context: studentContext }),
      signal: controller.signal,
    }).catch((err: unknown) => {
      const baseUrl = getBaseUrl();
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `AI service timed out after ${timeoutMs / 1000}s. Ensure Flask is running at ${baseUrl} with EELU_PRELOAD=1.`
        );
      }
      throw new Error(
        `Cannot reach AI service at ${baseUrl}. Start Flask: cd cogni-advisor-ai/GP && python run_app.py`
      );
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : `Chatbot request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!data || typeof data !== "object" || !("answer" in data)) {
      throw new Error("Chatbot response was empty or invalid.");
    }

    return { answer: String((data as { answer: unknown }).answer) };
  } finally {
    clearTimeout(timeout);
  }
};

