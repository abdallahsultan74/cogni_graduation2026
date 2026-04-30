export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Cogni-Advisor API",
    version: "1.0.0",
    description: "Backend API for Cogni-Advisor - Academic advising system"
  },
  servers: [
    {
      url: "https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1",
      description: "Production (Supabase Edge Functions)"
    },
    {
      url: "https://cogni-advisor-backend.vercel.app",
      description: "Fallback upstream (Vercel)"
    }
  ],
  tags: [
    { name: "Public", description: "Public endpoints that do not require authentication." },
    { name: "Student Auth", description: "Student login and password recovery endpoints." },
    { name: "Advisor Auth", description: "Advisor login and authentication endpoints." },
    { name: "Admin Auth", description: "Admin login and authentication endpoints." },
    { name: "Shared Auth", description: "Common authenticated endpoints for all roles." },
    { name: "Admin - User Management", description: "ADMIN-only user creation and management endpoints." },
    { name: "Students", description: "Student profile and academic endpoints." },
    { name: "Advisor", description: "Advisor profile, students, and messaging endpoints." },
    { name: "Admin", description: "Admin dashboard and system management endpoints." },
    { name: "Study Plan", description: "Study plan creation and review endpoints." },
    { name: "Enrollments", description: "Enrollment and grading endpoints." },
    { name: "Progress", description: "Progress tracking endpoints." },
    { name: "AI", description: "AI recommendation and assistant endpoints." },
    { name: "Courses", description: "Course and prerequisite management endpoints." }
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Public"],
        summary: "Health check",
        description: "Returns server and database status",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "OK" },
                    database: { type: "string", example: "connected" }
                  }
                }
              }
            }
          },
          "503": { description: "Service unavailable" }
        }
      }
    },
    "/api/auth/register": {
      post: {
        tags: ["Public"],
        summary: "Public registration (disabled)",
        description: "Public self-registration is disabled. Accounts are created by ADMIN users from /api/users.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "national_id", "personal_email", "password"],
                properties: {
                  first_name: { type: "string", minLength: 2 },
                  middle_name: { type: "string" },
                  last_name: { type: "string", minLength: 2 },
                  national_id: { type: "string", minLength: 14 },
                  personal_email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  gender: { type: "string" },
                  street_address: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "403": { description: "Public registration is disabled" }
        }
      }
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Student Auth"],
        summary: "Forgot password (student only)",
        description: "Reset password for student account by matching national_id and personal_email.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["national_id", "personal_email", "newPassword"],
                properties: {
                  national_id: { type: "string", minLength: 14 },
                  personal_email: { type: "string", format: "email" },
                  newPassword: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Password reset successfully" },
          "400": { description: "National ID and email do not match" },
          "404": { description: "Student account not found" }
        }
      }
    },
    "/api/auth/forgot-password/otp/request": {
      post: {
        tags: ["Student Auth"],
        summary: "Request forgot-password OTP",
        description: "Sends Email OTP through Supabase Auth to the user's email.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "OTP sent to email" },
          "404": { description: "Account not found" }
        }
      }
    },
    "/api/auth/forgot-password/otp/verify": {
      post: {
        tags: ["Student Auth"],
        summary: "Verify OTP and reset password",
        description: "Verifies email OTP and updates local account password.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "newPassword"],
                properties: {
                  email: { type: "string", format: "email" },
                  otp: { type: "string" },
                  newPassword: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Password reset successfully" },
          "400": { description: "Invalid or expired OTP" },
          "404": { description: "Account not found" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Shared Auth"],
        summary: "Login",
        description: "General login by email/password. Frontend should use role-based endpoints: /api/auth/login/student|advisor|admin",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        first_name: { type: "string" },
                        last_name: { type: "string" },
                        role: { type: "string", enum: ["ADMIN", "STUDENT", "ADVISOR"] }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Invalid credentials" }
        }
      }
    },
    "/api/auth/login/student": {
      post: {
        tags: ["Student Auth"],
        summary: "Student login",
        description: "Authenticate as STUDENT using email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Invalid credentials" }
        }
      }
    },
    "/api/auth/login/advisor": {
      post: {
        tags: ["Advisor Auth"],
        summary: "Advisor login",
        description: "Authenticate as ADVISOR using email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Invalid credentials" }
        }
      }
    },
    "/api/auth/login/admin": {
      post: {
        tags: ["Admin Auth"],
        summary: "Admin login",
        description: "Authenticate as ADMIN using email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Invalid credentials" }
        }
      }
    },
    "/api/auth/change-password": {
      patch: {
        tags: ["Shared Auth"],
        summary: "Change password",
        description: "Change password (requires authentication)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Password changed" }, "401": { description: "Unauthorized" } }
      }
    },
    "/api/users": {
      get: {
        tags: ["Admin - User Management"],
        summary: "List users",
        description: "Get all users (ADMIN only)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of users" } }
      },
      post: {
        tags: ["Admin - User Management"],
        summary: "Create user",
        description: "Create a new user (ADMIN only). personal_email is auto-generated by backend and returned in response.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "national_id", "password", "role"],
                properties: {
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                  national_id: { type: "string" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string", enum: ["ADMIN", "STUDENT", "ADVISOR"] }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "User created (response includes auto-generated personal_email)"
          }
        }
      }
    },
    "/api/users/students": {
      post: {
        tags: ["Admin - User Management"],
        summary: "Create student (ADMIN)",
        description: "Create a STUDENT account by admin without passing role explicitly. personal_email is auto-generated by backend.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "national_id", "password"],
                properties: {
                  first_name: { type: "string" },
                  middle_name: { type: "string" },
                  last_name: { type: "string" },
                  national_id: { type: "string" },
                  password: { type: "string", minLength: 6 },
                  gender: { type: "string" },
                  street_address: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Student created (response includes auto-generated personal_email)"
          }
        }
      }
    },
    "/api/users/advisors": {
      post: {
        tags: ["Admin - User Management"],
        summary: "Create advisor (ADMIN)",
        description: "Create an ADVISOR account by admin without passing role explicitly. personal_email is auto-generated by backend.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "national_id", "password"],
                properties: {
                  first_name: { type: "string" },
                  middle_name: { type: "string" },
                  last_name: { type: "string" },
                  national_id: { type: "string" },
                  password: { type: "string", minLength: 6 },
                  gender: { type: "string" },
                  street_address: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Advisor created (response includes auto-generated personal_email)"
          }
        }
      }
    },
    "/api/users/admins": {
      post: {
        tags: ["Admin - User Management"],
        summary: "Create admin (ADMIN)",
        description: "Create another ADMIN account with full admin role. personal_email is auto-generated by backend.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "national_id", "password"],
                properties: {
                  first_name: { type: "string" },
                  middle_name: { type: "string" },
                  last_name: { type: "string" },
                  national_id: { type: "string" },
                  password: { type: "string", minLength: 6 },
                  gender: { type: "string" },
                  street_address: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Admin created (response includes auto-generated personal_email)"
          }
        }
      }
    },
    "/api/courses": {
      get: {
        tags: ["Courses"],
        summary: "List courses",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of courses" } }
      }
    },
    "/api/departments": {
      get: {
        tags: ["Courses"],
        summary: "List departments",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of departments" } }
      }
    },
    "/api/semesters": {
      get: {
        tags: ["Admin"],
        summary: "List semesters",
        description: "Get all semesters (authenticated)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of semesters" } }
      },
      post: {
        tags: ["Admin"],
        summary: "Create semester",
        description: "Create a semester (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  semester_name: { type: "string" },
                  start_date: { type: "string", format: "date-time" },
                  end_date: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Semester created" } }
      }
    },
    "/api/semesters/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get semester by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Semester details" }, "404": { description: "Not found" } }
      },
      put: {
        tags: ["Admin"],
        summary: "Update semester",
        description: "Update a semester (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  semester_name: { type: "string" },
                  start_date: { type: "string", format: "date-time" },
                  end_date: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Semester updated" }, "404": { description: "Not found" } }
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete semester",
        description: "Delete a semester (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Semester deleted" }, "404": { description: "Not found" } }
      }
    },
    "/api/semester-records": {
      post: {
        tags: ["Admin"],
        summary: "Create semester record",
        description: "Create a semester record for a student (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["student_id", "semester_id"],
                properties: {
                  student_id: { type: "integer" },
                  semester_id: { type: "integer" },
                  semester_gpa: { type: "number" },
                  registered_hours: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Semester record created" } }
      }
    },
    "/api/semester-records/student/{studentId}": {
      get: {
        tags: ["Admin", "Students"],
        summary: "Get semester records by student",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "List of semester records" } }
      }
    },
    "/api/semester-records/semester/{semesterId}": {
      get: {
        tags: ["Admin"],
        summary: "Get semester records by semester",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "semesterId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "List of semester records" } }
      }
    },
    "/api/semester-records/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update semester record",
        description: "Update GPA or hours (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  semester_gpa: { type: "number" },
                  registered_hours: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Semester record updated" }, "404": { description: "Not found" } }
      }
    },
    "/api/feedback": {
      post: {
        tags: ["Advisor"],
        summary: "Create feedback",
        description: "Create feedback for a student (ADVISOR only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["student_id"],
                properties: {
                  student_id: { type: "integer" },
                  message: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Feedback created" } }
      }
    },
    "/api/feedback/my": {
      get: {
        tags: ["Advisor"],
        summary: "Get my feedback (ADVISOR)",
        description: "List feedback written by the current advisor",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of feedback" } }
      }
    },
    "/api/feedback/student/{studentId}": {
      get: {
        tags: ["Advisor", "Students"],
        summary: "Get feedback by student",
        description: "ADVISOR or the student themselves",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "List of feedback" } }
      }
    },
    "/api/notifications": {
      get: {
        tags: ["Shared Auth"],
        summary: "Get my notifications",
        description: "List notifications for the current user",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of notifications" } }
      },
      post: {
        tags: ["Admin"],
        summary: "Create notification",
        description: "Send a notification to a user (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["recipient_id"],
                properties: {
                  recipient_id: { type: "integer" },
                  title: { type: "string" },
                  body: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Notification created" } }
      }
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Shared Auth"],
        summary: "Mark all as read",
        description: "Mark all notifications of the current user as read",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "All marked as read" } }
      }
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Shared Auth"],
        summary: "Mark notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Notification updated" }, "404": { description: "Not found" } }
      }
    },
    "/api/students/me/summary": {
      get: {
        summary: "Get my academic summary",
        description: "Returns GPA, earned hours, completed courses, current enrollments and level for the authenticated student",
        tags: ["Students"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Academic summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cumulative_gpa: { type: "number", example: 3.85 },
                    total_earned_hours: { type: "integer", example: 72 },
                    remaining_hours: { type: "integer", example: 60 },
                    current_level: { type: "integer", example: 3 },
                    passed_courses: { type: "integer", example: 24 },
                    current_enrollments: { type: "integer", example: 5 }
                  }
                }
              }
            }
          },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/students/{id}": {
      get: {
        summary: "Get student by ID",
        description: "Retrieve a student record (ADMIN only)",
        tags: ["Students"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Student data" }, "404": { description: "Not found" } }
      },
      put: {
        summary: "Update student",
        description: "Update a student record (ADMIN only)",
        tags: ["Students"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  major_type: { type: "string" },
                  dept_id: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Student updated" }, "404": { description: "Not found" } }
      }
    },
    "/api/students/{id}/deactivate": {
      patch: {
        summary: "Deactivate student",
        description: "Deactivate a student account (ADMIN only)",
        tags: ["Students"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Student deactivated" }, "404": { description: "Not found" } }
      }
    },
    "/api/enrollments": {
      post: {
        summary: "Enroll in a course",
        description: "Student self-enrollment with prerequisite check",
        tags: ["Enrollments"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["course_id"],
                properties: { course_id: { type: "integer" } }
              }
            }
          }
        },
        responses: {
          "201": { description: "Enrolled successfully" },
          "400": { description: "Prerequisites not met or already enrolled" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/enrollments/mark-passed": {
      patch: {
        summary: "Mark course as passed",
        description: "Mark a student's course as passed and update GPA (ADMIN only)",
        tags: ["Enrollments"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["student_id", "course_id", "grade"],
                properties: {
                  student_id: { type: "integer" },
                  course_id: { type: "integer" },
                  grade: { type: "string", enum: ["A", "B", "C", "D", "F"] }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Grade recorded and GPA updated" }, "404": { description: "Enrollment not found" } }
      }
    },
    "/api/progress/{studentId}": {
      get: {
        summary: "Get student progress",
        description: "Returns progress percentage, earned/remaining credits and GPA for a student",
        tags: ["Progress"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "Progress data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    level: { type: "integer" },
                    cumulative_gpa: { type: "number" },
                    completedCredits: { type: "integer" },
                    remainingCredits: { type: "integer" },
                    progressPercentage: { type: "number", example: 54.5 }
                  }
                }
              }
            }
          },
          "404": { description: "Student not found" }
        }
      }
    },
    "/api/study-plan": {
      post: {
        summary: "Create study plan",
        description: "Create a new study plan for the authenticated student for a given semester",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["semester_id"],
                properties: { semester_id: { type: "integer" } }
              }
            }
          }
        },
        responses: {
          "201": { description: "Study plan created" },
          "400": { description: "Plan already exists for this semester" }
        }
      }
    },
    "/api/study-plan/me/current": {
      get: {
        summary: "Get current study plan",
        description: "Returns the student's study plan for the latest (or specified) semester with course details",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "semesterId", in: "query", required: false, schema: { type: "integer" }, description: "Specific semester ID (defaults to latest)" }
        ],
        responses: {
          "200": {
            description: "Current study plan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    semesterLabel: { type: "string", example: "Fall 2025 Semester" },
                    planStatus: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
                    totalCourses: { type: "integer" },
                    totalCredits: { type: "integer" },
                    courses: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          code: { type: "string" },
                          name: { type: "string" },
                          instructor: { type: "string", nullable: true },
                          credits: { type: "integer" },
                          grade: { type: "string", nullable: true },
                          status: { type: "string", enum: ["Planned", "In Progress", "Completed"] }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "404": { description: "No study plan found" }
        }
      }
    },
    "/api/study-plan/generate": {
      get: {
        summary: "Generate recommended study plan",
        description: "Auto-generates a recommended list of courses based on completed prerequisites (STUDENT only)",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Generated plan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        totalCredits: { type: "integer" },
                        courses: { type: "array", items: { type: "object" } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/study-plan/advisor/pending": {
      get: {
        summary: "Get pending plans for advisor",
        description: "Lists all study plans with PENDING status (ADVISOR only)",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of pending study plans" } }
      }
    },
    "/api/study-plan/{id}/add-course": {
      post: {
        summary: "Add course to plan",
        description: "Add a course to an existing PENDING study plan (STUDENT only)",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Plan ID" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["course_id"],
                properties: { course_id: { type: "integer" } }
              }
            }
          }
        },
        responses: { "200": { description: "Course added" }, "403": { description: "Forbidden" }, "404": { description: "Plan not found" } }
      }
    },
    "/api/study-plan/{id}/submit": {
      patch: {
        summary: "Submit study plan",
        description: "Submit the study plan for advisor review (STUDENT only)",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Plan ID" }],
        responses: { "200": { description: "Plan submitted" }, "400": { description: "Already submitted" } }
      }
    },
    "/api/study-plan/{id}/review": {
      patch: {
        summary: "Review study plan",
        description: "Approve or reject a study plan (ADVISOR only)",
        tags: ["Study Plan"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Plan ID" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["APPROVED", "REJECTED"] },
                  feedback: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Plan reviewed" }, "400": { description: "Already reviewed" } }
      }
    }
    ,
    "/api/admin/overview": {
      get: {
        summary: "Admin system overview",
        description: "Returns admin dashboard overview (ADMIN only)",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Overview data" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" }
        }
      }
    },
    "/api/admin/system-settings": {
      get: {
        summary: "Get system settings",
        description: "Returns persisted system settings + performance snapshot (ADMIN only)",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "System settings with metrics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    general: {
                      type: "object",
                      properties: {
                        systemName: { type: "string", example: "CogniAdvisor" },
                        academicYear: { type: "string", example: "2025/2026" },
                        defaultCreditLimit: { type: "integer", example: 21 },
                        semesterDurationWeeks: { type: "integer", example: 16 }
                      }
                    },
                    aiEngine: {
                      type: "object",
                      properties: {
                        recommendationSensitivity: { type: "number", example: 0.7 },
                        riskDetectionLevel: { type: "string", enum: ["Low", "Medium", "High"], example: "Medium" },
                        gpaWarningThreshold: { type: "number", example: 2.5 },
                        aiModelStatus: { type: "string", enum: ["active", "inactive"], example: "active" },
                        metrics: {
                          type: "object",
                          properties: {
                            totalCourses: { type: "integer", example: 347 },
                            recommendationsGenerated: { type: "integer", example: 1284 },
                            successRate: { type: "number", example: 94.7 }
                          }
                        }
                      }
                    },
                    permissions: {
                      type: "object",
                      properties: {
                        STUDENT: {
                          type: "object",
                          properties: {
                            viewPlans: { type: "boolean" },
                            editPlans: { type: "boolean" },
                            approvePlans: { type: "boolean" },
                            sendAlerts: { type: "boolean" },
                            manageCourses: { type: "boolean" },
                            systemAccess: { type: "boolean" }
                          }
                        },
                        ADVISOR: {
                          type: "object",
                          properties: {
                            viewPlans: { type: "boolean" },
                            editPlans: { type: "boolean" },
                            approvePlans: { type: "boolean" },
                            sendAlerts: { type: "boolean" },
                            manageCourses: { type: "boolean" },
                            systemAccess: { type: "boolean" }
                          }
                        },
                        ADMIN: {
                          type: "object",
                          properties: {
                            viewPlans: { type: "boolean" },
                            editPlans: { type: "boolean" },
                            approvePlans: { type: "boolean" },
                            sendAlerts: { type: "boolean" },
                            manageCourses: { type: "boolean" },
                            systemAccess: { type: "boolean" }
                          }
                        }
                      }
                    },
                    security: {
                      type: "object",
                      properties: {
                        enableTwoFactorAuthGlobally: { type: "boolean", example: false },
                        suspiciousActivityDetection: { type: "boolean", example: true },
                        passwordPolicyMinLength: { type: "integer", example: 8 },
                        sessionTimeoutMinutes: { type: "integer", example: 30 }
                      }
                    },
                    performance: {
                      type: "object",
                      properties: {
                        serverLoad: { type: "number", example: 42 },
                        cpuUsage: { type: "integer", example: 284 },
                        databaseHealth: { type: "integer", example: 98 },
                        responseTimeMs: { type: "integer", example: 145 }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" }
        }
      },
      patch: {
        summary: "Update system settings",
        description: "Patch system settings (ADMIN only)",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  general: { type: "object" },
                  aiEngine: { type: "object" },
                  permissions: { type: "object" },
                  security: { type: "object" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Settings updated" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" }
        }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Shared Auth"],
        summary: "Get current user profile",
        description: "Returns the authenticated user basic profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current user profile" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/api/users/{id}": {
      get: {
        tags: ["Admin - User Management"],
        summary: "Get user by ID",
        description: "Retrieve a user by ID (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "User data" }, "404": { description: "Not found" } }
      },
      patch: {
        tags: ["Admin - User Management"],
        summary: "Update user",
        description: "Update user details (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  first_name: { type: "string" },
                  middle_name: { type: "string" },
                  last_name: { type: "string" },
                  personal_email: { type: "string", format: "email" },
                  role: { type: "string", enum: ["ADMIN", "STUDENT", "ADVISOR"] }
                }
              }
            }
          }
        },
        responses: { "200": { description: "User updated" }, "404": { description: "Not found" } }
      },
      delete: {
        tags: ["Admin - User Management"],
        summary: "Delete user",
        description: "Delete a user by ID (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "User deleted" }, "404": { description: "Not found" } }
      }
    },
    "/api/students/me": {
      get: {
        tags: ["Students"],
        summary: "Get my student profile",
        description: "Returns profile details for the authenticated student",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Student profile" }, "401": { description: "Unauthorized" } }
      },
      patch: {
        tags: ["Students"],
        summary: "Update my student profile",
        description: "Update profile fields for authenticated student",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  first_name: { type: "string" },
                  middle_name: { type: "string" },
                  last_name: { type: "string" },
                  personal_email: { type: "string", format: "email" },
                  street_address: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Profile updated" }, "400": { description: "Validation error" } }
      }
    },
    "/api/students/{id}/activate": {
      patch: {
        summary: "Activate student",
        description: "Activate a student account (ADMIN only)",
        tags: ["Students"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Student activated" }, "404": { description: "Not found" } }
      }
    },
    "/api/students/me/messages": {
      get: {
        tags: ["Students"],
        summary: "Get my messages with advisor",
        description: "Returns conversation between current student and advisor",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Messages list" } }
      },
      post: {
        tags: ["Students"],
        summary: "Send message to advisor",
        description: "Send a new message from student to advisor",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: {
                  body: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Message sent" }, "400": { description: "Validation error" } }
      }
    },
    "/api/advisor/me": {
      get: {
        tags: ["Advisor"],
        summary: "Get advisor profile",
        description: "Returns current advisor profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Advisor profile" } }
      },
      patch: {
        tags: ["Advisor"],
        summary: "Update advisor profile",
        description: "Update current advisor profile fields",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  office_hours: { type: "string" },
                  bio: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Advisor profile updated" } }
      }
    },
    "/api/advisor/dashboard": {
      get: {
        tags: ["Advisor"],
        summary: "Advisor dashboard",
        description: "Returns advisor dashboard metrics",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Dashboard data" } }
      }
    },
    "/api/advisor/students": {
      get: {
        tags: ["Advisor"],
        summary: "Get advisor students",
        description: "List students assigned to current advisor",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", required: false, schema: { type: "string" } },
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1 } }
        ],
        responses: { "200": { description: "Assigned students list" } }
      }
    },
    "/api/advisor/students/{studentId}": {
      get: {
        tags: ["Advisor"],
        summary: "Get advisor student by ID",
        description: "Retrieve details for one assigned student",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Student details" }, "404": { description: "Not found" } }
      }
    },
    "/api/advisor/messages/conversations": {
      get: {
        tags: ["Advisor"],
        summary: "Get advisor conversations",
        description: "List advisor conversation threads with students",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Conversations list" } }
      }
    },
    "/api/advisor/messages/conversations/{studentId}/messages": {
      get: {
        tags: ["Advisor"],
        summary: "Get messages with a student",
        description: "Returns messages between advisor and selected student",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Messages list" } }
      },
      post: {
        tags: ["Advisor"],
        summary: "Send message to student",
        description: "Send a new message from advisor to student",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: {
                  body: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Message sent" }, "400": { description: "Validation error" } }
      }
    },
    "/api/recommendations": {
      get: {
        tags: ["Students"],
        summary: "Get student recommendations",
        description: "Returns course recommendations for authenticated student",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "semesterId", in: "query", required: false, schema: { type: "integer" } },
          { name: "maxCourses", in: "query", required: false, schema: { type: "integer" } }
        ],
        responses: { "200": { description: "Recommendations list" } }
      }
    },
    "/api/ai/chat": {
      post: {
        tags: ["AI", "Students"],
        summary: "AI chat",
        description: "Send a student question to AI advisor",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "AI response" } }
      }
    },
    "/api/ai/suggest-plan": {
      post: {
        tags: ["AI", "Students"],
        summary: "AI suggest study plan",
        description: "Generate AI-based course plan suggestions for student",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  semesterId: { type: "integer" },
                  maxCredits: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Suggested plan" } }
      }
    },
    "/api/ai/predict-gpa": {
      post: {
        tags: ["AI", "Students"],
        summary: "AI predict GPA",
        description: "Predict student GPA using selected planned courses",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  courseIds: { type: "array", items: { type: "integer" } }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Predicted GPA result" } }
      }
    },
    "/api/ai/risk-analysis/{studentId}": {
      get: {
        tags: ["AI", "Advisor", "Admin"],
        summary: "AI risk analysis",
        description: "Get academic risk analysis for a student (ADMIN/ADVISOR)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Risk analysis result" }, "404": { description: "Student not found" } }
      }
    },
    "/api/ai/history": {
      get: {
        tags: ["AI", "Students"],
        summary: "Get AI interaction history",
        description: "Returns AI interactions history for authenticated student",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Interaction history list" } }
      }
    },
    "/api/courses/{id}": {
      get: {
        summary: "Get course by ID",
        description: "Returns one course",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Course details" }, "404": { description: "Not found" } }
      },
      put: {
        summary: "Update course",
        description: "Update a course (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object" }
            }
          }
        },
        responses: { "200": { description: "Course updated" }, "404": { description: "Not found" } }
      },
      delete: {
        summary: "Delete course",
        description: "Delete a course (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Course deleted" }, "404": { description: "Not found" } }
      }
    },
    "/api/courses/{id}/toggle": {
      patch: {
        summary: "Toggle course availability",
        description: "Enable or disable a course (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Availability toggled" }, "404": { description: "Not found" } }
      }
    },
    "/api/courses/{id}/details": {
      get: {
        summary: "Get course details",
        description: "Returns course details including prerequisites",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Course details with prerequisites" }, "404": { description: "Not found" } }
      }
    },
    "/api/courses/add-prerequisite": {
      post: {
        summary: "Add prerequisite",
        description: "Add prerequisite mapping between courses (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["course_id", "prereq_course_id"],
                properties: {
                  course_id: { type: "integer" },
                  prereq_course_id: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Prerequisite added" } }
      }
    },
    "/api/courses/remove-prerequisite": {
      delete: {
        summary: "Remove prerequisite",
        description: "Remove prerequisite mapping between courses (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["course_id", "prereq_course_id"],
                properties: {
                  course_id: { type: "integer" },
                  prereq_course_id: { type: "integer" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Prerequisite removed" } }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
};
