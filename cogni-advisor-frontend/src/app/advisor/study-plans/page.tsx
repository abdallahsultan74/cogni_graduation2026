import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPendingStudyPlansAction } from "@/lib/actions/advisor.action";
import AdvisorStudyPlansClient from "./_components/advisor-study-plans-client";

export default async function AdvisorStudyPlansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const plansResult = await getPendingStudyPlansAction(session.accessToken);
  const plans = plansResult.status === "success" ? plansResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Study Plan Requests</h1>
        <p className="mt-2 text-slate-500">
          Review student plans, edit courses if needed, then approve or reject.
        </p>
      </div>
      <AdvisorStudyPlansClient token={session.accessToken} initialPlans={plans} />
    </div>
  );
}
