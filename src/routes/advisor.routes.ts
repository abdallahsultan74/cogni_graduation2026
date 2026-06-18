import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getMyProfileHandler,
  updateMyProfileHandler,
  getMyStudentsHandler,
  getMyStudentByIdHandler,
  getDashboardHandler,
  getStudentTranscriptHandler
} from "../controllers/advisor.controller.js";
import {
  updateAdvisorProfileSchema,
  getMyStudentsSchema,
  studentIdParamSchema
} from "../validations/advisor.validation.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADVISOR"));

router.get("/me", asyncHandler(getMyProfileHandler));
router.patch(
  "/me",
  validate(updateAdvisorProfileSchema),
  asyncHandler(updateMyProfileHandler)
);

router.get(
  "/dashboard",
  asyncHandler(getDashboardHandler)
);

router.get(
  "/students",
  validate(getMyStudentsSchema),
  asyncHandler(getMyStudentsHandler)
);
router.get(
  "/students/:studentId",
  validate(studentIdParamSchema),
  asyncHandler(getMyStudentByIdHandler)
);
router.get(
  "/students/:studentId/transcript",
  validate(studentIdParamSchema),
  asyncHandler(getStudentTranscriptHandler)
);

export default router;
