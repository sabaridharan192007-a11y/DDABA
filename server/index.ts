import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";

import { env, isProduction, allowedOrigins } from "./env";
import { pool } from "./db";
import {
  helmetMiddleware,
  authLimiter,
  apiLimiter,
  registerLimiter,
  hppMiddleware,
  noStore,
  enforceHttps,
} from "./middleware/security";
import { issueCsrfToken, requireCsrf } from "./middleware/csrf";

import { authRouter } from "./routes/auth";
import { playersRouter } from "./routes/players";
import { matchesRouter } from "./routes/matches";
import { announcementsRouter } from "./routes/announcements";
import { newsRouter } from "./routes/news";
import { achievementsRouter } from "./routes/achievements";
import { pointsRouter } from "./routes/points";
import { registrationPermissionsRouter } from "./routes/registrationPermissions";
import { matchRegistrationsRouter } from "./routes/matchRegistrations";
import { overviewRouter, rankingsRouter, publicContentRouter } from "./routes/misc";

const app = express();
const PgSession = connectPgSimple(session);

// Required when running behind a reverse proxy (Replit, Render, nginx, etc.)
// so secure cookies and rate-limit IP detection work correctly.
app.set("trust proxy", 1);

app.use(enforceHttps);
app.use(helmetMiddleware);
app.use(hppMiddleware);
app.use(
  express.json({
    limit: "3mb", // generous enough for a base64 profile photo, small enough to blunt payload-flood abuse
  })
);

// CORS is only relevant if the frontend is ever served from a different
// origin than the API (e.g. separate dev ports). Credentials must be
// explicit-origin, never a wildcard, when cookies are involved.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-csrf-token");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(
  session({
    store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
    name: "ddaba.sid", // avoid the default 'connect.sid' fingerprint
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // sliding expiration on activity
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

app.use("/api", noStore);
app.use("/api", apiLimiter);
app.use("/api", requireCsrf);

app.get("/api/csrf-token", issueCsrfToken);

// ---------- API ROUTES ----------
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/players", playersRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/news", newsRouter);
app.use("/api/achievements", achievementsRouter);
app.use("/api/points", pointsRouter);
app.use("/api/registration-permissions", registrationPermissionsRouter);
app.use("/api/match-registrations", matchRegistrationsRouter);
app.use("/api/rankings", rankingsRouter);
app.use("/api", publicContentRouter);
app.use("/api/admin", overviewRouter);

// ---------- STATIC FRONTEND (production build) ----------
if (isProduction) {
  const clientDist = path.resolve(__dirname, "../client/dist");
  app.use(express.static(clientDist, { maxAge: "1d", index: false }));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ message: "Not found." });
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Multer file-validation errors (size/type) get a clear 400 instead of a generic 500.
  if (err?.name === "MulterError" || /Only JPG, PNG, or PDF/.test(err?.message || "")) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum size is 5MB." : err.message || "Invalid file upload.";
    return res.status(400).json({ message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

app.listen(env.PORT, () => {
  console.log(`DDABA server running on port ${env.PORT} (${env.NODE_ENV})`);
});
