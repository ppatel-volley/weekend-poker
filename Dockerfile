# ── Base stage ────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ── Dependencies stage ────────────────────────────────────────────
FROM base AS dependencies
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN --mount=type=secret,id=npm_token \
    export NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    pnpm install --frozen-lockfile

# ── Development stage (for docker-compose target) ─────────────────
FROM dependencies AS development
COPY . .
WORKDIR /app/apps/server
CMD ["pnpm", "dev"]

# ── Build stage ───────────────────────────────────────────────────
FROM dependencies AS build
COPY . .
RUN pnpm -r build

# ── Production dependencies stage ─────────────────────────────────
FROM base AS production-deps
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN --mount=type=secret,id=npm_token \
    export NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    pnpm install --frozen-lockfile --prod

# ── Production stage ──────────────────────────────────────────────
FROM base AS production
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/ready', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs
USER nodejs

ENTRYPOINT ["node", "apps/server/dist/index.js"]
