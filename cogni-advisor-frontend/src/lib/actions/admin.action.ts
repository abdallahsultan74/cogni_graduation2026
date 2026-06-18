"use server";

import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

function parseApiError(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null) return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message) return obj.message;
  return fallback;
}

async function adminFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function getAdminOverviewAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/admin/overview");
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load overview") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load overview",
    };
  }
}

export async function getUsersAction(token: string, role?: string) {
  try {
    const qs = role ? `?role=${encodeURIComponent(role)}` : "";
    const { ok, data } = await adminFetch(token, `/api/users${qs}`);
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load users") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load users",
    };
  }
}

export async function createStudentAction(
  token: string,
  payload: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    national_id: string;
    personal_email: string;
    password: string;
    gender?: string;
    street_address?: string;
  }
) {
  try {
    const { ok, data } = await adminFetch(token, "/api/users/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to create student") };
    }
    revalidatePath("/admin/users");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to create student",
    };
  }
}

export async function createAdvisorAction(
  token: string,
  payload: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    national_id: string;
    password: string;
    gender?: string;
    street_address?: string;
  }
) {
  try {
    const { ok, data } = await adminFetch(token, "/api/users/advisors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to create advisor") };
    }
    revalidatePath("/admin/advisors");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to create advisor",
    };
  }
}

export async function assignAdvisorAction(
  token: string,
  studentId: number,
  advisorId: number | null
) {
  try {
    const { ok, data } = await adminFetch(token, `/api/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify({ advisor_id: advisorId }),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to assign advisor") };
    }
    revalidatePath("/admin/users");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to assign advisor",
    };
  }
}

export async function updateStudentAction(
  token: string,
  studentId: number,
  payload: Record<string, unknown>
) {
  try {
    const { ok, data } = await adminFetch(token, `/api/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to update student") };
    }
    revalidatePath("/admin/users");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to update student",
    };
  }
}

export async function deleteUserAction(token: string, userId: number) {
  try {
    const { ok, data, status } = await adminFetch(token, `/api/users/${userId}`, {
      method: "DELETE",
    });
    if (!ok && status !== 204) {
      return { status: "error" as const, message: parseApiError(data, "Failed to delete user") };
    }
    revalidatePath("/admin/users");
    return { status: "success" as const };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

export async function getSystemSettingsAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/admin/system-settings");
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load settings") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load settings",
    };
  }
}

export async function patchSystemSettingsAction(
  token: string,
  patch: Record<string, unknown>
) {
  try {
    const { ok, data } = await adminFetch(token, "/api/admin/system-settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to save settings") };
    }
    revalidatePath("/admin/settings");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function getSemestersAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/semesters");
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load semesters") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load semesters",
    };
  }
}

export async function createSemesterAction(
  token: string,
  payload: { semester_name: string; start_date?: string; end_date?: string }
) {
  try {
    const { ok, data } = await adminFetch(token, "/api/semesters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to create semester") };
    }
    revalidatePath("/admin/semesters");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to create semester",
    };
  }
}

