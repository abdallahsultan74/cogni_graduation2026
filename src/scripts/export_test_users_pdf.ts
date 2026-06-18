/**
 * يصدّر كل المستخدمين إلى PDF + HTML + CSV (عربي واضح)
 * Usage: npx tsx src/scripts/export_test_users_pdf.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import prisma from "../config/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../docs");
const OUT_PDF = path.join(OUT_DIR, "cogni-advisor-test-users.pdf");
const OUT_HTML = path.join(OUT_DIR, "cogni-advisor-test-users.html");
const OUT_CSV = path.join(OUT_DIR, "cogni-advisor-test-users.csv");

const TAHOMA = "C:\\Windows\\Fonts\\tahoma.ttf";
const TAHOMA_BOLD = "C:\\Windows\\Fonts\\tahomabd.ttf";

const KNOWN_PASSWORDS: Record<string, string> = {
  "admin@admin.eelu.edu.eg": "Admin@12345",
  "admin@cogniadvisor.com": "Admin@12345",
  "sara.20@advisor.eelu.edu.eg": "Aa123456#",
};

const DEFAULT_STUDENT_PASSWORD = "Password123";

function guessPassword(email: string, role: string): string {
  const key = email.toLowerCase();
  if (KNOWN_PASSWORDS[key]) return KNOWN_PASSWORDS[key];
  if (role === "ADMIN") return "Admin@12345";
  if (role === "STUDENT") return DEFAULT_STUDENT_PASSWORD;
  if (role === "ADVISOR") return "— (كلمة سر وقت الإنشاء من الأدمن)";
  return "—";
}

function roleLabel(role: string): string {
  if (role === "ADMIN") return "ادمن";
  if (role === "ADVISOR") return "مرشد";
  if (role === "STUDENT") return "طالب";
  return role;
}

function roleLabelEn(role: string): string {
  if (role === "ADMIN") return "ADMIN";
  if (role === "ADVISOR") return "ADVISOR";
  if (role === "STUDENT") return "STUDENT";
  return role;
}

type Row = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleAr: string;
  password: string;
  note: string;
};

function studentNote(level: number, major: string | null, gpa: number): string {
  return `مستوى ${level} | تخصص ${major ?? "-"} | معدل ${gpa.toFixed(2)}`;
}

async function loadRows(): Promise<Row[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { personal_email: "asc" }],
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      personal_email: true,
      role: true,
      student: { select: { level: true, major_type: true, cumulative_gpa: true } },
      advisor: { select: { advisor_id: true } },
      admin: { select: { admin_id: true } },
    },
  });

  return users.map((u) => {
    const role = String(u.role);
    let note = "";
    if (u.student) {
      note = studentNote(
        u.student.level,
        u.student.major_type,
        Number(u.student.cumulative_gpa)
      );
    } else if (u.advisor) note = `رقم المرشد: ${u.advisor.advisor_id}`;
    else if (u.admin) note = `رقم الادمن: ${u.admin.admin_id}`;

    return {
      id: u.user_id,
      name: `${u.first_name} ${u.last_name}`.trim(),
      email: u.personal_email,
      role,
      roleAr: roleLabel(role),
      password: guessPassword(u.personal_email, role),
      note,
    };
  });
}

function writeHtml(rows: Row[]) {
  const date = new Date().toLocaleString("ar-EG");
  const sections = (["ADMIN", "ADVISOR", "STUDENT"] as const)
    .map((role) => {
      const group = rows.filter((r) => r.role === role);
      if (!group.length) return "";
      const title =
        role === "ADMIN" ? "الادمن" : role === "ADVISOR" ? "المرشدين" : "الطلاب";
      const rowsHtml = group
        .map(
          (r) => `
        <tr>
          <td>${r.name}</td>
          <td dir="ltr">${r.email}</td>
          <td>${r.roleAr}</td>
          <td dir="ltr"><strong>${r.password}</strong></td>
          <td>${r.note}</td>
        </tr>`
        )
        .join("");
      return `
      <h2>${title} (${group.length})</h2>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>البريد</th>
            <th>الدور</th>
            <th>كلمة المرور</th>
            <th>ملاحظة</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>حسابات Cogni-Advisor للاختبار</title>
  <style>
    body { font-family: Tahoma, "Segoe UI", Arial, sans-serif; margin: 24px; color: #111; }
    h1 { text-align: center; color: #1e3a5f; }
    .info { background: #f0f4ff; border: 1px solid #c7d2fe; padding: 12px 16px; border-radius: 8px; margin: 16px 0; line-height: 1.7; }
    h2 { color: #1e3a5f; margin-top: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: right; }
    th { background: #f8fafc; }
    tr:nth-child(even) { background: #fafafa; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>حسابات Cogni-Advisor للاختبار</h1>
  <p style="text-align:center;color:#64748b;">تاريخ التصدير: ${date} — العدد: ${rows.length}</p>
  <div class="info">
    <strong>كلمات المرور الافتراضية:</strong><br>
    ادمن = <code dir="ltr">Admin@12345</code><br>
    طالب = <code dir="ltr">Password123</code><br>
    مرشدة سارة = <code dir="ltr">Aa123456#</code><br>
    باقي المرشدين = كلمة السر اللي اتكتبت وقت ما الأدمن أنشأهم
  </div>
  ${sections}
  <p style="color:#94a3b8;font-size:12px;margin-top:32px;">
    للحفظ كـ PDF: من المتصفح اضغط Ctrl+P ثم «حفظ كـ PDF»
  </p>
</body>
</html>`;

  fs.writeFileSync(OUT_HTML, html, "utf-8");
}

function writeCsv(rows: Row[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["الاسم", "البريد", "الدور", "كلمة المرور", "ملاحظة", "User ID"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.name, r.email, r.roleAr, r.password, r.note, String(r.id)]
        .map(esc)
        .join(",")
    ),
  ];
  fs.writeFileSync(OUT_CSV, "\uFEFF" + lines.join("\n"), "utf-8");
}

async function writePdf(rows: Row[]) {
  const hasFont = fs.existsSync(TAHOMA);
  const doc = new PDFDocument({ margin: 36, size: "A4", autoFirstPage: true });
  const stream = fs.createWriteStream(OUT_PDF);
  doc.pipe(stream);

  if (hasFont) {
    doc.registerFont("Ar", TAHOMA);
    doc.registerFont("ArBold", TAHOMA_BOLD);
  }

  const setFont = (bold = false) => {
    if (hasFont) doc.font(bold ? "ArBold" : "Ar");
    else doc.font(bold ? "Helvetica-Bold" : "Helvetica");
  };

  setFont(true);
  doc.fontSize(16).text("Cogni-Advisor Test Accounts", { align: "center" });
  doc.moveDown(0.3);
  setFont(false);
  doc.fontSize(9).fillColor("#444");
  doc.text(`Exported: ${new Date().toISOString().slice(0, 16)} | Total: ${rows.length}`, {
    align: "center",
  });
  doc.moveDown(0.8);
  doc.fillColor("#000").fontSize(9);
  doc.text("Default passwords:", { underline: true });
  doc.text("ADMIN  = Admin@12345");
  doc.text("STUDENT = Password123");
  doc.text("Advisor Sara (sara.20@...) = Aa123456#");
  doc.text("Other advisors = password set when admin created them");
  doc.moveDown(1);

  for (const role of ["ADMIN", "ADVISOR", "STUDENT"] as const) {
    const group = rows.filter((r) => r.role === role);
    if (!group.length) continue;

    setFont(true);
    doc.fontSize(12).fillColor("#1e3a5f").text(`${roleLabelEn(role)} (${group.length})`);
    doc.moveDown(0.3);
    setFont(false);
    doc.fillColor("#000").fontSize(8);

    for (const r of group) {
      if (doc.y > 720) doc.addPage();
      doc.text(`${r.name}  [${r.roleAr}]`);
      doc.text(`Email:    ${r.email}`);
      doc.text(`Password: ${r.password}`);
      if (r.note) doc.text(`Note:     ${r.note}`);
      doc.moveDown(0.45);
    }
    doc.moveDown(0.4);
  }

  doc.addPage();
  setFont(true);
  doc.fontSize(11).text("Quick table (all users)");
  doc.moveDown(0.4);
  setFont(false);
  doc.fontSize(7);

  for (const r of rows) {
    if (doc.y > 760) doc.addPage();
    doc.text(
      `${r.roleAr.padEnd(6)} | ${r.email.padEnd(42)} | ${r.password.slice(0, 20)}`
    );
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = await loadRows();

  writeHtml(rows);
  writeCsv(rows);
  await writePdf(rows);

  const jsonPath = path.join(OUT_DIR, "cogni-advisor-test-users.json");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        total: rows.length,
        passwords: {
          admin: "Admin@12345",
          student: DEFAULT_STUDENT_PASSWORD,
          advisor_sara: "Aa123456#",
        },
        users: rows,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log("تم التصدير:");
  console.log(`  HTML (افتحه — عربي واضح): ${OUT_HTML}`);
  console.log(`  PDF:  ${OUT_PDF}`);
  console.log(`  CSV:  ${OUT_CSV}`);
  console.log(`  JSON: ${jsonPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
