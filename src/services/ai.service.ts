import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { callCogniAdvisorAsk } from "./cogniAdvisorAiClient.js";

const isAiEnabled = () =>
  process.env.COGNI_ADVISOR_AI_ENABLED === "1" ||
  process.env.COGNI_ADVISOR_AI_ENABLED === "true";

const localizeBylawsFallback = (raw: string, question?: string): string => {
  const lower = raw.toLowerCase().trim();
  const isEnglishFallback =
    lower.includes("the bylaws context does not specify") ||
    lower === "the context does not specify this." ||
    lower.includes("i don't have enough information in the bylaws");
  if (!isEnglishFallback) return raw;
  const isArabicQuestion = question ? /[\u0600-\u06FF]/.test(question) : false;
  if (isArabicQuestion) {
    return "اللائحة المتاحة لا تحتوي على معلومات كافية عن هذا السؤال.";
  }
  return raw;
};

const sanitizeChatAnswer = (raw: string, question?: string): string => {
  if (!raw?.trim()) {
    return "عذراً، لم أتمكن من إنشاء إجابة. حاول مرة أخرى.";
  }
  if (raw.startsWith("LLM Error") || raw.includes("generativelanguage.googleapis.com")) {
    return "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. تأكد من تشغيل خدمة AI على المنفذ 7860 مع GEMINI_MODEL=gemini-flash-latest.";
  }
  return localizeBylawsFallback(raw, question);
};

export const createChatInteraction = async (studentId: number, message: string) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: {
      enrollments: {
        where: { status: { in: ["PASSED", "FAILED"] } },
        include: { course: true },
      },
    },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const studentContext = {
    level: student.level,
    cumulative_gpa: Number(student.cumulative_gpa),
    earned_hours: student.total_earned_hours,
    major_type: student.major_type,
    completed_courses: student.enrollments
      .filter((e) => e.grade && e.grade !== "F")
      .map((e) => e.course.course_code),
    failed_courses: student.enrollments
      .filter((e) => e.grade === "F")
      .map((e) => e.course.course_code),
  };

  let answer: string | null = null;
  let status: "COMPLETED" | "FAILED" | "PENDING" = "PENDING";

  if (isAiEnabled()) {
    try {
      const result = await callCogniAdvisorAsk(message, studentContext);
      answer = sanitizeChatAnswer(result.answer, message);
      status = answer.includes("غير متاحة") && result.answer.startsWith("LLM Error")
        ? "FAILED"
        : "COMPLETED";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI service unavailable";
      answer = msg.includes("Cannot reach AI service")
        ? "خدمة الذكاء الاصطناعي غير متصلة. تأكد من تشغيل Flask على المنفذ 7860 مع COGNI_ADVISOR_AI_ENABLED=1."
        : msg.includes("timed out")
          ? "استغرق الطلب وقتاً طويلاً. حاول مرة أخرى بعد تحميل النماذج (EELU_PRELOAD=1)."
          : msg;
      status = "FAILED";
    }
  }

  const interaction = await prisma.aIInteraction.create({
    data: {
      student_id: studentId,
      query_type: "CHAT",
      input_data: { message, student_context: studentContext },
      response_data: answer ? { answer } : undefined,
      status,
    },
  });

  return {
    interaction_id: interaction.interaction_id,
    answer: answer ?? "خدمة الذكاء الاصطناعي غير متاحة حالياً. حاول لاحقاً.",
    status: interaction.status,
  };
};

export const createPlanSuggestion = async (
  studentId: number,
  semesterId: number,
  preferences?: any
) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: {
      enrollments: {
        where: { status: "PASSED" },
        include: { course: true }
      }
    }
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const semester = await prisma.semester.findUnique({
    where: { semester_id: semesterId }
  });

  if (!semester) {
    throw new AppError("Semester not found", 404);
  }

  const interaction = await prisma.aIInteraction.create({
    data: {
      student_id: studentId,
      query_type: "SUGGEST_PLAN",
      input_data: {
        semester_id: semesterId,
        preferences: preferences || {},
        student_context: {
          level: student.level,
          cumulative_gpa: student.cumulative_gpa.toString(),
          earned_hours: student.total_earned_hours,
          completed_courses: student.enrollments.map(e => e.course.course_code)
        }
      },
      status: "PENDING"
    }
  });

  return {
    interaction_id: interaction.interaction_id,
    message: "Creating suggested study plan. You will be notified when complete",
    status: interaction.status
  };
};

export const createGpaPrediction = async (
  studentId: number,
  semesterId: number,
  plannedCourses: Array<{ course_id: number; expected_grade: string }>
) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId }
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const courses = await prisma.course.findMany({
    where: {
      course_id: { in: plannedCourses.map(c => c.course_id) }
    }
  });

  if (courses.length !== plannedCourses.length) {
    throw new AppError("Some courses not found", 404);
  }

  const interaction = await prisma.aIInteraction.create({
    data: {
      student_id: studentId,
      query_type: "PREDICT_GPA",
      input_data: {
        semester_id: semesterId,
        planned_courses: plannedCourses,
        current_gpa: student.cumulative_gpa.toString(),
        current_hours: student.total_earned_hours
      },
      status: "PENDING"
    }
  });

  return {
    interaction_id: interaction.interaction_id,
    message: "Calculating prediction. You will be notified of the result",
    status: interaction.status
  };
};

export const getRiskAnalysis = async (studentId: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: {
      semesterRecords: {
        orderBy: { semester_id: "desc" },
        take: 3
      },
      enrollments: {
        where: { status: "FAILED" }
      },
      alerts: {
        where: { is_resolved: false }
      }
    }
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const interaction = await prisma.aIInteraction.create({
    data: {
      student_id: studentId,
      query_type: "RISK_ANALYSIS",
      input_data: {
        cumulative_gpa: student.cumulative_gpa.toString(),
        level: student.level,
        earned_hours: student.total_earned_hours,
        recent_semesters: student.semesterRecords.map(sr => ({
          semester_gpa: sr.semester_gpa?.toString(),
          registered_hours: sr.registered_hours
        })),
        failed_courses_count: student.enrollments.length,
        active_alerts_count: student.alerts.length
      },
      status: "PENDING"
    }
  });

  return {
    interaction_id: interaction.interaction_id,
    message: "Analyzing academic risk",
    status: interaction.status,
    preliminary_data: {
      cumulative_gpa: student.cumulative_gpa,
      active_alerts: student.alerts.length,
      failed_courses: student.enrollments.length
    }
  };
};

export const getStudentHistory = async (studentId: number) => {
  const interactions = await prisma.aIInteraction.findMany({
    where: { student_id: studentId },
    orderBy: { created_at: "desc" },
    take: 50
  });

  return {
    total: interactions.length,
    interactions: interactions.map((i) => {
      const input = i.input_data as { message?: string } | null;
      const response = i.response_data as { answer?: string } | null;
      return {
        interaction_id: i.interaction_id,
        query_type: i.query_type,
        status: i.status,
        created_at: i.created_at,
        has_response: !!i.response_data,
        message: input?.message ?? null,
        answer: response?.answer ?? null,
      };
    }),
  };
};
