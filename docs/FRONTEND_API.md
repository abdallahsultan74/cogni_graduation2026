# Cogni-Advisor — Frontend API Integration Guide

Handoff document for frontend teams (React, Next.js, Vue, etc.).

---

## 1) Base URL

| Environment | URL |
|-------------|-----|
| **Production (Supabase API Gateway)** | `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1` |
| Fallback (Upstream Vercel) | `https://cogni-advisor-backend.vercel.app` |
| Local | `http://localhost:5000` |

Use an environment variable in the frontend, for example:

```env
NEXT_PUBLIC_API_URL=https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1
```

---

## 2) Gateway notes

- Requests now pass through Supabase Edge Function `api`.
- Keep `Authorization: Bearer <token>` header unchanged.
- Upstream Vercel remains configured as fallback backend while migration completes.

---

## 3) Authentication (JWT)

- **Login** response includes a **`token`** field in the JSON body.
- Send it on every protected request:

```http
Authorization: Bearer <token>
```

- Token lifetime: **1 day** (backend configuration).

### Fixed bootstrap admin (first login)

- `email`: `admin@admin.eelu.edu.eg`
- `password`: `Admin@12345`

Use this admin only for first access, then change the password immediately.

---

## 4) Student Section

### Health check (includes DB connectivity)

```http
GET /api/health
```

**Success (200):**

```json
{ "status": "OK", "database": "connected" }
```

### Public registration

```http
POST /api/auth/register
Content-Type: application/json
```

Public signup is disabled. This endpoint returns `403` and users must be created by an **ADMIN** via:

```http
POST /api/users
Authorization: Bearer <admin-token>
```

### Student forgot password

```http
POST /api/auth/forgot-password
Content-Type: application/json
```

**Body (example):**

```json
{
  "national_id": "29901011234567",
  "personal_email": "user@example.com",
  "newPassword": "NewSecurePass123"
}
```

- `national_id`: **at least 14 characters**.
- `newPassword`: **at least 6 characters**.

**Success (200):** Password reset confirmation.
**Common errors:** `400` email and national ID mismatch, `404` student not found.

### Forgot password via OTP (Supabase Auth)

```http
POST /api/auth/forgot-password/otp/request
Content-Type: application/json
```

```json
{
  "email": "ali.123@student.eelu.edu.eg"
}
```

Then verify OTP:

```http
POST /api/auth/forgot-password/otp/verify
Content-Type: application/json
```

```json
{
  "email": "ali.123@student.eelu.edu.eg",
  "otp": "123456",
  "newPassword": "NewSecurePass123"
}
```

### Login (Student)

```http
POST /api/auth/login/student
Content-Type: application/json
```

```json
{
  "email": "ali.123@student.eelu.edu.eg",
  "password": "SecurePass123"
}
```

- `email`: must be the generated/registered account email.

**Success (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "first_name": "...",
    "last_name": "...",
    "role": "STUDENT"
  }
}
```

---

## 5) Advisor Section

### Login (Advisor)

```http
POST /api/auth/login/advisor
Content-Type: application/json
```

```json
{
  "email": "sara.77@advisor.eelu.edu.eg",
  "password": "SecurePass123"
}
```

---

## 6) Admin Section

### Static bootstrap admin

- `email`: `admin@admin.eelu.edu.eg`
- `password`: `Admin@12345`

### Login (Admin)

```http
POST /api/auth/login/admin
Content-Type: application/json
```

```json
{
  "email": "admin@admin.eelu.edu.eg",
  "password": "Admin@12345"
}
```

### Admin creates users

- `POST /api/users/students`
- `POST /api/users/advisors`
- `POST /api/users/admins`
- `POST /api/users` (generic with role)

### Create student body (Admin)

```http
POST /api/users/students
Authorization: Bearer <admin-token>
Content-Type: application/json
```

```json
{
  "first_name": "Ali",
  "middle_name": "M",
  "last_name": "Hassan",
  "national_id": "29901011234568",
  "password": "Pass@1234",
  "gender": "male",
  "street_address": "Cairo"
}
```

> Important: `national_id` must be unique. If duplicated, backend returns `National ID already exists`.

### Create student response (includes personal email)

```json
{
  "user_id": 15,
  "first_name": "Ali",
  "middle_name": "M",
  "last_name": "Hassan",
  "national_id": "29901011234568",
  "personal_email": "ali.15@student.eelu.edu.eg",
  "gender": "male",
  "street_address": "Cairo",
  "role": "STUDENT"
}
```

---

## 7) Example — `fetch` (JavaScript)

```javascript
const API = "https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1";

// Student login
const res = await fetch(`${API}/api/auth/login/student`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "ali.123@student.eelu.edu.eg",
    password: "SecurePass123",
  }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.message || "Login failed");

const token = data.token;

// Protected request
const me = await fetch(`${API}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 8) Additional auth routes (short)

| Route | Description |
|-------|-------------|
| `GET /api/auth/me` | Current user (requires token) |
| `PATCH /api/auth/change-password` | Change password (requires token) |

Other resources (students, courses, enrollments, study plans, notifications, etc.) live under **`/api/...`** and require **`Authorization`** with role-based access (e.g. `ADMIN` for user management).

---

## 9) Email generation policy

When ADMIN creates any account, backend auto-generates email in this format:

```text
firstName.userId@role.eelu.edu.eg
```

Examples:

- `ali.123@student.eelu.edu.eg`
- `sara.77@advisor.eelu.edu.eg`
- `mona.9@admin.eelu.edu.eg`

`personal_email` is auto-generated on create and should not be manually assigned by frontend.

## 9.1) Personal email section

- `personal_email` is the official account email used for:
  - login (`email + password`)
  - forgot-password OTP
- Frontend should read it from create-user response and show it to the user.
- Frontend should NOT send `personal_email` in create user body.
- Format:
  - `firstName.userId@student.eelu.edu.eg`
  - `firstName.userId@advisor.eelu.edu.eg`
  - `firstName.userId@admin.eelu.edu.eg`

---

## 10) Interactive docs (Swagger)

Open in the browser:

```text
https://cogni-advisor-backend.vercel.app/api-docs/
```

You can try requests and copy schemas from there.

---

## 11) Postman

In the repository:

- `postman/collection.json` — full collection.
- `postman/Cogni-Advisor.Production.postman_environment.json` — production env (`BASE_URL` preset).
- `postman/README.md` — import steps.

---

## 12) Frontend checklist

1. Set `API_URL` to the production Base URL above.
2. Add the frontend deployment URL to **`ALLOWED_ORIGINS`** on Vercel (coordinate with backend).
3. Account creation is done by **ADMIN** only (`POST /api/users` with `role`).
4. **Login** is by **`email + password`** only → persist **`token`**.
5. Send **`Authorization: Bearer <token>`** on every protected endpoint.
6. On **401**, clear the token and redirect to the login screen.

---

## 13) Role matrix

Detailed permissions by role are documented in:

- `docs/ROLE_MATRIX.md`

---

**Note:** Align version numbers with the `main` branch in the repository when needed.
