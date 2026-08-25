# 旧审查报告复核清单（fixed / unfixed）

- 复核日期：2026-08-25
- 基准 commit：`8f1bef953fe33e2b0ee545ee9bc73f309d5b5e5c`
- 被复核报告：code-review-report.md（2026-08-11，16 条）· review-fix-report.md（2026-08-22，15 条 + 未修项 4 行）
- 统计：✅ 22 · ❌ 3 · ⚠️ 3 · 🔁 0 · 🗑 3 · ❓ 0 · 🧊 4（合计 35）
- 第 0 步核对：两份报告实际条目数与标题同任务对照表完全一致（C 系列 16 条 = 报告「五、汇总」表 16 行；R 系列 15 条 = `### R\d-\d` 标题；W 系列 4 行 = 「未修项及原因」表），无差异。
- 实跑取证：`npm audit --omit=dev`（3 high）；`npx vitest run`（16 文件 224/224 全绿）。

## 一、code-review-report.md（C 系列，16 条）

| ID | P | 摘要 | 判定 | 证据（现行 file:line） | 备注 |
|----|---|------|------|------------------------|------|
| C-01 | P1 | next@14.2.35 多个高危 CVE（连带 postcss） | ⚠️ PARTIAL | package.json:24 `"next": "^15.5.23"`；`npm audit --omit=dev` 实跑 = 3 high | next 已升级 15.5.23，next 本体无直接公告；残留 3 high 全为其传递依赖：postcss 路径穿越（GHSA-r28c-9q8g-f849，`node_modules/next/node_modules/postcss`）+ sharp<0.35.0（libvips CVE-2026-33327 等）。修复需 next@16 / sharp@0.35 破坏性升级（与 W-1 决策一致）。报告「audit 无 high」的验收线未达 |
| C-02 | P2 | 组件/状态层零单元测试 | ❌ UNFIXED | vitest.config.mts:23-27 `environment: "node"`、`include: ["tests/**/*.test.ts"]`；tests/ 全目录 16 文件均为 lib/data 纯函数测试 | 注释明言组件测试属「将来引入」（需 happy-dom + testing-library）。store / useUrlState / useLocalPersist / 组件仍零测试；纯函数层已加 dstRegressions 等回归（见 C-05/C-06），但建议的组件/状态层覆盖未做 |
| C-03 | P2 | widget 组件硬编码英文未走 i18n | 🗑 OBSOLETE | `git log --diff-filter=D`：WorldClockWidget/EventWidget 删于 `c92b197`（widget/event、widget/world-clock 路由同批删除）；全仓 grep 零命中 | messages 11 语言的 `Widget` 命名空间也已随组件清除（zh/en 实测 `Widget` 键不存在），无死键残留。功能整体移除，i18n 问题不成立 |
| C-04 | P3 | `as` 类型断言较多，可收紧 | ❌ UNFIXED | 全仓 grep `as AppLocale` = 17 处（TimeGrid.tsx:31、SelectionBar.tsx:27、CitySearch.tsx:93 等）；`useAppLocale` hook 零命中 | 报告自评「数量多，非错误」「低优先级」。现状未变，维持低优先级记录 |
| C-05 | P1 | buildColumns 秋退窗口截断末尾日 23:00 | ✅ FIXED | src/lib/grid.ts:53-68 逐自然日生成（`for (let d = 0; d < days; d++)` + 日内逐小时直至跨日）；注释 :30 明言「修复 DST 末尾日截断问题」 | 实跑（vitest 224/224 含）：tests/lib/grid.test.ts:90「秋退日组为 25 列，末尾日 23:00 未被截断」、:108「最后一列本地时刻 = 起始日+6 天的 23:00」；dstRegressions.test.ts:52-64（春进 167/秋退 169/epoch 全唯一）。按建议的「按自然日生成」方案实现 |
| C-06 | P1 | decodeState 接受反向选区 | ✅ FIXED | src/lib/shareUrl.ts:92-97 `if (a < b && b - a <= SELECTION_MAX_MS)`（7 天上限一并实现） | 实跑：dstRegressions.test.ts:95-96 `decodeState("s=200-100").selection` 为 null、超 7 天极值亦 null。与建议逐字对应 |
| C-07 | P2 | 深色模式热力图三色/选区未适配 | ✅ FIXED | globals.css:53-63 浅色热力令牌（`--heat-good/bad/caution`、`--cell-selected-*`）；:175-183 `.dark` 重定义（`--heat-bad: rgba(239,68,68,0.16)`、`--cell-selected-bg: rgba(59,130,246,0.3)` 等）；:975-996 单元格经 `data-heat`/`data-selected`/`data-weekend` 消费令牌 | 用「语义令牌主题系统」等效实现（AGENTS.md 既定方向），非报告建议的 `.dark` 类覆盖写法；周末底纹 `var(--surface-inset)`（:976）同为主题感知。注释标注 faint/深色对比度校准值。代码层已证，运行时视觉对比度未实测（见第四节） |
| C-08 | P2 | 单击强制选中 1 小时，指针无法清除选区 | ✅ FIXED | src/components/TimeGrid.tsx:80-83 `movedRef` 记录「是否真移动到别的格子」；:202-215 纯单击走 `setPinned(cur === clicked ? null : clicked)`（固定/取消查看时刻），未移动不产生选区 | 与建议等价且更优：单击 = 固定查看时刻、再点同格取消（替代建议的「清除选区」）；:156 仅 `ms !== dragEndMsRef.current` 才记为移动，微抖动不误判 |
| C-09 | P2 | localStorage 恢复丢失 customName/tags | ⚠️ PARTIAL | useLocalPersist.ts:34-42 `PersistPlace { id; customName?; tags? }`；:100-127 恢复时与 CITY_BY_ID 合并；:171-177 写回完整保存用户字段；store 有 renamePlace（useWorldTimeStore.ts:125,230-238） | localStorage 已完整保留（报告的最低要求达成，含旧 placeIds 格式兼容读取）。**残留**：URL 仍只编码 id——shareUrl.ts:32-37 仅 `pl.id`、:77 解码 `{ ...city, tags: [] }`；接收分享链接方刷新即丢 customName/tags。报告明示 URL 编码为可选项，故判部分修复 |
| C-10 | P2 | columnColor 全部时区非法时返回 green | ✅ FIXED | src/lib/heatmap.ts:79 `let worst = -1`、:86 `if (worst < 0) return null`（注释：「所有时区均非法时返回 null…而非误判为 green」） | 实跑：tests/lib/heatmap.test.ts:80「所有地点时区非法时返回 null（而非 green）」通过。注：columnColor 已不被 TimeGrid 消费（单元格级 placeHeatColor 取代），但仍导出且有测试，修复有效 |
| C-11 | P3 | nextDSTChange 的 prevDST 与循环 dt 基线不一致 | ❌ UNFIXED | src/lib/time.ts:42 `let dt = start.startOf("month")` vs :44 `const prevDST = start.startOf("day").plus({ hours: 12 }).isInDST` | 结构与报告描述完全一致：prevDST 取 fromMs 当日正午、循环 dt 取月初，基线仍不统一。建议的「统一基线或注释声明意图」均未做（:43 注释只讲正午探测，非基线意图）。dstRegressions.test.ts 补了多点用例但未动此基线。报告自评「实测正确、可读性隐患」，低优先级 |
| C-12 | P2 | SW 以带 query 的完整 URL 缓存导航 | ✅ FIXED | public/sw.js:119-123 `u.search = ""` 构造 bareUrl；:134 `c.put(bareUrl, copy)`；:141 离线回放 `caches.match(bareUrl)`；:116-118 注释明言「隐私修复（审查报告 P2）」 | 与建议首选方案（剥离 query 作缓存键 + 裸路径回放）逐字对应 |
| C-13 | P2 | useLocalPersist 写回闭包依赖 + 双 hook 耦合脆弱 | ⚠️ PARTIAL | useLocalPersist.ts:86-91 自带 URL 参数门控（`hasUrlPlaces` 等）；useUrlState.ts:30-31 仍独立 `hydrated`/`ready` 守卫；:167-193 写回 effect 仍闭包依赖 + `getState()`；UrlStateSync.tsx:13-16 仍是双 hook | 改进：URL 优先不再依赖 hook 注册顺序（useLocalPersist 直接检测 URL 参数，两种注册顺序结果一致），最脆弱的顺序耦合已消除。**残留**：双 hook 双 ref 结构未合并；首帧 effect 序（ULP-restore→ULP-写回→UUS-restore）下写回仍可能先写入「URL 恢复前的快照」，瞬态窗口与报告描述一致（正常路径下一帧自愈）。另 UrlStateSync.tsx:11 注释把 URL 优先归因于 useUrlStateSync，与实际门控位置（useLocalPersist）有轻微漂移 |
| C-14 | P3 | DateJump 无地点时输入框仍渲染但静默丢弃 | 🗑 OBSOLETE | DateJump.tsx 删于 `bf59303`（git log --diff-filter=D）；日期跳转迁移为 TimeGrid 表头 picker（TimeGrid.tsx:92-110、:326-334 隐藏 date input）；:238-261 无 home 时整个网格早退渲染骨架/FirstUseEmptyState | 迁移后的实现中 date input 仅在 home 存在时渲染，报告描述的「可交互但无反馈」状态无法出现；TimeGrid.tsx:105 的 `if (!home) return` 为防御性死代码。`"DateJump"` 翻译命名空间为**活引用**（:297、:331 `tDate("jumpTo")` 用于表头按钮与输入框 aria-label，11 语言齐全），非死键 |
| C-15 | P3 | CursorBar 方向键拦截滚动、无显式关闭入口 | 🗑 OBSOLETE | CursorBar.tsx 删于 `bf59303`；游标模型整体被 pinnedMs「查看时刻」取代；TimeControlBar.tsx:148-157 固定态提供显式关闭（× 按钮 `setPinned(null)`，aria-label=backToNow）；全仓无 ArrowLeft/Right 监听（仅 CitySearch.tsx:155-158 下拉列表 ArrowUp/Down，属输入框内标准 combobox 行为） | 报告建议的「提供禁用游标入口」由固定态 × 按钮等效满足；方向键拦截问题随功能移除不复存在 |
| C-16 | P3 | generateStaticParams 仅枚举热门对 + Date.now() 烘焙 | ✅ FIXED | seo.ts:158-194 POPULAR_CITY_PAIRS 35 对（报告时 5 对）、:196-208 POPULAR_TZ_PAIRS 11 对（报告时 4 对）；time-converter/[slug]/page.tsx:62-72 枚举全部热门对；:76 `revalidate = 300`（报告时 3600） | 报告给出的可行动建议（扩大热门集合）已落实：预渲染 slug 9→46（×11 locale = 506 页）；`Date.now()` 烘焙仍在（page.tsx:112）但为报告与 R2 决策均认可的 ISR 取舍（客户端每分钟刷新双时间源）。报告本身结论即「符合设计意图，仅作记录」 |

