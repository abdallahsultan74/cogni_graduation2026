import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStudentMessagesAction } from "@/lib/actions/message.action";
import StudentMessagesClient from "./_components/student-messages-client";

export default async function StudentMessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");
  if (session.user.role !== "student") redirect("/");

  const result = await getStudentMessagesAction(session.accessToken);
  const messages = result.status === "success" ? result.data : [];

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Messages</h1>
      {result.status === "error" ? (
        <p className="text-red-600">{result.message}</p>
      ) : (
        <StudentMessagesClient token={session.accessToken} initialMessages={messages} />
      )}
    </div>
  );
}
