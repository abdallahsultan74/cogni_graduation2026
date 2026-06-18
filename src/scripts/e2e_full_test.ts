/**
 * Full E2E API test — Cogni-Advisor
 * Usage: npx tsx src/scripts/e2e_full_test.ts
 *
 * Login uses university_email (not personal_email). See docs/FRONTEND_TESTING.md §3.3.
 */
const BASE = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

type Role = "ADMIN" | "ADVISOR" | "STUDENT";

interface Account {
  email: string;
  password: string;
  role: Role;
  label: string;
}

const accounts: Account[] = [
  { email: "admin@admin.eelu.edu.eg", password: "Admin@12345", role: "ADMIN", label: "Admin" },
  { email: "sara.20@advisor.eelu.edu.eg", password: "Aa123456#", role: "ADVISOR", label: "Advisor Sara" },
  { email: "user.2200031@student.eelu.edu.eg", password: "Password123", role: "STUDENT", label: "Passing student" },
  { email: "user.2200047@student.eelu.edu.eg", password: "Password123", role: "STUDENT", label: "Failing student" },
  { email: "user.2200037@student.eelu.edu.eg", password: "Password123", role: "STUDENT", label: "At-risk student" },
];

interface TestResult {
  flow: string;
  role: string;
  status: "PASS" | "FAIL" | "SKIP";
  note: string;
}

const results: TestResult[] = [];
const tokens: Record<string, string> = {};

async function checkServer(): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`health ${res.status}`);
  } catch {
    throw new Error(
      `Cannot reach backend at ${BASE}. Start the API server first (e.g. npm run dev).`
    );
  }
}

function tokenFor(email: string): string | undefined {
  return tokens[email];
}

async function login(acc: Account): Promise<string> {
  const loginPath =
    acc.role === "STUDENT"
      ? "/api/auth/login/student"
      : acc.role === "ADVISOR"
        ? "/api/auth/login/advisor"
        : "/api/auth/login/admin";

  const res = await fetch(`${BASE}${loginPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: acc.email, password: acc.password }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.accessToken ?? data.token) as string;
}

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function record(flow: string, role: string, ok: boolean, note: string) {
  results.push({ flow, role, status: ok ? "PASS" : "FAIL", note });
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} [${role}] ${flow}: ${note}`);
}

async function runTest(flow: string, role: string, fn: () => Promise<void>) {
  try {
    await fn();
    record(flow, role, true, "OK");
  } catch (e) {
    record(flow, role, false, e instanceof Error ? e.message : String(e));
  }
}

async function runTestWithToken(
  flow: string,
  role: string,
  email: string,
  fn: (token: string) => Promise<void>
) {
  const token = tokenFor(email);
  if (!token) {
    results.push({ flow, role, status: "SKIP", note: "login failed" });
    console.log(`⏭️ [${role}] ${flow}: SKIP (login failed)`);
    return;
  }
  await runTest(flow, role, () => fn(token));
}

const PASSING_EMAIL = "user.2200031@student.eelu.edu.eg";
const FAILING_EMAIL = "user.2200047@student.eelu.edu.eg";
const AT_RISK_EMAIL = "user.2200037@student.eelu.edu.eg";
const ADVISOR_EMAIL = "sara.20@advisor.eelu.edu.eg";
const ADMIN_EMAIL = "admin@admin.eelu.edu.eg";

