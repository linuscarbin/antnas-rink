import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { bookingsRouter } from "./routers/bookings";
import { chatRouter } from "./routers/chat";
import { contactsRouter } from "./routers/contacts";
import { dutyRouter } from "./routers/duty";
import { scheduleRouter } from "./routers/schedule";
import { statusRouter } from "./routers/status";
import { usersRouter } from "./routers/users";
import { weatherRouter } from "./routers/weather";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  status: statusRouter,
  duty: dutyRouter,
  contacts: contactsRouter,
  bookings: bookingsRouter,
  chat: chatRouter,
  users: usersRouter,
  weather: weatherRouter,
  schedule: scheduleRouter,
});

export type AppRouter = typeof appRouter;
