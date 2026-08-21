/*!
 * Liquid Glass — refraction hook (React).
 *
 * The refraction field is a port of the fragment shader in liquid-glass-js
 * (https://github.com/dashersw/liquid-glass-js) — Copyright (c) 2025 Armagan
 * Amcalar, MIT. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of that software to deal in it without restriction,
 * provided this notice travels with it; it is provided "as is", without
 * warranty of any kind. Keep this header on any copy or port.
 *
 * The port targets an SVG displacement filter fed by a live backdrop instead
 * of the library's html2canvas page snapshot.
 *
 * Pair with the `.liquid-glass` class:
 *   <div className="liquid-glass" ref={useLiquidGlass()}>…</div>
 *
 * A callback-ref hook (not a wrapper component) is the 1:1 of the Angular
 * attribute directive: glass already lives on existing nodes via className,
 * so wrapping would add a DOM node or steal the tag.
 *
 * Porting notes: the liquid-glass skill's references/refraction.md carries
 * the mechanism and the formulas. Transcription, not design.
 */
"use client";

import { useCallback, useRef, type RefCallback } from "react";

/**
 * Mirrors the shader uniforms of liquid-glass-js (dashersw/liquid-glass-js);
 * names match its control panel. Distances are exponential-falloff rates per
 * pixel from the shape edge; intensities are in page-texture fraction units.
 */
export interface LiquidGlassConfig {
  edgeIntensity: number;
  rimIntensity: number;
  baseIntensity: number;
  edgeDistance: number;
  rimDistance: number;
  baseDistance: number;
  cornerBoost: number;
  rippleEffect: number;
  blurRadius: number;
  /** Center distortion ("Enable Center Warp"); off keeps the middle legible. */
  warp: boolean;
}

/** Hand-tuned in the library's demo controls; the tint (0.11) lives in CSS. */
export const GLASS_PRESET: LiquidGlassConfig = {
  edgeIntensity: 0.015,
  rimIntensity: 0.028,
  baseIntensity: 0.05,
  edgeDistance: 0.5,
  rimDistance: 1.7,
  baseDistance: 0.2,
  cornerBoost: 0.06,
  rippleEffect: 0.26,
  blurRadius: 2,
  warp: false,
};

/**
 * Render the displacement map at 2x the element's CSS size. The rim refraction
 * lives in a 1-2px band; a 1x map lets the browser resample it into a wide
 * smear. Supersampling gives feImage enough source detail to keep the edge
 * lens crisp (verified against the reference library render).
 */
export const SUPERSAMPLE = 2;

/**
 * Cap the baked map's longest (supersampled) edge. Refraction is edge-local, so
 * a tall board column doesn't need a full 2x map through its neutral middle;
 * this keeps the per-pixel bake and the data-URL size bounded for big surfaces.
 */
export const MAX_MAP_EDGE = 1400;

/**
 * feGaussianBlur stdDeviation per unit of the config's blurRadius. The library
 * blurs in a 13-tap page-texture kernel that doesn't map 1:1 to an SVG
 * gaussian; this factor was fit so blurRadius 2 matches its frosting.
 */
export const BLUR_STD_PER_RADIUS = 0.35;

interface FilterEntry {
  id: string;
  node: SVGFilterElement;
  refs: number;
}

const filters = new Map<string, FilterEntry>();
let defs: SVGSVGElement | null = null;
let nextId = 0;

type NavigatorWithUAData = Navigator & {
  userAgentData?: { brands: Array<{ brand: string }> };
};

/**
 * Backdrop-filters referencing SVG filters are Chromium-only. Feature
 * queries can't tell (Safari parses but paints nothing), so gate on engine.
 */
function isSupported(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const brands = (navigator as NavigatorWithUAData).userAgentData?.brands;
  if (brands) {
    return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
  }
  return /Chrome\//.test(navigator.userAgent);
}

