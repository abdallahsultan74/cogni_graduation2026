
# Cogni-Advisor: Graduation Project Report
## Intelligent Academic Advising System

**Date:** June 2026

---

## Table of Contents

1. Project Introduction
2. Project Objectives
3. System Architecture
4. Technologies Used
5. Database Schema
6. Backend API
7. Frontend Application
8. AI Service
9. Security and Authentication
10. API Endpoints
11. Deployment and DevOps
12. Conclusion

---

## 1. Project Introduction

**Cogni-Advisor** is an intelligent academic advising system built for EELU (Egyptian E-Learning University). The system aims to streamline the academic advising process between students and academic advisors through the use of Artificial Intelligence technologies to provide smart study plan recommendations, a chatbot powered by university bylaws, and a comprehensive administration panel.

The project consists of **three main components**:
- **Backend API** â€” Built with Node.js + Express.js + TypeScript
- **Frontend** â€” Built with Next.js 14 + React 18 + TailwindCSS
- **AI Service** â€” Built with Python Flask + LangChain + FAISS

### Key Features:
- Role-based dashboards for Students, Advisors, and Admins
- Smart study plan creation with prerequisite validation and credit-hour limits
- AI-powered chatbot that answers questions based on university bylaws (RAG)
- Course recommendation engine
- GPA prediction and academic risk analysis
- Real-time notification system
- Messaging system between students and advisors
- Bulk grade upload with automatic GPA recalculation
- Academic calendar management
- Audit logging and system monitoring

---

## 2. Project Objectives

| # | Objective | Description |
|---|-----------|-------------|
| 1 | Automated Academic Advising | Enable students to build smart study plans based on prerequisites, earned hours, and GPA-based credit limits |
| 2 | AI Chatbot | Answer student questions about university bylaws using RAG (Retrieval Augmented Generation) with FAISS vector search |
| 3 | Course Management | Comprehensive system for managing courses, prerequisites, enrollments, and grade tracking |
| 4 | Smart Alerts | Automatic alerts for students with low GPA, academic probation, or missing graduation requirements |
| 5 | Admin Dashboard | Full control panel for user management, system settings, permissions, and monitoring |
| 6 | Communication System | Direct messaging between students and academic advisors with notifications |

---

## 3. System Architecture

```
+-------------------+     +--------------------+     +-------------------+
|                   |     |                    |     |                   |
|   Frontend        |---->|   Backend API      |---->|   PostgreSQL      |
|   (Next.js 14)    |     |   (Express.js 5)   |     |   (Supabase)      |
|   Port: 3000      |     |   Port: 5000       |     |                   |
|                   |     |                    |     +-------------------+
+-------------------+     +---------+----------+
                                    |
                                    v
                          +--------------------+
                          |   AI Service       |
                          |   (Flask/Python)   |
                          |   Port: 7860       |
                          |  - Chatbot (RAG)   |
                          |  - Recommender     |
                          +--------------------+
```

**Communication Patterns:**
- Frontend <-> Backend: REST API over HTTP with JWT Authentication
- Backend <-> Database: Prisma ORM over PostgreSQL (hosted on Supabase)
- Backend <-> AI Service: HTTP REST calls to Flask API
- Frontend Auth: NextAuth.js with JWT strategy and Credentials Provider

---

## 4. Technologies Used

### 4.1 Backend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20.x | Runtime environment |
| Express.js | 5.2.1 | Web API framework |
| TypeScript | 5.9.3 | Primary programming language |
| Prisma ORM | 6.6.0 | Database access and migrations |
| PostgreSQL | â€” | Relational database (via Supabase) |
| Supabase JS | 2.105.0 | OTP authentication services |
| JSON Web Token | 9.0.3 | Authentication tokens |
| bcrypt | 6.0.0 | Password hashing |
| Zod | 4.3.6 | Request validation |
| Helmet | 8.1.0 | HTTP security headers |
| CORS | 2.8.6 | Cross-origin resource sharing |
| Morgan | 1.10.1 | HTTP request logging |
| Winston | 3.19.0 | Advanced logging system |
| express-rate-limit | 8.2.1 | Rate limiting protection |
| Swagger UI Express | 5.0.1 | API documentation |
| PDFKit | 0.19.1 | PDF generation |
| Resend | 6.12.4 | Email delivery service |
| Vitest | 4.0.18 | Unit testing framework |
| Supertest | 7.2.2 | API integration testing |

