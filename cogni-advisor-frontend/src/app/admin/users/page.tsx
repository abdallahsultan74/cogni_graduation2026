import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUsersAction } from "@/lib/actions/admin.action";
import { ShieldCheck, UserCog, Users } from "lucide-react";
import AssignAdvisorClient from "./_components/assign-advisor-client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const [usersResult, advisorsResult] = await Promise.all([
    getUsersAction(session.accessToken),
    getUsersAction(session.accessToken, "ADVISOR"),
  ]);

  const users = usersResult.status === "success" ? usersResult.data : [];
  const advisorsData = advisorsResult.status === "success" ? advisorsResult.data : [];

  const advisors = advisorsData.map((adv: { user_id: number; first_name: string; last_name: string }) => ({
    id: adv.user_id,
    name: `${adv.first_name} ${adv.last_name}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Users Management</h1>
          <p className="mt-2 text-slate-500">
            Manage students, advisors, and administrators across the system.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Total Users: {users.length}
        </div>
      </div>

      {usersResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {usersResult.message}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Name</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Student ID</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">University Email</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Personal Email</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Role</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Advisor</th>
                  <th className="px-4 py-3 text-right font-medium md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user: {
                  user_id: number;
                  first_name: string;
                  last_name: string;
                  national_id?: string;
                  personal_email?: string;
                  university_email?: string;
                  email?: string;
                  role: string;
                  student?: { student_id: number; university_student_id?: string; advisor_id?: number };
                }) => (
                  <tr key={user.user_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="font-medium text-slate-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{user.national_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {user.student?.university_student_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {user.university_email || user.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {user.personal_email
                        ? user.personal_email.replace(/^(.{2}).+(@.+)$/, "$1***$2")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-indigo-100 text-indigo-800"
                            : user.role === "ADVISOR"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {user.role === "ADMIN" && <ShieldCheck className="h-3 w-3" />}
                        {user.role === "ADVISOR" && <UserCog className="h-3 w-3" />}
                        {user.role === "STUDENT" && <Users className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 md:px-6 md:py-4">
                      {user.role === "STUDENT" && user.student?.advisor_id
                        ? advisors.find((a) => a.id === user.student?.advisor_id)?.name ??
                          `Advisor #${user.student.advisor_id}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      {user.role === "STUDENT" && user.student ? (
                        <AssignAdvisorClient
                          token={session.accessToken}
                          studentId={user.student.student_id}
                          userId={user.user_id}
                          advisors={advisors}
                          currentAdvisorId={user.student?.advisor_id}
                        />
                      ) : (
                        <button className="font-medium text-indigo-600 hover:text-indigo-900">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No users found in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
