# WorldTime 代码审查报告

- 审查人：ZCode（builtin:bigmodel-coding-plan/GLM-5.2）
- 审查日期：2026-08-11
- 审查范围：`src/`（15 个 lib 模块、25 个组件、store、data、app 路由）、`public/sw.js`、`messages/*.json`（11 语言）、`tests/`、根目录配置（`next.config.mjs`、`tsconfig.json`、`package.json`、`Dockerfile`、`docker-compose.yml`、`.dockerignore`、`vitest.config.mts`、`tailwind.config.ts`、`.eslintrc.json`、`globals.css`）
- 声明：本次为独立审查，未参考项目内任何历史审查记录（`progress.md` 等仅扫了结构，未读内容）。所有时区/DST 结论均用 `node` + 项目内置 Luxon 2.5 实际运行验证，可复现命令见各条目。

## 高风险区域识别（审查前预判）

1. **DST / 时区**（`lib/time.ts`、`lib/grid.ts`）—— MVP 的命门，时间算错产品即失效。
2. **三处状态同步**（store / localStorage / URL）—— 竞态、覆盖、回写循环。
3. **URL / base64 解码**（`lib/shareUrl.ts`、`lib/calendar.ts`）—— 畸形输入、注入。
4. **热力图"最差优先"算法**（`lib/heatmap.ts`）—— 优先级组合与周末/节假日覆盖。
5. **Service Worker 缓存**（`public/sw.js`）—— 跨会话状态泄漏、旧缓存。
6. **依赖供应链**（`package.json`）—— `next` 版本 CVE。

整体评价：代码组织清晰、注释翔实、纯函数与副作用边界划得干净，纯函数测试覆盖较扎实。主要风险集中在 **DST 窗口边界（末尾日被截断 1 小时）**、**依赖存在高危 CVE**、**深色模式下热力图配色失效**、**反向选区未校验**、**组件/状态层零测试** 这几处。

---

## 二、第 1 轮发现（全局快速扫描）

### [P1] 依赖 `next@14.2.35` 存在多个高危 CVE
- **严重度**：P1
- **类别**：安全
- **位置**：`package.json:24`（`"next": "14.2.35"`）
- **问题描述**：`npm audit` 报告 `next` 在 `9.3.4-canary.0 - 16.3.0-preview.10` 范围内存在 **23 条以上高危公告**（含 SSRF、缓存投毒、请求走私、RSC DoS、i18n 中间件绕过、Image Optimizer DoS / 无限缓存增长、CSP nonce XSS 等），并连带 `postcss <=8.5.22`（传递依赖）的路径穿越 / XSS 高危项。
- **触发条件 / 复现**：
  ```bash
  npm audit --omit=dev
  # 输出：next high severity（23+ advisories），postcss high severity
  ```
- **影响**：作为 Node server 模式部署（`output: "standalone"`，运行 `next start`），所有 server 侧漏洞面（中间件绕过、RSC、rewrites、image optimizer）都直接暴露。其中 `GHSA-36qx-fr4f-26g5`（i18n 中间件 Pages Router 绕过）对本项目启用 `next-intl` 中间件（`src/middleware.ts`）的场景尤其相关。
- **建议修复**：升级 `next` 至当前 14.x 最新补丁版（≥14.2.x 最新）；若条件允许，跟随 `npm audit fix --force` 升至 16.x（注意 App Router / `next-intl` 4.x 的 breaking change，需回归测试）。同步升级 `eslint-config-next`。`postcss` 的修正是 `next` 升级的连带项。
- **验证方式**：升级后 `npm audit` 无 high/critical；`npm run build && npm start` 冒烟通过；重点回归 `/zh`、`/en`、`/[locale]/time-converter/[slug]`、`/[locale]/event/[code]` 路由的 SSR 与 ISR。