export async function updateSemesterAction(
  token: string,
  semesterId: number,
  payload: Record<string, unknown>
) {
  try {
    const { ok, data } = await adminFetch(token, `/api/semesters/${semesterId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to update semester") };
    }
    revalidatePath("/admin/semesters");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to update semester",
    };
  }
}

export async function deleteSemesterAction(token: string, semesterId: number) {
  try {
    const { ok, data } = await adminFetch(token, `/api/semesters/${semesterId}`, {
      method: "DELETE",
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to delete semester") };
    }
    revalidatePath("/admin/semesters");
    return { status: "success" as const };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to delete semester",
    };
  }
}

export async function activateSemesterAction(token: string, semesterId: number) {
  try {
    const { ok, data } = await adminFetch(token, `/api/admin/semesters/${semesterId}/activate`, {
      method: "PATCH",
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to activate semester") };
    }
    revalidatePath("/admin/semesters");
    revalidatePath("/admin/dashboard");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to activate semester",
    };
  }
}

export async function advanceSemesterAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/admin/semesters/advance", {
      method: "POST",
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to advance semester") };
    }
    revalidatePath("/admin/semesters");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to advance semester",
    };
  }
}

export async function getCoursesGroupedAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/courses/grouped");
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load courses") };
    }
    return {
      status: "success" as const,
      data: data as { groups: CurriculumGroup<EeluCourseRow>[]; source: string },
    };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load courses",
    };
  }
}

export type EeluCourseRow = {
  code: string;
  name: string;
  credit_hours: number;
  lecture_hours: string;
  exercise_lab_hours: string;
  prerequisite: string;
  course_id?: number;
  is_available?: boolean;
};

export type CurriculumGroup<T> = {
  key: string;
  level: string;
  term: string;
  label: string;
  sortOrder: number;
  yearLabel?: string;
  semesterLabel?: string;
  totalCreditHours?: number;
  items: T[];
};

export async function getCoursesAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/courses");
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to load courses") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load courses",
    };
  }
}

export async function toggleCourseAction(token: string, courseId: number) {
  try {
    const { ok, data } = await adminFetch(token, `/api/courses/${courseId}/toggle`, {
      method: "PATCH",
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to toggle course") };
    }
    revalidatePath("/admin/courses");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to toggle course",
    };
  }
}

export async function deleteCourseAction(token: string, courseId: number) {
  try {
    const { ok, data } = await adminFetch(token, `/api/courses/${courseId}`, {
      method: "DELETE",
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to delete course") };
    }
    revalidatePath("/admin/courses");
    return { status: "success" as const };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to delete course",
    };
  }
}

export async function bulkGradesAction(
  token: string,
  payload: {
    semester_id?: number;
    semester_name?: string;
    result_date?: string;
    grades: Array<{ student_email: string; course_code: string; grade: string }>;
  }
) {
  try {
    const { ok, data } = await adminFetch(token, "/api/enrollments/bulk-grades", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to upload grades") };
    }
    revalidatePath("/admin/grades");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to upload grades",
    };
  }
}

export async function markGradeAction(
  token: string,
  payload: {
    student_id: number;
    course_id: number;
    grade: string;
    semester_id?: number;
    semester_name?: string;
    result_date?: string;
  }
) {
  try {
    const { ok, data } = await adminFetch(token, "/api/enrollments/mark-passed", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Failed to save grade") };
    }
    revalidatePath("/admin/grades");
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to save grade",
    };
  }
}

export async function resolveSemesterAction(
  token: string,
  params: { semester_name?: string; result_date?: string }
) {
  try {
    const qs = new URLSearchParams();
    if (params.semester_name) qs.set("semester_name", params.semester_name);
    if (params.result_date) qs.set("result_date", params.result_date);
    const { ok, data } = await adminFetch(token, `/api/admin/semesters/resolve?${qs.toString()}`);
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Could not resolve semester") };
    }
    return { status: "success" as const, data: data as { semester_id: number; semester_name: string | null; created: boolean } };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Could not resolve semester",
    };
  }
}

export async function searchStudentsAction(token: string, query: string) {
  try {
    const { ok, data } = await adminFetch(
      token,
      `/api/admin/students/search?q=${encodeURIComponent(query)}`
    );
    if (!ok) {
      return { status: "error" as const, message: parseApiError(data, "Search failed") };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Search failed",
    };
  }
}

export async function getStudentEnrollmentsAction(token: string, studentId: number) {
  try {
    const { ok, data } = await adminFetch(token, `/api/admin/students/${studentId}/enrollments`);
    if (!ok) {
      return {
        status: "error" as const,
        message: parseApiError(data, "Failed to load enrollments"),
      };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load enrollments",
    };
  }
}

export async function getAcademicCalendarAction(token: string) {
  try {
    const { ok, data } = await adminFetch(token, "/api/admin/academic-calendar");
    if (!ok) {
      return {
        status: "error" as const,
        message: parseApiError(data, "Failed to load academic calendar"),
      };
    }
    return { status: "success" as const, data };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load academic calendar",
    };
  }
}
