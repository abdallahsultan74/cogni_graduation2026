"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/layout/dashboard-shell";
import StudentSidebar from "../dashboard/_components/student-sidebar";

type StudentLayoutShellProps = {
  studentName: string;
  email?: string;
  level?: number;
  majorType?: string | null;
  accessToken?: string;
  children: ReactNode;
};

export default function StudentLayoutShell({
  studentName,
  email,
  level,
  majorType,
  accessToken,
  children,
}: StudentLayoutShellProps) {
  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DashboardShell
      sidebar={
        <StudentSidebar
          studentName={studentName}
          email={email}
          level={level}
          majorType={majorType}
        />
      }
      userName={studentName}
      userEmail={email}
      userInitials={initials || "ST"}
      accessToken={accessToken}
    >
      {children}
    </DashboardShell>
  );
}
