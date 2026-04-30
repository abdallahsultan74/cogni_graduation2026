# Cogni-Advisor Role Matrix

Role-based access is enforced by `authorize(...)` middleware in route files under `src/routes/`.

## ADMIN

- Full user management: `POST/GET /api/users`, `GET/PATCH/DELETE /api/users/:id`
- Role-specific creation shortcuts: `POST /api/users/students`, `POST /api/users/advisors`, `POST /api/users/admins`
- Admin dashboard/settings: `GET /api/admin/overview`, `GET/PATCH /api/admin/system-settings`
- Student admin actions: `GET/PUT /api/students/:id`, `PATCH /api/students/:id/activate`, `PATCH /api/students/:id/deactivate`
- Course management: `POST /api/courses`, `PUT/DELETE /api/courses/:id`, `PATCH /api/courses/:id/toggle`, prerequisite endpoints
- Semester management: `POST /api/semesters`, `PUT/DELETE /api/semesters/:id`
- Semester records management: `POST /api/semester-records`, `PATCH /api/semester-records/:id`
- Notification broadcast: `POST /api/notifications`
- Shared with advisor: `PATCH /api/enrollments/mark-passed`, `GET /api/ai/risk-analysis/:studentId`

## ADVISOR

- Advisor self/profile routes: `GET/PATCH /api/advisor/me`, `GET /api/advisor/dashboard`
- Advisor students: `GET /api/advisor/students`, `GET /api/advisor/students/:studentId`
- Advisor messaging: `/api/advisor/messages/conversations*`
- Study plan reviewing: `GET /api/study-plan/advisor/pending`, `PATCH /api/study-plan/:id/review`
- Feedback routes: `POST /api/feedback`, `GET /api/feedback/my`, `GET /api/feedback/student/:studentId` (with owner check middleware)
- Shared with admin: `PATCH /api/enrollments/mark-passed`, `GET /api/ai/risk-analysis/:studentId`

## STUDENT

- Student self/profile routes: `GET/PATCH /api/students/me`, `GET /api/students/me/summary`
- Student messaging: `GET/POST /api/students/me/messages`
- Enrollment: `POST /api/enrollments`
- Study plan flow: create/current/generate/add-course/submit endpoints under `/api/study-plan`
- Recommendations + AI student actions: `GET /api/recommendations`, `POST /api/ai/chat`, `POST /api/ai/suggest-plan`, `POST /api/ai/predict-gpa`, `GET /api/ai/history`

## Auth Notes

- Public registration endpoint (`POST /api/auth/register`) is intentionally disabled and returns `403`.
- Accounts are created by ADMIN only through:
  - `POST /api/users` with explicit `role`, or
  - role-specific endpoints above.
- Student password reset is available through `POST /api/auth/forgot-password`.
- OTP password reset is also available through:
  - `POST /api/auth/forgot-password/otp/request`
  - `POST /api/auth/forgot-password/otp/verify`
- Created users receive auto-generated emails in format: `firstName.userId@role.eelu.edu.eg`.
