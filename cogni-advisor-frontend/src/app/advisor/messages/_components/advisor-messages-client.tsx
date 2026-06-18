"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdvisorMessagesAction,
  sendAdvisorMessageAction,
} from "@/lib/actions/message.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Conversation = {
  student_id: number;
  student_code?: string;
  full_name: string;
  email?: string;
  national_id?: string;
  major_type?: string | null;
  level?: number;
  cumulative_gpa?: number;
  total_earned_hours?: number;
  last_message: string | null;
};

type Message = {
  message_id: number;
  body: string;
  sent_at: string;
  from_advisor: boolean;
  sender_name?: string;
};

export default function AdvisorMessagesClient({
  token,
  conversations: initialConversations,
  initialStudentId,
}: {
  token: string;
  conversations: Conversation[];
  initialStudentId?: number;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const defaultId =
    initialStudentId &&
    initialConversations.some((c) => c.student_id === initialStudentId)
      ? initialStudentId
      : initialConversations[0]?.student_id ?? null;

  const [selectedId, setSelectedId] = useState<number | null>(defaultId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const selectedStudent = conversations.find((c) => c.student_id === selectedId);

  const loadMessages = useCallback(
    async (studentId: number) => {
      setSelectedId(studentId);
      setLoadingMessages(true);
      try {
        const result = await getAdvisorMessagesAction(token, studentId);
        if (result.status === "success") {
          setMessages(result.data);
        } else {
          toast.error(result.message);
        }
      } finally {
        setLoadingMessages(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (defaultId) {
      loadMessages(defaultId);
    }
  }, [defaultId, loadMessages]);

  const handleSend = async () => {
    if (!selectedId || !text.trim() || pending) return;

    const body = text.trim();
    setPending(true);
    try {
      const result = await sendAdvisorMessageAction(token, selectedId, body);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          message_id: result.data.message_id,
          body: result.data.body,
          sent_at: result.data.sent_at,
          from_advisor: true,
        },
      ]);
      setConversations((prev) =>
        prev.map((c) =>
          c.student_id === selectedId ? { ...c, last_message: body } : c
        )
      );
      setText("");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-[min(70vh,600px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:flex-row">
      <aside className="max-h-48 w-full shrink-0 overflow-y-auto border-b border-slate-200 md:max-h-none md:w-72 md:border-b-0 md:border-r">
        {conversations.map((c) => (
          <button
            key={c.student_id}
            type="button"
            onClick={() => loadMessages(c.student_id)}
            className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
              selectedId === c.student_id ? "bg-indigo-50" : ""
            }`}
          >
            <p className="font-medium text-slate-900">{c.full_name}</p>
            {c.last_message && (
              <p className="truncate text-xs text-slate-500">{c.last_message}</p>
            )}
          </button>
        ))}
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        {selectedStudent && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-6">
            <p className="font-semibold text-slate-900">{selectedStudent.full_name}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {selectedStudent.student_code && (
                <span>ID: {selectedStudent.student_code}</span>
              )}
              {selectedStudent.major_type && (
                <span>Major: {selectedStudent.major_type}</span>
              )}
              {selectedStudent.level != null && (
                <span>Year {selectedStudent.level}</span>
              )}
              {selectedStudent.cumulative_gpa != null && (
                <span>GPA: {selectedStudent.cumulative_gpa}</span>
              )}
              {selectedStudent.total_earned_hours != null && (
                <span>{selectedStudent.total_earned_hours} hrs earned</span>
              )}
              {selectedStudent.email && <span>{selectedStudent.email}</span>}
            </div>
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
          {loadingMessages ? (
            <p className="text-center text-sm text-slate-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.message_id}
                className={`flex flex-col ${m.from_advisor ? "items-end" : "items-start"}`}
              >
                {!m.from_advisor && m.sender_name && (
                  <span className="mb-1 text-xs text-slate-500">{m.sender_name}</span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm md:max-w-[75%] ${
                    m.from_advisor ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-1 text-[10px] text-slate-400">
                  {new Date(m.sent_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            disabled={!selectedId || pending}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} disabled={pending || !selectedId} className="shrink-0">
            {pending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
