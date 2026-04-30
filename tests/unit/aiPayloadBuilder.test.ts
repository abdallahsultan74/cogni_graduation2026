import { describe, it, expect } from "vitest";

import { buildCogniAdvisorRecommendPayload } from "../../src/services/aiPayloadBuilder.js";

describe("aiPayloadBuilder", () => {
  it("formats StudentId and maps semester_name + major_type", async () => {
    const payload = await buildCogniAdvisorRecommendPayload({
      studentId: 2201234567,
      gpa: 3.2,
      majorType: "CS",
      semesterName: "Fall 2025",
      expectedToGraduate: false,
      completedEnrollments: [
        {
          // Prisma shape is not enforced at runtime here; we only need `course.course_code`
          grade: "A",
          status: "PASSED",
          student_id: 2201234567,
          course_id: 1,
          semester_id: null,
          enrollment_id: 1,
          course: {
            course_code: "AI311",
            course_name: "Artificial intelligence",
            credits: 3
          }
        } as any
      ]
    });

    expect(payload.StudentId).toBe("2201234567");
    // "CS" is mapped to IT track for this program
    expect(payload.DepartmentName).toBe("IT");
    expect(payload.Term).toBe("First");
    expect(payload.semester).toBe("regular");

    expect(payload.CompletedCourses.length).toBeGreaterThan(0);
    const c0 = payload.CompletedCourses[0];
    expect(c0.code).toBe("AI311");
    expect(c0.distribution_category).toBe("Basic_Computer_Science");
    expect(c0.type).toBe("Mandatory");
    expect(c0.department).toBe("null");
    expect(c0.prerequisites).toContain("CS216");
    expect(c0.Term).toContain("First");
  });

  it("maps major_type AI -> DepartmentName AI", async () => {
    const payload = await buildCogniAdvisorRecommendPayload({
      studentId: 2201234567,
      gpa: 2.9,
      majorType: "AI",
      semesterName: "Summer 2026",
      expectedToGraduate: false,
      completedEnrollments: [
        {
          grade: "A",
          status: "PASSED",
          student_id: 2201234567,
          course_id: 1,
          semester_id: null,
          enrollment_id: 1,
          course: {
            course_code: "AI321",
            course_name: "Machine Learning Fundamentals",
            credits: 3
          }
        } as any
      ]
    });

    expect(payload.DepartmentName).toBe("AI");
    expect(payload.Term).toBe("Summer");
    expect(payload.semester).toBe("summer");
    expect(payload.CompletedCourses[0].code).toBe("AI321");
    expect(payload.CompletedCourses[0].department).toBe("AI");
  });
});