### 4.2 Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.35 | React framework with SSR and routing |
| React | 18 | UI component library |
| TypeScript | 5.x | Type-safe development |
| TailwindCSS | 3.4.1 | Utility-first CSS framework |
| NextAuth.js | 4.24.13 | Frontend authentication |
| TanStack React Query | 5.90.21 | Data fetching, caching, and state management |
| React Hook Form | 7.71.2 | Form management |
| Zod | 4.3.6 | Form validation schemas |
| Radix UI | â€” | Accessible UI primitives (Checkbox) |
| Lucide React | 0.575.0 | Icon library |
| Sonner | 2.0.7 | Toast notifications |
| Class Variance Authority | 0.7.1 | Component style variants |
| clsx + tailwind-merge | â€” | CSS class composition utilities |

### 4.3 AI Service Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.x | Programming language |
| Flask | 3.0.3 | Web framework |
| LangChain | 0.3.1 | LLM orchestration framework |
| LangChain Community | 0.3.1 | Additional LangChain connectors |
| LangChain HuggingFace | 0.1.0 | HuggingFace integration |
| Sentence Transformers | 3.1.1 | Text-to-embedding conversion |
| FAISS | 1.12.0 | Vector similarity search and indexing |
| Google Gemini API | â€” | Primary Large Language Model |
| OpenRouter API | â€” | Fallback LLM provider (DeepSeek) |
| Gunicorn | 23.0.0 | Production WSGI server |
| Flask-CORS | 5.0.0 | Cross-origin support |

### 4.4 DevOps and Deployment Tools

| Technology | Purpose |
|-----------|---------|
| Docker | Application containerization |
| Docker Compose | Multi-service orchestration |
| Vercel | Backend and Frontend hosting |
| Supabase | PostgreSQL database hosting |
| PM2 (ecosystem.config) | Process management |
| Render | Alternative deployment platform (render.yaml) |

---

## 5. Database Schema

### 5.1 Overview

The database is built on **PostgreSQL** hosted on **Supabase**, managed through **Prisma ORM**. It contains **18 main tables** and **10 enums**.

### 5.2 Core Tables

#### User Table
| Column | Type | Description |
|--------|------|-------------|
| user_id | Int (PK, Auto) | Unique identifier |
| first_name | VarChar(50) | First name |
| middle_name | VarChar(50)? | Middle name (optional) |
| last_name | VarChar(50) | Last name |
| national_id | VarChar(20) UNIQUE | National ID number |
| university_email | VarChar(100) UNIQUE | University email |
| personal_email | VarChar(100)? UNIQUE | Personal email |
| password_hash | VarChar(255) | Hashed password (bcrypt) |
| gender | VarChar(10)? | Gender |
| role | UserRole Enum | Role (STUDENT/ADVISOR/ADMIN) |
| created_at | DateTime | Account creation date |

#### Student Table
| Column | Type | Description |
|--------|------|-------------|
| student_id | Int (PK, FK to User) | Student identifier |
| university_student_id | VarChar(7)? UNIQUE | University student number |
| advisor_id | Int? (FK to Advisor) | Assigned academic advisor |
| major_type | VarChar(50)? | Major (IT or AI) |
| level | Int (default: 1) | Academic level (1-4) |
| cumulative_gpa | Decimal(3,2) | Cumulative GPA |
| total_earned_hours | Int | Total credit hours earned |
| status | StudentStatus Enum | Status (ACTIVE/INACTIVE/SUSPENDED) |

#### Course Table
| Column | Type | Description |
|--------|------|-------------|
| course_id | Int (PK, Auto) | Course identifier |
| course_code | VarChar(20) UNIQUE | Course code (e.g., CS101) |
| course_name | VarChar(150) | Course name |
| credits | Int | Credit hours |
| required_hours_to_take | Int? | Minimum hours required to enroll |
| is_available | Boolean | Available for enrollment |

#### StudyPlan Table
| Column | Type | Description |
|--------|------|-------------|
| plan_id | Int (PK, Auto) | Plan identifier |
| student_id | Int (FK) | Student who created the plan |
| semester_id | Int (FK) | Target semester |
| advisor_id | Int? (FK) | Reviewing advisor |
| plan_status | PlanStatus Enum | Status (PENDING/APPROVED/REJECTED) |
| total_hours | Int | Total credit hours in plan |
| submitted_at | DateTime? | Submission date for review |
| feedback | Text? | Advisor feedback |

