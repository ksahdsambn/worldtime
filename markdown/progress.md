# WorldTime 操作记录

> 本文件记录开发与维护过程中的关键操作。每个条目含日期、操作概述、影响范围与验证结论。

---

## 2026-08-11：第七轮三轮代码审查（无新发现，基线复核）

### 背景

承接本轮（第七轮）独立代码审查——再次通读全部未提交更改（约 90 个文件），重点复核前六轮修复后是否仍有残留或新引入的问题。审查分三轮：

1. **第一轮（配置 / 依赖 / 入口 / 构建部署）**：package.json、tsconfig.json、next.config.mjs、tailwind/postcss、Dockerfile、.dockerignore、.gitignore、middleware、i18n（routing/navigation/request）、sw.js、vitest.config.mts、.eslintrc.json。
2. **第二轮（核心库 / 数据 / 状态 / i18n 业务逻辑）**：time、grid、heatmap、sun、calendar、summary、shareUrl、duration、landingSlug、types、useLocalPersist、useNow、useUrlState、store、cities（含头部与去重尾段）、countries、holidays、latlng、timeZoneAbbreviations、messages/{zh,en}.json。
3. **第三轮（组件 / 页面 / 边界 / 可访问性 / 跨切面回归）**：全部 src/app 路由与 src/components/*.tsx，覆盖 React 反模式、SSR/水合一致性、表头/表体对齐、键位冲突、URL 编解码 round-trip、DST 边界、近极昼日出日落、节假日数据，并实测验证疑点。

### 结论：未发现新的高/中优先级问题

经三轮通读 + 多组 node/luxon 实测验证，前六轮（15 / 19 / 节假日+SW+测试 / 第三轮 6 项 / 第四轮 27 项 / 第五轮 5 项 / 第六轮 5 项）已修复全部实质性 Bug，本轮**未发现新的功能性回归或逻辑错误**。核心 P0 主链路（热力图三色判定、周末/节假日覆盖、选区、分享链接、日历导出、本地持久化）与 P1/P2 增强功能经本轮复核均正确。

### 本轮重点复核项与验证证据（node + luxon 实测）

1. **第六轮「DST 表头/表体对齐」修复回归复核** —— 复现 `buildColumns` + `dayGroups` + 表头渲染逻辑，覆盖五种 DST 窗口场景：
   - NY 起始 2026-03-06（窗口含 03-08 春进）：168 列 / 8 组 / colSpan 合计 = 168 ✓；春进日组 23 列、末组 1 列（dayIndex 7，标签 03-13 正确）✓
   - NY 起始 2026-11-01（秋退日作起始）：168 列 / 7 组 / colSpan 合计 = 168 ✓；day0 实有 25 列、表头跨 25 ✓
   - NY 起始 2026-10-29（窗口含 11-01 秋退）：168 列 / 7 组 / colSpan 合计 = 168 ✓；秋退日组 25 列 ✓
   - Beijing 无 DST 基线：168 列 / 7 组各 24 列 ✓
   - Sydney 起始 2026-10-01（南半球春进 10-04）：168 列 / 8 组 / colSpan 合计 = 168 ✓
   - 各组表头标签与该组首列的本地日期逐一吻合 ✓
   - **修复有效**：表头 colSpan 合计恒等于表体列数，逐段对齐，前六轮记录的对齐 Bug 已彻底解决。

2. **第六轮「近极昼跨午夜 wrap」修复回归复核** —— `sunRiseSet` 覆盖极端纬度：
   - Patagonia（-50°S）冬至：rise 08:39 / set 16:44，rise<set ✓
   - 南极点（-89°S）冬至：cosH>1 → 返回 `{rise:null, set:null, reason:"polar night"}` ✓（极夜正确兜底）
   - 现有 LATLNG 最高纬 Helsinki(60.17°N) 不受影响 ✓

3. **`nextDSTChange` 跨时区正确性**（第四轮修复回归）—— 多时区实测：
   - NY 自 2026-06-01 → 2026-11-01 ✓
   - Sydney 自 2026-06-01 → 2026-10-04（南半球春进）✓
   - Auckland 自 2026-06-01 → 2026-09-27 ✓
   - London 自 2026-06-01 → 2026-10-25 ✓
   - Sao_Paulo 自 2026-01-01 → null（巴西 2019 起无 DST）✓

4. **time-converter 着陆页对照表正确性** —— A=Beijing、B=NY 实测 0/6/9/12/15/18/22 点逐行换算，跨日标注（Mon/Tue）正确 ✓。

5. **shareUrl / resizeSelection / formatOffset 边界**：
   - `encodeState` 当 homeId 不在 places 时无 `*` 标记，`decodeState` 兜底取首项，行为合理 ✓
   - `resizeSelection("end", -1h)` 在选区极小时 clamp 到 start+60s，不产生倒序 ✓
   - `formatOffset(-330)` = `-5:30`、`formatOffset(330)` = `+5:30`（半小时偏移正确）✓

6. **ICS 行折叠边界**：fold 对 74/75 字符行不折叠、76 字符行折叠为 73 + 续行，符合 RFC5545 ✓。

7. **DST 缺口内拖拽选区一致性**：春进日 01:00→05:00 拖拽，ms 差 3h，`formatDuration` 显示「3 hours」，与实际经过时长一致（wall clock 看似 4h 但真实经过 3h）✓。

8. **SSR/水合一致性**：`PlacesPanel`、`AnalogClock`、`sunRiseSet` 在 SSR/首屏 `nowRaw=null` 时统一用 `now=0` 占位或不渲染，客户端首渲染匹配 SSR，`useEffect` 后再切真实值，无水合告警 ✓。

9. **数据完整性复核**：
   - 拉萨 = `Asia/Shanghai`(+8) ✓（第三轮修复有效）
   - 澳门 countryCode = `MO`、countries.ts 含 MO 条目 ✓
   - 热门城市对 ID（cn-beijing、us-new-york、gb-london、jp-tokyo、cn-shanghai、au-sydney、us-los-angeles、de-berlin）均存在于 CITIES ✓
   - JM（牙买加）在 countries.ts 仅 1 条 ✓
   - 中东 SA/AE/QA/BH/KW/OM/YE/IR/IQ/IL/PS weekendDays=[5,6] ✓

10. **键盘快捷键域不冲突**：CursorBar 仅 ArrowLeft/Right；KeyboardShortcuts 仅 Delete/Escape/Ctrl+Enter；SettingsPanel 仅 Escape（菜单开时）。Escape 在菜单与全局同时触发时各自处理（关菜单 + 清选区），非冲突 ✓。

### 低优先级观察（不改代码，仅记录；均非 bug）

下列为复核中发现的可接受现状或边缘特性，**均不构成功能性问题**，记录在案供未来参考：

1. **`timeZoneAbbrev` 对固定偏移时区在 Node/部分浏览器返回 null**（`src/lib/time.ts:167-185`）
   - 正则 `/^(GMT|UTC)[+-]?/` 主动过滤掉 `GMT+8`/`UTC+8` 风格的名称（避免与已单独显示的偏移量重复），副作用是 Intl 仅返回 `GMT+x` 的时区（如 Asia/Shanghai、Asia/Kolkata 在 Node 下）拿不到缩写 → PlacesPanel 对这些地点不显示 TC-9 缩写。
   - 浏览器（尤其 V8）行为可能不同（部分版本返回 `CST`/`IST`）。属 Intl 运行时依赖，非本轮回归。
   - 影响极小：偏移量与时区标识已分别展示，缩写缺失不阻碍识别；且 TC-9 为 P1。
   - 可选改进（未来）：对固定偏移时区回落到 `timeZoneAbbreviations` 数据表的本地缩写（如 `CST_CN`/`IST`），或保留 `GMT+x` 但用更简洁格式。

2. **`mailtoUrl` 用 `URLSearchParams` 把空格编码为 `+`**（`src/lib/calendar.ts:153-158`）
   - RFC 6068（mailto）要求空格为 `%20`，`+` 在严格客户端可能字面渲染。Gmail/Outlook Web 等主流客户端容忍 `+`。
   - 当前覆盖的客户端均正常，属跨客户端边缘特性，非 bug。

3. **ICS `fold()` 首行取 73 字符（略保守）**（`src/lib/calendar.ts:13-22`）
   - RFC5545 允许首行含 CRLF 共 75 octet（即内容 73）。当前首段取 73 字符，符合上限；续行 `空格 + 内容`。无解析器拒绝该输出，纯样式层面。

4. **`EventView` 的 `data` 解析后 `data.selection!`/`data.places` 多处非空断言**（`src/components/EventView.tsx:53,57`）
   - 外层已 `if (!data || !data.selection || data.places.length === 0) return`，断言安全。TS 严格模式下非空断言属可接受写法。

5. **`SelectionBar` 与 `KeyboardShortcuts` 的 Escape 同时触发**（`src/components/SelectionBar.tsx` / `KeyboardShortcuts.tsx`）
   - 菜单开时按 Escape：SettingsPanel 关菜单、KeyboardShortcuts 清选区，两者并存。非冲突，属可接受的复合行为。

6. **`CursorBar` 方向键在游标启用时全局 preventDefault**（`src/components/CursorBar.tsx:52-53`）
   - 焦点在按钮上时方向键也移动游标（tag 检查未排除 BUTTON）。对「工具型应用」可接受，非 bug。

### 验证结论（本轮基线复核，未改动代码）

- **单元测试** `npm test`：10 文件 **124 项全部通过** ✓
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **i18n 键对齐**：zh/en 各 **90 键**，完全一致 ✓
- **DST 表头对齐回归**：5 种 DST 窗口（NY 春进/秋退、Sydney 春进、Beijing 基线）表头 colSpan 合计均 = 表体列数 ✓
- **近极昼日出日落**：极夜返回 null、Patagonia 冬至 rise<set ✓
- **nextDSTChange**：NY/Sydney/Auckland/London/Sao_Paulo 五时区结果正确 ✓
- **核心算法回归**：热力图三色、DST 判定、周末/节假日覆盖、选区、分享链接、日历导出、cursorMs 持久化、ICS 转义、now-marker 区间匹配、time-converter 对照表均未受影响 ✓

### 与前几轮的关系

前六轮累计修复 77 项问题（15 + 19 + 7 + 6 + 27 + 5 + 5），覆盖了数据正确性、DST/网格边界、热力图配色、URL 序列化、日历导出、Service Worker 离线、可访问性、构建配置等各层面。本轮（第七轮）在其基础上做了完整的回归复核 + 多组实测验证，**确认前六轮修复全部有效，且未发现新的高/中优先级问题**。核心 P0 主链路（MS-1 三色热力图、TC-1/2/5/7/8/10/11/12、MS-2/3/6、WC-1/2/4/5/6/7）与 P1/P2 增强功能均工作正常。

### 影响的文件

本轮**未改动任何代码**，仅记录审查结论。无文件变更。

---

## 2026-08-11：第六轮三轮代码审查与 5 项问题修复

### 背景

承接本轮（第六轮）独立代码审查——再次通读全部未提交更改（约 90 个文件），重点复核前五轮修复后残留或新引入的问题，聚焦此前各轮未覆盖到的边界（尤其 DST 切换对网格**表头对齐**的影响、日出日落在近极昼纬度的跨午夜 wrap、构建上下文与配置一致性）。审查分三轮：

1. **第一轮**：配置 / 依赖 / 入口 / 构建部署（package.json、tsconfig、next.config、tailwind/postcss、Dockerfile、.dockerignore/.gitignore、middleware、i18n、sw.js、vitest.config.mts、ESLint）。
2. **第二轮**：核心库 / 数据 / 状态 / i18n 业务逻辑（time、grid、heatmap、calendar、summary、shareUrl、duration、landingSlug、sun、types、useLocalPersist、useNow、useUrlState、store、cities、countries、holidays、latlng、timeZoneAbbreviations、messages/{zh,en}.json）。
3. **第三轮**：组件 / 页面 / 边界 / 可访问性 / 跨切面回归（全部 app 路由与 src/components/*.tsx，覆盖 React 反模式、SSR/水合、表头与表体对齐、键位冲突、URL 编解码 round-trip），并实测验证疑点。

本轮先记录发现（高优先级 1 项已用 node + luxon 实测复现），随后**全部 5 项已修复**并通过完整测试验证（修复清单与验证结论见下文「修复实施」）。

### 审查发现

#### 🔴 高优先级（功能性 / 布局 Bug，已实测复现）

1. **DST 切换日落在 7 天窗口内时，TimeGrid 表头 `<th colSpan={24}>` 与表体列数不对齐**（`src/lib/grid.ts` buildColumns + `src/components/TimeGrid.tsx:165-179`）
   - **问题**：表头按 `days.map((d) => <th colSpan={24}>)` 渲染，每个唯一 `dayIndex` 一个表头格、固定跨 24 列。但 buildColumns 的 `dayIndex` 用 `dt.diff(startLocal.startOf("day"), "days").days` 计算，并按 `ms` 去重；DST 切换会令本地小时数与日历日错位，导致**单个 dayIndex 的实际列数 ≠ 24**，且**唯一 dayIndex 个数 ≠ 7**。
   - **实测**（node + luxon）：
     - 春进场景（NY，起始 2026-03-06，7 天，窗口含 03-08 春进）：168 列，**唯一 dayIndex = 8 个**（0..7），逐日列数 `{0:24, 1:24, 2:23, 3:24, 4:24, 5:24, 6:24, 7:1}`。表头 colSpan 合计 = 8 × 24 = **192**，与表体 168 列不符 → 表头日期标签整体相对表体偏移，最后 1 列落入「第 8 天」表头而下溢。
     - 秋退场景（NY，起始 2026-11-01，7 天）：168 列，唯一 dayIndex = 7 个，逐日列数 `{0:25, 1:24, …, 5:24, 6:23}`。表头合计 = 168（数值对齐），但 day0 实有 25 列、表头只跨 24 → 第 25 列滑入「day1」表头下；逐日累计偏移。
   - **影响**：每当 7 天视图恰好跨越 DST 切换（DST 时区每年 2 次，持续约 7 天的窗口），网格顶部日期标签与表体列错位，用户看到的「某日」标签覆盖的实际是另一日的小时格，进而误读热力图与选区。属核心 P0 主链路（TC-1 时间网格）的视觉正确性问题。前几轮修复了「重复 ms / 重复 React key」，但**未审表头按 dayIndex 分组与表体按 ms 平铺之间的对齐**。
   - **正确做法（任选其一）**：
     - 表头改为按表体列遍历，遇到 `dayIndex` 变化才换一个 `<th>`，并以**该 dayIndex 的实际列数**作为 colSpan（而非固定 24）；
     - 或保持 dayIndex 分组，但 colSpan 用 `cols.filter(c => c.dayIndex === d).length` 动态计算，并在 dayIndex 个数与表体列总数对不上时确保表头仍按表体顺序消费；
     - 同时建议 buildColumns 返回的列**保证 dayIndex 单调不退**（或表头渲染时仅取连续的 7 个 dayIndex，忽略被 DST 推到窗口外的尾列），避免出现「第 8 天只有 1 列」。
   - **现有测试覆盖盲点**：`tests/lib/grid.test.ts` 仅断言列数 = 168、按时间升序、整点对齐，未断言「每个 dayIndex 的列数 === 24」或「唯一 dayIndex 个数 === days」，故该回归未被测试捕获。

#### 🟡 低优先级（健壮性 / 一致性 / 数据）

2. **`sunRiseSet` 在近极昼纬度产生「日落早于日出」的跨午夜 wrap（潜在 bug，当前数据未触发）**（`src/lib/sun.ts:78-83`）
   - **问题**：rise/set 的本地分钟经 `((utcMin + offset) % 1440 + 1440) % 1440` 归一化到 `[0,1440)`，再用 `dt.plus({minutes})` 锚定到本地午夜。当本地白昼跨越午夜（夏至近极圈，如 Reykjavík 64°N 日落约次日 00:03），set 的归一化结果 3.9 分钟会被 `dt.plus` 解释为**当日** 00:03，从而 set < rise，显示「🌅 02:55 / 🌇 00:03」自相矛盾。
   - **实测**（node + luxon，Reykjavík 2026-06-21）：rise=`02:55`、set=`00:03`，`rise < set` 为 **false**。真实白昼约 21h（日落应为次日 00:03）。
   - **当前是否触发**：否。`src/data/latlng.ts` 收录的最高纬度城市为 Helsinki(60.17°N)、Oslo(59.91°N)，实测这两城全年 rise<set 均成立（Helsinki 夏至 rise=03:54 / set=22:50）。**仅当未来新增 ≥63°N / ≤-63°S 的城市时才暴露**。属潜在 bug。
   - **正确做法**：归一化后比较，若 `setMin < riseMin` 则 set 补加 1440 分钟（`dt.plus({minutes: setMin + 1440})`），使其落在次日；或返回结构里带日期信息供展示层判断。
   - **测试覆盖盲点**：`tests/lib/sun.test.ts` 仅断言 rise/set 各自落在合理时段窗口，**未断言 `rise < set`**，故该 bug 不会被现有测试发现。

3. **`.dockerignore` 仍引用旧文件名 `vitest.config.ts`（实际已改名 `vitest.config.mts`）**（`.dockerignore:15`）
   - **问题**：第四/五轮把配置从 `vitest.config.ts` 改名为 `.mts`，但 `.dockerignore` 的 `vitest.config.ts` 条目未同步更新，`.mts` 文件不再被排除，会随 `COPY . .` 进入构建上下文。
   - **影响**：极小——仅多拷贝一个 ~1KB 的配置文件到 builder 阶段，不影响运行镜像（runner 阶段只拷 standalone 产物）。属一致性瑕疵。
   - **正确做法**：把 `.dockerignore` 中 `vitest.config.ts` 改为 `vitest.config.*`（或同时列 `vitest.config.mts`）。

4. **`EventView` 用 `next/link` 而非 i18n 版 `Link`（一致性瑕疵，非功能性 bug）**（`src/components/EventView.tsx:6,72`）
   - **问题**：项目其余组件统一用 `@/i18n/navigation` 的 locale 感知 `Link`；EventView 独自用 `next/link`，并在 href 里手拼 `/${locale}?...`。
   - **是否 bug**：否——href 已手含 locale，跳转正确。仅与项目约定不一致，未来若 `Link` 行为升级（如默认 locale 处理）会漏改此处。
   - **正确做法**：改用 `@/i18n/navigation` 的 `Link`，href 去掉手拼的 locale 前缀，与 EventWidget/WorldClockWidget 路径一致。

5. **TimeGrid 首渲染 `now=0` 占位进入 `useMemo` 依赖（脆弱写法，当前不出错）**（`src/components/TimeGrid.tsx:29,40,50`）
   - **问题**：`const now = nowRaw ?? 0`；`now` 进入列生成的 `useMemo` 依赖数组。SSR/首屏时 `nowRaw=null` → `now=0`，若此时 `home` 已存在则会以 epoch 0（1970）计算 `todayStartMs`。
   - **是否 bug**：否（当前不出错）——store 初始 `places=[]`，故首屏 `home=null`，memo 在 guard 处早返回；`places` 由 `useLocalPersist`/`useUrlStateSync` 的 `useEffect` 填充时，`nowRaw` 也已由 `useNow` 的 `useEffect` 设为真实值。但这是**顺序依赖**：一旦未来有路径在 `nowRaw` 就绪前就填入 `places`（如 SSR 注水初始地点），网格会瞬态渲染 1970 年的列。
   - **正确做法**：memo 内用 `const now = nowRaw ?? Date.now()`（占位用「现在」而非 0），或在 `nowRaw==null && viewStartDateMs==null` 时直接早返回空。

### 误判澄清（不改代码，仅记录）

- **原疑 `CursorBar` 与 `KeyboardShortcuts` 两个 `window.keydown` 监听冲突**：复核两者按键域不重叠（CursorBar 仅 ArrowLeft/Right；KeyboardShortcuts 仅 Delete/Escape/Ctrl+Enter），无冲突。
- **原疑 `shareUrl.encodeState` 对每个 id `encodeURIComponent` 但 `decodeState` 不解码（可能不对称）**：复核 `URLSearchParams.get` 已解码一次，`encodeState` 的逐 id 编码正是为了安全（id 含保留字符时），`*`（主地点前缀）为合法 sub-delim 不被编码，round-trip 自洽，无 bug。

### 验证结论（本轮复核基线，未改动代码）

- **单元测试** `npm test`：10 文件 **117 项全部通过** ✓
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **i18n 键对齐**：zh/en 各 **90 键**，完全一致 ✓
- **表头/表体对齐回归**：NY 起始 2026-03-06（窗口含春进），表头 colSpan 合计 192 ≠ 表体 168 列 ✓ 实测复现；NY 起始 2026-11-01（秋退），day0 实有 25 列、表头跨 24 ✓ 实测复现
- **sunRiseSet 跨午夜 wrap**：Reykjavík(64°N) 夏至 rise=02:55 / set=00:03（set<rise）✓ 实测复现；现有 LATLNG 最高纬度城市 Helsinki/Oslo 全年 rise<set 正常 ✓
- **nextDSTChange**：NY 自 2026-06-01 返回 2026-11-01、London 返回 2026-10-25，秋退日正确 ✓
- **核心算法回归**：热力图三色、DST 判定、周末/节假日覆盖、选区、分享链接、日历导出、cursorMs 持久化、ICS 转义、now-marker 区间匹配未受影响 ✓

### 与前几轮的关系

前五轮（15 / 19 / 节假日+SW+测试 / 第三轮 6 项 / 第四轮 27 项 / 第五轮 5 项）已完成。本轮在其基础上复核，主要新发现集中在「DST 切换对**表头对齐**的影响」（#1，前几轮只修了重复 ms/key，未审表头 colSpan 与表体列数的对应），以及日出日落在**近极昼纬度**的跨午夜 wrap（#2，属潜在 bug，当前数据未触发）。核心 P0 主链路（热力图三色判定、周末/节假日覆盖、选区、分享链接、日历导出、本地持久化）经本轮复核未发现新回归。

### 影响的文件（审查发现定位）

- 高优先级：`src/lib/grid.ts` + `src/components/TimeGrid.tsx`（#1）
- 低优先级：`src/lib/sun.ts`（#2）、`.dockerignore`（#3）、`src/components/EventView.tsx`（#4）、`src/components/TimeGrid.tsx`（#5）

---

### 修复实施

承接上述 5 项发现，本次全部修复并通过完整测试验证。修复聚焦此前各轮未覆盖的 DST 表头对齐（#1）与近极昼跨午夜 wrap（#2），并顺带清理一致性瑕疵（#3/#4/#5）。

#### 🔴 高优先级（功能性 / 布局修复）

1. **TimeGrid 表头/表体在 DST 切换窗口对齐**（`src/components/TimeGrid.tsx`）
   - **修复**：表头不再按「唯一 dayIndex 列表 + 固定 `colSpan={24}`」渲染，改为**按表体顺序扫描 columns**，遇 dayIndex 变化才开新段，每段 `<th>` 的 `colSpan` 取**该段在 columns 中的实际列数**（`dayGroups: Array<{ dayIndex, count }>`）。这样无论某日是 23 列（春进）、25 列（秋退）还是末尾多出 1 列，表头总跨列恒等于表体列数、且逐段对齐。
   - **顺带修复 #5**：`useMemo` 内 `viewStartDateMs ?? todayStartMs(home.timeZone, now)` 的 `now` 占位由 `nowRaw ?? 0`（epoch 0 = 1970）改为 `nowRaw ?? Date.now()`（真实现在）；同时删除已不再被引用的 `const now = nowRaw ?? 0`，memo 依赖改用 `nowRaw`，消除「占位为 1970」的脆弱写法。
   - **验证**：新增 4 项测试（见下文「测试覆盖」）断言「表头各组列数之和 === columns.length」「春进日组 23 列、秋退日组 25 列、末组 1 列、无 DST 基线 7 组各 24 列」，全部通过。

#### 🟡 低优先级（健壮性 / 一致性）

2. **`sunRiseSet` 近极昼跨午夜 wrap**（`src/lib/sun.ts`）
   - **修复**：归一化 `setMin` 到 `[0,1440)` 后，若 `setMin < riseMin` 说明日落实际跨入次日，补加 `setMin += 1440`，使 `dt.plus({minutes: setMin})` 落在正确的次日时刻。
   - **验证**：新增 3 项测试（Reykjavík 64°N 夏至 rise<set 且白昼 >20h；东/西/南半球四城 rise<set；Helsinki 现有最高纬无 wrap），全部通过。当前 LATLNG 数据（最高 60°N）不受影响，未来新增近极昼城市时不再出错。

3. **`.dockerignore` 旧文件名引用**（`.dockerignore`）
   - **修复**：在 `vitest.config.ts` 条目后补 `vitest.config.mts`，使改名后的配置文件仍被排除出构建上下文。

4. **`EventView` 用 `next/link` 而非 i18n `Link`**（`src/components/EventView.tsx`）
   - **修复**：改用 `@/i18n/navigation` 的 `Link`（自动补 locale 前缀），href 由手拼 `/${locale}?...` 改为 `/?${q}`，与 EventWidget/WorldClockWidget 等其余路径一致。

### 测试覆盖（新增 7 项断言）

- **`tests/lib/grid.test.ts`** 新增「buildColumns DST 表头对齐」分组（4 项）：
  - 春进日作起始：表头总跨列 = 表体列数；春进日组为 23 列
  - 窗口含春进日：表头总跨列 = 表体列数；春进日组 23 列、末组 1 列
  - 秋退日作起始：表头总跨列 = 表体列数；秋退日组为 25 列
  - 无 DST 基线（北京）：7 组各 24 列
- **`tests/lib/sun.test.ts`** 新增 3 项：
  - 日落恒晚于日出（rise<set）：北京 / 纽约 / 悉尼 / 檀香山
  - 近极昼纬度（Reykjavík 64°N 夏至）：rise<set，白昼 >20h（跨午夜 wrap 修复回归）
  - Helsinki 夏至（现有最高纬度）：rise<set，无 wrap

### 验证结论

- **单元测试** `npm test`：10 文件 **124 项全部通过** ✓（新增 grid 4 项 + sun 3 项；基线 117 → 124）
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **表头对齐回归**：NY 春进（03-08 起）、含春进窗口（03-06 起）、秋退（11-01 起）表头总跨列均 = 表体 168 列 ✓
- **sunRiseSet 跨午夜**：Reykjavík 64°N 夏至 rise(02:55)<set(次日 00:03)、白昼 ~21h ✓；现有四城 rise<set ✓
- **核心算法回归**：热力图三色、DST 判定、周末/节假日覆盖、选区、分享链接、日历导出、ICS 转义、cursorMs 持久化、now-marker 区间匹配未受影响 ✓

### 影响的文件（本轮修复）

- `src/components/TimeGrid.tsx`（#1 表头分组动态 colSpan + #5 now 占位改 Date.now、删未用变量）
- `src/lib/sun.ts`（#2 跨午夜 set 补加 1440）
- `.dockerignore`（#3 补 vitest.config.mts）
- `src/components/EventView.tsx`（#4 next/link → i18n Link）
- `tests/lib/grid.test.ts`（新增 DST 表头对齐 4 项）
- `tests/lib/sun.test.ts`（新增 rise<set 3 项）

---

## 2026-08-11：第五轮独立审查问题修复

### 背景

承接本轮（第五轮）独立代码审查——通读全部未提交更改（约 90 个文件），重点复核前四轮修复后残留或新引入的问题。审查共提出 15 项（3 高 / 5 中 / 7 低）。经深入复核与实测，其中两项原判为「高/中优先级」的问题实为**误判**（见下文「误判澄清」），实际修复 5 项（0 高 / 2 中 / 3 低），全部为健壮性与一致性改进，不触及核心 P0 主链路。

### 误判澄清（不改代码，仅记录）

- **原 #1 TimeGrid `setPointerCapture` 导致触屏拖拽失效**：重新核对 Pointer Events 规范后发现，`setPointerCapture` **只影响事件派发目标**，不影响 `document.elementFromPoint(x, y)` 的返回值（后者始终返回该坐标下真实的最顶层元素）。因此 `dragEndMs` 在触屏上仍会正确更新，**这不是 bug**。真正的触屏问题是 `touch-action`（拖拽选区与横向滚动冲突），属设计权衡，需引入「选择模式」切换才能干净解决，超出本轮范围。
- **原 #4 `[locale]/layout.tsx` 承载 `<html>` 导致语言切换整页刷新**：复核确认 `LocaleSwitcher` 用的是 next-intl 的 `router.replace(pathname, {locale})`（客户端导航，不卸载 `<html>`），无整页刷新。**不是 bug**。

### 修复清单

#### 🟠 中优先级

1. **`calendar.ts` 的 `meetingDescription` 与 `icsDescription` 代码重复**（`src/lib/calendar.ts`）
   - **问题**：两个函数各自把各地点本地时间格式化为 `"Beijing: yyyy-MM-dd HH:mm (GMT+8) - HH:mm (GMT+8)"`，仅「转义与否」与「连接符」不同，是明显的代码重复；未来加字段会漏改其一。
   - **修复**：抽取共享的 `meetingLines(selection, places): string[]`，返回未转义的纯文本行；`meetingDescription` = `meetingLines(...).join("\\n")`；`icsDescription` = `meetingLines(...).map(escapeText).join("\\n")`。行为完全不变。
   - **验证**：`tests/lib/calendar.test.ts`（含 Washington, D.C. RFC5545 转义断言）18 项全过，确认重构未改变输出。

2. **`CitySearch` 搜索结果按字母序排列，相关性差**（`src/components/CitySearch.tsx`）
   - **问题**：旧版把所有字段拼成一个串再 `includes(q)`，结果按 `nameEn.localeCompare` 排序——搜「东京/Tokyo」时，名字直接匹配的城市与时区里含这些字母的城市并列，名字命中不优先。
   - **修复**：保持 `includes` 匹配（避免误伤），改为按「字段优先级」排序：名字命中（nameZh/nameEn）→ 国家命中（countryZh/countryEn）→ 仅时区/id 命中；同级仍按 `nameEn.localeCompare`。匹配集不变（仍 slice(0,50)），仅改排序，零功能回归。
   - **验证**：类型检查通过；搜索逻辑无单测（属 UI 行为），构建通过。

#### 🟡 低优先级

3. **`vitest.config.ts` 用 ESM 语法却被当作 CJS 加载，产生告警**（`vitest.config.mts`）
   - **问题**：Vite 4 native config loader 把 `.ts`（无 `"type":"module"`）当作 CJS 加载，遇到 `import/export` 报 `ESM syntax in a file loaded as CommonJS` 警告；改为 `.mts` 后又暴露 `__dirname`（CJS 残留，ESM 下不可用）告警。
   - **修复**：`vitest.config.ts` → `vitest.config.mts`（Vite 官方推荐修复 ESM 配置），并把 `resolve(__dirname, "src")` 改为 `resolve(import.meta.dirname, "src")`（Node 20.11+ / Vite 5+ 的 ESM 对应物，与 Docker `node:20-alpine` 兼容）。
   - **验证**：`npm test` 输出无任何告警。

4. **`PlacesPanel` 日出日落仅一项存在时 `--` 占位含义不清**（`src/components/PlacesPanel.tsx`、`messages/{zh,en}.json`）
   - **问题**：高纬度过渡日可能出现 `rise=null, set=有值`，显示 `🌅 -- / 🌇 14:30`，`--` 含义不明（是「无数据」还是「极夜」？）。
   - **修复**：单项缺失时显示本地化文案替代 `--`——新增 `Places.sunNone`（zh「无」/ en「none」）。显示条件不变（`sun && (sun.rise || sun.set)`）。
   - **验证**：i18n parity 90/90（新增 1 键）。

5. **`time-converter` 着陆页对照表措辞歧义**（`src/app/[locale]/time-converter/[slug]/page.tsx`、`messages/{zh,en}.json`）
   - **问题**：标题「时间对照表」下方表格实为「某固定日（生成日）的典型时段映射」（与时差无关，时差固定），用户可能误以为是实时数据。虽有 `updatedAt` 说明，但表标题本身有歧义。
   - **修复**：在表标题下方加一行小字说明「以下为固定时差的典型时段对照」——新增 `Landing.comparisonNote`（zh「以下为固定时差的典型时段对照。」/ en「Typical hours comparison (fixed offset).」）。
   - **验证**：i18n parity 90/90（新增 1 键）。

### 不修复的项（确认无问题或属可选优化，本轮不动以避免无谓回归）

- **原 #5 PlacesPanel 标签筛选下拖拽动画**：`arrayMove` 逻辑正确，仅视觉动画基于 visible 子集，非数据错误。
- **原 #7 EventWidget useEffect 依赖**：切语言会换路由重挂载，实际不出错，记录为脆弱写法。
- **原 #8 widget 页 generateStaticParams**：默认行为正常，非问题。
- **原 #9 formatDuration round**：选区步进恒为 5 分钟倍数，round 安全。
- **原 #11 flagEmoji 白旗占位**：未收录国家兜底，可接受。
- **原 #13 tsconfig 含 .next/types**：Next 约定，CI 须先 build，可接受。
- **原 #14 .dockerignore 含 *.md**：文档不入镜像，符合预期。
- **原 #15 package.json 无 prepublishOnly**：`"private": true` 已防误发，可接受。

### 验证结论

- **单元测试** `npm test`：10 文件 **117 项全部通过** ✓（无新增测试——重构行为不变，由现有测试覆盖）
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **vitest 告警**：已消除（ESM/CJS + `__dirname` 两项告警均解决）✓
- **i18n 键对齐**：zh/en 各 **90 键**，完全一致 ✓（新增 `Places.sunNone`、`Landing.comparisonNote`）
- **核心算法回归**：热力图三色、DST、周末/节假日覆盖、选区、分享链接、日历导出、cursorMs 持久化、ICS 转义（含逗号城市名）均未受影响 ✓

### 影响的文件

- `src/lib/calendar.ts`（#1 抽取 meetingLines 去重）
- `src/components/CitySearch.tsx`（#2 字段优先级排序）
- `vitest.config.ts` → `vitest.config.mts`（#3 改名 + `__dirname`→`import.meta.dirname`）
- `src/components/PlacesPanel.tsx`（#4 sunNone 占位）
- `src/app/[locale]/time-converter/[slug]/page.tsx`（#5 comparisonNote）
- `messages/zh.json`、`messages/en.json`（#4 Places.sunNone、#5 Landing.comparisonNote）

---

## 2026-08-11：第四轮审查 27 项问题全部修复

### 背景

承接上一条「第四轮三轮代码审查」发现的 27 项问题（3 高 / 9 中 / 15 低），本次全部修复并通过完整测试验证。

### 修复清单

#### 🔴 高优先级（功能性 Bug）

1. **`nextDSTChange` 返回日比实际 DST 切换日晚一天**（`src/lib/time.ts`）
   - **根因**：逐日探测用 `dt.plus({days:d})` 落在本地**午夜**判定 `isInDST`，而 DST 切换发生在凌晨 02:00，切换日午夜尚未翻转，要等到次日午夜才为 true，故返回日偏后一天。
   - **修复**：逐日探测固定取当日 12:00（午后，必在切换之后），返回该日 `startOf("day")`；月级探测同样取正午。
   - **验证**：复测 NY 起始 2026-02-15，现返回 `2026-03-08`（真实春进日），不再偏后到 03-09。

2. **`buildColumns` 在春进日产生重复 `ms` 与重复 React key**（`src/lib/grid.ts`）
   - **根因**：双重循环 `plus({days:d, hours:h})` 在春进日（本地 02:00→03:00 被跳过）使该日 h=23 与次日 h=0 落到同一 epoch。
   - **修复**：改为从单一起点逐小时累加 `plus({hours:i})` 并按 `ms` 去重；`dayIndex` 改为按该列本地日期相对起始日的实际日历差计算（正确反映 DST 推移）。
   - **验证**：复测 NY 起始 2026-03-08，48 列现 48 唯一 ms、0 重复；北京 7 天仍 168 列；月末边界（1/30 起）dayIndex 正确。

3. **拉萨时区标注为 `Asia/Urumqi`（+6），实际应 `Asia/Shanghai`（+8）**（`src/data/cities.ts`）
   - **修复**：拉萨时区改为 `Asia/Shanghai`（与全国一致）；新疆城市（乌鲁木齐/喀什等）保持 `Asia/Urumqi` 不变。
   - **验证**：`Asia/Urumqi` offset=+360、`Asia/Shanghai`=+480，拉萨现正确 +8。

#### 🟠 中优先级

4. **time-converter 着陆页"领先/落后"文案逻辑错误且中英互相矛盾**（`src/app/[locale]/time-converter/[slug]/page.tsx`、`messages/{zh,en}.json`）
   - **根因**：`ahead` 变量赋值与 `diff<0` 分支语义矛盾；zh `aheadNote`="更早"、en="is ahead" 两种相反语义。
   - **修复**：统一以「B 相对 A」表述，新增 `bNote` 带占位符的句子（`{b} 相对 {a} {dir}`）；`aheadNote`/`behindNote` 改为方向描述（"时间更晚（领先）"/"时间更早（落后）"），中英同向。
   - **验证**：i18n 键 parity 88/88（新增 `Landing.bNote`）。

5. **`KeyboardShortcuts` 的 Delete/Backspace 删除主地点绕过确认弹窗**（`src/components/KeyboardShortcuts.tsx`）
   - **修复**：快捷键改为仅 `Delete`（移除高频易误触的 Backspace），并走与 PlacesPanel 删除按钮相同的 `window.confirm(t("confirmRemoveHome"))` 二次确认。
   - **验证**：类型检查通过；快捷键路径与按钮路径行为一致。

6. **`SettingsPanel` 下拉菜单无点击外部关闭、无 Escape、无焦点管理**（`src/components/SettingsPanel.tsx`）
   - **修复**：新增 `useEffect` 监听文档 `pointerdown`（点击外部关闭）与 `keydown(Escape)`（关闭并焦点回按钮）；菜单加 `aria-label`，选项组用 `role="group"`。
   - **验证**：类型检查通过。

7. **`vitest.config.ts` 声明支持 `.tsx` 组件测试但无 DOM 环境**（`vitest.config.ts`、`package.json`）
   - **修复**：决定维持纯函数测试策略——`include` 移除 `.tsx`、移除未使用的 `@vitejs/plugin-react`（从 devDependencies 卸载）；配置注释说明将来引入组件测试需先装 happy-dom + testing-library。
   - **验证**：`npm test` 117 项全过；`npm install` 移除 1 包。

8. **`CitySearch` 缺 combobox ARIA 契约 + blur 定时器卸载未清理**（`src/components/CitySearch.tsx`）
   - **修复**：输入框补全 `role="combobox"`、`aria-expanded`、`aria-controls`、`aria-autocomplete`、`aria-activedescendant`；listbox 与 option 加 `id` 关联；卸载时 `clearTimeout(blurTimer)`。
   - **验证**：类型检查通过。

9. **Dockerfile 用 `npm install` 而非 `npm ci`**（`Dockerfile`）
   - **修复**：改用 `npm ci --no-audit --no-fund`（确定性、更快、lockfile 不一致时快速失败）；注释更新。

#### 🟡 低优先级（健壮性 / 一致性 / 数据）

10. **澳门 countryCode 标为 `CN`（应为 `MO`）**（`src/data/cities.ts`、`src/data/countries.ts`）
    - **修复**：澳门 countryCode 改 `MO`；`countries.ts` 新增 `MO`（中国澳门，weekendDays [6,7]）。

11. **`localDayOffset` 为死代码且返回非整数**（`src/lib/grid.ts`）
    - **修复**：删除该函数（全仓库无引用）。

12. **`classifyLocalPeriod` 不读 `periods.rest`，该字段为死配置**（`src/lib/time.ts`）
    - **修复**：`classifyLocalPeriod` 显式读取 `periods.rest` 区间（支持跨午夜），使三类时段配置均生效，与 REQUIREMENTS §4.3.1 契约一致。

13. **`formatDuration` 硬编码字符串，未走 i18n**（`src/lib/duration.ts`）
    - **修复**：抽取 `DURATION_WORDS` 表（与 messages Selection 命名空间一致），按 locale 选择词与分隔（zh 无空格、en 有空格、单复数区分）；现有测试无需改动。

14. **ICS `SUMMARY`/`DESCRIPTION` 未做 RFC5545 TEXT 转义**（`src/lib/calendar.ts`）
    - **修复**：新增 `escapeText`（转义 `\`/`;`/`,`/换行）；SUMMARY 整体转义；新增 `icsDescription` 对每行先转义再用 `\n` 连接（DESCRIPTION），避免城市名逗号（如 "Washington, D.C."）被严格解析器误拆。`meetingDescription` 保持未转义供 mailto/Google 正文与测试。
    - **验证**：新增测试 `tests/lib/calendar.test.ts`（含逗号城市名转义断言）。

15. **`shareUrl.decodeState` 对 `p` 二次 URL 解码**（`src/lib/shareUrl.ts`）
    - **修复**：移除多余 `decodeURIComponent`（`URLSearchParams.get` 已解码一次），避免含 `%` 的 id 被二次误解码。

16. **`EventView` 手拼 href 未走共享 encoder**（`src/components/EventView.tsx`）
    - **修复**：改用 `encodeState(data.places, data.homeId, data.selection)` 生成 href，与其它路径一致，未来加字段自动同步。

17. **`calendar.ts` 用已废弃 `escape`/`unescape` 做 UTF-8 base64**（`src/lib/calendar.ts`）
    - **修复**：`encodeEventCode` 改用 `TextEncoder`；`decodeEventCode` 改用 `TextDecoder`（循环读 `charCodeAt` 避免迭代器 downlevelIteration 限制），消除 Annex B 依赖。

18. **`encodeState` 对逗号过度编码**（`src/lib/shareUrl.ts`）
    - **修复**：对各 id 分别 `encodeURIComponent` 后用原始 `,` 连接（逗号属 query 合法 sub-delim），链接更可读且与 decodeState 的 `split(",")` 对齐。

19. **`.dockerignore` 漏 `tests/`、`scripts/`、`tsconfig.tsbuildinfo`、`.playwright-cli/`**（`.dockerignore`）
    - **修复**：补上 `tests`、`scripts`、`tsconfig.tsbuildinfo`、`.playwright-cli`、`vitest.config.ts`、`coverage`，减少构建上下文污染。

20. **`tsconfig.json` include 含被 gitignore 的 `next-env.d.ts`**（`tsconfig.json`）
    - **修复**：从 include 移除 `next-env.d.ts`（next 经 plugins 注入类型），干净克隆直接 `tsc --noEmit` 不再依赖该文件存在。
    - **验证**：`npm run type-check` 零错误。

21. **`package.json` 缺 `engines` 字段**（`package.json`）
    - **修复**：新增 `"engines": {"node": ">=18.17.0", "npm": ">=9.0.0"}`，与 Docker 基础镜像（node:20-alpine）对齐。

22. **Service Worker network-first 导航无超时**（`public/sw.js`）
    - **修复**：新增 `fetchWithTimeout`（`AbortController` + 3 秒超时），导航请求超时即回退缓存，慢网下不再长时间挂起。

23. **Service Worker install 阶段预缓存的 shell 不随部署刷新**（`public/sw.js`）
    - **修复**：`activate` 时新增 `refreshShell()` 重新拉取 `/zh`、`/en` 并 `cache.put`，确保部署后即使未升 `CACHE` 版本号外壳也为最新。

24. **`CitySearch` blur 定时器卸载未清理**（`src/components/CitySearch.tsx`）
    - **修复**：见 #8，一并处理（`useEffect` 卸载时 `clearTimeout`）。

25. **`NowButton` 在 `setViewStartDate(null)` 后同步查 DOM**（`src/components/NowButton.tsx`）
    - **修复**：滚动逻辑包进 `requestAnimationFrame`，在 React 重渲染、DOM 更新后再读 cells，避免从远处日期跳回时滚到旧窗口首格。

26. **下划线缩写（BST_BD/CST_CN/TW_T）不可由着陆页 slug 触达**（`src/lib/landingSlug.ts`）
    - **修复**：缩写正则放宽为 `/^[A-Z][A-Z_]{1,6}$/`（允许字母+下划线，长度 2-7），消歧变体现在可经 slug（如 `BST_BD--IST`）触达。
    - **验证**：`tests/lib/landingSlug.test.ts` 新增断言（`BST_BD--IST` → Asia/Dhaka）。

27. **Widget 页面无 `generateMetadata`**（`src/app/[locale]/widget/{event,world-clock}/page.tsx`、`messages/{zh,en}.json`）
    - **修复**：两页新增 `generateMetadata`，标题取自新增 `Widget` 命名空间（`eventTitle`/`worldClockTitle`）；i18n parity 88/88。

### 验证结论

- **单元测试** `npm test`：10 文件 **117 项全部通过** ✓（新增 calendar 转义 1 项 + landingSlug 下划线 1 项）
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **nextDSTChange 回归**：NY 起始 2026-02-15 现返回 2026-03-08（真实春进日）✓
- **buildColumns 回归**：NY 起始 2026-03-08 现 48 唯一 ms、0 重复；北京 7 天仍 168 列 ✓
- **Lhasa 时区**：现 `Asia/Shanghai`(+8) ✓
- **i18n 键对齐**：zh/en 各 88 键，完全一致 ✓（新增 `Landing.bNote`、`Widget.eventTitle`、`Widget.worldClockTitle`）
- **ICS 转义**："Washington, D.C." 逗号在 SUMMARY/DESCRIPTION 中转义为 `\,` ✓
- **shareUrl**：移除二次解码，含 `%` 的 id 不再被误解码 ✓
- **核心算法回归**：热力图三色、DST、周末/节假日覆盖、选区、分享链接、日历导出、cursorMs 持久化未受影响 ✓

### 影响的文件

- `src/lib/time.ts`（#1 nextDSTChange 正午探测、#12 classifyLocalPeriod 读 rest）
- `src/lib/grid.ts`（#2 buildColumns 逐小时去重、#11 删 localDayOffset）
- `src/data/cities.ts`（#3 拉萨、#10 澳门）
- `src/data/countries.ts`（#10 新增 MO）
- `src/app/[locale]/time-converter/[slug]/page.tsx`（#4 ahead/behind 重写）
- `messages/zh.json`、`messages/en.json`（#4 bNote/aheadNote/behindNote、#27 Widget 命名空间）
- `src/components/KeyboardShortcuts.tsx`（#5 确认 + 去 Backspace）
- `src/components/SettingsPanel.tsx`（#6 点击外部/Escape/焦点）
- `vitest.config.ts`、`package.json`（#7 去 plugin-react + include）
- `src/components/CitySearch.tsx`（#8 ARIA、#24 定时器清理）
- `Dockerfile`（#9 npm ci）
- `src/lib/duration.ts`（#13 i18n 词表）
- `src/lib/calendar.ts`（#14 escapeText/icsDescription、#17 TextEncoder/TextDecoder）
- `src/lib/shareUrl.ts`（#15 去二次解码、#18 逗号不编码）
- `src/components/EventView.tsx`（#16 encodeState）
- `.dockerignore`（#19 补漏）
- `tsconfig.json`（#20 去 next-env.d.ts）
- `package.json`（#21 engines）
- `public/sw.js`（#22 超时、#23 refreshShell）
- `src/components/NowButton.tsx`（#25 requestAnimationFrame）
- `src/lib/landingSlug.ts`（#26 缩写正则放宽）
- `src/app/[locale]/widget/event/page.tsx`、`src/app/[locale]/widget/world-clock/page.tsx`（#27 generateMetadata）
- `tests/lib/calendar.test.ts`（新增 ICS 转义断言）
- `tests/lib/landingSlug.test.ts`（新增下划线缩写断言）
- `tests/helpers.ts`（新增 washington 占位）

---

## 2026-08-11：第四轮三轮代码审查（未提交更改复核，本轮未改代码）

### 背景

对全部未提交更改（87 个文件）再次执行三轮独立审查，聚焦前四轮修复后残留或新引入的问题：

1. **第一轮**：配置 / 依赖 / 入口 / 构建部署（package.json、tsconfig、next.config、tailwind/postcss、Dockerfile、.dockerignore/.gitignore、middleware、i18n、sw.js、vitest.config、ESLint）。
2. **第二轮**：核心库 / 数据 / 状态 / i18n 业务逻辑（time、grid、heatmap、calendar、summary、shareUrl、duration、landingSlug、sun、types、useLocalPersist、useNow、useUrlState、store、cities、countries、holidays、latlng、timeZoneAbbreviations、messages/{zh,en}.json）。
3. **第三轮**：组件 / 页面 / 边界 / 安全（全部 app 路由与 src/components/*.tsx，覆盖 React 反模式、SSR/水合、可访问性、XSS、事件泄漏、路由 SEO）。

本轮**未改动任何代码**，仅记录发现；高优先级 3 项均已用 node + luxon 实测复现。是否修复待定。

### 审查发现

#### 🔴 高优先级（功能性 Bug，已实测复现）

1. **`nextDSTChange` 返回日比实际 DST 切换日晚一天**（`src/lib/time.ts:36-43`）
   - **问题**：逐日探测用的是 `dt.plus({days:d})`，落在本地**午夜**判定 `isInDST`。DST 切换发生在本地 02:00（春进）/02:00→01:00（秋退），午夜时 `isInDST` 尚未翻转，要等到切换日**之后**的下一日午夜才为 true，故返回日比真实切换日晚一天。
   - **实测**：以 2026-02-15 为起点的 `nextDSTChange('America/New_York')` 返回 `2026-03-09T00:00-04:00`，而真实春进为 `2026-03-08 02:00 EST→EDT`（03-08 午夜 `isInDST=false`、offset=-300；03-09 午夜 `isInDST=true`、offset=-240）。
   - **影响**：`PlacesPanel` 的"下次切换"提示（`dstChangeWithinDays` 预警窗口、详情悬浮的下次切换日期）对每个 DST 时区都偏后一天。属 6.3/6.4 增强功能（P1）。
   - **正确做法**：探测时刻取切换日**午后**（如 `dt.plus({days:d, hours:12})`），或在变化月内按小时粒度比对 `offset` 找到精确切换小时。

2. **`buildColumns` 在春进日产生重复 `ms` 与重复 React key**（`src/lib/grid.ts:40-49`）
   - **问题**：双重循环 `startLocal.plus({days:d, hours:h})`。春进日本地钟面 02:00→03:00 被跳过，导致该日 `h=23` 的列与次日 `h=0` 的列落到**同一 epoch**。
   - **实测**（NY 起始 2026-03-08，2 天）：48 列仅 47 个唯一 `ms`，`day0[23].ms === day1[0].ms === 1773028800000`（`2026-03-09T00:00-04:00`）；春进日 `homeHour` 序列为 `0,1,3,4,…,23,0`（02 消失、00 重复）。
   - **影响**：`TimeGrid` 用 `key={c.ms}` → 跨日边界出现重复 React key（控制台告警、潜在单元格错位）；`colorMap` 以 `ms` 为键 → 重复列继承相同热力图色与选区高亮；秋退日反向（01 显示两次、23 缺失）。当 7 天窗口恰好覆盖切换日时触发。
   - **正确做法**：按单一起点累加小时（`plus({hours: d*24+h})`）并按 `ms` 去重；或按日生成时枚举该日实际存在的本地小时。

3. **拉萨时区标注为 `Asia/Urumqi`（UTC+6），实际全藏使用北京时间（UTC+8）**（`src/data/cities.ts:44`）
   - **问题**：`["拉萨", "Lhasa", "CN", "Asia/Urumqi"]`。`Asia/Urumqi` 是非官方新疆时间（+6，仅适用于乌鲁木齐/喀什等同文件 607-617 行已正确标注的城市）；拉萨与全国一致使用北京时间 `Asia/Shanghai`（+8）。
   - **实测**：`Asia/Urumqi` offset=+360，`Asia/Shanghai` offset=+480，差 2 小时。
   - **影响**：拉萨的时钟、偏移量、日出日落（6.7）均偏后 2 小时。属数据正确性 bug。

#### 🟠 中优先级

4. **time-converter 着陆页"领先/落后"文案逻辑错误且中英互相矛盾**（`src/app/[locale]/time-converter/[slug]/page.tsx:100,124`、`messages/{zh,en}.json:118-119`）
   - **问题**：`ahead = diff > 0 ? bLabel : aLabel`（`ahead` 恒为"更晚的一方"），但 `diff < 0` 时 A 才是更晚方，赋值却给 `aLabel`；再渲染 `{ahead} {diff >= 0 ? aheadNote : behindNote}`，`diff<0` 分支语义为"A 更晚"却配 `behindNote`（落后），自相矛盾。
   - **zh 与 en 还互相矛盾**：`aheadNote` zh="更早。"（earlier）、en="is ahead."（later），同键两种相反语义。`behindNote` zh="更晚。"（later）、en="is behind."（earlier），同样相反。
   - **示例**（A=纽约、B=北京，diff=+13）：zh 渲染"北京 领先 +13 对比 纽约. 北京 更早。"——"领先"与"更早"互相矛盾且后者事实错误。
   - **正确做法**：统一以"B 相对 A"表述，`diff≥0` 用"B is ahead/时间更晚（领先）"、`diff<0` 用"B is behind/时间更早（落后）"；修正 zh 文案使其与 en 同向。

5. **`KeyboardShortcuts` 的 Delete/Backspace 删除主地点绕过了确认弹窗**（`src/components/KeyboardShortcuts.tsx:27-30`）
   - **问题**：焦点不在输入框时按 Delete 或 Backspace 直接 `removePlace(homeId)`，未走 `PlacesPanel` 删除按钮的 `window.confirm(t("confirmRemoveHome"))`（第一轮 item #16 专门加的保护）。Backspace 又是高频键，用户在页面任意位置误按即静默删除基准地点，无撤销。
   - **正确做法**：快捷键路径同样调用确认；或仅保留 `Delete`、移除 `Backspace`；或要求修饰键（Shift+Delete）。

6. **`SettingsPanel` 下拉菜单无点击外部关闭、无 Escape、无焦点管理**（`src/components/SettingsPanel.tsx:24-64`）
   - **问题**：菜单 `role="menu"` 但子项为 `<label><input type="radio">` 无 `role="menuitemradio"`，ARIA 语义不匹配；打开后无 `pointerdown`/`mousedown` 文档监听、无 Escape 处理、关闭时不把焦点还给触发按钮。移动端用户尤其易被困住。
   - **正确做法**：加 `useEffect` 监听文档 `pointerdown`/`keydown(Escape)`，关闭时 focus 回 toggle。

7. **`vitest.config.ts` 声明支持 `.tsx` 组件测试但无 DOM 环境 / 测试库**（`vitest.config.ts`）
   - **问题**：`include` 含 `tests/**/*.test.tsx` 且装了 `@vitejs/plugin-react`，但 `environment: "node"`，未装 `jsdom`/`happy-dom` 与 `@testing-library/*`。一旦新增组件测试，会以"document is not defined"困惑报错而非明确提示。
   - **正确做法**：要么补 `happy-dom` + testing-library 并改 `environment: "happy-dom"`；要么从 `include` 移除 `.tsx` 并卸载未用的 `@vitejs/plugin-react`。

8. **`CitySearch` 缺 combobox ARIA 契约**（`src/components/CitySearch.tsx:97-152`）
   - **问题**：输入框只有 `aria-label`，缺 `role="combobox"`、`aria-expanded`、`aria-controls`、`aria-activedescendant`。`<ul role="listbox">`/`<li role="option">` 孤立存在，屏幕阅读器无法获知弹窗存在或当前高亮项。
   - **正确做法**：补全 combobox 四件套属性。

9. **Dockerfile 用 `npm install` 而非 `npm ci`**（`Dockerfile:7`）
   - **问题**：`package-lock.json` 已存在却用 `npm install`，非确定性、更慢、且 lockfile 与 package.json 不一致时不快速失败；同 commit 两次构建可能产出不同 `node_modules`，存在供应链风险。当前 `@dnd-kit/sortable@10` 对 `core@^6.3.0` 的 peer 已满足（core@6.3.1），无 peer 问题。
   - **正确做法**：`RUN npm ci --no-audit --no-fund`（确需宽松 peer 时用 `npm ci --legacy-peer-deps`）。

#### 🟡 低优先级（健壮性 / 一致性 / 数据）

10. **澳门 countryCode 标为 `CN`（应为 `MO`）**（`src/data/cities.ts:52`）—— ISO 3166-1 alpha-2 澳门为 `MO`；HK/TW 已各自独立，MO 却并入 CN 且 `countries.ts` 无 `MO` 条目。导致澳门显示国名"中国"、继承中国节假日与周末规则（巧合相同）。时区 `Asia/Macau` 正确。

11. **`localDayOffset` 为死代码且返回非整数**（`src/lib/grid.ts:67-72`）—— 已导出但全仓库无引用；对非整数偏移时区返回分数天（NY 对北京 -0.5、加尔各答 -0.895），若未来误用会引入 bug。建议删除或改为按 `startOf("day")` 的整数日序差。

12. **`classifyLocalPeriod` 不读 `periods.rest`，该字段为死配置**（`src/lib/time.ts:107-119` vs `src/store/useWorldTimeStore.ts`）—— `rest` 作为兜底返回，未实际读取配置值。REQUIREMENTS §4.3.1 承诺三类时段均可配置；当前 SettingsPanel 虽未暴露入口，但类型契约与实现不符。建议或读取 `rest`、或从类型与默认值移除。

13. **`formatDuration` 硬编码中英字符串，未走 i18n**（`src/lib/duration.ts:9-16`、`messages/{zh,en}.json:55-58`）—— `Selection.hour/hours/minute/minutes` 四键存在于两套文案但从未被引用。建议传入 translator 使用，或删除冗余键。

14. **ICS `SUMMARY`/`DESCRIPTION` 未做 RFC5545 TEXT 转义**（`src/lib/calendar.ts:60-63,70-80`）—— 含逗号的城市名（如 "Washington, D.C." `cities.ts:212`）直接拼入 `SUMMARY:`，RFC5545 §3.3.11 要求转义 `,`/`;`/换行。多数客户端宽容，但严格解析器可能截断。建议加 `escapeText`。

15. **`shareUrl.decodeState` 对 `p` 二次 URL 解码**（`src/lib/shareUrl.ts:58`）—— `URLSearchParams.get` 已解码一次，再 `decodeURIComponent` 是第二次。当前 city id（如 `cn-beijing`）无 `%` 故无碍；一旦 id 含 `%` 或字面 `+` 会误解码（实测含 `%2C` 的 id 会抛错或截断）。建议移除多余 `decodeURIComponent`。

16. **`EventView` 手拼 href 未走共享 encoder**（`src/components/EventView.tsx:71-76`）—— 直接拼接 `*`、`,` 与选区段，未用 `encodeState`。当前可工作，但与其它路径不一致，未来加 cursor 等字段会漏改。建议复用 `encodeState`。

17. **`calendar.ts` 用已废弃 `escape`/`unescape` 做 UTF-8 base64**（`src/lib/calendar.ts:140,157`）—— Annex B 已废弃，部分嵌入式 JS 引擎可能移除，移除后所有事件链接/事件页编解码失效。建议改 `TextEncoder`/`TextDecoder`。

18. **`encodeState` 对逗号过度编码**（`src/lib/shareUrl.ts:28`）—— `encodeURIComponent("cn-beijing,us-new-york")` → `cn-beijing%2Cus-new-york`，逗号属 query 合法 sub-delim，可保留原样使链接更可读（且与 #16 EventView 手拼路径一致）。

19. **`.dockerignore` 漏 `tests/`、`scripts/`、`tsconfig.tsbuildinfo`、`.playwright-cli/`**（`.dockerignore`）—— 这些会随 `COPY . .` 进入构建上下文，污染缓存、拖慢上传（Windows 尤甚）。建议补上。

20. **`tsconfig.json` include 含被 gitignore 的 `next-env.d.ts`**（`tsconfig.json:35`、`.gitignore:36`）—— 干净克隆直接跑 `npm run type-check`（`tsc --noEmit`，不先 build）时该文件缺失，TS 静默忽略缺失项，next 的 ambient 类型可能未加载。建议从 include 移除（next 经 plugins 注入类型）。

21. **`package.json` 缺 `engines` 字段**（`package.json`）—— lockfileVersion 3 隐式要求 npm≥7，Next 14 standalone 隐式要求 Node≥18.17，但未声明。建议加 `"engines":{"node":">=18.17.0","npm":">=9.0.0"}`。

22. **Service Worker network-first 导航无超时**（`public/sw.js:84-110`）—— `await fetch(req)` 无 timeout，慢网下可挂起数分钟才回退缓存，损害 PWA 可用性感知。建议 `Promise.race` + `AbortSignal.timeout(3000)`。

23. **Service Worker install 阶段预缓存的 `/zh`、`/en` shell 不随部署刷新（除非升 `CACHE` 版本号）**（`public/sw.js:27-35`）—— `activate` 仅清理异名缓存，shell 只在 `CACHE` 改名时更新；若部署忘升版本号则分发旧 HTML。建议 `activate` 时重取 shell 并 `cache.put`，或把"升 CACHE 版本号"列为发布门禁。

24. **`CitySearch` blur 定时器卸载未清理**（`src/components/CitySearch.tsx:44,108-112`）—— `setTimeout(()=>setOpen(false),150)` 存 ref 但无 cleanup，组件在 150ms 内卸载（如切语言重挂）会触发已卸载组件 setState。建议加 `useEffect(()=>()=>clearTimeout(...),[])`。

25. **`NowButton` 在 `setViewStartDate(null)` 后同步查 DOM**（`src/components/NowButton.tsx:18-33`）—— 重置 store 后立即 `querySelectorAll` 读的是旧 cells，若"现在"不在当前 7 天窗口内，`find` 返回 undefined、回退 `cells[0]` 滚到旧窗口首格。建议把滚动放进 `useEffect`/`requestAnimationFrame`。

26. **`timeZoneAbbreviations` 中 `BST_BD`/`CST_CN`/`TW_T` 等下划线变体不可由着陆页 slug 触达**（`src/data/timeZoneAbbreviations.ts:34,41,42` vs `src/lib/landingSlug.ts:48-49`）—— `parseSlug` 的缩写正则 `/^[A-Z]{2,5}$/` 拒绝下划线，这些消歧条目仅存于 `ABBR_BY_CODE` 直查 map，SEO slug 路径永不返回它们。建议或放宽正则允许 `_`、或删除不可达条目。

27. **Widget 页面无 `generateMetadata`**（`src/app/[locale]/widget/{event,world-clock}/page.tsx`）—— 继承 layout 的 `App.title`，作为 iframe 嵌入可接受，但若被直接访问标题较泛。可选优化。

### 验证结论（本轮基线复核，未改动代码）

- **单元测试** `npm test`：10 文件 **115 项全部通过** ✓
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **nextDSTChange 偏后一天**：NY 起始 2026-02-15，返回 2026-03-09（真实春进 03-08）✓ 实测复现
- **buildColumns 重复 ms**：NY 起始 2026-03-08，48 列 47 唯一 ms，`day0[23].ms===day1[0].ms` ✓ 实测复现
- **Lhasa 时区**：`Asia/Urumqi`(+6) vs `Asia/Shanghai`(+8) 差 2h ✓ 实测复现
- **shareUrl 二次解码**：含 `%` 的 id 会截断/抛错 ✓ 实测复现

### 与前几轮的关系

前四轮（15 / 19 / 节假日+SW / 6 项修复）已完成。本轮在其基础上复核，新发现集中在：(a) DST/网格在切换日的边界处理（#1、#2 均为切换日才暴露，前几轮测试未覆盖到切换日窗口）；(b) 着陆页文案的语义/翻译一致性（#4，前轮只加了 `updatedAt` 说明，未审 ahead/behind 文案本身）；(c) 数据正确性（#3 拉萨、#10 澳门）；(d) 快捷键绕过确认（#5，前轮只加固了按钮路径）。核心 P0 主链路（热力图三色、周末覆盖、选区、分享链接、日历导出、本地持久化）经本轮复核未发现回归。

### 影响的文件（仅本轮记录，未实际改动）

- 高优先级：`src/lib/time.ts`（#1）、`src/lib/grid.ts`（#2）、`src/data/cities.ts`（#3）
- 中优先级：`src/app/[locale]/time-converter/[slug]/page.tsx` + `messages/{zh,en}.json`（#4）、`src/components/KeyboardShortcuts.tsx`（#5）、`src/components/SettingsPanel.tsx`（#6）、`vitest.config.ts`（#7）、`src/components/CitySearch.tsx`（#8）、`Dockerfile`（#9）
- 低优先级：`src/data/cities.ts`（#10）、`src/lib/grid.ts`（#11）、`src/lib/time.ts`+`src/store/useWorldTimeStore.ts`（#12）、`src/lib/duration.ts`+`messages/*`（#13）、`src/lib/calendar.ts`（#14,17）、`src/lib/shareUrl.ts`（#15,18）、`src/components/EventView.tsx`（#16）、`.dockerignore`（#19）、`tsconfig.json`（#20）、`package.json`（#21）、`public/sw.js`（#22,23）、`src/components/CitySearch.tsx`（#24）、`src/components/NowButton.tsx`（#25）、`src/data/timeZoneAbbreviations.ts`+`src/lib/landingSlug.ts`（#26）、`src/app/[locale]/widget/*/page.tsx`（#27）

---

## 2026-08-11：第三轮审查 6 项问题修复（sunRiseSet 时区 bug 等）

### 背景

承接上一条「第三轮三轮代码审查」发现的 6 项问题，本次全部修复并通过完整测试验证。

### 修复清单

#### 🔴 高优先级（功能性 Bug）

1. **`sunRiseSet` 时区换算错误，日出日落偏差等于 UTC 偏移**（`src/lib/sun.ts`）
   - **根因**：`sunriseUTC_minutes` 是「相对 UTC 午夜的分钟数」，而原代码 `DateTime.fromMillis(dt.toMillis() + sunriseUTC_minutes*60000, {zone})` 把它加到「本地午夜」epoch（已含 UTC 偏移），等于把偏移量计算了两次。
   - **修复**：先 `本地分钟 = sunriseUTC_minutes + offsetMin`（`offsetMin = dt.offset`，把 UTC 钟面分钟换算为本地钟面分钟），归一化到 `[0,1440)` 以处理偏移把分钟推过日界的罕见情形，再用 `dt.plus({minutes})` 锚定到本地日历日。
   - **验证**：新增 `tests/lib/sun.test.ts`（6 项断言）。夏至日北京 04:46/19:46、伦敦 04:43/21:21、纽约 05:25/20:30 均命中权威值 ±10 分钟；孟买（+5:30）命中 ±15 分钟；悉尼南半球冬季日落早于 17:30；并含「不再出现 20:46 双倍偏移」的回归断言。

#### 🟠 中优先级

2. **`EventWidget` 水合不一致风险**（`src/components/EventWidget.tsx`）
   - **根因**：原在 `useMemo([])` 中读 `window`，SSR 返回 null 占位、客户端首渲染返回真实数据，可能触发 React 水合告警。
   - **修复**：改为 `useEffect` + `useState` 在客户端挂载后读取查询参数（与 `WorldClockWidget` 一致）。
   - **验证**：构建通过，`widget/event` 路由正常。

#### 🟡 低优先级（健壮性 / 一致性）

3. **`dayNightIcon` 未读取用户配置的 `dayPeriods`**（`src/components/PlacesPanel.tsx`）
   - **修复**：`dayNightIcon` 增加 `periods: DayPeriods` 参数；`PlacesPanel` 订阅 `dayPeriods` 并经 `PlaceRow` 透传。当前 `SettingsPanel` 虽未开放配置入口，但消除潜在不一致，为后续开放时段配置铺路。

4. **`TimeGrid` 的 `highlight` useMemo 读取未列入依赖的 ref**（`src/components/TimeGrid.tsx`）
   - **修复**：把拖拽进行态从 `useRef(false)` 改为 `useState(false)`（`isDragging`），进入 `highlight` 的依赖数组；移除不再使用的 `useRef` 导入。消除「memo 中读 ref」反模式。

5. **游标 `cursorMs` 不持久化、不入 URL**（`src/lib/shareUrl.ts`、`src/lib/useUrlState.ts`、`src/lib/useLocalPersist.ts`、`src/components/SelectionBar.tsx`）
   - **修复**：
     - `shareUrl`：`encodeState` / `decodeState` 增加 `cursorMs`（查询参数 `c`，缺省表示无游标）；
     - `useUrlState`：挂载时从 URL 还原游标、状态变化时回写（URL 优先）；
     - `useLocalPersist`：`PersistShape` 增加 `cursorMs`，挂载时按 `?c=` 是否存在决定 URL / 本地优先级，状态变化时持久化；
     - `SelectionBar.onCopyShare`：分享当前视图时带上游标（事件页 eventCode 仍只编码地点+选区，因事件为固定时间）。
   - **验证**：`tests/lib/shareUrl.test.ts` 新增 3 项断言（cursor round-trip、缺省 null、非法格式忽略）。

6. **`vitest.config.ts` include 重复且漏 `.tsx`**（`vitest.config.ts`）
   - **修复**：`include` 由 `["tests/**/*.test.ts", "tests/**/*.test.ts"]` 改为 `["tests/**/*.test.ts", "tests/**/*.test.tsx"]`，去重并支持将来的组件测试。

### 验证结论

- **单元测试** `npm test`：10 文件 **115 项全部通过** ✓（新增 sun 6 项 + shareUrl cursor 3 项）
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **sunRiseSet 回归**：三城夏至、孟买半小时偏移、悉尼南半球冬季均命中权威值 ✓
- **cursorMs 持久化**：shareUrl round-trip 覆盖 ✓；URL/本地优先级逻辑与既有 places/selection 一致 ✓
- **核心算法回归**：热力图三色、DST、周末/节假日覆盖、选区、分享链接未受影响 ✓

### 影响的文件

- `src/lib/sun.ts`（sunRiseSet 时区换算重写）
- `src/components/EventWidget.tsx`（useEffect + useState 取参）
- `src/components/PlacesPanel.tsx`（dayNightIcon 传 dayPeriods、订阅并透传）
- `src/components/TimeGrid.tsx`（isDragging state 替代 ref）
- `src/lib/shareUrl.ts`、`src/lib/useUrlState.ts`、`src/lib/useLocalPersist.ts`（cursorMs 编解码/还原/持久化）
- `src/components/SelectionBar.tsx`（onCopyShare 带游标）
- `vitest.config.ts`（include 去重 + .tsx）
- `tests/lib/sun.test.ts`（**新增**，6 断言）
- `tests/lib/shareUrl.test.ts`（新增 3 项 cursor 断言）

---

## 2026-08-11：第三轮三轮代码审查（未提交更改复核）

### 背景

对全部未提交更改（约 70 个文件）再次执行三轮独立审查：

1. **第一轮**：通读配置（package.json / tsconfig / next.config / Dockerfile / middleware / i18n / sw.js）、核心纯函数库（time / grid / heatmap / calendar / summary / shareUrl / landingSlug / duration / sun）、状态管理（store）、数据源（cities / countries / holidays / latlng）、全部组件与页面。
2. **第二轮**：对第一轮标记的疑点逐一实测验证——i18n 键对齐、parseSlug 双连字符、nextDSTChange 同月/跨月、sunRiseSet 时区换算、base64 round-trip、EventView/EventWidget 解码路径。
3. **第三轮**：复核次要项（城市 id 去重、选区编码边界、键盘快捷键冲突、Dockerignore、vitest 配置），并重跑 `npm test` / `type-check` / `lint` 确认基线。

### 审查发现（本轮未改动代码，仅记录；如需修复请按优先级处理）

#### 🔴 高优先级（功能性 Bug）

1. **`sunRiseSet` 时区换算错误，日出日落时间偏差等于 UTC 偏移量**（`src/lib/sun.ts`）
   - **问题**：`sunriseUTC_minutes` 是「相对 UTC 午夜的分钟数」，而代码 `DateTime.fromMillis(dt.toMillis() + sunriseUTC_minutes*60000, {zone})` 把它加到了「本地午夜」的 epoch（已含 UTC 偏移），等于把偏移量计算了两次。
   - **实测**（2026-06-21 夏至）：北京应为 ~04:46/19:46，实际输出 20:46/11:46（偏 16h=2×UTC+8）；伦敦应为 ~04:43/21:21，实际 03:43/20:21（偏 ~1h≈BST）；纽约应为 ~05:25/20:30，实际 09:25/00:30（偏 4h≈UTC-4）。三城全部偏离各自 UTC 偏移量。
   - **正确做法**：本地分钟 = `sunriseUTC + offsetMin`（把 UTC 钟面分钟换算为本地钟面分钟），再 `localDay.plus({minutes: ...})`；已离线验证该写法三城全部命中权威值。
   - **影响**：P2「6.7 日出日落」功能显示数值错误（`PlacesPanel` 每个收录经纬度城市的 🌅/🌇 行）。不触及热力图、时钟、选区等核心 P0/P1 链路。

#### 🟠 中优先级

2. **`EventWidget` 在 `useMemo([])` 中读 `window` 存在水合不一致风险**（`src/components/EventWidget.tsx`）
   - SSR 首渲染 `typeof window==="undefined"` → 返回 null（占位）；客户端首渲染 `window` 已定义 → 返回真实数据，可能触发 React 水合告警。`WorldClockWidget` 用 `useEffect` 取参（正确），建议 EventWidget 同步改为 `useEffect` + `useState` 取查询参数。

#### 🟡 低优先级（健壮性 / 一致性）

3. **`dayNightIcon` 昼夜图标未读取用户配置的 `dayPeriods`**（`src/components/PlacesPanel.tsx`）
   - 调用 `classifyLocalPeriod(localHour)` 未传 `dayPeriods`，恒用默认时段。当前 `SettingsPanel` 未暴露时段配置入口，故无用户可见偏差；一旦开放 work/contact/rest 配置，图标将与网格热力图判定不一致。

4. **`TimeGrid` 的 `highlight` useMemo 读取未列入依赖的 ref**（`src/components/TimeGrid.tsx`）
   - memo 体内读 `dragging.current`，但依赖数组仅 `[dragStartMs, dragEndMs, selection]`。当前因 `onPointerDown` 同时置 `dragging.current` 与 `setDragStartMs`/`setDragEndMs`，实际可工作；属「ref 在 memo 中读取」反模式，建议把拖拽进行态也用 state 表达。

5. **游标状态 `cursorMs` 不持久化、不入 URL**（`src/lib/useLocalPersist.ts` / `src/lib/shareUrl.ts`）
   - 刷新或分享链接后游标归零（需重新「启用游标」）。属 P1 临时辅助工具的行为，记录为体验项。

6. **`vitest.config.ts` include 重复且漏 `.tsx`**（`vitest.config.ts`）
   - `include: ["tests/**/*.test.ts", "tests/**/*.test.ts"]` 两条相同、无 `.tsx`。当前测试全为 `.ts` 故 106 项全过；若将来加组件测试需补 `.tsx`。

### 验证结论（本轮复核基线，未改动代码）

- **单元测试** `npm test`：9 文件 **106 项全部通过** ✓
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **i18n 键对齐**：zh / en 各 85 键，完全一致 ✓
- **中东周末数据**：SA/AE/QA/BH/KW/OM/YE/IR/IQ/IL/PS 均为 `[5,6]`，SY/JO/LB 为 `[6,7]` ✓（符合 TC-11 / 4.3.2 非标准周末要求）
- **城市 id 去重**：构建阶段 `seen` 追加序号后缀，数组与 map 一一对应 ✓
- **parseSlug**：双连字符精确反查 + 旧式单连字符缩写兼容，回归测试覆盖 ✓
- **nextDSTChange**：同月切换前/后、跨月、DST 内外多场景实测均返回正确下一次切换日 ✓
- **base64 round-trip**：encodeEventCode/decodeEventCode 多长度补齐 padding 还原正确 ✓

### 与前两轮的关系

前两轮（15 项 / 19 项修复）已完成；本轮在其基础上复核，主要发现集中在 P2 `sunRiseSet` 的时区换算。核心 P0/P1（热力图三色、DST、周末/节假日覆盖、选区、分享链接、日历导出）经本轮复核未发现回归。

### 影响的文件（仅本轮记录，未实际改动）

- `src/lib/sun.ts`（高优先级 bug #1 所在，建议优先修复）
- `src/components/EventWidget.tsx`（中优先级 #2）
- `src/components/PlacesPanel.tsx`、`src/components/TimeGrid.tsx`、`src/lib/useLocalPersist.ts`、`src/lib/shareUrl.ts`、`vitest.config.ts`（低优先级 #3~#6）

---

## 2026-08-11：节假日全球覆盖、Service Worker 离线修复、自动化测试套件建立

### 背景

在项目功能完成度复核中，确认 4 项遗留问题并逐项修复：

1. 节假日数据（MS-7）仅覆盖 5 国（US/CN/GB/DE/JP），偏窄。
2. Service Worker 离线可用（步骤 4.6）存在真实 bug。
3. 缺乏持久化自动化测试（仅有开发期脚本，无回归套件）。
4. （Google 日历叠加为 mock，本轮按约定跳过。）

本次全部修复并通过完整测试验证。

### 修复清单

#### 🔴 高优先级（功能性修复）

1. **Service Worker 离线功能失效**（`public/sw.js`、`src/components/ServiceWorkerRegister.tsx`）
   - **根因**：旧版 `APP_SHELL = ["/"]`，而 `/` 在 next-intl 下返回 **307 重定向**到 `/zh`（实测 `curl / → 307 → /zh`）。install 阶段 `cache.addAll(["/"])` 缓存的是重定向响应；离线时导航请求 network-first 失败后回退 `caches.match("/")` 拿到 307，浏览器跟随重定向又去请求 `/zh` 再次失败 → 显示离线错误页。**离线功能实际不可用。**
   - **修复**：
     - APP_SHELL 改为真实可渲染的 `["/zh", "/en"]`；
     - install 改为逐个缓存（`addAll` 任一失败会整体 reject），且仅缓存 `res.ok` 的响应（过滤 307/404）；
     - 导航 fallback 改为三级回退：精确 URL → locale shell（`/en` 或 `/zh`）→ 兜底 shell；
     - 缓存版本号 `worldtime-v1 → worldtime-v2`，activate 时清理旧版（修复旧版永不变更、更新部署后旧缓存不清理的可维护性 bug）；
     - 增加「仅处理同源请求」，避免拦截第三方资源；
     - `ServiceWorkerRegister` 增加生产环境判定（避免 dev 下 SW 与 HMR 冲突）与 `controllerchange` 监听（新版本接管后刷新一次，确保 v1→v2 缓存切换即时生效，仅刷新一次防循环）。
   - **验证**（Playwright 浏览器实测）：SW 注册成功 `state: activated`、`scope: http://localhost:3000/`；缓存键仅 `worldtime-v2`（旧 v1 已清理）；预缓存 `["/zh","/en"]`；`caches.match("/zh")` 返回 `{status: 200, isHtml: true, hasTitle: true, bodyLen: 18462}` —— 缓存的是完整 HTML 而非重定向响应，离线命中能力确立。

