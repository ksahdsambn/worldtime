/**
 * 极简 Toast 通知（无依赖、无 React Context）。
 *
 * 设计：模块级 pub/sub。任意模块调 `toast.success/error/info(msg)` 发布一条瞬时消息；
 * `<Toaster/>` 组件订阅并渲染。这样避免在 provider 树里穿透 context，调用方只需
 * `import { toast } from "@/lib/toast"`。
 *
 * 无障碍：Toaster 按类型给容器 `role="status"`（info/success，礼貌）或 `role="alert"`
 * （error，强制），供读屏即时播报。
 */

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let listeners: Set<Listener> = new Set();
let seq = 0;
/** 自动消失毫秒数；error 留得更久让用户读完。 */
const TTL: Record<ToastKind, number> = {
  success: 2600,
  info: 3200,
  error: 5200,
};

function emit() {
  const snapshot = items;
  for (const l of listeners) l(snapshot);
}

function push(kind: ToastKind, message: string) {
  // 容量保护：同屏最多 4 条，避免被刷屏
  const id = ++seq;
  items = [...items, { id, kind, message }].slice(-4);
  emit();
  const ttl = TTL[kind];
  // 在 reduced-motion / 测试环境也保证最终消失
  setTimeout(() => dismiss(id), ttl);
  return id;
}

export function dismiss(id: number) {
  if (!items.some((i) => i.id === id)) return;
  items = items.filter((i) => i.id !== id);
  emit();
}

export const toast = {
  success: (msg: string) => push("success", msg),
  error: (msg: string) => push("error", msg),
  info: (msg: string) => push("info", msg),
};

/** Toaster 组件订阅用。返回取消订阅函数。 */
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  // 订阅即推送当前快照，避免错过订阅前消息
  l(items);
  return () => {
    listeners.delete(l);
  };
}