#### Additional Tables:
- **Advisor** â€” Advisor profile (office_hours, bio)
- **Admin** â€” Admin profile linked to User
- **Enrollment** â€” Student course enrollments with grades
- **CoursePrerequisite** â€” Course prerequisite relationships
- **Semester** â€” Academic semesters with date ranges
- **SemesterRecord** â€” Student performance per semester (semester GPA, registered hours)
- **PlanDetail** â€” Courses selected in a study plan (junction table)
- **Feedback** â€” Advisor feedback to students
- **Notification** â€” System notifications (title, body, type, action_url)
- **Message** â€” Direct messages between users
- **AIInteraction** â€” AI interaction logs (query_type, input/response data, status)
- **Alert** â€” Academic alerts (LOW_GPA, ACADEMIC_PROBATION, etc.)
- **GraduationRequirement** â€” Graduation requirements by category
- **GraduationProgress** â€” Student progress toward graduation requirements
- **CourseReview** â€” Student course reviews (rating, difficulty, workload)
- **SystemSetting** â€” Configurable system settings (JSON values)
- **AuditLog** â€” System audit trail
- **PasswordResetToken** â€” OTP tokens for password reset

### 5.3 Enums

| Enum | Values | Usage |
|------|--------|-------|
| UserRole | STUDENT, ADVISOR, ADMIN | User roles |
| StudentStatus | ACTIVE, INACTIVE, SUSPENDED | Student status |
| PlanStatus | PENDING, APPROVED, REJECTED | Study plan status |
| AIQueryType | CHAT, SUGGEST_PLAN, PREDICT_GPA, RISK_ANALYSIS | AI interaction types |
| AIStatus | PENDING, PROCESSING, COMPLETED, FAILED | AI processing status |
| AlertType | LOW_GPA, ACADEMIC_PROBATION, MISSING_HOURS, FAILED_COURSE, OVERLOAD, NO_ENROLLMENT, GRADUATION_DELAY | Alert categories |
| AlertSeverity | LOW, MEDIUM, HIGH, CRITICAL | Alert severity levels |
| RequirementCategory | CORE_COURSES, MAJOR_COURSES, ELECTIVES, GENERAL_EDUCATION, CAPSTONE | Graduation requirement categories |
| SystemSettingCategory | GENERAL, AI_ENGINE, PERMISSIONS, SECURITY | System setting groups |

### 5.4 Entity Relationship Overview

```
User (1) ---- (0..1) Student
User (1) ---- (0..1) Advisor
User (1) ---- (0..1) Admin
Student (N) ---- (1) Advisor
Student (1) ---- (N) StudyPlan
Student (1) ---- (N) Enrollment
Student (1) ---- (N) AIInteraction
Student (1) ---- (N) Alert
StudyPlan (1) ---- (N) PlanDetail
PlanDetail (N) ---- (1) Course
Course (1) ---- (N) CoursePrerequisite
Enrollment (N) ---- (1) Course
Semester (1) ---- (N) StudyPlan
User (1) ---- (N) Message (sender)
User (1) ---- (N) Message (recipient)
User (1) ---- (N) Notification
```



## 6. Backend API

### 6.1 Project Structure

