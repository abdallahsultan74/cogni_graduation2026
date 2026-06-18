import  prisma  from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notification.service.js";
import { validateCourseSelection } from "./courseEligibility.service.js";
import { resolvePlanningSemesterId } from "../utils/planningSemester.js";

export const createStudyPlan = async (studentId: number, semesterId: number) => {

  // TODO: Check here
  const existingPlan = await prisma.studyPlan.findUnique({
    where: {
      student_id_semester_id: {
        student_id: studentId,
        semester_id: semesterId
      }
    }
  });

  if (existingPlan) {
    throw new AppError("You already created a plan for this semester", 400);
  }

  const plan = await prisma.studyPlan.create({
    data: {
      student_id: studentId,
      semester_id: semesterId
    }
  });

  return plan;
};


export const addCourseToPlan = async (
  planId: number,
  courseId: number,
  studentId: number
) => {

  const plan = await prisma.studyPlan.findUnique({
    where: { plan_id: planId },
    include: { details: true }
  });

  if (!plan) throw new AppError("Plan not found", 404);

  if (plan.student_id !== studentId)
    throw new AppError("Not allowed", 403);

  if (plan.plan_status !== "PENDING")
    throw new AppError("Plan is locked", 400);

  if (plan.submitted_at)
    throw new AppError("اسحب الطلب للتعديل أولاً", 400);

  const course = await prisma.course.findUnique({
    where: { course_id: courseId },
    select: { course_id: true },
  });
  if (!course) throw new AppError("Course not found", 404);

  const existingIds = plan.details.map((d) => d.course_id);
  if (existingIds.includes(courseId)) {
    throw new AppError("المقرر موجود بالفعل في الخطة", 400);
  }

  const { totalCredits } = await validateCourseSelection(studentId, [
    ...existingIds,
    courseId,
  ]);

  await prisma.planDetail.create({
    data: {
      plan_id: planId,
      course_id: courseId,
    },
  });

  await prisma.studyPlan.update({
    where: { plan_id: planId },
    data: { total_hours: totalCredits },
  });

  return { message: "Course added successfully", totalCredits };
};

export const removeCourseFromPlan = async (
  planId: number,
  courseId: number,
  studentId: number
) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { plan_id: planId },
  });

  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.student_id !== studentId) throw new AppError("Not allowed", 403);
  if (plan.plan_status !== "PENDING") throw new AppError("Plan is locked", 400);
  if (plan.submitted_at) throw new AppError("اسحب الطلب للتعديل أولاً", 400);

  await prisma.planDetail.delete({
    where: {
      plan_id_course_id: { plan_id: planId, course_id: courseId },
    },
  });

  const remaining = await prisma.planDetail.findMany({
    where: { plan_id: planId },
    include: { course: true },
  });
  const totalCredits = remaining.reduce((s, d) => s + d.course.credits, 0);
  await prisma.studyPlan.update({
    where: { plan_id: planId },
    data: { total_hours: totalCredits },
  });

  return { message: "تم حذف المقرر من الخطة", totalCredits };
};

export const updatePlanCourses = async (
  planId: number,
  courseIds: number[],
  actorId: number,
  actorRole: "STUDENT" | "ADVISOR"
) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { plan_id: planId },
    include: { student: { select: { advisor_id: true, student_id: true } } },
  });

  if (!plan) throw new AppError("Plan not found", 404);

  if (actorRole === "STUDENT") {
    if (plan.student_id !== actorId) throw new AppError("Not allowed", 403);
    if (plan.plan_status !== "PENDING") throw new AppError("Plan is locked", 400);
    if (plan.submitted_at) throw new AppError("اسحب الطلب للتعديل أولاً", 400);
  } else {
    if (plan.student.advisor_id !== actorId) throw new AppError("Not allowed", 403);
    if (plan.plan_status !== "PENDING" || !plan.submitted_at) {
      throw new AppError("لا يمكن تعديل هذه الخطة", 400);
    }
  }

  const { totalCredits, courseCount } = await validateCourseSelection(
    plan.student_id,
    courseIds,
    planId
  );

  await prisma.planDetail.deleteMany({ where: { plan_id: planId } });
  if (courseIds.length > 0) {
    await prisma.planDetail.createMany({
      data: courseIds.map((course_id) => ({ plan_id: planId, course_id })),
    });
  }

  await prisma.studyPlan.update({
    where: { plan_id: planId },
    data: { total_hours: totalCredits },
  });

  return { message: "تم تحديث الخطة", totalCredits, courseCount };
};

