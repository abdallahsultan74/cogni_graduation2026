import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createUserHandler,
  createStudentByAdminHandler,
  createAdvisorByAdminHandler,
  createAdminByAdminHandler,
  getUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler
} from "../controllers/user.controller.js";

import {
  createUserSchema,
  createStudentByAdminSchema,
  createAdvisorByAdminSchema,
  createAdminByAdminSchema,
  updateUserSchema,
  deleteUserSchema
} from "../validations/user.validation.js";

const router = Router();


router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createUserSchema),
  asyncHandler(createUserHandler)
);

router.post(
  "/students",
  authenticate,
  authorize("ADMIN"),
  validate(createStudentByAdminSchema),
  asyncHandler(createStudentByAdminHandler)
);

router.post(
  "/advisors",
  authenticate,
  authorize("ADMIN"),
  validate(createAdvisorByAdminSchema),
  asyncHandler(createAdvisorByAdminHandler)
);

router.post(
  "/admins",
  authenticate,
  authorize("ADMIN"),
  validate(createAdminByAdminSchema),
  asyncHandler(createAdminByAdminHandler)
);


router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(getUsersHandler)
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(getUserHandler)
);

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateUserSchema),
  asyncHandler(updateUserHandler)
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(deleteUserSchema),
  asyncHandler(deleteUserHandler)
);

export default router;