import { Router } from "express";
import { z } from "zod";
import { newsStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";

export const newsRouter = Router();

newsRouter.get("/", async (req, res) => {
  try {
    const showAll = req.query.all === "true" && req.session.role === "ADMIN";
    const items = await newsStorage.list(!showAll);
    res.json({ news: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load news right now." });
  }
});

newsRouter.get("/:id", async (req, res) => {
  try {
    const item = await newsStorage.findById(Number(req.params.id));
    if (!item || (!item.published && req.session.role !== "ADMIN")) {
      return res.status(404).json({ message: "Article not found." });
    }
    res.json({ article: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load article right now." });
  }
});

const mediaUrl = (kind: "image" | "video") =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .trim()
      .max(2_000)
      .nullable()
      .optional()
      .refine(
        (value) =>
          value == null ||
          (kind === "image" && value.startsWith("data:image/")) ||
          /^https?:\/\//i.test(value),
        `Please provide a valid ${kind} URL.`
      )
  );

const newsSchema = z.object({
  title: z.string().min(2).max(255),
  summary: z.string().min(1),
  content: z.string().min(1),
  image: mediaUrl("image"),
  videoUrl: mediaUrl("video"),
  author: z.string().max(255).optional(),
  category: z
    .enum(["TOURNAMENT", "ACHIEVEMENT", "PLAYER", "ASSOCIATION", "ANNOUNCEMENT", "GENERAL"])
    .optional(),
  published: z.boolean().optional(),
});

newsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = newsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please complete all required fields." });
  try {
    const data = { ...parsed.data, publishedAt: parsed.data.published ? new Date() : null };
    const item = await newsStorage.create(data as any);
    await auditStorage.log({ userId: req.session.userId!, action: "NEWS_CREATED", entityType: "news", entityId: item.id });
    res.status(201).json({ message: "News article created successfully.", article: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to create article right now." });
  }
});

newsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = newsSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please provide valid details." });
  try {
    const data: any = { ...parsed.data };
    if (parsed.data.published === true) data.publishedAt = new Date();
    if (parsed.data.published === false) data.publishedAt = null;
    const item = await newsStorage.update(Number(req.params.id), data);
    if (!item) return res.status(404).json({ message: "Article not found." });
    await auditStorage.log({ userId: req.session.userId!, action: "NEWS_UPDATED", entityType: "news", entityId: item.id });
    res.json({ message: "News article updated successfully.", article: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update article right now." });
  }
});

newsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const removed = await newsStorage.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ message: "Article not found." });
    await auditStorage.log({ userId: req.session.userId!, action: "NEWS_DELETED", entityType: "news", entityId: Number(req.params.id) });
    res.json({ message: "News article removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to remove article right now." });
  }
});