```
src/
â”œâ”€â”€ app.ts                 # Express app setup and middleware configuration
â”œâ”€â”€ server.ts              # Server entry point
â”œâ”€â”€ config/
â”‚   â”œâ”€â”€ prisma.ts          # Prisma ORM client instance
â”‚   â”œâ”€â”€ logger.ts          # Winston logger configuration
â”‚   â””â”€â”€ swagger.ts         # OpenAPI/Swagger documentation (57KB)
â”œâ”€â”€ controllers/           # 16 route handlers
â”œâ”€â”€ services/              # 22 business logic services
â”œâ”€â”€ routes/                # 17 route definition files
â”œâ”€â”€ middlewares/            # 5 middleware functions
â”œâ”€â”€ validations/           # 16 Zod validation schemas
â”œâ”€â”€ utils/                 # 11 utility modules
â”œâ”€â”€ types/                 # TypeScript type definitions
â”œâ”€â”€ constants/             # Application constants
â””â”€â”€ generators/            # Code generators
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
- **auth.service** â€” JWT login, bcrypt password hashing, OTP-based password reset via Resend Email or Supabase Auth
- **user.service** â€” User CRUD with role management
- **email.service** â€” OTP email delivery via Resend API with masked email responses

#### Student and Advisor Services:
- **student.service** â€” Student profile management and search
- **advisor.service** â€” Advisor management with student assignment
- **admin.service** â€” Dashboard overview, system settings (General, AI Engine, Permissions, Security), academic calendar, audit logs, student search

#### Academic Services:
- **course.service** â€” Course and prerequisite management
- **enrollment.service** â€” Enrollment, grade recording, bulk grade upload with automatic GPA recalculation, semester record synchronization
- **studyPlan.service** â€” Full study plan lifecycle: create, add/remove courses, update, submit for review, withdraw, delete, advisor review (approve/reject with feedback), notification triggers
- **courseEligibility.service** â€” Prerequisite validation, GPA-based credit limits (GPA < 1.0: max 12 hrs, GPA < 2.0: max 15 hrs, else: max 18 hrs), term availability checking, department filtering
- **semester.service** â€” Semester CRUD
- **semesterRecord.service** â€” Per-semester performance records

#### AI Integration Services:
- **ai.service** â€” Chat interaction, plan suggestions, GPA prediction, risk analysis with full interaction logging
- **cogniAdvisorAiClient** â€” HTTP client for Flask AI Service with timeout handling and error localization
- **aiPayloadBuilder** â€” Request payload construction for AI service
- **recommendations.service** â€” Course recommendation logic

#### Supporting Services:
- **notification.service** â€” Notification creation and management
- **message.service** â€” User-to-user messaging system
- **feedback.service** â€” Advisor feedback management
- **progress.service** â€” Graduation progress tracking

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
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ (auth)/                 # Authentication pages
â”‚   â”‚   â”‚   â”œâ”€â”€ login/              # Login page
â”‚   â”‚   â”‚   â”œâ”€â”€ forget-password/    # Forgot password page
â”‚   â”‚   â”‚   â””â”€â”€ reset-password/     # Reset password page
â”‚   â”‚   â”œâ”€â”€ student/                # Student portal (5 pages)
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/          # Student home with stats
â”‚   â”‚   â”‚   â”œâ”€â”€ study-plan/         # Study plan builder
â”‚   â”‚   â”‚   â”œâ”€â”€ transcript/         # Academic transcript
â”‚   â”‚   â”‚   â”œâ”€â”€ chat/               # AI chatbot interface
â”‚   â”‚   â”‚   â””â”€â”€ messages/           # Messaging with advisor
â”‚   â”‚   â”œâ”€â”€ advisor/                # Advisor portal (4 pages)
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/          # Advisor home
â”‚   â”‚   â”‚   â”œâ”€â”€ students/           # Student list
â”‚   â”‚   â”‚   â”œâ”€â”€ study-plans/        # Plan review interface
â”‚   â”‚   â”‚   â””â”€â”€ messages/           # Messaging with students
â”‚   â”‚   â”œâ”€â”€ admin/                  # Admin portal (10 pages)
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/          # System overview with metrics
â”‚   â”‚   â”‚   â”œâ”€â”€ users/              # User management
â”‚   â”‚   â”‚   â”œâ”€â”€ courses/            # Course management
â”‚   â”‚   â”‚   â”œâ”€â”€ semesters/          # Semester management
â”‚   â”‚   â”‚   â”œâ”€â”€ grades/             # Bulk grade upload
â”‚   â”‚   â”‚   â”œâ”€â”€ advisors/           # Advisor management
â”‚   â”‚   â”‚   â”œâ”€â”€ add-student/        # Student registration
â”‚   â”‚   â”‚   â”œâ”€â”€ add-advisor/        # Advisor registration
â”‚   â”‚   â”‚   â”œâ”€â”€ permissions/        # Role permissions editor
â”‚   â”‚   â”‚   â””â”€â”€ settings/           # System settings
â”‚   â”‚   â””â”€â”€ api/                    # Next.js API routes (NextAuth)
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ ui/                     # 6 reusable UI components
â”‚   â”‚   â”œâ”€â”€ layout/                 # Layout shells and navigation
â”‚   â”‚   â””â”€â”€ providers/              # React Context Providers
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ actions/                # 7 Server Action files
â”‚   â”‚   â”œâ”€â”€ schemes/                # Zod validation schemas
â”‚   â”‚   â”œâ”€â”€ shared/                 # Shared utilities
â”‚   â”‚   â”œâ”€â”€ types/                  # TypeScript type definitions
â”‚   â”‚   â””â”€â”€ utils/                  # Helper utilities
â”‚   â”œâ”€â”€ auth.ts                     # NextAuth configuration
â”‚   â””â”€â”€ middleware.ts               # Route protection middleware
```

### 7.2 Authentication System

