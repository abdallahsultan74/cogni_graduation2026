import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AlertTriangle, Users } from "lucide-react";
import Link from "next/link";
import { getAdvisorDashboardAction } from "@/lib/actions/advisor.action";
import { authOptions } from "@/lib/auth";

export default async function AdvisorDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const advisorDataResult = await getAdvisorDashboardAction(session.accessToken);
  const payload =
    advisorDataResult.status === "success"
      ? (advisorDataResult.data as Record<string, unknown>)
      : {};

  const activeStudents =
    typeof payload.activeStudents === "number" ? payload.activeStudents : 0;
  const pendingReviews =
    typeof payload.pendingReviews === "number" ? payload.pendingReviews : 0;
  const atRiskStudents =
    typeof payload.atRiskStudents === "number" ? payload.atRiskStudents : 0;
  const recentPlans = Array.isArray(payload.recentPlanRequests)
    ? payload.recentPlanRequests
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-4xl">Advisor Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Pending Requests</p>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-orange-500">{pendingReviews}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Total Students</p>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-4 text-4xl font-bold">{activeStudents}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">At-Risk Students</p>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-4 text-4xl font-bold text-rose-600">{atRiskStudents}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold md:text-2xl">Recent Plan Requests</h2>
          <Link href="/advisor/study-plans" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2 font-semibold">Student</th>
                <th className="py-2 font-semibold">GPA</th>
                <th className="py-2 font-semibold">Credits</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPlans.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No submitted plans yet
                  </td>
                </tr>
              ) : (
                recentPlans.map((p: Record<string, unknown>) => (
                  <tr key={String(p.plan_id)} className="border-b border-slate-100">
                    <td className="py-3">{String(p.studentName)}</td>
                    <td>{Number(p.gpa).toFixed(2)}</td>
                    <td>{String(p.requestedCredits)}</td>
                    <td>{String(p.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {advisorDataResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {advisorDataResult.errorMessage}
        </div>
      ) : null}
    </div>
  );
}
