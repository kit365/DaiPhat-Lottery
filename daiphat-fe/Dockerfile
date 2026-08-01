# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
ARG VITE_ENV_HASH=local
RUN --mount=type=secret,id=env_file,required=false \
    sh -c 'echo "Using frontend environment cache key: $VITE_ENV_HASH" >/dev/null; if [ -f /run/secrets/env_file ]; then awk "/^VITE_[A-Z0-9_]*=/" /run/secrets/env_file > /tmp/vite.env; set -a; . /tmp/vite.env; set +a; fi; npm exec vite build'

FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template

ENV BACKEND_UPSTREAM=backend
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
