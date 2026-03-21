FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
COPY packages ./packages
RUN bun install --frozen-lockfile

RUN cd packages/web && bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/packages/web/dist ./packages/web/dist
COPY --from=base /app/packages/server/src ./packages/server/src
COPY --from=base /app/packages/server/package.json ./packages/server/
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

ENV PORT=3200
ENV NODE_ENV=production
EXPOSE 3200

CMD ["bun", "packages/server/src/index.ts"]
