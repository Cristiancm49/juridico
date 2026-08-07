FROM node:22.23.1-alpine3.24 AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace @legaldesk/web --include-workspace-root=false

COPY apps/web apps/web
RUN npm run build --workspace @legaldesk/web

FROM nginx:1.30.4-alpine
COPY deploy/frontend/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
