import { Router } from "express";
import { z } from "zod";
import { announcementStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";

export const announcementsRouter = Router();

// Public visitors only see published announcements; admins (via ?all=true) see everything.
announcementsRouter.get("/", async (req, res) => {
  try {
    const showAll = req.query.all === "true" && req.session.role === "ADMIN";
    const items = await announcementStorage.list(!showAll);
    res.json({ announcements: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load announcements right now." });
  }
});

const announcementSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().min(1),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).optional(),
  matchId: z.number().int().nullable().optional(),
  published: z.boolean().optional(),
});

announcementsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please complete all required fields." });
  try {
    const item = await announcementStorage.create(parsed.data);
    await auditStorage.log({ userId: req.session.userId!, action: "ANNOUNCEMENT_CREATED", entityType: "announcement", entityId: item.id });
    res.status(201).json({ message: "Announcement created successfully.", announcement: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to create announcement right now." });
  }
});

announcementsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = announcementSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please provide valid details." });
  try {
    const item = await announcementStorage.update(Number(req.params.id), parsed.data);
    if (!item) return res.status(404).json({ message: "Announcement not found." });
    await auditStorage.log({ userId: req.session.userId!, action: "ANNOUNCEMENT_UPDATED", entityType: "announcement", entityId: item.id });
    res.json({ message: "Announcement updated successfully.", announcement: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update announcement right now." });
  }
});

announcementsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await announcementStorage.remove(Number(req.params.id));
    await auditStorage.log({ userId: req.session.userId!, action: "ANNOUNCEMENT_DELETED", entityType: "announcement", entityId: Number(req.params.id) });
    res.json({ message: "Announcement removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to remove announcement right now." });
  }
});
