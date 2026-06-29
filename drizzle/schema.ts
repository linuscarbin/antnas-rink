import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Email is the login identifier (unique). */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** bcrypt password hash for self-hosted email+password auth. */
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 160 }),
  /** Optional phone number, used for contact/duty display. */
  phone: varchar("phone", { length: 40 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Single-row table holding the current visual rink status.
 * `plogadAt` / `spoladAt` are null when the action hasn't been done recently.
 */
export const rinkStatus = mysqlTable("rinkStatus", {
  id: int("id").autoincrement().primaryKey(),
  /** When the rink was last plowed (plogad). Null = not plowed / unknown. */
  plogadAt: timestamp("plogadAt"),
  /** Name of the person who last plowed. */
  plogadBy: varchar("plogadBy", { length: 120 }),
  /** When the rink was last flooded (spolad). Null = not flooded / unknown. */
  spoladAt: timestamp("spoladAt"),
  /** Name of the person who last flooded. */
  spoladBy: varchar("spoladBy", { length: 120 }),
  /** Optional free-text note shown on the public status card. */
  note: text("note"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RinkStatus = typeof rinkStatus.$inferSelect;
export type InsertRinkStatus = typeof rinkStatus.$inferInsert;

/**
 * Weekly duty schedule. One row per ISO week + year.
 * Holds both plogjour and spoljour assignments with contact info.
 */
export const dutySchedule = mysqlTable("dutySchedule", {
  id: int("id").autoincrement().primaryKey(),
  /** ISO year, e.g. 2026. */
  year: int("year").notNull(),
  /** ISO week number 1-53. */
  week: int("week").notNull(),
  /** Plogjour (plowing duty) responsible name. */
  plogjourName: varchar("plogjourName", { length: 120 }),
  plogjourPhone: varchar("plogjourPhone", { length: 40 }),
  /** Optional link to a registered user (for conflict flagging / reminders). */
  plogjourUserId: int("plogjourUserId"),
  /** True when the plogjour holder has flagged a conflict for this week. */
  plogjourConflict: boolean("plogjourConflict").default(false).notNull(),
  /** Spoljour (flooding duty) responsible name. */
  spoljourName: varchar("spoljourName", { length: 120 }),
  spoljourPhone: varchar("spoljourPhone", { length: 40 }),
  spoljourUserId: int("spoljourUserId"),
  spoljourConflict: boolean("spoljourConflict").default(false).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DutySchedule = typeof dutySchedule.$inferSelect;
export type InsertDutySchedule = typeof dutySchedule.$inferInsert;

/**
 * Single-row table holding the current cross-country ski track status.
 */
export const trackStatus = mysqlTable("trackStatus", {
  id: int("id").autoincrement().primaryKey(),
  /** When the track was last groomed/prepared (draget). Null = not done / unknown. */
  dragetAt: timestamp("dragetAt"),
  /** Name of the person who last groomed the track. */
  dragetBy: varchar("dragetBy", { length: 120 }),
  /** Track condition rating. */
  condition: mysqlEnum("condition", [
    "Mycket bra",
    "Bra",
    "Hyfsat",
    "Dåligt",
    "Ej åkbart",
  ]),
  /** Optional free-text note about surface (nysnö, isigt, blött etc.). */
  note: text("note"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrackStatus = typeof trackStatus.$inferSelect;
export type InsertTrackStatus = typeof trackStatus.$inferInsert;

/**
 * Weekly ski-track duty schedule (spårjour). Separate duty group from the rink.
 * One row per ISO week + year.
 */
export const skiDutySchedule = mysqlTable("skiDutySchedule", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  week: int("week").notNull(),
  /** Spårjour (ski-track duty) responsible name. */
  sparjourName: varchar("sparjourName", { length: 120 }),
  sparjourPhone: varchar("sparjourPhone", { length: 40 }),
  sparjourUserId: int("sparjourUserId"),
  sparjourConflict: boolean("sparjourConflict").default(false).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SkiDutySchedule = typeof skiDutySchedule.$inferSelect;
export type InsertSkiDutySchedule = typeof skiDutySchedule.$inferInsert;

/**
 * Contact persons with defined roles, visible to all.
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  /** Role label, e.g. "Huvudansvarig", "Materialansvarig". */
  role: varchar("role", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  /** Sort order for display. */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Bookings of the rink or a zone for a time slot.
 * Zone values are stored exactly as required: "full rink" | "one end" | "half rink".
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  /** Booking owner (registered user). */
  userId: int("userId").notNull(),
  /** Cached display name of the booker. */
  bookedByName: varchar("bookedByName", { length: 120 }),
  /** Title/purpose, e.g. "Ishockeyträning". */
  title: varchar("title", { length: 160 }).notNull(),
  /** Zone: exactly "full rink", "one end", or "half rink". */
  zone: mysqlEnum("zone", ["full rink", "one end", "half rink"]).notNull(),
  /** Start time (UTC ms stored as timestamp). */
  startTime: timestamp("startTime").notNull(),
  /** End time. */
  endTime: timestamp("endTime").notNull(),
  note: text("note"),
  status: mysqlEnum("status", ["active", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Community chat / bulletin board messages.
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  authorName: varchar("authorName", { length: 120 }).notNull(),
  content: text("content").notNull(),
  /** Optional uploaded image URL (served from the uploads folder). */
  imageUrl: varchar("imageUrl", { length: 512 }),
  /** Soft-delete flag for admin moderation. */
  deleted: boolean("deleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Effort log: one row per completed action (plogad/spolad/draget).
 * Powers the per-person contribution leaderboard. Helpers are stored as a
 * comma-separated list of names (free text), since they may not have accounts.
 */
export const efforts = mysqlTable("efforts", {
  id: int("id").autoincrement().primaryKey(),
  /** Action area + type. */
  kind: mysqlEnum("kind", ["plogad", "spolad", "draget"]).notNull(),
  /** User who registered the action. */
  userId: int("userId"),
  /** Display name of the registering user. */
  byName: varchar("byName", { length: 120 }).notNull(),
  /** Optional helper names, comma-separated. */
  helpers: text("helpers"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Effort = typeof efforts.$inferSelect;
export type InsertEffort = typeof efforts.$inferInsert;

/**
 * Refueling / fuel receipts log. Auditable record of fuel purchased for rink or
 * ski-track maintenance. Each row is owned by the registering user (ansvarig).
 */
export const refuelings = mysqlTable("refuelings", {
  id: int("id").autoincrement().primaryKey(),
  /** Which area the fuel was for. */
  area: mysqlEnum("area", ["hockeyrink", "skidspar"]).notNull(),
  /** Responsible/registering user. */
  userId: int("userId").notNull(),
  responsibleName: varchar("responsibleName", { length: 120 }).notNull(),
  /** Amount in SEK (öre stored as integer to avoid float errors). */
  amountOre: int("amountOre").notNull(),
  /** Optional litres, stored as integer hundredths (e.g. 12.50 L = 1250). */
  litresCenti: int("litresCenti"),
  /** Payment method: ABK fuel card (no reimbursement) or own money (utlägg). */
  paymentMethod: mysqlEnum("paymentMethod", ["tankkort_abk", "egen"]).notNull(),
  /** For own-pay utlägg: has the person been reimbursed by the association? */
  reimbursed: boolean("reimbursed").default(false).notNull(),
  reimbursedAt: timestamp("reimbursedAt"),
  note: text("note"),
  /** Receipt image URL (R2 or /uploads). */
  receiptUrl: varchar("receiptUrl", { length: 512 }),
  /** Date of the refueling (may differ from createdAt). */
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Refueling = typeof refuelings.$inferSelect;
export type InsertRefueling = typeof refuelings.$inferInsert;

/**
 * Other expenses (övriga utlägg): parts, materials, tools etc.
 * Mirrors refuelings but with a free-text category instead of litres.
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  area: mysqlEnum("area", ["hockeyrink", "skidspar"]).notNull(),
  userId: int("userId").notNull(),
  responsibleName: varchar("responsibleName", { length: 120 }).notNull(),
  amountOre: int("amountOre").notNull(),
  /** Free-text category, e.g. "Reservdelar", "Material", "Verktyg". */
  category: varchar("category", { length: 120 }),
  paymentMethod: mysqlEnum("paymentMethod", ["tankkort_abk", "egen"]).notNull(),
  reimbursed: boolean("reimbursed").default(false).notNull(),
  reimbursedAt: timestamp("reimbursedAt"),
  note: text("note"),
  receiptUrl: varchar("receiptUrl", { length: 512 }),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/* ======================= Antnäs Sommar / Bilbingo ===================== */

/** Teams (lag) in the association; team leaders fill in their families. */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  /** Unguessable token used in the shareable fill-in link for team leaders. */
  shareToken: varchar("shareToken", { length: 40 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * A family belonging to a team. Work shifts are allocated proportionally to
 * `activeCount` (number of active children in that family).
 */
export const families = mysqlTable("families", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  parentName: varchar("parentName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  /** Number of active children (drives how many shifts the family gets). */
  activeCount: int("activeCount").default(1).notNull(),
  /** Comma-separated occasion ids the family cannot attend (förhinder). */
  unavailable: text("unavailable"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Family = typeof families.$inferSelect;
export type InsertFamily = typeof families.$inferInsert;

/** A bilbingo occasion/date that needs to be staffed. */
export const bilbingoOccasions = mysqlTable("bilbingoOccasions", {
  id: int("id").autoincrement().primaryKey(),
  /** Year/season this occasion belongs to. */
  season: int("season").notNull(),
  occasionDate: timestamp("occasionDate").notNull(),
  location: varchar("location", { length: 200 }),
  /** Target number of people to staff this occasion. Default 20. */
  targetCount: int("targetCount").default(20).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BilbingoOccasion = typeof bilbingoOccasions.$inferSelect;
export type InsertBilbingoOccasion = typeof bilbingoOccasions.$inferInsert;

/** Assignment of a family (one shift) to a bilbingo occasion. */
export const bingoAssignments = mysqlTable("bingoAssignments", {
  id: int("id").autoincrement().primaryKey(),
  occasionId: int("occasionId").notNull(),
  familyId: int("familyId").notNull(),
  /** Locked assignments are preserved when re-running auto distribution. */
  locked: boolean("locked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BingoAssignment = typeof bingoAssignments.$inferSelect;
export type InsertBingoAssignment = typeof bingoAssignments.$inferInsert;

/**
 * Stores the platform-managed Heartbeat cron task uid for the weekly
 * duty reminder job, so it can be looked up / updated later.
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 80 }).notNull().unique(),
  settingValue: text("settingValue"),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
