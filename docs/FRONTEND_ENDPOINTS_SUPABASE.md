# Frontend Endpoints (Supabase URL)

Base URL: `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1`

> Note: this list is generated from `src/config/swagger.ts`.

| Method | Path | Full URL | Auth | Summary |
|---|---|---|---|---|
| GET | `/api/admin/overview` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/admin/overview` | Yes | Admin system overview |
| GET | `/api/admin/system-settings` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/admin/system-settings` | Yes | Get system settings |
| PATCH | `/api/admin/system-settings` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/admin/system-settings` | Yes | Update system settings |
| GET | `/api/advisor/dashboard` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/dashboard` | Yes | Advisor dashboard |
| GET | `/api/advisor/me` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/me` | Yes | Get advisor profile |
| PATCH | `/api/advisor/me` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/me` | Yes | Update advisor profile |
| GET | `/api/advisor/messages/conversations` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/messages/conversations` | Yes | Get advisor conversations |
| GET | `/api/advisor/messages/conversations/{studentId}/messages` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/messages/conversations/{studentId}/messages` | Yes | Get messages with a student |
| POST | `/api/advisor/messages/conversations/{studentId}/messages` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/messages/conversations/{studentId}/messages` | Yes | Send message to student |
| GET | `/api/advisor/students` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/students` | Yes | Get advisor students |
| GET | `/api/advisor/students/{studentId}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/advisor/students/{studentId}` | Yes | Get advisor student by ID |
| POST | `/api/ai/chat` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/ai/chat` | Yes | AI chat |
| GET | `/api/ai/history` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/ai/history` | Yes | Get AI interaction history |
| POST | `/api/ai/predict-gpa` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/ai/predict-gpa` | Yes | AI predict GPA |
| GET | `/api/ai/risk-analysis/{studentId}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/ai/risk-analysis/{studentId}` | Yes | AI risk analysis |
| POST | `/api/ai/suggest-plan` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/ai/suggest-plan` | Yes | AI suggest study plan |
| PATCH | `/api/auth/change-password` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/forgot-password` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/forgot-password` | No | Forgot password (student only) |
| POST | `/api/auth/forgot-password/otp/request` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/forgot-password/otp/request` | No | Request forgot-password OTP |
| POST | `/api/auth/forgot-password/otp/verify` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/forgot-password/otp/verify` | No | Verify OTP and reset password |
| POST | `/api/auth/login` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/login` | No | Login |
| POST | `/api/auth/login/admin` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/login/admin` | No | Admin login |
| POST | `/api/auth/login/advisor` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/login/advisor` | No | Advisor login |
| POST | `/api/auth/login/student` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/login/student` | No | Student login |
| GET | `/api/auth/me` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/register` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/auth/register` | No | Public registration (disabled) |
| GET | `/api/courses` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses` | Yes | List courses |
| DELETE | `/api/courses/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/{id}` | Yes | Delete course |
| GET | `/api/courses/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/{id}` | Yes | Get course by ID |
| PUT | `/api/courses/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/{id}` | Yes | Update course |
| GET | `/api/courses/{id}/details` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/{id}/details` | Yes | Get course details |
| PATCH | `/api/courses/{id}/toggle` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/{id}/toggle` | Yes | Toggle course availability |
| POST | `/api/courses/add-prerequisite` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/add-prerequisite` | Yes | Add prerequisite |
| DELETE | `/api/courses/remove-prerequisite` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/courses/remove-prerequisite` | Yes | Remove prerequisite |
| GET | `/api/departments` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/departments` | Yes | List departments |
| POST | `/api/enrollments` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/enrollments` | Yes | Enroll in a course |
| PATCH | `/api/enrollments/mark-passed` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/enrollments/mark-passed` | Yes | Mark course as passed |
| POST | `/api/feedback` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/feedback` | Yes | Create feedback |
| GET | `/api/feedback/my` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/feedback/my` | Yes | Get my feedback (ADVISOR) |
| GET | `/api/feedback/student/{studentId}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/feedback/student/{studentId}` | Yes | Get feedback by student |
| GET | `/api/health` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/health` | No | Health check |
| GET | `/api/notifications` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/notifications` | Yes | Get my notifications |
| POST | `/api/notifications` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/notifications` | Yes | Create notification |
| PATCH | `/api/notifications/{id}/read` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/notifications/{id}/read` | Yes | Mark notification as read |
| PATCH | `/api/notifications/read-all` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/notifications/read-all` | Yes | Mark all as read |
| GET | `/api/progress/{studentId}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/progress/{studentId}` | Yes | Get student progress |
| GET | `/api/recommendations` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/recommendations` | Yes | Get student recommendations |
| POST | `/api/semester-records` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semester-records` | Yes | Create semester record |
| PATCH | `/api/semester-records/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semester-records/{id}` | Yes | Update semester record |
| GET | `/api/semester-records/semester/{semesterId}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semester-records/semester/{semesterId}` | Yes | Get semester records by semester |
| GET | `/api/semester-records/student/{studentId}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semester-records/student/{studentId}` | Yes | Get semester records by student |
| GET | `/api/semesters` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semesters` | Yes | List semesters |
| POST | `/api/semesters` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semesters` | Yes | Create semester |
| DELETE | `/api/semesters/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semesters/{id}` | Yes | Delete semester |
| GET | `/api/semesters/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semesters/{id}` | Yes | Get semester by ID |
| PUT | `/api/semesters/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/semesters/{id}` | Yes | Update semester |
| GET | `/api/students/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/{id}` | Yes | Get student by ID |
| PUT | `/api/students/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/{id}` | Yes | Update student |
| PATCH | `/api/students/{id}/activate` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/{id}/activate` | Yes | Activate student |
| PATCH | `/api/students/{id}/deactivate` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/{id}/deactivate` | Yes | Deactivate student |
| GET | `/api/students/me` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/me` | Yes | Get my student profile |
| PATCH | `/api/students/me` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/me` | Yes | Update my student profile |
| GET | `/api/students/me/messages` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/me/messages` | Yes | Get my messages with advisor |
| POST | `/api/students/me/messages` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/me/messages` | Yes | Send message to advisor |
| GET | `/api/students/me/summary` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/students/me/summary` | Yes | Get my academic summary |
| POST | `/api/study-plan` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan` | Yes | Create study plan |
| POST | `/api/study-plan/{id}/add-course` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan/{id}/add-course` | Yes | Add course to plan |
| PATCH | `/api/study-plan/{id}/review` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan/{id}/review` | Yes | Review study plan |
| PATCH | `/api/study-plan/{id}/submit` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan/{id}/submit` | Yes | Submit study plan |
| GET | `/api/study-plan/advisor/pending` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan/advisor/pending` | Yes | Get pending plans for advisor |
| GET | `/api/study-plan/generate` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan/generate` | Yes | Generate recommended study plan |
| GET | `/api/study-plan/me/current` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/study-plan/me/current` | Yes | Get current study plan |
| GET | `/api/users` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users` | Yes | List users |
| POST | `/api/users` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users` | Yes | Create user |
| DELETE | `/api/users/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users/{id}` | Yes | Delete user |
| GET | `/api/users/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users/{id}` | Yes | Get user by ID |
| PATCH | `/api/users/{id}` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users/{id}` | Yes | Update user |
| POST | `/api/users/admins` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users/admins` | Yes | Create admin (ADMIN) |
| POST | `/api/users/advisors` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users/advisors` | Yes | Create advisor (ADMIN) |
| POST | `/api/users/students` | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1/api/users/students` | Yes | Create student (ADMIN) |

