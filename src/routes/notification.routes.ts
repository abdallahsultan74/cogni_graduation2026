import { Router } from "express";
import * as controller from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotificationSchema, notificationIdParamSchema } from "../validations/notification.validation.js";

const router = Router();

router.get("/", authenticate, asyncHandler(controller.getMyNotificationsHandler));

router.get("/unread-count", authenticate, asyncHandler(controller.getUnreadCountHandler));

router.patch("/read-all", authenticate, asyncHandler(controller.markAllAsReadHandler));

router.patch(
  "/:id/read",
  authenticate,
  validate(notificationIdParamSchema),
  asyncHandler(controller.markAsReadHandler)
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createNotificationSchema),
  asyncHandler(controller.createNotificationHandler)
);

export default router;
