# توثيق مشروع Cogni-Advisor — شرح شامل

ملف واحد يشرح المشروع بالكامل: الأهداف، التقنيات، الهيكل، المصادقة، الـ API حسب الأدوار، قاعدة البيانات، التثبيت والتشغيل.

---

## 1. مقدمة وأهداف المشروع

**Cogni-Advisor** هو نظام إرشاد أكاديمي Backend API مبني على Node.js و Express و TypeScript و PostgreSQL. يهدف إلى دعم الجامعات في إدارة العملية الأكاديمية وربط الطلاب بالمرشدين وتوفير أدوات تخطيط وتوصيات ذكية.

### الأهداف الرئيسية

1. **إدارة الطلاب** — ملفات شخصية، تتبع أكاديمي، GPA، إلغاء/إعادة تفعيل
2. **الإرشاد الأكاديمي** — ربط الطلاب بالمرشدين، مراجعة الخطط الدراسية، التواصل عبر الرسائل والـ Feedback
3. **إدارة المنهج** — كورسات، متطلبات سابقة (prerequisites)، تسجيل، تحديد المواد كمكتملة
4. **خطط دراسية** — إنشاء، تقديم، مراجعة واعتماد خطط من المرشد
5. **الذكاء الاصطناعي** — بنية تحتية جاهزة للربط مع فريق AI (Chat، Suggest Plan، Predict GPA، Risk Analysis)

---

## 2. التقنيات المستخدمة

| المكون | التقنية |
|--------|---------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 5 |
| Language | TypeScript 5.9 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Authentication | JWT (jsonwebtoken) |
| Validation | Zod 4 |
| Testing | Vitest 4 + Supertest |
| Documentation | Swagger/OpenAPI 3.0 |
| Logging | Winston + Morgan |
| Security | Helmet, CORS, Rate Limiting |
| Process Manager | PM2 (cluster mode) |
| Containerization | Docker + Docker Compose |

---

## 3. هيكل المشروع

```
Cogni-Advisor/
├── src/
│   ├── app.ts              # تكوين Express
│   ├── config/             # إعدادات (Prisma, Logger, Swagger)
│   ├── middlewares/        # مصفيات الطلب (Auth, Role, Validate, Error)
│   ├── routes/             # مسجل مركزي للـ routes (registry.ts)
│   ├── modules/            # وحدات الميزات (أسماء المجلدات kebab-case: study-plan، semester-record، إلخ)
│   └── utils/              # أدوات مساعدة (AppError, asyncHandler, gpaCalculator)
├── prisma/
│   ├── schema.prisma       # تعريف قاعدة البيانات
│   └── migrations/         # سجلات التغييرات
├── tests/                  # اختبارات Vitest (unit + integration)
├── postman/
│   └── collection.json    # مجموعة Postman للـ API
├── docs/                   # التوثيق (هذا الملف)
└── ecosystem.config.cjs    # إعدادات PM2 للإنتاج
```

---

## 4. نظرة معمارية

المكوّنات الرئيسية وتدفّق الطلبات بين العملاء، طبقة الـ API، وقاعدة البيانات:

```mermaid
flowchart TB
    subgraph clients [العملاء]
        Admin[Admin]
        Advisor[Advisor]
        Student[Student]
    end
    subgraph api [API Layer]
        Auth[/api/auth]
        Users[/api/users]
        Courses[/api/courses]
        Students[/api/students]
        StudyPlan[/api/study-plan]
        Recommendations[/api/recommendations]
        AdvisorApi[/api/advisor]
        Messages[/api/advisor/messages]
        Notifications[/api/notifications]
        AdminApi[/api/admin]
        AI[/api/ai]
    end
    subgraph db [قاعدة البيانات]
        Prisma[(Prisma + PostgreSQL)]
    end
    Admin --> Users
    Advisor --> StudyPlan
    Advisor --> AdvisorApi
    Advisor --> Messages
    Student --> Auth
    Student --> Students
    Student --> StudyPlan
    Student --> Recommendations
    Student --> AI
    Auth --> Prisma
    Users --> Prisma
    Courses --> Prisma
    Students --> Prisma
    StudyPlan --> Prisma
    Recommendations --> Prisma
    AdvisorApi --> Prisma
    Messages --> Prisma
    Notifications --> Prisma
    AdminApi --> Prisma
    AI --> Prisma
```

