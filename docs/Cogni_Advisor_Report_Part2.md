

## 6. Backend API

### 6.1 Project Structure

```
src/
├── app.ts                 # Express app setup and middleware configuration
├── server.ts              # Server entry point
├── config/
│   ├── prisma.ts          # Prisma ORM client instance
│   ├── logger.ts          # Winston logger configuration
│   └── swagger.ts         # OpenAPI/Swagger documentation (57KB)
├── controllers/           # 16 route handlers
├── services/              # 22 business logic services
├── routes/                # 17 route definition files
├── middlewares/            # 5 middleware functions
├── validations/           # 16 Zod validation schemas
├── utils/                 # 11 utility modules
├── types/                 # TypeScript type definitions
├── constants/             # Application constants
└── generators/            # Code generators
```

### 6.2 Controllers (16 modules)

| Controller | Description |
|-----------|-------------|
| auth.controller | Login, change password, forgot/reset password |
| user.controller | User profile CRUD operations |
| student.controller | Student data retrieval and updates |
| advisor.controller | Advisor management and student assignments |
| admin.controller | Admin dashboard, settings, and system overview |
| course.controller | Course CRUD and prerequisite management |
| enrollment.controller | Course enrollment and grade recording |
| studyPlan.controller | Study plan creation, submission, and review |
| semester.controller | Semester management |
| semesterRecord.controller | Semester performance records |
| ai.controller | AI chat, plan suggestions, GPA prediction, risk analysis |
| feedback.controller | Advisor-to-student feedback |
| message.controller | Messaging between users |
| notification.controller | Notification management |
| progress.controller | Graduation progress tracking |
| recommendations.controller | Course recommendations |

### 6.3 Services (22 modules)

#### Authentication and User Services:
- **auth.service** — JWT login, bcrypt password hashing, OTP-based password reset via Resend Email or Supabase Auth
- **user.service** — User CRUD with role management
- **email.service** — OTP email delivery via Resend API with masked email responses

#### Student and Advisor Services:
- **student.service** — Student profile management and search
- **advisor.service** — Advisor management with student assignment
- **admin.service** — Dashboard overview, system settings (General, AI Engine, Permissions, Security), academic calendar, audit logs, student search

#### Academic Services:
- **course.service** — Course and prerequisite management
- **enrollment.service** — Enrollment, grade recording, bulk grade upload with automatic GPA recalculation, semester record synchronization
- **studyPlan.service** — Full study plan lifecycle: create, add/remove courses, update, submit for review, withdraw, delete, advisor review (approve/reject with feedback), notification triggers
- **courseEligibility.service** — Prerequisite validation, GPA-based credit limits (GPA < 1.0: max 12 hrs, GPA < 2.0: max 15 hrs, else: max 18 hrs), term availability checking, department filtering
- **semester.service** — Semester CRUD
- **semesterRecord.service** — Per-semester performance records

#### AI Integration Services:
- **ai.service** — Chat interaction, plan suggestions, GPA prediction, risk analysis with full interaction logging
- **cogniAdvisorAiClient** — HTTP client for Flask AI Service with timeout handling and error localization
- **aiPayloadBuilder** — Request payload construction for AI service
- **recommendations.service** — Course recommendation logic

#### Supporting Services:
- **notification.service** — Notification creation and management
- **message.service** — User-to-user messaging system
- **feedback.service** — Advisor feedback management
- **progress.service** — Graduation progress tracking

### 6.4 Middlewares (5 modules)

| Middleware | Function |
|-----------|----------|
| auth.middleware | JWT token verification, user extraction from Bearer token |
| role.middleware | Role-Based Access Control (RBAC) with configurable allowed roles |
| validate.middleware | Request body validation using Zod schemas |
| errorHandler.middleware | Centralized error handling with custom AppError class |
| requestId.middleware | Unique request ID generation for tracing |

### 6.5 Validation Layer

The project uses **Zod** for input validation with **16 validation schema files** covering all endpoints: auth, user, student, advisor, admin, course, enrollment, studyPlan, semester, semesterRecord, ai, feedback, message, notification, progress, and recommendations.

### 6.6 Utility Modules (11 modules)

| Utility | Function |
|---------|----------|
| AppError | Custom error class with HTTP status codes |
| asyncHandler | Express async error wrapper |
| gpaCalculator | Cumulative GPA calculation and update |
| gradeScale | Grade-to-points conversion (A+=4.0, A=4.0, ..., F=0.0) |
| aiCourseCatalog | Course catalog loader for AI service |
| aiTermMapper | Semester name to AI term format converter |
| eeluBylawCurriculum | EELU curriculum data by bylaw |
| curriculumGroups | Course grouping by curriculum category |
| planningSemester | Current planning semester resolution |
| studentIdentity | Student identity verification |
| studyplannerCatalogFilters | Catalog filtering for study planner |