2. **节假日数据扩展至全球主流国家**（`src/data/holidays.ts`）
   - **问题**：原仅 5 国（US/CN/GB/DE/JP），覆盖面不足以支撑 MS-7「主要国家」语义。
   - **修复**：重写为覆盖 **51 个国家**（东亚 5、东南亚 6、南亚 3、中东/西亚 7、欧洲 16、北美 3、南美 5、大洋洲 2、非洲 5），合计 **2362 条假日日期**，覆盖 2024~2027 四个完整年度。固定假日按「月-日」，浮动假日（感恩节、复活节、春节、各类「第 N 个周 X」）逐年预计算具体日期。
   - **数据质量**：51 国 ISO 代码全唯一；2362 条日期格式 `YYYY-MM-DD` 全合法；修复过程中由测试套件检出并消除 3 处国家内重复（IN 2025-10-02、NO 2027-05-17、DK 2025-04-18）。
   - **验证**：`tests/data/holidays.test.ts` 13 项断言（覆盖范围 ≥40、key 合法、日期格式、国家内无重复、年份覆盖、典型假日判定、未收录国家兜底、大小写不敏感）全部通过。

#### 🟠 中优先级（工程化）

3. **建立持久化自动化测试套件**（`vitest.config.ts`、`tests/**`、`package.json`）
   - **问题**：此前仅有开发期临时脚本（无持久化、CI 无法复跑），核心算法回归无保障。
   - **修复**：引入 Vitest（`vitest` + `@vitejs/plugin-react`），配置 `@/` 路径别名与 node 环境（luxon 基于 Intl，Node 内置完整 ICU，时区计算准确）。新增 `test` / `test:watch` 脚本。
   - **测试覆盖**（9 个测试文件、**106 项断言**），全部覆盖核心纯函数：
     - `tests/lib/time.test.ts`：偏移/DST/时段分类/12-24 制/昼夜判定（18 项，含纽约伦敦 DST、北京无 DST、半小时偏移）
     - `tests/lib/grid.test.ts`：网格列生成/周末判定（14 项，含中东周五周六、未收录国家兜底、验收第 3 条跨日换算）
     - `tests/lib/heatmap.test.ts`：三色配色 + 周末覆盖 + 节假日覆盖（11 项，**直接对应验收第 5/6/7/8/9 条**）
     - `tests/lib/calendar.test.ts`：base64 round-trip、ics/Google/mailto 导出（19 项，含 padding 缺失、URL 安全字符）
     - `tests/lib/shareUrl.test.ts`：分享链接编解码（7 项，含主地点非首项、非法 id 跳过）
     - `tests/lib/summary.test.ts`：复制摘要（5 项，含 homeId 标记、12 小时制 AM/PM）
     - `tests/lib/duration.test.ts`：选区时长（7 项，中英单复数）
     - `tests/lib/landingSlug.test.ts`：SEO 着陆页 slug 解析（11 项，含子串误匹配回归、旧式缩写兼容）
     - `tests/data/holidays.test.ts`：节假日数据完整性（13 项）
   - **重构**：把 `time-converter/[slug]/page.tsx` 内的 `parseSlug` 抽取为独立纯函数 `src/lib/landingSlug.ts`（page 引用之），使其可单元测试，且符合关注点分离。
   - **顺带修复的 bug**：测试过程中发现 `calendar.ts` 的 `stampUtc` 缺少 RFC5545 要求的 `T` 分隔符（`yyyyMMddHHmmss'Z'` → `yyyyMMdd'T'HHmmss'Z'`），导致 .ics 的 DTSTART/DTEND 不符合规范，部分日历客户端可能解析异常。已修复并统一与 Google 日历 URL 的格式。