---

## 5. الوحدات (Modules)

كل وحدة تحتوي على: `*.routes.ts`، `*.controller.ts`، `*.service.ts`، `*.validation.ts` (Zod).

| الوحدة | المسار | الوصف |
|--------|--------|-------|
| Auth | `/api/auth` | تسجيل الدخول، تغيير كلمة المرور، `/me` |
| Users | `/api/users` | إدارة المستخدمين (Admin) |
| Students | `/api/students` | ملف الطالب، تفعيل/إلغاء تفعيل |
| Courses | `/api/courses` | الكورسات، المتطلبات السابقة |
| Semesters | `/api/semesters` | الفصول الدراسية |
| Enrollments | `/api/enrollments` | التسجيل، mark-passed لتسجيل الدرجة |
| Progress | `/api/progress` | التقدم الأكاديمي و GPA |
| Study Plan | `/api/study-plan` | الخطط الدراسية، التقديم، المراجعة |
| Recommendations | `/api/recommendations` | توصيات المواد |
| Advisor | `/api/advisor` | لوحة المرشد، الطلاب |
| Messages | `/api/advisor/messages` و `/api/students/me/messages` | المحادثات |
| Notifications | `/api/notifications` | الإشعارات |
| Feedback | `/api/feedback` | feedback من المرشد للطالب |
| Semester Records | `/api/semester-records` | سجلات الفصول |
| Admin | `/api/admin` | لوحة التحكم، الإعدادات |
| AI | `/api/ai` | بنية تحتية للذكاء الاصطناعي |

### أمثلة مسارات أساسية

| الوحدة | أمثلة |
|--------|--------|
| Auth | `POST /api/auth/login`، `GET /api/auth/me`، `PATCH /api/auth/change-password` |
| Users | `GET /api/users`، `POST /api/users`، `PATCH /api/users/:id` |
| Students | `GET /api/students/me`، `GET /api/students/me/summary`، `PATCH /api/students/me` |
| Courses | `GET /api/courses`، `POST /api/courses`، `PATCH /api/courses/:id/toggle` |
| Study Plan | `POST /api/study-plan`، `GET /api/study-plan/me/current`، `PATCH /api/study-plan/:id/submit`، `PATCH /api/study-plan/:id/review` |
| Advisor | `GET /api/advisor/me`، `GET /api/advisor/dashboard`، `GET /api/advisor/students` |
| Admin | `GET /api/admin/overview`، `GET /api/admin/system-settings`، `PATCH /api/admin/system-settings` |

---

## 6. المصادقة والـ API

### 6.1 معلومات الاتصال الأساسية

| العنصر | القيمة |
|--------|--------|
| Base URL (Development) | `http://localhost:5000` |
| API Prefix | `/api` |
| Swagger UI | `http://localhost:5000/api-docs` |
| Content-Type | `application/json` |

### 6.2 تسجيل الدخول (Login)

**`POST /api/auth/login`** — لا يتطلب مصادقة.

**Request Body:**

```json
{
  "identifier": "رقم وطني (14 حرف على الأقل)",
  "password": "كلمة المرور (6 أحرف على الأقل)",
  "role": "STUDENT"
}
```

