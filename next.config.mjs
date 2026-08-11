import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 standalone 输出以减小容器镜像体积（步骤 1.6）
  output: "standalone",
  // 启用 React 严格模式，提前暴露潜在副作用与不安全生命周期
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
