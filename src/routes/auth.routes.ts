import { Router } from "express";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate } from "../middlewares/auth.middleware.js";

import {
  registerStudentHandler,
  loginHandler,
  loginStudentHandler,
  loginAdvisorHandler,
  loginAdminHandler,
  changePasswordHandler,
  meHandler,
  forgotPasswordHandler,
  requestForgotPasswordHandler,
  confirmForgotPasswordHandler,
  requestForgotPasswordOtpHandler,
  verifyForgotPasswordOtpHandler
} from "../controllers/auth.controller.js";

import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  forgotPasswordRequestSchema,
  forgotPasswordConfirmSchema,
  forgotPasswordOtpRequestSchema,
  forgotPasswordOtpVerifySchema
} from "../validations/auth.validation.js";

const router = Router();

router.post(
  "/register",
  asyncHandler(registerStudentHandler)
);

router.post(
  "/forgot-password/request",
  validate(forgotPasswordRequestSchema),
  asyncHandler(requestForgotPasswordHandler)
);

router.post(
  "/forgot-password/confirm",
  validate(forgotPasswordConfirmSchema),
  asyncHandler(confirmForgotPasswordHandler)
);

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler)
);

router.post(
  "/forgot-password/otp/request",
  validate(forgotPasswordOtpRequestSchema),
  asyncHandler(requestForgotPasswordOtpHandler)
);

router.post(
  "/forgot-password/otp/verify",
  validate(forgotPasswordOtpVerifySchema),
  asyncHandler(verifyForgotPasswordOtpHandler)
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(loginHandler)
);

router.post(
  "/login/student",
  validate(loginSchema),
  asyncHandler(loginStudentHandler)
);

router.post(
  "/login/advisor",
  validate(loginSchema),
  asyncHandler(loginAdvisorHandler)
);

router.post(
  "/login/admin",
  validate(loginSchema),
  asyncHandler(loginAdminHandler)
);

router.get("/me", authenticate, asyncHandler(meHandler));

router.patch(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(changePasswordHandler)
);

export default router;