حقل `role` اختياري. إذا أُرسل ولا يطابق دور الحساب، يُرفض الدخول بنفس رسالة الخطأ (للمزيد من الأمان).

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "first_name": "أحمد",
    "last_name": "محمد",
    "role": "STUDENT"
  }
}
```

**الأدوار:** `STUDENT` | `ADVISOR` | `ADMIN`

**Error (401):**

```json
{
  "success": false,
  "message": "بيانات الدخول غير صحيحة أو الحساب غير موجود"
}
```

نفس الرسالة تُرجَع عند: رقم غير صحيح، كلمة مرور خاطئة، أو عند إرسال `role` لا يطابق دور الحساب.

### 6.3 إرفاق Token في الطلبات

كل الـ endpoints (ما عدا Login و Health) تتطلب:

```
Authorization: Bearer <token>
```

### 6.4 فحص الدور الحالي

**`GET /api/auth/me`** — يتطلب مصادقة

**Response (200):**

```json
{
  "id": 1,
  "role": "STUDENT"
}
```

### 6.5 تغيير كلمة المرور

**`PATCH /api/auth/change-password`** — يتطلب مصادقة

**Request Body:**

```json
{
  "currentPassword": "كلمة المرور الحالية",
  "newPassword": "كلمة المرور الجديدة"
}
```

### 6.6 صيغة الردود والأخطاء

- معظم الردود تأتي كـ JSON مباشرة (بدون غلاف `success`).
- أخطاء:

```json
{
  "success": false,
  "message": "وصف الخطأ"
}
```

| HTTP Code | المعنى |
|-----------|--------|
| 400 | Bad Request — خطأ في البيانات المرسلة |
| 401 | Unauthorized — Token غير صالح أو منتهي |
| 403 | Forbidden — لا صلاحية للوصول |
| 404 | Not Found — المورد غير موجود |
| 409 | Conflict — تكرار قيمة (مثل course_code موجود مسبقاً) |
| 429 | Too Many Requests — تجاوز حد الطلبات |
| 500 | Internal Server Error |

### 6.7 CORS

الـ Backend يدعم الطلبات من الأصول في `ALLOWED_ORIGINS` (مثل `http://localhost:3000`، `http://localhost:5173`). تأكد أن منشأ الـ Frontend مضاف في `.env`.

---

## 7. الـ Endpoints حسب الدور

### 7.1 Health (بدون Token)

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/api/health` | فحص صحة النظام وقاعدة البيانات |

**Response (200):** `{ "status": "OK", "database": "connected" }`

### 7.2 مشترك (أي دور)

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/api/notifications` | إشعارات المستخدم |
| PATCH | `/api/notifications/read-all` | تحديد الكل كمقروء |
| PATCH | `/api/notifications/:id/read` | تحديد إشعار واحد كمقروء |

### 7.3 الطالب (STUDENT)

| Method | Path | Request Body | الوصف |
|--------|------|--------------|--------|
| GET | `/api/students/me` | - | الملف الشخصي |
| GET | `/api/students/me/summary` | - | الملخص الأكاديمي مع GPA |
| PATCH | `/api/students/me` | `{ first_name?, last_name?, street_address?, phones? }` | تحديث الملف |
| POST | `/api/enrollments` | `{ course_id }` | التسجيل في مادة |
| GET | `/api/progress/:studentId` | - | التقدم الأكاديمي |
| GET | `/api/recommendations` | Query: `semesterId?` | توصيات المواد |
| POST | `/api/study-plan` | `{ semester_id }` | إنشاء خطة دراسية |
| GET | `/api/study-plan/me/current` | - | الخطة الحالية |
| GET | `/api/study-plan/generate` | - | توليد اقتراحات للخطة |
| POST | `/api/study-plan/:id/add-course` | `{ course_id }` | إضافة مادة للخطة |
| PATCH | `/api/study-plan/:id/submit` | - | تقديم الخطة للمراجعة |
| POST | `/api/ai/chat` | `{ message }` | استفسار للـ AI |
| POST | `/api/ai/suggest-plan` | `{ semester_id, preferences? }` | اقتراح خطة |
| POST | `/api/ai/predict-gpa` | `{ semester_id, planned_courses }` | توقع المعدل |
| GET | `/api/ai/history` | - | سجل تفاعلات الـ AI |
| GET | `/api/students/me/messages` | - | رسائلي مع مرشدي |
| POST | `/api/students/me/messages` | `{ body \| message \| content \| text }` | إرسال رسالة للمرشد |

