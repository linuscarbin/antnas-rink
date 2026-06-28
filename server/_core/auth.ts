import bcrypt from "bcryptjs";
import { parse as parseCookie } from "cookie";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createSessionToken(userId: number): string {
  return jwt.sign({ uid: userId }, ENV.cookieSecret, {
    expiresIn: SESSION_TTL_SECONDS,
  });
}

export function verifySessionToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, ENV.cookieSecret) as { uid?: number };
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

/** Reads the session cookie (or Bearer token) and resolves the user. */
export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookie(req.headers.cookie ?? "");
  let token = cookies[COOKIE_NAME];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;

  const userId = verifySessionToken(token);
  if (!userId) return null;

  const user = await db.getUserById(userId);
  return user ?? null;
}

export { SESSION_TTL_SECONDS };