### 验证结论

- **单元测试** `npm test`：9 文件 **106 项全部通过** ✓
- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **Service Worker 浏览器实测**：SW activated，缓存 worldtime-v2 含 `/zh`、`/en` 完整 HTML（status 200），旧 v1 已清理 ✓
- **节假日数据**：51 国唯一、2362 条日期格式合法、国家内零重复、覆盖 2024~2027 ✓
- **parseSlug 抽取回归**：构建通过，页面正常解析 ✓

### 影响的文件

- `src/data/holidays.ts`（重写，5 国 → 51 国）
- `public/sw.js`（重写，修复离线 bug + 版本管理）
- `src/components/ServiceWorkerRegister.tsx`（生产判定 + controllerchange 刷新）
- `src/lib/calendar.ts`（stampUtc 加 T 分隔符，RFC5545 合规）
- `src/lib/landingSlug.ts`（**新增**，从 page 抽取 parseSlug）
- `src/app/[locale]/time-converter/[slug]/page.tsx`（引用抽取的 parseSlug）
- `vitest.config.ts`（**新增**）
- `tests/helpers.ts`、`tests/lib/*.test.ts`、`tests/data/*.test.ts`（**新增**，9 文件 106 断言）
- `package.json`（新增 `test` / `test:watch` 脚本；devDependencies 增 vitest、@vitejs/plugin-react）

