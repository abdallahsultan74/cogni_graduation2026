
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
- **Backend API** — Built with Node.js + Express.js + TypeScript
- **Frontend** — Built with Next.js 14 + React 18 + TailwindCSS
- **AI Service** — Built with Python Flask + LangChain + FAISS

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
| PostgreSQL | — | Relational database (via Supabase) |
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
| Radix UI | — | Accessible UI primitives (Checkbox) |
| Lucide React | 0.575.0 | Icon library |
| Sonner | 2.0.7 | Toast notifications |
| Class Variance Authority | 0.7.1 | Component style variants |
| clsx + tailwind-merge | — | CSS class composition utilities |

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
| Google Gemini API | — | Primary Large Language Model |
| OpenRouter API | — | Fallback LLM provider (DeepSeek) |
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
- **Advisor** — Advisor profile (office_hours, bio)
- **Admin** — Admin profile linked to User
- **Enrollment** — Student course enrollments with grades
- **CoursePrerequisite** — Course prerequisite relationships
- **Semester** — Academic semesters with date ranges
- **SemesterRecord** — Student performance per semester (semester GPA, registered hours)
- **PlanDetail** — Courses selected in a study plan (junction table)
- **Feedback** — Advisor feedback to students
- **Notification** — System notifications (title, body, type, action_url)
- **Message** — Direct messages between users
- **AIInteraction** — AI interaction logs (query_type, input/response data, status)
- **Alert** — Academic alerts (LOW_GPA, ACADEMIC_PROBATION, etc.)
- **GraduationRequirement** — Graduation requirements by category
- **GraduationProgress** — Student progress toward graduation requirements
- **CourseReview** — Student course reviews (rating, difficulty, workload)
- **SystemSetting** — Configurable system settings (JSON values)
- **AuditLog** — System audit trail
- **PasswordResetToken** — OTP tokens for password reset

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