/**
 * Liquid-glass refraction for a rounded-rect element.
 *
 * Ports the fragment shader of liquid-glass-js to an SVG displacement filter
 * consumed via `backdrop-filter: url(...)`: the same edge/rim exponential
 * refraction, corner boost and rim ripple are baked per element size into a
 * canvas displacement map (feImage → feDisplacementMap → feGaussianBlur).
 * Unlike the library's html2canvas snapshot, the backdrop is sampled live, so
 * the effect tracks scrolling, theme switches and content changes for free.
 *
 * SVG-referenced backdrop filters only render in Chromium; elsewhere the hook
 * is inert and the stylesheet's plain `backdrop-filter: blur(...)` fallback
 * stays in effect. Radius is read from computed style (including `%`), not
 * passed in. Optional `config` overrides the tuned preset, matching the
 * Angular directive's `@Input`.
 *
 * @example
 * ```tsx
 * <div className="liquid-glass" ref={useLiquidGlass()}>…</div>
 * ```
 */
export function useLiquidGlass(
  config?: Partial<LiquidGlassConfig>,
): RefCallback<HTMLElement> {
  const configRef = useRef(config);
  configRef.current = config;
  const detachRef = useRef<(() => void) | null>(null);

  // Attach/detach only in the callback ref. A useEffect cleanup would run in
  // React 18 Strict Mode without re-invoking the ref, leaving the node live
  // but with the filter released. Unmount still calls ref(null).
  return useCallback((node: HTMLElement | null) => {
    detachRef.current?.();
    detachRef.current = null;
    if (!node || !isSupported()) {
      return;
    }
    detachRef.current = attachLiquidGlass(node, () => ({
      ...GLASS_PRESET,
      ...(configRef.current ?? {}),
    }));
  }, []);
}

function attachLiquidGlass(host: HTMLElement, getConfig: () => LiquidGlassConfig): () => void {
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounce: ReturnType<typeof setTimeout> | undefined;
  let rebuildHandle = 0;
  let currentKey: string | null = null;

  /** A viewport resize changes pageW/pageH for every instance; debounce it so a
   *  drag-resize doesn't rebake every map every frame — settle, then rebuild. */
  const onWindowResize = () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => scheduleRebuild(), 180);
  };

  /** Coalesce resize bursts into one rebuild per frame. */
  const scheduleRebuild = () => {
    cancelAnimationFrame(rebuildHandle);
    rebuildHandle = requestAnimationFrame(() => rebuild());
  };

  const releaseCurrentFilter = () => {
    if (!currentKey) {
      return;
    }
    const key = currentKey;
    currentKey = null;
    const entry = filters.get(key);
    if (entry && --entry.refs <= 0) {
      filters.delete(key);
      entry.node.remove();
    }
  };

  const rebuild = () => {
    const w = Math.round(host.offsetWidth);
    const h = Math.round(host.offsetHeight);
    if (w < 2 || h < 2) {
      return;
    }
    const radius = Math.min(
      resolveRadius(getComputedStyle(host).borderTopLeftRadius, w, h),
      Math.min(w, h) / 2,
    );
    // The shader displaces in fractions of the page snapshot; the live
    // equivalent of that snapshot is the viewport.
    const pageW = window.innerWidth;
    const pageH = window.innerHeight;
    const cfg = getConfig();

    const key = [w, h, radius, pageW, pageH, JSON.stringify(cfg)].join("|");
    if (key === currentKey) {
      return;
    }
    releaseCurrentFilter();
    const entry = acquireFilter(key, w, h, radius, pageW, pageH, cfg);
    currentKey = key;
    host.style.backdropFilter = `url(#${entry.id})`;
  };

  resizeObserver = new ResizeObserver(() => scheduleRebuild());
  resizeObserver.observe(host);
  window.addEventListener("resize", onWindowResize, { passive: true });
  scheduleRebuild();

  return () => {
    resizeObserver?.disconnect();
    window.removeEventListener("resize", onWindowResize);
    clearTimeout(resizeDebounce);
    cancelAnimationFrame(rebuildHandle);
    releaseCurrentFilter();
    host.style.removeProperty("backdrop-filter");
  };
}

