# syntax=docker/dockerfile:1

############################
# Stage 1 — build
############################
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Install dependencies (use lockfile for reproducible builds)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build client + server bundle
COPY . .
RUN pnpm build

# Remove dev dependencies to slim the node_modules we carry over
RUN pnpm prune --prod

############################
# Stage 2 — runtime
############################
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
# The server picks PORT from env; Coolify sets it automatically.
ENV PORT=3000

WORKDIR /app

# Create the default uploads directory (override path with UPLOAD_DIR / a volume).
RUN mkdir -p /data/uploads
ENV UPLOAD_DIR=/data/uploads

# Copy only what's needed to run the production server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Drizzle migrations + config (used by the optional migrate step)
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000

# Run the bundled production server
CMD ["node", "dist/index.js"]