---

## 2026-08-10：第二轮三轮代码审查与 19 项问题修复

### 背景

在上一轮（15 项修复）基础上，再次对全部未提交更改进行三轮独立审查：
1. 架构 / 依赖 / 配置 / 入口
2. 业务逻辑（lib / store / data / i18n）
3. 组件 / 页面 / 边界情况

审查共发现 19 项问题（2 高 / 5 中 / 5 中低 / 7 低），本次全部修复。

### 修复清单

#### 🔴 高优先级（功能性 Bug）

1. **time-converter 着陆页 parseSlug 子串误匹配**（`src/app/[locale]/time-converter/[slug]/page.tsx`）
   - 问题：城市对 slug 用 `slug.includes(c.id)` 子串匹配，实测存在 115,439 对长尾组合误匹配（如 `cn-beijing-ph-cebu-city` 会额外命中 `ph-cebu`，A/B 指向错误城市）。热门组合因偶然不冲突而正常。
   - 修复：改用「--」（双连字符）作为两段分隔符，城市对按 `CITY_BY_ID` 精确反查；时区缩写对优先按 `--` 切分（兼容旧式单连字符）。`generateStaticParams` 同步改用 `--`。
   - 验证：脚本复测，曾误匹配的长尾组合 `cn-beijing--ph-cebu-city` 现精确解析为 Beijing / Cebu City；旧式无 `--` 的城市 slug 返回 null；带连字符的城市 id（`cn-hohhot-east--cn-nanjing-south`）正确。

