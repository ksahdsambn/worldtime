/**
 * Google Identity Services (GIS) 鉴权模块（纯前端 Token Client 方案，需求 6.1）。
 *
 * 单例管理 token client、GIS 脚本就绪态与回调 resolver，供：
 * - `GoogleCalendarConnect`（首次连接 / 断开 / 挂载恢复）
 * - `TimeGrid`（freebusy 收到 401 时调 `requestSilentRefresh`）
 * 共享。鉴权逻辑集中在此，组件保持纯 UI。
 *
 * token 约 1h 过期、无 refresh token；sessionStorage 仅作"刷新页面后免重新点授权"
 * 的临时缓存（过期后由 401 静默刷新覆盖），不写 localStorage、不构成长期凭据。
 */

import { gcalClientId, GCAL_SCOPE } from "@/lib/gcal";
import { useWorldTimeStore } from "@/store/useWorldTimeStore";

const TOKEN_KEY = "worldtime:gcal-token";
const GIS_TIMEOUT_MS = 10_000;

let tokenClient: GisTokenClient | null = null;
let gisPromise: Promise<GoogleAccountsOauth2> | null = null;
/** 首次连接（弹窗）的结果 resolver。 */
let connectResolver: ((ok: boolean) => void) | null = null;
/** 静默刷新的结果 resolver（回传新 token 或 null）。 */
let silentRefreshResolver: ((token: string | null) => void) | null = null;

/** 轮询等待 GIS 脚本就绪（由 <GisScript /> 注入）。超时 reject。 */
function waitForGis(): Promise<GoogleAccountsOauth2> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<GoogleAccountsOauth2>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const g =
        typeof window !== "undefined" ? window.google?.accounts?.oauth2 : undefined;
      if (g) {
        resolve(g);
        return;
      }
      if (Date.now() - start > GIS_TIMEOUT_MS) {
        gisPromise = null;
        reject(new Error("GIS script load timeout"));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
  return gisPromise;
}

/** 懒初始化 token client（单例）。callback 同时服务"首次连接"与"静默刷新"。 */
function ensureTokenClient(
  oauth2: GoogleAccountsOauth2,
  clientId: string,
): GisTokenClient {
  if (tokenClient) return tokenClient;
  tokenClient = oauth2.initTokenClient({
    client_id: clientId,
    scope: GCAL_SCOPE,
    callback: (resp) => {
      const token = resp.access_token || null;
      if (token) {
        // 脱离 React 作用域写 store：用 getState() 直接拿 setter
        const store = useWorldTimeStore.getState();
        store.setGcalAccessToken(token);
        sessionStorage.setItem(TOKEN_KEY, token);
        store.setGcalConnected(true);
      }
      if (connectResolver) {
        connectResolver(!!token);
        connectResolver = null;
      }
      if (silentRefreshResolver) {
        silentRefreshResolver(token);
        silentRefreshResolver = null;
      }
    },
    error_callback: () => {
      // 用户关闭弹窗 / origin 未授权 / 网络失败等
      if (connectResolver) {
        connectResolver(false);
        connectResolver = null;
      }
      if (silentRefreshResolver) {
        silentRefreshResolver(null);
        silentRefreshResolver = null;
      }
    },
  });
  return tokenClient;
}

/** 首次连接：弹窗授权（必要时），返回是否成功拿到 token。 */
export async function requestInteractiveAuth(): Promise<boolean> {
  const clientId = gcalClientId();
  if (!clientId) return false;
  try {
    const oauth2 = await waitForGis();
    const client = ensureTokenClient(oauth2, clientId);
    return await new Promise<boolean>((resolve) => {
      // 并发保护：若上一次交互授权尚未回调，先按「取消」结算其 promise，
      // 避免被覆盖后永悬（resolver 为模块级单例）。常见触发：用户连点「连接」。
      if (connectResolver) {
        connectResolver(false);
        connectResolver = null;
      }
      connectResolver = (v) => resolve(v);
      client.requestAccessToken();
    });
  } catch {
    return false;
  }
}

/**
 * 静默刷新：用 prompt:"none" 无交互尝试。Google 会话还在则返回新 token，否则 null。
 * 供 TimeGrid 在 freebusy 收到 401 时调用。
 */
export async function requestSilentRefresh(): Promise<string | null> {
  const clientId = gcalClientId();
  if (!clientId) return null;
  try {
    const oauth2 = await waitForGis();
    const client = ensureTokenClient(oauth2, clientId);
    return await new Promise<string | null>((resolve) => {
      // 并发保护：同 requestInteractiveAuth，先结算挂起的刷新 resolver。
      if (silentRefreshResolver) {
        silentRefreshResolver(null);
        silentRefreshResolver = null;
      }
      silentRefreshResolver = (token) => resolve(token);
      client.requestAccessToken({ prompt: "none" });
    });
  } catch {
    return null;
  }
}

/** 挂载时从 sessionStorage 恢复 token（刷新页面后免重新点授权）。 */
export function restoreGcalToken(): void {
  if (typeof window === "undefined") return;
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (saved) {
    const store = useWorldTimeStore.getState();
    store.setGcalAccessToken(saved);
    store.setGcalConnected(true);
  }
}

/** 清除会话：token + 连接态 + sessionStorage 缓存（不断开远端授权）。 */
export function clearGcalSession(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(TOKEN_KEY);
  const store = useWorldTimeStore.getState();
  store.setGcalAccessToken(null);
  store.setGcalConnected(false);
}

/** 断开：revoke 远端 token + 清本地会话。 */
export async function disconnectGcal(): Promise<void> {
  const token = useWorldTimeStore.getState().gcalAccessToken;
  try {
    const oauth2 = await waitForGis();
    if (token) oauth2.revoke(token);
  } catch {
    // GIS 未就绪也允许本地断开（清状态即可）
  }
  clearGcalSession();
}
