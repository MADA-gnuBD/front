# -------- deps --------
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
# ✅ 빌드에 devDependencies 필요 → 전체 설치
RUN npm ci

# -------- builder --------
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ✅ GitHub Actions에서 넘어오는 build-arg 받기 & 빌드 전에 ENV로 승격
ARG NEXT_PUBLIC_KAKAO_MAP_KEY
ARG NEXT_PUBLIC_SPRING_API_URL
ENV NEXT_PUBLIC_KAKAO_MAP_KEY=${NEXT_PUBLIC_KAKAO_MAP_KEY}
ENV NEXT_PUBLIC_SPRING_API_URL=${NEXT_PUBLIC_SPRING_API_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# -------- runner --------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node","server.js"]
