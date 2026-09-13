import { Router } from "express";
import { z } from "zod";
import { pointsStorage, overviewStorage, siteContentStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";

export const rankingsRouter = Router();

const rankingsQuerySchema = z.object({
  discipline: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(2000).max(2100),
  area: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
});

// GET /api/rankings?discipline=AEROSKATOBALL&year=2026&area=Palani&category=UNDER_14
// area omitted = district-wide (all of Dindigul) ranking for that discipline/year/category.
rankingsRouter.get("/", async (req, res) => {
  const parsed = rankingsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Please provide at least a discipline and year." });
  }
  try {
    const rankings = await pointsStorage.rankings(parsed.data);
    res.json({ rankings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load rankings right now." });
  }
});

export const overviewRouter = Router();

export const publicContentRouter = Router();

publicContentRouter.get("/site-content", async (_req, res) => {
  try {
    const content = await siteContentStorage.getPublic();
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load site content right now." });
  }
});

overviewRouter.put("/site-content", requireAdmin, async (req, res) => {
  const { aboutTitle, mission, vision, objectives, developmentText, affiliationText, contactEmail, contactPhone, facebookUrl, youtubeUrl } = req.body;
  if (
    typeof aboutTitle !== "string" ||
    typeof mission !== "string" ||
    typeof vision !== "string" ||
    !Array.isArray(objectives) ||
    objectives.some((item: unknown) => typeof item !== "string") ||
    typeof developmentText !== "string" ||
    typeof affiliationText !== "string" ||
    typeof contactEmail !== "string" ||
    typeof contactPhone !== "string" ||
    typeof facebookUrl !== "string" ||
    typeof youtubeUrl !== "string"
  ) {
    return res.status(400).json({ message: "Please provide valid About page content." });
  }
  try {
    const content = await siteContentStorage.update({
      aboutTitle: aboutTitle.trim().slice(0, 255),
      mission: mission.trim(),
      vision: vision.trim(),
      objectives: objectives.map((item: string) => item.trim()).filter(Boolean),
      developmentText: developmentText.trim(),
      affiliationText: affiliationText.trim(),
      contactEmail: contactEmail.trim().slice(0, 255),
      contactPhone: contactPhone.trim().slice(0, 30),
      facebookUrl: facebookUrl.trim().slice(0, 1000),
      youtubeUrl: youtubeUrl.trim().slice(0, 1000),
    });
    await auditStorage.log({ userId: req.session.userId!, action: "SITE_CONTENT_UPDATED", entityType: "site_content", entityId: content.id });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update site content right now." });
  }
});

overviewRouter.get("/overview", requireAdmin, async (req, res) => {
  try {
    const stats = await overviewStorage.stats();
    res.json({ overview: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load dashboard overview right now." });
  }
});
