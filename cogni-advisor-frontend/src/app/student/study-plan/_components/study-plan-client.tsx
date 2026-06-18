"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrainCircuit, Loader2, Send, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteStudyPlanAction,
  generateStudyPlanAction,
  getCurrentStudyPlanAction,
  submitStudyPlanAction,
  withdrawStudyPlanAction,
} from "@/lib/actions/study-plan.action";

type Action = "generate" | "submit" | "withdraw" | "delete";

interface StudyPlanClientProps {
  token: string;
  action: Action;
  planId?: number;
  className?: string;
  label?: string;
}

export default function StudyPlanClient({
  token,
  action,
  planId,
  className,
  label,
}: StudyPlanClientProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      let result;
      if (action === "generate") {
        result = await generateStudyPlanAction(token);
      } else if (action === "submit" && planId) {
        result = await submitStudyPlanAction(token, planId);
      } else if (action === "withdraw" && planId) {
        result = await withdrawStudyPlanAction(token, planId);
      } else if (action === "delete" && planId) {
        if (!confirm("Delete this study plan completely?")) return;
        result = await deleteStudyPlanAction(token, planId);
      } else {
        return;
      }

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      if (action === "generate") {
        const data = result.data as {
          data?: { courses?: unknown[]; totalCredits?: number };
          courses?: unknown[];
          totalCredits?: number;
        };
        const inner = data?.data ?? data;
        const courseCount = inner?.courses?.length ?? 0;
        const credits = inner?.totalCredits ?? 0;

        if (courseCount === 0) {
          toast.error("Plan generation returned no courses. Please try again.");
          return;
        }

        const verify = await getCurrentStudyPlanAction(token);
        if (verify.status === "not_found") {
          toast.error("Plan was generated but could not be loaded. Please refresh.");
          return;
        }

        toast.success(
          `Plan generated: ${courseCount} course${courseCount === 1 ? "" : "s"}, ${credits} credits`
        );
      }
      if (action === "submit") toast.success("Study plan submitted for review");
      if (action === "withdraw") toast.success("You can edit your plan now");
      if (action === "delete") toast.success("Study plan deleted");

      router.refresh();
    });
  };

  const labels: Record<Action, string> = {
    generate: label ?? (pending ? "Generating..." : "Generate with AI"),
    submit: label ?? "Submit for Review",
    withdraw: label ?? "Withdraw Request",
    delete: label ?? "Delete Plan",
  };

  const icons: Record<Action, React.ReactNode> = {
    generate: <BrainCircuit className="h-4 w-4" />,
    submit: <Send className="h-4 w-4" />,
    withdraw: <Undo2 className="h-4 w-4" />,
    delete: <Trash2 className="h-4 w-4" />,
  };

  const variants: Record<Action, "default" | "destructive" | "outline" | "secondary"> = {
    generate: "default",
    submit: "default",
    withdraw: "outline",
    delete: "destructive",
  };

  return (
    <Button
      onClick={run}
      disabled={pending}
      variant={variants[action]}
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icons[action]}
      {labels[action]}
    </Button>
  );
}
