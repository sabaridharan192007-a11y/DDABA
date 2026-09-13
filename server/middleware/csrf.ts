import { randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * GET /api/csrf-token
 * Issues (or returns the existing) CSRF token for the current session.
 * The frontend fetches this once on load and sends it back as the
 * `x-csrf-token` header on every state-changing request.
 */
export function issueCsrfToken(req: Request, res: Response) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString("hex");
  }
  res.json({ csrfToken: req.session.csrfToken });
}

/**
 * Rejects state-changing requests unless the `x-csrf-token` header matches
 * the token stored in the user's server-side session. Because the token
 * lives in the session (not a readable-by-JS cookie value an attacker's
 * page could guess), a cross-site request without first calling
 * /api/csrf-token from same-origin JS cannot produce a matching header.
 */
export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const sessionToken = req.session.csrfToken;
  const headerToken = req.get("x-csrf-token");

  if (!sessionToken || !headerToken) {
    return res.status(403).json({ message: "Missing security token. Please refresh and try again." });
  }

  const a = Buffer.from(sessionToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(403).json({ message: "Invalid security token. Please refresh and try again." });
  }

  next();
}
