"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import AdminSidebar from "../dashboard/_components/admin-sidebar";

type AdminLayoutShellProps = {
  adminName: string;
  email?: string;
  children: ReactNode;
};

export default function AdminLayoutShell({
  adminName,
  email,
  children,
}: AdminLayoutShellProps) {
  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DashboardShell
      sidebar={<AdminSidebar adminName={adminName} />}
      userName={adminName}
      userEmail={email}
      userInitials={initials || "AD"}
    >
      {children}
    </DashboardShell>
  );
}
