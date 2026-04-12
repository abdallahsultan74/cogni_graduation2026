import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middlewares/auth.middleware.js";

import {
  registerStudentHandler,
  loginHandler,
  changePasswordHandler,
  meHandler
} from "../controllers/auth.controller.js";

import {
  registerStudentSchema,
  loginSchema,
  changePasswordSchema
} from "../validations/auth.validation.js";

const router = Router();

router.post(
  "/register",
  validate(registerStudentSchema),
  asyncHandler(registerStudentHandler)
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(loginHandler)
);

router.get("/me", authenticate, asyncHandler(meHandler));

router.patch(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(changePasswordHandler)
);

export default router;