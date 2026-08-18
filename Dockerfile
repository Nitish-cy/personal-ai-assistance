# Runs via tsx rather than a compiled build - tsconfig's "module": "preserve" is
# meant for bundler/tsx consumption, not tsc emit, so all deps (including tsx
# itself) are kept rather than pruning to --omit=dev. Trades image size for
# not introducing a second, divergent build pipeline just for Docker.
FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 3600

CMD ["npx", "tsx", "src/server.ts"]
