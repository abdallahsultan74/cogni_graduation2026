"use client";

import {
  BookOpen,
  Calendar,
  Gauge,
  GraduationCap,
  LogOut,
  PlusCircle,
  Settings,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type AdminSidebarProps = {
  adminName: string;
};

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Gauge },
  { label: "Add Student", href: "/admin/add-student", icon: GraduationCap },
  { label: "Add Advisor", href: "/admin/add-advisor", icon: PlusCircle },
  { label: "Users Management", href: "/admin/users", icon: Users },
  { label: "Advisors", href: "/admin/advisors", icon: UserCog },
  { label: "Semesters", href: "/admin/semesters", icon: Calendar },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Grades Upload", href: "/admin/grades", icon: Upload },
  { label: "Permissions", href: "/admin/permissions", icon: ShieldCheck },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = adminName
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
            {initials || adminName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{adminName}</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive =
            pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
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