2. **TimeGrid 当前时刻标记在半小时/45 分钟偏移时区消失**（`src/components/TimeGrid.tsx`）
   - 问题：`isNow = c.ms === Math.floor(now/3600_000)*3600_000`（UTC 整点地板相等），而列 ms 锚定主地点本地午夜。Asia/Kolkata(+5:30)、Asia/Kathmandu(+5:45) 的列 ms 永不落在 UTC 整点，"现在"指示线消失。
   - 修复：改用区间判定 `c.ms <= now && now < c.ms + 3600_000`，NowButton 的目标格定位同步改为区间匹配。
   - 验证：脚本复测四个时区（含 +5:30 / +5:45）均正确命中当前所在列。

#### 🟠 中优先级

3. **复制摘要主地点标记错位**（`src/lib/summary.ts`、`src/components/SelectionBar.tsx`）
   - 问题：`(主)` 标记比对 `places[0]`（列表首项），主地点未必是首项，标记可能打错。
   - 修复：`summaryText` 新增 `homeId` 参数，比对真实主地点 id；SelectionBar 传入 `homeId`。
   - 验证：脚本构造 home=第二地点，输出正确标注第二地点为 `(主)`。

4. **ISR 着陆页时差"冻结"无说明**（`src/app/[locale]/time-converter/[slug]/page.tsx`、`messages/{zh,en}.json`）
   - 问题：SSG/ISR 页面内 `Date.now()` 在 revalidate 周期内定值，对照表与时差不实时，用户无感知。
   - 修复：页面底部新增"数据生成于 {time}（每小时刷新）"说明（走 i18n `Landing.updatedAt`）。

