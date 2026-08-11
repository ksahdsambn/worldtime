"use client";

import { useUrlStateSync } from "@/lib/useUrlState";
import { useLocalPersist } from "@/lib/useLocalPersist";

/**
 * 客户端壳组件：
 * - 挂载时从 URL 还原状态、状态变化时回写 URL（MS-6）。
 * - 挂载时从 localStorage 恢复、状态变化时持久化（步骤 2.16）。
 *
 * 注意：useUrlStateSync 内部确保 URL 优先于本地存储。
 */
export default function UrlStateSync() {
  useLocalPersist();
  useUrlStateSync();
  return null;
}
