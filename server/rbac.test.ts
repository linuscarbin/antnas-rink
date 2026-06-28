import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type U = NonNullable<TrpcContext["user"]>;

function baseUser(role: "user" | "admin"): U {
  return {
    id: role === "admin" ? 1 : 2,
    openId: `open-${role}`,
    email: `${role}@example.com`,
    name: role,
    phone: null,
    loginMethod: "manus",
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
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
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
});
