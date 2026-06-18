import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  addCourseHandler,
  createPlanHandler,
  deletePlanHandler,
  generatePlanHandler,
  getAdvisorPlanAvailableCoursesHandler,
  getAvailableCoursesHandler,
  getCurrentPlanHandler,
  getPendingPlansHandler,
  removeCourseHandler,
  reviewPlanHandler,
  submitPlanHandler,
  updatePlanCoursesHandler,
  withdrawPlanHandler,
} from "../controllers/studyPlan.controller.js";
import {
  addCourseSchema,
  availableCoursesSchema,
  createPlanSchema,
  getCurrentPlanSchema,
  planIdParamsSchema,
  removeCourseSchema,
  reviewPlanSchema,
  submitPlanSchema,
  updatePlanCoursesSchema,
} from "../validations/studyPlan.validation.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("STUDENT"),
  validate(createPlanSchema),
  asyncHandler(createPlanHandler)
);

router.get(
  "/me/current",
  authenticate,
  authorize("STUDENT"),
  validate(getCurrentPlanSchema),
  asyncHandler(getCurrentPlanHandler)
);

router.get(
  "/me/available-courses",
  authenticate,
  authorize("STUDENT"),
  validate(availableCoursesSchema),
  asyncHandler(getAvailableCoursesHandler)
);

router.get(
  "/advisor/pending",
  authenticate,
  authorize("ADVISOR"),
  asyncHandler(getPendingPlansHandler)
);

router.get(
  "/generate",
  authenticate,
  authorize("STUDENT"),
  asyncHandler(generatePlanHandler)
);

router.post(
  "/generate",
  authenticate,
  authorize("STUDENT"),
  asyncHandler(generatePlanHandler)
);

router.post(
  "/:id/add-course",
  authenticate,
  authorize("STUDENT"),
  validate(addCourseSchema),
  asyncHandler(addCourseHandler)
);

router.get(
  "/:id/available-courses",
  authenticate,
  authorize("ADVISOR"),
  validate(planIdParamsSchema),
  asyncHandler(getAdvisorPlanAvailableCoursesHandler)
);

router.put(
  "/:id/courses",
  authenticate,
  authorize("STUDENT", "ADVISOR"),
  validate(updatePlanCoursesSchema),
  asyncHandler(updatePlanCoursesHandler)
);

router.delete(
  "/:id/courses/:courseId",
  authenticate,
  authorize("STUDENT"),
  validate(removeCourseSchema),
  asyncHandler(removeCourseHandler)
);

router.patch(
  "/:id/submit",
  authenticate,
  authorize("STUDENT"),
  validate(submitPlanSchema),
  asyncHandler(submitPlanHandler)
);

router.patch(
  "/:id/withdraw",
  authenticate,
  authorize("STUDENT"),
  validate(planIdParamsSchema),
  asyncHandler(withdrawPlanHandler)
);

router.delete(
  "/:id",
  authenticate,
  authorize("STUDENT"),
  validate(planIdParamsSchema),
  asyncHandler(deletePlanHandler)
);

router.patch(
  "/:id/review",
  authenticate,
  authorize("ADVISOR"),
  validate(reviewPlanSchema),
  asyncHandler(reviewPlanHandler)
);

export default router;
