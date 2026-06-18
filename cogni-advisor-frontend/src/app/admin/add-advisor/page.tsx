import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AddAdvisorFormClient from "./_components/add-advisor-form-client";

export default async function AddAdvisorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Add Advisor</h1>
        <p className="mt-2 text-slate-500">Register a new academic advisor</p>
      </div>
      <AddAdvisorFormClient token={session.accessToken} />
    </div>
  );
}
