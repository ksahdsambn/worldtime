import { ImageResponse } from "next/og";
import { OG_IMAGE } from "@/lib/seo";

/**
 * Open Graph 分享图（`/{locale}/opengraph-image`）。
 *
 * - 放置在 `[locale]` 段内，使 next-intl 中间件按合法 locale 路由放行
 *   （OG 图路由本身无扩展名，放根段会被中间件拦截重定向）。
 * - 内容与语言无关（品牌图），使用英文文案以保证默认字体可渲染
 *   （Satori 默认字体不含中文字形）。
 * - 尺寸/alt 与 `@/lib/seo` 的 OG_IMAGE 共用，确保 buildOpenGraph 注入的
 *   meta 与实际生成图一致。
 */
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
          <span style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
            WorldTime
          </span>
        </div>
        <div style={{ fontSize: 40, marginTop: 12, color: "#bfdbfe" }}>
          World Clock · Time Zone Converter · Meeting Planner
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 28,
            gap: 40,
            color: "#93c5fd",
          }}
        >
          <span>11 languages</span>
          <span>Live offsets</span>
          <span>DST-aware</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
