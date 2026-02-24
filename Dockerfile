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

# Create non-root user and set permissions
RUN addgroup -g 1000 -S appgroup && \
    adduser -S appuser -u 1000 -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