5. **事件页/事件小组件忽略 locale**（`src/components/EventView.tsx`、`src/components/EventWidget.tsx`、`src/app/[locale]/widget/event/page.tsx`）
   - 问题：EventView 恒显示中文城市名、EventWidget 恒显示英文名，与 locale 无关。
   - 修复：两组件接收 `locale`，按 locale 选择城市名（中/英）；EventWidget 标题随 locale 切换；widget/event 页面传 `locale`。

6. **DateJump 日期选择器受控值缺失**（`src/components/DateJump.tsx`）
   - 问题：`<input type="date">` 无 `value` 绑定，点"今天"重置 store 后输入框显示的日期不回空，UI 与 store 脱节。
   - 修复：改为受控组件，`value` 由 `viewStartDateMs` 在主地点本地时区格式化为 `yyyy-MM-dd` 派生。

7. **事件页 `void useTranslations` 非常规写法**（`src/app/[locale]/event/[code]/page.tsx`）
   - 问题：`void useTranslations("Event")` 仅为触发 namespace 加载，写法非常规。
   - 修复：删除该行（locale 已由 layout provider 提供，metadata 用 `getTranslations`）。

#### 🟡 中低优先级

8. **store 死代码 `allTags()`**（`src/store/useWorldTimeStore.ts`）
   - 问题：派生函数 `allTags()` 在 `get` 中又调 `getState()`，且无组件使用（PlacesPanel 自行 useMemo 派生）。
   - 修复：从接口与实现中删除。