## 二、review-fix-report.md（R 系列 15 条 + W 系列 4 行）

### R 系列

| ID | P | 摘要 | 判定 | 证据（现行 file:line） | 备注 |
|----|---|------|------|------------------------|------|
| R1-1 | P1 | 域名不统一（worldtime.app 三处） | ✅ FIXED | 全仓 grep `worldtime.app`：src/ scripts/ public/ 零命中（仅历史 md 文档）；seo.ts:16 `SITE_URL_FALLBACK = "https://time.eqde.de"` 与 .env.example 同值；scripts/gen-icons.mjs:53-68 `siteHost()` 按 env→.env.local→.env.example 读取 | ogArtwork.tsx 已随 R1-5 删除。三处来源全部收敛 |
| R1-2 | P1 | 子页面丢失 alternates.types | ✅ FIXED | seo.ts:109-122 `buildAlternates()` 返回内置 `types: { "text/plain": getSiteUrl()+"/llms.txt" }`；注释 :116-117 解释合并覆盖问题 | 实跑：tests/lib/seo.test.ts:91「携带 llms.txt 的 types 链接（子页覆盖 alternates 时不丢失）」通过。代码层已证；渲染后的 head 未起服务验证（见第四节） |
| R1-3 | P2 | canonicalLandingSlug 大小写归一缺陷 | ✅ FIXED | seo.ts:242-251：先 `parseSlug(slug)` 归一（:243），再热门表正反向（:248-249），否则字典序（:250）；:244 不可解析原样返回 | 实跑：seo.test.ts:277-296 六用例（热门保持/反向收束/字典序/未注册原样/大小写归一/不可解析）全部通过 |
| R1-4 | P2 | robots.ts AI 爬虫清单不全 | ✅ FIXED | src/app/robots.ts:19-33：13 个 UA，含声称补全的 `OAI-Searchbot`（:22）、`Perplexity-User`（:27）、`DuckAssistBot`（:28）、`Bytespider`（:32） | 代码层已证；/robots.txt 运行时输出未起服务验证（见第四节） |
| R1-5 | P2 | 动态 OG 图路由死代码 | ✅ FIXED | `ls`：opengraph-image.tsx / twitter-image.tsx / ogArtwork.tsx 三文件均不存在；`git log --diff-filter=D`：三文件删于 `2674a3c`（R1 提交） | 删除类修复，证据齐全 |
| R1-6 | P2 | 复制摘要城市名恒英文 | ✅ FIXED | src/lib/summary.ts:28 `locale: AppLocale = "en"` 参数、:47 `localCityName(locale, p)`；SelectionBar.tsx:27 取 locale、:59 传入 | 实跑：tests/lib/summary.test.ts:23「城市名随 locale 本地化（中文界面输出中文名，默认英文）」通过 |
| R1-7 | P3 | 死导出 weekendDaysOf | ✅ FIXED | 全仓（含 tests）grep `weekendDaysOf` 零命中；heatmap.ts 现存导出中无此符号 | 删除类修复 |
| R1-8 | P3 | 文档与代码不符（四处） | ✅ FIXED | AGENTS.md：grep google/calendar/oauth 零命中，定位段为现行「URL 分享 + SEO/GEO 页面体系 + PWA」；README.md：完整重写（栈/开发/验证/目录，Next.js 15）；code-review-prompt.md:3-7 顶部「⚠️ 历史文档」声明（列已删模块 + Next 15）；markdown/REQUIREMENTS.md:8-12 存档注记（2026-08-22） | 四处声称的修正逐一对上 |
| R2-1 | P1 | CN/HK/TW 2027 端午误写 05-09 | ✅ FIXED | holidays.ts:30（CN）、:44（HK）、:59（TW）均含 `"2027-06-09"`；全文件 `2027-05-09` 仅剩 :425（RU 块，含 02-23/03-08/05-09/06-12/11-04 典型俄历假日） | 实跑：tests/data/holidays.test.ts:56-59（三国含 06-09 且不含 05-09）、:62-63（RU 含 05-09）通过 |
| R2-2 | P1 | 周末规则三国过时 | ✅ FIXED | countries.ts:71 `AE…weekendDays: [6, 7]`、:55 `BD…[5, 6]`、:67 `AF…[5]` | 实跑：tests/data/countries.test.ts:24「阿联酋 2022 起为周六周日休（[6,7]）」、:28 孟加拉、:32 阿富汗均通过 |
| R2-3 | P3 | useLocalPersist 空参数正则与 decodeState 语义不一致 | ✅ FIXED | useLocalPersist.ts:89-91 `/[?&]p=[^&]/`、`/[?&]s=\d/`、`/[?&][ct]=\d/`（均要求非空值）；:87-88 注释说明与 decodeState 对齐 | 与声称的修复一致；顺带覆盖 t=/c= 两参数。边界残留见第五节新发现 #1（非空但无效的 p= 值） |
| R2-4 | P3 | CitySearch 结果行不随 locale 排序 | ✅ FIXED | CitySearch.tsx:235-238：主名 `localCityName(locale, c)`、次名 `zhFirst ? c.nameEn : c.nameZh`、国家 `cityCountryName(locale, c)` | 与声称修复逐字对应 |
| R2-5 | P3 | 对话框打开时 Escape 连带清除选区 | ✅ FIXED | KeyboardShortcuts.tsx:38 `if (document.querySelector('[role="dialog"], [role="menu"], [role="group"]')) return;` | 守卫在位且比声称的更宽（兼护菜单/浮层）；:9-13 注释已改为如实描述 confirm/Dialog 双路径 |
| R3-1 | P1 | 未知动态路由返回 200 软 404 | ✅ FIXED | `find`：loading.tsx 仅存于 `src/app/[locale]/(home)/loading.tsx`；time/[cityId]/page.tsx:61-63、country/[code]/page.tsx:54-55、time-converter/[slug]/page.tsx:89-90 三处 generateMetadata 对未知输入 `notFound()`（注释均说明「尽早抛出保证 404 状态」） | 代码层已证（路由组位置 + 三处硬 404 与声称方案一致）；HTTP 状态码需起服务验证（见第四节） |
| R3-2 | P1 | next-intl 中间件注入矛盾 hreflang Link 头 | ✅ FIXED | src/i18n/routing.ts:11 `alternateLinks: false`；:8-11 注释说明与 head hreflang 的三重矛盾 | 代码层已证；响应头 Link: 需起服务验证（见第四节） |