---

## 7. Frontend Application

### 7.1 Project Structure

```
cogni-advisor-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Authentication pages
│   │   │   ├── login/              # Login page
│   │   │   ├── forget-password/    # Forgot password page
│   │   │   └── reset-password/     # Reset password page
│   │   ├── student/                # Student portal (5 pages)
│   │   │   ├── dashboard/          # Student home with stats
│   │   │   ├── study-plan/         # Study plan builder
│   │   │   ├── transcript/         # Academic transcript
│   │   │   ├── chat/               # AI chatbot interface
│   │   │   └── messages/           # Messaging with advisor
│   │   ├── advisor/                # Advisor portal (4 pages)
│   │   │   ├── dashboard/          # Advisor home
│   │   │   ├── students/           # Student list
│   │   │   ├── study-plans/        # Plan review interface
│   │   │   └── messages/           # Messaging with students
│   │   ├── admin/                  # Admin portal (10 pages)
│   │   │   ├── dashboard/          # System overview with metrics
│   │   │   ├── users/              # User management
│   │   │   ├── courses/            # Course management
│   │   │   ├── semesters/          # Semester management
│   │   │   ├── grades/             # Bulk grade upload
│   │   │   ├── advisors/           # Advisor management
│   │   │   ├── add-student/        # Student registration
│   │   │   ├── add-advisor/        # Advisor registration
│   │   │   ├── permissions/        # Role permissions editor
│   │   │   └── settings/           # System settings
│   │   └── api/                    # Next.js API routes (NextAuth)
│   ├── components/
│   │   ├── ui/                     # 6 reusable UI components
│   │   ├── layout/                 # Layout shells and navigation
│   │   └── providers/              # React Context Providers
│   ├── lib/
│   │   ├── actions/                # 7 Server Action files
│   │   ├── schemes/                # Zod validation schemas
│   │   ├── shared/                 # Shared utilities
│   │   ├── types/                  # TypeScript type definitions
│   │   └── utils/                  # Helper utilities
│   ├── auth.ts                     # NextAuth configuration
│   └── middleware.ts               # Route protection middleware
```

### 7.2 Authentication System

Uses **NextAuth.js v4** with **Credentials Provider**:
- Login via university email and password
- Communicates with Backend API for credential verification
- Stores user data (id, role, JWT token) in the session
- **Middleware** protects routes based on authentication state:
  - `/login`, `/register`, `/forget-password` — Guest only (redirects authenticated users)
  - `/student/*`, `/advisor/*`, `/admin/*` — Requires authentication (redirects to login)
  - `/` — Public access

### 7.3 Server Actions (7 files)

| Action File | Functions |
|------------|-----------|
| auth.action | Login, forgot password, reset password with OTP |
| student.action | Fetch student profile, transcript, academic data |
| study-plan.action | Create/update/submit/withdraw plans, add/remove courses, fetch available courses |
| advisor.action | Fetch assigned students, review study plans (approve/reject) |
| admin.action | User management, course CRUD, settings, bulk grade upload, semester management |
| message.action | Send and receive messages, conversation threads |
| notification.action | Fetch notifications, mark as read |

### 7.4 UI Components (Built on Radix UI + CVA)

- **Button** — Multi-variant button component with size and style options
- **Input** — Styled input fields with error states
- **Form** — Integrated form system with React Hook Form and Zod validation
- **Checkbox** — Accessible checkbox (Radix UI)
- **Label** — Form field labels
- **Sonner (Toaster)** — Toast notification system

### 7.5 Layout Components

- **DashboardShell** — Main dashboard frame with sidebar navigation and responsive design
- **NotificationBell** — Notification icon with unread count badge
- **StudentLayoutShell** — Student portal layout with navigation links
- **AdvisorLayoutShell** — Advisor portal layout
- **AdminLayoutShell** — Admin portal layout

---

## 8. AI Service

### 8.1 Architecture

```
cogni-advisor-ai/GP/
├── app.py                       # Flask application entry point
├── run_app.py                   # Gunicorn production runner
├── llm_client.py                # Provider-agnostic LLM client
├── chatBot/                     # Chatbot module
│   ├── routes.py                # /chatbot/api/ask endpoint
│   ├── utils.py                 # RAG processing and model loading
│   ├── structured_lookup.py     # Structured bylaw search (15KB)
│   ├── prompts/                 # LLM prompt templates
│   └── data/                    # Training and reference data
├── recommendation/              # Recommendation module
│   ├── routes.py                # /recommendation/api/recommend endpoint
│   ├── utils.py                 # Recommendation logic (29KB)
│   ├── repository.py            # Data access layer
│   ├── db.py                    # Database connection
│   ├── llm_summary.py           # LLM-powered recommendation summaries
│   ├── preprocess_bylaws.py     # University bylaw preprocessing (25KB)
│   └── data/                    # Course catalog data
├── bylaws_vector_index/         # Pre-built FAISS index for bylaw search
├── eelu.pdf                     # University bylaws document (155KB)
└── eelulaw.pdf                  # Extended bylaws document (1.5MB)
```

