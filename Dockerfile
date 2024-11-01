FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS build
COPY package.json bun.lockb .
COPY patches ./patches
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

EXPOSE 3000/tcp
CMD [ "bun", "cluster" ]
