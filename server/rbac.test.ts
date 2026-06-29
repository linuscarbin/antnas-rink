import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type U = NonNullable<TrpcContext["user"]>;

function baseUser(role: "user" | "admin"): U {
  return {
    id: role === "admin" ? 1 : 2,
    email: `${role}@example.com`,
    passwordHash: "x",
    name: role,
    phone: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as U;
}

function ctx(user: U | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("RBAC", () => {
  it("blocks anonymous users from admin contact creation", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(
      caller.contacts.create({ name: "X", role: "Y", sortOrder: 0 })
    ).rejects.toThrow();
  });

  it("blocks normal users from admin user listing", async () => {
    const caller = appRouter.createCaller(ctx(baseUser("user")));
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("blocks anonymous users from posting chat", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.chat.post({ content: "hej" })).rejects.toThrow();
  });

  it("blocks anonymous users from creating bookings", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(
      caller.bookings.create({
        title: "Test",
        zone: "full rink",
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
      })
    ).rejects.toThrow();
  });

  it("blocks anonymous users from updating ski track status", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.track.markDraget({ done: true })).rejects.toThrow();
  });

  it("blocks normal users from editing ski duty schedule", async () => {
    const caller = appRouter.createCaller(ctx(baseUser("user")));
    await expect(
      caller.skiDuty.upsert({ year: 2026, week: 1 })
    ).rejects.toThrow();
  });

  it("returns null from auth.me for anonymous", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.auth.me()).resolves.toBeNull();
  });

  it("returns sanitized user (no passwordHash) from auth.me", async () => {
    const caller = appRouter.createCaller(ctx(baseUser("admin")));
    const me = await caller.auth.me();
    expect(me).not.toBeNull();
    expect((me as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(me?.role).toBe("admin");
  });
});
