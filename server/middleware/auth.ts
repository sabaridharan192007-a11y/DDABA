import type { Request, Response, NextFunction } from "express";
import { userStorage, playerStorage } from "../storage";

// Augment express-session's SessionData with our own fields.
declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: "PLAYER" | "ADMIN";
  }
}

/**
 * Requires any authenticated user (PLAYER or ADMIN).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Please log in to continue." });
  }
  const user = await userStorage.findById(req.session.userId);
  if (!user) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ message: "Session expired, please log in again." });
  }
  if (user.role === "PLAYER") {
    const player = await playerStorage.findByUserId(user.id);
    if (!player || player.status !== "ACTIVE") {
      req.session.destroy(() => undefined);
      return res.status(403).json({ message: "This player account is inactive." });
    }
  }
  next();
}

/**
 * Requires the authenticated user to be an ADMIN.
 * IMPORTANT: role is read from the server-side session, never from the
 * client request body/headers, so a PLAYER cannot spoof admin access.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Please log in to continue." });
  }
  const user = await userStorage.findById(req.session.userId);
  if (!user || user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "You do not have permission to perform this action." });
  }
  next();
}