### W 系列（未修项轻量确认）

| ID | 条目 | 判定 | 证据（现行 file:line） | 备注 |
|----|------|------|------------------------|------|
| W-1 | npm audit postcss/sharp 高危 | 🧊 WON'T-FIX | `npm audit --omit=dev` 实跑：3 high（postcss GHSA-r28c-9q8g-f849 / sharp libvips ×4 CVE），提示 `npm audit fix --force` 装 next@16.3.2、sharp@0.35.3 均破坏性 | 现状仍如决策所述：高危在、修复仍需破坏性升级、跳过理由成立。一处口径修正：报告称两者为「devDependencies」，实际 package.json:37,40 的直接声明虽在 devDependencies，但 audit `--omit=dev` 仍报出——因 next（生产依赖）传递依赖它们；「仅构建期不进运行镜像」的判断是否仍准确建议部署时复核 |
| W-2 | SEO_KEYWORDS 本地化 / FAQPage JSON-LD / 面包屑层级 / llms.txt 多语言 | 🧊 WON'T-FIX | seo.ts:41-51 SEO_KEYWORDS 仍单一英文数组（11 语言共用）；faqPageJsonLd 输出于 faq/time/[cityId]/time-converter 三类页面（grep 3 文件）；time-converter/[slug]/page.tsx:167-170 面包屑仍 2 项（首页+对照对）；llms.txt/route.ts 正文纯英文、链接全部 /en | 四个子项现状均如决策表所述，无变化 |
| W-3 | IR/Jordan/NP 周末规则不修 | 🧊 WON'T-FIX | countries.ts:57 `NP…[6, 7]`、:77 `IR…[5, 6]`、:80 `JO…[5, 6]` | 三国维持原值，决策未变 |
| W-4 | 城市数据仅中英双名 | 🧊 WON'T-FIX | cities.ts:8 `type CityTuple = [nameZh, nameEn, countryCode, timeZone]` | 仍仅双名字段，产品决策维持 |

