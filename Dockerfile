# 阶段 1：依赖安装
# 使用 npm install（而非 npm ci）：项目含 @next/swc 等平台相关可选依赖，
# 其 lockfile 在不同 OS/Node 版本间可能不完全同步，npm ci 会因此失败。
# npm install 能在保持 lockfile 主干的前提下自动补全当前平台所需依赖。
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# 阶段 2：生产构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建阶段 Next.js 会读取 next.config.mjs 中的 standalone 输出
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* 在构建期内联进客户端 bundle / SSG 产物（运行时再设无效），
# 故必须作为构建期 ARG 传入（来源：docker compose 的 build.args / 宿主环境）。
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
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
