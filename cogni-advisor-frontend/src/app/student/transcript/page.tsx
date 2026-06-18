import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTranscriptAction } from "@/lib/actions/student.action";
import { AlertCircle, GraduationCap, TrendingUp } from "lucide-react";

type TranscriptCourse = {
  enrollment_id: number;
  course_code: string;
  course_name: string;
  credits: number;
  grade: string | null;
  status: string;
};

type TranscriptSemester = {
  semester_id: number | null;
  semester_name: string;
  start_date: string | null;
  semester_gpa: number;
  registered_hours: number;
  earned_hours: number;
  courses: TranscriptCourse[];
};

type TranscriptData = {
  student_id: number;
  cumulative_gpa: number;
  total_earned_hours: number;
  semesters: TranscriptSemester[];
};

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
};

export default async function TranscriptPage() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    redirect("/login");
  }

  const transcriptResult = await getTranscriptAction(session.accessToken);
  const transcript: TranscriptData | null =
    transcriptResult.status === "success" ? transcriptResult.data : null;
  const semesters = transcript?.semesters ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Grades & Transcript</h1>
        <p className="mt-2 text-slate-500">Detailed academic record by semester</p>
      </div>

      {transcript && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <div className="flex items-center gap-2 text-indigo-700">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Cumulative GPA</span>
            </div>
            <p className="mt-2 text-4xl font-bold text-indigo-900">
              {transcript.cumulative_gpa.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-slate-600">
              <GraduationCap className="h-5 w-5" />
              <span className="text-sm font-medium">Total Earned Credits</span>
            </div>
            <p className="mt-2 text-4xl font-bold">{transcript.total_earned_hours}</p>
          </div>
        </div>
      )}

      {transcriptResult.status === "error" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Failed to load transcript</h3>
            <p className="mt-1 text-sm text-red-700">{transcriptResult.message}</p>
          </div>
        </div>
      ) : semesters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <GraduationCap className="mb-4 h-12 w-12 text-indigo-400" />
          <h2 className="text-xl font-bold">No academic record yet</h2>
        </div>
      ) : (
        <div className="space-y-6">
          {semesters.map((sem) => (
            <div
              key={sem.semester_id ?? sem.semester_name}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{sem.semester_name}</h2>
                  {sem.start_date && (
                    <p className="text-xs text-slate-500">{formatDate(sem.start_date)}</p>
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-slate-500">Semester GPA</p>
                    <p className="text-lg font-bold text-indigo-700">
                      {sem.semester_gpa.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Earned</p>
                    <p className="text-lg font-bold">{sem.earned_hours}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Registered</p>
                    <p className="text-lg font-bold">{sem.registered_hours}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium md:px-6">Code</th>
                      <th className="px-4 py-3 font-medium md:px-6">Course</th>
                      <th className="px-4 py-3 text-center font-medium md:px-6">Credits</th>
                      <th className="px-4 py-3 text-center font-medium md:px-6">Grade</th>
                      <th className="px-4 py-3 text-right font-medium md:px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sem.courses.map((c) => (
                      <tr key={c.enrollment_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium md:px-6">{c.course_code}</td>
                        <td className="px-4 py-3 text-slate-600 md:px-6">{c.course_name}</td>
                        <td className="px-4 py-3 text-center md:px-6">{c.credits}</td>
                        <td className="px-4 py-3 text-center font-semibold md:px-6">
                          {c.grade || "—"}
                        </td>
                        <td className="px-4 py-3 text-right md:px-6">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              c.status === "PASSED"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
