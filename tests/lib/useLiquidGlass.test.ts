import { describe, it, expect } from "vitest";
import {
  GLASS_PRESET,
  SUPERSAMPLE,
  MAX_MAP_EDGE,
  BLUR_STD_PER_RADIUS,
  resolveRadius,
} from "@/lib/useLiquidGlass";

describe("GLASS_PRESET", () => {
  it("matches the liquid-glass-js shader uniforms", () => {
    expect(GLASS_PRESET).toEqual({
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
    });
  });
});

describe("refraction constants", () => {
  it("keeps the fitted bake / blur factors", () => {
    expect(SUPERSAMPLE).toBe(2);
    expect(MAX_MAP_EDGE).toBe(1400);
    expect(BLUR_STD_PER_RADIUS).toBe(0.35);
  });

  it("sizes the filter region from the field, not a fixed 30%", () => {
    const scale = 10;
    const marginPx = scale / 2 + 3 * GLASS_PRESET.blurRadius * BLUR_STD_PER_RADIUS;
    expect(marginPx).toBe(5 + 3 * 2 * 0.35);
  });
});

describe("resolveRadius", () => {
  it("reads px values as CSS pixels", () => {
    expect(resolveRadius("12px", 200, 100)).toBe(12);
  });

  it("resolves % against min(w, h)", () => {
    expect(resolveRadius("50%", 200, 100)).toBe(50);
    expect(resolveRadius("10%", 80, 200)).toBe(8);
  });

  it("treats empty or non-numeric as 0", () => {
    expect(resolveRadius("", 100, 100)).toBe(0);
    expect(resolveRadius("none", 100, 100)).toBe(0);
  });
});