## 三、遗留问题清单（所有 ❌ / 🔁 / ⚠️ 逐条展开，可直接当修复任务用）

### C-01 依赖高危 CVE 残留（next 传递的 postcss / sharp）
- 判定：⚠️ PARTIAL
- 现状：package.json:24 `"next": "^15.5.23"`（已从报告时的 14.2.35 升级，next 本体直接公告清零）；`npm audit --omit=dev` 实跑仍报 **3 high**——`node_modules/next/node_modules/postcss` 路径穿越（GHSA-r28c-9q8g-f849）、`sharp <0.35.0` 继承 libvips CVE（CVE-2026-33327/33328/35590/35591）、next 因传递依赖被连带点名。
- 差距 / 残留风险：报告验收线「升级后 npm audit 无 high/critical」未达成。残留项与 W-1 决策重叠（修需 next@16 / sharp@0.35 破坏性升级）。注意 sharp 在 Node server 模式下可能被 next/image 优化器运行时调用，并非纯构建期——若部署使用图片优化，暴露面比决策描述更大。
- 建议修复方向：跟进 next 16 / sharp 0.35 的破坏性升级窗口（App Router + next-intl 4.x 需回归）；或部署层面关闭 next/image 服务端优化、standalone 镜像剥离 sharp 后复查 audit。

