"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  getNotificationsAction,
  getUnreadNotificationsCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationItem,
} from "@/lib/actions/notification.action";

const POLL_MS = 45_000;

export default function NotificationBell({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const refreshCount = useCallback(async () => {
    const res = await getUnreadNotificationsCountAction(token);
    if (res.status === "success") setCount(res.data.count);
  }, [token]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const res = await getNotificationsAction(token);
    if (res.status === "success" && Array.isArray(res.data)) {
      setItems(res.data.slice(0, 15));
    } else {
      setItems([]);
      setListError(res.status === "error" ? res.message : "Failed to load notifications");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    loadList();
  }, [open, loadList]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onItemClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      await markNotificationReadAction(token, n.notification_id);
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.action_url) router.push(n.action_url);
  };

  const markAll = async () => {
    await markAllNotificationsReadAction(token);
    setCount(0);
    await loadList();
    await refreshCount();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-500" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {count > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-indigo-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading...</p>
            ) : listError ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">{listError}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.notification_id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                    !n.is_read ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900">{n.title ?? "Notification"}</p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(n.sent_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
