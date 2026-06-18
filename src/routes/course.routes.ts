import { Router } from "express";
import * as controller from "../controllers/course.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createCourseSchema,
  updateCourseSchema,
  addPrerequisiteSchema,
  removePrerequisiteSchema,
  courseIdParamSchema,
} from "../validations/course.validation.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCourseSchema),
  asyncHandler(controller.createCourseHandler)
);
router.get("/", authenticate, asyncHandler(controller.getCoursesHandler));
router.get("/grouped", authenticate, asyncHandler(controller.getCoursesGroupedHandler));

router.post(
  "/add-prerequisite",
  authenticate,
  authorize("ADMIN"),
  validate(addPrerequisiteSchema),
  asyncHandler(controller.addPrerequisiteHandler)
);

router.delete(
  "/remove-prerequisite",
  authenticate,
  authorize("ADMIN"),
  validate(removePrerequisiteSchema),
  asyncHandler(controller.removePrerequisiteHandler)
);

router.get("/:id", authenticate, validate(courseIdParamSchema), asyncHandler(controller.getCourseByIdHandler));
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(courseIdParamSchema),
  validate(updateCourseSchema),
  asyncHandler(controller.updateCourseHandler)
);
router.delete("/:id", authenticate, authorize("ADMIN"), validate(courseIdParamSchema), asyncHandler(controller.deleteCourseHandler));
router.patch("/:id/toggle", authenticate, authorize("ADMIN"), validate(courseIdParamSchema), asyncHandler(controller.toggleAvailabilityHandler));
router.get("/:id/details", authenticate, validate(courseIdParamSchema), asyncHandler(controller.getCourseDetailsHandler));

export default router;