### C-02 组件/状态层零单元测试
- 判定：❌ UNFIXED
- 现状：vitest.config.mts:23-27 仍 `environment: "node"`、`include: ["tests/**/*.test.ts"]`，注释明言组件测试属「将来引入」（需先装 happy-dom 与 @testing-library/react）；tests/ 现存 16 个文件全部是 `tests/lib/*` 与 `tests/data/*` 纯函数测试。
- 差距 / 残留风险：三态同步（URL ↔ store ↔ localStorage）、TimeGrid 拖拽/单击、SelectionBar、PlacesPanel 等交互逻辑仍无自动化回归网；本次复核即发现一个纯函数测试抓不到的三态同步边界（见第五节 #1）。
- 建议修复方向：按原报告优先级补——useLocalPersist × useUrlStateSync 组合（URL 优先 / 无效 p= 降级）、TimeGrid pointer 流程（movedRef 分支）、C-09 的 customName 持久化往返。

### C-04 `as AppLocale` 类型断言散落
- 判定：❌ UNFIXED
- 现状：全仓 17 处（TimeGrid.tsx:31、SelectionBar.tsx:27、CitySearch.tsx:93、TimeCards.tsx:82、FirstUseEmptyState.tsx:22、LocaleSwitcher.tsx:9,23 及 5 个页面文件等）；无 `useAppLocale` 封装（grep 零命中）。
- 差距 / 残留风险：报告自评「非错误、低优先级」；现状与报告时点几乎一致（组件甚至略增）。
- 建议修复方向：封装 `useAppLocale()`（服务端侧可用共享 assert 函数），一次性替换 17 处。

