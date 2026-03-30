# Dockerfile.frontend - Multi-stage build para producción
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma/
COPY src ./src/
COPY next.config.ts .
COPY tsconfig.json .
COPY postcss.config.mjs .
COPY next-env.d.ts .
COPY public ./public/
COPY messages ./messages/

# Build-time environment variables
ARG NEXT_PUBLIC_SAAS_API_URL
ARG NEXT_PUBLIC_AGENT_API_URL
ENV NEXT_PUBLIC_SAAS_API_URL=$NEXT_PUBLIC_SAAS_API_URL
ENV NEXT_PUBLIC_AGENT_API_URL=$NEXT_PUBLIC_AGENT_API_URL

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
