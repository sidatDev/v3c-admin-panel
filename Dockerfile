FROM node:20-alpine AS builder
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
