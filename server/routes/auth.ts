import { Router } from "express";
import { z } from "zod";
import { randomInt, createHash } from "crypto";
import { userStorage, playerStorage, registrationPermissionStorage, auditStorage, passwordResetStorage } from "../storage";
import { hashPassword, verifyPassword } from "../services/password";
import { sendPasswordResetOtp } from "../services/email";
import { generateUniquePlayerId } from "../services/playerId";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"]?.split(",")[0].trim()) || req.socket?.remoteAddress || "unknown";
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(255),
    email: z.string().trim().toLowerCase().email(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100),
    confirmPassword: z.string(),
    phone: z.string().trim().min(6).max(20).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    club: z.string().trim().max(255).optional(),
    category: z.string().trim().max(100).optional(),
    area: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    profileImage: z.string().max(6_000_000).optional(), // guards against oversized base64 payloads
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email() });
const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().regex(/^\d{6}$/, "OTP must be six digits"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(100, "Password must be 100 characters or fewer."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Please complete all required fields correctly.",
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const data = parsed.data;

  try {
    const existingEmail = await userStorage.findByEmail(data.email);
    if (existingEmail) {
      // Deliberately vague — never reveal whether an email is registered.
      return res
        .status(400)
        .json({ message: "Unable to complete registration with the provided details." });
    }

    // Registration eligibility is controlled by admin per area, with
    // optional per-institution (school/club) overrides — most specific wins.
    if (data.area) {
      const isOpen = await registrationPermissionStorage.isOpenFor(data.area, data.club);
      if (!isOpen) {
        return res.status(403).json({
          message: "Player registration is not currently open for your area/institution. Please contact the association.",
        });
      }
    }

    const passwordHash = await hashPassword(data.password);
    let playerId: string;
    try {
      playerId = await generateUniquePlayerId();
    } catch {
      return res.status(503).json({ message: "Unable to generate a player ID. Please try again." });
    }

    // Role is always PLAYER here — never taken from client input. Admin
    // accounts are created only through the seed script.
    const user = await userStorage.create({
      email: data.email,
      passwordHash,
      role: "PLAYER",
    });

    const player = await playerStorage.create({
      userId: user.id,
      playerId,
      fullName: data.fullName,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      club: data.club,
      category: data.category,
      area: data.area,
      city: data.city,
      profileImage: data.profileImage,
    });

    // Regenerate the session on privilege change (anonymous -> authenticated)
    // to prevent session fixation attacks.
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.status(500).json({ message: "Unable to complete registration right now." });
      }
      req.session.userId = user.id;
      req.session.role = user.role;

      auditStorage.log({
        userId: user.id,
        action: "REGISTER",
        entityType: "user",
        entityId: user.id,
        ipAddress: clientIp(req),
      });

      return res.status(201).json({
        message: "Player registered successfully.",
        user: { id: user.id, email: user.email, role: user.role },
        player,
      });
    });

  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Unable to complete registration right now." });
  }
});

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Enter a valid registered email address." });
  try {
    const user = await userStorage.findByEmail(parsed.data.email);
    if (!user) return res.status(404).json({ message: "No account was found for that email address." });

    const otp = String(randomInt(100000, 1000000));
    const tokenHash = createHash("sha256").update(otp).digest("hex");
    // Send first so a failed/unconfigured SMTP transport never leaves a
    // usable reset token behind.
    await sendPasswordResetOtp(user.email, otp);
    await passwordResetStorage.create(user.id, tokenHash, new Date(Date.now() + 10 * 60 * 1000));
    return res.json({ message: "A password reset OTP was sent to your email address." });
  } catch (err: any) {
    console.error("Password reset email error:", err);
    return res.status(503).json({
      message: err?.message || "Unable to send the password reset email. Please try again later.",
    });
  }
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return res.status(400).json({ message: firstError?.message || "Enter a valid OTP and password." });
  }
  try {
    const user = await userStorage.findByEmail(parsed.data.email);
    if (!user) return res.status(400).json({ message: "The OTP is invalid or has expired." });
    const token = await passwordResetStorage.findValid(createHash("sha256").update(parsed.data.otp).digest("hex"));
    if (!token || token.userId !== user.id) return res.status(400).json({ message: "The OTP is invalid or has expired." });
    await userStorage.updatePassword(user.id, await hashPassword(parsed.data.password));
    await passwordResetStorage.remove(token.id);
    await auditStorage.log({ userId: user.id, action: "PASSWORD_RESET", entityType: "user", entityId: user.id, ipAddress: clientIp(req) });
    return res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Password reset error:", err);
    return res.status(500).json({ message: "Unable to reset the password right now." });
  }
});

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email or Player ID is required"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }

  const genericError = { message: "Invalid login details." };
  const ip = clientIp(req);

  try {
    let user = await userStorage.findByEmail(parsed.data.email.toLowerCase());
    if (!user) {
      const player = await playerStorage.findByPlayerId(parsed.data.email);
      if (player) user = await userStorage.findById(player.userId);
    }

    if (!user) return res.status(401).json(genericError);

    if (userStorage.isLocked(user)) {
      await auditStorage.log({
        userId: user.id,
        action: "LOGIN_BLOCKED_LOCKED",
        entityType: "user",
        entityId: user.id,
        ipAddress: ip,
      });
      return res.status(423).json({
        message: "This account is temporarily locked due to repeated failed login attempts. Please try again later.",
      });
    }

    if (user.role === "PLAYER") {
      const player = await playerStorage.findByUserId(user.id);
      if (!player || player.status !== "ACTIVE") return res.status(401).json(genericError);
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      const result = await userStorage.recordFailedLogin(user.id);
      await auditStorage.log({
        userId: user.id,
        action: result?.locked ? "LOGIN_FAILED_LOCKOUT_TRIGGERED" : "LOGIN_FAILED",
        entityType: "user",
        entityId: user.id,
        ipAddress: ip,
      });
      return res.status(401).json(genericError);
    }

    await userStorage.recordSuccessfulLogin(user.id, ip);

    // Regenerate session ID on login — prevents session fixation.
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.status(500).json({ message: "Unable to log in right now." });
      }
      req.session.userId = user!.id;
      req.session.role = user!.role;

      auditStorage.log({
        userId: user!.id,
        action: "LOGIN_SUCCESS",
        entityType: "user",
        entityId: user!.id,
        ipAddress: ip,
      });

      return res.json({
        message: "Logged in successfully.",
        user: { id: user!.id, email: user!.email, role: user!.role },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Unable to log in right now." });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", requireAuth, (req, res) => {
  const userId = req.session.userId;
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Unable to log out right now." });
    }
    res.clearCookie("ddaba.sid");
    if (userId) {
      auditStorage.log({ userId, action: "LOGOUT", entityType: "user", entityId: userId, ipAddress: clientIp(req) });
    }
    return res.json({ message: "Logged out successfully." });
  });
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await userStorage.findById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Session expired, please log in again." });

    let player = null;
    if (user.role === "PLAYER") {
      player = await playerStorage.findByUserId(user.id);
      if (!player || player.status !== "ACTIVE") {
        req.session.destroy(() => undefined);
        return res.status(403).json({ message: "This player account is inactive." });
      }
    }

    return res.json({
      user: { id: user.id, email: user.email, role: user.role },
      player,
    });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Unable to load your session right now." });
  }
});
