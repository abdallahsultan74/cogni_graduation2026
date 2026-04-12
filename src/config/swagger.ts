export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Cogni-Advisor API",
    version: "1.0.0",
    description: "Backend API for Cogni-Advisor - Academic advising system"
  },
  servers: [{ url: "/", description: "API Server" }],
  paths: {
    "/health": {
      get: {
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
        summary: "Register student",
        description: "Public signup — creates a user with role STUDENT and a Student profile. No authentication required.",
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
          "201": { description: "User created (password_hash omitted)" },
          "400": { description: "Validation error or national ID already exists" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Login",
        description: "Authenticate with national_id and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifier", "password"],
                properties: {
                  identifier: { type: "string", description: "National ID" },
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
    "/api/auth/change-password": {
      patch: {
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
        summary: "List users",
        description: "Get all users (ADMIN only)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of users" } }
      },
      post: {
        summary: "Create user",
        description: "Create a new user (ADMIN only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "national_id", "personal_email", "password", "role"],
                properties: {
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                  national_id: { type: "string" },
                  personal_email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string", enum: ["ADMIN", "STUDENT", "ADVISOR"] }
                }
              }
            }
          }
        },
        responses: { "201": { description: "User created" } }
      }
    },
    "/api/courses": {
      get: {
        summary: "List courses",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of courses" } }
      }
    },
    "/api/departments": {
      get: {
        summary: "List departments",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of departments" } }
      }
    },
    "/api/semesters": {
      get: {
        summary: "List semesters",
        description: "Get all semesters (authenticated)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of semesters" } }
      },
      post: {
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
        summary: "Get semester by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Semester details" }, "404": { description: "Not found" } }
      },
      put: {
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
        summary: "Delete semester",
        description: "Delete a semester (ADMIN only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Semester deleted" }, "404": { description: "Not found" } }
      }
    },
    "/api/semester-records": {
      post: {
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
        summary: "Get semester records by student",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "List of semester records" } }
      }
    },
    "/api/semester-records/semester/{semesterId}": {
      get: {
        summary: "Get semester records by semester",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "semesterId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "List of semester records" } }
      }
    },
    "/api/semester-records/{id}": {
      patch: {
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
        summary: "Get my feedback (ADVISOR)",
        description: "List feedback written by the current advisor",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of feedback" } }
      }
    },
    "/api/feedback/student/{studentId}": {
      get: {
        summary: "Get feedback by student",
        description: "ADVISOR or the student themselves",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "List of feedback" } }
      }
    },
    "/api/notifications": {
      get: {
        summary: "Get my notifications",
        description: "List notifications for the current user",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "List of notifications" } }
      },
      post: {
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
        summary: "Mark all as read",
        description: "Mark all notifications of the current user as read",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "All marked as read" } }
      }
    },
    "/api/notifications/{id}/read": {
      patch: {
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
