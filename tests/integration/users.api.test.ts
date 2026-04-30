import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { getAdminToken } from "../helpers/authHelper.js";

const prismaMock = {
  $connect: vi.fn(),
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  student: { create: vi.fn() },
  advisor: { create: vi.fn() },
  admin: { create: vi.fn() }
};

vi.mock("../../src/config/prisma.js", () => ({ default: prismaMock }));

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";

describe("Users API", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const adminToken = getAdminToken();

  describe("POST /api/users", () => {
    it("returns 401 without token", async () => {
      const { default: app } = await import("../../src/app.js");
      const res = await request(app).post("/api/users").send({
        first_name: "A",
        last_name: "B",
        national_id: "12345678901234",
        personal_email: "a@b.com",
        password: "pass123",
        role: "STUDENT"
      });
      expect(res.status).toBe(401);
    });

    it("returns 403 with non-ADMIN token", async () => {
      const { getStudentToken } = await import("../helpers/authHelper.js");
      const { default: app } = await import("../../src/app.js");
      prismaMock.user.findUnique.mockResolvedValue({ user_id: 2, role: "STUDENT" });
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${getStudentToken()}`)
        .send({
          first_name: "A",
          last_name: "B",
          national_id: "12345678901234",
          personal_email: "a@b.com",
          password: "pass123",
          role: "STUDENT"
        });
      expect(res.status).toBe(403);
    });

    it("returns 400 when body is invalid", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ first_name: "A" });
      expect(res.status).toBe(400);
    });

    it("returns 201 when admin creates user", async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ user_id: 1, role: "ADMIN" })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prismaMock.user.create.mockResolvedValue({
        user_id: 10,
        first_name: "New",
        last_name: "User",
        national_id: "12345678901234",
        personal_email: "new@test.com",
        role: "STUDENT"
      });
      prismaMock.student.create.mockResolvedValue({ student_id: 10 });
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          first_name: "New",
          last_name: "User",
          national_id: "12345678901234",
          personal_email: "new@test.com",
          password: "pass123",
          role: "STUDENT"
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("user_id");
    });

    it("allows admin to create advisor and admin roles", async () => {
      const { default: app } = await import("../../src/app.js");

      for (const role of ["ADVISOR", "ADMIN"] as const) {
        prismaMock.user.findUnique.mockReset();
        prismaMock.user.findUnique
          .mockResolvedValueOnce({ user_id: 1, role: "ADMIN" })
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        prismaMock.user.create.mockResolvedValue({
          user_id: role === "ADVISOR" ? 21 : 22,
          first_name: "Role",
          last_name: "User",
          national_id: role === "ADVISOR" ? "22345678901234" : "32345678901234",
          personal_email: role === "ADVISOR" ? "advisor@test.com" : "admin2@test.com",
          role
        });

        const res = await request(app)
          .post("/api/users")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            first_name: "Role",
            last_name: "User",
            national_id: role === "ADVISOR" ? "22345678901234" : "32345678901234",
            personal_email: role === "ADVISOR" ? "advisor@test.com" : "admin2@test.com",
            password: "pass123",
            role
          });

        expect(res.status).toBe(201);
      }
    });
  });

  describe("GET /api/users", () => {
    it("returns 401 without token", async () => {
      const { default: app } = await import("../../src/app.js");
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(401);
    });

    it("returns 200 and list with admin token", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ user_id: 1, role: "ADMIN" });
      prismaMock.user.findMany.mockResolvedValue([]);
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns 401 without token", async () => {
      const { default: app } = await import("../../src/app.js");
      const res = await request(app).get("/api/users/1");
      expect(res.status).toBe(401);
    });

    it("returns 200 with admin token when user exists", async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ user_id: 1, role: "ADMIN" })
        .mockResolvedValueOnce({ user_id: 5, first_name: "John", last_name: "Doe" });
      const { default: app } = await import("../../src/app.js");
      const res = await request(app)
        .get("/api/users/5")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });
});
