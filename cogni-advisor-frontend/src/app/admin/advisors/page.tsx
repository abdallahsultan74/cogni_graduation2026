import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUsersAction } from "@/lib/actions/admin.action";
import { UserCog } from "lucide-react";
import Link from "next/link";

export default async function AdminAdvisorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const usersResult = await getUsersAction(session.accessToken, "ADVISOR");
  const advisors = usersResult.status === "success" ? usersResult.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Advisors Management</h1>
          <p className="mt-2 text-slate-500">
            Manage academic advisors and their assigned students.
          </p>
        </div>
        <Link
          href="/admin/add-advisor"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add New Advisor
        </Link>
      </div>

      {usersResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {usersResult.message}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Name</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Email</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">National ID</th>
                  <th className="px-4 py-3 text-right font-medium md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advisors.map((advisor: {
                  user_id: number;
                  first_name: string;
                  last_name: string;
                  personal_email?: string;
                  email?: string;
                  national_id?: string;
                }) => (
                  <tr key={advisor.user_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                          <UserCog className="h-4 w-4" />
                        </div>
                        <div className="font-medium text-slate-900">
                          {advisor.first_name} {advisor.last_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {advisor.university_email || advisor.personal_email || advisor.email}
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {advisor.national_id}
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      <button className="font-medium text-indigo-600 hover:text-indigo-900">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {advisors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      No advisors found. Click &quot;Add New Advisor&quot; to create one.
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
