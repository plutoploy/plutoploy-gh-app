# FROM node:22-slim
# WORKDIR /app
# COPY . .
# RUN corepack enable && corepack prepare pnpm@latest --activate
# RUN pnpm ci
# CMD ["pnpm", "run", "start"]

FROM docker.io/oven/bun:1
WORKDIR /app
COPY . .
RUN bun ci
CMD ["bun", "run", "start"]
