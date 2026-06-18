"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewStudyPlanAction } from "@/lib/actions/advisor.action";
import StudyPlanEditor from "@/app/student/study-plan/_components/study-plan-editor";

type PlanCourse = {
  course_id: number;
  course: { course_code: string; course_name: string; credits: number };
};

type PendingPlan = {
  plan_id: number;
  total_hours: number;
  submitted_at: string;
  student: {
    student_id: number;
    level: number;
    cumulative_gpa: number;
    user: { first_name: string; last_name: string };
  };
  details: PlanCourse[];
};

export default function AdvisorStudyPlansClient({
  token,
  initialPlans,
}: {
  token: string;
  initialPlans: PendingPlan[];
}) {
  const [expanded, setExpanded] = useState<number | null>(
    initialPlans[0]?.plan_id ?? null
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const review = (planId: number, status: "APPROVED" | "REJECTED", feedback?: string) => {
    startTransition(async () => {
      const res = await reviewStudyPlanAction(token, planId, status, feedback);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success(status === "APPROVED" ? "Plan approved" : "Plan rejected");
      router.refresh();
    });
  };

  if (initialPlans.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        No plans pending review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {initialPlans.map((plan) => {
        const name = `${plan.student.user.first_name} ${plan.student.user.last_name}`;
        const isOpen = expanded === plan.plan_id;
        const courseIds = plan.details.map((d) => d.course_id);
        const planCourses = plan.details.map((d) => ({
          courseId: d.course_id,
          code: d.course.course_code,
          name: d.course.course_name,
          credits: d.course.credits,
        }));

        return (
          <div
            key={plan.plan_id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-slate-50 md:px-6"
              onClick={() => setExpanded(isOpen ? null : plan.plan_id)}
            >
              <div>
                <h3 className="font-bold text-slate-900">{name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Year {plan.student.level} · GPA {Number(plan.student.cumulative_gpa).toFixed(2)} ·{" "}
                  {plan.details.length} courses · {plan.total_hours} credits
                </p>
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
            </button>

            {isOpen && (
              <div className="space-y-5 border-t border-slate-100 px-4 py-5 md:px-6">
                <StudyPlanEditor
                  token={token}
                  planId={plan.plan_id}
                  initialCourseIds={courseIds}
                  initialCourses={planCourses}
                  saveAs="advisor"
                  onSaved={() => router.refresh()}
                />

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    disabled={pending}
                    onClick={() => review(plan.plan_id, "APPROVED")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    disabled={pending}
                    variant="destructive"
                    onClick={() => {
                      const fb = prompt("Rejection reason (optional):");
                      review(plan.plan_id, "REJECTED", fb || undefined);
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