/** Same-size cards (the common case in a list) share one filter. */
function acquireFilter(
  key: string,
  w: number,
  h: number,
  radius: number,
  pageW: number,
  pageH: number,
  cfg: LiquidGlassConfig,
): FilterEntry {
  let entry = filters.get(key);
  // Reuse only if the cached node is still in the live document — if the shared
  // defs <svg> was ever detached, its `url(#id)` no longer resolves.
  if (entry && entry.node.isConnected) {
    entry.refs++;
    return entry;
  }
  if (entry) {
    filters.delete(key);
  }
  const { mapUrl, scale } = buildDisplacementMap(w, h, radius, pageW, pageH, cfg);
  const id = `liquid-glass-${nextId++}`;

  const svgNs = "http://www.w3.org/2000/svg";
  const filter = document.createElementNS(svgNs, "filter");
  filter.setAttribute("id", id);
  // Edge pixels sample the backdrop up to `maxAbs` (= scale/2) away, plus the
  // blur spread; the region must extend past the box by at least that or the
  // refraction clips to transparent at the corners. Displacement is
  // viewport-proportional, so on a small element this margin can exceed the
  // box — size it from the actual field, not a fixed 30%.
  const marginPx = scale / 2 + 3 * cfg.blurRadius * BLUR_STD_PER_RADIUS;
  const mx = (marginPx / w) * 100;
  const my = (marginPx / h) * 100;
  filter.setAttribute("x", `${-mx}%`);
  filter.setAttribute("y", `${-my}%`);
  filter.setAttribute("width", `${100 + 2 * mx}%`);
  filter.setAttribute("height", `${100 + 2 * my}%`);
  filter.setAttribute("color-interpolation-filters", "sRGB");
  filter.dataset.key = key;

  const feImage = document.createElementNS(svgNs, "feImage");
  feImage.setAttribute("href", mapUrl);
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("width", String(w));
  feImage.setAttribute("height", String(h));
  feImage.setAttribute("preserveAspectRatio", "none");
  feImage.setAttribute("result", "map");

  const feDisplacement = document.createElementNS(svgNs, "feDisplacementMap");
  feDisplacement.setAttribute("in", "SourceGraphic");
  feDisplacement.setAttribute("in2", "map");
  feDisplacement.setAttribute("scale", String(scale));
  feDisplacement.setAttribute("xChannelSelector", "R");
  feDisplacement.setAttribute("yChannelSelector", "G");
  feDisplacement.setAttribute("result", "displaced");

  // Frosting on the refracted sample (see BLUR_STD_PER_RADIUS).
  const feBlur = document.createElementNS(svgNs, "feGaussianBlur");
  feBlur.setAttribute("in", "displaced");
  feBlur.setAttribute("stdDeviation", String(cfg.blurRadius * BLUR_STD_PER_RADIUS));

  filter.append(feImage, feDisplacement, feBlur);
  ensureDefs().querySelector("defs")!.appendChild(filter);

  entry = { id, node: filter, refs: 1 };
  filters.set(key, entry);
  return entry;
}

function ensureDefs(): SVGSVGElement {
  if (!defs || !defs.isConnected) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "fixed";
    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(document.createElementNS(svgNs, "defs"));
    document.body.appendChild(svg);
    defs = svg;
  }
  return defs;
}

/**
 * Bake the shader's refraction field into a displacement map: R/G encode the
 * x/y sample offset around neutral 128, scaled so the extremes span the
 * feDisplacementMap `scale`. Formulas transcribed 1:1 from container.js.
 *
 * The canvas is rendered at SUPERSAMPLE× the element size; feImage displays it
 * back at 1× so the browser has extra detail for the narrow rim band. `w`/`h`
 * are CSS pixels; all shader falloffs stay in CSS-pixel space regardless.
 */
