FROM node:22-alpine AS build
WORKDIR /src

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace @consultorio/web --include-workspace-root

COPY frontend ./frontend
RUN npm run build --workspace @consultorio/web

FROM nginx:1.27-alpine
COPY deploy/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/frontend/dist /usr/share/nginx/html
EXPOSE 80

