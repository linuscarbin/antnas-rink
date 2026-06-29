import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { authenticateRequest } from "./auth";
import { ENV } from "./env";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB raw upload cap

function ensureUploadDir(): string {
  let dir = ENV.uploadDir;
  try {
    fs.mkdirSync(dir, { recursive: true });
    // verify writable
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    // Fallback to a local folder if the configured dir is not writable.
    dir = path.resolve("./uploads");
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

/**
 * Registers:
 *  - GET /uploads/* : serves stored images
 *  - POST /api/upload : authenticated image upload (returns { url })
 */
export function registerUploads(app: Express) {
  const dir = ensureUploadDir();

  // Serve uploaded files (immutable-ish; filenames are unique).
  app.use(
    "/uploads",
    express.static(dir, {
      maxAge: "7d",
      fallthrough: true,
    })
  );

  app.post(
    "/api/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const user = await authenticateRequest(req);
        if (!user) {
          return res.status(401).json({ error: "Inloggning krävs." });
        }
        if (!req.file) {
          return res.status(400).json({ error: "Ingen fil." });
        }
        if (!req.file.mimetype.startsWith("image/")) {
          return res.status(400).json({ error: "Endast bilder tillåts." });
        }

        // Re-encode + downscale to a sane size as webp to strip metadata and cap size.
        const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
        const outPath = path.join(dir, filename);
        await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(outPath);

        return res.json({ url: `/uploads/${filename}` });
      } catch (error) {
        console.error("[Upload] failed:", error);
        return res.status(500).json({ error: "Uppladdning misslyckades." });
      }
    }
  );
}
