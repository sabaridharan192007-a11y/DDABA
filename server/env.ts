import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`"),
  // Optional extra secret mixed into password hashes. Not stored in the DB,
  // so a stolen database dump alone is not enough to brute-force passwords.
  PASSWORD_PEPPER: z.string().min(16).optional(),
  // Comma-separated list of origins allowed to call the API with credentials.
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
  SEED_DEMO_PASSWORD: z.string().min(12).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(3).optional(),
  SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Refusing to start with invalid environment configuration. See errors above.");
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.PASSWORD_PEPPER) {
  console.warn(
    "WARNING: PASSWORD_PEPPER is not set. Running without a pepper in production is discouraged — " +
      "see .env.example."
  );
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

export const smtpConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM
);
