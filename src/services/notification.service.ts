import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export type NotificationInput = {
  recipient_id: number;
  title?: string;
  body?: string;
  type?: string;
  action_url?: string;
  entity_id?: number;
};

export const getByRecipientId = async (
  recipientId: number,
  options?: { unreadOnly?: boolean }
) => {
  return prisma.notification.findMany({
    where: {
      recipient_id: recipientId,
      ...(options?.unreadOnly ? { is_read: false } : {}),
    },
    orderBy: { sent_at: "desc" },
    take: 50,
  });
};

export const getUnreadCount = async (recipientId: number) => {
  const count = await prisma.notification.count({
    where: { recipient_id: recipientId, is_read: false },
  });
  return { count };
};

export const markAsRead = async (notificationId: number, recipientId: number) => {
  if (!Number.isInteger(notificationId) || notificationId < 1) {
    throw new AppError("Invalid notification id", 400);
  }

  const n = await prisma.notification.findUnique({
    where: { notification_id: notificationId },
  });

  if (!n) {
    throw new AppError("Notification not found", 404);
  }

  if (n.recipient_id !== recipientId) {
    throw new AppError("This notification does not belong to your account", 403);
  }

  return prisma.notification.update({
    where: { notification_id: notificationId },
    data: { is_read: true },
  });
};

export const markAllAsRead = async (recipientId: number) => {
  await prisma.notification.updateMany({
    where: { recipient_id: recipientId },
    data: { is_read: true },
  });
  return { message: "All notifications marked as read" };
};

export const createNotification = async (data: NotificationInput) => {
  return prisma.notification.create({
    data: {
      recipient_id: data.recipient_id,
      title: data.title ?? null,
      body: data.body ?? null,
      type: data.type ?? null,
      action_url: data.action_url ?? null,
      entity_id: data.entity_id ?? null,
    },
  });
};
