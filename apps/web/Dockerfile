# ── Stage 1: Install workspace dependencies ───────────────────────
FROM node:22-slim AS deps

ARG NPM_REGISTRY=https://registry.npmmirror.com/

ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}
ENV npm_config_registry=${NPM_REGISTRY}

RUN npm config set registry "${NPM_REGISTRY}" \
  && corepack enable \
  && corepack prepare pnpm@10.26.2 --activate \
  && pnpm config set registry "${NPM_REGISTRY}"

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Build static web bundle ──────────────────────────────
FROM node:22-slim AS builder

ARG NPM_REGISTRY=https://registry.npmmirror.com/

ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}
ENV npm_config_registry=${NPM_REGISTRY}

RUN npm config set registry "${NPM_REGISTRY}" \
  && corepack enable \
  && corepack prepare pnpm@10.26.2 --activate \
  && pnpm config set registry "${NPM_REGISTRY}"

WORKDIR /app

ARG NEXT_PUBLIC_SERVER_BASE_URL=http://127.0.0.1:3001
ARG NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=<SECRET>

ENV NEXT_PUBLIC_SERVER_BASE_URL=${NEXT_PUBLIC_SERVER_BASE_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/
COPY packages/config/ packages/config/
COPY packages/ui/ packages/ui/

RUN pnpm --filter @loomic/shared build \
  && pnpm --filter @loomic/config build \
  && pnpm --filter @loomic/ui build \
  && pnpm --filter @loomic/web build

# ── Stage 3: Serve static export via nginx ────────────────────────
FROM nginx:1.27-alpine AS production

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/out /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
