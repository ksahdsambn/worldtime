# 开发进度记录

## 第 10 轮：代码审查报告问题全量修复

> 时间：2026-08-11
> 范围：依据 `code-review-report.md`（3 轮独立审查产出）中的 P1/P2/P3 问题逐条修复，补齐回归测试。
> 依据：`code-review-report.md` 的 16 条发现（汇总表序号 1-16）。

### 背景

项目此前经过 9 轮迭代，产出了一份结构化的独立代码审查报告，共识别 3 条 P1（严重）、8 条 P2（一般）、5 条 P3（轻微/建议）问题。本轮对所有可修复项逐一落地，并为每条核心修复新增回归测试，确保测试能捕获对应的回归。

### 修复清单

#### [P1] 1. 升级 next 修复 CVE（安全）
- `package.json`：`next` `14.2.35` → `^15.5.23`，`eslint-config-next` 同步升至 `^15.5.23`。
- 旧版 14.2.35 含 23+ 高危公告（SSRF、缓存投毒、请求走私、RSC DoS、i18n 中间件绕过、Image Optimizer DoS、CSP nonce XSS 等）。升至 15.5.23 后这些 server 侧漏洞面全部修复（npm audit 中 next 自身告警清零；仅剩 next 内部嵌套的 postcss/sharp 传递依赖告警，需 16.x 强升才能连带解决，属 next 内部依赖，不直接暴露应用代码）。
- **适配 Next 15 breaking change**：App Router 的 `params`/`searchParams` 变为 Promise。改造 5 个页面 + 1 个布局：
  - `src/app/[locale]/layout.tsx`、`page.tsx`、`event/[code]/page.tsx`、`time-converter/[slug]/page.tsx`、`widget/event/page.tsx`、`widget/world-clock/page.tsx`：`params: {...}` → `params: Promise<{...}>`，组件改 `async`，函数体 `await params`。
  - async server component 中不能用 hook：`useTranslations` → `getTranslations`（`page.tsx`、`time-converter/[slug]/page.tsx`）。
- 验证：`npm run build` 生成 135 个静态页面（11 语言全覆盖），与升级前一致。

#### [P1] 2. buildColumns 秋退窗口末尾日截断（Bug/DST）
- `src/lib/grid.ts`：`buildColumns` 重写为「按自然日生成」算法。
- 旧实现以 `days*24` 为循环上界逐小时累加 + ms 去重，秋退日 25 小时会多消耗 1 步进，把末尾日 23:00 推出窗口（7 天网格只显示到第 7 天 22:00）。
- 新实现：逐日 `startOf("day").plus({days:d})` 取该日午夜，在该日内逐小时推进直到跨入次日；用 `toISODate()` 判断跨日避免月份边界歧义。春进日自动 23 列、秋退日自动 25 列、普通日 24 列，每个自然日完整覆盖 00:00~23:00。
- `tests/lib/grid.test.ts`：更新原断言旧错误行为的用例（春进窗口末组 1 列 → 24 列）；新增「秋退窗口最后一列 = 起始日+6 天 23:00」回归测试，并断言 dayIndex 连续覆盖 0..6。

#### [P1] 3. decodeState 接受反向选区（Bug/安全）
- `src/lib/shareUrl.ts`：`decodeState` 的 `s` 分支增加 `a < b` 与差值 ≤ 7 天校验。
- 旧实现只校验 `\d+-\d+` 格式，`s=2000-1000` 会被解码为反向选区，导致下游 `SelectionBar` 显示负时长、`buildIcs`/`googleCalendarUrl` 生成 DTEND 早于 DTSTART 的无效事件。
- `tests/lib/shareUrl.test.ts`：新增反向选区拒绝、正向正常、相等起止拒绝、差值超 7 天上限拒绝 4 个用例。

#### [P2] 4. Service Worker 缓存带 query 的导航响应（安全/隐私）
- `public/sw.js`：navigate 分支缓存键剥离 query string。
- 旧实现以完整请求 URL（含 `?p=&s=&c=`）作为缓存键，分享状态被持久化进 SW 缓存，跨会话留存、共用设备有轻微隐私暴露。新实现：缓存写入与离线回放都按裸路径（`url.search=""`）匹配，带状态 URL 不再被长期缓存。

#### [P2] 5. 深色模式热力图配色失效（a11y/视觉）
- `src/app/globals.css`：`.dark` 下新增热力图三色（`bg-green-200/60`/`bg-orange-200/60`/`bg-red-200/60`）与选区（`bg-blue-300`）的深色变体。
- 旧实现深色背景上仍是浅色低饱和热力底 + 深字，刺眼且与主题割裂。现改为深色半透明底（`rgba(...,0.25)`）+ 高对比文字。

