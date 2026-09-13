import { Router } from "express";
import { z } from "zod";
import { matchStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";
import { DISCIPLINES } from "../../shared/schema/schema";

export const matchesRouter = Router();

matchesRouter.get("/", async (req, res) => {
  try {
    const matches = await matchStorage.list(req.query.status as string | undefined);
    res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load matches right now." });
  }
});

matchesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid match ID." });
  try {
    const match = await matchStorage.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found." });
    res.json({ match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load match right now." });
  }
});

const matchSchema = z.object({
  tournamentName: z.string().trim().min(2).max(255),
  title: z.string().trim().min(2).max(255),
  discipline: z.string().trim().min(1).max(100),
  date: z.string(),
  time: z.string(),
  venue: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  teamA: z.string().trim().min(1).max(255),
  teamB: z.string().trim().min(1).max(255),
  scoreA: z.number().int().nullable().optional(),
  scoreB: z.number().int().nullable().optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  // --- registration settings, admin-configurable per match ---
  maxDisciplinesPerRegistration: z.number().int().min(1).max(DISCIPLINES.length).optional(),
  requireBirthCertificate: z.boolean().optional(),
});

matchesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = matchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please complete all required fields." });
  try {
    const match = await matchStorage.create(parsed.data as any);
    await auditStorage.log({ userId: req.session.userId!, action: "MATCH_CREATED", entityType: "match", entityId: match.id });
    res.status(201).json({ message: "Match created successfully.", match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to create match right now." });
  }
});

matchesRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid match ID." });
  const parsed = matchSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please provide valid match details." });
  try {
    const match = await matchStorage.update(id, parsed.data as any);
    if (!match) return res.status(404).json({ message: "Match not found." });
    await auditStorage.log({ userId: req.session.userId!, action: "MATCH_UPDATED", entityType: "match", entityId: id });
    res.json({ message: "Match updated successfully.", match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update match right now." });
  }
});

// PATCH /api/matches/:id/registration-status — release or close registration for this match
matchesRouter.patch("/:id/registration-status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid match ID." });
  const schema = z.object({ released: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid value." });
  try {
    const match = await matchStorage.setRegistrationReleased(id, parsed.data.released);
    if (!match) return res.status(404).json({ message: "Match not found." });
    await auditStorage.log({
      userId: req.session.userId!,
      action: parsed.data.released ? "MATCH_REGISTRATION_RELEASED" : "MATCH_REGISTRATION_CLOSED",
      entityType: "match",
      entityId: id,
    });
    res.json({ message: `Registration ${parsed.data.released ? "released" : "closed"} successfully.`, match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update registration status right now." });
  }
});

matchesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid match ID." });
  try {
    await matchStorage.remove(id);
    await auditStorage.log({ userId: req.session.userId!, action: "MATCH_DELETED", entityType: "match", entityId: id });
    res.json({ message: "Match removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to remove match right now." });
  }
});
