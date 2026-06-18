"use client";

import { useState, type ReactNode } from "react";
import { Menu, Search, X } from "lucide-react";

import NotificationBell from "./notification-bell";

type DashboardShellProps = {
  sidebar: ReactNode;
  userName: string;
  userEmail?: string;
  userInitials: string;
  accessToken?: string;
  children: ReactNode;
  showSearch?: boolean;
};

export default function DashboardShell({
  sidebar,
  userName,
  userEmail,
  userInitials,
  accessToken,
  children,
  showSearch = true,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:shrink-0">{sidebar}</div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 flex h-full w-64 max-w-[85vw] flex-col shadow-xl">
              {sidebar}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-2 top-3 rounded-lg bg-white/10 p-2 text-white lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 md:h-16 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </button>
              <p className="text-lg font-bold md:text-2xl">
                Cogni<span className="text-blue-600">Advisor</span>
              </p>
            </div>

            {showSearch && (
              <div className="hidden w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search..."
                  readOnly
                />
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3">
              {accessToken ? <NotificationBell token={accessToken} /> : null}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {userInitials}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-semibold">{userName}</p>
                  {userEmail ? (
                    <p className="truncate text-xs text-slate-500">{userEmail}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