#### [P2] 6. TimeGrid 单击强制选中 1 小时（Bug/UX）
- `src/components/TimeGrid.tsx`：新增 `movedRef` 区分「点击」与「拖拽」。
- 旧实现 onPointerDown 立即设 dragStart=dragEnd=ms，onPointerUp 用 `Math.min/Math.max+3600_000`，哪怕只单击未移动也会选中 1 小时，触屏易误触且无法用指针清除选区。新实现：只有 pointer move 落到不同格子才视为真移动；纯单击则清除已有选区。import 补充 `useRef`。

#### [P2] 7. localStorage 恢复丢失 customName/tags（Bug/持久化）
- `src/lib/useLocalPersist.ts`：`PersistShape` 改存完整 `places: PersistPlace[]`（id + customName + tags）。
- 旧实现仅存 `placeIds: string[]`，刷新后用户重命名与标签全部丢失，与需求第八章"刷新页面后保持不变"冲突。新实现写回时序列化完整用户字段；恢复时与 `CITY_BY_ID` 基础数据合并；向后兼容旧格式（读取到 `placeIds` 仍按旧行为恢复）。

#### [P2] 8. columnColor 全非法时区返回 green（Bug/边界）
- `src/lib/heatmap.ts`：`columnColor` 循环中新增 `anyValid` 标记，全无效时返回 `null`。
- 旧实现所有地点时区非法时 `worst` 保持初值 0 → 返回 green，误导为"全员工作时段"。现返回 null（不渲染热力），与函数防御意图一致。
- `tests/lib/heatmap.test.ts`：新增全非法返回 null、多地点部分非法仍按合法判定 2 个用例。

#### [P2] 9. Widget 硬编码英文未走 i18n（i18n）
- `src/components/WorldClockWidget.tsx`：标题 `World Clock` → `t("worldClock")`、空态 `?cities=...` → `t("worldClockEmpty")`；补 `useTranslations("Widget")`。
- `src/components/EventWidget.tsx`：空态 `?code=...` → `tw("eventEmpty")`；补 `useTranslations("Widget")`。
- 11 个 `messages/*.json` 的 `Widget` 命名空间新增 `worldClock`/`worldClockEmpty`/`eventEmpty` 3 键（92 → 95 键，全部对齐）。

#### [P3] 10. nextDSTChange prevDST 基线不一致（Bug/DST，可读性）— 经审查后保留原实现
- 报告标 P3（可读性隐患），称旧实现「实测正确」。本轮初版尝试把 `prevDST` 基线从 `fromMs` 当日正午改为起始月 1 日正午以「统一基线」，但**自审（对照逐日穷举真值）发现该改动引入回归**：当 `fromMs` 落在切换日所在月之后（如 3 月 12 日，春进已在 3 月 8 日发生），改基线后会错误返回已过去的 3 月 8 日而非未来的 11 月 1 日。
- 结论：旧实现的 `prevDST` 取 `fromMs` 当日正午恰是**正确的**——它代表「当前 DST 状态」，正是探测「下一次未来切换」所需。故**回退至原实现不改**。
- `tests/lib/time.test.ts`：仍新增 `nextDSTChange` 7 个回归用例（NY 1/3/7/10 月、Sydney 1/7 月、北京无 DST），固化原实现的正确行为边界。

#### [P3] 11. DateJump 无地点仍可交互（UX/a11y）
- `src/components/DateJump.tsx`：无地点时 date input `disabled` + `aria-disabled`，加 `disabled:opacity-50 disabled:cursor-not-allowed` 样式。
- 旧实现无地点时 onChange 静默 return，用户选日期无反馈。

#### [P3] 12. CursorBar 无显式禁用游标入口（a11y）
- `src/components/CursorBar.tsx`：游标启用态新增「关闭游标」按钮（`onClick={() => setCursor(null)}`）。
- 11 个 `messages/*.json` 的 `Cursor` 命名空间新增 `disable` 键（95 → 96 键，全部对齐）。
- 旧实现启用游标后只能通过清掉 cursorMs 关闭，UI 无显式入口。

### 未修复项（设计取舍，不属 Bug）

- **[P2] 序号 9 组件/状态层零单元测试**：报告建议引入 happy-dom + @testing-library/react 补组件测试。本轮已为所有纯函数修复补了回归测试（grid/shareUrl/heatmap/time），但组件层测试（TimeGrid 拖拽、useUrlStateSync + useLocalPersist 组合）需引入新依赖与 happy-dom 环境，作为独立任务后续处理。报告序号 9 的"关键路径"中纯函数部分已覆盖。
- **[P2] 序号 11 双 hook 状态同步脆弱**：报告标注"当前功能正确，重构建议"。本轮未做大重构（合并为单一 useStateSync），因风险高且当前实现经测试无数据丢失。
- **[P3] 序号 15 长尾 ISR now 烘焙**：报告标注"已诚实标注，设计取舍"，页面已用 `updatedAt` 注脚说明每小时刷新，不改。
- **[P3] 序号 16 useLocale() as AppLocale 封装**：报告标"低优先级、非错误"，本轮未做。
- **next 内部传递依赖（postcss/sharp）**：需强升 next@16.x（更大 breaking change），本轮选择 15.5.23 已修复 next 自身全部 server 侧 CVE，传递依赖属 next 内部嵌套不直接暴露应用代码。

