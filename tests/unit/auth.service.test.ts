import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

process.env.JWT_SECRET = "test-secret";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn()
  }
};

vi.mock("../../src/config/prisma.js", () => ({ default: prismaMock }));

describe("auth.service - login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws 401 when user is not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { login } = await import("../../src/services/auth.service.js");
    await expect(login("student@student.eelu.edu.eg", "password")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 401 when password does not match", async () => {
    const hash = await bcrypt.hash("correct", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      user_id: 1,
      university_email: "student@student.eelu.edu.eg",
      password_hash: hash,
      first_name: "Ali",
      last_name: "Ahmed",
      role: "STUDENT"
    });
    const { login } = await import("../../src/services/auth.service.js");
    await expect(login("student@student.eelu.edu.eg", "wrong")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns token and user when credentials are valid", async () => {
    const hash = await bcrypt.hash("password123", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      user_id: 1,
      university_email: "student@student.eelu.edu.eg",
      password_hash: hash,
      first_name: "Ali",
      last_name: "Ahmed",
      role: "STUDENT"
    });
    const { login } = await import("../../src/services/auth.service.js");
    const result = await login("student@student.eelu.edu.eg", "password123");
    expect(result.token).toBeDefined();
    expect(result.user).toMatchObject({ id: 1, role: "STUDENT" });
  });
});

describe("auth.service - changePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws 404 when user is not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { changePassword } = await import("../../src/services/auth.service.js");
    await expect(changePassword(99, "old", "new")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 when current password is wrong", async () => {
    const hash = await bcrypt.hash("correct", 10);
    prismaMock.user.findUnique.mockResolvedValue({ user_id: 1, password_hash: hash });
    const { changePassword } = await import("../../src/services/auth.service.js");
    await expect(changePassword(1, "wrong", "newpass")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("updates password and returns success message when inputs are valid", async () => {
    const hash = await bcrypt.hash("oldpass", 10);
    prismaMock.user.findUnique.mockResolvedValue({ user_id: 1, password_hash: hash });
    prismaMock.user.update.mockResolvedValue({ user_id: 1 });
    const { changePassword } = await import("../../src/services/auth.service.js");
    const result = await changePassword(1, "oldpass", "newpass123");
    expect(result.message).toBe("Password updated successfully");
    expect(prismaMock.user.update).toHaveBeenCalledOnce();
  });
});