### 7.4 المرشد (ADVISOR)

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/api/advisor/me` | ملف المرشد |
| PATCH | `/api/advisor/me` | تحديث الملف |
| GET | `/api/advisor/dashboard` | لوحة التحكم |
| GET | `/api/advisor/students` | قائمة الطلاب المرتبطين |
| GET | `/api/advisor/students/:studentId` | تفاصيل طالب |
| GET | `/api/advisor/messages/conversations` | المحادثات |
| GET | `/api/advisor/messages/conversations/:studentId/messages` | رسائل مع طالب |
| POST | `/api/advisor/messages/conversations/:studentId/messages` | إرسال رسالة |
| PATCH | `/api/study-plan/:id/review` | مراجعة الخطة (`status`, `feedback?`) |
| GET | `/api/study-plan/advisor/pending` | الخطط المعلقة |
| POST | `/api/feedback` | إنشاء feedback |
| GET | `/api/feedback/student/:studentId` | feedback طالب |
| GET | `/api/feedback/my` | feedback المرشد الحالي |
| GET | `/api/ai/risk-analysis/:studentId` | تحليل المخاطر |

### 7.5 الأدمن (ADMIN)

| Method | Path | الوصف |
|--------|------|--------|
| GET/POST/PATCH/DELETE | `/api/users`، `/api/users/:id` | إدارة المستخدمين |
| GET/PUT | `/api/students/:id` | تفاصيل وتحديث طالب |
| PATCH | `/api/students/:id/deactivate`، `/api/students/:id/activate` | إلغاء/إعادة تفعيل |
| POST/PUT/DELETE | `/api/courses`، `/api/courses/:id` | إدارة المواد |
| PATCH | `/api/courses/:id/toggle` | تفعيل/إلغاء تفعيل مادة |
| POST/DELETE | `/api/courses/add-prerequisite`، `remove-prerequisite` | متطلبات سابقة |
| POST/PUT/DELETE | `/api/semesters`، `/api/semesters/:id` | إدارة الفصول |
| PATCH | `/api/enrollments/mark-passed` | تسجيل درجة ومكتملة |
| POST/PATCH | `/api/semester-records` | سجلات الفصول |
| POST | `/api/notifications` | إنشاء إشعار |
| GET | `/api/admin/overview` | نظرة عامة على النظام |
| GET/PATCH | `/api/admin/system-settings` | إعدادات النظام |

تحديث الإعدادات: إما `{ general?, aiEngine?, permissions?, security? }` أو `{ key, value }` (key: general, aiEngine, permissions, security).

### 7.6 Endpoints بدون مصادقة

| Method | Path | مصادقة |
|--------|------|--------|
| GET | `/api/health` | لا |
| POST | `/api/auth/login` | لا |
| GET | `/api/courses`، `/api/courses/:id`، `/api/courses/:id/details` | لا |
| GET | `/api/semesters` | لا |

---

## 8. بنية البيانات الشائعة

### إنشاء مستخدم (Admin)

```json
{
  "first_name": "أحمد",
  "middle_name": "محمد",
  "last_name": "علي",
  "national_id": "12345678901234",
  "personal_email": "ahmed@example.com",
  "password": "password123",
  "gender": "M",
  "street_address": "عنوان",
  "role": "STUDENT"
}
```

### إنشاء مادة

```json
{
  "course_code": "CS101",
  "course_name": "مقدمة في البرمجة",
  "credits": 3,
  "required_hours_to_take": null,
  "is_available": true
}
```

استخدم `course_code` و `course_name` — لا يوجد حقل `name` أو `description` في المخطط الأساسي.

### إنشاء فصل

```json
{
  "semester_name": "الفصل الأول 2024/2025",
  "start_date": "2024-09-15",
  "end_date": "2025-01-30"
}
```

التواريخ بصيغة ISO 8601.

### إنشاء إشعار (Admin)

```json
{
  "recipient_id": 5,
  "title": "تنبيه",
  "body": "نص الرسالة"
}
```

- `recipient_id` = `user_id` المستلم. إذا `0` يُرسل للمستخدم الحالي.
- `title` و `body` اختيارية.

### تحديد إشعار كمقروء

**`PATCH /api/notifications/:id/read`** — استخدم `id` أو `notification_id` من نتيجة `GET /api/notifications`.

بنية رد الإشعارات تحتوي على `notification_id`، `id`، `recipient_id`، `title`، `body`، `is_read`، `sent_at`. إذا "الإشعار غير موجود" — المعرف غير صحيح. إذا "هذا الإشعار لا يخص حسابك" — الإشعار لمستخدم آخر.

### أمثلة cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"12345678901234","password":"mypassword"}'

# طلب محمي
curl -X GET http://localhost:5000/api/students/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 9. قاعدة البيانات

النظام يستخدم Prisma فوق PostgreSQL. أهم النماذج:

| النموذج | الوصف |
|--------|--------|
| User | المستخدم (بيانات الدخول، الهوية، الدور) |
| Student | بيانات الطالب الأكاديمية (GPA، الساعات، الحالة، الربط مع User و Advisor) |
| Advisor | المرشد وربطه بالمستخدم والطلاب |
| Admin | مسؤولو النظام |
| Course | المقرر (الكود، الاسم، الساعات، التوفر) |
| Semester | الفصول الدراسية |
| Enrollment | تسجيل الطالب في المقررات (الدرجة، PASSED/FAILED/IN_PROGRESS) |
| StudyPlan | الخطط الدراسية للطالب |
| SystemSetting | إعدادات النظام (فئات: عامة، AI، صلاحيات، أمان) |
| AuditLog | سجل العمليات الحساسة |
| Feedback | ملاحظات المرشد على الطالب/الخطة |
| Notification | الإشعارات |
| SemesterRecord | ملخص أداء الطالب لكل فصل |
| AIInteraction | سجلات تفاعلات الـ AI |

**أوامر:** `npx prisma migrate dev` — تطبيق الـ migrations؛ `npx prisma studio` — واجهة رسومية للبيانات.

---

## 10. التشغيل والتثبيت

```bash
npm install
cp .env.example .env   # تعديل DATABASE_URL و JWT_SECRET و ALLOWED_ORIGINS
npx prisma migrate dev
npx prisma generate
npm run dev            # التطوير على المنفذ 5000
```

**للإنتاج:**

```bash
npm run build
pm2 start ecosystem.config.cjs --env production
```

---

## 11. التوثيق والاختبار

- **Swagger:** `http://localhost:5000/api-docs` — توثيق تفاعلي لجميع المسارات.
- **Postman:** استورد `postman/collection.json`؛ أنشئ Environment بـ `BASE_URL` (مثلاً `http://localhost:5000`) و `ADMIN_TOKEN`، `ADVISOR_TOKEN`، `STUDENT_TOKEN` بعد Login.
- **Health Check:** `GET /api/health` — جاهزية السيرفر وقاعدة البيانات.
- **اختبار الواجهة (Frontend):** [`FRONTEND_TESTING.md`](./FRONTEND_TESTING.md) — دليل اختبار يدوي + smoke tests للعرض التقديمي.
- **ملخص العرض:** [`FRONTEND_TESTING_PRESENTATION.md`](./FRONTEND_TESTING_PRESENTATION.md) — جدول مختصر للـ PowerPoint.

