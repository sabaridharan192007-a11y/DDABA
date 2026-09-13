import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

// Stored outside client/public and outside anything express.static ever
// serves — the only way to retrieve a file is through the authenticated,
// ownership-checked download route in routes/matchRegistrations.ts.
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads/documents");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Never trust the client-supplied filename — generate our own, keeping
    // only a safe extension derived from the verified mimetype.
    const ext = file.mimetype === "application/pdf" ? ".pdf" : file.mimetype === "image/png" ? ".png" : ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const documentUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or PDF files are allowed."));
    }
    cb(null, true);
  },
});

/** Resolves a stored filename to an absolute path, guarding against path traversal. */
export function resolveDocumentPath(filename: string): string | null {
  const safe = path.basename(filename); // strips any ../ or path separators
  const full = path.join(UPLOAD_DIR, safe);
  if (!full.startsWith(UPLOAD_DIR)) return null;
  if (!fs.existsSync(full)) return null;
  return full;
}

export function deleteDocument(filename: string) {
  const full = resolveDocumentPath(filename);
  if (full) fs.unlinkSync(full);
}
