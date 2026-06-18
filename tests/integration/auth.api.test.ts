import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";

const prismaMock = {
  $connect: vi.fn(),
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  passwordResetToken: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("../../src/config/prisma.js", () => ({ default: prismaMock }));
vi.mock("../../src/services/email.service.js", () => ({
  generateOtp: () => "123456",
  getOtpExpiryMinutes: () => 10,
  hashResetToken: (t: string) => `hash-${t}`,
  sendPasswordResetOtpEmail: vi.fn().mockResolvedValue({ devLogged: true, masked: "st***@gmail.com" })
}));

describe("Auth API", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 when body is invalid", async () => {
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "not-an-email", password: "x" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "student@student.eelu.edu.eg", password: "password123" });
      expect(res.status).toBe(401);
    });

    it("returns 200 and token when credentials are valid", async () => {
      const hash = await bcrypt.hash("password123", 10);
      prismaMock.user.findUnique.mockResolvedValue({
        user_id: 1,
        university_email: "student@student.eelu.edu.eg",
        password_hash: hash,
        first_name: "Test",
        last_name: "User",
        role: "STUDENT"
      });
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "student@student.eelu.edu.eg", password: "password123" });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({ id: 1, role: "STUDENT" });
    });
  });

  describe("POST /api/auth/forgot-password/request", () => {
    it("returns generic success when user missing", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/auth/forgot-password/request")
        .send({ national_id: "12345678901234" });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("verification code");
    });

    it("creates OTP token and sends email when user has personal email", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        user_id: 10,
        personal_email: "student@gmail.com",
        role: "STUDENT"
      });
      prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.passwordResetToken.create.mockResolvedValue({ token_id: 1 });

      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/auth/forgot-password/request")
        .send({ national_id: "12345678901234" });

      expect(res.status).toBe(200);
      expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(1);
      expect(res.body.masked_email).toBe("st***@gmail.com");
    });
  });

  describe("POST /api/auth/forgot-password/confirm", () => {
    it("updates password for valid OTP", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ user_id: 10 });
      prismaMock.passwordResetToken.findFirst.mockResolvedValue({
        token_id: 1,
        user_id: 10,
        used_at: null,
        expires_at: new Date(Date.now() + 60_000)
      });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.passwordResetToken.update.mockResolvedValue({});

      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/auth/forgot-password/confirm")
        .send({
          national_id: "12345678901234",
          otp: "123456",
          newPassword: "newPassword123"
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password reset successfully");
    });
  });

  describe("PATCH /api/auth/change-password", () => {
    it("returns 401 when no token", async () => {
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .patch("/api/auth/change-password")
        .send({ currentPassword: "old", newPassword: "new123" });
      expect(res.status).toBe(401);
    });
  });
});