### 8.2 Chatbot Module

- Uses **RAG (Retrieval Augmented Generation)** to answer bylaw-related questions
- **FAISS Vector Index** for indexing EELU bylaw content from PDF documents
- **Sentence Transformers** for text-to-embedding conversion
- **Structured Lookup** for direct information retrieval on specific topics
- Supports both Arabic and English questions with automatic language detection
- Contextual responses using student data (GPA, level, completed courses)

### 8.3 Recommendation Module

- Analyzes student academic profile (GPA, earned hours, completed courses, failed courses)
- Recommends appropriate courses for the next semester
- Validates prerequisites and GPA-based credit hour limits
- Uses LLM to generate human-readable recommendation summaries
- Integrates with university curriculum data and bylaw rules

### 8.4 LLM Client (llm_client.py)

- **Provider-agnostic design**: Supports Google Gemini and OpenRouter
- **Auto-routing**: Automatically selects provider based on available API keys
- **Fallback chain**: Tries multiple Gemini models (gemini-flash-latest, gemini-2.0-flash-lite, gemini-2.5-flash) on failure
- **Error handling**: Localized error messages with Arabic translations
- **Security**: API key scrubbing from logs and error messages
- **Configuration**: Environment-based model and provider selection

---

## 9. Security and Authentication

### 9.1 Authentication Mechanisms

| Layer | Technology | Mechanism |
|-------|-----------|-----------|
| Backend | JWT | Bearer Token with 1-day expiration |
| Backend | bcrypt | Password hashing (10 salt rounds) |
| Frontend | NextAuth.js | Session management with JWT Strategy |
| Password Reset | Resend + OTP | 6-digit OTP sent to personal email |
| Password Reset | Supabase Auth | Alternative OTP via Supabase |

### 9.2 Authorization (RBAC)

| Permission | STUDENT | ADVISOR | ADMIN |
|-----------|---------|---------|-------|
| View Plans | Yes | Yes | Yes |
| Edit Plans | Yes | No | Yes |
| Approve Plans | No | Yes | Yes |
| Send Alerts | No | Yes | Yes |
| Manage Courses | No | No | Yes |
| System Access | No | No | Yes |

Permissions are stored in the SystemSetting table and are dynamically configurable by admins.

### 9.3 API Protection

- **Helmet** — HTTP security headers including Content Security Policy (CSP)
- **CORS** — Configurable allowed origins via environment variables
- **Rate Limiting** (three tiers):
  - General API: Standard rate limit per time window
  - Login endpoints: Stricter limit to prevent brute force attacks
  - Password reset: Most restrictive limit
- **Request ID** — Unique ID per request for distributed tracing
- **Trust Proxy** — Enabled for Vercel/Supabase gateway compatibility
- **Input Validation** — All inputs validated with Zod schemas before processing

---

## 10. API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | User login (returns JWT) | No |
| POST | /api/auth/register | User registration | No |
| POST | /api/auth/forgot-password | Request password reset OTP | No |
| POST | /api/auth/reset-password | Confirm OTP and reset password | No |
| POST | /api/auth/change-password | Change current password | Yes |
| GET | /api/users/me | Get current user profile | Yes |
| PATCH | /api/users/me | Update current user profile | Yes |
| GET | /api/students/profile | Get student academic profile | Student |
| GET | /api/students/transcript | Get academic transcript | Student |
| GET | /api/study-plan/current | Get current study plan | Student |
| POST | /api/study-plan | Create new study plan | Student |
| POST | /api/study-plan/:id/courses | Add course to plan | Student |
| DELETE | /api/study-plan/:id/courses/:courseId | Remove course from plan | Student |
| PUT | /api/study-plan/:id/courses | Update plan courses | Student/Advisor |
| POST | /api/study-plan/:id/submit | Submit plan for review | Student |
| POST | /api/study-plan/:id/withdraw | Withdraw submitted plan | Student |
| DELETE | /api/study-plan/:id | Delete study plan | Student |
| PATCH | /api/study-plan/:id/review | Review plan (approve/reject) | Advisor |
| GET | /api/study-plan/pending | Get pending plans for review | Advisor |
| GET | /api/advisor/students | Get advisor's students | Advisor |
| GET | /api/admin/overview | System overview dashboard | Admin |
| GET | /api/admin/settings | Get system settings | Admin |
| PATCH | /api/admin/settings | Update system settings | Admin |
| GET | /api/courses | List all courses | Yes |
| POST | /api/courses | Create a course | Admin |
| POST | /api/enrollments | Enroll in a course | Yes |
| POST | /api/enrollments/bulk-grades | Bulk upload grades | Admin |
| POST | /api/ai/chat | AI chatbot conversation | Student |
| POST | /api/ai/suggest-plan | AI plan suggestion | Student |
| POST | /api/ai/predict-gpa | AI GPA prediction | Student |
| GET | /api/ai/risk-analysis | Academic risk analysis | Student |
| GET | /api/ai/history | AI interaction history | Student |
| GET | /api/notifications | Get user notifications | Yes |
| POST | /api/messages | Send a message | Yes |
| GET | /api/messages | Get message threads | Yes |
| GET | /api/recommendations | Get course recommendations | Student |
| GET | /api/semesters | List semesters | Yes |
| GET | /api/health | System health check | No |
| GET | /api-docs | Swagger API documentation | No |

