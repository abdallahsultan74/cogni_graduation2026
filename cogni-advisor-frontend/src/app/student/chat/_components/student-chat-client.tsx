"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getChatHistoryAction,
  sendChatMessageAction,
} from "@/lib/actions/student.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, User } from "lucide-react";

type ChatMessage = { role: "user" | "bot"; content: string; failed?: boolean };

export default function StudentChatClient({ token }: { token: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content:
        "Hello! I'm the Cogni-Advisor assistant. Ask me about bylaws or your study plan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getChatHistoryAction(token);
      if (result.status !== "success") {
        setHistoryLoaded(true);
        return;
      }
      const chatItems = (result.data.interactions ?? [])
        .filter(
          (i: { query_type: string; message?: string | null; answer?: string | null }) =>
            i.query_type === "CHAT" && i.message
        )
        .reverse();
      if (chatItems.length > 0) {
        const restored: ChatMessage[] = [];
        for (const item of chatItems) {
          restored.push({ role: "user", content: item.message! });
          if (item.answer) {
            restored.push({
              role: "bot",
              content: item.answer,
              failed: item.status === "FAILED",
            });
          }
        }
        setMessages(restored);
      }
      setHistoryLoaded(true);
    })();
  }, [token]);

  const ask = () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    startTransition(async () => {
      const result = await sendChatMessageAction(token, question);
      if (result.status === "error") {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: result.message, failed: true },
        ]);
        return;
      }
      const failed = result.data.status === "FAILED";
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: result.data.answer ?? "No response",
          failed,
        },
      ]);
    });
  };

  if (!historyLoaded) {
    return (
      <div className="flex h-[min(85vh,780px)] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
        Loading chat history...
      </div>
    );
  }

  return (
    <div className="flex h-[min(85vh,780px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-7">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "bot" && <Bot className="mt-1.5 h-6 w-6 shrink-0 text-indigo-600" />}
            <div
              className={`max-w-[92%] rounded-2xl px-5 py-4 text-base leading-relaxed md:max-w-[88%] md:text-lg ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : m.failed
                    ? "border border-red-200 bg-red-50 text-red-800"
                    : "bg-slate-100 text-slate-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
            {m.role === "user" && <User className="mt-1.5 h-6 w-6 shrink-0 text-slate-400" />}
          </div>
        ))}
        {pending && (
          <p className="animate-pulse text-base text-slate-400 md:text-lg">Thinking...</p>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 p-4 md:p-5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about bylaws, requirements, or your plan..."
            onKeyDown={(e) => e.key === "Enter" && ask()}
            className="h-14 text-base"
          />
        </div>
        <Button onClick={ask} disabled={pending} className="h-14 shrink-0 px-8">
          Send
        </Button>
      </div>
    </div>
  );
}
