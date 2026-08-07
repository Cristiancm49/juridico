FROM node:22.23.1-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace @legaldesk/api --include-workspace-root=false \
  && npm cache clean --force

COPY --chown=node:node apps/api apps/api
WORKDIR /app/apps/api

USER node
EXPOSE 3100
CMD ["node", "src/server.js"]
