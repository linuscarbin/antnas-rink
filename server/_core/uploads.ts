import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { authenticateRequest } from "./auth";
import { ENV } from "./env";
import { isR2Configured, uploadToR2 } from "./r2";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB raw upload cap

function ensureUploadDir(): string {
  let dir = ENV.uploadDir;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
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
 *  - GET /uploads/* : serves disk-stored images (used only when R2 is off)
 *  - POST /api/upload : authenticated image upload -> R2 (or disk fallback)
 */
export function registerUploads(app: Express) {
  const dir = ensureUploadDir();

  // Disk fallback serving (no-op effect when R2 is used).
  app.use(
    "/uploads",
    express.static(dir, { maxAge: "7d", fallthrough: true })
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

        // Re-encode + downscale as webp (strips metadata, caps size).
        const webp = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();

        const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;

        // Prefer Cloudflare R2 when configured; otherwise store on disk.
        if (isR2Configured()) {
          const url = await uploadToR2(
            `board/${filename}`,
            webp,
            "image/webp"
          );
          return res.json({ url });
        }

        const outPath = path.join(dir, filename);
        await fs.promises.writeFile(outPath, webp);
        return res.json({ url: `/uploads/${filename}` });
      } catch (error) {
        console.error("[Upload] failed:", error);
        return res.status(500).json({ error: "Uppladdning misslyckades." });
      }
    }
  );
}
