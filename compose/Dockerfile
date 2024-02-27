FROM node:18-slim AS base

RUN apt-get update -y
RUN apt-get install -y openssl
RUN apt-get clean

RUN npm install -g pnpm

WORKDIR /app

FROM base AS prod-deps

COPY ./package.json ./
COPY ./pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

FROM base AS builder

COPY ./package.json ./
COPY ./pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY ./prisma ./
RUN pnpm generate

COPY . .

RUN pnpm build

FROM base

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/package.json /app/package.json

COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/dist /app/dist

RUN pnpm generate

COPY ./compose/entrypoint /entrypoint
RUN sed -i 's/\r$//g' /entrypoint
RUN chmod +x /entrypoint

ENTRYPOINT ["/entrypoint"]
