# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
ARG VITE_ENV_HASH=local
ENV BACKEND_UPSTREAM=backend
RUN --mount=type=secret,id=env_file,required=false \
    sh -c 'echo "Using frontend environment cache key: $VITE_ENV_HASH" >/dev/null; if [ -f /run/secrets/env_file ]; then awk -F= " /^NEXT_PUBLIC_[A-Z0-9_]*=/ { print; next } /^VITE_[A-Z0-9_]*=/ { key=\$1; sub(/^VITE_/, \"NEXT_PUBLIC_\", key); print key \"=\" substr(\$0, length(\$1) + 2) } " /run/secrets/env_file > /tmp/frontend.env; set -a; . /tmp/frontend.env; set +a; fi; npm run build'

FROM node:22-alpine AS production-stage

WORKDIR /app

ENV BACKEND_UPSTREAM=backend
ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME=0.0.0.0

COPY --from=build-stage /app/public ./public
COPY --from=build-stage /app/.next/standalone ./
COPY --from=build-stage /app/.next/static ./.next/static

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:80/').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