### [P2] 组件/状态层零单元测试，关键路径无回归保护
- **严重度**：P2
- **类别**：质量（测试盲区）
- **位置**：`tests/`（仅 `tests/lib/*.test.ts` 与 `tests/data/holidays.test.ts`）；`src/components/*`、`src/lib/useUrlState.ts`、`src/lib/useLocalPersist.ts`、`src/store/*` 均无测试。
- **问题描述**：`vitest.config.mts` 仅 `include: ["tests/**/*.test.ts"]`、`environment: "node"`，没有任何组件/状态测试。三处状态同步（URL ↔ store ↔ localStorage）、TimeGrid 拖拽选区、SelectionBar 导出、PlacesPanel 拖拽排序等交互逻辑完全无自动化覆盖。
- **影响**：本次审查已发现的 `buildColumns` DST 末尾日截断、反向选区、深色模式配色等 Bug，若有组件/状态测试更易暴露；后续重构（如升级 next）缺乏回归网。
- **建议修复**：引入 `happy-dom` + `@testing-library/react`，把 `environment` 按需切换；优先补：(1) `decodeState` 反向选区场景（已有 round-trip 测试，缺边界）；(2) `useUrlStateSync` + `useLocalPersist` 的"URL 优先于本地"组合；(3) TimeGrid pointer down/move/up 产出 `selection` 的快照。
- **验证方式**：新增测试 `npm test` 全绿；故意制造回归（如把 `buildColumns` 的 `totalHours` 改回 `days*24` 不补偿）确认被测试捕获。

### [P2] 小组件存在硬编码英文字面量未走 i18n
- **严重度**：P2
- **类别**：i18n
- **位置**：
  - `src/components/WorldClockWidget.tsx:51`（`<h2>World Clock</h2>`）、`:53`（`?cities=...`）
  - `src/components/EventWidget.tsx:36`（`?code=...` 占位）
- **问题描述**：这两个 widget 组件的标题与空态占位文案是硬编码英文，未走 `useTranslations`。其余 11 语言用户访问 `/[locale]/widget/world-clock`、`/[locale]/widget/event` 时会看到英文标题。
- **触发条件 / 复现**：访问 `/zh/widget/world-clock`，标题恒为 "World Clock"。
- **影响**：i18n 不完整，非英文用户体验打折；与"11 语言全覆盖"承诺不一致。
- **建议修复**：在 `messages/*.json` 的 `Widget` 命名空间补充 `worldClockTitle`/`worldClockEmpty`/`eventEmpty` 等 key（`worldClockTitle`/`eventTitle` 已存在），组件内用 `useTranslations("Widget")` 取值。
- **验证方式**：切换至 de/ja/ru 等，标题随之变化；`flat key diff`（见审查脚本）仍为 OK。

### [P3] `as` 类型断言较多，部分可收紧
- **严重度**：P3
- **类别**：质量
- **位置**：`src/app/[locale]/event/[code]/page.tsx:17-18`、`widget/event/page.tsx:19-20`、多处 `useLocale() as AppLocale`。
- **问题描述**：`params.locale as AppLocale` 在 `routing.locales.includes(...)` 判定后断言是合理的，但 `useLocale() as AppLocale`（LocaleSwitcher/PlacesPanel/TimeGrid/SelectionBar）依赖 next-intl 中间件已过滤，属隐式假设。数量多，非错误。
- **建议修复**：可封装一个 `useAppLocale()` hook 内聚 `useLocale() as AppLocale`，减少散落断言；低优先级。

---

## 三、第 2 轮发现（逐函数深度跟踪）

### [P1] `buildColumns` 在秋退（fall-back）窗口截断末尾日最后一小时
- **严重度**：P1
- **类别**：Bug（DST 边界）
- **位置**：`src/lib/grid.ts:35-64`（`buildColumns`）
- **问题描述**：函数用 `totalHours = days * 24` 作为循环上界，再对 `seenMs` 去重。秋退日（如 NY 2026-11-01，本地 02:00→01:00，01 时段重复）会让该日产生 **25 个不同本地小时**，而 `startLocal.plus({ hours: i })` 在 i=0..167 范围内因秋退多消耗 1 个"步进"，导致末尾日的 **23:00 小时被推出循环范围**，整窗仍是 168 列但最后一日只剩 23 列、缺 23:00。
- **触发条件 / 复现**（已用项目内置 Luxon 实跑）：
  ```js
  // 起始日 = NY 秋退日 2026-11-01，days=7
  const start = DateTime.fromISO("2026-11-01",{zone:"America/New_York"}).startOf("day").toMillis();
  // buildColumns 复刻：totalHours=168，seenMs 去重
  // 结果：dayIndex 分布 {0:25,1:24,2:24,3:24,4:24,5:24,6:23}，最后一列落在 11-07 22:00
  ```
  即"7 天网格"实际只显示到第 7 天的 22:00，23:00 那一格消失。
