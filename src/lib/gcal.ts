/**
 * Google 日历叠加（需求 6.1）—— 纯前端 Token Client 方案的数据层。
 *
 * 设计要点：
 * - 隐式授权（GIS Token Client），access token 约 1 小时过期、无 refresh token；
 *   过期后由调用方用 `requestAccessToken({ prompt: "none" })` 静默刷新（见
 *   `GoogleCalendarConnect.tsx` 的 `requestSilentRefresh`），失败才提示用户重连。
 * - 这里只放与 Google 无运行时依赖的纯逻辑（窗口计算、区间→列投影）和一个
 *   `fetchFreeBusy` 网络函数，便于在 `tests/lib/gcal.test.ts` 脱网单测投影逻辑。
 * - busy 投影与网格列语义严格对齐：只插入真实存在的 column-start ms
 *  （DST 日 23/25 列，非整点小时无对应列，自然跳过）。
 */

import { DateTime } from "luxon";
import type { GridColumn } from "@/lib/grid";

/**
 * Google 日历只读 scope。
 * 注意：freebusy 端点要求 `calendar` 或 `calendar.readonly`，无更窄的 freebusy scope；
 * 且 `calendar.readonly` 属 Google **sensitive scope**，正式公开需走 verification 流程，
 * 开发期需在 OAuth consent screen 把应用设为 Testing 并加测试用户。
 */
export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** Calendar freebusy 端点。 */
const FREEBUSY_ENDPOINT = "https://www.googleapis.com/calendar/v3/freeBusy";

/** 一小时窗口（毫秒），用于列 [c.ms, c.ms + 1h) 与 busy 区间的半开重叠判定。 */
const HOUR_MS = 3_600_000;

/** busy 区间，绝对时刻，半开 [startMs, endMs)。 */
export interface BusyRange {
  startMs: number;
  endMs: number;
}

/**
 * 读取 Google OAuth Client ID（须以 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 注入）。
 * 纯前端方案要求该 ID 内联进客户端 bundle，故必须 `NEXT_PUBLIC_` 前缀。
 * 未配置时返回空串，调用方据此禁用"连接"入口。
 */
export function gcalClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

/**
 * 把网格视图窗口转换为 freebusy 请求的 RFC3339 区间。
 * @param startMs 起始时刻（epoch 毫秒，通常为主地点本地午夜）
 * @param days    跨度天数（与网格一致，默认 7）
 */
export function freeBusyWindow(startMs: number, days = 7): {
  timeMin: string;
  timeMax: string;
} {
  const base = DateTime.fromMillis(startMs, { zone: "utc" });
  return {
    timeMin: base.toISO()!,
    timeMax: base.plus({ days }).toISO()!,
  };
}

/** 401 专用错误，调用方据此触发静默刷新而非当作普通失败。 */
export class GcalUnauthorizedError extends Error {
  constructor() {
    super("Google Calendar API returned 401");
    this.name = "GcalUnauthorizedError";
  }
}

/**
 * 调用 Calendar freebusy API，返回主日历（primary）的忙碌区间。
 *
 * @param accessToken OAuth access token
 * @param opts.timeMin RFC3339 起始
 * @param opts.timeMax RFC3339 结束
 * @param opts.timeZone 响应时间格式化时区（传主地点时区，便于排查）
 * @throws GcalUnauthorizedError token 过期/无效（401），调用方静默刷新后重试
 * @throws Error                 其他网络或解析错误
 */
export async function fetchFreeBusy(
  accessToken: string,
  opts: { timeMin: string; timeMax: string; timeZone: string },
): Promise<BusyRange[]> {
  const res = await fetch(FREEBUSY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      timeZone: opts.timeZone,
      // 仅查询主日历：需求是"空闲/忙碌"总览，主日历即用户默认日程。
      // 后续如需聚合多日历，可改为先 list calendars 再并入 items。
      items: [{ id: "primary" }],
    }),
  });
  if (res.status === 401) throw new GcalUnauthorizedError();
  if (!res.ok) {
    throw new Error(`freebusy failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
  };
  const busy = data.calendars?.primary?.busy ?? [];
  return busy.map((b) => ({
    // freebusy 返回的 ISO 串是绝对时刻，Date.parse 后与 column c.ms 同坐标系。
    startMs: Date.parse(b.start),
    endMs: Date.parse(b.end),
  }));
}

/**
 * 把 busy 区间列表投影到网格列的 column-start ms 集合。
 *
 * 一列 c 被标记为 busy，当且仅当其小时窗口 [c.ms, c.ms + 1h) 与某个 busy 区间
 * 半开重叠（c.ms < endMs && c.ms + 1h > startMs）。只插入真实存在于 columns 的 c.ms，
 * 与 Row 渲染的 `busyMs.has(c.ms)` 精确匹配语义一致。
 *
 * 复杂度 O(列数 × 区间数)：列数 ≤ 168、区间数通常 < 50，无需排序优化。
 */
export function busyRangesToMs(
  ranges: BusyRange[],
  columns: GridColumn[],
): Set<number> {
  const set = new Set<number>();
  for (const c of columns) {
    const colEnd = c.ms + HOUR_MS;
    for (const r of ranges) {
      if (c.ms < r.endMs && colEnd > r.startMs) {
        set.add(c.ms);
        break;
      }
    }
  }
  return set;
}
