import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AddStudentFormClient from "./_components/add-student-form-client";

export default async function AddStudentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Add Student</h1>
        <p className="mt-2 text-slate-500">Register a new student account</p>
      </div>
      <AddStudentFormClient token={session.accessToken} />
    </div>
  );
}