- **影响**：主地点为含秋退时区（美洲/欧洲/澳洲绝大部分）且起始日落在或早于秋退日时，用户看不到末尾日 23:00 时段，可能误判该时段不可约。春进窗口（`tests/lib/grid.test.ts` 已覆盖）因去重后"少 1 列"反而末尾多出 dayIndex=7 的 1 列，方向相反但同样偏离"恰好 7 个自然日"。
- **建议修复**：不以固定 `days*24` 为循环上界，而是**按自然日生成**——逐日 `startOf("day").plus({days:d})` 取该日午夜，再在该日内的"真实存在的本地小时"上展开（用 `interval` 或逐小时 `plus` 直到跨入次日）。或更简单：循环到"已覆盖 `days` 个不同自然日且当前日已铺满到次日午夜"为止，而非固定 168 次。需同步更新 `TimeGrid` 表头分组（`dayGroups`）已按 `dayIndex` 聚合，逻辑可兼容列数变化。
- **验证方式**：新增测试——以秋退日为起始的 7 天窗口，断言：(1) 最后一列的本地时刻 = 起始日+6 天的 23:00；(2) dayIndex 连续覆盖 0..6；(3) 各日列数之和仍等于总列数。春进窗口同理断言"恰好 7 个自然日"。

### [P1] `decodeState` 接受反向选区（startMs > endMs），下游显示负时长
- **严重度**：P1
- **类别**：Bug / 安全（畸形输入）
- **位置**：`src/lib/shareUrl.ts:83-92`（`s` 参数解析）
- **问题描述**：`s` 的正则只校验 `\d+-\d+`，不校验大小关系。分享链接 `?s=2000-1000` 会被解码为 `{startMs:2000, endMs:1000}` 并写入 store。随后 `SelectionBar` 计算 `ms = sel.endMs - sel.startMs = -1000`，传给 `formatDuration` 得到负数分钟，显示异常（如 "-1 minutes" 或 `zero` 分支）；`buildIcs` / `googleCalendarUrl` 会生成 DTEND 早于 DTSTART 的事件，日历应用可能拒绝或显示 0 时长。
- **触发条件 / 复现**（已实跑）：`decodeState("s=2000-1000").selection === { startMs:2000, endMs:1000 }`。
- **影响**：恶意/手误构造的分享链接会让接收方看到错乱时长与无效日历事件；虽无数据损坏，但核心"时长显示"功能被绕过。
- **建议修复**：在 `decodeState` 的 `s` 分支增加 `Number(m[1]) < Number(m[2])` 校验，不满足则 `result.selection = null`。顺带可加一个合理上限（如两端都为正、差值 ≤ 7 天）以防 `s=99999999999999999999-1` 这类极端值。
- **验证方式**：新增测试 `decodeState("s=2000-1000").selection === null`、`decodeState("s=1000-2000").selection` 正常；TimeGrid 拖拽路径不受影响（拖拽用 `Math.min/Math.max`，天然不会反向）。

### [P2] 深色模式下热力图三色与选区高亮未适配，可读性差
- **严重度**：P2
- **类别**：a11y / 视觉
- **位置**：`src/app/globals.css:13-60`（深色模式覆盖）；`src/lib/heatmap.ts:70-81`（`heatBg` 用 `bg-green-200/60` 等浅色）；`src/components/TimeGrid.tsx:265-271`（选区 `bg-blue-300`、周末 `bg-gray-100`）。
- **问题描述**：`globals.css` 的 `.dark` 覆盖了 `bg-white/bg-gray-*/text-*`，但**没有覆盖** `bg-green-200/60`、`bg-orange-200/60`、`bg-red-200/60`、`bg-blue-300`、`bg-gray-100`（周末）。这些浅色叠加在深色背景上：热力图色块仍是浅色低饱和、文字仍是深色（`text-blue-900` 等），导致深色模式下热力图格子"浅底深字"对比度尚可但整体刺眼且与深色主题割裂；选区 `bg-blue-300 text-blue-900` 在深底上过亮。
- **触发条件 / 复现**：切换至深色主题，添加几个跨时区城市，观察网格红/橙/绿与选区蓝。
- **影响**：6.8 明暗主题切换（P1）在网格主区域体验不完整；色弱用户在深色下更难区分三色（色块饱和度低）。
- **建议修复**：在 `.dark` 下为热力图三色、选区、周末补充深色变体（如 `.dark .bg-green-200\/60{background-color: rgba(34,197,94,.25)!important}` 并相应调文字色），或在 `heatBg` 返回按主题切换的类名（需组件感知主题）。同时核对红/橙/绿在深底的 WCAG AA 对比度。
- **验证方式**：深色模式下用浏览器 DevTools 的 Contrast 检查格子文字对比度 ≥ 4.5:1；视觉回归三色可区分。

