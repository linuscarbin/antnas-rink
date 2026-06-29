import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { bookingsRouter } from "./routers/bookings";
import { chatRouter } from "./routers/chat";
import { contactsRouter } from "./routers/contacts";
import { bingoRouter } from "./routers/bingo";
import { documentsRouter } from "./routers/documents";
import { dutyRouter } from "./routers/duty";
import { expensesRouter } from "./routers/expenses";
import { refuelingsRouter } from "./routers/refuelings";
import { scheduleRouter } from "./routers/schedule";
import { settingsRouter } from "./routers/settings";
import { skiDutyRouter } from "./routers/skiDuty";
import { statusRouter } from "./routers/status";
import { trackRouter } from "./routers/track";
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
  track: trackRouter,
  skiDuty: skiDutyRouter,
  refuelings: refuelingsRouter,
  expenses: expensesRouter,
  bingo: bingoRouter,
  settings: settingsRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;
