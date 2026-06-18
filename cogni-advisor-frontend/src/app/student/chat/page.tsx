import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import StudentChatClient from "./_components/student-chat-client";

export default async function StudentChatPage() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) redirect("/login");
  if (session.user.role !== "student") redirect("/");

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Academic Chatbot</h1>
        <p className="mt-2 text-slate-500">
          Ask about bylaws, requirements, and your study plan
        </p>
      </div>
      <StudentChatClient token={session.accessToken} />
    </div>
  );
}
