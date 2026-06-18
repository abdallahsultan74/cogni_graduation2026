"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignAdvisorAction, deleteUserAction } from "@/lib/actions/admin.action";

type Advisor = { id: number; name: string };

export default function AssignAdvisorClient({
  token,
  studentId,
  userId,
  advisors,
  currentAdvisorId,
}: {
  token: string;
  studentId: number;
  userId?: number;
  advisors: Advisor[];
  currentAdvisorId?: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onAssign = (advisorId: string) => {
    startTransition(async () => {
      const res = await assignAdvisorAction(
        token,
        studentId,
        advisorId ? Number(advisorId) : null
      );
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Advisor updated");
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!userId || !confirm("Delete this user permanently?")) return;
    startTransition(async () => {
      const res = await deleteUserAction(token, userId);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("User deleted");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        disabled={pending}
        defaultValue={currentAdvisorId ?? ""}
        onChange={(e) => onAssign(e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
      >
        <option value="">No advisor</option>
        {advisors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {userId && (
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="text-xs font-medium text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      )}
    </div>
  );
}
