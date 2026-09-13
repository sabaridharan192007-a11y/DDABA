import nodemailer from "nodemailer";
import { env, smtpConfigured } from "../env";

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

export async function sendPasswordResetOtp(email: string, otp: string): Promise<void> {
  if (!transporter || !env.SMTP_FROM) {
    throw new Error("Password reset email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.");
  }
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "DDABA password reset OTP",
    text: `Your DDABA password reset OTP is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
}
