"use client";

import { CheckCircle2, Copy, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type CreatedUserCardData = {
  userId: string;
  fullName: string;
  role: string;
  email: string;
};

type UserCardProps = {
  data: CreatedUserCardData;
};

export default function UserCard({ data }: UserCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(data.email);
    setIsCopied(true);
    toast.success("Email copied");
    setTimeout(() => setIsCopied(false), 1200);
  };

  return (
    <article className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 duration-300">
      <div className="mb-4 flex items-center gap-2 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" />
        <p className="text-sm font-semibold">Account created successfully</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Full Name</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UserRound className="h-4 w-4 text-slate-500" />
            {data.fullName}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Role</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            {data.role}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 md:col-span-2">
          <p className="text-xs text-slate-500">Generated Email</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
              <Mail className="h-4 w-4 text-indigo-600" />
              {data.email}
            </p>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">User ID</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{data.userId}</p>
        </div>
      </div>
    </article>
  );
}
