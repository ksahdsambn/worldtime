/**
 * Onboarding 一次性提示的记忆（轻量、typed）。
 *
 * 独立 key（worldtime:onboarding），与 worldtime:v1 应用状态互不干扰。
 * 所有读写都做 SSR / 隐私模式 / 损坏数据容错，失败时静默退化为「未看过」，
 * 最坏情况只是某条一次性提示再出现一次，不影响任何核心功能。
 */
const KEY = "worldtime:onboarding";

export interface OnboardingFlags {
  /** 是否已看过「拖拽选区」上下文提示 */
  dragHintSeen?: boolean;
}

function read(): OnboardingFlags {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingFlags) : {};
  } catch {
    return {};
  }
}

function write(flags: OnboardingFlags): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    // 隐私模式 / 配额不足：静默忽略
  }
}

/** 用户是否已看过「拖拽选区」提示。 */
export function isDragHintSeen(): boolean {
  return !!read().dragHintSeen;
}

/** 标记「拖拽选区」提示为已看（一次性，此后不再自动出现）。 */
export function markDragHintSeen(): void {
  write({ ...read(), dragHintSeen: true });
}