### 验证

| 检查项 | 结果 |
| --- | --- |
| 单元测试（`npm test`） | ✅ 139/139 通过（原 125 + 新增 14） |
| TypeScript 类型检查（`tsc --noEmit`） | ✅ 通过 |
| ESLint（`next lint`） | ✅ 无警告/错误 |
| 生产构建（`next build`） | ✅ 成功，135 个静态页面（11 语言全覆盖） |
| messages 键结构一致性 | ✅ 11 文件 × 96 键完全对齐 |
| npm audit（next 自身） | ✅ next 高危 CVE 清零（升级 14.2.35 → 15.5.23） |
| DST 回归（秋退末尾日 23:00） | ✅ 新增测试捕获旧 bug |
| nextDSTChange 穷举对照（NY/Sydney/London 366 组） | ✅ 原实现 0 错误（自审纠正了误改） |

### 自审纠正记录

第 10 轮修复完成后，对所有未提交更改做了逐文件审查，纠正了两处：

1. **[关键] 回退 `nextDSTChange` 重构**：初版按报告 P3 建议改了 `prevDST` 基线，自审时用「逐日穷举真值」对照（NY/Sydney/London 全年每 3-5 天采样共 366 组）发现引入回归——当 fromMs 落在切换日所在月之后时会返回已过去的切换日。报告标注"实测正确"是对的，旧实现保留不变，仅新增回归测试固化其正确边界。
2. **[轻微] 清理 `event/[code]/page.tsx`**：移除 `void code;` 冗余写法，`generateMetadata` 只解构需要的 `locale`。

### 提交与发布

- 工作直接在 `main` 分支进行（本仓库主分支即 main，无独立特性分支需合并）。
- 提交内容：12 项修复 + 14 条新增回归测试 + progress.md 记录 + code-review-report.md / code-review-prompt.md（审查输入输出留档）。
- 提交后推送到 `origin/main`（https://github.com/ksahdsambn/worldtime.git）。

---

## 第 9 轮：改用 Docker Compose 部署

> 时间：2026-08-11
> 范围：将部署方式从纯 `docker build`/`docker run` 迁移至 `docker compose`。

### 背景

项目原有完善的多阶段 `Dockerfile`，但无 `docker-compose.yml`，部署需手动执行多条 `docker` 命令。改为 compose 后可一条命令完成构建与启动，并内置健康检查与重启策略。

### 改动清单

#### 1. 新建 `docker-compose.yml`
- 单服务 `app`，基于现有 `Dockerfile` 构建（`build: .`），不重复构建逻辑。
- 端口映射 `${PORT:-3000}:3000`，宿主端口可通过环境变量自定义。
- 环境变量 `NODE_ENV=production`、`NEXT_TELEMETRY_DISABLED=1`。
- `restart: unless-stopped`（异常退出自动重启）。
- `healthcheck` 用 `wget --spider` 探测 `/zh` 路由（Alpine 自带 wget，无需装 curl）。
- 应用无状态，不挂载 volumes。

#### 2. 更新 `.dockerignore`
- 补充排除 `output/`（Playwright 截图）与 `docker-compose.yml` 自身，减小构建上下文。

### 使用方式

```bash
docker compose up -d --build   # 构建并后台启动
docker compose logs -f         # 查看日志
docker compose down            # 停止
PORT=8080 docker compose up -d # 自定义宿主端口
```

### 未改动
- `Dockerfile`：现有三阶段构建已完善，无需改动。
- `next.config.mjs`：`output: "standalone"` 已正确配置。

---

## 第 8 轮：国际化扩展（支持 11 种语言）

> 时间：2026-08-11
> 范围：将 UI 显示语言从 2 种（中文/英文）扩展至 11 种，并重构所有硬编码的二元语言判断，使后续加语言零代码改动。

### 背景

项目原仅支持 `zh`（简体中文，默认）与 `en`（英文）两种语言，但代码中存在大量硬编码的 `"zh" | "en"` 二元判断（时长格式、热力图标签、会议摘要、城市名选择等），无法直接扩展。

### 新增语言