function buildDisplacementMap(
  w: number,
  h: number,
  radius: number,
  pageW: number,
  pageH: number,
  cfg: LiquidGlassConfig,
): { mapUrl: string; scale: number } {
  // Supersample small elements for a crisp rim; for surfaces wider than
  // MAX_MAP_EDGE let ss drop below 1 (a coarser map, stretched by feImage) so
  // the bake and data-URL stay bounded — the wide topbar is mostly neutral
  // anyway. Floor keeps at least ~1 map px per 4 CSS px.
  const ss = Math.max(0.25, Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(w, h)));
  const bw = Math.max(1, Math.round(w * ss));
  const bh = Math.max(1, Math.round(h * ss));
  const r = radius * ss;
  const minDim = Math.min(w, h);
  const dx = new Float32Array(bw * bh);
  const dy = new Float32Array(bw * bh);
  let maxAbs = 0;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const cx = (px + 0.5) / bw;
      const cy = (py + 0.5) / bh;

      // Signed distance to the rounded-rect edge (supersampled px → CSS px).
      const tx = Math.abs(px + 0.5 - bw / 2) - (bw / 2 - r);
      const ty = Math.abs(py + 0.5 - bh / 2) - (bh / 2 - r);
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0));
      const inside = Math.min(Math.max(tx, ty), 0);
      const distPx = Math.max(-(outside + inside - r), 0) / ss;

      const edgeFall = Math.exp(-distPx * cfg.edgeDistance);
      const rimFall = Math.exp(-distPx * cfg.rimDistance);
      const baseFall = 1 - Math.exp(-distPx * cfg.baseDistance);
      const baseComponent = cfg.warp ? baseFall * cfg.baseIntensity : 0;
      const total = baseComponent + edgeFall * cfg.edgeIntensity + rimFall * cfg.rimIntensity;

      // The shader's rounded-rect normal is taken in texcoord space.
      let nx = cx - 0.5;
      let ny = cy - 0.5;
      const len = Math.hypot(nx, ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      }

      const cornerNorm = Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDim;
      const corner = Math.exp(-cornerNorm * 0.3) * cfg.cornerBoost;

      const ripple = Math.sin((distPx / minDim) * 25) * cfg.rippleEffect * rimFall;

      // normal * (refraction + corner boost) + perpendicular * ripple,
      // converted from page-texture fractions to pixels.
      const fx = (nx * (total + corner) - ny * ripple) * pageW;
      const fy = (ny * (total + corner) + nx * ripple) * pageH;

      const i = py * bw + px;
      dx[i] = fx;
      dy[i] = fy;
      maxAbs = Math.max(maxAbs, Math.abs(fx), Math.abs(fy));
    }
  }

  const scale = Math.max(maxAbs * 2, 1e-4);
  // feDisplacementMap decodes byte b as scale*(b/255 - 0.5); since 128/255 ≠ 0.5,
  // a naive neutral (128) would shift the whole interior by scale/510 px.
  // Pre-subtract that decode bias so zero displacement stays put (warp off ⇒
  // the middle must read undistorted).
  const bias = scale * (128 / 255 - 0.5);
  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(bw, bh);
  const data = image.data;
  for (let i = 0; i < bw * bh; i++) {
    data[i * 4] = clampByte(255 * (0.5 + (dx[i] - bias) / scale));
    data[i * 4 + 1] = clampByte(255 * (0.5 + (dy[i] - bias) / scale));
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { mapUrl: canvas.toDataURL("image/png"), scale };
}

/** Resolve a computed border-radius (px or %) to CSS pixels. */
export function resolveRadius(computed: string, w: number, h: number): number {
  const value = parseFloat(computed) || 0;
  return computed.trim().endsWith("%") ? (value / 100) * Math.min(w, h) : value;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
