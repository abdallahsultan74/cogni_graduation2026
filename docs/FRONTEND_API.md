# Cogni-Advisor — Frontend API Integration Guide

Handoff document for frontend teams (React, Next.js, Vue, etc.).

---

## 1) Base URL

| Environment | URL |
|-------------|-----|
| **Production (Vercel)** | `https://cogni-advisor-backend.vercel.app` |
| Local | `http://localhost:5000` |

Use an environment variable in the frontend, for example:

```env
NEXT_PUBLIC_API_URL=https://cogni-advisor-backend.vercel.app
```

---

## 2) CORS

The deployed frontend origin must be listed in the backend **Vercel** project settings:

- Variable: **`ALLOWED_ORIGINS`**
- Value: comma-separated origins, for example:

```text
https://your-app.vercel.app,http://localhost:3000,http://localhost:5173
```

Without this, browser requests may fail with a CORS error.

---

## 3) Authentication (JWT)

- **Login** and **Register** responses include a **`token`** field in the JSON body.
- Send it on every protected request:

```http
Authorization: Bearer <token>
```

- Token lifetime: **1 day** (backend configuration).

---

## 4) Public endpoints (no token)

### Health check (includes DB connectivity)

```http
GET /api/health
```

**Success (200):**

```json
{ "status": "OK", "database": "connected" }
```

### Student registration (sign up)

```http
POST /api/auth/register
Content-Type: application/json
```

**Body (example):**

```json
{
  "first_name": "John",
  "middle_name": "M.",
  "last_name": "Doe",
  "national_id": "29901011234567",
  "personal_email": "user@example.com",
  "password": "SecurePass123",
  "gender": "male",
  "street_address": "optional"
}
```

- `middle_name`, `gender`, `street_address` are **optional**.
- `national_id`: **at least 14 characters** (API validation).
- `password`: **at least 6 characters**.

**Success (201):** User object **without** password hash.

**Common errors:** `400` — national ID or email already in use.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "identifier": "29901011234567",
  "password": "SecurePass123",
  "role": "STUDENT"
}
```

- `identifier`: **National ID** stored in the system.
- `role`: **Optional** — if sent, it must match the user’s role in the database (`STUDENT` | `ADVISOR` | `ADMIN`).

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

## 5) Example — `fetch` (JavaScript)

```javascript
const API = "https://cogni-advisor-backend.vercel.app";

// Login
const res = await fetch(`${API}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    identifier: "29901011234567",
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

## 6) Additional auth routes (short)

| Route | Description |
|-------|-------------|
| `GET /api/auth/me` | Current user (requires token) |
| `PATCH /api/auth/change-password` | Change password (requires token) |

Other resources (students, courses, enrollments, study plans, notifications, etc.) live under **`/api/...`** and require **`Authorization`** with role-based access (e.g. `ADMIN` for user management).

---

## 7) Interactive docs (Swagger)

Open in the browser:

```text
https://cogni-advisor-backend.vercel.app/api-docs/
```

You can try requests and copy schemas from there.

---

## 8) Postman

In the repository:

- `postman/collection.json` — full collection.
- `postman/Cogni-Advisor.Production.postman_environment.json` — production env (`BASE_URL` preset).
- `postman/README.md` — import steps.

---

## 9) Frontend checklist

1. Set `API_URL` to the production Base URL above.
2. Add the frontend deployment URL to **`ALLOWED_ORIGINS`** on Vercel (coordinate with backend).
3. **Register** → **Login** → persist **`token`** (e.g. `localStorage`, `sessionStorage`, or in-memory state).
4. Send **`Authorization: Bearer <token>`** on every protected endpoint.
5. On **401**, clear the token and redirect to the login screen.

---

**Note:** Align version numbers with the `main` branch in the repository when needed.
