import type { Request, Response, NextFunction } from "express";
import { verify, type JwtPayload } from "./jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verify(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.user = payload;
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (req.user.role !== role && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
