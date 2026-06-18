"use server";

import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

export type AvailableCourse = {
  courseId: number;
  code: string;
  name: string;
  credits: number;
  level: string;
  levelNumber: number | null;
  term: string[];
  type: string;
  category: string;
  prerequisites: string[];
  prerequisitesMet: boolean;
  missingPrerequisites: string[];
  eligible: boolean;
  inPlan: boolean;
  reason?: string;
};

export async function getCurrentStudyPlanAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/me/current`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) return { status: "not_found" as const };
      return { status: "error" as const, message: "Failed to fetch study plan" };
    }

    const data = await res.json();
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to fetch study plan",
    };
  }
}

export async function getAvailableCoursesAction(token: string, planId?: number) {
  try {
    const qs = planId ? `?planId=${planId}` : "";
    const res = await fetch(`${API_BASE_URL}/api/study-plan/me/available-courses${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { status: "error" as const, message: "Failed to load available courses" };
    }
    const data = await res.json();
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load available courses",
    };
  }
}

export async function getAdvisorAvailableCoursesAction(token: string, planId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}/available-courses`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { status: "error" as const, message: "Failed to load available courses" };
    }
    const data = await res.json();
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load available courses",
    };
  }
}

export async function generateStudyPlanAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/generate`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to generate plan" };
    }

    revalidatePath("/student/study-plan");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to generate plan",
    };
  }
}

export async function submitStudyPlanAction(token: string, planId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}/submit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to submit plan" };
    }

    revalidatePath("/student/study-plan");
    revalidatePath("/advisor/study-plans");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to submit plan",
    };
  }
}

export async function updateStudyPlanCoursesAction(
  token: string,
  planId: number,
  courseIds: number[]
) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}/courses`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ course_ids: courseIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to save plan" };
    }
    revalidatePath("/student/study-plan");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to save plan",
    };
  }
}

export async function withdrawStudyPlanAction(token: string, planId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}/withdraw`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to withdraw plan" };
    }
    revalidatePath("/student/study-plan");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to withdraw plan",
    };
  }
}

export async function deleteStudyPlanAction(token: string, planId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to delete plan" };
    }
    revalidatePath("/student/study-plan");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to delete plan",
    };
  }
}

export async function advisorUpdateStudyPlanAction(
  token: string,
  planId: number,
  courseIds: number[]
) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-plan/${planId}/courses`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ course_ids: courseIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: data.message || "Failed to update plan" };
    }
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/advisor/study-plans");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to update plan",
    };
  }
}
