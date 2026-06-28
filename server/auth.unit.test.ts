import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "./_core/auth";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("supersecret123");
    expect(hash).not.toBe("supersecret123");
    expect(await verifyPassword("supersecret123", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("supersecret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("session token", () => {
  it("round-trips a user id", () => {
    const token = createSessionToken(42);
    expect(verifySessionToken(token)).toBe(42);
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken(42) + "tampered";
    expect(verifySessionToken(token)).toBeNull();
  });
});
