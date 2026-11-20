FROM node:22-alpine AS build
WORKDIR /src

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace @consultorio/web --include-workspace-root

COPY frontend ./frontend
RUN npm run build --workspace @consultorio/web

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/frontend/dist /srv
EXPOSE 80 443 443/udp

