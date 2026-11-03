import { TRPCError } from "@trpc/server";
import * as db from "../db";

export type Area = "hockeyrink" | "skidspar";

export type AccessUser = { id: number; role: "user" | "admin" };

/** Areas the user may act as functionary for (admins: all). */
export async function functionaryAreas(
  user: AccessUser | null | undefined
): Promise<{ hockeyrink: boolean; skidspar: boolean }> {
  if (!user) return { hockeyrink: false, skidspar: false };
  if (user.role === "admin") return { hockeyrink: true, skidspar: true };
  return db.getDutyAreas(user.id);
}

export async function isFunctionaryFor(
  user: AccessUser | null | undefined,
  area: Area
): Promise<boolean> {
  return (await functionaryAreas(user))[area];
}

const AREA_LABEL: Record<Area, string> = {
  hockeyrink: "plog- eller spoljouren",
  skidspar: "spårjouren",
};

/** Throws FORBIDDEN unless the user is admin or on duty for the area. */
export async function assertFunctionary(
  user: AccessUser | null | undefined,
  area: Area
): Promise<void> {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Logga in först." });
  }
  if (!(await isFunctionaryFor(user, area))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Bara de som är inlagda i ${AREA_LABEL[area]} (eller admin) kan göra detta.`,
    });
  }
}
