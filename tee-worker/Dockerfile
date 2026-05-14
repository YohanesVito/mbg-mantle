FROM oven/bun:1.1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install --frozen-lockfile=false --production=false

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]
