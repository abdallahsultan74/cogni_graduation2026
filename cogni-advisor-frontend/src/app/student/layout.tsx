import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStudentSummaryAction } from "@/lib/actions/student.action";
import StudentLayoutShell from "./_components/student-layout-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/");
  }

  const fullName =
    [session.user.firstName, session.user.lastName].join(" ").trim() ||
    session.user.name ||
    "Student";

  const summaryResult = await getStudentSummaryAction(session.accessToken);
  const data =
    summaryResult.status === "success"
      ? (summaryResult.data as Record<string, unknown>)
      : {};

  const level = typeof data.level === "number" ? data.level : undefined;
  const majorType =
    typeof data.majorType === "string" ? data.majorType : null;

  return (
    <StudentLayoutShell
      studentName={fullName}
      email={session.user.email ?? undefined}
      level={level}
      majorType={majorType}
      accessToken={session.accessToken}
    >
      {children}
    </StudentLayoutShell>
  );
}
