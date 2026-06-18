"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bulkGradesAction,
  getStudentEnrollmentsAction,
  markGradeAction,
  resolveSemesterAction,
  searchStudentsAction,
  type CurriculumGroup,
} from "@/lib/actions/admin.action";

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

type SemesterMode = "name" | "date" | "list";

type SemesterPayload =
  | { semester_name: string }
  | { result_date: string }
  | { semester_id: number };

export default function AdminGradesClient({
  token,
  semesters,
}: {
  token: string;
  semesters: Array<{ semester_id: number; semester_name: string | null }>;
}) {
  const [tab, setTab] = useState<"csv" | "manual">("csv");
  const [semesterMode, setSemesterMode] = useState<SemesterMode>("name");
  const [semesterName, setSemesterName] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [semesterId, setSemesterId] = useState(semesters[0]?.semester_id ?? 0);
  const [resolvedPreview, setResolvedPreview] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("student_email,course_code,grade\n");
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<
    Array<{ student_id: number; user: { first_name: string; last_name: string; university_email: string } }>
  >([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<
    Array<{ enrollment_id: number; course_id: number; grade: string | null; course: { course_code: string; course_name: string } }>
  >([]);
  const [curriculumGroups, setCurriculumGroups] = useState<
    CurriculumGroup<{
      enrollment_id: number;
      course_id: number;
      grade: string | null;
      course: { course_code: string; course_name: string };
    }>[]
  >([]);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  const buildSemesterPayload = (): SemesterPayload | null => {
    if (semesterMode === "name") {
      const name = semesterName.trim();
      if (!name) return null;
      return { semester_name: name };
    }
    if (semesterMode === "date") {
      if (!resultDate) return null;
      return { result_date: resultDate };
    }
    if (!semesterId) return null;
    return { semester_id: semesterId };
  };

  const previewSemester = useCallback(async () => {
    if (semesterMode === "list") {
      const selected = semesters.find((s) => s.semester_id === semesterId);
      setResolvedPreview(selected?.semester_name ?? null);
      return;
    }
    if (semesterMode === "name" && !semesterName.trim()) {
      setResolvedPreview(null);
      return;
    }
    if (semesterMode === "date" && !resultDate) {
      setResolvedPreview(null);
      return;
    }
    const payload =
      semesterMode === "name"
        ? { semester_name: semesterName.trim() }
        : { result_date: resultDate };
    const res = await resolveSemesterAction(token, payload);
    if (res.status === "success") {
      const label = res.data.semester_name ?? `#${res.data.semester_id}`;
      setResolvedPreview(res.data.created ? `${label} (سيتم إنشاؤه)` : label);
    } else {
      setResolvedPreview(null);
    }
  }, [semesterMode, semesterName, resultDate, semesterId, semesters, token]);

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/).slice(1);
    return lines
      .map((line) => {
        const [student_email, course_code, grade] = line.split(",").map((s) => s.trim());
        if (!student_email || !course_code || !grade) return null;
        return { student_email, course_code, grade };
      })
      .filter(Boolean) as Array<{ student_email: string; course_code: string; grade: string }>;
  };

  const uploadCsv = () => {
    const semesterPayload = buildSemesterPayload();
    if (!semesterPayload) {
      toast.error("حدد السمستر (اسم، تاريخ، أو من القائمة)");
      return;
    }
    const grades = parseCsv(csvText);
    if (grades.length === 0) {
      toast.error("No valid rows in CSV");
      return;
    }
    startTransition(async () => {
      const res = await bulkGradesAction(token, { ...semesterPayload, grades });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      const sem = res.data.semester_name ? ` — ${res.data.semester_name}` : "";
      toast.success(`Uploaded${sem}: ${res.data.success} ok, ${res.data.failed} failed`);
    });
  };

  const search = () => {
    startTransition(async () => {
      const res = await searchStudentsAction(token, query);
      if (res.status === "success") setStudents(res.data);
    });
  };

  const loadEnrollments = (studentId: number, studentLabel?: string) => {
    setSelectedStudent(studentId);
    if (studentLabel) setSelectedStudentName(studentLabel);
    startTransition(async () => {
      const res = await getStudentEnrollmentsAction(token, studentId);
      if (res.status === "success") {
        setEnrollments(res.data.enrollments ?? []);
        setCurriculumGroups(res.data.curriculum_groups ?? []);
        if (!studentLabel && res.data.user) {
          setSelectedStudentName(
            `${res.data.user.first_name} ${res.data.user.last_name} — ${res.data.user.university_email}`
          );
        }
      }
    });
  };

  const saveGrade = (courseId: number, grade: string) => {
    if (!selectedStudent || !grade) return;
    const semesterPayload = buildSemesterPayload();
    startTransition(async () => {
      const res = await markGradeAction(token, {
        student_id: selectedStudent,
        course_id: courseId,
        grade,
        ...(semesterPayload ?? {}),
      });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      toast.success("Grade saved");
      loadEnrollments(selectedStudent);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === "csv" ? "default" : "outline"} size="sm" onClick={() => setTab("csv")}>
          CSV Upload
        </Button>
        <Button variant={tab === "manual" ? "default" : "outline"} size="sm" onClick={() => setTab("manual")}>
          Manual Entry
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-800">السمستر / الفصل الدراسي</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={semesterMode === "name" ? "default" : "outline"}
            onClick={() => { setSemesterMode("name"); setResolvedPreview(null); }}
          >
            اكتب اسم السمستر
          </Button>
          <Button
            type="button"
            size="sm"
            variant={semesterMode === "date" ? "default" : "outline"}
            onClick={() => { setSemesterMode("date"); setResolvedPreview(null); }}
          >
            حدد بالتاريخ
          </Button>
          <Button
            type="button"
            size="sm"
            variant={semesterMode === "list" ? "default" : "outline"}
            onClick={() => { setSemesterMode("list"); setResolvedPreview(null); }}
          >
            من القائمة
          </Button>
        </div>

        {semesterMode === "name" && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="مثال: Spring 2027 أو خريف 2025"
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              onBlur={previewSemester}
              className="max-w-md"
            />
            <Button type="button" size="sm" variant="outline" onClick={previewSemester}>
              تحقق
            </Button>
          </div>
        )}

        {semesterMode === "date" && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={resultDate}
              onChange={(e) => setResultDate(e.target.value)}
              onBlur={previewSemester}
              className="max-w-xs"
            />
            <Button type="button" size="sm" variant="outline" onClick={previewSemester}>
              حدد السمستر
            </Button>
            <span className="text-xs text-slate-500">يُطابق الفصل حسب تواريخ البداية والنهاية</span>
          </div>
        )}

        {semesterMode === "list" && (
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={semesterId}
            onChange={(e) => {
              setSemesterId(Number(e.target.value));
              const selected = semesters.find((s) => s.semester_id === Number(e.target.value));
              setResolvedPreview(selected?.semester_name ?? null);
            }}
          >
            {semesters.map((s) => (
              <option key={s.semester_id} value={s.semester_id}>
                {s.semester_name ?? `Semester ${s.semester_id}`}
              </option>
            ))}
          </select>
        )}

        {resolvedPreview && (
          <p className="text-sm text-emerald-700">
            السمستر المستخدم: <strong>{resolvedPreview}</strong>
          </p>
        )}
      </div>

      {tab === "csv" ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Format: student_email,course_code,grade</p>
          <textarea
            className="min-h-[160px] w-full rounded-lg border border-slate-200 p-3 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <Button onClick={uploadCsv} disabled={pending}>
            Upload Grades
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <Input placeholder="Search student by email or name" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button onClick={search} disabled={pending}>
              Search
            </Button>
          </div>
          {students.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {students.map((s) => (
                <li key={s.student_id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() =>
                      loadEnrollments(
                        s.student_id,
                        `${s.user.first_name} ${s.user.last_name} — ${s.user.university_email}`
                      )
                    }
                  >
                    {s.user.first_name} {s.user.last_name} — {s.user.university_email}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {curriculumGroups.length > 0 && (
            <div className="space-y-4">
              {selectedStudentName && (
                <p className="text-sm font-medium text-slate-800">{selectedStudentName}</p>
              )}
              {curriculumGroups.map((group) => (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {group.yearLabel ? `${group.yearLabel} — ${group.semesterLabel ?? group.term}` : group.label}
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Course</th>
                        <th className="px-3 py-2 text-left">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((e) => (
                        <tr key={e.enrollment_id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            {e.course.course_code} — {e.course.course_name}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              defaultValue={e.grade ?? ""}
                              onChange={(ev) => saveGrade(e.course_id, ev.target.value)}
                              className="rounded border px-2 py-1 text-xs"
                            >
                              <option value="">—</option>
                              {GRADES.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
          {selectedStudent && curriculumGroups.length === 0 && enrollments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-2 text-left">Course</th>
                  <th className="py-2 text-left">Grade</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.enrollment_id}>
                    <td className="py-2">
                      {e.course.course_code} — {e.course.course_name}
                    </td>
                    <td className="py-2">
                      <select
                        defaultValue={e.grade ?? ""}
                        onChange={(ev) => saveGrade(e.course_id, ev.target.value)}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
