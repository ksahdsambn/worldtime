/**
 * 生成品牌位图与分享图。
 *
 * 从 `src/app/icon.svg` 栅格化 PWA / favicon / apple-touch；
 * 并从本文件内的 SVG 源生成 OG 分享图（1200×630 / 1200×1200）。
 *
 * 运行：node scripts/gen-icons.mjs  （需 sharp）
 * 幂等：覆盖写出。
 */
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcSvg = resolve(root, "src/app/icon.svg");
const outIcons = resolve(root, "public/icons");
const outBrand = resolve(root, "public/brand");
const outPublic = resolve(root, "public");

const VIEWBOX = 64;

const HEAT = {
  g: "rgba(34,197,94,0.55)",
  o: "rgba(245,158,11,0.50)",
  r: "rgba(239,68,68,0.38)",
};

const ROWS = [
  { label: "New York", cells: "rrrrrrooggggggggoorrrrrr" },
  { label: "London", cells: "rrrrooggggggggoorrrrrrrr" },
  { label: "Tokyo", cells: "ggggoorrrrrrrrrrggggggoo" },
  { label: "Beijing", cells: "gggggorrrrrrrrrggggggoor" },
];

const SEL = { start: 13, end: 16 };
const NOW = 10;

function densityFor(size) {
  return Math.round((96 * size) / VIEWBOX);
}

function rel(p) {
  return p.replace(root, "").replace(/^[\\/]/, "");
}

/**
 * 站点域名（OG 图右下角展示）：与 src/lib/seo.ts 同源。
 * 独立 node 脚本不经过 Next 的 env 加载，这里按
 * process.env → .env.local → .env.example 顺序读取。
 */
