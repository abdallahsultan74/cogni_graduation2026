"use server";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

function parseApiError(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null) return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message) return obj.message;
  return fallback;
}

export async function requestPasswordResetAction(nationalId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ national_id: nationalId }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Request failed") };
    }
    return {
      status: "success" as const,
      message: typeof data.message === "string" ? data.message : "Verification code sent if account exists.",
      maskedEmail: typeof data.masked_email === "string" ? data.masked_email : undefined,
      devHint: typeof data.dev_hint === "string" ? data.dev_hint : undefined,
    };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
}

export async function confirmPasswordResetAction(
  nationalId: string,
  otp: string,
  newPassword: string
) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ national_id: nationalId, otp, newPassword }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Reset failed") };
    }
    return {
      status: "success" as const,
      message: typeof data.message === "string" ? data.message : "Password updated.",
    };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Reset failed",
    };
  }
}

export async function loginStudentAction(
  payload: { email: string; password: string; role?: string }
) {
  const API = process.env.COGNI_API_BASE_URL;
  if (!API) throw new Error("Missing COGNI_API_BASE_URL environment variable.");

  const response = await fetch(`${API}/api/auth/login/student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(parseApiError(errorData, "Login failed. Please check your credentials."));
  }

  return response.json();
}
