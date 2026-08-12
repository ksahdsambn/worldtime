import type { PlaceItem, TimeSelection } from "@/store/useWorldTimeStore";
import { MAX_PLACES } from "@/store/useWorldTimeStore";
import { CITY_BY_ID } from "@/data/cities";

/**
 * 分享链接序列化（MS-6 / 6.6）。
 *
 * 编码方案（紧凑、URL 安全）：
 * - places: 以逗号分隔的 cityId 列表，主地点前置 "*"。
 *   例："*cn-beijing,us-new-york"
 * - sel: "startMs-endMs"（epoch 毫秒），缺省表示无选区。
 * - c: 游标时刻（epoch 毫秒，TC-4），缺省表示无游标。
 *
 * 查询参数名：p（places）、s（selection）、c（cursor）。
 */

/**
 * 将当前状态编码为查询串（不含前导 "?"）。
 *
 * places 段对各 id 分别 encodeURIComponent 后用「,」连接（逗号属 query 合法
 * sub-delim，保留原样使链接更可读，且与 decodeState 的 split(",") 对齐）。
 * 主地点前置 "*"（星号同样为合法 sub-delim，无需编码）。
 */
export function encodeState(
  places: PlaceItem[],
  homeId: string | null,
  selection: TimeSelection | null,
  cursorMs: number | null = null,
): string {
  const parts: string[] = [];
  if (places.length > 0) {
    const p = places
      .map((pl) => (pl.id === homeId ? `*${encodeURIComponent(pl.id)}` : encodeURIComponent(pl.id)))
      .join(",");
    parts.push(`p=${p}`);
  }
  if (selection) {
    parts.push(`s=${selection.startMs}-${selection.endMs}`);
  }
  if (cursorMs != null) {
    parts.push(`c=${cursorMs}`);
  }
  return parts.join("&");
}

/** 解析查询串为状态。 */
export function decodeState(
  query: string,
): {
  places: PlaceItem[];
  homeId: string | null;
  selection: TimeSelection | null;
  cursorMs: number | null;
} {
  const params = new URLSearchParams(query);
  const result: {
    places: PlaceItem[];
    homeId: string | null;
    selection: TimeSelection | null;
    cursorMs: number | null;
  } = { places: [], homeId: null, selection: null, cursorMs: null };

  const p = params.get("p");
  if (p) {
    // URLSearchParams.get 已做一次 URL 解码；此处不再重复解码，
    // 避免含 % 的 id 被二次误解码（如 %2C 被错解为逗号）。
    // 上限保护：畸形/超长链接最多解析 MAX_PLACES 个，防止渲染爆炸（与 store.addPlace 一致）。
    const ids = p.split(",").filter(Boolean).slice(0, MAX_PLACES);
    let homeId: string | null = null;
    const places: PlaceItem[] = [];
    for (const raw of ids) {
      const isHome = raw.startsWith("*");
      const id = isHome ? raw.slice(1) : raw;
      const city = CITY_BY_ID[id];
      if (city) {
        places.push({ ...city, tags: [] });
        if (isHome) homeId = id;
      }
    }
    // 若标记了主地点则用之；否则取首项
    result.places = places;
    result.homeId = homeId ?? (places[0]?.id ?? null);
  }

  const s = params.get("s");
  if (s) {
    const m = s.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      // 校验：起 < 止（拒绝反向选区，避免下游显示负时长 / 生成无效日历事件）；
      // 且差值不超过 7 天（防御极端值，如 s=99999999999999999999-1）。
      const SELECTION_MAX_MS = 7 * 24 * 3600_000;
      if (a < b && b - a <= SELECTION_MAX_MS) {
        result.selection = { startMs: a, endMs: b };
      }
    }
  }

  const c = params.get("c");
  if (c) {
    const cm = c.match(/^(\d+)$/);
    if (cm) result.cursorMs = Number(cm[1]);
  }

  return result;
}

/**
 * 复制文本到剪贴板（用户手势上下文内调用）。
 * 优先 navigator.clipboard，降级到 execCommand。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 降级
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
