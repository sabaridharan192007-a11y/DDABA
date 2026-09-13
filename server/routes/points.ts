import { Router } from "express";
import { z } from "zod";
import { pointsStorage, matchStorage, playerStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";

export const pointsRouter = Router();

const awardSchema = z.object({
  playerId: z.number().int().positive(),
  matchId: z.number().int().positive(),
  discipline: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  points: z.number().int().min(0).max(1000),
});

// POST /api/points — admin awards/updates points for one player in one match+discipline
pointsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = awardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Please provide a valid player, match, discipline, category, and points value." });
  }
  try {
    const match = await matchStorage.findById(parsed.data.matchId);
    if (!match) return res.status(404).json({ message: "Match not found." });
    const player = await playerStorage.findById(parsed.data.playerId);
    if (!player) return res.status(404).json({ message: "Player not found." });

    const year = new Date(match.date).getFullYear();

    const entry = await pointsStorage.award({
      ...parsed.data,
      year,
      enteredByUserId: req.session.userId!,
    });

    await auditStorage.log({
      userId: req.session.userId!,
      action: "MATCH_POINTS_AWARDED",
      entityType: "match_points",
      entityId: entry.id,
      metadata: parsed.data,
    });

    res.status(201).json({ message: "Points saved successfully.", entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to save points right now." });
  }
});

pointsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid points entry ID." });
  try {
    const removed = await pointsStorage.remove(id);
    if (!removed) return res.status(404).json({ message: "Points entry not found." });
    await auditStorage.log({ userId: req.session.userId!, action: "MATCH_POINTS_DELETED", entityType: "match_points", entityId: id });
    res.json({ message: "Points entry removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to remove points right now." });
  }
});

// GET /api/points/recent — admin activity feed
pointsRouter.get("/recent", requireAdmin, async (req, res) => {
  try {
    const entries = await pointsStorage.recentEntries(30);
    res.json({ entries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load recent entries right now." });
  }
});

// GET /api/points/player/:id — public: a player's full match-by-match points history
pointsRouter.get("/player/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid player ID." });
  try {
    const { discipline, year } = req.query;
    const history = await pointsStorage.historyForPlayer(id, {
      discipline: discipline as string | undefined,
      year: year ? Number(year) : undefined,
    });
    res.json({ history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load points history right now." });
  }
});
