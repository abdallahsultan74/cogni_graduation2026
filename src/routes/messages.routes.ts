import { Router, type Response } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as messageService from "../services/message.service.js";

const router = Router();

router.use(authenticate);

router.get(
  "/unread-count",
  asyncHandler(async (req: any, res: Response) => {
    const result = await messageService.getUnreadMessagesCount(req.user.id);
    res.json(result);
  })
);

export default router;
