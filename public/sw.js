// WorldTime Service Worker —— 离线缓存（第八章 离线可用）。
//
// 缓存策略：
// - 导航请求（页面）：network-first，带 3 秒超时。在线时拿最新页面并缓存；
//   超时或离线时回退到缓存的「应用外壳」页面（/zh、/en）。
// - 静态资源（_next/static、字体、图片）：cache-first，回退网络并缓存；两者皆
//   失败时返回错误响应兜底。
//
// 关键修复（相对旧版）：
// 1. 旧版 APP_SHELL=["/"]，而 / 在 next-intl 下返回 307 重定向到 /zh，缓存的
//    实为重定向响应，离线时浏览器跟随重定向再次请求 /zh 又失败 → 显示离线
//    错误页。现改为直接预缓存真实可渲染的 /zh、/en。
// 2. 旧版 cache.addAll 任一失败即整体 reject；改为逐个缓存，容忍单页失败。
// 3. 导航 fallback 旧版仅 caches.match("/")（重定向响应）；现按精确 URL、
//    再按 locale shell 逐级回退，保证离线可打开应用。
// 4. network-first 导航加 3 秒超时，慢网下不再长时间挂起才回退缓存。
// 5. activate 时重新拉取并刷新 APP_SHELL，确保部署后即使未升 CACHE 版本号，
//    新版外壳也能被预缓存（配合 skipWaiting + controllerchange 单次刷新即时生效）。

const CACHE = "worldtime-v2";
// 预缓存的「应用外壳」：next-intl 的真实可渲染首页路径（非重定向的 /）。
const APP_SHELL = ["/zh", "/en"];
// 导航请求 network-first 的超时（毫秒）：超时即回退缓存，避免慢网长时间挂起。
const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 逐个缓存，单页失败不影响整体安装（如某 locale 暂不可达）。
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url);
            // 仅缓存成功响应，避免缓存 307/404/500。
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // 忽略单页失败
          }
        }),
      );
    })(),
  );
  self.skipWaiting();
});

/** 拉取并刷新 APP_SHELL 缓存（部署后保证外壳为最新，无需依赖升 CACHE 版本号）。 */
async function refreshShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    APP_SHELL.map(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res.clone());
      } catch {
        // 离线或不可达时忽略，保留旧缓存
      }
    }),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      );
      await self.clients.claim();
      // 清理旧缓存后刷新外壳，确保新部署的内容被预缓存。
      await refreshShell();
    })(),
  );
});

/** 带超时的 fetch：超时则抛错以便调用方回退缓存。 */
function fetchWithTimeout(req, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(req, { signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 仅处理同源请求，避免拦截第三方资源。
  if (url.origin !== self.location.origin) return;

  // 静态资源：cache-first，回退网络并缓存；两者皆失败时返回错误响应
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
    return;
  }

  // 导航请求：network-first（带超时），超时或离线时回退到缓存的 shell 页面
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(req, NAV_TIMEOUT_MS);
          // 仅缓存成功的最终页面（过滤掉鉴权重定向等）
          if (res.ok) {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => undefined);
          }
          return res;
        } catch {
          // 离线或超时：精确匹配本 URL；未命中则按 locale 回退到 shell 页面；
          // 仍无命中时返回兜底 shell（取任一已缓存的 shell）。
          const exact = await caches.match(req);
          if (exact) return exact;
          const locale = url.pathname.startsWith("/en") ? "/en" : "/zh";
          const shell = (await caches.match(locale)) || (await caches.match("/zh"));
          if (shell) return shell;
          return Response.error();
        }
      })(),
    );
    return;
  }
});
