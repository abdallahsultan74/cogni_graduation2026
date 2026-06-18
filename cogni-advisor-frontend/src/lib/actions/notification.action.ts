"use server";

const API_BASE_URL = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

export type NotificationItem = {
  notification_id: number;
  id: number;
  title: string | null;
  body: string | null;
  type: string | null;
  action_url: string | null;
  entity_id: number | null;
  is_read: boolean;
  sent_at: string;
};

export async function getNotificationsAction(token: string, unreadOnly = false) {
  try {
    const qs = unreadOnly ? "?unread=true" : "";
    const res = await fetch(`${API_BASE_URL}/api/notifications${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        status: "error" as const,
        message: typeof data?.message === "string" ? data.message : "Failed to load notifications",
      };
    }
    return { status: "success" as const, data: data as NotificationItem[] };
  } catch (error: unknown) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Failed to load notifications",
    };
  }
}

export async function getUnreadNotificationsCountAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: "error" as const, message: "Failed to load count" };
    }
    return { status: "success" as const, data: data as { count: number } };
  } catch {
    return { status: "error" as const, message: "Failed to load count" };
  }
}

export async function markNotificationReadAction(token: string, id: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { status: "error" as const, message: "Failed to mark as read" };
    }
    return { status: "success" as const };
  } catch {
    return { status: "error" as const, message: "Failed to mark as read" };
  }
}

export async function markAllNotificationsReadAction(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { status: "error" as const, message: "Failed to mark all as read" };
    }
    return { status: "success" as const };
  } catch {
    return { status: "error" as const, message: "Failed to mark all as read" };
  }
}
