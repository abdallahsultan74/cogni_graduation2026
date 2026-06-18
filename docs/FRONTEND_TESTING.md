# دليل اختبار واجهة Cogni-Advisor (Frontend Testing)

> **مشروع التخرج** — Egyptian E-Learning University (EELU)  
> **النظام:** Cogni-Advisor — منصة إرشاد أكاديمي ذكية  
> **الإصدار:** يونيو 2026  
> **التقنيات:** Next.js 14 · NextAuth · Tailwind CSS · React Query

---

## 1. الهدف من الاختبار

التحقق من أن واجهة المستخدم (Frontend) تعمل بشكل صحيح مع الـ Backend وخدمة الذكاء الاصطناعي، وتغطي:

- المصادقة وتفويض الأدوار (طالب / مرشد / أدمن)
- عرض البيانات الأكاديمية
- الخطط الدراسية واقتراحات AI
- الدردشة الأكاديمية (RAG)
- الرسائل والإشعارات
- إدارة النظام (للأدمن)

**نوع الاختبار:** اختبار يدوي (Manual UI Testing) + اختبار دخان آلي للـ API (Smoke Tests) الذي تستهلكه الواجهة.

---

## 2. بيئة الاختبار

| المكوّن | العنوان | ملاحظة |
|---------|---------|--------|
| Frontend | `http://localhost:3002` | `npm run dev` من مجلد `cogni-advisor-frontend` |
| Backend API | `http://localhost:5000` | `npm run dev` من جذر المشروع |
| خدمة AI | `http://localhost:7860` | `python run_app.py` من `cogni-advisor-ai/GP` |
| المتصفح المُوصى به | Chrome / Edge (أحدث إصدار) | دقة الشاشة: 1920×1080 |

### متغيرات البيئة (Frontend)

```env
COGNI_API_BASE_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=change-me-in-production
```

### تشغيل الاختبار الآلي (Smoke)

```bash
# من جذر المشروع — يتطلب Backend شغّال
npm run test:frontend-smoke
```

---

## 3. حسابات الاختبار

> **مهم:** تسجيل الدخول يتم عبر **University Email** (`university_email`) وليس البريد الشخصي.

### 3.1 الأدمن

| الحقل | القيمة |
|-------|--------|
| الإيميل | `admin@admin.eelu.edu.eg` |
| كلمة المرور | `Admin@12345` |
| الدور في صفحة Login | Admin |

### 3.2 المرشد

| الحقل | القيمة |
|-------|--------|
| الإيميل | `sara.20@advisor.eelu.edu.eg` |
| كلمة المرور | `Aa123456#` |
| الدور في صفحة Login | Advisor |

### 3.3 الطلاب (للسيناريوهات المختلفة)

| السيناريو | الإيميل (University) | كلمة المرور | الوصف |
|-----------|----------------------|-------------|--------|
| طالب سنة 3 — سجل أكاديمي كامل | `user.2200039@student.eelu.edu.eg` | `Password123` | إياد فتحي — IT |
| طالب سنة 1 — مواد كثيرة | `user.2200032@student.eelu.edu.eg` | `Password123` | نورهان محمود — 12+ مادة |
| طالب سنة 4 — قريب التخرج | `user.2200045@student.eelu.edu.eg` | `Password123` | مصطفى جمال — IT |
| طالب سنة 2 — معدل ضعيف | `user.2200037@student.eelu.edu.eg` | `Password123` | حسام رامي |
| طالب سنة 2 — مواد راسبة | `user.2200047@student.eelu.edu.eg` | `Password123` | كريم عادل (failed) |
| طالب سنة 1 — بدون مواد | `user.2200031@student.eelu.edu.eg` | `Password123` | يوسف إبراهيم — أول ترم |

---

## 4. ملخص نتائج الاختبار الآلي

**تاريخ التشغيل:** يونيو 2026  
**الأمر:** `npm run test:frontend-smoke`

| رقم الحالة | الوصف | النتيجة |
|------------|-------|---------|
| TC-AUTH-01 | تسجيل دخول طالب (university email) | ✅ ناجح |
| TC-AUTH-02 | تسجيل دخول مرشد | ✅ ناجح |
| TC-AUTH-03 | تسجيل دخول أدمن | ✅ ناجح |
| TC-STU-01 | API ملخص لوحة الطالب | ✅ ناجح |
| TC-STU-02 | API السجل الأكاديمي | ✅ ناجح |
| TC-STU-03 | API الخطة الدراسية الحالية | ✅ ناجح |
| TC-STU-04 | API الإشعارات | ✅ ناجح |
| TC-STU-05 | طالب بمواد مسجّلة (نورهان) | ✅ ناجح |
| TC-ADV-01 | API لوحة المرشد | يُختبر يدوياً |
| TC-ADV-02 | API قائمة طلاب المرشد | يُختبر يدوياً |
| TC-ADM-01 | API نظرة الأدمن | يُختبر يدوياً |

