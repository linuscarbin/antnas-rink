import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
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
  auth: authRouter,
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
