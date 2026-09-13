import { Router } from "express";
import { z } from "zod";
import { registrationPermissionStorage, auditStorage } from "../storage";
import { requireAdmin } from "../middleware/auth";

export const registrationPermissionsRouter = Router();

// GET /api/registration-permissions — public: full list of area/institution rules
registrationPermissionsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const permissions = await registrationPermissionStorage.list();
    res.json({ permissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load registration permissions right now." });
  }
});

// GET /api/registration-permissions/check?area=X&institution=Y — public: resolved open/closed status
registrationPermissionsRouter.get("/check", async (req, res) => {
  const { area, institution } = req.query;
  if (!area || typeof area !== "string") {
    return res.status(400).json({ message: "Please provide an area." });
  }
  try {
    const isOpen = await registrationPermissionStorage.isOpenFor(area, institution as string | undefined);
    res.json({ isOpen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to check registration status right now." });
  }
});

const addSchema = z.object({
  area: z.string().trim().min(2).max(100),
  institution: z.string().trim().min(2).max(255).optional(),
  isOpen: z.boolean(),
  note: z.string().max(500).optional(),
});

// POST /api/registration-permissions — admin only: add (or update) an area/institution rule
registrationPermissionsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Please provide a valid area and status." });
  try {
    const row = await registrationPermissionStorage.add({
      area: parsed.data.area,
      institution: parsed.data.institution || null,
      isOpen: parsed.data.isOpen,
      note: parsed.data.note,
      createdByUserId: req.session.userId!,
    });
    await auditStorage.log({
      userId: req.session.userId!,
      action: parsed.data.isOpen ? "REGISTRATION_PERMISSION_OPENED" : "REGISTRATION_PERMISSION_CLOSED",
      entityType: "registration_permission",
      entityId: row.id,
      metadata: { area: parsed.data.area, institution: parsed.data.institution ?? null },
    });
    res.status(201).json({ message: "Registration permission saved successfully.", permission: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to save registration permission right now." });
  }
});

// DELETE /api/registration-permissions/:id — admin only: remove a rule entirely
registrationPermissionsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid ID." });
  try {
    await registrationPermissionStorage.remove(id);
    await auditStorage.log({ userId: req.session.userId!, action: "REGISTRATION_PERMISSION_REMOVED", entityType: "registration_permission", entityId: id });
    res.json({ message: "Registration permission removed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to remove registration permission right now." });
  }
});
