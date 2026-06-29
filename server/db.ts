import { and, desc, eq, gt, gte, lt, lte, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bookings,
  chatMessages,
  contacts,
  dutySchedule,
  efforts,
  InsertBooking,
  InsertEffort,
  InsertChatMessage,
  InsertContact,
  InsertDutySchedule,
  InsertRefueling,
  InsertSkiDutySchedule,
  InsertUser,
  refuelings,
  rinkStatus,
  skiDutySchedule,
  systemSettings,
  trackStatus,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

/* ----------------------------- Users ----------------------------- */

export async function getUserByEmail(email: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function countUsers(): Promise<number> {
  const db = await requireDb();
  const rows = await db.select().from(users);
  return rows.length;
}

export async function createUser(data: InsertUser) {
  const db = await requireDb();
  const result = await db
    .insert(users)
    .values({ ...data, email: data.email.toLowerCase() })
    .$returningId();
  return getUserById(result[0].id);
}

export async function touchUserSignIn(id: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function setUserPassword(id: number, passwordHash: string) {
  const db = await requireDb();
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function getUserById(id: number) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listUsers() {
  const db = await requireDb();
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function setUserRole(id: number, role: "user" | "admin") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function updateUserProfile(
  id: number,
  data: { name?: string; phone?: string }
) {
  const db = await requireDb();
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function listAdmins() {
  const db = await requireDb();
  return db.select().from(users).where(eq(users.role, "admin"));
}

/* --------------------------- Rink status -------------------------- */

export async function getRinkStatus() {
  const db = await requireDb();
  // Always use the canonical (lowest-id) row to avoid drift if duplicates exist.
  const rows = await db
    .select()
    .from(rinkStatus)
    .orderBy(rinkStatus.id)
    .limit(1);
  if (rows.length === 0) {
    await db.insert(rinkStatus).values({});
    const created = await db
      .select()
      .from(rinkStatus)
      .orderBy(rinkStatus.id)
      .limit(1);
    return created[0];
  }
  return rows[0];
}

export async function updateRinkStatus(data: {
  plogadAt?: Date | null;
  plogadBy?: string | null;
  spoladAt?: Date | null;
  spoladBy?: string | null;
  note?: string | null;
}) {
  const db = await requireDb();
  const current = await getRinkStatus();
  await db.update(rinkStatus).set(data).where(eq(rinkStatus.id, current.id));
  return getRinkStatus();
}

/* -------------------------- Duty schedule ------------------------- */

export async function listDuties(year?: number) {
  const db = await requireDb();
  if (year !== undefined) {
    return db
      .select()
      .from(dutySchedule)
      .where(eq(dutySchedule.year, year))
      .orderBy(dutySchedule.year, dutySchedule.week);
  }
  return db
    .select()
    .from(dutySchedule)
    .orderBy(dutySchedule.year, dutySchedule.week);
}

export async function getDuty(year: number, week: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(dutySchedule)
    .where(and(eq(dutySchedule.year, year), eq(dutySchedule.week, week)))
    .limit(1);
  return rows[0];
}

export async function getDutyById(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(dutySchedule)
    .where(eq(dutySchedule.id, id))
    .limit(1);
  return rows[0];
}

export async function upsertDuty(data: InsertDutySchedule) {
  const db = await requireDb();
  const existing = await getDuty(data.year, data.week);
  if (existing) {
    await db
      .update(dutySchedule)
      .set({ ...data })
      .where(eq(dutySchedule.id, existing.id));
    return getDuty(data.year, data.week);
  }
  await db.insert(dutySchedule).values(data);
  return getDuty(data.year, data.week);
}

export async function deleteDuty(id: number) {
  const db = await requireDb();
  await db.delete(dutySchedule).where(eq(dutySchedule.id, id));
}

export async function setDutyConflict(
  id: number,
  kind: "plogjour" | "spoljour",
  conflict: boolean
) {
  const db = await requireDb();
  const set =
    kind === "plogjour"
      ? { plogjourConflict: conflict }
      : { spoljourConflict: conflict };
  await db.update(dutySchedule).set(set).where(eq(dutySchedule.id, id));
  const rows = await db
    .select()
    .from(dutySchedule)
    .where(eq(dutySchedule.id, id))
    .limit(1);
  return rows[0];
}

/* --------------------------- Track status ------------------------- */

export async function getTrackStatus() {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(trackStatus)
    .orderBy(trackStatus.id)
    .limit(1);
  if (rows.length === 0) {
    await db.insert(trackStatus).values({});
    const created = await db
      .select()
      .from(trackStatus)
      .orderBy(trackStatus.id)
      .limit(1);
    return created[0];
  }
  return rows[0];
}

export async function updateTrackStatus(data: {
  dragetAt?: Date | null;
  dragetBy?: string | null;
  condition?:
    | "Mycket bra"
    | "Bra"
    | "Hyfsat"
    | "Dåligt"
    | "Ej åkbart"
    | null;
  note?: string | null;
}) {
  const db = await requireDb();
  const current = await getTrackStatus();
  await db.update(trackStatus).set(data).where(eq(trackStatus.id, current.id));
  return getTrackStatus();
}

/* -------------------------- Ski duty schedule --------------------- */

export async function listSkiDuties(year?: number) {
  const db = await requireDb();
  if (year !== undefined) {
    return db
      .select()
      .from(skiDutySchedule)
      .where(eq(skiDutySchedule.year, year))
      .orderBy(skiDutySchedule.year, skiDutySchedule.week);
  }
  return db
    .select()
    .from(skiDutySchedule)
    .orderBy(skiDutySchedule.year, skiDutySchedule.week);
}

export async function getSkiDuty(year: number, week: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(skiDutySchedule)
    .where(
      and(eq(skiDutySchedule.year, year), eq(skiDutySchedule.week, week))
    )
    .limit(1);
  return rows[0];
}

export async function getSkiDutyById(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(skiDutySchedule)
    .where(eq(skiDutySchedule.id, id))
    .limit(1);
  return rows[0];
}

export async function upsertSkiDuty(data: InsertSkiDutySchedule) {
  const db = await requireDb();
  const existing = await getSkiDuty(data.year, data.week);
  if (existing) {
    await db
      .update(skiDutySchedule)
      .set({ ...data })
      .where(eq(skiDutySchedule.id, existing.id));
    return getSkiDuty(data.year, data.week);
  }
  await db.insert(skiDutySchedule).values(data);
  return getSkiDuty(data.year, data.week);
}

export async function deleteSkiDuty(id: number) {
  const db = await requireDb();
  await db.delete(skiDutySchedule).where(eq(skiDutySchedule.id, id));
}

export async function setSkiDutyConflict(id: number, conflict: boolean) {
  const db = await requireDb();
  await db
    .update(skiDutySchedule)
    .set({ sparjourConflict: conflict })
    .where(eq(skiDutySchedule.id, id));
  const rows = await db
    .select()
    .from(skiDutySchedule)
    .where(eq(skiDutySchedule.id, id))
    .limit(1);
  return rows[0];
}

/* ----------------------------- Contacts --------------------------- */

export async function listContacts() {
  const db = await requireDb();
  return db
    .select()
    .from(contacts)
    .orderBy(contacts.sortOrder, contacts.name);
}

export async function createContact(data: InsertContact) {
  const db = await requireDb();
  const result = await db.insert(contacts).values(data).$returningId();
  return result[0];
}

export async function updateContact(id: number, data: Partial<InsertContact>) {
  const db = await requireDb();
  await db.update(contacts).set(data).where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  const db = await requireDb();
  await db.delete(contacts).where(eq(contacts.id, id));
}

/* ----------------------------- Bookings --------------------------- */

export async function listBookings(fromTime?: Date) {
  const db = await requireDb();
  if (fromTime) {
    return db
      .select()
      .from(bookings)
      .where(and(eq(bookings.status, "active"), gte(bookings.endTime, fromTime)))
      .orderBy(bookings.startTime);
  }
  return db.select().from(bookings).orderBy(bookings.startTime);
}

export async function getBooking(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return rows[0];
}

/**
 * Returns active bookings that overlap the given time range and conflict
 * by zone. "full rink" conflicts with everything; otherwise same-zone overlaps.
 */
export async function findConflictingBookings(
  startTime: Date,
  endTime: Date,
  zone: "full rink" | "one end" | "half rink",
  excludeId?: number
) {
  const db = await requireDb();
  const overlapping = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "active"),
        // overlap: existing.start < new.end AND existing.end > new.start
        // strict comparison so back-to-back slots (edge-touching) do NOT conflict
        lt(bookings.startTime, endTime),
        gt(bookings.endTime, startTime)
      )
    );
  return overlapping.filter((b) => {
    if (excludeId && b.id === excludeId) return false;
    // full rink blocks any zone; any zone blocks full rink; same zone blocks itself
    if (b.zone === "full rink" || zone === "full rink") return true;
    return b.zone === zone;
  });
}

export async function createBooking(data: InsertBooking) {
  const db = await requireDb();
  const result = await db.insert(bookings).values(data).$returningId();
  return getBooking(result[0].id);
}

export async function cancelBooking(id: number) {
  const db = await requireDb();
  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, id));
}

/* ------------------------------- Chat ----------------------------- */

export async function listChatMessages(afterId?: number, limit = 100) {
  const db = await requireDb();
  if (afterId) {
    return db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.deleted, false), gt(chatMessages.id, afterId)))
      .orderBy(chatMessages.id)
      .limit(limit);
  }
  // latest N, returned in chronological order
  const latest = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.deleted, false))
    .orderBy(desc(chatMessages.id))
    .limit(limit);
  return latest.reverse();
}

