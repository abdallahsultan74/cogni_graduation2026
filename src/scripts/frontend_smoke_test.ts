/**
 * Smoke tests for frontend-backed API flows.
 * Usage: npx tsx src/scripts/frontend_smoke_test.ts
 *        npx tsx src/scripts/frontend_smoke_test.ts --open   (writes HTML + opens browser)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.COGNI_API_BASE_URL || "http://localhost:5000";
const OPEN_BROWSER = process.argv.includes("--open");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_HTML = path.resolve(__dirname, "../../docs/frontend-test-report.html");
const STUDENT_PASSWORD = "Password123";
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 2000;

type Role = "ADMIN" | "ADVISOR" | "STUDENT";

interface Account {
  role: Role;
  email: string;
  password: string;
  label: string;
}

const accounts: Account[] = [
  {
    role: "STUDENT",
    email: "user.2200039@student.eelu.edu.eg",
    password: STUDENT_PASSWORD,
    label: "Eyad Y3",
  },
  {
    role: "STUDENT",
    email: "user.2200032@student.eelu.edu.eg",
    password: STUDENT_PASSWORD,
    label: "Nourhan Y1",
  },
  {
    role: "ADVISOR",
    email: "sara.20@advisor.eelu.edu.eg",
    password: "Aa123456#",
    label: "Sara",
  },
  {
    role: "ADMIN",
    email: "admin@admin.eelu.edu.eg",
    password: "Admin@12345",
    label: "Admin",
  },
];

interface TestResult {
  id: string;
  name: string;
  status: "PASS" | "FAIL";
  note?: string;
}

const results: TestResult[] = [];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const loginPath = (role: Role) =>
  role === "STUDENT"
    ? "/api/auth/login/student"
    : role === "ADVISOR"
      ? "/api/auth/login/advisor"
      : "/api/auth/login/admin";

async function fetchJson(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES
): Promise<{ status: number; data: unknown }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (res.status === 429 && attempt < retries) {
      const delay = RETRY_BASE_MS * (attempt + 1);
      console.log(`⏳ Rate limited — retrying in ${delay / 1000}s...`);
      await wait(delay);
      continue;
    }

    return { status: res.status, data };
  }

  return { status: 429, data: { message: "Too many retries" } };
}

async function login(acc: Account): Promise<string> {
  const { status, data } = await fetchJson(`${BASE}${loginPath(acc.role)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: acc.email, password: acc.password }),
  });

  if (status !== 200) {
    throw new Error(`${acc.label} login ${status}: ${JSON.stringify(data)}`);
  }

  const token = (data as { accessToken?: string; token?: string }).accessToken
    ?? (data as { token?: string }).token;

  if (!token) {
    throw new Error(`${acc.label} login: no token in response`);
  }

  return token;
}

async function get(path: string, token: string) {
  return fetchJson(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function test(id: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ id, name, status: "PASS" });
    console.log(`✅ ${id} — ${name}`);
  } catch (e) {
    const note = e instanceof Error ? e.message : String(e);
    results.push({ id, name, status: "FAIL", note });
    console.log(`❌ ${id} — ${name}: ${note}`);
  }
  await wait(300);
}

function enrollmentCount(transcript: { semesters?: Array<{ courses?: unknown[] }> }) {
  return (transcript.semesters ?? []).reduce(
    (sum, semester) => sum + (semester.courses?.length ?? 0),
    0
  );
}

function categoryFor(id: string) {
  if (id.startsWith("TC-AUTH")) return "المصادقة";
  if (id.startsWith("TC-STU")) return "الطالب";
  if (id.startsWith("TC-ADV")) return "المرشد";
  if (id.startsWith("TC-ADM")) return "الأدمن";
  return "عام";
}

function writeHtmlReport(passed: number, failed: number) {
  const total = results.length;
  const pct = total ? Math.round((passed / total) * 100) : 0;
  const runAt = new Date().toLocaleString("ar-EG", { dateStyle: "full", timeStyle: "medium" });
  const statusColor = failed === 0 ? "#16a34a" : "#dc2626";
  const statusLabel = failed === 0 ? "كل الاختبارات ناجحة" : `${failed} اختبار فاشل`;

  const rows = results
    .map(
      (r) => `
    <tr>
      <td dir="ltr"><code>${r.id}</code></td>
      <td>${categoryFor(r.id)}</td>
      <td>${r.name}</td>
      <td class="${r.status === "PASS" ? "pass" : "fail"}">${r.status === "PASS" ? "✅ ناجح" : "❌ فاشل"}</td>
      <td>${r.note ? `<span class="note">${r.note}</span>` : "—"}</td>
    </tr>`
    )
    .join("");

  const accountRows = accounts
    .map(
      (a) => `
    <tr>
      <td>${a.role === "STUDENT" ? "طالب" : a.role === "ADVISOR" ? "مرشد" : "أدمن"}</td>
      <td>${a.label}</td>
      <td dir="ltr">${a.email}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cogni-Advisor — تقرير اختبار الواجهة</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      margin: 0; padding: 24px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0; min-height: 100vh;
    }
    .wrap { max-width: 1100px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 1.75rem; }
    .sub { color: #94a3b8; margin-bottom: 24px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px; padding: 20px; text-align: center;
    }
    .card .num { font-size: 2rem; font-weight: 700; }
    .card .lbl { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
    .banner {
      background: ${statusColor}22; border: 1px solid ${statusColor};
      color: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;
      font-size: 1.1rem; font-weight: 600;
    }
    h2 { font-size: 1.15rem; margin: 28px 0 12px; color: #93c5fd; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.04); border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 14px; text-align: right; border-bottom: 1px solid #334155; }
    th { background: rgba(0,0,0,0.25); color: #cbd5e1; font-size: 0.85rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.03); }
    .pass { color: #4ade80; font-weight: 600; }
    .fail { color: #f87171; font-weight: 600; }
    .note { color: #fca5a5; font-size: 0.85rem; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
    .meta { margin-top: 32px; font-size: 0.8rem; color: #64748b; text-align: center; }
    @media print { body { background: #fff; color: #111; } .card, table { border: 1px solid #ccc; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>🎓 Cogni-Advisor — تقرير اختبار الواجهة</h1>
    <p class="sub">Frontend Smoke Tests · مشروع التخرج · EELU</p>

    <div class="banner">${statusLabel} — ${pct}% نجاح</div>

    <div class="cards">
      <div class="card"><div class="num">${total}</div><div class="lbl">إجمالي الحالات</div></div>
      <div class="card"><div class="num" style="color:#4ade80">${passed}</div><div class="lbl">ناجح</div></div>
      <div class="card"><div class="num" style="color:#f87171">${failed}</div><div class="lbl">فاشل</div></div>
      <div class="card"><div class="num" style="color:#60a5fa">${pct}%</div><div class="lbl">نسبة النجاح</div></div>
    </div>

    <h2>نتائج الاختبارات</h2>
    <table>
      <thead>
        <tr><th>المعرّف</th><th>الفئة</th><th>الوصف</th><th>النتيجة</th><th>ملاحظة</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <h2>حسابات الاختبار</h2>
    <table>
      <thead><tr><th>الدور</th><th>الاسم</th><th>University Email</th></tr></thead>
      <tbody>${accountRows}</tbody>
    </table>

    <p class="meta">
      API: <code dir="ltr">${BASE}</code> ·
      التشغيل: <code dir="ltr">npm run test:frontend-smoke</code> ·
      ${runAt}
    </p>
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(REPORT_HTML), { recursive: true });
  fs.writeFileSync(REPORT_HTML, html, "utf8");
  return REPORT_HTML;
}

async function openInBrowser(filePath: string) {
  const url = `file:///${filePath.replace(/\\/g, "/")}`;
  const { exec } = await import("child_process");
  const cmd =
    process.platform === "win32"
      ? `start "" "${filePath}"`
      : process.platform === "darwin"
        ? `open "${filePath}"`
        : `xdg-open "${filePath}"`;
  exec(cmd);
  console.log(`\n📄 Report: ${filePath}`);
  console.log(`🌐 URL: ${url}\n`);
}

async function main() {
  console.log(`\nFrontend smoke tests — ${BASE}\n`);

  const tokens: Record<string, string> = {};
  for (const acc of accounts) {
    try {
      tokens[acc.label] = await login(acc);
      console.log(`🔑 Logged in: ${acc.label}`);
      await wait(500);
    } catch (e) {
      console.error(`Login failed for ${acc.label}:`, e);
      console.error(
        "\nTip: wait ~1 minute or restart the backend (npm run dev) if rate-limited.\n"
      );
      process.exitCode = 1;
      return;
    }
  }

  const student = tokens["Eyad Y3"]!;
  const nourhan = tokens["Nourhan Y1"]!;
  const advisor = tokens["Sara"]!;
  const admin = tokens["Admin"]!;

  await test("TC-AUTH-01", "Student login (university email)", async () => {
    if (!student) throw new Error("missing token");
  });
  await test("TC-AUTH-02", "Advisor login", async () => {
    if (!advisor) throw new Error("missing token");
  });
  await test("TC-AUTH-03", "Admin login", async () => {
    if (!admin) throw new Error("missing token");
  });

  await test("TC-STU-01", "Dashboard summary API", async () => {
    const r = await get("/api/students/me/summary", student);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-STU-02", "Transcript API", async () => {
    const r = await get("/api/students/me/transcript", student);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-STU-03", "Current study plan API", async () => {
    const r = await get("/api/study-plan/me/current", student);
    if (![200, 404].includes(r.status)) throw new Error(`status ${r.status}`);
  });
  await test("TC-STU-04", "Notifications API", async () => {
    const r = await get("/api/notifications", student);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-STU-05", "Student with enrollments (Nourhan)", async () => {
    const r = await get("/api/students/me/transcript", nourhan);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const count = enrollmentCount(r.data as { semesters?: Array<{ courses?: unknown[] }> });
    if (count < 5) throw new Error(`expected enrollments, got ${count}`);
  });

  await test("TC-ADV-01", "Advisor dashboard API", async () => {
    const r = await get("/api/advisor/dashboard", advisor);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-ADV-02", "Advisor students list API", async () => {
    const r = await get("/api/advisor/students", advisor);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-ADV-03", "Advisor pending study plans API", async () => {
    const r = await get("/api/study-plan/advisor/pending", advisor);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });

  await test("TC-ADM-01", "Admin overview API", async () => {
    const r = await get("/api/admin/overview", admin);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-ADM-02", "Admin users API", async () => {
    const r = await get("/api/users", admin);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-ADM-03", "Admin courses API", async () => {
    const r = await get("/api/courses", admin);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });
  await test("TC-ADM-04", "Admin semesters API", async () => {
    const r = await get("/api/semesters", admin);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---\n`);
  console.log(JSON.stringify({ baseUrl: BASE, passed, failed, results }, null, 2));

  const reportPath = writeHtmlReport(passed, failed);
  console.log(`\n📄 HTML report saved: ${reportPath}`);

  if (OPEN_BROWSER || failed === 0) {
    await openInBrowser(reportPath);
  }

  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
