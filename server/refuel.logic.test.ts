import { describe, expect, it } from "vitest";

type R = {
  amountOre: number;
  paymentMethod: "tankkort_abk" | "egen";
  reimbursed: boolean;
};

function summarize(rows: R[]) {
  let totalOre = 0;
  let toReimburseOre = 0;
  for (const r of rows) {
    totalOre += r.amountOre;
    if (r.paymentMethod === "egen" && !r.reimbursed) toReimburseOre += r.amountOre;
  }
  return { totalSek: totalOre / 100, toReimburseSek: toReimburseOre / 100 };
}

describe("refueling summary", () => {
  it("sums total and 'to reimburse' for own unpaid expenses", () => {
    const rows: R[] = [
      { amountOre: 45000, paymentMethod: "tankkort_abk", reimbursed: false },
      { amountOre: 20000, paymentMethod: "egen", reimbursed: false },
      { amountOre: 10000, paymentMethod: "egen", reimbursed: true },
    ];
    const s = summarize(rows);
    expect(s.totalSek).toBe(750);
    expect(s.toReimburseSek).toBe(200);
  });

  it("returns zero reimbursement when only ABK card is used", () => {
    const rows: R[] = [
      { amountOre: 30000, paymentMethod: "tankkort_abk", reimbursed: false },
    ];
    expect(summarize(rows).toReimburseSek).toBe(0);
  });

  it("stores amounts as öre to avoid float drift", () => {
    // 12.10 + 0.20 kr should be exactly 12.30
    const rows: R[] = [
      { amountOre: 1210, paymentMethod: "tankkort_abk", reimbursed: false },
      { amountOre: 20, paymentMethod: "tankkort_abk", reimbursed: false },
    ];
    expect(summarize(rows).totalSek).toBe(12.3);
  });
});

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

describe("CSV cell escaping", () => {
  it("quotes values with commas and escapes quotes", () => {
    expect(csvCell("Bensin, diesel")).toBe('"Bensin, diesel"');
    expect(csvCell('Han sa "hej"')).toBe('"Han sa ""hej"""');
    expect(csvCell("Enkel")).toBe("Enkel");
    expect(csvCell(null)).toBe("");
  });
});