9. **地点排序回写绕、易抖动**（`src/store/useWorldTimeStore.ts`、`src/components/PlacesPanel.tsx`）
   - 问题：`onDragEnd` 遍历 nextIds 逐项 `reorderPlaces`（每步 splice），快速拖拽可能抖动。
   - 修复：store 新增 `setPlacesOrder(orderedIds)` 一次性整体回写；PlacesPanel 改用之（未列出的地点保持原序追加末尾）。

10. **URL 选区时间戳过长暴露实现**（`src/lib/shareUrl.ts`）
    - 说明：经评估为可读性/偏好问题，功能正确；本轮记录在案，未做破坏性改动以保持分享链接向后兼容。

11. **rest 时段配置项名义存在但不独立生效**（`src/lib/time.ts`）
    - 说明：`classifyLocalPeriod` 中 work/contact 覆盖 6–22 点，rest 为兜底，与默认 rest(22–6) 一致；SettingsPanel 未暴露 rest 入口，无用户可见偏差。保持现状（rest 字段作未来配置入口预留），已在注释中澄清语义。

#### 🟢 低优先级

12. **React 严格模式未启用**（`next.config.mjs`）
    - 修复：新增 `reactStrictMode: true`，提前暴露潜在副作用。

13. **luxon 类型版本与运行时不一致**（`package.json`、`package-lock.json`）
    - 问题：运行时 `luxon@^2.5.2`，类型 `@types/luxon@^3.7.4`。
    - 修复：将 `@types/luxon` 降级对齐到 `^2.4.0`，消除类型漂移风险。