### C-09 URL 分享不携带 customName/tags
- 判定：⚠️ PARTIAL
- 现状：localStorage 侧已完整修复（useLocalPersist.ts:34-42 PersistPlace 含 customName/tags；:100-127 恢复合并；:171-177 写回完整保存；renamePlace 入口在 useWorldTimeStore.ts:230-238）。URL 侧未动：shareUrl.ts:32-37 编码仅 `pl.id`，:77 解码 `{ ...city, tags: [] }`。
- 差距 / 残留风险：报告原文「URL 分享链接同样不编码这两个字段」仍成立——接收方打开分享链接后，本地重建的 places 无 customName/tags；若接收方再刷新，重命名/标签对 Host 与 Receiver 都回到城市原名（Host 的 localStorage 有保留，Receiver 无）。
- 建议修复方向：扩展 `p=` 段格式（如 `id~customName` 语法或新增平行参数），兼容旧格式解码；encodeState 写出、decodeState 合并。

### C-11 nextDSTChange prevDST 基线不一致
- 判定：❌ UNFIXED
- 现状：time.ts:42 `let dt = start.startOf("month")` 与 :44 `const prevDST = start.startOf("day").plus({ hours: 12 }).isInDST`——prevDST 仍取 fromMs 当日正午，循环 dt 仍取月初，两者基线不同，与报告描述逐点一致；周边仅有正午探测注释（:43），无「有意用 fromMs 当日做初值」的意图声明。
- 差距 / 残留风险：报告判定为可读性/健壮性隐患（实测多点正确）；dstRegressions.test.ts:13-39 补了 NY/Sydney/Lord Howe/开罗用例但未触碰该基线。未来改探测步长（如按周）时仍是易错点。
- 建议修复方向：二选一——`prevDST` 改为 `dt.plus({ hours: 12 }).isInDST`（与循环同基线），或加注释显式声明「有意以 fromMs 当日为初值」并补南半球/切换日当天用例。

### C-13 状态同步双 hook 结构未合并（顺序耦合已消除）
- 判定：⚠️ PARTIAL
- 现状：UrlStateSync.tsx:13-16 仍是 `useLocalPersist(); useUrlStateSync();` 双 hook；useUrlState.ts:29-31 仍 hydrated + ready 双守卫；useLocalPersist.ts:167-193 写回 effect 仍闭包依赖 + `getState()` 混用。**改进**：useLocalPersist.ts:86-91 现自带 `hasUrlPlaces/hasUrlSelection/hasUrlPinned` URL 门控——URL 优先不再依赖注册顺序，报告点名的「双 hook 顺序耦合」最脆弱一环已消除。
- 差距 / 残留风险：建议的「合并单一 useStateSync」未做；首帧 effect 顺序（ULP 恢复 → ULP 写回 → UUS 恢复）下，写回 effect 会先落盘一份「URL 恢复前」的快照，下一帧自愈——瞬态窗口与报告描述一致（崩溃窗口内可致旧值覆盖）。另 UrlStateSync.tsx:11 注释「useUrlStateSync 内部确保 URL 优先」与实际门控位置（useLocalPersist）不符，属轻微文档漂移。
- 建议修复方向：合并为单一 hook，统一「恢复（URL > localStorage > 默认）→ 就绪 → 写回」状态机；或至少把写回 effect 的就绪判定改为共享的 store 级 `restored` 标志（现已有 `markRestored`），消除瞬态写。

