import { ZipArchive } from "archiver";
import type { Express, Request, Response } from "express";
import { authenticateRequest } from "./auth";
import * as db from "../db";

const AREAS = ["hockeyrink", "skidspar"] as const;
type Area = (typeof AREAS)[number];

function parseArea(req: Request): Area | null {
  const a = req.query.area;
  return a === "hockeyrink" || a === "skidspar" ? a : null;
}

/** Optional period filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). */
function parsePeriod(req: Request): { from?: Date; to?: Date } {
  const fromStr = typeof req.query.from === "string" ? req.query.from : "";
  const toStr = typeof req.query.to === "string" ? req.query.to : "";
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(`${toStr}T23:59:59`) : undefined;
  return {
    from: from && !isNaN(from.getTime()) ? from : undefined,
    to: to && !isNaN(to.getTime()) ? to : undefined,
  };
}

function inPeriod(date: Date, from?: Date, to?: Date): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const AREA_LABEL: Record<Area, string> = {
  hockeyrink: "Hockeyrink",
  skidspar: "Skidspår",
};

const PAYMENT_LABEL_EXPORT: Record<string, string> = {
  tankkort_abk: "Tankkort ABK",
  egen: "Egen betalning",
};

/**
 * Registers auditor-facing export endpoints (login required):
 *  - GET /api/refuelings/export.csv?area=...   → CSV of all refuelings
 *  - GET /api/refuelings/receipts.zip?area=... → ZIP of all receipt images
 */
