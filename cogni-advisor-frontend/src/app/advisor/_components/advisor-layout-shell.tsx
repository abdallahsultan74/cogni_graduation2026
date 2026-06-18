"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import AdvisorSidebar from "../dashboard/_components/advisor-sidebar";

type AdvisorLayoutShellProps = {
  advisorName: string;
  email?: string;
  pendingCount?: number;
  accessToken?: string;
  children: ReactNode;
};

export default function AdvisorLayoutShell({
  advisorName,
  email,
  pendingCount = 0,
  accessToken,
  children,
}: AdvisorLayoutShellProps) {
  const initials = advisorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DashboardShell
      sidebar={
        <AdvisorSidebar advisorName={advisorName} pendingCount={pendingCount} />
      }
      userName={advisorName}
      userEmail={email}
      userInitials={initials || "AD"}
      accessToken={accessToken}
    >
      {children}
    </DashboardShell>
  );
}
