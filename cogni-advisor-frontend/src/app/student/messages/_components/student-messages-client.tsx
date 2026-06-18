"use client";

import { useState } from "react";
import { sendStudentMessageAction } from "@/lib/actions/message.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Message = {
  message_id: number;
  body: string;
  sent_at: string;
  from_me: boolean;
  sender_name: string;
};

export default function StudentMessagesClient({
  token,
  initialMessages,
}: {
  token: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || pending) return;

    setPending(true);
    try {
      const result = await sendStudentMessageAction(token, body);
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
          from_me: true,
          sender_name: "You",
        },
      ]);
      setText("");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-[min(70vh,600px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <p className="text-center text-slate-500">
            No messages yet. Start a conversation with your advisor.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.message_id}
              className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm md:max-w-[75%] ${
                  m.from_me
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 text-xs ${m.from_me ? "text-indigo-200" : "text-slate-400"}`}>
                  {new Date(m.sent_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={pending}
        />
        <Button onClick={handleSend} disabled={pending} className="shrink-0">
          {pending ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
