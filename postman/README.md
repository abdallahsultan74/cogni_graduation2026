# توثيق API لـ Postman — Cogni-Advisor

## الملفات

| الملف | الاستخدام |
|--------|------------|
| `collection.json` | المجموعة الكاملة لجميع الـ endpoints |
| `Cogni-Advisor.Production.postman_environment.json` | بيئة إنتاج (Vercel) — `BASE_URL` جاهز |
| `Cogni-Advisor.Local.postman_environment.json` | بيئة محلية — `http://localhost:5000` |

## الاستيراد في Postman

1. **File → Import** (أو زر **Import**).
2. اسحب أو اختر:
   - `postman/collection.json`
   - `postman/Cogni-Advisor.Production.postman_environment.json` (أو Local حسب ما تشغّل).
3. بعد الاستيراد: من القائمة العلوية اختر **البيئة** المناسبة (مثلاً **Cogni-Advisor Production (Vercel)**).

## خطوات سريعة للفريق

1. فعّل البيئة التي تحتوي على `BASE_URL` الصحيح.
2. افتح المجلد **Authentication → Login**.
3. عدّل في الـ Body:
   - `identifier`: الرقم القومي (14 رقم على الأقل حسب الـ API).
   - `password`: كلمة المرور.
   - `role`: اختياري (`ADMIN` | `ADVISOR` | `STUDENT`).
4. أرسل الطلب **Send**. عند النجاح (200)، سكربت الاختبار في الطلب يحفظ التوكن تلقائيًا في:
   - `ADMIN_TOKEN` أو `ADVISOR_TOKEN` أو `STUDENT_TOKEN` حسب دور المستخدم في الرد.
5. باقي الطلبات تستخدم الهيدر `Authorization: Bearer {{...}}` مسبقًا في المجموعة.

## Swagger (بديل Postman للتصفح)

- إنتاج: `https://cogni-advisor-backend.vercel.app/api-docs/`
- الجذر يعيد التوجيه إلى التوثيق: `https://cogni-advisor-backend.vercel.app/`

## ملاحظات

- إذا ظهر **CORS** من الفرونت: تأكد أن رابط الفرونت موجود في `ALLOWED_ORIGINS` على Vercel.
- لتغيير السيرفر يدويًا بدون ملف بيئة: **Collection → Variables → `BASE_URL`**.