**تشغيل الاختبارات:**

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:frontend-smoke   # اختبار دخان لمسارات الـ API التي يستخدمها الفرونت
```

---

## 12. تدفق العمل النموذجي

1. **Admin** ينشئ المستخدمين والكورسات والفصول ويعيّن مرشدين للطلاب.
2. **Student** يسجّل دخول، ينشئ خطة دراسية، يضيف كورسات، يقدّم الخطة للمراجعة.
3. **Advisor** يراجع الخطط، يوافق أو يرفض، يرسل feedback للطلاب.
4. **Admin** أو **Advisor** يسجّل الدرجات عبر `PATCH /api/enrollments/mark-passed`.
5. **Student** يعرض التقدم والتوصيات عبر `/api/progress` و `/api/recommendations`.

---

## 13. ملاحظات مهمة

1. **Rate Limiting:** الطلبات محدودة (مثلاً 100 طلب/15 دقيقة للـ API و 5 محاولات/15 دقيقة للـ login).
2. **Token Expiry:** الـ Token صالح لمدة 24 ساعة.
3. **Messages:** المرشد تحت `/api/advisor/messages`؛ الطالب تحت `/api/students/me/messages` (يتطلب أن يكون الطالب مُعيَّناً لمرشد).
4. **تحديث إعدادات النظام:** صيغة كاملة `{ general, aiEngine, ... }` أو مختصرة `{ key: "general", value: { ... } }` حيث key أحد: general, aiEngine, permissions, security.
5. **مسارات Courses:** استخدم `course_code` و `course_name` في الجسم — راجع Swagger للتفاصيل الدقيقة.

---

**آخر تحديث:** 2026-03
