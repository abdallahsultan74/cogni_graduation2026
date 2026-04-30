import type {
  CogniAdvisorRecommendPayload,
  CogniAdvisorRecommendResult
} from "./cogniAdvisorAi.types.js";

const DEFAULT_SPACE_BASE_URL = "https://abdallahsultan74-cogni-advisor.hf.space";

const getBaseUrl = () => {
  const baseUrl = process.env.COGNI_ADVISOR_AI_BASE_URL;
  return (baseUrl && baseUrl.trim()) || DEFAULT_SPACE_BASE_URL;
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

