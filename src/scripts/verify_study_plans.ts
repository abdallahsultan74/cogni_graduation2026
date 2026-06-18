/**
 * Verify study plan generation for all 16 seeded students.
 * Usage: npx tsx src/scripts/verify_study_plans.ts
 */
const API = "http://localhost:5000";
const PASSWORD = "Password123";

const students = [
  "youssef.ibrahim.y1@student.eelu.edu.eg",
  "nourhan.mahmoud.y1@student.eelu.edu.eg",
  "karim.adel.y1@student.eelu.edu.eg",
  "salma.hussein.y1@student.eelu.edu.eg",
  "omar.tarek.y2@student.eelu.edu.eg",
  "mariam.sami.y2@student.eelu.edu.eg",
  "hossam.ramy.y2@student.eelu.edu.eg",
  "dina.kamal.y2@student.eelu.edu.eg",
  "eyad.fathy.y3@student.eelu.edu.eg",
  "rana.shawky.y3@student.eelu.edu.eg",
  "tarek.nabil.y3@student.eelu.edu.eg",
  "hoda.amr.y3@student.eelu.edu.eg",
  "bassem.waleed.y4@student.eelu.edu.eg",
  "yasmin.hesham.y4@student.eelu.edu.eg",
  "mostafa.gamal.y4@student.eelu.edu.eg",
  "layla.ashraf.y4@student.eelu.edu.eg",
];

type LoginResponse = { token: string };
type GenerateResponse = {
  success?: boolean;
  data?: {
    totalCredits: number;
    courses: Array<{ course_code: string; credits: number }>;
  };
  message?: string;
};

async function login(email: string): Promise<string> {
  const res = await fetch(`${API}/api/auth/login/student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const body = (await res.json()) as LoginResponse;
  return body.token;
}

async function generate(token: string): Promise<GenerateResponse> {
  const res = await fetch(`${API}/api/study-plan/generate`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as GenerateResponse;
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
  return body;
}

async function main() {
  let ok = 0;
  let fail = 0;

  for (const email of students) {
    try {
      const token = await login(email);
      const result = await generate(token);
      const courses = result.data?.courses ?? [];
      const credits = result.data?.totalCredits ?? 0;
      const codes = courses.map((c) => c.course_code).join(", ");
      console.log(`OK  ${email} — ${courses.length} courses, ${credits}h [${codes}]`);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL ${email} — ${msg}`);
      fail++;
    }
  }

  console.log(`\nSummary: ${ok} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
