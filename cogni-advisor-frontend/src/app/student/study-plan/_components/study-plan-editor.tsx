"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrainCircuit, Loader2, Plus, Save, Search, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  advisorUpdateStudyPlanAction,
  getAdvisorAvailableCoursesAction,
  getAvailableCoursesAction,
  submitStudyPlanAction,
  updateStudyPlanCoursesAction,
  type AvailableCourse,
} from "@/lib/actions/study-plan.action";

export type PlanCourseRow = {
  courseId: number;
  code: string;
  name: string;
  credits: number;
  level?: string;
};

interface StudyPlanEditorProps {
  token: string;
  planId: number;
  initialCourseIds: number[];
  initialCourses?: PlanCourseRow[];
  readOnly?: boolean;
  saveAs?: "student" | "advisor";
  onSaved?: () => void;
  showSubmitButton?: boolean;
}

export default function StudyPlanEditor({
  token,
  planId,
  initialCourseIds,
  initialCourses = [],
  readOnly = false,
  saveAs = "student",
  onSaved,
  showSubmitButton = false,
}: StudyPlanEditorProps) {
  const [available, setAvailable] = useState<AvailableCourse[]>([]);
  const [creditLimit, setCreditLimit] = useState(18);
  const [minCredits, setMinCredits] = useState(9);
  const [planningTerm, setPlanningTerm] = useState("First");
  const [selected, setSelected] = useState<Set<number>>(new Set(initialCourseIds));
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setSelected(new Set(initialCourseIds));
  }, [initialCourseIds]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res =
        saveAs === "advisor"
          ? await getAdvisorAvailableCoursesAction(token, planId)
          : await getAvailableCoursesAction(token, planId);
      if (res.status === "success") {
        setAvailable(res.data.courses);
        setCreditLimit(res.data.creditLimit);
        setMinCredits(res.data.minCredits);
        setPlanningTerm(res.data.planningTerm);
      } else {
        toast.error(res.message);
      }
      setLoading(false);
    })();
  }, [token, planId, saveAs]);

  const levels = useMemo(() => {
    const set = new Set(available.map((c) => c.level).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [available]);

  const courseById = useMemo(
    () => new Map(available.map((c) => [c.courseId, c])),
    [available]
  );

  const initialById = useMemo(
    () => new Map(initialCourses.map((c) => [c.courseId, c])),
    [initialCourses]
  );

  const selectedRows = useMemo((): PlanCourseRow[] => {
    return Array.from(selected).map((id) => {
      const fromCatalog = courseById.get(id);
      if (fromCatalog) {
        return {
          courseId: fromCatalog.courseId,
          code: fromCatalog.code,
          name: fromCatalog.name,
          credits: fromCatalog.credits,
          level: fromCatalog.level,
        };
      }
      const fromPlan = initialById.get(id);
      if (fromPlan) return fromPlan;
      return {
        courseId: id,
        code: "—",
        name: "Unknown course",
        credits: 0,
      };
    });
  }, [selected, courseById, initialById]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return available.filter((c) => {
      if (selected.has(c.courseId)) return false;
      if (levelFilter !== "all" && c.level !== levelFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.level.toLowerCase().includes(q)
      );
    });
  }, [available, filter, levelFilter, selected]);

  const selectedCredits = useMemo(() => {
    return selectedRows.reduce((sum, row) => sum + row.credits, 0);
  }, [selectedRows]);

  const removeFromPlan = (courseId: number) => {
    if (readOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
  };

  const toggle = (course: AvailableCourse) => {
    if (readOnly || !course.eligible) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(course.courseId)) {
        next.delete(course.courseId);
        return next;
      }
      const byId = new Map(available.map((c) => [c.courseId, c]));
      let total = 0;
      for (const id of next) total += byId.get(id)?.credits ?? 0;
      if (total + course.credits > creditLimit) {
        toast.error(`Credit limit exceeded (max ${creditLimit})`);
        return prev;
      }
      next.add(course.courseId);
      return next;
    });
  };

  const save = async (courseIds = Array.from(selected)) => {
    const res =
      saveAs === "advisor"
        ? await advisorUpdateStudyPlanAction(token, planId, courseIds)
        : await updateStudyPlanCoursesAction(token, planId, courseIds);
    if (res.status === "error") {
      toast.error(res.message);
      return false;
    }
    toast.success(saveAs === "advisor" ? "Student plan updated" : "Plan saved");
    if (saveAs === "student") {
      router.refresh();
    }
    onSaved?.();
    return true;
  };

  const handleSave = () => {
    startTransition(async () => {
      await save();
    });
  };

  const submitForReview = () => {
    if (selected.size === 0) {
      toast.error("Add at least one course before submitting");
      return;
    }
    if (selectedCredits < minCredits) {
      toast.error(`Minimum registration is ${minCredits} credits (selected: ${selectedCredits})`);
      return;
    }
    if (selectedCredits > creditLimit) {
      toast.error(`Credit limit exceeded (max ${creditLimit})`);
      return;
    }

    startTransition(async () => {
      const courseIds = Array.from(selected);
      const saved = await save(courseIds);
      if (!saved) return;

      const res = await submitStudyPlanAction(token, planId);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Study plan submitted for review");
      router.refresh();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading available courses...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="text-slate-600">
          Planning term: <span className="font-semibold text-slate-900">{planningTerm}</span>
          <span className="mx-2 text-slate-300">|</span>
          Credits:{" "}
          <span
            className={
              selectedCredits > creditLimit
                ? "font-semibold text-red-600"
                : "font-semibold text-slate-900"
            }
          >
            {selectedCredits}
          </span>
          / {creditLimit} (min {minCredits})
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={pending || selected.size === 0} size="sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saveAs === "advisor" ? "Save Changes" : "Save Selection"}
            </Button>
            {showSubmitButton && saveAs === "student" && (
              <Button
                onClick={submitForReview}
                disabled={pending || selected.size === 0 || selectedCredits < minCredits}
                size="sm"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Review
              </Button>
            )}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <BrainCircuit className="h-5 w-5 text-indigo-600" />
            {saveAs === "advisor" ? "Student's Study Plan" : "AI Suggested Plan"}
          </h3>
          <span className="text-sm text-slate-500">
            {selectedRows.length} course{selectedRows.length === 1 ? "" : "s"} · {selectedCredits} credits
          </span>
        </div>
        <div className="overflow-hidden overflow-x-auto rounded-2xl border-2 border-indigo-200 bg-indigo-50/30">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-indigo-100/60 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                {!readOnly && <th className="w-12 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100 bg-white">
              {selectedRows.map((course) => (
                <tr key={course.courseId}>
                  <td className="px-4 py-3 font-semibold text-indigo-900">{course.code}</td>
                  <td className="px-4 py-3 text-slate-700">{course.name}</td>
                  <td className="px-4 py-3 text-slate-600">{course.level ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{course.credits}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeFromPlan(course.courseId)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove from plan"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {selectedRows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No courses in your plan yet. Generate with AI or add from the catalog below.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Available Courses Catalog</h3>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l === "all" ? "All levels" : l}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {!readOnly && <th className="w-10 px-4 py-3" />}
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((course) => {
                const disabled = readOnly || !course.eligible;
                return (
                  <tr
                    key={course.courseId}
                    className={`${disabled ? "opacity-60" : "cursor-pointer hover:bg-slate-50/80"}`}
                    onClick={() => !disabled && toggle(course)}
                  >
                    {!readOnly && (
                      <td className="px-4 py-3">
                        {course.eligible && (
                          <Plus className="h-4 w-4 text-indigo-600" />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{course.code}</td>
                    <td className="px-4 py-3 text-slate-600">{course.name}</td>
                    <td className="px-4 py-3 text-slate-600">{course.level}</td>
                    <td className="px-4 py-3">{course.credits}</td>
                    <td className="px-4 py-3">
                      {course.eligible ? (
                        <span className="text-xs font-medium text-emerald-700">Eligible</span>
                      ) : (
                        <span className="text-xs text-red-600" title={course.reason}>
                          {course.reason ?? "Not eligible"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-slate-500">
              {available.length === 0
                ? "No courses available"
                : "All matching courses are already in your plan"}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
