import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getOverviewHandler, getSystemSettingsHandler, patchSystemSettingsHandler, getAcademicCalendarHandler, activateSemesterHandler, advanceSemesterHandler, searchStudentsHandler, getStudentEnrollmentsHandler, resolveSemesterHandler } from "../controllers/admin.controller.js";
import { patchSystemSettingsSchema } from "../validations/admin.validation.js";
import { resolveSemesterSchema } from "../validations/enrollment.validation.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/overview", asyncHandler(getOverviewHandler));

router.get("/academic-calendar", asyncHandler(getAcademicCalendarHandler));
router.get("/semesters/resolve", validate(resolveSemesterSchema), asyncHandler(resolveSemesterHandler));
router.patch("/semesters/:id/activate", asyncHandler(activateSemesterHandler));
router.post("/semesters/advance", asyncHandler(advanceSemesterHandler));
router.get("/students/search", asyncHandler(searchStudentsHandler));
router.get("/students/:id/enrollments", asyncHandler(getStudentEnrollmentsHandler));

router.get("/system-settings", asyncHandler(getSystemSettingsHandler));
router.patch(
  "/system-settings",
  validate(patchSystemSettingsSchema),
  asyncHandler(patchSystemSettingsHandler)
);

export default router;

