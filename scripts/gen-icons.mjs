/**
 * 生成 PWA 位图图标（第 14 轮）。
 *
 * 用 sharp 把 `src/app/icon.svg`（viewBox 64×64，含圆角深蓝底 + 地球时钟 mark）
 * 栅格化为 manifest 所需的 PNG：
 * - public/icons/icon-192.png        (purpose: any)
 * - public/icons/icon-512.png        (purpose: any)
 * - public/icons/icon-192-maskable.png (purpose: maskable，全出血底)
 * - public/icons/icon-512-maskable.png (purpose: maskable，全出血底)
 *
 * maskable 变体把圆角矩形改为全出血（rx=0），让平台裁切为任意形状时背景不露白；
 * mark 直径占画布 ~62.5%，落在 maskable 安全区（中心 80%）内。
 *
 * 运行：node scripts/gen-icons.mjs  （需 sharp：npm i -D sharp）
 * 幂等：覆盖写出。
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcSvg = resolve(root, "src/app/icon.svg");
const outDir = resolve(root, "public/icons");

const VIEWBOX = 64; // SVG viewBox 边长
const ANY_SIZES = [192, 512];
const MASKABLE_SIZES = [192, 512];

/** 按 target 边长换算 raster 密度（DPI），保证矢量原生清晰渲染后再输出。 */
function densityFor(size) {
  return Math.round((96 * size) / VIEWBOX);
}

async function render(svgBuffer, size) {
  return sharp(svgBuffer, { density: densityFor(size) })
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const original = readFileSync(srcSvg);
  // maskable 变体：圆角背景改全出血（rx=0）。
  const maskableSvg = Buffer.from(
    original.toString("utf8").replace('rx="16"', 'rx="0"'),
  );

  const tasks = [];
  for (const s of ANY_SIZES) {
    tasks.push(render(original, s).then((buf) => writeFile(outDir, `icon-${s}.png`, buf, `any ${s}`)));
  }
  for (const s of MASKABLE_SIZES) {
    tasks.push(
      render(maskableSvg, s).then((buf) =>
        writeFile(outDir, `icon-${s}-maskable.png`, buf, `maskable ${s}`),
      ),
    );
  }
  await Promise.all(tasks);
  console.log("done: icons generated under public/icons/");
}

function writeFile(dir, name, buf, label) {
  const p = resolve(dir, name);
  writeFileSync(p, buf);
  console.log(`  wrote ${label} -> ${p.replace(root, "").replace(/^[\\/]/, "")} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
