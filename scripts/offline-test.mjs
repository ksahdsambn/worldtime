// 离线行为验证脚本（Service Worker）。
// 用法：node scripts/offline-test.mjs
// 前置：npm run build && npm run start（localhost:3000 可达）
import { chromium } from "playwright";

const URL = "http://localhost:3000/zh";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// 1) 先正常加载，让 SW 安装并预缓存 shell
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 2) 确认 SW 已激活 + v2 缓存含 /zh /en
const info = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration("/sw.js");
  const keys = await caches.keys();
  const v2 = await caches.open("worldtime-v2");
  const urls = (await v2.keys()).map((q) => q.url);
  return { activated: r && r.active && r.active.state === "activated", keys, urls };
});
console.log("STEP1 sw/cache:", JSON.stringify(info));

// 3) 模拟离线
await ctx.setOffline(true);
await page.waitForTimeout(300);

// 4) 刷新页面 —— 离线下应能从缓存打开（network-first 回退 shell）
let offlineTitle = "";
let offlineOk = false;
try {
  const resp = await page.reload({ waitUntil: "domcontentloaded" });
  offlineOk = resp ? resp.ok() : false;
  offlineTitle = await page.title();
} catch (e) {
  offlineTitle = "ERROR: " + e.message;
}

// 5) 离线下再导航到一个从未访问过的带参数 URL
let deepTitle = "";
let deepOk = false;
try {
  const resp = await page.goto("http://localhost:3000/zh?p=us-new-york", {
    waitUntil: "domcontentloaded",
  });
  deepOk = resp ? resp.ok() : false;
  deepTitle = await page.title();
} catch (e) {
  deepTitle = "ERROR: " + e.message;
}

console.log("STEP2 offline reload:", { ok: offlineOk, title: offlineTitle });
console.log("STEP3 offline deep nav:", { ok: deepOk, title: deepTitle });

await ctx.setOffline(false);
await browser.close();

const pass =
  info.activated &&
  info.urls.includes("http://localhost:3000/zh") &&
  info.urls.includes("http://localhost:3000/en") &&
  offlineTitle === "WorldTime" &&
  deepTitle === "WorldTime";
console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(pass ? 0 : 1);
