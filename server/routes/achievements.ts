import { Router } from "express";
import { z } from "zod";
import { achievementStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";

export const achievementsRouter = Router();

achievementsRouter.get("/", async (req, res) => {
  try {
    const playerId = req.query.playerId ? Number(req.query.playerId) : undefined;
    const items = await achievementStorage.list(playerId);
    res.json({ achievements: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load achievements right now." });
  }
});

const achievementSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  playerId: z.number().int().nullable().optional(),
  tournament: z.string().max(255).optional(),
  year: z.number().int().optional(),
  type: z.enum(["STATE", "NATIONAL", "INTERNATIONAL", "ASSOCIATION"]).optional(),
  medal: z.string().max(50).optional(),
  image: z
    .string()
    .trim()
    .max(3_000_000)
    .optional()
    .refine(
      (value) => value == null || /^https?:\/\//i.test(value) || /^data:image\/(?:jpeg|png);base64,[a-z0-9+/]+=*$/i.test(value),
      "Please provide a valid JPG or PNG image."
    ),
});

achievementsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = achievementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please complete all required fields." });
  try {
    const item = await achievementStorage.create(parsed.data);
    await auditStorage.log({ userId: req.session.userId!, action: "ACHIEVEMENT_CREATED", entityType: "achievement", entityId: item.id });
    res.status(201).json({ message: "Achievement added successfully.", achievement: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to add achievement right now." });
  }
});

achievementsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = achievementSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please provide valid details." });
  try {
    const item = await achievementStorage.update(Number(req.params.id), parsed.data);
    if (!item) return res.status(404).json({ message: "Achievement not found." });
    await auditStorage.log({ userId: req.session.userId!, action: "ACHIEVEMENT_UPDATED", entityType: "achievement", entityId: item.id });
    res.json({ message: "Achievement updated successfully.", achievement: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update achievement right now." });
  }
});

achievementsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await achievementStorage.remove(Number(req.params.id));
    await auditStorage.log({ userId: req.session.userId!, action: "ACHIEVEMENT_DELETED", entityType: "achievement", entityId: Number(req.params.id) });
    res.json({ message: "Achievement removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to remove achievement right now." });
  }
});