### [P2] `TimeGrid` 点击（无拖拽）会强制选中最少 1 小时，无法用指针清除选区
- **严重度**：P2
- **类别**：Bug / UX
- **位置**：`src/components/TimeGrid.tsx:106-138`（`onPointerDown` / `onPointerUp`）
- **问题描述**：`onPointerDown` 立即 `setIsDragging(true)` 并把 `dragStart=dragEnd=ms`；`onPointerUp` 中 `start=Math.min(dragStart,dragEnd)`、`end=Math.max(...)+3600_000`，于是**哪怕只是单击未移动**，也会 `setSelection({startMs:ms, endMs:ms+3600_000})` 选中 1 小时。用户想清除选区只能依赖 Escape（`KeyboardShortcuts`）或"清除选区"按钮（`SelectionBar`），指针操作无法取消。
- **触发条件 / 复现**：在网格上任意单击一个格子 → 选区立刻出现 1 小时高亮。
- **影响**：移动端/触屏用户易误触产生非预期选区，进而触发底部 SelectionBar 弹出与 URL 回写带 `s=` 参数。
- **建议修复**：在 `onPointerUp` 判定 `dragStart===dragEnd`（或位移小于阈值）时视为"点击"，可选项：(a) 清除选区（`setSelection(null)`）；(b) 保持空，仅当真的发生 `pointermove` 才选中。需与"点击格子选 1 小时"的产品意图确认（若是有意设计，至少支持再次点击同一格取消）。
- **验证方式**：新增组件测试模拟 pointer down→up（无 move）断言 `selection === null`（或按确认后的预期）。

### [P2] `localStorage` 恢复 places 时丢失 `customName` / `tags`，与运行时状态不一致
- **严重度**：P2
- **类别**：Bug（数据持久化）
- **位置**：`src/lib/useLocalPersist.ts:62-71`（恢复 places）、`:98-99`（写入仅存 `placeIds`）；`src/lib/shareUrl.ts:74`（URL 解码同样 `{ ...city, tags: [] }`）
- **问题描述**：`PersistShape` 只存 `placeIds: string[]`，不存 `customName` 与 `tags`。恢复时 `CITY_BY_ID[id]` 重建 `{ ...city, tags: [] }`，**用户重命名的 `customName` 与打的标签全部丢失**。URL 分享链接同样不编码这两个字段（`encodeState` 只序列化 id）。
- **触发条件 / 复现**：给地点重命名 / 打标签 → 刷新页面 → 名称回到城市原名、标签消失。
- **影响**：6.5 地点高级管理（重命名、标签分组，P1）的持久化失效，刷新即丢。这与"数据持久化：地点列表、设置、选区保存在浏览器本地，刷新页面后保持不变"（需求第八章）直接冲突。
- **建议修复**：`PersistShape` 改存完整 `places: PlaceItem[]`（或 `placeIds` + 每项的 `customName?` / `tags`），恢复时合并 `CITY_BY_ID` 基础数据与持久化的用户字段。URL 编码若想保留这两字段，可扩展 `p` 段格式（兼容旧格式）；若刻意不分享重命名，至少 localStorage 必须保留。
- **验证方式**：重命名+打标签后刷新，断言 store 中 `places[i].customName/tags` 与刷新前一致。

