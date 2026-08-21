import { ImageResponse } from "next/og";
import { OG_IMAGE } from "@/lib/seo";
import { OgArtwork } from "@/lib/ogArtwork";

/**
 * Open Graph 分享图（`/{locale}/opengraph-image`）。
 *
 * - 放在 `[locale]` 段内，避免无扩展名路由被 next-intl 中间件拦截。
 * - 文案用英文（Satori 默认字体无 CJK）。
 * - 静态同源图：`/og.png`（爬虫更稳，见 seo.ts OG_IMAGE_PATH）。
 */
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(<OgArtwork />, { ...size });
}