export const withdrawSubmittedPlan = async (planId: number, studentId: number) => {
  const plan = await prisma.studyPlan.findUnique({ where: { plan_id: planId } });
  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.student_id !== studentId) throw new AppError("Not allowed", 403);
  if (plan.plan_status !== "PENDING" || !plan.submitted_at) {
    throw new AppError("لا يوجد طلب قيد المراجعة", 400);
  }

  return prisma.studyPlan.update({
    where: { plan_id: planId },
    data: { submitted_at: null },
  });
};

export const deleteStudyPlan = async (planId: number, studentId: number) => {
  const plan = await prisma.studyPlan.findUnique({ where: { plan_id: planId } });
  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.student_id !== studentId) throw new AppError("Not allowed", 403);
  if (plan.plan_status !== "PENDING") {
    throw new AppError("لا يمكن حذف خطة معتمدة", 400);
  }

  await prisma.planDetail.deleteMany({ where: { plan_id: planId } });
  await prisma.studyPlan.delete({ where: { plan_id: planId } });
  return { message: "تم حذف الخطة" };
};

export const submitPlan = async (planId: number, studentId: number) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { plan_id: planId },
    include: {
      details: { include: { course: true } },
    },
  });

  if (!plan) throw new AppError("Plan not found", 404);

  if (plan.student_id !== studentId)
    throw new AppError("Not allowed", 403);

  if (plan.plan_status !== "PENDING")
    throw new AppError("Plan already submitted", 400);

  if (plan.submitted_at)
    throw new AppError("Plan already submitted", 400);

  if (plan.details.length === 0) {
    throw new AppError("Add at least one course before submitting", 400);
  }

  const totalCredits = plan.details.reduce((sum, d) => sum + d.course.credits, 0);
  const minCredits = 9;
  if (totalCredits < minCredits) {
    throw new AppError(
      `Minimum registration is ${minCredits} credits (your plan has ${totalCredits})`,
      400
    );
  }

  const updated = await prisma.studyPlan.update({
    where: { plan_id: planId },
    data: {
      submitted_at: new Date(),
      total_hours: totalCredits,
    },
    include: {
      student: { select: { advisor_id: true, user: { select: { first_name: true, last_name: true } } } },
      semester: { select: { semester_name: true } },
    },
  });

  if (updated.student.advisor_id) {
    await createNotification({
      recipient_id: updated.student.advisor_id,
      title: "خطة دراسية جديدة للمراجعة",
      body: `${updated.student.user.first_name} ${updated.student.user.last_name} أرسل خطة ${updated.semester.semester_name} للمراجعة.`,
      type: "STUDY_PLAN",
      action_url: "/advisor/study-plans",
      entity_id: planId,
    });
  }

  return updated;
};


export const reviewPlan = async (
  planId: number,
  advisorId: number,
  status: "APPROVED" | "REJECTED",
  feedback?: string 
) => {

  const plan = await prisma.studyPlan.findUnique({
    where: { plan_id: planId }
  });

  if (!plan) throw new AppError("Plan not found", 404);

  if (plan.plan_status !== "PENDING")
    throw new AppError("Plan already reviewed", 400);

  const updated = await prisma.studyPlan.update({
    where: { plan_id: planId },
    data: {
      plan_status: status,
      advisor_id: advisorId,
      feedback: feedback ?? null,
    },
    include: {
      semester: { select: { semester_name: true } },
    },
  });

  await createNotification({
    recipient_id: plan.student_id,
    title: status === "APPROVED" ? "تم اعتماد خطتك الدراسية" : "تم رفض خطتك الدراسية",
    body:
      status === "APPROVED"
        ? `اعتمد المرشد خطتك لفصل ${updated.semester.semester_name}.`
        : `رفض المرشد خطتك لفصل ${updated.semester.semester_name}.${feedback ? ` الملاحظة: ${feedback}` : ""}`,
    type: "STUDY_PLAN",
    action_url: "/student/study-plan",
    entity_id: planId,
  });

  return updated;
};