---

## 11. Deployment and DevOps

### 11.1 Docker Configuration

The backend uses a multi-stage Docker setup with `node:20-alpine`:
- Installs OpenSSL (for Prisma) and curl (for health checks)
- Runs `npm ci` and `prisma generate` during build
- Exposes port 5000 with a 30-second health check interval
- Entry point via custom shell script

### 11.2 Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string (Supabase pooler) |
| DIRECT_URL | Direct PostgreSQL connection for Prisma migrations |
| JWT_SECRET | Secret key for JWT token signing |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |
| COGNI_ADVISOR_AI_ENABLED | Enable AI service (0 or 1) |
| COGNI_ADVISOR_AI_BASE_URL | Flask AI service URL (default: http://localhost:7860) |
| COGNI_ADVISOR_AI_TIMEOUT_MS | AI request timeout (default: 60000ms) |
| GEMINI_API_KEY | Google Gemini API key |
| OPENROUTER_API_KEY | OpenRouter API key (fallback) |
| RESEND_API_KEY | Resend email delivery API key |
| NEXTAUTH_SECRET | NextAuth.js session secret |
| ALLOWED_ORIGINS | Comma-separated allowed CORS origins |

### 11.3 Deployment Platforms

| Platform | Component | Configuration |
|----------|-----------|---------------|
| Vercel | Backend API + Frontend | vercel.json |
| Render | Alternative backend hosting | render.yaml |
| Docker Compose | Local development with PostgreSQL | docker-compose.yml |
| Supabase | PostgreSQL database hosting | Prisma schema |
| HuggingFace Spaces | AI Service hosting | Flask/Gunicorn |

### 11.4 Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| dev | `tsx watch src/server.ts` | Development server with hot reload |
| build | `tsc` | TypeScript compilation |
| start | `node dist/server.js` | Production server |
| test | `vitest run` | Run unit tests |
| test:smoke | `tsx src/scripts/smoke_test.ts` | Smoke testing |
| test:e2e | `tsx src/scripts/e2e_full_test.ts` | End-to-end testing |

---

## 12. Conclusion

**Cogni-Advisor** is a comprehensive intelligent academic advising system that integrates three major components:

1. **Robust Backend API** — Built with Express.js 5 + TypeScript, featuring 16 controllers, 22 services, 17 route files, 16 validation schemas, and a multi-layered security system with JWT, RBAC, rate limiting, and audit logging.

2. **Modern Frontend Application** — Built with Next.js 14 + React 18, offering 20+ pages across three role-based portals (Student, Advisor, Admin) with NextAuth.js authentication, TanStack React Query for data management, and a responsive UI built on TailwindCSS and Radix UI components.

3. **AI-Powered Service** — Built with Flask + LangChain, providing a RAG-based chatbot that answers questions from university bylaws using FAISS vector search and Google Gemini LLM, plus an intelligent course recommendation engine.

4. **Comprehensive Database** — 18 PostgreSQL tables with 10 enums covering all aspects of the academic system, managed through Prisma ORM with full migration support.

5. **Production-Ready Infrastructure** — Docker containerization, Vercel/Render deployment, Supabase database hosting, and comprehensive environment configuration.

### Project Statistics Summary

| Metric | Count |
|--------|-------|
| Total Backend Controllers | 16 |
| Total Backend Services | 22 |
| Total API Route Files | 17 |
| Total Validation Schemas | 16 |
| Total Backend Middlewares | 5 |
| Total Utility Modules | 11 |
| Total Database Tables | 18 |
| Total Database Enums | 10 |
| Total Frontend Pages | 20+ |
| Total Server Actions | 7 |
| Total UI Components | 6 |
| Frontend Frameworks | Next.js 14, React 18 |
| Backend Frameworks | Express.js 5, Prisma 6 |
| AI Frameworks | Flask 3, LangChain 0.3 |
| Primary Database | PostgreSQL (Supabase) |
| Primary LLM | Google Gemini |
| Total Source Files | 100+ |

---

*Report generated on June 2026*
