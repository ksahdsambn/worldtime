# 阶段 1：依赖安装
# 使用 npm ci 基于 lockfile 做可重现安装（确定性、更快、且 lockfile 与
# package.json 不一致时快速失败）。Next.js 官方 Docker 示例同样采用该策略。
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# 阶段 2：生产构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建阶段 Next.js 会读取 next.config.mjs 中的 standalone 输出
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 阶段 3：运行（精简镜像）
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 用户运行，提升安全性
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# 拷贝 standalone 产物与静态资源
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