export function registerRefuelExport(app: Express) {
  app.get("/api/refuelings/export.csv", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ error: "Inloggning krävs." });
      const area = parseArea(req);
      const { from, to } = parsePeriod(req);
      const rows = (await db.listRefuelings(area ?? undefined)).filter((r) =>
        inPeriod(new Date(r.purchasedAt), from, to)
      );

      const header = [
        "Datum",
        "Område",
        "Ansvarig",
        "Belopp (kr)",
        "Liter",
        "Betalsätt",
        "Återbetald",
        "Notering",
        "Kvitto-URL",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push(
          [
            csvCell(new Date(r.purchasedAt).toLocaleDateString("sv-SE")),
            csvCell(AREA_LABEL[r.area as Area]),
            csvCell(r.responsibleName),
            csvCell((r.amountOre / 100).toFixed(2)),
            csvCell(r.litresCenti != null ? (r.litresCenti / 100).toFixed(2) : ""),
            csvCell(r.paymentMethod === "tankkort_abk" ? "Tankkort ABK" : "Egen betalning"),
            csvCell(
              r.paymentMethod === "egen"
                ? r.reimbursed
                  ? "Ja"
                  : "Nej"
                : "-"
            ),
            csvCell(r.note ?? ""),
            csvCell(r.receiptUrl ?? ""),
          ].join(",")
        );
      }
      const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel + å/ä/ö

      const suffix = area ? `-${area}` : "";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tankningar${suffix}.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error("[RefuelExport] CSV failed:", error);
      res.status(500).json({ error: "Export misslyckades." });
    }
  });

  app.get("/api/refuelings/receipts.zip", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ error: "Inloggning krävs." });
      const area = parseArea(req);
      const { from, to } = parsePeriod(req);
      const rows = (await db.listRefuelings(area ?? undefined)).filter(
        (r) => r.receiptUrl && inPeriod(new Date(r.purchasedAt), from, to)
      );

      const suffix = area ? `-${area}` : "";
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="kvitton${suffix}.zip"`
      );

      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.on("error", (err: Error) => {
        console.error("[RefuelExport] ZIP error:", err);
        try {
          res.status(500).end();
        } catch {
          /* noop */
        }
      });
      archive.pipe(res);

      // Build an absolute URL for relative /uploads paths.
      const origin = `${req.protocol}://${req.get("host")}`;

      for (const r of rows) {
        if (!r.receiptUrl) continue;
        const url = r.receiptUrl.startsWith("/")
          ? `${origin}${r.receiptUrl}`
          : r.receiptUrl;
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const buf = Buffer.from(await resp.arrayBuffer());
          const date = new Date(r.purchasedAt).toISOString().slice(0, 10);
          const ext = url.split(".").pop()?.split("?")[0] || "img";
          const safeName = `${date}_${r.responsibleName.replace(/[^\w]+/g, "-")}_${(r.amountOre / 100).toFixed(0)}kr_id${r.id}.${ext}`;
          archive.append(buf, { name: safeName });
        } catch (e) {
          console.warn("[RefuelExport] could not fetch receipt", url, e);
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error("[RefuelExport] ZIP failed:", error);
      try {
        res.status(500).json({ error: "Export misslyckades." });
      } catch {
        /* noop */
      }
    }
  });

  // ---- Other expenses (övriga utlägg) ----

  app.get("/api/expenses/export.csv", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ error: "Inloggning krävs." });
      const area = parseArea(req);
      const { from, to } = parsePeriod(req);
      const rows = (await db.listExpenses(area ?? undefined)).filter((r) =>
        inPeriod(new Date(r.purchasedAt), from, to)
      );
      const header = [
        "Datum",
        "Område",
        "Ansvarig",
        "Kategori",
        "Belopp (kr)",
        "Betalsätt",
        "Återbetald",
        "Notering",
        "Kvitto-URL",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push(
          [
            csvCell(new Date(r.purchasedAt).toLocaleDateString("sv-SE")),
            csvCell(AREA_LABEL[r.area as Area]),
            csvCell(r.responsibleName),
            csvCell(r.category ?? ""),
            csvCell((r.amountOre / 100).toFixed(2)),
            csvCell(PAYMENT_LABEL_EXPORT[r.paymentMethod]),
            csvCell(
              r.paymentMethod === "egen" ? (r.reimbursed ? "Ja" : "Nej") : "-"
            ),
            csvCell(r.note ?? ""),
            csvCell(r.receiptUrl ?? ""),
          ].join(",")
        );
      }
      const csv = "\uFEFF" + lines.join("\n");
      const suffix = area ? `-${area}` : "";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ovriga-utlagg${suffix}.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error("[ExpenseExport] CSV failed:", error);
      res.status(500).json({ error: "Export misslyckades." });
    }
  });

  app.get("/api/expenses/receipts.zip", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ error: "Inloggning krävs." });
      const area = parseArea(req);
      const { from, to } = parsePeriod(req);
      const rows = (await db.listExpenses(area ?? undefined)).filter(
        (r) => r.receiptUrl && inPeriod(new Date(r.purchasedAt), from, to)
      );
      const suffix = area ? `-${area}` : "";
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ovriga-utlagg-kvitton${suffix}.zip"`
      );
      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.on("error", (err: Error) => {
        console.error("[ExpenseExport] ZIP error:", err);
        try {
          res.status(500).end();
        } catch {
          /* noop */
        }
      });
      archive.pipe(res);
      const origin = `${req.protocol}://${req.get("host")}`;
      for (const r of rows) {
        if (!r.receiptUrl) continue;
        const url = r.receiptUrl.startsWith("/")
          ? `${origin}${r.receiptUrl}`
          : r.receiptUrl;
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const buf = Buffer.from(await resp.arrayBuffer());
          const date = new Date(r.purchasedAt).toISOString().slice(0, 10);
          const ext = url.split(".").pop()?.split("?")[0] || "img";
          const safeName = `${date}_${r.responsibleName.replace(/[^\w]+/g, "-")}_${(r.amountOre / 100).toFixed(0)}kr_id${r.id}.${ext}`;
          archive.append(buf, { name: safeName });
        } catch (e) {
          console.warn("[ExpenseExport] could not fetch receipt", url, e);
        }
      }
      await archive.finalize();
    } catch (error) {
      console.error("[ExpenseExport] ZIP failed:", error);
      try {
        res.status(500).json({ error: "Export misslyckades." });
      } catch {
        /* noop */
      }
    }
  });
}
