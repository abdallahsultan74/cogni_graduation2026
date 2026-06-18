import crypto from "crypto";
import { Resend } from "resend";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/AppError.js";
import { maskEmail } from "../utils/studentIdentity.js";
import { validateEmailWithMailboxlayer } from "./mailboxlayer.service.js";

const OTP_EXPIRY_MINUTES = 10;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

const resolveFromAddress = () => {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.NODE_ENV !== "production") return "onboarding@resend.dev";
  return "noreply@cogniadvisor.com";
};

export const hashResetToken = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const generateOtp = () =>
  String(crypto.randomInt(100000, 1_000_000));

export const getOtpExpiryMinutes = () => OTP_EXPIRY_MINUTES;

export const sendPasswordResetOtpEmail = async (params: {
  to: string;
  otp: string;
}) => {
  const validation = await validateEmailWithMailboxlayer(params.to);
  if (validation && !validation.deliverable) {
    logger.warn("Personal email failed Mailboxlayer check", {
      to: maskEmail(params.to),
      valid: validation.valid,
      deliverable: validation.deliverable,
      score: validation.score,
      reason: validation.reason
    });
  }

  const from = resolveFromAddress();
  const subject = "Cogni Advisor — Password reset code";
  const html = `
    <p>You requested to reset your Cogni Advisor password.</p>
    <p>Your verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${params.otp}</p>
    <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  const text = `Your Cogni Advisor password reset code is ${params.otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;

  const resend = getResendClient();
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("[dev] Password reset OTP (no RESEND_API_KEY)", {
        to: params.to,
        otp: params.otp,
        expiresInMinutes: OTP_EXPIRY_MINUTES
      });
      return { devLogged: true, masked: maskEmail(params.to) };
    }
    throw new AppError("Email service is not configured", 500);
  }

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject,
    html,
    text
  });

  if (error) {
    logger.warn("Resend OTP email failed", { to: params.to, error: error.message });
    if (process.env.NODE_ENV !== "production") {
      logger.info("[dev] Password reset OTP fallback after Resend error", {
        to: params.to,
        otp: params.otp
      });
      return { devLogged: true, masked: maskEmail(params.to) };
    }
    throw new AppError("Failed to send verification code", 500);
  }

  logger.info("Password reset OTP sent", { to: maskEmail(params.to) });
  return { devLogged: false, masked: maskEmail(params.to) };
};
