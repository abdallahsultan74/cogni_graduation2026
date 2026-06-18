# Playwright E2E — Cogni-Advisor Frontend

اختبار الواجهة الحقيقية في المتصفح (أفضل للبرزنتيشن من smoke API فقط).

## المتطلبات

1. **Backend** شغّال: `npm run dev` (من جذر المشروع) → `http://localhost:5000`
2. **Frontend** — Playwright يشغّله تلقائياً أو يستخدم الموجود على `3001`

## التشغيل

```bash
cd cogni-advisor-frontend
npm run test:e2e          # تشغيل الاختبارات
npm run test:e2e:ui       # واجهة تفاعلية
npm run test:e2e:report   # فتح تقرير HTML في المتصفح
```

لو الفرونت على بورت تاني:

```bash
set PLAYWRIGHT_BASE_URL=http://localhost:3000
npm run test:e2e
```

## التغطية (17 حالة)

| الملف | الحالات |
|-------|---------|
| `e2e/auth.spec.ts` | Login، أدوار، حماية المسارات |
| `e2e/student.spec.ts` | Dashboard، Transcript، Study Plan، Chat، Messages |
| `e2e/advisor-admin.spec.ts` | Advisor + Admin |

## التقرير

بعد التشغيل:

```bash
npm run test:e2e:report
```

يفتح `playwright-report/index.html` — فيه screenshots وفيديوهات للفشل.

## مقارنة مع Smoke API

| | Smoke (`test:frontend-smoke`) | Playwright (`test:e2e`) |
|--|------------------------------|-------------------------|
| السرعة | سريع (~30 ث) | أبطأ (~2–3 دق) |
| يختبر | API فقط | متصفح + UI فعلي |
| للبرزنتيشن | تقرير HTML بسيط | تقرير + فيديو + screenshots |
| يحتاج | Backend | Backend + Frontend |

**التوصية:** استخدم الاتنين — Smoke للـ CI السريع، Playwright للتوثيق والعرض.
