# Cogni Advisor API - Postman Handoff (Current Stable Scope)

This document is the current stable backend scope for frontend integration and QA using Postman.

## Quick Start (No Effort Setup)

Only fill these once in Postman Environment:

- `BASE_URL` = `https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1`
- `ADMIN_EMAIL` = `admin@admin.eelu.edu.eg`
- `ADMIN_PASSWORD` = `Admin@12345`
- `DEFAULT_USER_PASSWORD` = `Aa123456#`

Then use request Tests scripts below to auto-save tokens and IDs.

## 1) Base URL

Use this as `BASE_URL` in Postman environment:

```text
https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1
```

## 2) Authentication

### Fixed Bootstrap Admin

- Email: `admin@admin.eelu.edu.eg`
- Password: `Admin@12345`

### Login Endpoints (Email + Password only)

- `POST {{BASE_URL}}/api/auth/login/admin`
- `POST {{BASE_URL}}/api/auth/login/student`
- `POST {{BASE_URL}}/api/auth/login/advisor`

Body:

```json
{
  "email": "user@role.eelu.edu.eg",
  "password": "Aa123456#"
}
```

### Protected Endpoints Header

```text
Authorization: Bearer <TOKEN>
```

In Postman, use:

```text
Authorization: Bearer {{ADMIN_TOKEN}}
```

or:

```text
Authorization: Bearer {{STUDENT_TOKEN}}
```

or:

```text
Authorization: Bearer {{ADVISOR_TOKEN}}
```

### Postman Tests Script - Save Admin Token

Add this in **Tests** tab of `POST /api/auth/login/admin`:

```javascript
const json = pm.response.json();
if (pm.response.code === 200 && json.token) {
  pm.environment.set("ADMIN_TOKEN", json.token);
}
```

## 3) User Creation (Admin)

### Create Student

`POST {{BASE_URL}}/api/users/students`

```json
{
  "first_name": "abdallah",
  "middle_name": "sultan",
  "last_name": "gebally",
  "national_id": "30212092202299",
  "password": "Aa123456#",
  "gender": "male",
  "street_address": "benisuef"
}
```

### Postman Tests Script - Save Student Email/ID

Add this in **Tests** tab of `POST /api/users/students`:

```javascript
const json = pm.response.json();
if (pm.response.code === 201) {
  pm.environment.set("STUDENT_ID", json.user_id);
  pm.environment.set("STUDENT_EMAIL", json.personal_email);
}
```

### Create Advisor

`POST {{BASE_URL}}/api/users/advisors`

```json
{
  "first_name": "sara",
  "middle_name": "k",
  "last_name": "adel",
  "national_id": "30313092202299",
  "password": "Aa123456#",
  "gender": "female",
  "street_address": "cairo"
}
```

### Postman Tests Script - Save Advisor Email/ID

Add this in **Tests** tab of `POST /api/users/advisors`:

```javascript
const json = pm.response.json();
if (pm.response.code === 201) {
  pm.environment.set("ADVISOR_ID", json.user_id);
  pm.environment.set("ADVISOR_EMAIL", json.personal_email);
}
```

### Create Admin

`POST {{BASE_URL}}/api/users/admins`

Same body structure as above.

### List Users

`GET {{BASE_URL}}/api/users`

## 4) Email Generation Policy

`personal_email` is generated automatically by backend:

```text
firstName.userId@role.eelu.edu.eg
```

Examples:

- `abdallah.21@student.eelu.edu.eg`
- `sara.24@advisor.eelu.edu.eg`
- `mona.30@admin.eelu.edu.eg`

Important:

- Frontend should NOT send `personal_email` in create user body.
- Frontend should use returned `personal_email` for login.

## 5) Student Features (Verified)

- `GET {{BASE_URL}}/api/auth/me`
- `GET {{BASE_URL}}/api/students/me`
- `GET {{BASE_URL}}/api/students/me/summary`
- `GET {{BASE_URL}}/api/study-plan/me/current`
- `GET {{BASE_URL}}/api/study-plan/generate`
- `POST {{BASE_URL}}/api/ai/chat`
- `GET {{BASE_URL}}/api/students/me/messages`
- `POST {{BASE_URL}}/api/students/me/messages`

