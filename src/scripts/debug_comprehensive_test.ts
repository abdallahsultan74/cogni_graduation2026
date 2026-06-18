/**
 * Comprehensive multi-role / multi-student E2E with debug logging
 * Usage: npx tsx src/scripts/debug_comprehensive_test.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.COGNI_API_BASE_URL || "http://localhost:5000";
const DEBUG_ENDPOINT = "http://127.0.0.1:7556/ingest/2240a890-8410-40c2-a869-30e632357d32";
const SESSION_ID = "5ef5b3";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.resolve(__dirname, "../../debug-5ef5b3.log");

type Role = "ADMIN" | "ADVISOR" | "STUDENT";

interface StudentCase {
  email: string;
  label: string;
  expectLevel: number;
  expectMinSemesters?: number;
  expectMaxEnrollments?: number;
  expectMinEnrollments?: number;
  expectGpaMax?: number;
  expectGpaMin?: number;
  shouldGeneratePlan?: boolean;
}

const PASSWORD = "Password123";

const students: StudentCase[] = [
  {
    email: "youssef.ibrahim.y1@student.eelu.edu.eg",
    label: "Y1-first-term",
    expectLevel: 1,
    expectMaxEnrollments: 0,
    expectGpaMax: 0,
    shouldGeneratePlan: true,
  },
  {
    email: "nourhan.mahmoud.y1@student.eelu.edu.eg",
    label: "Y1-completed-year1",
    expectLevel: 1,
    expectMinEnrollments: 10,
    expectMinSemesters: 2,
  },
  {
    email: "hossam.ramy.y2@student.eelu.edu.eg",
    label: "Y2-failing",
    expectLevel: 2,
    expectMinEnrollments: 1,
    expectGpaMax: 2.5,
  },
  {
    email: "failed.y2@student.eelu.edu.eg",
    label: "Y2-failed-courses",
    expectLevel: 2,
    expectMinEnrollments: 1,
  },
  {
    email: "eyad.fathy.y3@student.eelu.edu.eg",
    label: "Y3-normal",
    expectLevel: 3,
    expectMinSemesters: 4,
  },
  {
    email: "repeat.y3@student.eelu.edu.eg",
    label: "Y3-repeat",
    expectLevel: 3,
    expectMinEnrollments: 1,
  },
  {
    email: "mostafa.gamal.y4@student.eelu.edu.eg",
    label: "Y4-senior",
    expectLevel: 4,
    expectMinSemesters: 6,
  },
  {
    email: "atrisk.y1@student.eelu.edu.eg",
    label: "Y1-at-risk",
    expectLevel: 1,
    expectGpaMax: 2.2,
    expectMinEnrollments: 1,
  },
];

function dbg(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = "pre-fix"
) {
  const entry = {
    sessionId: SESSION_ID,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

async function login(email: string, role: Role, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${res.status}: ${JSON.stringify(data)}`);
  return (data.accessToken ?? data.token) as string;
}

async function api(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function countEnrollments(transcript: any): number {
  return (transcript.semesters ?? []).reduce(
    (n: number, s: any) => n + (s.courses?.length ?? 0),
    0
  );
}

function semesterNames(transcript: any): string[] {
  return (transcript.semesters ?? []).map((s: any) => s.semester_name);
}

const failures: string[] = [];

function fail(msg: string, hypothesisId: string, data: Record<string, unknown>) {
  failures.push(msg);
  dbg(hypothesisId, "debug_comprehensive_test.ts", "FAIL", { msg, ...data });
  console.log(`❌ ${msg}`);
}

function pass(msg: string, hypothesisId: string, data: Record<string, unknown>) {
  dbg(hypothesisId, "debug_comprehensive_test.ts", "PASS", { msg, ...data });
  console.log(`✅ ${msg}`);
}

async function main() {
  console.log(`\n=== Debug Comprehensive Test (${BASE}) ===\n`);

  // H-A: first-term student should have zero enrollments
  // H-B: summer semesters missing from transcript ordering
  // H-C: level mismatch vs enrollments
  // H-D: advisor cannot load student transcript/details
  // H-E: study plan generate fails for empty-history students
  // H-F: admin users endpoint errors

  let advisorToken = "";
  let adminToken = "";

  try {
    advisorToken = await login("sara.20@advisor.eelu.edu.eg", "ADVISOR", "Aa123456#");
    adminToken = await login("admin@admin.eelu.edu.eg", "ADMIN", "Admin@12345");
  } catch (e) {
    fail(`Auth setup: ${e}`, "H-F", {});
    process.exit(1);
  }

  // Admin
  const usersRes = await api("GET", "/api/users", adminToken);
  dbg("H-F", "admin/users", "response", { status: usersRes.status });
  if (usersRes.status !== 200) {
    fail(`Admin GET /users → ${usersRes.status}`, "H-F", { data: usersRes.data });
  } else {
    pass("Admin GET /users OK", "H-F", { count: Array.isArray(usersRes.data) ? usersRes.data.length : 0 });
  }

  const overviewRes = await api("GET", "/api/admin/overview", adminToken);
  if (overviewRes.status !== 200) {
    fail(`Admin overview → ${overviewRes.status}`, "H-F", {});
  } else {
    pass("Admin overview OK", "H-F", { totalStudents: (overviewRes.data as any)?.totalStudents });
  }

  // Per-student
  for (const s of students) {
    let token: string;
    try {
      token = await login(s.email, "STUDENT", PASSWORD);
    } catch (e) {
      fail(`[${s.label}] login failed: ${e}`, "H-C", { email: s.email });
      continue;
    }

    const summary = await api("GET", "/api/students/me/summary", token);
    const transcript = await api("GET", "/api/students/me/transcript", token);

    dbg("H-C", "student/summary", s.label, {
      status: summary.status,
      level: (summary.data as any)?.current_level,
      gpa: (summary.data as any)?.cumulative_gpa,
    });

    if (summary.status !== 200) {
      fail(`[${s.label}] summary ${summary.status}`, "H-C", {});
      continue;
    }
    if (transcript.status !== 200) {
      fail(`[${s.label}] transcript ${transcript.status}`, "H-B", {});
      continue;
    }

    const t = transcript.data as any;
    const enrollCount = countEnrollments(t);
    const names = semesterNames(t);
    const level = (summary.data as any).current_level;
    const gpa = Number((summary.data as any).cumulative_gpa);

    dbg("H-B", "student/transcript", s.label, {
      enrollCount,
      semesterCount: names.length,
      semesters: names,
      level,
      gpa,
    });

    if (level !== s.expectLevel) {
      fail(`[${s.label}] level ${level} != expected ${s.expectLevel}`, "H-C", { level });
    }

    if (s.expectMaxEnrollments != null && enrollCount > s.expectMaxEnrollments) {
      fail(
        `[${s.label}] enrollments ${enrollCount} > max ${s.expectMaxEnrollments}`,
        "H-A",
        { enrollCount, semesters: names }
      );
    }
    if (s.expectMinEnrollments != null && enrollCount < s.expectMinEnrollments) {
      fail(
        `[${s.label}] enrollments ${enrollCount} < min ${s.expectMinEnrollments}`,
        "H-C",
        { enrollCount }
      );
    }
    if (s.expectMinSemesters != null && names.length < s.expectMinSemesters) {
      fail(
        `[${s.label}] semesters ${names.length} < min ${s.expectMinSemesters}`,
        "H-B",
        { names }
      );
    }
    if (s.expectGpaMax != null && gpa > s.expectGpaMax + 0.01) {
      fail(`[${s.label}] gpa ${gpa} > max ${s.expectGpaMax}`, "H-A", { gpa });
    }

    // Summer semesters exist in DB for students with history spanning years
    if (s.expectMinSemesters != null && s.expectMinSemesters >= 4) {
      const hasSummer = names.some((n) => /summer/i.test(n));
      dbg("H-B", "summer-check", s.label, { hasSummer, names });
      if (!hasSummer) {
        fail(`[${s.label}] no Summer semester in transcript (expected in calendar)`, "H-B", { names });
      }
    }

    // Advisor view
    const studentId = (summary.data as any).student_id;
    const advStudent = await api("GET", `/api/advisor/students/${studentId}`, advisorToken);
    const advTranscript = await api(
      "GET",
      `/api/advisor/students/${studentId}/transcript`,
      advisorToken
    );
    dbg("H-D", "advisor/student", s.label, {
      detailStatus: advStudent.status,
      transcriptStatus: advTranscript.status,
      studentId,
    });
    if (advStudent.status === 404) {
      fail(`[${s.label}] advisor cannot see student ${studentId} (not assigned?)`, "H-D", {});
    }
    if (advTranscript.status !== 200) {
      fail(`[${s.label}] advisor transcript ${advTranscript.status}`, "H-D", {});
    }

    if (s.shouldGeneratePlan) {
      const gen = await api("GET", "/api/study-plan/generate", token);
      dbg("H-E", "study-plan/generate", s.label, {
        status: gen.status,
        courses: (gen.data as any)?.data?.courses?.length,
        message: (gen.data as any)?.message,
      });
      if (gen.status !== 200 || !(gen.data as any)?.success) {
        fail(
          `[${s.label}] generate plan failed: ${(gen.data as any)?.message ?? gen.status}`,
          "H-E",
          { data: gen.data }
        );
      } else {
        const courseCount = (gen.data as any)?.data?.courses?.length ?? 0;
        const minExpected = s.label === "Y1-first-term" ? 6 : 1;
        if (courseCount < minExpected) {
          fail(`[${s.label}] generate returned ${courseCount} courses (expected >= ${minExpected})`, "H-E", {});
        } else {
          pass(`[${s.label}] generate plan ${courseCount} courses`, "H-E", { courseCount });
        }
      }
    }
  }

  // Advisor dashboard (retry once on rate limit during heavy test runs)
  let dash = await api("GET", "/api/advisor/dashboard", advisorToken);
  if (dash.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    dash = await api("GET", "/api/advisor/dashboard", advisorToken);
  }
  if (dash.status !== 200) {
    fail(`Advisor dashboard ${dash.status}`, "H-D", {});
  } else {
    pass("Advisor dashboard OK", "H-D", {
      students: (dash.data as any)?.totalStudentsCount,
      pending: (dash.data as any)?.pendingRequestsCount,
    });
  }

  console.log(`\n=== ${failures.length} failure(s) ===\n`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  dbg("H-F", "main", "crash", { error: String(e) });
  console.error(e);
  process.exit(1);
});
