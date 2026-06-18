import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpenCheck, CalendarCheck, Lightbulb, User } from "lucide-react";
import Link from "next/link";

import { getStudentSummaryAction } from "@/lib/actions/student.action";
import { authOptions } from "@/lib/auth";

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    redirect("/login");
  }

  const studentDataResult = await getStudentSummaryAction(session.accessToken);
  const payload =
    studentDataResult.status === "success"
      ? (studentDataResult.data as Record<string, unknown>)
      : {};

  const fullName =
    [session.user.firstName, session.user.lastName].join(" ").trim() ||
    session.user.name ||
    "Student";

  const currentGpa = typeof payload.currentGpa === "number" ? payload.currentGpa : 0;
  const completedCourses =
    typeof payload.completedCourses === "number" ? payload.completedCourses : 0;
  const totalCredits = typeof payload.totalCredits === "number" ? payload.totalCredits : 144;
  const inProgressCourses =
    typeof payload.inProgressCourses === "number" ? payload.inProgressCourses : 0;
  const creditsEarned =
    typeof payload.creditsEarned === "number" ? payload.creditsEarned : 0;
  const remainingHours =
    typeof payload.remainingHours === "number" ? payload.remainingHours : 0;
  const level = typeof payload.level === "number" ? payload.level : null;
  const studentId =
    typeof payload.studentId === "string" || typeof payload.studentId === "number"
      ? payload.studentId
      : null;
  const majorType =
    typeof payload.majorType === "string" ? payload.majorType : null;
  const completionRate =
    totalCredits > 0 ? Math.round((creditsEarned / totalCredits) * 100) : 0;

  const advisor = payload.advisor as
    | { first_name?: string; last_name?: string }
    | null
    | undefined;
  const displayEmail = session.user.email ?? "";
  const advisorName = advisor
    ? `${advisor.first_name ?? ""} ${advisor.last_name ?? ""}`.trim()
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-4xl">Welcome back, {fullName}</h1>
        <p className="mt-2 text-slate-500">Here&apos;s your academic overview</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          <User className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Student Profile</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Full Name</p>
            <p className="mt-1 font-medium text-slate-900">{fullName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">University Email</p>
            <p className="mt-1 font-medium text-slate-900">{displayEmail || "—"}</p>
          </div>
          {studentId ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Student ID</p>
              <p className="mt-1 font-medium text-slate-900">{studentId}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Academic Year</p>
            <p className="mt-1 font-medium text-slate-900">
              {level ? `Year ${level}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Major</p>
            <p className="mt-1 font-medium text-slate-900">{majorType || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Advisor</p>
            <p className="mt-1 font-medium text-slate-900">{advisorName || "Not assigned"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cumulative GPA</p>
            <p className="mt-1 font-medium text-slate-900">{currentGpa.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Credits</p>
            <p className="mt-1 font-medium text-slate-900">
              {creditsEarned} earned · {remainingHours} remaining
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Current GPA</p>
          <p className="mt-4 text-4xl font-bold">{currentGpa.toFixed(2)}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Completed Courses</p>
            <BookOpenCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-4 text-4xl font-bold">{completedCourses}</p>
          <p className="mt-2 text-sm text-slate-500">Passed courses</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">In Progress</p>
            <CalendarCheck className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-4 text-4xl font-bold">{inProgressCourses}</p>
          <p className="mt-2 text-sm text-slate-500">Current enrollments</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Credits Earned</p>
            <Lightbulb className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-4 text-4xl font-bold">{creditsEarned}</p>
          <p className="mt-2 text-sm text-slate-500">{completionRate}% of program</p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/student/study-plan"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium transition hover:bg-slate-50"
          >
            <BookOpenCheck className="h-4 w-4 text-slate-500" />
            Review Study Plan
          </Link>
          <Link
            href="/student/chat"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium transition hover:bg-slate-50"
          >
            <Lightbulb className="h-4 w-4 text-slate-500" />
            Academic Chatbot
          </Link>
          <Link
            href="/student/transcript"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium transition hover:bg-slate-50"
          >
            <BookOpenCheck className="h-4 w-4 text-slate-500" />
            View Transcript
          </Link>
        </div>
      </section>

      {studentDataResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {studentDataResult.errorMessage}
        </div>
      ) : null}
    </div>
  );
}
