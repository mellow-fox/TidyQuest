FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx tsc

FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=frontend-build /app/client/dist ./client/dist
RUN mkdir -p /app/data

# Ensure /app is owned by node user (uid=1000, gid=1000)
RUN chown -R node:node /app

# Use existing node user from node:22-alpine image
# node:22-alpine comes with uid=1000, gid=1000 (node user/group)
USER node
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
