import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPendingStudyPlansAction } from "@/lib/actions/advisor.action";
import AdvisorLayoutShell from "./_components/advisor-layout-shell";

export default async function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    redirect("/login");
  }

  if (session.user.role !== "advisor") {
    redirect("/");
  }

  const advisorName =
    [session.user.firstName, session.user.lastName].join(" ").trim() ||
    session.user.name ||
    "Advisor";

  const plansResult = await getPendingStudyPlansAction(session.accessToken);
  const pendingCount =
    plansResult.status === "success" ? plansResult.data.length : 0;

  return (
    <AdvisorLayoutShell
      advisorName={advisorName}
      email={session.user.email ?? undefined}
      pendingCount={pendingCount}
      accessToken={session.accessToken}
    >
      {children}
    </AdvisorLayoutShell>
  );
}
