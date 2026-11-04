import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TrpcContext } from "./context";

/**
 * Input validation errors become one readable sentence instead of a JSON
 * dump of every issue (the client shows `message` in a toast).
 */
function readableZodMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Något i formuläret ser inte rätt ut.";
  if (issue.code === "invalid_format" && issue.format === "email") return "E-postadressen ser inte rätt ut.";
  if (issue.code === "too_small" && Number(issue.minimum) === 1) return "Fyll i alla obligatoriska fält.";
  // Our own (Swedish) messages are full sentences ending with "."; zod's
  // built-in English ones are not.
  return issue.message.trim().endsWith(".") ? issue.message : "Något i formuläret ser inte rätt ut.";
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.code === "BAD_REQUEST" && error.cause instanceof ZodError) {
      return { ...shape, message: readableZodMessage(error.cause) };
    }
    return shape;
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
