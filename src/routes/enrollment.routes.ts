import { Router } from "express";
import * as controller from "../controllers/enrollment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.middleware.js";
import { enrollSchema , markPassedSchema, bulkGradesSchema } from "../validations/enrollment.validation.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("STUDENT"),
  validate(enrollSchema),
  asyncHandler(controller.enrollHandler)
);

router.patch(
  "/mark-passed",
  authenticate,
  authorize("ADMIN", "ADVISOR"),
  validate(markPassedSchema),
  asyncHandler(controller.markPassedHandler)
);

router.post(
  "/bulk-grades",
  authenticate,
  authorize("ADMIN"),
  validate(bulkGradesSchema),
  asyncHandler(controller.bulkGradesHandler)
);


export default router;
