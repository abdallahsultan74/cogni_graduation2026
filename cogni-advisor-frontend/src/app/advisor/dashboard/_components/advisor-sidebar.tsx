"use client";

import {
  FileText,
  Gauge,
  MessageSquare,
  LogOut,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdvisorSidebarProps = {
  advisorName: string;
  pendingCount?: number;
};

const navItems = [
  { label: "Dashboard", href: "/advisor/dashboard", icon: Gauge },
  { label: "Plan Requests", href: "/advisor/study-plans", icon: FileText, badgeKey: "pending" as const },
  { label: "My Students", href: "/advisor/students", icon: Users },
  { label: "Messages", href: "/advisor/messages", icon: MessageSquare },
];

export default function AdvisorSidebar({ advisorName, pendingCount = 0 }: AdvisorSidebarProps) {
  const pathname = usePathname();
  const initials = advisorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside className="flex h-full min-h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
            {initials || advisorName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{advisorName}</p>
            <p className="text-xs text-slate-400">Advisor</p>
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map(({ label, href, icon: Icon, badgeKey }) => {
          const badge = badgeKey === "pending" && pendingCount > 0 ? pendingCount : undefined;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={label}
              href={href}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-blue-600 font-medium text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {badge ? (
                <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 text-xs font-semibold text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
