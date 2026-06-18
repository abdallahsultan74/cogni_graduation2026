import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCoursesGroupedAction } from "@/lib/actions/admin.action";
import AdminCoursesClient from "./_components/admin-courses-client";

export default async function AdminCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const coursesResult = await getCoursesGroupedAction(session.accessToken);
  const groups = coursesResult.status === "success" ? coursesResult.data.groups : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Courses</h1>
        <p className="mt-2 text-slate-500">
          Official IT program curriculum — same layout as the university bylaws (eelu.pdf).
        </p>
      </div>
      {coursesResult.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{coursesResult.message}</div>
      ) : (
        <AdminCoursesClient token={session.accessToken} groups={groups} />
      )}
    </div>
  );
}
