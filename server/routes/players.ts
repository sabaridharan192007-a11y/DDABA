import { Router } from "express";
import { z } from "zod";
import { playerStorage, statsStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";
import { generateUniquePlayerId } from "../services/playerId";

export const playersRouter = Router();

playersRouter.get("/", async (req, res) => {
  try {
    const { search, club, area, category, status, page, pageSize } = req.query;
    const results = await playerStorage.listPublic({
      search: search as string,
      club: club as string,
      area: area as string,
      category: category as string,
      status: (status as string) || (req.session.role === "ADMIN" ? undefined : "ACTIVE"),
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ players: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load player data." });
  }
});

playersRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid player ID." });
  try {
    const player = await playerStorage.findPublicById(id);
    if (!player || (player.status !== "ACTIVE" && req.session.role !== "ADMIN")) {
      return res.status(404).json({ message: "Player not found." });
    }
    const stats = await statsStorage.getByPlayerId(player.id);
    res.json({ player, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load player data." });
  }
});

const updatePlayerSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().max(20).optional(),
  club: z.string().trim().max(255).optional(),
  category: z.string().trim().max(100).optional(),
  area: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  profileImage: z.string().max(6_000_000).optional(),
});

playersRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid player ID." });
  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please complete all required fields." });
  try {
    const player = await playerStorage.update(id, parsed.data);
    if (!player) return res.status(404).json({ message: "Player not found." });
    await auditStorage.log({
      userId: req.session.userId!,
      action: "PLAYER_UPDATED",
      entityType: "player",
      entityId: id,
    });
    res.json({ message: "Player updated successfully.", player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update player right now." });
  }
});

playersRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid player ID." });
  const schema = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status value." });

  try {
    const player = await playerStorage.setStatus(id, parsed.data.status);
    if (!player) return res.status(404).json({ message: "Player not found." });
    await auditStorage.log({
      userId: req.session.userId!,
      action: parsed.data.status === "ACTIVE" ? "PLAYER_REACTIVATED" : "PLAYER_DEACTIVATED",
      entityType: "player",
      entityId: id,
    });
    res.json({ message: "Player status updated successfully.", player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update player status right now." });
  }
});

playersRouter.get("/:id/stats", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid player ID." });
  try {
    const stats = await statsStorage.getByPlayerId(id);
    if (!stats) return res.status(404).json({ message: "Statistics not found." });
    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load statistics right now." });
  }
});

const updateStatsSchema = z.object({
  matchesPlayed: z.number().int().min(0).max(100000).optional(),
  wins: z.number().int().min(0).max(100000).optional(),
  losses: z.number().int().min(0).max(100000).optional(),
  goals: z.number().int().min(0).max(100000).optional(),
  assists: z.number().int().min(0).max(100000).optional(),
  awards: z.number().int().min(0).max(100000).optional(),
});

// Only admins may modify official statistics — no player-facing route exists for this.
playersRouter.put("/:id/stats", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid player ID." });
  const parsed = updateStatsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Please provide valid statistic values." });
  }
  try {
    const stats = await statsStorage.update(id, parsed.data);
    if (!stats) return res.status(404).json({ message: "Player statistics not found." });
    await auditStorage.log({
      userId: req.session.userId!,
      action: "STATS_UPDATED",
      entityType: "player",
      entityId: id,
      metadata: parsed.data,
    });
    res.json({ message: "Statistics updated successfully.", stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update statistics right now." });
  }
});

const createPlayerSchema = z.object({
  userId: z.number().int(),
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().max(20).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  club: z.string().trim().max(255).optional(),
  category: z.string().trim().max(100).optional(),
  area: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  profileImage: z.string().max(6_000_000).optional(),
});

playersRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please complete all required fields." });
  try {
    const player = await playerStorage.create({
      ...parsed.data,
      playerId: await generateUniquePlayerId(),
    });
    await auditStorage.log({
      userId: req.session.userId!,
      action: "PLAYER_CREATED",
      entityType: "player",
      entityId: player.id,
    });
    res.status(201).json({ message: "Player added successfully.", player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to add player right now." });
  }
});
