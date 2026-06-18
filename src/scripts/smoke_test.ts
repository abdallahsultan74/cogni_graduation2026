/**
 * Smoke test — run with backend at COGNI_API_BASE_URL (default localhost:5000)
 * Usage: npx tsx src/scripts/smoke_test.ts
 */
const BASE = process.env.COGNI_API_BASE_URL || "http://localhost:5000";

const accounts = [
  { email: "admin@admin.eelu.edu.eg", password: "Admin@12345", role: "ADMIN" },
  { email: "sara.20@advisor.eelu.edu.eg", password: "Aa123456#", role: "ADVISOR" },
  { email: "user.2200031@student.eelu.edu.eg", password: "Password123", role: "STUDENT" },
  { email: "user.2200047@student.eelu.edu.eg", password: "Password123", role: "STUDENT" },
  { email: "user.2200037@student.eelu.edu.eg", password: "Password123", role: "STUDENT" },
];

async function login(email: string, password: string, role?: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      role,
    }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const data = await res.json();
  return (data.accessToken ?? data.token) as string;
}

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}:`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`Smoke test against ${BASE}\n`);

  for (const acc of accounts) {
    const token = await login(acc.email, acc.password, acc.role);
    await check(`${acc.role} login`, async () => {
      if (!token) throw new Error("no token");
    });

    if (acc.role === "STUDENT") {
      await check("GET /students/me/summary", async () => {
        const r = await fetch(`${BASE}/api/students/me/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
      await check("GET /students/me/transcript (semesters)", async () => {
        const r = await fetch(`${BASE}/api/students/me/transcript`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (!r.ok) throw new Error(String(r.status));
        if (!Array.isArray(d.semesters)) throw new Error("missing semesters[]");
      });
      await check("POST /ai/chat", async () => {
        const r = await fetch(`${BASE}/api/ai/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: "أريد خطة دراسية" }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(String(r.status));
        if (!d.answer) throw new Error("missing answer");
      });
      await check("GET /study-plan/generate", async () => {
        const r = await fetch(`${BASE}/api/study-plan/generate`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
      await check("POST /students/me/messages", async () => {
        const r = await fetch(`${BASE}/api/students/me/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: "رسالة اختبار smoke test" }),
        });
        if (!r.ok && r.status !== 201) throw new Error(String(r.status));
      });
    }

    if (acc.role === "ADVISOR") {
      await check("GET /advisor/dashboard", async () => {
        const r = await fetch(`${BASE}/api/advisor/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
      await check("GET /advisor/students", async () => {
        const r = await fetch(`${BASE}/api/advisor/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
      await check("GET /study-plan/advisor/pending", async () => {
        const r = await fetch(`${BASE}/api/study-plan/advisor/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
      await check("GET /advisor/messages/conversations", async () => {
        const r = await fetch(`${BASE}/api/advisor/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
    }

    if (acc.role === "ADMIN") {
      await check("GET /admin/overview", async () => {
        const r = await fetch(`${BASE}/api/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
      await check("GET /users", async () => {
        const r = await fetch(`${BASE}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(String(r.status));
      });
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