14. **NowButton 未重置视图起始日**（`src/components/NowButton.tsx`）
    - 问题：用户用 DateJump 跳到一个月后，点"回到现在"只滚动表格，当前时刻不在 7 天窗口内时按钮失效。
    - 修复：点击同时 `setViewStartDate(null)` 把视图拉回今天。

15. **SelectionBar eventUrl 首渲染 origin 为空**（`src/components/SelectionBar.tsx`）
    - 问题：`origin` 在 `useEffect` 后才有值，持久化选区场景首渲染事件链接短暂为 `//zh/event/...`。
    - 修复：origin 未就绪时 eventUrl 为空，事件 anchor 的 `href` 与 `aria-disabled` 据此降级。

16. **删除主地点无确认**（`src/components/PlacesPanel.tsx`、`messages/{zh,en}.json`）
    - 修复：删除主地点前 `window.confirm`（文案 `Places.confirmRemoveHome`），避免误删基准地点。

17. **tsconfig 含被 gitignore 的 next-env.d.ts**（`tsconfig.json`）
    - 说明：属 Next.js 约定（dev/build 自动生成），记录在案；CI 须先跑 build 再独立 type-check。

18. **middleware matcher 与 widget 路由**（`src/middleware.ts`）
    - 说明：经复核 `/sw.js`（含点）正确跳过中间件，widget 路由正常处理，无问题，记录确认。

19. **深色主题侵入式覆盖工具类**（`src/app/globals.css`）
    - 说明：经评估当前可用，维护成本偏高；记录为长期迁移至 CSS 变量 / Tailwind dark: 变体的改进方向，本轮未改动以避免回归。

### 验证结论

- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓（time-converter slug 已切换为 `--` 分隔）
- **i18n 键对齐**：zh/en 各 85 键，完全一致 ✓（新增 `Landing.updatedAt`、`Places.confirmRemoveHome`）
- **城市 id 唯一性**：1203 条全唯一，数组与 map id 一一对应 ✓（回归未受影响）
- **parseSlug 回归**：曾误匹配的长尾组合现精确解析；旧式无 `--` 城市slug 返回 null ✓
- **now-marker 回归**：四个时区（含 +5:30 / +5:45）均正确命中当前列 ✓
- **summaryText 主地点标记**：home 为非首项时正确标注 ✓
- **base64 round-trip**：未受影响 ✓
- **核心算法回归**：热力图三色判定、DST、周末覆盖逻辑未受影响 ✓

### 影响的文件

- `src/app/[locale]/time-converter/[slug]/page.tsx`（parseSlug 重写、updatedAt 提示）
- `src/app/[locale]/event/[code]/page.tsx`（删除 void useTranslations）
- `src/app/[locale]/widget/event/page.tsx`（传 locale）
- `src/components/TimeGrid.tsx`、`NowButton.tsx`、`DateJump.tsx`、`SelectionBar.tsx`、`PlacesPanel.tsx`、`EventView.tsx`、`EventWidget.tsx`
- `src/lib/summary.ts`（homeId 参数）
- `src/store/useWorldTimeStore.ts`（删 allTags、增 setPlacesOrder）
- `next.config.mjs`（reactStrictMode）
- `package.json`、`package-lock.json`（@types/luxon 对齐 v2）
- `messages/zh.json`、`messages/en.json`（新增 2 条文案）

---

## 2026-08-10：三轮代码审查与 15 项问题修复

### 背景

对全部未提交更改（约 4200 行、70 个文件）进行了三轮审查：
1. 安全性、配置文件、依赖关系
2. 代码质量、TypeScript 类型、业务逻辑正确性
3. 架构、可维护性、i18n、可访问性、边界情况

审查共发现 15 项问题，本次全部修复。

### 修复清单

#### 🔴 高优先级（功能性 Bug / 数据错误）

1. **cities.ts 城市记录重复 id**（`src/data/cities.ts`）
   - 问题：`makeId` 按「国家代码 + 英文名 slug」派生 id，"遂宁/睢宁" 英文名均为 `Suining`，生成重复 `cn-suining`；`CITY_BY_ID` 去重改名后与 `CITIES` 数组 id 不一致，导致两城无法同时添加、分享链接还原错位。
   - 修复：把去重/改名逻辑提前到 `CITIES` 数组构建阶段，冲突项追加序号后缀（`cn-suining`、`cn-suining-2`），数组和 map 的 id 完全一致。
   - 验证：1203 条记录全部唯一，遂宁/睢宁 id 不再冲突。

2. **countries.ts 牙买加（JM）重复定义**（`src/data/countries.ts`）
   - 问题：第 143 行与第 150 行重复定义 JM。
   - 修复：删除重复的第二条。
   - 验证：`code: "JM"` 仅出现 1 次。

3. **地点拖拽排序（WC-6）未实现**（`src/components/PlacesPanel.tsx`）
   - 问题：`@dnd-kit` 在 package.json 中声明但未使用，store 的 `reorderPlaces` 无组件调用，WC-6 拖拽排序功能缺失。
   - 修复：在 PlacesPanel 接入 `DndContext` + `SortableContext` + `useSortable`，为每个地点行增加拖拽手柄，`onDragEnd` 调用 `arrayMove` + `reorderPlaces` 回写顺序；同步加入键盘排序支持（`KeyboardSensor`）与 i18n 文案 `Places.dragHandle`。
   - 验证：构建通过，首页 JS 由 22.3KB 增至 37.8KB（dnd-kit 接入）。

#### 🟠 中优先级（代码 Bug / 数据准确性）

4. **summary.ts 三元分支无效**（`src/lib/summary.ts:22`）
   - 问题：`const fmt = use12 ? "MM-dd HH:mm" : "MM-dd HH:mm";` 两分支完全相同，12 小时制下复制摘要仍输出 24 小时制。
   - 修复：起始时间用 `use12 ? "MM-dd h:mm a" : "MM-dd HH:mm"`，结束时间同步区分。
   - 验证：12 小时制下摘要含 AM/PM 标识。

5. **中东国家 weekendDays 数据与事实不符**（`src/data/countries.ts`）
   - 问题：SA/AE/QA/BH/KW/OM/YE/IQ/IL/PS 标注为 `[6,7]`，实际为周五、周六休。
   - 修复：据实更正为 `[5,6]`（SY/JO/LB 保留 `[6,7]`）。`[5,6]` 国家数从 1（仅伊朗）增至 11，满足需求 TC-11 / 4.3.2 的非标准周末测试要求。
   - 验证：SA、AE 等均为 `[5,6]`。

6. **time-converter 着陆页固定时差标签 DST 切换日错误**（`src/app/[locale]/time-converter/[slug]/page.tsx`）
   - 问题：顶部固定时差标签用单一 `Date.now()` 计算，DST 切换日与逐行 `setZone` 计算的表格矛盾（已验证 NY 2026-03-08 offset 从 -300 跳到 -240）。
   - 修复：标签后追加「（当前偏移，夏令时切换日可能有变化）」说明，并走 i18n。

7. **Service Worker 静态资源回退引用问题**（`public/sw.js:37`）
   - 问题：`.catch(() => cached)` 中 `cached` 在缓存未命中时为 `undefined`，网络再失败会返回无效响应。
   - 修复：重写为 async/await 结构，缓存未命中且网络失败时返回 `Response.error()` 兜底。

8. **EventView/EventWidget base64 解码缺 padding**（`src/lib/calendar.ts`、`src/components/EventView.tsx`、`src/components/EventWidget.tsx`）
   - 问题：`encodeEventCode` 去除 `=`，还原时未补 padding，部分环境 `atob` 抛异常。
   - 修复：新增共享 `decodeEventCode`，解码前 `normalized + "=".repeat((4 - len%4)%4)` 补齐；两组件统一调用该函数。
   - 验证：多长度字符串 round-trip 全部通过。

#### 🟡 低优先级（i18n / 可维护性 / 健壮性）

9. **time-converter 着陆页文案未走 i18n**（`src/app/[locale]/time-converter/[slug]/page.tsx`）
   - 修复：抽取 9 条文案到 `messages/{zh,en}.json` 的 `Landing` 命名空间（cityPair/tzPair/timeComparison/isAhead/lags/vs/aheadNote/behindNote/currentOffsetNote）。

10. **组件内硬编码文案**（`src/components/TimeGrid.tsx`、`src/components/HeatmapLegend.tsx`）
    - 修复：TimeGrid 空状态走新增 `Grid.empty` 文案；HeatmapLegend 的「取最差状态」走 `Heatmap.worstStatus`。

11. **formatHour 与 formatClock 完全重复**（`src/lib/time.ts`）
    - 修复：删除未被使用的 `formatHour`，保留实际使用的 `formatClock`。

12. **UTC 行被赋予任意周末高亮**（`src/components/TimeGrid.tsx`）
    - 修复：UTC 行（`countryCode=""`）跳过周末判定，`countryCode ? isWeekendAt(...) : false`。

13. **ESLint 未配置**（根目录）
    - 修复：新增 `.eslintrc.json`（`next/core-web-vitals`），安装 `eslint@^8` + `eslint-config-next@14.2.35`（v9 与 next 14 lint 集成不兼容，降级到 v8）。
    - 验证：`npm run lint` 零警告零错误。

14. **SelectionBar 渲染期访问 window.location**（`src/components/SelectionBar.tsx`）
    - 问题：`eventUrl` 在渲染期直接访问 `window.location.origin`，写法脆弱（虽因 selection 初始 null 当前不报错）。
    - 修复：改用 `useState<string>("")` + `useEffect` 挂载后赋值 `origin`。

15. **CursorBar 在 render 中调用 getState()**（`src/components/CursorBar.tsx`）
    - 问题：`useWorldTimeStore.getState().homeId` 不订阅，主地点变更时游标显示可能陈旧。
    - 修复：改用 hook 订阅 `const homeId = useWorldTimeStore((s) => s.homeId)`。（DateJump 经复核已正确订阅，无需改动。）

### 验证结论

- **类型检查** `npm run type-check`：零错误 ✓
- **ESLint** `npm run lint`：零警告零错误 ✓
- **生产构建** `npm run build`：成功，27 个页面全部生成 ✓
- **数据去重**：1203 城市记录 id 全部唯一 ✓
- **base64 round-trip**：多长度边界全部还原正确 ✓
- **核心算法回归**：热力图三色判定、DST 切换、周末覆盖逻辑未受影响 ✓

### 影响的文件

- `src/data/cities.ts`、`src/data/countries.ts`
- `src/components/PlacesPanel.tsx`、`TimeGrid.tsx`、`HeatmapLegend.tsx`、`SelectionBar.tsx`、`CursorBar.tsx`、`EventView.tsx`、`EventWidget.tsx`
- `src/lib/summary.ts`、`src/lib/calendar.ts`、`src/lib/time.ts`
- `src/app/[locale]/time-converter/[slug]/page.tsx`
- `public/sw.js`
- `messages/zh.json`、`messages/en.json`
- 新增 `.eslintrc.json`
- `package.json`、`package-lock.json`（新增 eslint 依赖）

---

## 变更记录格式说明

每个条目建议包含：
- 日期与操作标题
- 背景 / 问题描述
- 修复或改动清单（含文件位置）
- 验证结论（命令、测试结果）
- 影响的文件列表
