/**
 * Google Identity Services (GIS) 最小类型声明（ambient 全局）。
 *
 * 仅覆盖本项目用到的 `google.accounts.oauth2` Token Client API（隐式授权模型）。
 * 完整字段见 https://developers.google.com/identity/oauth2/web/guides/use-token-model
 *
 * 该脚本由 `src/components/GisScript.tsx` 在客户端注入
 *（`https://accounts.google.com/gsi/client`），注入后 `window.google.accounts.oauth2`
 * 可用。本声明文件为非模块 ambient 文件，顶层 interface 自动全局可见，
 * `Window` 接口与 lib.dom 合并以补充 `google` 字段。
 */

interface GisOverridableTokenClientConfig {
  client_id: string;
  scope: string;
  /** 成功获取 access token 的回调。 */
  callback: (response: GisTokenResponse) => void;
  /** 可选错误回调（用户关闭弹窗、网络失败等）。 */
  error_callback?: (response: { type: string }) => void;
}

interface GisTokenClient {
  /**
   * 弹出授权弹窗请求 token。
   * override.prompt：`''`（默认，必要时弹窗）/ `'none'`（静默，无交互）/ `'consent'`（强制再次同意）。
   */
  requestAccessToken(override?: { prompt?: string }): void;
}

interface GisTokenResponse {
  access_token: string;
  /** token 有效期（秒）。 */
  expires_in: number;
  /** 过期绝对时刻（epoch 毫秒）。 */
  expires_at: number;
  /** 错误码（失败时）。 */
  error?: string;
  /** 错误描述（失败时）。 */
  error_description?: string;
}

interface GoogleAccountsOauth2 {
  initTokenClient(config: GisOverridableTokenClientConfig): GisTokenClient;
  /** 撤销已授予的 access token（断开连接时调用）。 */
  revoke(accessToken: string, done?: () => void): void;
}

interface GoogleAccountsNamespace {
  accounts: { oauth2: GoogleAccountsOauth2 };
}

interface Window {
  google?: GoogleAccountsNamespace;
}
