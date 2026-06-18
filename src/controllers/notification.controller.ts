import type { Request, Response } from "express";
import * as notificationService from "../services/notification.service.js";

export const getMyNotificationsHandler = async (req: Request, res: Response) => {
  const recipientId = (req as any).user.id;
  const unreadOnly = req.query.unread === "true";
  const list = await notificationService.getByRecipientId(recipientId, { unreadOnly });
  const withId = list.map((n) => ({ ...n, id: n.notification_id }));
  res.json(withId);
};

export const getUnreadCountHandler = async (req: Request, res: Response) => {
  const recipientId = (req as any).user.id;
  const result = await notificationService.getUnreadCount(recipientId);
  res.json(result);
};

export const markAsReadHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const recipientId = (req as any).user.id;
  const notification = await notificationService.markAsRead(id, recipientId);
  res.json(notification);
};

export const markAllAsReadHandler = async (req: Request, res: Response) => {
  const recipientId = (req as any).user.id;
  const result = await notificationService.markAllAsRead(recipientId);
  res.json(result);
};

export const createNotificationHandler = async (req: Request, res: Response) => {
  const rawRecipientId = req.body.recipient_id;
  const effectiveRecipientId =
    rawRecipientId === 0 ? (req as any).user.id : rawRecipientId;

  const notification = await notificationService.createNotification({
    ...req.body,
    recipient_id: effectiveRecipientId,
  });
  res.status(201).json(notification);
};