### [P2] `columnColor` 在所有地点时区非法时返回 `green`（应为 `null`）
- **严重度**：P2
- **类别**：Bug（边界）
- **位置**：`src/lib/heatmap.ts:42-67`
- **问题描述**：循环里 `if (!dt.isValid) continue;` 跳过非法时区地点。若**所有**地点时区都非法（理论上 CITY_BY_ID 保证不会，但防御性看），`worst` 保持初值 `0` → `rankToColor(0)` 返回 `"green"`，给用户"全员工作时段"的误导，而非 `null`（不渲染热力）。
- **触发条件 / 复现**：构造 `places=[{timeZone:"Foo/Bar",countryCode:"XX",...}]` 调用 `columnColor`，返回 `"green"`。
- **影响**：低概率（数据源受控），但与函数注释"地点列表为空时返回 null"的防御意图不一致。
- **建议修复**：在循环中记录"是否有任一有效地点"，若全无效则 `return null`。
- **验证方式**：单测 `columnColor([{timeZone:"Foo/Bar",countryCode:"XX"}], ms, periods) === null`。

### [P3] `nextDSTChange` 的 `prevDST` 取自 `start`（fromMs），而循环 `dt` 从 `startOf("month")` 起，存在状态基线不一致
- **严重度**：P3（当前实现经多组用例验证仍正确，属可读性/健壮性隐患）
- **类别**：Bug（DST 探测）
- **位置**：`src/lib/time.ts:27-53`
- **问题描述**：`prevDST` 由 `start.startOf("day").plus({hours:12}).isInDST` 计算（基于 fromMs 当日正午），而循环里的 `dt` 从 `start.startOf("month")` 开始推进，比较的 `nextDST` 是下个月 1 日正午。两者基准日期不同，逻辑上比较的是"fromMs 当日"与"各月 1 日"的 DST 状态。实测在常见用例（月中探测、月初探测、跨切换日探测）都能正确定位下次切换（已验证 NY/Sydney 多点），但当 fromMs 恰为某月 1 日且该月在月初就发生切换时，`prevDST` 与首轮 `dt`（同月 1 日）的基线才一致；其余时候靠"同状态不触发、跨月才触发"的容差工作。
- **影响**：目前未发现实际错误返回，但代码可读性差、边界推理脆弱，未来若有人改探测步长（如改为按周）易引入回归。
- **建议修复**：让 `prevDST` 与循环 `dt` 同基线——把 `prevDST` 改为 `dt.plus({hours:12}).isInDST`（即起始月 1 日正午），统一比较基准；或添加注释明确"有意用 fromMs 当日做初值"。补南半球（Sydney 10 月春进）与 fromMs 在切换日当天的用例。
- **验证方式**：现有 `tests/lib/time.test.ts` 未直接测 `nextDSTChange`，建议新增：NY 从 1/3/7/11 月月中探测、Sydney 从 4/7/10 月探测、fromMs 恰为切换日 00:00 / 12:00 / 23:00 探测。

---

## 四、第 3 轮发现（交叉验证与查漏补缺）

### [P2] Service Worker 缓存导航响应可能携带 URL 中的选区/游标，跨会话泄漏分享状态
- **严重度**：P2
- **类别**：安全 / 隐私
- **位置**：`public/sw.js:115-142`（navigate 分支 `caches.open(CACHE).then(c=>c.put(req,copy))`）
- **问题描述**：navigate 请求 network-first 成功后，把**完整请求 URL**（`req`）作为 key 缓存响应。当用户打开带 `?p=...&s=...&c=...` 的分享链接，该带状态 URL 会被缓存；离线时 `caches.match(req)` 精确命中同一 URL 才回放，看似隔离。但：(a) 缓存的 HTML 内嵌的客户端 JS 水合后又会读 URL 写回 store，离线下 URL 仍含明文状态；(b) SW 缓存跨会话持久，除非 activate 清理（仅清"非 CACHE 名"的旧缓存，同名 `worldtime-v2` 不清），这些带状态页面会长期留存；(c) 多用户共用设备的隐私模式下也可能被后续用户通过 history 看到带状态的 URL。
- **触发条件 / 复现**：在线访问 `https://host/zh?p=*cn-beijing,us-new-york&s=...` → 断网 → 重开同 URL（或从 history 重入）→ 命中缓存，地点与选区可见。
- **影响**：与"隐私：无需注册、无行为追踪，用户数据仅存于浏览器本地"不冲突（确实只在本地），但"分享状态被持久缓存进 SW"超出 localStorage 的预期留存面，共用设备场景有轻微隐私暴露。
- **建议修复**：navigate 缓存时**剥离 query string** 作为 key（`new URL(req.url); url.search=""; cache.put(url.toString(), copy)`），回放时也按裸路径匹配；或仅缓存已知的无状态外壳路径（`/zh`、`/en`），对带 query 的导航只走网络不缓存。
- **验证方式**：带 `?p=` 访问后断网，重开**裸路径** `/zh` 应得到干净外壳；SW DevTools 查看缓存条目不含 query。

