FROM oven/bun:1.4.4 AS build
WORKDIR /repo
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --filter @storybranch/review-host build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /repo/apps/review-host/.output .output
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