### AI Chat Body

`POST {{BASE_URL}}/api/ai/chat`

```json
{
  "message": "What are the best courses for next semester?"
}
```

### Student Login Request Body (with env vars)

`POST {{BASE_URL}}/api/auth/login/student`

```json
{
  "email": "{{STUDENT_EMAIL}}",
  "password": "{{DEFAULT_USER_PASSWORD}}"
}
```

### Postman Tests Script - Save Student Token

```javascript
const json = pm.response.json();
if (pm.response.code === 200 && json.token) {
  pm.environment.set("STUDENT_TOKEN", json.token);
}
```

## 6) Advisor Features (Verified)

- `GET {{BASE_URL}}/api/auth/me`
- `GET {{BASE_URL}}/api/advisor/me`
- `GET {{BASE_URL}}/api/advisor/dashboard`
- `GET {{BASE_URL}}/api/advisor/students`
- `GET {{BASE_URL}}/api/advisor/messages/conversations`
- `GET {{BASE_URL}}/api/advisor/messages/conversations/{studentId}/messages`
- `POST {{BASE_URL}}/api/advisor/messages/conversations/{studentId}/messages`

### Advisor Login Request Body (with env vars)

`POST {{BASE_URL}}/api/auth/login/advisor`

```json
{
  "email": "{{ADVISOR_EMAIL}}",
  "password": "{{DEFAULT_USER_PASSWORD}}"
}
```

### Postman Tests Script - Save Advisor Token

```javascript
const json = pm.response.json();
if (pm.response.code === 200 && json.token) {
  pm.environment.set("ADVISOR_TOKEN", json.token);
}
```

## 7) Notifications (Verified)

### Admin sends notification

`POST {{BASE_URL}}/api/notifications`

```json
{
  "recipient_id": 21,
  "title": "Test Notification",
  "body": "Testing notification flow"
}
```

### Student notification actions

- `GET {{BASE_URL}}/api/notifications`
- `PATCH {{BASE_URL}}/api/notifications/{id}/read`
- `PATCH {{BASE_URL}}/api/notifications/read-all`

## 8) Required Setup for Plan/Messaging Flows

Some student endpoints depend on setup data:

1. Student must be assigned to advisor:
   - `PUT` or `PATCH {{BASE_URL}}/api/students/{{STUDENT_ID}}`
   - body example:

```json
{
  "advisor_id": {{ADVISOR_ID}},
  "major_type": "CS",
  "level": 1,
  "status": "ACTIVE"
}
```

2. At least one semester must exist:
   - `POST {{BASE_URL}}/api/semesters`

3. Student plan should exist for target semester:
   - `POST {{BASE_URL}}/api/study-plan`

```json
{
  "semester_id": 1
}
```

## Ready Order for Frontend Team

1. Run `POST /api/auth/login/admin` (auto-save `ADMIN_TOKEN`).
2. Run `POST /api/users/students` (auto-save `STUDENT_ID`, `STUDENT_EMAIL`).
3. Run `POST /api/users/advisors` (auto-save `ADVISOR_ID`, `ADVISOR_EMAIL`).
4. Run `POST /api/auth/login/student` (auto-save `STUDENT_TOKEN`).
5. Run `POST /api/auth/login/advisor` (auto-save `ADVISOR_TOKEN`).
6. Assign advisor to student using saved IDs.
7. Create semester (if needed), then create student plan.
8. Start testing student/advisor/notification endpoints.

## 9) Common Response Cases

- `200/201`: success
- `400`: validation or duplicate data
- `401`: invalid or expired token
- `403`: role not authorized
- `404`: missing dependency (example: no assigned advisor, no current plan)

## 10) Suggested Postman Environment Variables

- `BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `DEFAULT_USER_PASSWORD`
- `ADMIN_TOKEN`
- `STUDENT_TOKEN`
- `ADVISOR_TOKEN`
- `STUDENT_ID`
- `ADVISOR_ID`
- `STUDENT_EMAIL`
- `ADVISOR_EMAIL`

## 11) Reference

- OpenAPI JSON: `docs/openapi.json`
