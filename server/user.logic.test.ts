import { describe, expect, it } from "vitest";
import { displayName, isEmail, normalizePhone, parseMemberLines, whatsappNumber } from "../shared/user";

describe("normalizePhone", () => {
  it("treats Swedish formats as the same number", () => {
    for (const v of ["070-123 45 67", "0701234567", "+46 70 123 45 67", "46701234567", "0046701234567", "(070) 123-45-67"]) {
      expect(normalizePhone(v)).toBe("+46701234567");
    }
  });
  it("rejects things that aren't phone numbers", () => {
    expect(normalizePhone("lisa@test.se")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
  it("gives digits for wa.me links", () => {
    expect(whatsappNumber("070-123 45 67")).toBe("46701234567");
  });
});

describe("login identifier", () => {
  it("recognizes e-mail", () => {
    expect(isEmail("Lisa@Test.se")).toBe(true);
    expect(isEmail("0701234567")).toBe(false);
  });
});

describe("parseMemberLines (pasted from WhatsApp)", () => {
  it("splits name and phone in common formats", () => {
    const r = parseMemberLines("Lisa Andersson 070-123 45 67\nOlle Berg, 0709876543\n\nKalle +46 70 111 22 33\nBara namn");
    expect(r.map((x) => [x.name, x.phone])).toEqual([
      ["Lisa Andersson", "+46701234567"],
      ["Olle Berg", "+46709876543"],
      ["Kalle", "+46701112233"],
      ["Bara namn", null],
    ]);
  });
});

describe("displayName", () => {
  it("falls back to e-mail, then phone", () => {
    expect(displayName({ name: "Lisa" })).toBe("Lisa");
    expect(displayName({ name: null, email: "a@b.se" })).toBe("a@b.se");
    expect(displayName({ name: " ", phone: "+46701234567" })).toBe("+46701234567");
  });
});

import { formatPhone } from "../shared/user";
describe("formatPhone", () => {
  it("shows Swedish mobile numbers the usual way", () => {
    expect(formatPhone("+46734445566")).toBe("073-444 55 66");
    expect(formatPhone("0701234567")).toBe("070-123 45 67");
    expect(formatPhone("+4792345678")).toBe("+4792345678");
    expect(formatPhone(null)).toBe("");
  });
});

describe("parseMemberLines – number only", () => {
  it("accepts lines with just a phone number (name filled in later)", () => {
    expect(parseMemberLines("070-111 22 33\n+46 70 444 55 66").map((x) => [x.name, x.phone])).toEqual([
      ["", "+46701112233"],
      ["", "+46704445566"],
    ]);
  });
});