Uses **NextAuth.js v4** with **Credentials Provider**:
- Login via university email and password
- Communicates with Backend API for credential verification
- Stores user data (id, role, JWT token) in the session
- **Middleware** protects routes based on authentication state:
  - `/login`, `/register`, `/forget-password` â€” Guest only (redirects authenticated users)
  - `/student/*`, `/advisor/*`, `/admin/*` â€” Requires authentication (redirects to login)
  - `/` â€” Public access

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

- **Button** â€” Multi-variant button component with size and style options
- **Input** â€” Styled input fields with error states
- **Form** â€” Integrated form system with React Hook Form and Zod validation
- **Checkbox** â€” Accessible checkbox (Radix UI)
- **Label** â€” Form field labels
- **Sonner (Toaster)** â€” Toast notification system

### 7.5 Layout Components

- **DashboardShell** â€” Main dashboard frame with sidebar navigation and responsive design
- **NotificationBell** â€” Notification icon with unread count badge
- **StudentLayoutShell** â€” Student portal layout with navigation links
- **AdvisorLayoutShell** â€” Advisor portal layout
- **AdminLayoutShell** â€” Admin portal layout

---

## 8. AI Service

### 8.1 Architecture

```
cogni-advisor-ai/GP/
â”œâ”€â”€ app.py                       # Flask application entry point
â”œâ”€â”€ run_app.py                   # Gunicorn production runner
â”œâ”€â”€ llm_client.py                # Provider-agnostic LLM client
â”œâ”€â”€ chatBot/                     # Chatbot module
â”‚   â”œâ”€â”€ routes.py                # /chatbot/api/ask endpoint
â”‚   â”œâ”€â”€ utils.py                 # RAG processing and model loading
â”‚   â”œâ”€â”€ structured_lookup.py     # Structured bylaw search (15KB)
â”‚   â”œâ”€â”€ prompts/                 # LLM prompt templates
â”‚   â””â”€â”€ data/                    # Training and reference data
â”œâ”€â”€ recommendation/              # Recommendation module
â”‚   â”œâ”€â”€ routes.py                # /recommendation/api/recommend endpoint
â”‚   â”œâ”€â”€ utils.py                 # Recommendation logic (29KB)
â”‚   â”œâ”€â”€ repository.py            # Data access layer
â”‚   â”œâ”€â”€ db.py                    # Database connection
â”‚   â”œâ”€â”€ llm_summary.py           # LLM-powered recommendation summaries
â”‚   â”œâ”€â”€ preprocess_bylaws.py     # University bylaw preprocessing (25KB)
â”‚   â””â”€â”€ data/                    # Course catalog data
â”œâ”€â”€ bylaws_vector_index/         # Pre-built FAISS index for bylaw search
â”œâ”€â”€ eelu.pdf                     # University bylaws document (155KB)
â””â”€â”€ eelulaw.pdf                  # Extended bylaws document (1.5MB)
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

- **Helmet** â€” HTTP security headers including Content Security Policy (CSP)
- **CORS** â€” Configurable allowed origins via environment variables
- **Rate Limiting** (three tiers):
  - General API: Standard rate limit per time window
  - Login endpoints: Stricter limit to prevent brute force attacks
  - Password reset: Most restrictive limit
- **Request ID** â€” Unique ID per request for distributed tracing
- **Trust Proxy** â€” Enabled for Vercel/Supabase gateway compatibility
- **Input Validation** â€” All inputs validated with Zod schemas before processing

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

1. **Robust Backend API** â€” Built with Express.js 5 + TypeScript, featuring 16 controllers, 22 services, 17 route files, 16 validation schemas, and a multi-layered security system with JWT, RBAC, rate limiting, and audit logging.

2. **Modern Frontend Application** â€” Built with Next.js 14 + React 18, offering 20+ pages across three role-based portals (Student, Advisor, Admin) with NextAuth.js authentication, TanStack React Query for data management, and a responsive UI built on TailwindCSS and Radix UI components.

3. **AI-Powered Service** â€” Built with Flask + LangChain, providing a RAG-based chatbot that answers questions from university bylaws using FAISS vector search and Google Gemini LLM, plus an intelligent course recommendation engine.

4. **Comprehensive Database** â€” 18 PostgreSQL tables with 10 enums covering all aspects of the academic system, managed through Prisma ORM with full migration support.

5. **Production-Ready Infrastructure** â€” Docker containerization, Vercel/Render deployment, Supabase database hosting, and comprehensive environment configuration.

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