async function main() {
  console.log(`\n=== Cogni-Advisor Full E2E Test ===`);
  console.log(`Target: ${BASE}\n`);

  await checkServer();

  // --- Login all accounts ---
  for (const acc of accounts) {
    await runTest("Login", acc.label, async () => {
      const token = await login(acc);
      if (!token) throw new Error("no token");
      tokens[acc.email] = token;
    });
  }

  // --- Student flows (all 3 students) ---
  for (const [label, email] of [
    ["Passing student", PASSING_EMAIL],
    ["Failing student", FAILING_EMAIL],
    ["At-risk student", AT_RISK_EMAIL],
  ] as const) {
    await runTestWithToken("GET /students/me/summary", label, email, async (token) => {
      const { status, data } = await api("GET", "/api/students/me/summary", token);
      if (status !== 200) throw new Error(`status ${status}`);
      if (!data.student_id && !data.studentId) throw new Error("missing student id");
    });

    await runTestWithToken("GET /students/me/transcript", label, email, async (token) => {
      const { status, data } = await api("GET", "/api/students/me/transcript", token);
      if (status !== 200) throw new Error(`status ${status}`);
      if (!Array.isArray(data.semesters)) throw new Error("missing semesters[]");
    });
  }

  // --- Arabic AI chat (passing student) ---
  const arabicMessages = [
    "أريد خطة دراسية للفصل القادم",
    "ما هي متطلبات IT216؟",
    "كم الحد الأقصى للساعات المعتمدة؟",
  ];
  for (const msg of arabicMessages) {
    await runTestWithToken(`POST /ai/chat (AR: ${msg.slice(0, 20)}...)`, "Passing student", PASSING_EMAIL, async (token) => {
      const { status, data } = await api("POST", "/api/ai/chat", token, { message: msg });
      if (status !== 200 && status !== 201) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
      if (!data.answer) throw new Error("missing answer");
      if (data.answer.length < 5) throw new Error(`answer too short: ${data.answer}`);
    });
  }

  // --- Study plan generate + submit (passing student) ---
  let planId: number | null = null;
  await runTestWithToken("GET /study-plan/generate", "Passing student", PASSING_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/study-plan/generate", token);
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
    if (!data.success && !data.data) throw new Error("generate failed");
  });

  await runTestWithToken("GET /study-plan/me/current", "Passing student", PASSING_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/study-plan/me/current", token);
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
    planId = data.plan_id ?? data.planId;
    if (!planId) throw new Error("no plan_id");
  });

  if (planId && tokenFor(PASSING_EMAIL)) {
    await runTestWithToken("PATCH /study-plan/:id/submit", "Passing student", PASSING_EMAIL, async (token) => {
      const { status, data } = await api("PATCH", `/api/study-plan/${planId}/submit`, token);
      if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
    });
  }

  // --- Student sends message to advisor ---
  await runTestWithToken("POST /students/me/messages", "Passing student", PASSING_EMAIL, async (token) => {
    const { status, data } = await api("POST", "/api/students/me/messages", token, {
      content: "مرحباً دكتورة، أريد استشارة بخصوص الخطة الدراسية - اختبار E2E",
    });
    if (status !== 200 && status !== 201) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
  });

  await runTestWithToken("GET /students/me/messages", "Passing student", PASSING_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/students/me/messages", token);
    if (status !== 200) throw new Error(`status ${status}`);
    if (!Array.isArray(data.messages ?? data)) throw new Error("missing messages array");
  });

  // --- Advisor flows ---
  await runTestWithToken("GET /advisor/dashboard", "Advisor Sara", ADVISOR_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/advisor/dashboard", token);
    if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
  });

  let studentId: number | null = null;
  await runTestWithToken("GET /advisor/students", "Advisor Sara", ADVISOR_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/advisor/students", token);
    if (status !== 200) throw new Error(`status ${status}`);
    const students = data.students ?? data;
    if (!Array.isArray(students) || students.length === 0) throw new Error("no students assigned");
    studentId = students[0].student_id ?? students[0].studentId ?? students[0].id;
  });

  if (studentId && tokenFor(ADVISOR_EMAIL)) {
    await runTestWithToken("GET /advisor/students/:id", "Advisor Sara", ADVISOR_EMAIL, async (token) => {
      const { status, data } = await api("GET", `/api/advisor/students/${studentId}`, token);
      if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
    });

    await runTestWithToken("GET /advisor/students/:id/transcript", "Advisor Sara", ADVISOR_EMAIL, async (token) => {
      const { status, data } = await api("GET", `/api/advisor/students/${studentId}/transcript`, token);
      if (status !== 200) throw new Error(`status ${status}`);
      if (!Array.isArray(data.semesters)) throw new Error("missing semesters");
    });
  }

  await runTestWithToken("GET /study-plan/advisor/pending", "Advisor Sara", ADVISOR_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/study-plan/advisor/pending", token);
    if (status !== 200) throw new Error(`status ${status}`);
    if (!Array.isArray(data.plans ?? data)) throw new Error("missing plans array");
  });

  await runTestWithToken("GET /advisor/messages/conversations", "Advisor Sara", ADVISOR_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/advisor/messages/conversations", token);
    if (status !== 200) throw new Error(`status ${status}`);
    const convs = data.conversations ?? data;
    if (!Array.isArray(convs)) throw new Error("missing conversations");
  });

  if (studentId && tokenFor(ADVISOR_EMAIL)) {
    await runTestWithToken(
      "GET /advisor/messages/conversations/:studentId/messages",
      "Advisor Sara",
      ADVISOR_EMAIL,
      async (token) => {
        const { status } = await api(
          "GET",
          `/api/advisor/messages/conversations/${studentId}/messages`,
          token
        );
        if (status !== 200) throw new Error(`status ${status}`);
      }
    );

    await runTestWithToken(
      "POST /advisor/messages/conversations/:studentId/messages (reply)",
      "Advisor Sara",
      ADVISOR_EMAIL,
      async (token) => {
        const { status, data } = await api(
          "POST",
          `/api/advisor/messages/conversations/${studentId}/messages`,
          token,
          { content: "أهلاً بك، سأساعدك في مراجعة خطتك الدراسية - رد E2E" }
        );
        if (status !== 200 && status !== 201) throw new Error(`status ${status}: ${JSON.stringify(data)}`);
      }
    );
  }

  // --- Admin flows ---
  await runTestWithToken("GET /admin/overview", "Admin", ADMIN_EMAIL, async (token) => {
    const { status } = await api("GET", "/api/admin/overview", token);
    if (status !== 200) throw new Error(`status ${status}`);
  });

  await runTestWithToken("GET /users", "Admin", ADMIN_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/users", token);
    if (status !== 200) throw new Error(`status ${status}`);
    const users = data.users ?? data;
    if (!Array.isArray(users)) throw new Error("missing users array");
  });

  // --- AI history ---
  await runTestWithToken("GET /ai/history", "Passing student", PASSING_EMAIL, async (token) => {
    const { status, data } = await api("GET", "/api/ai/history", token);
    if (status !== 200) throw new Error(`status ${status}`);
    if (!Array.isArray(data.interactions)) throw new Error("missing interactions");
  });

  // --- Summary table ---
  console.log("\n=== RESULTS TABLE ===");
  const fails = results.filter((r) => r.status === "FAIL");
  const passes = results.filter((r) => r.status === "PASS");
  const skips = results.filter((r) => r.status === "SKIP");

  console.log(
    `\nTotal: ${results.length} | PASS: ${passes.length} | FAIL: ${fails.length} | SKIP: ${skips.length}\n`
  );

  // Group by role for table
  const roles = [...new Set(results.map((r) => r.role))];
  for (const role of roles) {
    console.log(`\n--- ${role} ---`);
    for (const r of results.filter((x) => x.role === role)) {
      console.log(`  ${r.status.padEnd(4)} | ${r.flow} | ${r.note}`);
    }
  }

  if (fails.length > 0) {
    process.exitCode = 1;
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
