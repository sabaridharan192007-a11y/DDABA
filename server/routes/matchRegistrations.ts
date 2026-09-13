import { Router } from "express";
import { z } from "zod";
import fs from "fs";
import {
  matchRegistrationStorage,
  matchStorage,
  playerStorage,
  registrationPermissionStorage,
  auditStorage,
} from "../storage";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { documentUpload, resolveDocumentPath } from "../services/documents";
import { CATEGORIES, DISCIPLINES } from "../../shared/schema/schema";

export const matchRegistrationsRouter = Router();

/** Only the registrant themselves or an admin may access a registration's private details. */
async function assertOwnerOrAdmin(req: any, registration: { playerId: number }) {
  if (req.session.role === "ADMIN") return true;
  const player = await playerStorage.findByUserId(req.session.userId);
  return !!player && player.id === registration.playerId;
}

const registerSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(255),
  age: z.coerce.number().int().min(3).max(100),
  category: z.string().trim().min(1).max(100),
  fatherName: z.string().trim().min(2).max(255),
  representingName: z.string().trim().min(2).max(255),
  // Sent as a JSON string in the multipart body (e.g. '["AEROSKATOBALL","SPEED"]").
  disciplines: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed) || !parsed.every((d) => DISCIPLINES.includes(d))) throw new Error();
      return parsed as string[];
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid disciplines." });
      return z.NEVER;
    }
  }),
});

// POST /api/match-registrations — player registers for a match (multipart/form-data)
matchRegistrationsRouter.post(
  "/",
  requireAuth,
  documentUpload.single("birthCertificate"),
  async (req, res) => {
    if (req.session.role !== "PLAYER") {
      return res.status(403).json({ message: "Only players can register for matches." });
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Please complete all required fields correctly." });
    }
    const data = parsed.data;

    try {
      const match = await matchStorage.findById(data.matchId);
      if (!match) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Match not found." });
      }
      if (!match.registrationReleased) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Registration for this match has not been released yet." });
      }
      if (data.disciplines.length === 0 || data.disciplines.length > match.maxDisciplinesPerRegistration) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: `Please select between 1 and ${match.maxDisciplinesPerRegistration} discipline(s) for this match.`,
        });
      }
      if (match.requireBirthCertificate && !req.file) {
        return res.status(400).json({ message: "A birth certificate upload is required for this match." });
      }

      const player = await playerStorage.findByUserId(req.session.userId!);
      if (!player) return res.status(404).json({ message: "Player profile not found." });

      // Most-specific-wins check: the player's exact representing
      // institution within their area, falling back to the area-wide rule.
      const isOpen = await registrationPermissionStorage.isOpenFor(player.area || "", data.representingName);
      if (!isOpen) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({
          message: "Registration is not currently open for your area/institution. Please contact the association.",
        });
      }

      const existing = await matchRegistrationStorage.findByPlayerAndMatch(player.id, match.id);
      if (existing) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "You have already registered for this match." });
      }

      const registration = await matchRegistrationStorage.create({
        matchId: match.id,
        playerId: player.id,
        name: data.name,
        age: data.age,
        category: data.category,
        fatherName: data.fatherName,
        representingName: data.representingName,
        disciplines: data.disciplines,
        birthCertificateFile: req.file?.filename ?? null,
      });

      await auditStorage.log({
        userId: req.session.userId!,
        action: "MATCH_REGISTRATION_CREATED",
        entityType: "match_registration",
        entityId: registration.id,
      });

      res.status(201).json({ message: "Registration submitted and sent to the admin for approval.", registration });
    } catch (err: any) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error(err);
      if (err?.code === "23505") {
        return res.status(409).json({ message: "You have already registered for this match." });
      }
      res.status(500).json({ message: "Unable to submit registration right now." });
    }
  }
);

// GET /api/match-registrations/mine — player's own registrations ("Recent Participation")
matchRegistrationsRouter.get("/mine", requireAuth, async (req, res) => {
  try {
    const player = await playerStorage.findByUserId(req.session.userId!);
    if (!player) return res.status(404).json({ message: "Player profile not found." });
    const registrations = await matchRegistrationStorage.listForPlayer(player.id);
    res.json({ registrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load your registrations right now." });
  }
});

// GET /api/match-registrations/:id/document — birth certificate download, owner or admin only
matchRegistrationsRouter.get("/:id/document", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid registration ID." });
  try {
    const registration = await matchRegistrationStorage.findById(id);
    if (!registration) return res.status(404).json({ message: "Registration not found." });
    if (!(await assertOwnerOrAdmin(req, registration))) {
      return res.status(403).json({ message: "You do not have permission to view this document." });
    }
    if (!registration.birthCertificateFile) {
      return res.status(404).json({ message: "No document was uploaded for this registration." });
    }
    const filePath = resolveDocumentPath(registration.birthCertificateFile);
    if (!filePath) return res.status(404).json({ message: "Document not found." });

    await auditStorage.log({
      userId: req.session.userId!,
      action: "DOCUMENT_VIEWED",
      entityType: "match_registration",
      entityId: id,
    });

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load document right now." });
  }
});

// GET /api/match-registrations — admin: registration approval queue
matchRegistrationsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const { matchId, status } = req.query;
    const registrations = await matchRegistrationStorage.listForVerification({
      matchId: matchId ? Number(matchId) : undefined,
      status: status as string | undefined,
    });
    res.json({ registrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load registrations right now." });
  }
});

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

// PATCH /api/match-registrations/:id/verify — admin accepts/rejects a registration
matchRegistrationsRouter.patch("/:id/verify", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid registration ID." });
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please provide a valid status." });
  try {
    const registration = await matchRegistrationStorage.decide(id, parsed.data.status, req.session.userId!, parsed.data.note);
    if (!registration) return res.status(404).json({ message: "Registration not found." });
    await auditStorage.log({
      userId: req.session.userId!,
      action: parsed.data.status === "VERIFIED" ? "REGISTRATION_ACCEPTED" : "REGISTRATION_REJECTED",
      entityType: "match_registration",
      entityId: id,
    });
    res.json({ message: `Registration ${parsed.data.status === "VERIFIED" ? "accepted" : "rejected"}.`, registration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update registration status right now." });
  }
});