## 四、❓ 待运行时验证清单

本报告无判为 ❓ 的复核单元；下表为 **✅ 条目中「代码层已证、运行时未证」的面**，供后续部署验证：

| ID | 静态卡在哪 | 需要什么才能验证 | 建议验证方式 |
|----|-----------|------------------|--------------|
| R3-1 | loading.tsx 位置与 generateMetadata notFound() 已确认，但 HTTP 状态码由流式渲染时机决定 | `next build && next start` 后实测状态码 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en/time/xx-nowhere`（及 gibberish-pair、/country/zz）应 404；首页应 200 |
| R3-2 | `alternateLinks: false` 已确认，但中间件是否仍注入 Link 头需看运行时响应 | 起服务后检查响应头 | `curl -sI http://localhost:3000/zh | grep -ci hreflang` 应为 0 |
| R1-2 | buildAlternates 内置 types + 单测已确认；子页渲染出的 `<link rel="alternate" type="text/plain">` 未验 | 起服务或构建产物 | 抽样 `/en/time/jp-tokyo`、`/de/country/jp` 的 HTML head |
| C-07 | 令牌化深色热力/选区配色已确认；WCAG 对比度与三色可分性未实测 | 真实浏览器深色模式 | DevTools Contrast 抽查 `--heat-*-ink` 组合 ≥ 4.5:1；色弱模拟下三色 + 图案冗余可辨 |
| R1-4 | robots.ts UA 清单已确认；`/robots.txt` 实际输出未验 | 起服务 | `curl -s http://localhost:3000/robots.txt` 应含 13 个爬虫名 |
| C-12 | bareUrl 缓存键代码已确认；SW 实际缓存行为未验 | 浏览器 + DevTools Application 面板 | 带 `?p=` 访问后断网重开裸路径 `/zh`，缓存条目应不含 query |

## 五、新发现

1. **`?p=<非空但无效 id>` 的链接会永久清空用户已保存的地点（localStorage 抹库）**。静态推演（建议运行时复现确认）：useLocalPersist.ts:89 的 `hasUrlPlaces = /[?&]p=[^&]/` 把 `?p=unknown-city` 判为「URL 带地点」→ 跳过本地恢复；decodeState 过滤无效 id 后 `places=[]`，useUrlState.ts:44 的 `ps.length > 0` 不成立 → 不写入 store；store 保持默认空列表，而写回 effect（useLocalPersist.ts:167-193）在首帧即把 `places: []` 持久化进 localStorage，随后 URL 参数又被回写 effect 清成裸路径（useUrlState.ts:61-66）。结果：旧 localStorage 数据被空列表覆盖且不可恢复。R2-3 只覆盖了「空值 `?p=`」；「非空但全无效」同样应按未携带处理（或 decodeState 保留至少一个有效地点才视为携带）。不属于两份报告任何一条。
2. （轻微）UrlStateSync.tsx:11 注释与实现漂移——「useUrlStateSync 内部确保 URL 优先于本地存储」，实际优先级门控位于 useLocalPersist 的 hasUrl* 检查。已并入 C-13 备注，列此备查。

## 六、纪律声明

全程只读：未修改任何既有文件，未执行任何写操作；唯一新建文件为本报告。执行过的命令：`npm audit --omit=dev`（联网获取漏洞公告，属白名单）、`npx vitest run`（224/224 通过）、`git rev-parse / git log --diff-filter=D --name-status`、`grep / ls / find / sed -n / node -e`（读取 messages JSON 与数据核对，纯读）。未起 dev server，未联网核实事实性数据（周末规则等以仓库现状为准）。