> ملاحظة: عند تشغيل عدة طلبات متتالية بسرعة، قد يُرجع الـ Backend رمز `429 Too Many Requests` بسبب Rate Limiting على مسارات المصادقة.

---

## 5. مصفوفة حالات الاختبار اليدوي

### 5.1 المصادقة والتفويض

| ID | الحالة | الخطوات | النتيجة المتوقعة |
|----|--------|---------|------------------|
| FE-AUTH-01 | دخول طالب صحيح | افتح `/login` → أدخل إيميل طالب + باسورد + اختر Student → Sign in | توجيه إلى `/student/dashboard` |
| FE-AUTH-02 | دخول مرشد صحيح | نفس الخطوات مع Advisor | توجيه إلى `/advisor/dashboard` |
| FE-AUTH-03 | دخول أدمن صحيح | نفس الخطوات مع Admin | توجيه إلى `/admin/dashboard` |
| FE-AUTH-04 | بيانات خاطئة | إيميل أو باسورد غلط | رسالة خطأ "Unable to sign in" + toast |
| FE-AUTH-05 | دور غلط | إيميل طالب + اختيار Admin | رفض الدخول |
| FE-AUTH-06 | حماية المسارات | افتح `/student/dashboard` بدون تسجيل | إعادة توجيه إلى `/login?callbackUrl=...` |
| FE-AUTH-07 | تسجيل خروج | اضغط Logout من أي لوحة | العودة إلى `/login` |
| FE-AUTH-08 | نسيت كلمة المرور | من `/login` → Forgot password? | فتح صفحة `/forget-password` |

### 5.2 الطالب (Student Portal)

| ID | الصفحة | الخطوات | النتيجة المتوقعة |
|----|--------|---------|------------------|
| FE-STU-01 | Dashboard | سجّل دخول كإياد → Dashboard | عرض GPA، الساعات، المستوى، المرشد، نسبة الإنجاز |
| FE-STU-02 | Transcript | Grades & Transcript | جدول بالفصول والمواد والدرجات |
| FE-STU-03 | Study Plan — توليد | Generate with AI | ظهور خطة بمواد مقترحة + toast نجاح |
| FE-STU-04 | Study Plan — إرسال | Submit for Review | تغيير حالة الخطة إلى Pending |
| FE-STU-05 | Study Plan — سحب | Withdraw Request | إمكانية التعديل مرة أخرى |
| FE-STU-06 | Academic Chat | اسأل: "ما شروط التخرج؟" | رد من المستشار الذكي (يتطلب AI شغّال) |
| FE-STU-07 | Messages | افتح Messages → أرسل رسالة | ظهور الرسالة في المحادثة |
| FE-STU-08 | Notifications | اضغط أيقونة الجرس | قائمة إشعارات (إن وُجدت) |
| FE-STU-09 | Sidebar | تنقّل بين كل الروابط | تمييز الصفحة النشطة + عدم كسر التخطيط |

### 5.3 المرشد (Advisor Portal)

| ID | الصفحة | الخطوات | النتيجة المتوقعة |
|----|--------|---------|------------------|
| FE-ADV-01 | Dashboard | دخول كسارة | إحصائيات: طلاب، طلبات معلّقة، at-risk |
| FE-ADV-02 | Plan Requests | افتح طلب معلّق → Approve | toast نجاح + اختفاء الطلب من القائمة |
| FE-ADV-03 | Plan Requests | Reject مع ملاحظة | رفض الخطة + إشعار للطالب |
| FE-ADV-04 | My Students | عرض قائمة الطلاب | أسماء، GPA، الساعات، الحالة |
| FE-ADV-05 | Messages | رد على رسالة طالب | وصول الرد للطالب |
| FE-ADV-06 | Badge | طالب أرسل خطة | ظهور رقم على Plan Requests في الـ sidebar |

### 5.4 الأدمن (Admin Portal)

| ID | الصفحة | الخطوات | النتيجة المتوقعة |
|----|--------|---------|------------------|
| FE-ADM-01 | Dashboard | دخول كأدمن | إحصائيات المستخدمين والنشاط |
| FE-ADM-02 | Add Student | ملء النموذج + حفظ | إنشاء طالب + إيميل جامعي تلقائي |
| FE-ADM-03 | Add Advisor | ملء النموذج + حفظ | إنشاء مرشد |
| FE-ADM-04 | Users Management | تعيين مرشد لطالب | تحديث advisor_id |
| FE-ADM-05 | Courses | عرض/بحث المقررات | قائمة منهج IT |
| FE-ADM-06 | Semesters | إدارة الفصول | عرض/تعديل الفصول الدراسية |
| FE-ADM-07 | Grades Upload | رفع CSV أو إدخال يدوي | تسجيل درجات للطلاب |
| FE-ADM-08 | Settings | تعديل إعدادات AI | حفظ الإعدادات |
| FE-ADM-09 | Permissions | فتح الصفحة | عرض "Under Construction" (معلّم كقيد معروف) |

