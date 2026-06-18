import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAdvisorConversationsAction } from "@/lib/actions/message.action";
import AdvisorMessagesClient from "./_components/advisor-messages-client";

export default async function AdvisorMessagesPage({
  searchParams,
}: {
  searchParams?: { student?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");

  const result = await getAdvisorConversationsAction(session.accessToken);
  const conversations = result.status === "success" ? result.data : [];
  const initialStudentId = searchParams?.student
    ? Number(searchParams.student)
    : undefined;

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Messages</h1>
      {result.status === "error" ? (
        <p className="text-red-600">{result.message}</p>
      ) : (
        <AdvisorMessagesClient
          token={session.accessToken}
          conversations={conversations}
          initialStudentId={
            initialStudentId && !Number.isNaN(initialStudentId)
              ? initialStudentId
              : undefined
          }
        />
      )}
    </div>
  );
}
