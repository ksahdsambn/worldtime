"use client";

import { useId } from "react";

/**
 * 空状态 / 边缘页的线框地球：经纬、赤道环、沿轨道的卫星。
 * 纯 SVG + CSS 旋转。渐变 id 用 useId，避免同页多个实例互相抢 fill。
 */
export default function OrbitalHero({
  size = 112,
}: {
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const sphereId = `oh-sphere-${uid}`;
  const sheenId = `oh-sheen-${uid}`;
  return (
    <div className="orbital-hero" style={{ width: size, height: size }} aria-hidden>
      <span className="orbital-hero__glow" />
      <svg
        className="orbital-hero__svg"
        viewBox="0 0 160 160"
        width={size}
        height={size}
      >
        <defs>
          <radialGradient id={sphereId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.7" />
            <stop offset="45%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.06" />
          </radialGradient>
          <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="orbital-hero__spin orbital-hero__spin--slow">
          <ellipse
            cx="80"
            cy="80"
            rx="74"
            ry="26"
            fill="none"
            stroke="var(--orbit-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
          <circle cx="154" cy="80" r="3.2" fill="var(--warm)" className="orbital-hero__sat" />
        </g>
        <g className="orbital-hero__spin orbital-hero__spin--rev">
          <ellipse
            cx="80"
            cy="80"
            rx="62"
            ry="18"
            fill="none"
            stroke="var(--orbit-line)"
            strokeWidth="0.75"
          />
        </g>
        <circle cx="80" cy="80" r="40" fill={`url(#${sphereId})`} />
        <circle
          cx="80"
          cy="80"
          r="40"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <ellipse
          cx="80"
          cy="80"
          rx="40"
          ry="14"
          fill="none"
          stroke="var(--orbit-line)"
          strokeWidth="1"
        />
        <ellipse
          cx="80"
          cy="80"
          rx="40"
          ry="28"
          fill="none"
          stroke="var(--orbit-line)"
          strokeWidth="0.75"
        />
        <path
          d="M80 40 C 56 54 56 106 80 120 C 104 106 104 54 80 40"
          fill="none"
          stroke="var(--orbit-line)"
          strokeWidth="1"
        />
        <line
          x1="80"
          y1="38"
          x2="80"
          y2="122"
          stroke="var(--orbit-line)"
          strokeWidth="0.75"
        />
        <circle cx="80" cy="80" r="40" fill={`url(#${sheenId})`} />
        <circle cx="68" cy="62" r="3" fill="#fff" fillOpacity="0.55" />
      </svg>
    </div>
  );
}
