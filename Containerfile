# FROM node:22-slim
# WORKDIR /app
# COPY . .
# RUN corepack enable && corepack prepare pnpm@latest --activate
# RUN pnpm ci
# CMD ["pnpm", "run", "start"]

FROM node:22-slim AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm ci
RUN pnpm build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .
CMD ["node","dist/index.js"]
