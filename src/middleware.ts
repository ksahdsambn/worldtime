import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 匹配除内部 Next.js 文件、API 路由与带点文件（如 favicon.ico）外的所有路径
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
