import type { Request, Response, NextFunction } from "express";

interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {

    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userRole = String(req.user.role ?? "").toUpperCase();
    const allowedRoles = roles.map((r) => String(r).toUpperCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access denied",
        yourRole: req.user.role ?? "unknown"
      });
    }

    next();
  };