### [P2] `useLocalPersist` 写回 useEffect 依赖闭包变量，恢复当次可能写入"默认值快照"
- **严重度**：P2（代码注释已自称用 `getState()` 规避，但仍有窗口期）
- **类别**：Bug（状态同步）
- **位置**：`src/lib/useLocalPersist.ts:94-113`
- **问题描述**：写回 effect 的依赖是 `[places, homeId, hourFormat, dayPeriods, selection, cursorMs]`（闭包值），函数体内用 `useWorldTimeStore.getState()` 取实时值——注释说明了这是为避免"恢复当次读到旧闭包值"。但 effect 在 `restored.current` 置 true **之前**（首次挂载）也会被调度：React 首次渲染后所有 effect 按注册顺序跑，`restored` effect 先把 `restored.current=true` 再恢复，紧接着写回 effect 跑——此时 `getState()` 已是恢复后的值，OK。然而 `useUrlStateSync` 与 `useLocalPersist` 是两个独立 hook，注册顺序为 `useLocalPersist` → `useUrlStateSync`（见 `UrlStateSync.tsx:14-15`），即**本地恢复先于 URL 恢复**执行。URL 恢复（`setPlaces` 等）触发 store 变更 → 写回 effect 再跑一次，用 `getState()` 写入"URL places + 本地 settings"的混合——这是预期。真正风险点：若 `useUrlStateSync` 的恢复 effect 因 `hydrated.current` 守卫只跑一次，而用户后续手动改 places，写回 effect 依赖能感知——正常。综合看当前实现**功能正确**，但两套 `restored`/`hydrated` ref 守卫 + 双 hook 顺序耦合脆弱，重构时易错。
- **影响**：当前未观察到数据丢失，但耦合度高。
- **建议修复**：合并 `useLocalPersist` 与 `useUrlStateSync` 为单一 `useStateSync` hook，统一"恢复优先级（URL > localStorage > 默认）"与"写回（store→URL & localStorage）"于一处，消除双 ref 守卫与隐式顺序依赖；或至少在 `UrlStateSync` 加注释固化注册顺序契约。
- **验证方式**：组合测试——(a) 仅 localStorage 有状态 → 刷新 → 恢复；(b) URL 带 `p=` 且 localStorage 也有 → URL 胜；(c) URL 带 `s=` 反向 → 不写入；(d) 改 places → localStorage 与 URL 同步更新。

### [P3] `DateJump` 在无地点（home 为空）时输入框仍渲染但 `onChange` 静默 return，无反馈
- **严重度**：P3
- **类别**：UX / a11y
- **位置**：`src/components/DateJump.tsx:19,29-38`
- **问题描述**：`home = places.find(...) ?? places[0]` 在无地点时为 `undefined`；`value` 为空串、`onChange` 里 `if (!home) return;` 静默丢弃用户输入。用户在无地点时仍看到一个可交互日期选择器，选日期却无反应。
- **建议修复**：无地点时禁用（`disabled`）或隐藏日期选择器，并给 `aria-disabled`/提示。
- **验证方式**：无地点状态下 date input `disabled` 为 true。

### [P3] `CursorBar` 键盘监听与 `KeyboardShortcuts` 监听共存，方向键在已启用游标且无选区时仍 preventDefault，可能影响页面滚动
- **严重度**：P3
- **类别**：a11y
- **位置**：`src/components/CursorBar.tsx:32-57`
- **问题描述**：方向键 ←/→ 在"游标已启用且非 Shift"时 `e.preventDefault()` 移动游标。若用户启用游标后用方向键想滚动页面（罕见但可能），会被拦截。当前逻辑合理（启用游标即表示要用方向键操控），但若游标启用后用户焦点在网格内试图滚动，体验受影响。`KeyboardShortcuts` 的 Escape 清选区与 CursorBar 不冲突。
- **建议修复**：可在游标启用时给页面一个可见提示"方向键已绑定至游标"，或提供"禁用游标"按钮（当前只能通过清掉 cursorMs，UI 无显式关闭）。
- **验证方式**：手动验证。

