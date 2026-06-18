"use client";

import {
  Gauge,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type StudentSidebarProps = {
  studentName: string;
  email?: string;
  level?: number;
  majorType?: string | null;
};

const navItems = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "My Study Plan", href: "/student/study-plan", icon: FileText },
  { label: "Grades & Transcript", href: "/student/transcript", icon: GraduationCap },
  { label: "Academic Chat", href: "/student/chat", icon: Gauge },
  { label: "Messages", href: "/student/messages", icon: MessageSquare },
];

export default function StudentSidebar({
  studentName,
  email,
  level,
  majorType,
}: StudentSidebarProps) {
  const pathname = usePathname();
  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside className="flex h-full min-h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-4">
        <p className="text-xl font-bold tracking-tight text-white">
          Cogni<span className="text-blue-500">Advisor</span>
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
            {initials || studentName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{studentName}</p>
            <p className="truncate text-xs text-slate-400">
              {level ? `Year ${level}` : "Student"}
              {majorType ? ` · ${majorType}` : ""}
            </p>
            {email ? (
              <p className="truncate text-xs text-slate-500">{email}</p>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href || (pathname.startsWith(href) && href !== "#");
          return (
            <Link
              key={label}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                }`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
