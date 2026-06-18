"use server";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

export async function getStudentSummaryAction(token: string) {
  try {
    const [summaryRes, profileRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/students/me/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${API_BASE_URL}/api/students/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    if (!summaryRes.ok || !profileRes.ok) {
      return { status: "error" as const, errorMessage: "Failed to load student data." };
    }

    const summary = await summaryRes.json();
    const profile = await profileRes.json();

    return {
      status: "success" as const,
      data: {
        currentGpa: summary.cumulative_gpa,
        creditsEarned: summary.earned_hours,
        completedCourses: summary.passed_courses,
        inProgressCourses: summary.current_enrollments,
        totalCredits: 144,
        remainingHours: summary.remaining_hours,
        level: summary.current_level,
        majorType: profile.major_type ?? null,
        studentId: profile.university_student_id ?? summary.university_student_id ?? profile.student_id,
        universityEmail: profile.user?.university_email ?? null,
        status: profile.status,
        advisor: profile.advisor,
        firstName: profile.user?.first_name,
        lastName: profile.user?.last_name,
      },
    };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      errorMessage: error instanceof Error ? error.message : "Failed to load student data.",
    };
  }
}

export async function getTranscriptAction(token: string) {
  const apiBaseUrl = process.env.COGNI_API_BASE_URL || "http://localhost:5000";
  try {
    const res = await fetch(`${apiBaseUrl}/api/students/me/transcript`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "error" as const, message: "Failed to fetch transcript" };
    }

    const data = await res.json();
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to fetch transcript",
    };
  }
}

/** @deprecated use getStudentSummaryAction */
export async function getStudentDataAction(accessToken: string) {
  return getStudentSummaryAction(accessToken);
}

function parseApiError(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null) return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message) return obj.message;
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0] as { message?: string };
    if (first?.message) return first.message;
  }
  return fallback;
}

export async function getChatHistoryAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/history`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load chat history") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load chat history",
    };
  }
}

export async function sendChatMessageAction(token: string, message: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: parseApiError(data, "Chat failed") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Chat failed",
    };
  }
}
