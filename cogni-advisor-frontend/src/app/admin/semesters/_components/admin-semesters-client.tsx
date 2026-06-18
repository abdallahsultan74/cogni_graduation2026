"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  activateSemesterAction,
  advanceSemesterAction,
  createSemesterAction,
  deleteSemesterAction,
} from "@/lib/actions/admin.action";

type Semester = {
  semester_id: number;
  semester_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

type CalendarState = {
  currentSemesterId: number | null;
  planningSemesterId: number | null;
};

export default function AdminSemestersClient({
  token,
  semesters: initialSemesters,
  currentSemesterId: initialCurrentId,
  planningSemesterId: initialPlanningId,
}: {
  token: string;
  semesters: Semester[];
  currentSemesterId: number | null;
  planningSemesterId: number | null;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [semesters, setSemesters] = useState(initialSemesters);
  const [calendar, setCalendar] = useState<CalendarState>({
    currentSemesterId: initialCurrentId,
    planningSemesterId: initialPlanningId,
  });
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const semesterName = (id: number | null) => {
    if (!id) return "Not set";
    return semesters.find((s) => s.semester_id === id)?.semester_name ?? `#${id}`;
  };

  const applyCalendar = (data: unknown) => {
    if (!data || typeof data !== "object") return;
    const cal = data as CalendarState;
    setCalendar({
      currentSemesterId: cal.currentSemesterId ?? null,
      planningSemesterId: cal.planningSemesterId ?? null,
    });
  };

  const create = async () => {
    if (!name.trim() || pending) return;
    setPending(true);
    try {
      const res = await createSemesterAction(token, {
        semester_name: name.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Semester created");
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const activate = async (id: number) => {
    if (pending) return;
    setPending(true);
    try {
      const res = await activateSemesterAction(token, id);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      applyCalendar(res.data);
      toast.success("Semester activated");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const advance = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await advanceSemesterAction(token);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      applyCalendar(res.data);
      toast.success("Advanced to next semester");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this semester?")) return;
    setPending(true);
    try {
      const res = await deleteSemesterAction(token, id);
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      setSemesters((prev) => prev.filter((s) => s.semester_id !== id));
      if (calendar.currentSemesterId === id) {
        setCalendar((c) => ({ ...c, currentSemesterId: null }));
      }
      if (calendar.planningSemesterId === id) {
        setCalendar((c) => ({ ...c, planningSemesterId: null }));
      }
      toast.success("Semester deleted");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          Current: <strong>{semesterName(calendar.currentSemesterId)}</strong>
          {" · "}
          Planning: <strong>{semesterName(calendar.planningSemesterId)}</strong>
        </p>
        <Button onClick={advance} disabled={pending} size="sm" className="mt-3">
          Advance Semester
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Input placeholder="Semester name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button onClick={create} disabled={pending}>Add Semester</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {semesters.map((s) => (
              <tr key={s.semester_id}>
                <td className="px-4 py-3 font-medium">
                  {s.semester_name}
                  {s.semester_id === calendar.currentSemesterId && (
                    <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Current</span>
                  )}
                  {s.semester_id === calendar.planningSemesterId && (
                    <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Planning</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"}
                  {" – "}
                  {s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}
                </td>
                <td className="space-x-2 px-4 py-3 text-right">
                  <button type="button" onClick={() => activate(s.semester_id)} className="text-xs font-medium text-indigo-600">Activate</button>
                  <button type="button" onClick={() => remove(s.semester_id)} className="text-xs font-medium text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
