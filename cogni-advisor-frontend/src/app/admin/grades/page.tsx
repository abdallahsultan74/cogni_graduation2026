import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSemestersAction } from "@/lib/actions/admin.action";
import AdminGradesClient from "./_components/admin-grades-client";

export default async function AdminGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const semestersResult = await getSemestersAction(session.accessToken);
  const semesters = semestersResult.status === "success" ? semestersResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Grades Upload</h1>
        <p className="mt-2 text-slate-500">Upload semester results via CSV or enter grades manually.</p>
      </div>
      <AdminGradesClient token={session.accessToken} semesters={semesters} />
    </div>
  );
}