### [P3] `generateStaticParams` 仅枚举 5 个城市对 + 4 个时区对，长尾 ISR 首次访问较慢且 `Date.now()` 烘焙
- **严重度**：P3
- **类别**：性能 / SEO
- **位置**：`src/app/[locale]/time-converter/[slug]/page.tsx:30-65`
- **问题描述**：长尾城市对靠 ISR（`dynamicParams=true, revalidate=3600`）按需生成，首次访问需 SSR 整页。页面内 `const now = Date.now()` 在 ISR 生成时被烘焙，直到下次 revalidate（1 小时）才刷新；对照表的"当前时间"因此最多滞后 1 小时。页面已用 `updatedAt` 注脚诚实标注"每小时刷新"，符合设计意图。仅作记录。
- **建议修复**：若想提升长尾首屏，可在构建期扩大 `POPULAR_CITY_PAIRS`；若想"当前时间"更鲜活，可把对照表改为客户端组件读取实时 `Date.now()`（代价是丢失 SSR 内容，与 LP-3"爬虫无需执行脚本即可收录"冲突，不建议）。

### 端到端走查结论（模拟：添加城市 → 拖拽排序 → 切换基准 → 导出 ICS → 分享 URL → 另设备打开）
- 添加城市：`addPlace` 去重、首项自动 home，正确。
- 拖拽排序：`setPlacesOrder` 用全量 id 序列 `arrayMove`，未筛选项位置不变，正确。
- 切换基准：`setHome` 校验存在性，偏移量随之重算，正确。
- 导出 ICS：`buildIcs` 用 UTC DTSTART/DTEND、RFC5545 转义、CRLF、fold，合规；`escapeText` 处理了含逗号城市名（测试覆盖 Washington, D.C.）。
- 分享 URL：`encodeState`/`decodeState` round-trip 正确；**反向选区**（P1）与 **customName/tags 不编码**（刷新丢失，P2）是缺陷。
- 另设备打开：URL 优先于 localStorage，正确；但接收方若刷新，customName/tags 丢失（P2）。

---

## 五、汇总与优先级

| 序号 | 严重度 | 类别 | 位置 | 简述 |
|------|--------|------|------|------|
| 1 | P1 | 安全 | `package.json:24` | `next@14.2.35` 含 23+ 高危 CVE（SSRF/缓存投毒/中间件绕过等），连带 postcss 高危 |
| 2 | P1 | Bug（DST） | `src/lib/grid.ts:35-64` | 秋退窗口 `buildColumns` 截断末尾日 23:00（168 列分布错位） |
| 3 | P1 | Bug/安全 | `src/lib/shareUrl.ts:83-92` | `decodeState` 接受反向选区 `s=2000-1000`，下游显示负时长/无效日历事件 |
| 4 | P2 | 安全/隐私 | `public/sw.js:115-142` | SW 以带 query 的完整 URL 缓存导航响应，选区/游标跨会话留存 |
| 5 | P2 | a11y/视觉 | `src/app/globals.css:13-60` | 深色模式未覆盖热力图三色/选区/周末配色，可读性差 |
| 6 | P2 | Bug/UX | `src/components/TimeGrid.tsx:106-138` | 单击（无拖拽）强制选中 1 小时，指针无法清除选区 |
| 7 | P2 | Bug（持久化） | `src/lib/useLocalPersist.ts:62-71,98-99` | localStorage 仅存 placeIds，刷新丢失 customName/tags |
| 8 | P2 | Bug（边界） | `src/lib/heatmap.ts:42-67` | 所有时区非法时 `columnColor` 返回 green 而非 null |
| 9 | P2 | 质量（测试） | `tests/`、`vitest.config.mts` | 组件/状态/URL 同步零测试，关键路径无回归保护 |
| 10 | P2 | i18n | `WorldClockWidget.tsx:51,53`、`EventWidget.tsx:36` | widget 标题/空态硬编码英文未走 i18n |
| 11 | P2 | 质量（同步） | `src/lib/useLocalPersist.ts:94-113` + `useUrlState.ts` | 双 hook + 双 ref 守卫的状态同步脆弱，建议合并 |
| 12 | P3 | Bug（DST） | `src/lib/time.ts:27-53` | `nextDSTChange` 的 prevDST 与循环 dt 基线不一致（实测正确，可读性差） |
| 13 | P3 | UX/a11y | `src/components/DateJump.tsx:19,29-38` | 无地点时 date input 仍可交互但静默丢弃输入 |
| 14 | P3 | a11y | `src/components/CursorBar.tsx:32-57` | 游标启用后方向键拦截页面滚动，无显式"禁用游标"入口 |
| 15 | P3 | 性能/SEO | `time-converter/[slug]/page.tsx:30-65` | 长尾 ISR 首次慢 + now 烘焙（已诚实标注，设计取舍） |
| 16 | P3 | 质量 | 多处 `useLocale() as AppLocale` | 类型断言较多，可封装 hook 收紧 |

