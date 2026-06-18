import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notification.service.js";

type NotificationPayload = Parameters<typeof createNotification>[0];

const notifySafely = async (payload: NotificationPayload) => {
  try {
    await createNotification(payload);
  } catch (err) {
    console.warn("Failed to create notification:", err);
  }
};

/** List conversations for advisor: students assigned to this advisor with last message. */
export const getConversationsForAdvisor = async (advisorId: number) => {
  const students = await prisma.student.findMany({
    where: { advisor_id: advisorId },
    include: {
      user: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          university_email: true,
          personal_email: true,
          national_id: true,
        },
      },
    },
  });

  const studentUserIds = students.map((s) => s.student_id);

  const lastMessages = await prisma.message.findMany({
    where: {
      OR: [
        { sender_id: advisorId, recipient_id: { in: studentUserIds } },
        { sender_id: { in: studentUserIds }, recipient_id: advisorId }
      ]
    },
    orderBy: { sent_at: "desc" }
  });

  const lastByOther = new Map<number, { body: string; sent_at: Date; is_from_me: boolean }>();
  for (const m of lastMessages) {
    const otherId = m.sender_id === advisorId ? m.recipient_id : m.sender_id;
    if (!lastByOther.has(otherId)) {
      lastByOther.set(otherId, {
        body: m.body,
        sent_at: m.sent_at,
        is_from_me: m.sender_id === advisorId
      });
    }
  }

  return students.map((s) => {
    const last = lastByOther.get(s.student_id) ?? null;
    return {
      user_id: s.student_id,
      student_id: s.student_id,
      student_code: s.university_student_id ?? `S${String(s.student_id).padStart(7, "0")}`,
      university_student_id: s.university_student_id,
      full_name: `${s.user.first_name} ${s.user.last_name}`,
      email: s.user.university_email,
      national_id: s.user.national_id,
      major_type: s.major_type,
      level: s.level,
      cumulative_gpa: Number(s.cumulative_gpa),
      total_earned_hours: s.total_earned_hours,
      last_message: last?.body ?? null,
      last_message_at: last?.sent_at ?? null,
      last_message_from_me: last?.is_from_me ?? null,
    };
  });
};

/** Get messages between advisor and a student (by student's user_id = student_id). */
export const getMessagesWithStudent = async (
  advisorId: number,
  studentUserId: number
) => {
  const student = await prisma.student.findFirst({
    where: { student_id: studentUserId, advisor_id: advisorId }
  });
  if (!student)
    throw new AppError("Student not found or not assigned to you", 404);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { sender_id: advisorId, recipient_id: studentUserId },
        { sender_id: studentUserId, recipient_id: advisorId }
      ]
    },
    orderBy: { sent_at: "asc" },
    include: {
      sender: { select: { user_id: true, first_name: true, last_name: true } }
    }
  });

  return messages.map((m) => ({
    message_id: m.message_id,
    body: m.body,
    sent_at: m.sent_at,
    is_read: m.is_read,
    from_advisor: m.sender_id === advisorId,
    sender_name: `${m.sender.first_name} ${m.sender.last_name}`
  }));
};

/** Send message from advisor to a student. */
export const sendMessageToStudent = async (
  advisorId: number,
  recipientUserId: number,
  body: string
) => {
  const student = await prisma.student.findFirst({
    where: { student_id: recipientUserId, advisor_id: advisorId }
  });
  if (!student)
    throw new AppError("Student not found or not assigned to you", 404);

  const message = await prisma.message.create({
    data: {
      sender_id: advisorId,
      recipient_id: recipientUserId,
      body: body.trim()
    }
  });

  await notifySafely({
    recipient_id: recipientUserId,
    title: "رسالة جديدة من مرشدك",
    body: body.trim().slice(0, 200),
    type: "MESSAGE",
    action_url: "/student/messages",
    entity_id: message.message_id,
  });

  return {
    message_id: message.message_id,
    body: message.body,
    sent_at: message.sent_at
  };
};

/** Get messages between a student and their advisor (student view). */
export const getMessagesWithAdvisor = async (studentUserId: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentUserId },
    select: { advisor_id: true }
  });
  if (!student || !student.advisor_id)
    throw new AppError("No advisor assigned. Contact administration", 404);

  const advisorUserId = student.advisor_id; // advisor_id in Advisor = user_id

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { sender_id: studentUserId, recipient_id: advisorUserId },
        { sender_id: advisorUserId, recipient_id: studentUserId }
      ]
    },
    orderBy: { sent_at: "asc" },
    include: {
      sender: { select: { user_id: true, first_name: true, last_name: true } }
    }
  });

  return messages.map((m) => ({
    message_id: m.message_id,
    body: m.body,
    sent_at: m.sent_at,
    is_read: m.is_read,
    from_me: m.sender_id === studentUserId,
    sender_name: `${m.sender.first_name} ${m.sender.last_name}`
  }));
};

/** Send message from student to their advisor. */
export const sendMessageToAdvisor = async (
  studentUserId: number,
  body: string
) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentUserId },
    select: {
      advisor_id: true,
      user: { select: { first_name: true, last_name: true } },
    },
  });
  if (!student || !student.advisor_id)
    throw new AppError("No advisor assigned. Contact administration", 404);

  const advisorUserId = student.advisor_id;
  const studentName = `${student.user.first_name} ${student.user.last_name}`.trim();

  const message = await prisma.message.create({
    data: {
      sender_id: studentUserId,
      recipient_id: advisorUserId,
      body: body.trim()
    }
  });

  await notifySafely({
    recipient_id: advisorUserId,
    title: `رسالة من ${studentName}`,
    body: body.trim().slice(0, 200),
    type: "MESSAGE",
    action_url: `/advisor/messages?student=${studentUserId}`,
    entity_id: message.message_id,
  });

  return {
    message_id: message.message_id,
    body: message.body,
    sent_at: message.sent_at
  };
};

/** Count unread messages for current user (as recipient). */
export const getUnreadMessagesCount = async (userId: number) => {
  const count = await prisma.message.count({
    where: { recipient_id: userId, is_read: false },
  });
  return { count };
};

/** Mark messages from a conversation as read when user opens thread. */
export const markConversationRead = async (
  userId: number,
  otherUserId: number
) => {
  await prisma.message.updateMany({
    where: {
      sender_id: otherUserId,
      recipient_id: userId,
      is_read: false,
    },
    data: { is_read: true },
  });
  return { message: "Messages marked as read" };
};
