"use server";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

export async function getAdvisorDashboardAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/advisor/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "error" as const, errorMessage: "Failed to load advisor dashboard." };
    }

    const data = await res.json();
    return {
      status: "success" as const,
      data: {
        activeStudents: data.totalStudentsCount,
        pendingReviews: data.pendingRequestsCount,
        atRiskStudents: data.atRiskStudentsCount,
        recentPlanRequests: data.recentPlanRequests ?? [],
      },
    };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      errorMessage: error instanceof Error ? error.message : "Failed to load advisor dashboard.",
    };
  }
}

/** @deprecated use getAdvisorDashboardAction */
export async function getAdvisorDataAction(accessToken: string) {
  return getAdvisorDashboardAction(accessToken);
}

export async function getAdvisorStudentsAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/advisor/students`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "error" as const, message: "Failed to fetch your students" };
    }

    const data = await res.json();
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to fetch students",
    };
  }
}

export async function getStudentTranscriptAction(token: string, studentId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/advisor/students/${studentId}/transcript`, {
      headers: { Authorization: `Bearer ${token}` },
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

export async function getPendingStudyPlansAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/advisor/pending`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "error" as const, message: "Failed to fetch pending study plans" };
    }

    const data = await res.json();
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to fetch pending study plans",
    };
  }
}

export async function reviewStudyPlanAction(
  token: string,
  planId: number,
  status: "APPROVED" | "REJECTED",
  feedback?: string
) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}/review`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, feedback }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to review plan" };
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/advisor/study-plans");
    revalidatePath("/advisor/dashboard");

    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to review plan",
    };
  }
}