---

## 六、误报记录（第 3 轮剔除的候选问题）

1. **（候选）`nextDSTChange` 午夜探测误判切换日** —— 剔除。代码注释明确"逐日探测固定取当日 12:00"，已规避春进/秋退在凌晨 02:00 发生导致的"午夜尚未翻转"。实测 NY/Sydney 多点返回正确切换日。仅保留为 P3 的"基线不一致"可读性建议（见序号 12）。
2. **（候选）`encodeState` 对含逗号的 city id 双重解码风险** —— 剔除。`decodeState` 依赖 `URLSearchParams.get` 已解码一次，不再二次 `decodeURIComponent`，注释已说明。且全量扫描 `cities.ts` 所有 id 仅含 `[a-z]{2}-[a-z0-9-]`，无逗号/百分号，实际安全。
3. **（候选）`useUrlStateSync` 写回 URL 触发渲染循环** —— 剔除。写回 effect 调 `history.replaceState`（非 store mutation），不触发 re-render；恢复 effect 有 `hydrated.current` 守卫只跑一次。实测无循环。
4. **（候选）`useLocalPersist` 与 `useUrlStateSync` 恢复竞态** —— 剔除（功能正确）但保留为 P2 重构建议（序号 11）。React effect 按注册顺序执行，`UrlStateSync` 内 `useLocalPersist` 先注册先跑、`useUrlStateSync` 后跑，"URL 优先于本地"通过 `hasUrlPlaces` 等标志实现，确定性无误。
5. **（候选）ICS DTSTART/DTEND 用 UTC 无 VTIMEZONE 会被部分客户端误解析** —— 剔除。UTC basic format `...Z` 是 RFC5545 合法的"带 UTC 时间的 DATE-TIME"，Outlook/iCal/Google 均正确解析为绝对时刻，无需 VTIMEZONE 块。代码注释已说明。
6. **（候选）`sun.ts` 极昼/极夜判定 `cosH > 1 / < -1` 可能因浮点误差误判** —— 剔除。实测 Tromsø（69.6N）冬至极夜、夏至极昼均正确返回 `{rise:null,set:null}`；北京夏至/冬至日出日落与天文台公布值误差 < 2 分钟。
7. **（候选）`parseSlug` 的 `--` 分隔符可被构造歧义 slug 绕过** —— 剔除。slug 以 `--` 开头（如 `--abc`）时首段为空，缩写正则与城市反查均失败返回 null → `notFound()`；城市 id 内只含单连字符，`indexOf("--")` 取首个双连号切分安全。已实测。
8. **（候选）`googleCalendarUrl`/`mailtoUrl` 参数注入额外字段** —— 剔除。两者均用 `URLSearchParams` 构造，`&`/`=` 会被百分号编码（实测 `text=Meeting%26evil%3Dinjected`），无注入。
9. **（候选）`Dockerfile` 非 root 运行缺失** —— 剔除。`Dockerfile:31-44` 已 `addgroup/adduser` 并 `USER nextjs`，符合非 root 要求；`.dockerignore` 排除了 `.env*`、`markdown`、`tests`、`.git` 等。
10. **（候选）`Date.now()` 在 `time-converter/[slug]` ISR 页导致 hydration mismatch** —— 剔除。该页是 Server Component（无 `"use client"`），`Date.now()` 只在服务端求值并烘焙进静态 HTML，客户端水合的是同一份静态标记，无客户端 `Date.now()`，无 mismatch。

---

*审查纪律遵循：仅产出本报告，未修改任何源文件。所有时区/DST 结论均用项目内置 Luxon 2.5 实跑验证。*
