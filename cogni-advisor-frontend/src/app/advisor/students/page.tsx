import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAdvisorStudentsAction } from "@/lib/actions/advisor.action";
import { Users } from "lucide-react";

type AdvisorStudent = {
  student_id: number;
  student_code: string;
  full_name: string;
  national_id?: string;
  major_type?: string | null;
  level: number;
  cumulative_gpa: number;
  total_earned_hours: number;
  academicStatus?: string;
};

export default async function AdvisorStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const studentsResult = await getAdvisorStudentsAction(session.accessToken);
  const students: AdvisorStudent[] =
    studentsResult.status === "success" ? studentsResult.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">My Students</h1>
          <p className="mt-2 text-slate-500">
            Monitor the academic progress of students assigned to you.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Total Students: {students.length}
        </div>
      </div>

      {studentsResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {studentsResult.message}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Student Name</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">National ID</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Major</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Year</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">GPA</th>
                  <th className="px-4 py-3 font-medium md:px-6 md:py-4">Earned Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.student_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{student.full_name}</div>
                          <div className="text-xs text-slate-500">{student.student_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {student.national_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {student.major_type || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      Year {student.level}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 md:px-6 md:py-4">
                      {student.cumulative_gpa}
                    </td>
                    <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                      {student.total_earned_hours} / 144
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      You don&apos;t have any students assigned yet.
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
