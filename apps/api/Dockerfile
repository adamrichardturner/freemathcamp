# syntax=docker/dockerfile:1.7
# Build context: repository root (the API depends on the workspace curriculum package).

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /repo

# Install dependencies from manifests only, so code edits don't bust this layer.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/curriculum/package.json packages/curriculum/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @fmc/api...

# Development: source is bind-mounted by docker-compose.yml and reloaded by tsx.
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 4100
CMD ["sh", "-c", "pnpm --filter @fmc/api migrate && pnpm --filter @fmc/api dev"]

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/curriculum packages/curriculum
COPY apps/api apps/api
RUN pnpm --filter @fmc/api typecheck && pnpm --filter @fmc/api build \
 && pnpm --filter @fmc/api deploy --prod --legacy /out

# Production: minimal image, compiled bundle + prod deps, unprivileged user.
FROM node:24-alpine AS prod
ENV NODE_ENV=production PORT=4100
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
USER node
EXPOSE 4100
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4100/api/health || exit 1
CMD ["node", "dist/main.js"]
