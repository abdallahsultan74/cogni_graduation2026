import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Check, ShieldCheck, UserCog, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAdminOverviewAction } from "@/lib/actions/admin.action";

const getNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const overviewResult = await getAdminOverviewAction(session.accessToken);
  const overview =
    overviewResult.status === "success"
      ? (overviewResult.data as Record<string, unknown>)
      : {};

  const totalUsers = getNumber(overview.totalUsers, 0);
  const totalAdvisors = getNumber(overview.totalAdvisors, 0);
  const totalStudents = getNumber(overview.totalStudents, 0);
  const recentActivity = Array.isArray(overview.recentActivity)
    ? overview.recentActivity
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-4xl">Admin Dashboard</h1>
        <p className="mt-1 text-slate-500">Platform operations and system overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Total Users</p>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-4 text-4xl font-bold">{totalUsers}</p>
          <p className="mt-2 text-sm text-slate-500">Across all roles</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Students</p>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-4 text-4xl font-bold">{totalStudents}</p>
          <p className="mt-2 text-sm text-slate-500">Registered students</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Advisors</p>
            <UserCog className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-4 text-4xl font-bold">{totalAdvisors}</p>
          <p className="mt-2 text-sm text-slate-500">Active advisors</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-700">Active Courses</p>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-4 text-4xl font-bold">{getNumber(overview.activeCourses, 0)}</p>
          <p className="mt-2 text-sm text-slate-500">In catalog</p>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold md:text-2xl">Recent Activity</h2>
        <ul className="mt-4 space-y-4 text-sm">
          {recentActivity.length === 0 ? (
            <li className="text-slate-500">No recent activity</li>
          ) : (
            recentActivity.map((a: Record<string, unknown>) => (
              <li key={String(a.audit_id)} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p>{String(a.action)}</p>
                  <p className="text-slate-500">
                    {a.created_at
                      ? new Date(String(a.created_at)).toLocaleString()
                      : ""}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {overviewResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {overviewResult.message}
        </div>
      ) : null}
    </div>
  );
}