export async function createChatMessage(data: InsertChatMessage) {
  const db = await requireDb();
  const result = await db.insert(chatMessages).values(data).$returningId();
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, result[0].id))
    .limit(1);
  return rows[0];
}

export async function softDeleteChatMessage(id: number) {
  const db = await requireDb();
  await db
    .update(chatMessages)
    .set({ deleted: true })
    .where(eq(chatMessages.id, id));
}

/* ----------------------------- Efforts ---------------------------- */

export async function logEffort(data: InsertEffort) {
  const db = await requireDb();
  await db.insert(efforts).values(data);
}

/** Removes the most recent effort of a kind (used when undoing a marking). */
export async function removeLatestEffort(
  kind: "plogad" | "spolad" | "draget"
) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(efforts)
    .where(eq(efforts.kind, kind))
    .orderBy(desc(efforts.id))
    .limit(1);
  if (rows[0]) {
    await db.delete(efforts).where(eq(efforts.id, rows[0].id));
  }
}

/**
 * Aggregates effort counts per person for the given kinds since `since`.
 * Counts both the registering person and named helpers (split on comma).
 * Returns a sorted leaderboard [{ name, count }].
 */
export async function getEffortLeaderboard(
  kinds: Array<"plogad" | "spolad" | "draget">,
  since?: Date
) {
  const db = await requireDb();
  const all = await db.select().from(efforts);
  const counts = new Map<string, number>();
  for (const e of all) {
    if (!kinds.includes(e.kind as any)) continue;
    if (since && new Date(e.createdAt) < since) continue;
    const names = [e.byName, ...(e.helpers ? e.helpers.split(",") : [])]
      .map((n) => n.trim())
      .filter(Boolean);
    for (const n of names) {
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/* --------------------------- Refuelings --------------------------- */

export async function listRefuelings(
  area?: "hockeyrink" | "skidspar"
) {
  const db = await requireDb();
  if (area) {
    return db
      .select()
      .from(refuelings)
      .where(eq(refuelings.area, area))
      .orderBy(desc(refuelings.purchasedAt));
  }
  return db.select().from(refuelings).orderBy(desc(refuelings.purchasedAt));
}

export async function createRefueling(data: InsertRefueling) {
  const db = await requireDb();
  const result = await db.insert(refuelings).values(data).$returningId();
  const rows = await db
    .select()
    .from(refuelings)
    .where(eq(refuelings.id, result[0].id))
    .limit(1);
  return rows[0];
}

export async function getRefueling(id: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(refuelings)
    .where(eq(refuelings.id, id))
    .limit(1);
  return rows[0];
}

export async function deleteRefueling(id: number) {
  const db = await requireDb();
  await db.delete(refuelings).where(eq(refuelings.id, id));
}

export async function setRefuelingReimbursed(id: number, reimbursed: boolean) {
  const db = await requireDb();
  await db
    .update(refuelings)
    .set({ reimbursed, reimbursedAt: reimbursed ? new Date() : null })
    .where(eq(refuelings.id, id));
  return getRefueling(id);
}

/* -------------------------- System settings ----------------------- */

export async function getSetting(key: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, key))
    .limit(1);
  return rows[0];
}

export async function setSetting(
  key: string,
  value: string | null,
  taskUid?: string | null
) {
  const db = await requireDb();
  const existing = await getSetting(key);
  if (existing) {
    await db
      .update(systemSettings)
      .set({
        settingValue: value,
        ...(taskUid !== undefined ? { scheduleCronTaskUid: taskUid } : {}),
      })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({
      settingKey: key,
      settingValue: value,
      scheduleCronTaskUid: taskUid ?? null,
    });
  }
  return getSetting(key);
}

export async function getSettingByTaskUid(taskUid: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.scheduleCronTaskUid, taskUid))
    .limit(1);
  return rows[0];
}

// Re-export operators that routers may need.
export { and, eq, ne, or };
