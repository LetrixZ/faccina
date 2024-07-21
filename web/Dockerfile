FROM oven/bun:1
WORKDIR /app
COPY ./web/package.json ./web/bun.lockb /app/
RUN bun install --frozen-lockfile
COPY ./web .
ENV NODE_ENV=production
RUN bun run build

ENV PORT=5000
EXPOSE 5000
ENV SERVER_URL=server:3000
ENTRYPOINT ["bun", "./build/index.js"]