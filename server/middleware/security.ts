import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import type { Request, Response, NextFunction } from "express";
import { isProduction } from "../env";

/**
 * Helmet: sets a broad set of protective HTTP headers (X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, etc.) plus a strict CSP.
 * connect-src includes 'self' only — the SPA talks only to its own API.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // avoid breaking image loading from same-origin static assets
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
});

/**
 * Strict limiter for authentication endpoints — the highest-value target
 * for credential stuffing / brute force. Keyed by IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
  // NOTE: default in-memory store is per-process. For a multi-instance
  // production deployment, swap in a shared store (e.g. rate-limit-redis)
  // so limits are enforced across all instances.
});

/** Looser general limiter applied to the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

/** Tighter limiter for the registration endpoint specifically (account creation abuse). */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Please try again later." },
});

/** Blocks HTTP Parameter Pollution (e.g. ?category=A&category=B tricks). */
export const hppMiddleware = hpp();

/** API responses may contain session-scoped data — never let intermediaries cache them. */
export function noStore(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  next();
}

/** Redirects plain HTTP to HTTPS in production (behind a proxy that sets x-forwarded-proto). */
export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (!isProduction) return next();
  if (req.secure || req.headers["x-forwarded-proto"] === "https") return next();
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
}
