"use server";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

function parseApiError(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null) return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message) return obj.message;
  return fallback;
}

export async function getStudentMessagesAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/students/me/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load messages") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load messages",
    };
  }
}

export async function sendStudentMessageAction(token: string, body: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/students/me/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to send message") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

export async function getAdvisorConversationsAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/advisor/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load conversations") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load conversations",
    };
  }
}

export async function getAdvisorMessagesAction(token: string, studentId: number) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/advisor/messages/conversations/${studentId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load messages") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load messages",
    };
  }
}

export async function sendAdvisorMessageAction(
  token: string,
  studentId: number,
  body: string
) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/advisor/messages/conversations/${studentId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to send message") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

export async function getUnreadMessagesCountAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load unread count") };
    }
    return { status: "success" as const, data: data as { count: number } };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load unread count",
    };
  }
}