export const getPendingPlans = async (advisorId: number) => {
  const plans = await prisma.studyPlan.findMany({
    where: {
      plan_status: "PENDING",
      submitted_at: { not: null },
      student: { advisor_id: advisorId },
    },
    include: {
      student: {
        select: {
          student_id: true,
          cumulative_gpa: true,
          total_earned_hours: true,
          level: true,
          user: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      },
      details: {
        include: {
          course: true,
        },
        orderBy: { course: { course_code: "asc" } },
      },
    },
    orderBy: { submitted_at: "desc" },
  });

  return plans.map((plan) => ({
    ...plan,
    total_hours: plan.details.reduce((sum, d) => sum + d.course.credits, 0),
  }));
};

export type CurrentStudyPlanCourse = {
  courseId: number;
  code: string;
  name: string;
  instructor: string | null;
  credits: number;
  grade: string | null;
  status: "Completed" | "In Progress" | "Planned";
};

export type CurrentStudyPlanResponse = {
  planId: number;
  semesterLabel: string;
  planStatus: string;
  submittedAt: Date | null;
  feedback: string | null;
  totalCourses: number;
  totalCredits: number;
  courses: CurrentStudyPlanCourse[];
};

export const getCurrentStudyPlan = async (
  studentId: number,
  semesterId?: number
): Promise<CurrentStudyPlanResponse | null> => {
  let targetSemesterId = semesterId;
  if (targetSemesterId == null) {
    targetSemesterId = (await resolvePlanningSemesterId(studentId)) ?? undefined;
  }
  if (targetSemesterId == null) {
    const latestSemester = await prisma.semester.findFirst({
      orderBy: { start_date: "desc" },
    });
    if (!latestSemester) return null;
    targetSemesterId = latestSemester.semester_id;
  }

  const plan = await prisma.studyPlan.findUnique({
    where: {
      student_id_semester_id: {
        student_id: studentId,
        semester_id: targetSemesterId
      }
    },
    include: {
      semester: true,
      details: {
        include: {
          course: true
        }
      }
    }
  });

  if (!plan) return null;

  const enrollmentsForSemester = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      semester_id: targetSemesterId
    },
    select: { course_id: true, grade: true, status: true }
  });
  const enrollmentByCourse = new Map(
    enrollmentsForSemester.map((e) => [e.course_id, e])
  );

  const courses: CurrentStudyPlanCourse[] = plan.details.map((d) => {
    const course = d.course;
    const enrollment = enrollmentByCourse.get(course.course_id);
    const grade = enrollment?.grade ?? null;
    const status: "Completed" | "In Progress" | "Planned" =
      enrollment?.grade != null && enrollment.grade !== "F"
        ? "Completed"
        : enrollment
          ? "In Progress"
          : "Planned";

    return {
      courseId: course.course_id,
      code: course.course_code,
      name: course.course_name,
      instructor: null,
      credits: course.credits,
      grade,
      status
    };
  });

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const semesterLabel =
    plan.semester.semester_name != null
      ? `${plan.semester.semester_name} Semester`
      : `Semester ${plan.semester_id}`;

  return {
    planId: plan.plan_id,
    semesterLabel,
    planStatus: plan.plan_status,
    submittedAt: plan.submitted_at,
    feedback: plan.feedback,
    totalCourses: courses.length,
    totalCredits,
    courses
  };
};
