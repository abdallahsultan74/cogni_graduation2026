import express from "express";
import type { Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { createMorganStream } from "./config/logger.js";
import { requestId } from "./middlewares/requestId.middleware.js";
import { globalErrorHandler } from "./middlewares/errorHandler.middleware.js";
import prisma from "./config/prisma.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_API,
  RATE_LIMIT_MAX_AUTH,
  RATE_LIMIT_MAX_FORGOT_PASSWORD
} from "./constants/api.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import studentRoutes from "./routes/student.routes.js";
import advisorRoutes from "./routes/advisor.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import courseRoutes from "./routes/course.routes.js";
import semesterRoutes from "./routes/semester.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import studyPlanRoutes from "./routes/studyPlan.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import semesterRecordRoutes from "./routes/semesterRecord.routes.js";
import messageRoutes from "./routes/message.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_API,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts, please try again later." }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_FORGOT_PASSWORD,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many reset attempts, please try again later." }
});

const app = express();
// Running behind Vercel/Supabase gateway requires trusting proxy headers
// so rate-limit can resolve client IP without throwing proxy validation errors.
app.set("trust proxy", 1);
app.use(requestId);
app.use(morgan("combined", { stream: createMorganStream() }));
app.use(express.json());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  })
);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"]
}));

app.get("/", (_req, res) => {
  res.redirect(302, "/api-docs/");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", apiLimiter);

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/login/student", authLimiter);
app.use("/api/auth/login/advisor", authLimiter);
app.use("/api/auth/login/admin", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", forgotPasswordLimiter);
app.use("/api/auth/forgot-password/otp/request", forgotPasswordLimiter);
app.use("/api/auth/forgot-password/otp/verify", forgotPasswordLimiter);

// Feature routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/advisor", advisorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/study-plan", studyPlanRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/semester-records", semesterRecordRoutes);
app.use("/api/advisor/messages", messageRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", asyncHandler(async (_req: Request, res: Response) => {
  try {
    await prisma.$connect();
    res.json({
      status: "OK",
      database: "connected"
    });
  } catch {
    res.status(503).json({
      status: "ERROR",
      database: "disconnected"
    });
  }
}));

app.use(globalErrorHandler);

export default app;

