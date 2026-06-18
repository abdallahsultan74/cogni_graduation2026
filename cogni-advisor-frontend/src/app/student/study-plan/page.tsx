import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCurrentStudyPlanAction } from "@/lib/actions/study-plan.action";
import { AlertCircle, BookOpen, Calendar, CheckCircle2, Clock, Send } from "lucide-react";
import StudyPlanClient from "./_components/study-plan-client";
import StudyPlanEditor from "./_components/study-plan-editor";

function getPlanDisplayStatus(plan: {
  planStatus: string;
  submittedAt: string | null;
}): { label: string; className: string; icon: "approved" | "rejected" | "submitted" | "pending" } {
  if (plan.planStatus === "APPROVED") {
    return { label: "Approved", className: "bg-emerald-100 text-emerald-800", icon: "approved" };
  }
  if (plan.planStatus === "REJECTED") {
    return { label: "Rejected", className: "bg-red-100 text-red-800", icon: "rejected" };
  }
  if (plan.submittedAt) {
    return { label: "Under Review", className: "bg-blue-100 text-blue-800", icon: "submitted" };
  }
  return { label: "Draft", className: "bg-orange-100 text-orange-800", icon: "pending" };
}

export default async function StudyPlanPage() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) redirect("/login");
  if (session.user.role !== "student") redirect("/");

  const planResult = await getCurrentStudyPlanAction(session.accessToken);
  const plan = planResult.status === "success" ? planResult.data : null;
  const isNotFound = planResult.status === "not_found";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">My Study Plan</h1>
        <p className="mt-2 text-slate-500">
          Pick eligible courses from the catalog, or generate an AI suggestion and edit it.
        </p>
      </div>

      {isNotFound ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm md:py-20">
          <h2 className="text-xl font-bold text-slate-800 md:text-2xl">No plan for this semester</h2>
          <p className="mt-2 max-w-md px-4 text-slate-500">
            Click Generate with AI to create an initial plan that follows program bylaws.
          </p>
          <StudyPlanClient
            token={session.accessToken}
            action="generate"
            className="mt-8 px-6 py-3 text-base"
          />
        </div>
      ) : planResult.status === "error" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{planResult.message}</p>
        </div>
      ) : (
        plan && (
          <div className="space-y-6">
            {(() => {
              const display = getPlanDisplayStatus(plan);
              const isDraft = plan.planStatus === "PENDING" && !plan.submittedAt;
              const isUnderReview = plan.planStatus === "PENDING" && !!plan.submittedAt;
              const initialIds = plan.courses.map((c: { courseId: number }) => c.courseId);
              const planCourses = plan.courses.map(
                (c: {
                  courseId: number;
                  code: string;
                  name: string;
                  credits: number;
                }) => ({
                  courseId: c.courseId,
                  code: c.code,
                  name: c.name,
                  credits: c.credits,
                })
              );

              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold md:text-xl">{plan.semesterLabel}</h2>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${display.className}`}
                        >
                          {display.icon === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {display.icon === "pending" && <Clock className="h-3.5 w-3.5" />}
                          {display.icon === "submitted" && <Send className="h-3.5 w-3.5" />}
                          {display.label}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 md:gap-6">
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {plan.totalCourses} courses
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {plan.totalCredits} credits
                        </span>
                      </div>
                      {isUnderReview && (
                        <p className="mt-3 text-sm text-blue-700">
                          Your plan is with your advisor. You can withdraw or delete the request to edit.
                        </p>
                      )}
                    </div>

                    {isDraft && (
                      <div className="flex flex-wrap gap-3">
                        <StudyPlanClient token={session.accessToken} action="generate" />
                      </div>
                    )}
                    {isUnderReview && (
                      <div className="flex flex-wrap gap-3">
                        <StudyPlanClient
                          token={session.accessToken}
                          action="withdraw"
                          planId={plan.planId}
                        />
                        <StudyPlanClient
                          token={session.accessToken}
                          action="delete"
                          planId={plan.planId}
                        />
                      </div>
                    )}
                    {plan.planStatus === "REJECTED" && (
                      <StudyPlanClient token={session.accessToken} action="generate" />
                    )}
                  </div>

                  {isDraft && (
                    <StudyPlanEditor
                      token={session.accessToken}
                      planId={plan.planId}
                      initialCourseIds={initialIds}
                      initialCourses={planCourses}
                      showSubmitButton
                    />
                  )}

                  {!isDraft && (
                    <div className="overflow-hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium md:px-6 md:py-4">Code</th>
                            <th className="px-4 py-3 font-medium md:px-6 md:py-4">Course</th>
                            <th className="px-4 py-3 font-medium md:px-6 md:py-4">Credits</th>
                            <th className="px-4 py-3 font-medium md:px-6 md:py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {plan.courses.map(
                            (course: {
                              courseId: number;
                              code: string;
                              name: string;
                              credits: number;
                              status: string;
                            }) => (
                              <tr key={course.courseId}>
                                <td className="px-4 py-3 font-medium md:px-6 md:py-4">{course.code}</td>
                                <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">{course.name}</td>
                                <td className="px-4 py-3 md:px-6 md:py-4">{course.credits}</td>
                                <td className="px-4 py-3 md:px-6 md:py-4">{course.status}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )
      )}
    </div>
  );
}
