FROM node:22-slim
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm ci 
CMD ["pnpm", "run", "start"]
