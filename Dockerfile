FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile || pnpm install

# Build
COPY . .
RUN pnpm build

# Production
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=base /app/packages/server/package.json packages/server/
COPY --from=base /app/packages/server/dist packages/server/dist/
COPY --from=base /app/packages/web/dist packages/web/dist/
COPY --from=base /app/node_modules node_modules/
COPY --from=base /app/packages/server/node_modules packages/server/node_modules/

ENV PORT=3200
ENV NODE_ENV=production
EXPOSE 3200

CMD ["node", "packages/server/dist/index.js"]
