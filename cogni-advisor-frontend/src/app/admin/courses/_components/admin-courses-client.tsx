"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteCourseAction,
  toggleCourseAction,
  type CurriculumGroup,
  type EeluCourseRow,
} from "@/lib/actions/admin.action";

export default function AdminCoursesClient({
  token,
  groups,
}: {
  token: string;
  groups: CurriculumGroup<EeluCourseRow>[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: number) => {
    startTransition(async () => {
      const res = await toggleCourseAction(token, id);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      router.refresh();
    });
  };

  const remove = (id: number) => {
    if (!confirm("Delete this course?")) return;
    startTransition(async () => {
      const res = await deleteCourseAction(token, id);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Course deleted");
      router.refresh();
    });
  };

  let lastYear = "";

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">
        Bachelor Degree Program In Information Technology — course distribution per official bylaws (eelu.pdf).
      </p>

      {groups.map((group) => {
        const showYear = group.yearLabel !== lastYear;
        if (group.yearLabel) lastYear = group.yearLabel;

        return (
          <div key={group.key}>
            {showYear && group.yearLabel && (
              <h2 className="mb-4 text-lg font-bold text-slate-900">{group.yearLabel}</h2>
            )}

            <section className="mb-6 overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-2">
                <h3 className="text-sm font-semibold text-slate-800">{group.semesterLabel ?? group.term}</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white text-left text-xs text-slate-600">
                      <th className="whitespace-pre-line px-3 py-2 font-medium">Course{"\n"}code</th>
                      <th className="px-3 py-2 font-medium">Course Name</th>
                      <th className="whitespace-pre-line px-3 py-2 font-medium">Credit{"\n"}Hours</th>
                      <th className="whitespace-pre-line px-3 py-2 font-medium">Lecture{"\n"}Hours</th>
                      <th className="whitespace-pre-line px-3 py-2 font-medium">Exercise/Lab{"\n"}Hours</th>
                      <th className="px-3 py-2 font-medium">Prerequisite</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((c) => (
                      <tr key={c.code} className="border-b border-slate-100 align-top">
                        <td className="px-3 py-2 font-medium">{c.code}</td>
                        <td className="px-3 py-2 text-slate-700">{c.name}</td>
                        <td className="px-3 py-2">{c.credit_hours}</td>
                        <td className="px-3 py-2">{c.lecture_hours || "—"}</td>
                        <td className="px-3 py-2">{c.exercise_lab_hours || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{c.prerequisite || "—"}</td>
                        <td className="px-3 py-2">
                          {c.course_id ? (
                            <span className={c.is_available ? "text-emerald-600" : "text-slate-400"}>
                              {c.is_available ? "Available" : "Disabled"}
                            </span>
                          ) : (
                            <span className="text-amber-600">Not in DB</span>
                          )}
                        </td>
                        <td className="space-x-2 px-3 py-2 text-right">
                          {c.course_id ? (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggle(c.course_id!)}
                                className="text-xs font-medium text-indigo-600"
                              >
                                Toggle
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => remove(c.course_id!)}
                                className="text-xs font-medium text-red-600"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {group.totalCreditHours != null && (
                      <tr className="bg-slate-50 font-medium">
                        <td className="px-3 py-2" colSpan={2} />
                        <td className="px-3 py-2">{group.totalCreditHours}</td>
                        <td className="px-3 py-2" colSpan={5} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );
      })}

      {groups.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          No curriculum data found.
        </p>
      )}
    </div>
  );
}
