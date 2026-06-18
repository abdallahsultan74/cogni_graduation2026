import type { Request, Response } from "express";
import * as studyPlanService from "../services/studyPlan.service.js";
import { getAvailableCoursesForStudent } from "../services/courseEligibility.service.js";
import { generateStudyPlan } from "../generators/studyPlan.generator.js";
import { AppError } from "../utils/AppError.js";
import { resolvePlanningSemesterId } from "../utils/planningSemester.js";
import prisma from "../config/prisma.js";

interface AuthenticatedRequest extends Request {
    user: {
        id: number;
        role: string;
    }
}

export const createPlanHandler = async (req: any, res: Response) => {
    const plan = await studyPlanService.createStudyPlan(
      req.user.id,
      req.body.semester_id
    );
    res.status(201).json(plan);
};

export const addCourseHandler = async (req: any, res: Response) => {
    const result = await studyPlanService.addCourseToPlan(
      Number(req.params.id),
      req.body.course_id,
      req.user.id
    );
    res.json(result);
};

export const submitPlanHandler = async (req: any, res: Response) => {
    const result = await studyPlanService.submitPlan(
      Number(req.params.id),
      req.user.id
    );
    res.json(result);
};

export const reviewPlanHandler = async (req: any, res: Response) => {
    const result = await studyPlanService.reviewPlan(
      Number(req.params.id),
      req.user.id,
      req.body.status,
      req.body.feedback
    );
    res.json(result);
};

export const getPendingPlansHandler = async (
  req: any,
  res: Response
) => {

    const plans = await studyPlanService.getPendingPlans(req.user.id);

    res.json(plans);
};

export const generatePlanHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const studentId = req.user.id;
        const result = await generateStudyPlan(studentId);

        if (!result.courses || result.courses.length === 0) {
            throw new AppError(
                "No eligible courses found for this semester. Please contact your advisor.",
                400
            );
        }

        const planningSemesterId = await resolvePlanningSemesterId(studentId);
        const targetSemester = planningSemesterId
          ? await prisma.semester.findUnique({
              where: { semester_id: planningSemesterId },
            })
          : await prisma.semester.findFirst({
              orderBy: { start_date: "desc" },
            });

        if (!targetSemester) {
            throw new AppError("No active semester found", 400);
        }

        // Find or create the plan
        let plan = await prisma.studyPlan.findUnique({
            where: {
                student_id_semester_id: {
                    student_id: studentId,
                    semester_id: targetSemester.semester_id
                }
            }
        });

        if (!plan) {
            plan = await prisma.studyPlan.create({
                data: {
                    student_id: studentId,
                    semester_id: targetSemester.semester_id,
                    total_hours: result.totalCredits
                }
            });
        } else {
            // If plan exists, clear old details and update total hours + reset status to PENDING
            await prisma.planDetail.deleteMany({
                where: { plan_id: plan.plan_id }
            });
            await prisma.studyPlan.update({
                where: { plan_id: plan.plan_id },
                data: { 
                    total_hours: result.totalCredits,
                    plan_status: "PENDING",
                    feedback: null,
                    submitted_at: null,
                }
            });
        }

        // Insert new plan details
        if (result.courses && result.courses.length > 0) {
            const planDetails = result.courses.map((c: any) => ({
                plan_id: plan!.plan_id,
                course_id: c.course_id
            }));
            await prisma.planDetail.createMany({
                data: planDetails
            });
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getCurrentPlanHandler = async (req: AuthenticatedRequest, res: Response) => {
    const studentId = req.user.id;
    const semesterId = req.query.semesterId != null ? Number(req.query.semesterId) : undefined;
    const plan = await studyPlanService.getCurrentStudyPlan(studentId, semesterId);
    if (!plan) {
        throw new AppError("No study plan found for the current semester", 404);
    }
    res.json(plan);
};

export const getAvailableCoursesHandler = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const planId =
    req.query.planId != null ? Number(req.query.planId) : undefined;
  const result = await getAvailableCoursesForStudent(req.user.id, planId);
  res.json(result);
};

export const getAdvisorPlanAvailableCoursesHandler = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const planId = Number(req.params.id);
  const plan = await prisma.studyPlan.findUnique({
    where: { plan_id: planId },
    include: { student: { select: { advisor_id: true, student_id: true } } },
  });
  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.student.advisor_id !== req.user.id) {
    throw new AppError("Not allowed", 403);
  }
  const result = await getAvailableCoursesForStudent(plan.student_id, planId);
  res.json(result);
};

export const updatePlanCoursesHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await studyPlanService.updatePlanCourses(
    Number(req.params.id),
    req.body.course_ids,
    req.user.id,
    req.user.role === "ADVISOR" ? "ADVISOR" : "STUDENT"
  );
  res.json(result);
};

export const removeCourseHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await studyPlanService.removeCourseFromPlan(
    Number(req.params.id),
    Number(req.params.courseId),
    req.user.id
  );
  res.json(result);
};

export const withdrawPlanHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await studyPlanService.withdrawSubmittedPlan(
    Number(req.params.id),
    req.user.id
  );
  res.json(result);
};

export const deletePlanHandler = async (req: AuthenticatedRequest, res: Response) => {
  const result = await studyPlanService.deleteStudyPlan(
    Number(req.params.id),
    req.user.id
  );
  res.json(result);
};
