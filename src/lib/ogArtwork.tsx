import type { CSSProperties, ReactNode } from "react";

/**
 * Satori-safe Open Graph artwork (flex + limited CSS).
 * Visual sibling of the static SVG in scripts/gen-icons.mjs — keep HEAT/ROWS in sync.
 */

const HEAT: Record<string, string> = {
  g: "rgba(34,197,94,0.55)",
  o: "rgba(245,158,11,0.50)",
  r: "rgba(239,68,68,0.38)",
};

const ROWS: ReadonlyArray<{ label: string; cells: string }> = [
  { label: "New York", cells: "rrrrrrooggggggggoorrrrrr" },
  { label: "London", cells: "rrrrooggggggggoorrrrrrrr" },
  { label: "Tokyo", cells: "ggggoorrrrrrrrrrggggggoo" },
  { label: "Beijing", cells: "gggggorrrrrrrrrggggggoor" },
];

const SEL = { start: 13, end: 16 };
const NOW = 10;

function BrandMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="ogMarkG" x1="10" y1="7" x2="55" y2="59">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <circle cx="32" cy="32" r="20" stroke="url(#ogMarkG)" strokeWidth="4" />
      <path
        d="M12 32h40M32 12c6 5.5 9 12.2 9 20s-3 14.5-9 20M32 12c-6 5.5-9 12.2-9 20s3 14.5 9 20"
        stroke="#60A5FA"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M32 21v12l9 5"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="33" r="3" fill="#FBBF24" />
    </svg>
  );
}

function HeatRow({ label, cells }: { label: string; cells: string }) {
  const bits = cells.split("");
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: 92,
          fontSize: 15,
          color: "#94A3B8",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", position: "relative" }}>
        {bits.map((h, i) => {
          const selected = i >= SEL.start && i < SEL.end;
          const style: CSSProperties = {
            width: 13,
            height: 30,
            marginRight: i === bits.length - 1 ? 0 : 3,
            borderRadius: 3,
            background: HEAT[h] ?? HEAT.r,
            display: "flex",
          };
          if (selected) {
            style.boxShadow = "inset 0 0 0 1.5px #60A5FA";
            style.background = "rgba(37,99,235,0.58)";
          }
          return <div key={`${label}-${i}`} style={style} />;
        })}
      </div>
    </div>
  );
}

export function OgArtwork(): ReactNode {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#0F172A",
        color: "#F8FAFC",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -100,
          top: -140,
          width: 480,
          height: 480,
          borderRadius: 240,
          background: "rgba(37,99,235,0.20)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -90,
          bottom: -130,
          width: 340,
          height: 340,
          borderRadius: 170,
          background: "rgba(251,191,36,0.08)",
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          padding: "72px 64px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 480,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <BrandMark size={80} />
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: -1.6,
                marginLeft: 20,
              }}
            >
              WorldTime
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 20,
              color: "#BFDBFE",
              marginTop: 22,
              lineHeight: 1.45,
            }}
          >
            <span style={{ display: "flex" }}>World clock, time zone converter,</span>
            <span style={{ display: "flex" }}>and meeting planner</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 16,
              color: "#7DD3FC",
            }}
          >
            <span style={{ display: "flex" }}>11 languages</span>
            <span style={{ display: "flex", margin: "0 12px", color: "#475569" }}>·</span>
            <span style={{ display: "flex" }}>Live offsets</span>
            <span style={{ display: "flex", margin: "0 12px", color: "#475569" }}>·</span>
            <span style={{ display: "flex" }}>DST-aware</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 48,
              fontSize: 18,
              color: "#64748B",
              letterSpacing: 0.4,
            }}
          >
            worldtime.app
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 520,
            background: "rgba(30,41,59,0.92)",
            borderRadius: 20,
            border: "1px solid #334155",
            padding: "28px 28px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              color: "#64748B",
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Overlap at a glance
          </div>
          <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
            {ROWS.map((row, idx) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  marginBottom: idx === ROWS.length - 1 ? 0 : 14,
                }}
              >
                <HeatRow label={row.label} cells={row.cells} />
              </div>
            ))}
            <div
              style={{
                position: "absolute",
                left: 92 + NOW * 16 + 5,
                top: -10,
                width: 2,
                height: 188,
                background: "#FBBF24",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 16,
              paddingLeft: 92,
              fontSize: 12,
              color: "#64748B",
            }}
          >
            <span style={{ display: "flex" }}>00</span>
            <span style={{ display: "flex" }}>06</span>
            <span style={{ display: "flex" }}>12</span>
            <span style={{ display: "flex" }}>18</span>
            <span style={{ display: "flex" }}>24</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 16,
              color: "#FDE68A",
            }}
          >
            Looks like a good time for everyone
          </div>
        </div>
      </div>
    </div>
  );
}