---

## 6. سيناريو اختبار شامل (End-to-End)

**الهدف:** إثبات التكامل الكامل بين الطالب والمرشد والذكاء الاصطناعي.

```
الخطوة 1  →  الطالب (إياد) يسجّل الدخول
الخطوة 2  →  يفتح Study Plan ويضغط "Generate with AI"
الخطوة 3  →  يتحقق من المواد المقترحة والساعات
الخطوة 4  →  يضغط "Submit for Review"
الخطوة 5  →  المرشد (سارة) يسجّل الدخول
الخطوة 6  →  Plan Requests → يظهر طلب إياد
الخطوة 7  →  المرشد يوافق (Approve) أو يرفض (Reject)
الخطوة 8  →  الطالب يرى تحديث حالة الخطة + إشعار
الخطوة 9  →  الطالب يسأل في Academic Chat سؤالاً عن اللائحة
الخطوة 10 →  التحقق من ظهور الإجابة
```

**معايير النجاح:** كل خطوة تكتمل بدون أخطاء في الواجهة أو رسائل فشل غير متوقعة.

---

## 7. اختبار التوافق والواجهة (UI/UX)

| ID | الاختبار | النتيجة المتوقعة |
|----|----------|------------------|
| FE-UI-01 | Responsive — شاشة 1366px | Sidebar + المحتوى بدون تداخل |
| FE-UI-02 | Responsive — موبايل 390px | القوائم قابلة للاستخدام |
| FE-UI-03 | حالات التحميل | أزرار تعرض "Signing in..." / "Generating..." |
| FE-UI-04 | Toast notifications | نجاح/فشل العمليات تظهر بوضوح |
| FE-UI-05 | اللغة والاتجاه | واجهة إنجليزية مع دعم أسماء عربية في البيانات |

---

## 8. قائمة لقطات الشاشة (للعرض التقديمي)

يُنصح بإرفاق Screenshots التالية في ملف التخرج أو الـ PowerPoint:

1. صفحة تسجيل الدخول `/login`
2. لوحة تحكم الطالب — Dashboard
3. السجل الأكاديمي — Transcript
4. الخطة الدراسية مع اقتراح AI
5. الدردشة الأكاديمية — سؤال وإجابة
6. لوحة المرشد — Plan Requests
7. موافقة المرشد على خطة
8. لوحة الأدمن — Dashboard
9. إدارة المستخدمين / رفع الدرجات

---

## 9. القيود المعروفة

| # | القيد | التأثير |
|---|-------|---------|
| 1 | صفحة Permissions | غير مكتملة — Under Construction |
| 2 | خدمة AI | الدردشة وGenerate Plan تتطلب Flask على 7860 + `GEMINI_API_KEY` |
| 3 | Rate Limiting | طلبات login متكررة سريعة → 429 |
| 4 | لا توجد اختبارات Playwright/Cypress | الاختبار الحالي يدوي + smoke API |
| 5 | إيميل الدخول | يجب استخدام `university_email` وليس `personal_email` |

---

## 10. خريطة الصفحات (Frontend Routes)

```
/                          → إعادة توجيه حسب الدور
/login                     → تسجيل الدخول
/forget-password           → استعادة كلمة المرور

/student/dashboard         → لوحة الطالب
/student/study-plan        → الخطة الدراسية
/student/transcript        → السجل الأكاديمي
/student/chat              → الدردشة الذكية
/student/messages          → الرسائل

/advisor/dashboard         → لوحة المرشد
/advisor/study-plans       → مراجعة الخطط
/advisor/students          → قائمة الطلاب
/advisor/messages          → الرسائل

/admin/dashboard           → لوحة الأدمن
/admin/add-student         → إضافة طالب
/admin/add-advisor         → إضافة مرشد
/admin/users               → إدارة المستخدمين
/admin/courses             → المقررات
/admin/grades              → رفع الدرجات
/admin/settings            → الإعدادات
```

---

## 11. المراجع

- `docs/cogni-advisor-test-users.csv` — قائمة المستخدمين (البريد الشخصي للمرجع فقط)
- `docs/FRONTEND_API.md` — عقد الـ API للفرونت
- `src/scripts/frontend_smoke_test.ts` — سكربت الاختبار الآلي
- `postman/collection.json` — مجموعة Postman للـ API

---

**إعداد:** فريق Cogni-Advisor — مشروع التخرج 2026
