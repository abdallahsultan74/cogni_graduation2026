import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAcademicCalendarAction, getSemestersAction } from "@/lib/actions/admin.action";
import AdminSemestersClient from "./_components/admin-semesters-client";

export default async function AdminSemestersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const [semestersResult, calendarResult] = await Promise.all([
    getSemestersAction(session.accessToken),
    getAcademicCalendarAction(session.accessToken),
  ]);

  const semesters = semestersResult.status === "success" ? semestersResult.data : [];
  const calendar =
    calendarResult.status === "success"
      ? (calendarResult.data as {
          currentSemesterId: number | null;
          planningSemesterId: number | null;
        })
      : { currentSemesterId: null, planningSemesterId: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Semesters</h1>
        <p className="mt-2 text-slate-500">Manage academic semesters and activate the current term.</p>
      </div>
      {calendarResult.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load academic calendar: {calendarResult.message}
        </div>
      )}
      <AdminSemestersClient
        token={session.accessToken}
        semesters={semesters}
        currentSemesterId={calendar.currentSemesterId}
        planningSemesterId={calendar.planningSemesterId}
      />
    </div>
  );
}