| 语言 | locale | 原生名 |
| --- | --- | --- |
| 简体中文（默认） | `zh` | 中文 |
| 繁體中文 | `zh-Hant` | 繁體中文 |
| 英文 | `en` | English |
| 西班牙语 | `es` | Español |
| 法语 | `fr` | Français |
| 德语 | `de` | Deutsch |
| 日语 | `ja` | 日本語 |
| 韩语 | `ko` | 한국어 |
| 葡萄牙语 | `pt` | Português |
| 俄语 | `ru` | Русский |
| 越南语 | `vi` | Tiếng Việt |

### 改动清单

#### 1. 语言注册与切换器
- `src/i18n/routing.ts`：`locales` 从 2 个扩展至 11 个；新增 `LOCALE_NAMES`（各语言原生名映射，供切换器显示）；新增 `isChineseLocale()`（用 `startsWith("zh")` 识别简体/繁体及未来 zh-TW/HK 变体）。
- `src/components/LocaleSwitcher.tsx`：语言名改用 `LOCALE_NAMES` 统一显示，不再从每个 messages 文件逐语言维护。

#### 2. 消除硬编码二元判断（核心重构）
将三个 lib 函数从"接收 locale 字符串做 `locale === "zh" ? ... : ...` 判断"重构为"接收翻译值对象"，彻底与 locale 解耦：
- `src/lib/duration.ts`：`formatDuration(ms, locale)` → `formatDuration(ms, DurationWords)`；新增 `defaultSep(locale)` 派生分隔符。
- `src/lib/summary.ts`：`summaryText(..., locale, ...)` → `summaryText(..., SummaryLabels, ...)`；新增 `Summary` messages 命名空间。
- `src/lib/heatmap.ts`：`heatLabel(color, locale)` → `heatLabel(color, Record<HeatColor, string>)`。

#### 3. 城市名国际化
- 新增 `src/lib/cityName.ts`：`localCityName(locale, city)` —— 中文页（简/繁）显示中文名，其余语言回退英文名。
- 改造 4 个组件（`PlacesPanel`、`TimeGrid`、`EventView`、`EventWidget`）统一调用此 helper，消除原有 `isZh ? p.nameZh : p.nameEn` 与直接 `p.nameZh` 硬编码。

#### 4. 页面层类型安全
- `event/[code]/page.tsx`、`widget/event/page.tsx`：`params.locale`（string）→ `AppLocale` 转换增加 `routing.locales.includes()` 运行时校验 + 回退 `defaultLocale`。
- `time-converter/[slug]/page.tsx`：`generateStaticParams` 从硬编码 zh/en 改为遍历 `routing.locales`，新增语言自动覆盖预渲染（18 → 90 条路径）。

#### 5. 翻译文件
- 新增 9 个完整翻译文件（`de`/`es`/`fr`/`ja`/`ko`/`pt`/`ru`/`vi`/`zh-Hant`），各 92 键，结构与 `en.json` 完全对齐。
- 在全部 11 个 messages 文件中统一补充 `Summary` 命名空间（`title` / `homeSuffix`）。

#### 6. 测试同步
- `tests/lib/{duration,heatmap,summary}.test.ts`：适配新函数签名，新增西语单复数用例验证解耦正确性。

#### 7. 其他
- `.gitignore`：补充 `output/`（Playwright 截图等本地调试产物）。

### 验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript 类型检查（`tsc --noEmit`） | ✅ 通过 |
| 单元测试（`vitest`） | ✅ 125/125 通过 |
| ESLint（`next lint`） | ✅ 无警告 |
| 生产构建（`next build`） | ✅ 成功，135 个静态页面（11 语言全覆盖） |
| messages 键结构一致性 | ✅ 11 文件 × 92 键完全对齐 |
| ICU 占位符完整性 | ✅ `{time}`/`{a}`/`{b}`/`{dir}` 全部保留 |
| 硬编码残留 | ✅ src/ 下零处 `locale === "zh"` / `isZh` / `"zh"\|"en"` |
| 浏览器视觉验证 | ✅ 11 语言逐页截图 + 文本快照核验 + 文字溢出扫描（0 溢出） |

### 设计说明

- **locale 代码选用 `zh-Hant`**（BCP 47 脚本子标签）而非 `zh-TW`，不限定地区，同时覆盖台湾/香港/澳门及海外繁体使用者。
- **城市名回退策略**：城市数据仅内置中/英文名。中文页显示中文名；其余语言显示英文名（罗马音/拉丁名，国际通行做法）。未来如需日韩等本地化城市名，可在 `localCityName` 扩展查表逻辑，无需改动调用方。
- **阿拉伯语（ar）未加入**：需 RTL 布局支持，工作量较大，作为独立任务后续处理。

### 未提交但已知的遗留

- `heatLabel` 函数在生产代码中无调用（图例组件直接用 `useTranslations`），仅被测试引用。作为合理的公共工具函数保留，未删除。