function siteHost() {
  let url = process.env.NEXT_PUBLIC_SITE_URL;
  for (const f of [".env.local", ".env.example"]) {
    if (url) break;
    try {
      const line = readFileSync(resolve(root, f), "utf8")
        .split(/\r?\n/)
        .find((l) => l.startsWith("NEXT_PUBLIC_SITE_URL="));
      if (line) url = line.slice("NEXT_PUBLIC_SITE_URL=".length).trim();
    } catch {
      // 文件不存在则继续
    }
  }
  return (url || "https://time.eqde.de").replace(/\/+$/, "").replace(/^https?:\/\//, "");
}
const SITE_HOST = siteHost();

function writeBuf(path, buf, label) {
  writeFileSync(path, buf);
  console.log(`  wrote ${label} -> ${rel(path)} (${buf.length} bytes)`);
}

async function renderMark(svgBuffer, size) {
  return sharp(svgBuffer, { density: densityFor(size) })
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function svgToPng(svg, width, height) {
  return sharp(Buffer.from(svg, "utf8"))
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** PNG payload ICO（Vista+），可含多尺寸。 */
function pngsToIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  let offset = 6 + 16 * count;
  const payloads = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.png.length;
    entries.push(entry);
    payloads.push(img.png);
  }
  return Buffer.concat([header, ...entries, ...payloads]);
}

function markGroup(x, y, size, id) {
  const k = size / 64;
  return `
  <defs>
    <linearGradient id="${id}" x1="10" y1="7" x2="55" y2="59" gradientUnits="userSpaceOnUse">
      <stop stop-color="#38BDF8"/><stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <g transform="translate(${x} ${y}) scale(${k})">
    <rect width="64" height="64" rx="16" fill="#0F172A"/>
    <circle cx="32" cy="32" r="20" stroke="url(#${id})" stroke-width="4"/>
    <path d="M12 32h40M32 12c6 5.5 9 12.2 9 20s-3 14.5-9 20M32 12c-6 5.5-9 12.2-9 20s3 14.5 9 20" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M32 21v12l9 5" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="33" r="3" fill="#FBBF24"/>
  </g>`;
}

function heatGrid(ox, oy, cellW, cellH, gapX, gapY, labelW, fontSize) {
  const parts = [];
  const gridX = ox + labelW;
  ROWS.forEach((row, r) => {
    const y = oy + r * (cellH + gapY);
    parts.push(
      `<text x="${ox}" y="${y + cellH * 0.7}" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}">${row.label}</text>`,
    );
    row.cells.split("").forEach((h, i) => {
      const x = gridX + i * (cellW + gapX);
      const selected = i >= SEL.start && i < SEL.end;
      const fill = selected ? "rgba(37,99,235,0.58)" : HEAT[h] ?? HEAT.r;
      const stroke = selected ? ` stroke="#60A5FA" stroke-width="1.25"` : "";
      parts.push(
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="${fill}"${stroke}/>`,
      );
    });
  });
  const totalH = ROWS.length * (cellH + gapY) - gapY;
  const nowX = gridX + NOW * (cellW + gapX) + cellW / 2;
  parts.push(
    `<rect x="${nowX - 1}" y="${oy - 10}" width="2" height="${totalH + 16}" fill="#FBBF24"/>`,
    `<circle cx="${nowX}" cy="${oy - 12}" r="4" fill="#FBBF24"/>`,
  );
  return parts.join("\n");
}

function ogAtmosphere(w, h) {
  return `
  <rect width="${w}" height="${h}" fill="#0F172A"/>
  <circle cx="${w - 80}" cy="${-40}" r="260" fill="#2563EB" opacity="0.18"/>
  <circle cx="${-40}" cy="${h + 40}" r="200" fill="#FBBF24" opacity="0.08"/>
  <circle cx="200" cy="${h / 2}" r="210" fill="none" stroke="#1E3A5F" stroke-width="1.4" opacity="0.55"/>
  <circle cx="200" cy="${h / 2}" r="150" fill="none" stroke="#1E3A5F" stroke-width="1" opacity="0.35"/>
  <line x1="-20" y1="${h / 2}" x2="420" y2="${h / 2}" stroke="#1E3A5F" stroke-width="1" opacity="0.35"/>
  `;
}

function buildOgLandscape() {
  const w = 1200;
  const h = 630;
  const grid = heatGrid(32, 86, 13, 30, 3, 14, 100, 15);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${ogAtmosphere(w, h)}
  ${markGroup(72, 168, 84, "ogMark")}
  <text x="174" y="226" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" letter-spacing="-1.4">WorldTime</text>
  <text x="72" y="292" fill="#BFDBFE" font-family="Arial, Helvetica, sans-serif" font-size="20">World clock, time zone converter,</text>
  <text x="72" y="322" fill="#BFDBFE" font-family="Arial, Helvetica, sans-serif" font-size="20">and meeting planner</text>
  <text x="72" y="372" fill="#7DD3FC" font-family="Arial, Helvetica, sans-serif" font-size="16">11 languages</text>
  <text x="214" y="372" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="16">·</text>
  <text x="236" y="372" fill="#7DD3FC" font-family="Arial, Helvetica, sans-serif" font-size="16">Live offsets</text>
  <text x="362" y="372" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="16">·</text>
  <text x="384" y="372" fill="#7DD3FC" font-family="Arial, Helvetica, sans-serif" font-size="16">DST-aware</text>
  <text x="72" y="548" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="18">${SITE_HOST}</text>
  <rect x="608" y="88" width="528" height="454" rx="20" fill="#1E293B" fill-opacity="0.96" stroke="#334155"/>
  <text x="640" y="128" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="12" letter-spacing="1.8">OVERLAP AT A GLANCE</text>
  <g transform="translate(608 52)">
    ${grid}
  </g>
  <text x="740" y="478" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="12">00</text>
  <text x="820" y="478" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="12">06</text>
  <text x="904" y="478" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="12">12</text>
  <text x="988" y="478" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="12">18</text>
  <text x="1068" y="478" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="12">24</text>
  <text x="640" y="516" fill="#FDE68A" font-family="Arial, Helvetica, sans-serif" font-size="16">Looks like a good time for everyone</text>
</svg>`;
}

function buildOgSquare() {
  const w = 1200;
  const h = 1200;
  const grid = heatGrid(48, 36, 16, 36, 4, 16, 112, 17);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${ogAtmosphere(w, h)}
  ${markGroup(140, 156, 100, "ogSqMark")}
  <text x="264" y="226" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="700" letter-spacing="-1.6">WorldTime</text>
  <text x="140" y="312" fill="#BFDBFE" font-family="Arial, Helvetica, sans-serif" font-size="24">World clock, time zone converter, and meeting planner</text>
  <text x="140" y="360" fill="#7DD3FC" font-family="Arial, Helvetica, sans-serif" font-size="18">11 languages</text>
  <text x="292" y="360" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="18">·</text>
  <text x="318" y="360" fill="#7DD3FC" font-family="Arial, Helvetica, sans-serif" font-size="18">Live offsets</text>
  <text x="466" y="360" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="18">·</text>
  <text x="492" y="360" fill="#7DD3FC" font-family="Arial, Helvetica, sans-serif" font-size="18">DST-aware</text>
  <rect x="140" y="420" width="920" height="580" rx="24" fill="#1E293B" fill-opacity="0.96" stroke="#334155"/>
  <text x="188" y="468" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="1.8">OVERLAP AT A GLANCE</text>
  <g transform="translate(140 500)">
    ${grid}
  </g>
  <text x="188" y="940" fill="#FDE68A" font-family="Arial, Helvetica, sans-serif" font-size="22">Looks like a good time for everyone</text>
  <text x="140" y="1084" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="22">${SITE_HOST}</text>
</svg>`;
}

function buildOgBackground() {
  const w = 1200;
  const h = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
  ${ogAtmosphere(w, h)}
</svg>`;
}

function assertHeatRows() {
  for (const row of ROWS) {
    if (row.cells.length !== 24 || !/^[gor]+$/.test(row.cells)) {
      throw new Error(`invalid heat row "${row.label}": ${row.cells}`);
    }
  }
}

async function main() {
  assertHeatRows();
  mkdirSync(outIcons, { recursive: true });
  mkdirSync(outBrand, { recursive: true });

  const original = readFileSync(srcSvg);
  const maskableSvg = Buffer.from(
    original.toString("utf8").replace('rx="16"', 'rx="0"'),
  );

  console.log("icons");
  const anySizes = [16, 32, 48, 180, 192, 512];
  const rendered = {};
  for (const s of anySizes) {
    rendered[s] = await renderMark(original, s);
  }
  writeBuf(resolve(outIcons, "icon-16.png"), rendered[16], "any 16");
  writeBuf(resolve(outIcons, "icon-32.png"), rendered[32], "any 32");
  writeBuf(resolve(outIcons, "icon-48.png"), rendered[48], "any 48");
  writeBuf(resolve(outIcons, "icon-192.png"), rendered[192], "any 192");
  writeBuf(resolve(outIcons, "icon-512.png"), rendered[512], "any 512");

  for (const s of [192, 512]) {
    const buf = await renderMark(maskableSvg, s);
    writeBuf(resolve(outIcons, `icon-${s}-maskable.png`), buf, `maskable ${s}`);
  }

  const apple = await renderMark(maskableSvg, 180);
  writeBuf(resolve(outPublic, "apple-touch-icon.png"), apple, "apple-touch 180");
  writeBuf(resolve(outIcons, "icon-180.png"), rendered[180], "any 180");

  writeBuf(resolve(outPublic, "favicon-16x16.png"), rendered[16], "favicon 16");
  writeBuf(resolve(outPublic, "favicon-32x32.png"), rendered[32], "favicon 32");

  const ico = pngsToIco([
    { width: 16, height: 16, png: rendered[16] },
    { width: 32, height: 32, png: rendered[32] },
    { width: 48, height: 48, png: rendered[48] },
  ]);
  writeBuf(resolve(outPublic, "favicon.ico"), ico, "favicon.ico");
  writeBuf(resolve(root, "src/app/favicon.ico"), ico, "src/app/favicon.ico");

  copyFileSync(srcSvg, resolve(outPublic, "favicon.svg"));
  console.log(`  copied favicon.svg -> public/favicon.svg`);

  const mark512 = await renderMark(original, 512);
  writeBuf(resolve(outBrand, "worldtime-mark.png"), mark512, "mark 512 png");

  console.log("og");
  const ogSvg = buildOgLandscape();
  const ogSqSvg = buildOgSquare();
  writeFileSync(resolve(outBrand, "og-image.svg"), ogSvg, "utf8");
  writeFileSync(resolve(outBrand, "og-square.svg"), ogSqSvg, "utf8");
  console.log("  wrote public/brand/og-image.svg");
  console.log("  wrote public/brand/og-square.svg");
  const og = await svgToPng(ogSvg, 1200, 630);
  writeBuf(resolve(outPublic, "og.png"), og, "og 1200x630");
  writeBuf(resolve(outBrand, "worldtime-social-card.png"), og, "social-card");

  const ogSq = await svgToPng(ogSqSvg, 1200, 1200);
  writeBuf(resolve(outPublic, "og-square.png"), ogSq, "og square 1200");

  const ogBg = await svgToPng(buildOgBackground(), 1200, 630);
  writeBuf(resolve(outBrand, "worldtime-social-background.png"), ogBg, "social background");

  console.log("done: brand assets generated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
