import { ImageResponse } from "next/og";
import { OG_IMAGE } from "@/lib/seo";
import { OgArtwork } from "@/lib/ogArtwork";

/** `/{locale}/twitter-image`：与 opengraph-image 同画面；meta 仍指向静态 `/og.png`。 */
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<OgArtwork />, { ...size });
}
