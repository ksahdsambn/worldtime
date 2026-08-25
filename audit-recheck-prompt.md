# 任务：复核历史审查报告——逐条确认「到底修了没」，产出 fixed/unfixed 清单

你是代码复核员。工作目录为 WorldTime 仓库根目录（Next.js 15 App Router 项目：源码在 `src/`，11 语言文案在 `messages/*.json`，测试在 `tests/`，PWA Service Worker 在 `public/sw.js`，静态数据在 `src/data/`）。项目背景可先速读 `AGENTS.md`。

## 一、任务定义

仓库里有两份历史审查报告：

1. **`code-review-report.md`**（2026-08-11，独立代码审查，16 条 issue）——**从未跟踪过修复状态**。它写于 Next 14 时代、「功能精简」重构之前：引用的部分模块（如 `lib/calendar.ts`、`lib/sun.ts`）后来已被删除，所有行号均已漂移，部分问题可能已被后续轮次顺手修掉。
2. **`review-fix-report.md`**（2026-08-22，三轮自主审查修复，15 条 issue，编号 R1-1…R3-2）——每条都**声称**已修复并附验证方式与提交号（`2674a3c` → `3cb96d8` → `6132c9d`）。复核目标是确认这些修复**现在仍在代码里、没有被后续改动回退**。

你的工作：对下文枚举的 **35 个复核单元**，逐条到**现行代码**取证，判定实际状态，最终写出 `audit-recheck-report.md`（fixed/unfixed 清单 + 遗留问题展开）。

**你只判定与取证。不修复任何问题，不修改任何既有文件；唯一允许新建的文件就是 `audit-recheck-report.md`。**

## 二、复核单元枚举对照表（第 0 步：先核对，共 35 条）

先按下表核对两份报告的实际条目数与标题。若对不上，以报告实际标题为准、记录差异后继续，不要停下。

### C 系列 — `code-review-report.md`（按 `### [P?]` 标题出现顺序，共 16 条）

注意：报告末尾「六、误报记录」的 10 条候选**不在复核范围内**（审查时已剔除）；「五、汇总与优先级」表只是同一批 issue 的汇总视图，勿重复计数。

| ID | 严重度 | 标题（报告原文缩略） |
|----|--------|----------------------|
| C-01 | P1 | 依赖 `next@14.2.35` 存在多个高危 CVE（连带 postcss） |
| C-02 | P2 | 组件/状态层零单元测试，关键路径无回归保护 |
| C-03 | P2 | widget 组件硬编码英文文案未走 i18n（WorldClockWidget / EventWidget） |
| C-04 | P3 | `as` 类型断言较多，部分可收紧 |
| C-05 | P1 | `buildColumns` 在秋退窗口截断末尾日最后一小时 |
| C-06 | P1 | `decodeState` 接受反向选区（startMs > endMs），下游显示负时长 |
| C-07 | P2 | 深色模式下热力图三色与选区高亮未适配 |
| C-08 | P2 | `TimeGrid` 单击（无拖拽）强制选中最少 1 小时，指针无法清除选区 |
| C-09 | P2 | `localStorage` 恢复 places 时丢失 `customName` / `tags` |
| C-10 | P2 | `columnColor` 在所有地点时区非法时返回 `green`（应为 `null`） |
| C-11 | P3 | `nextDSTChange` 的 `prevDST` 与循环 `dt` 基线不一致 |
| C-12 | P2 | Service Worker 以带 query 的完整 URL 缓存导航响应，跨会话留存分享状态 |
| C-13 | P2 | `useLocalPersist` 写回 useEffect 依赖闭包变量；双 hook 双 ref 守卫耦合脆弱（建议合并） |
| C-14 | P3 | `DateJump` 无地点时输入框仍渲染但 `onChange` 静默 return |
| C-15 | P3 | `CursorBar` 游标启用后方向键拦截页面滚动，无显式关闭入口 |
| C-16 | P3 | `generateStaticParams` 仅枚举热门对，长尾 ISR 首访慢 + `Date.now()` 烘焙 |

### R 系列 — `review-fix-report.md`（`### R\d-\d` 标题，共 15 条）

各轮「记录型决策」表**不纳入**复核（是设计取舍，不是 issue）。

| ID | 严重度 | 标题（报告原文缩略） |
|----|--------|----------------------|
| R1-1 | P1 | 域名不统一（seo.ts 回退值 / gen-icons / ogArtwork 三处 `worldtime.app`） |
| R1-2 | P1 | 子页面丢失 alternates.types（llms.txt 链接） |
| R1-3 | P2 | canonicalLandingSlug 大小写归一缺陷 |
| R1-4 | P2 | robots.ts AI 爬虫清单不全（缺 4 个 UA） |
| R1-5 | P2 | 动态 OG 图路由死代码（修复 = 删除三文件） |
| R1-6 | P2 | 复制摘要城市名恒英文（summaryText 增加 locale 参数） |
| R1-7 | P3 | 死导出 weekendDaysOf（修复 = 删除） |
| R1-8 | P3 | 文档与代码不符（AGENTS / README / code-review-prompt / REQUIREMENTS 四处） |
| R2-1 | P1 | 假日数据错误：CN/HK/TW 2027 端午 `2027-05-09` 应为 `2027-06-09` |
| R2-2 | P1 | 周末规则数据过时/错误（三国；修复后应为 AE `[6,7]`、BD `[5,6]`、AF `[5]`） |
| R2-3 | P3 | useLocalPersist 空参数正则与 decodeState 语义不一致 |
| R2-4 | P3 | CitySearch 结果行不随 locale 排序 |
| R2-5 | P3 | 对话框打开时 Escape 连带清除选区（dialog 守卫） |
| R3-1 | P1 | 未知动态路由返回 200 软 404（loading.tsx 移入 `(home)` 路由组 + generateMetadata 硬 404） |
| R3-2 | P1 | next-intl 中间件注入矛盾 hreflang Link 头（`alternateLinks: false`） |

### W 系列 — `review-fix-report.md` 末尾「未修项及原因」表（共 4 行，轻量复核）

这些是**明知未修、有意不修**的项。复核目标不是找茬，而是确认「现状仍如决策所述」；若现状已变化，如实改判：问题已消失判 ✅、部分变化判 ⚠️，均注明变化点。

| ID | 条目 |
|----|------|
| W-1 | npm audit postcss/sharp 高危（devDependencies、仅构建期，修需破坏性升级） |
| W-2 | SEO_KEYWORDS 本地化 / FAQPage JSON-LD / 对照页面包屑层级 / llms.txt 多语言（有意取舍） |
| W-3 | IR / Jordan / NP 周末规则不修（NP 与最新政策一致；IR/JO 来源冲突） |
| W-4 | 城市数据仅中英双名（既有产品决策） |

## 三、核心纪律（反幻觉骨干，违反任何一条即判定无效）

1. **代码是唯一 ground truth。** 两份报告里的一切「修复」「验证方式」「实测」描述都是**待检验的声称**，不是证据。禁止因为「报告说修了」就判 ✅。
2. **行号已漂移。** 报告中的 `file.ts:35-64` 等行号是历史快照，**禁止按行号直接定位并判定**。以「文件路径 + 符号名 / 代码内容 / 问题描述」为锚，用 Grep/Read 找到现行位置后，引用**现行**行号作为证据。
3. **文件不存在 ≠ 未修。** 修复本身可能是删除（如 R1-5 删了三个文件）；功能精简也删过模块。文件/符号找不到时，先用 `git log --diff-filter=D -- <path>` 等确认删除时间与背景，再归类（🗑 或其他）。
4. **每条判定必须有证据，且证据形式随判定类型**：✅/❌/⚠️/🔁 须给**现行** `file:line` + 最多 3 行原文引文（或：测试文件中的用例名 + 关键断言）；🗑 的证据是文件不存在 / 全仓 grep 零命中（能附 `git log --diff-filter=D` 删除记录更佳）；❓ 写明静态卡在哪、缺什么。给不出对应证据的，一律降级为 ❓，不许凭印象判。
5. **逐点比对。** 把报告的「问题描述」拆成可核对的事实点，逐点对照现行代码。「建议修复」只是建议——实现可能用了等效的不同手段（如在上层拦截而非原函数内校验），**等效达成问题解决即算 ✅**，但要在备注写明实际实现方式。
6. **警惕两类错判**：(a) 表面修复——如 messages 里加了 key 但组件仍硬编码；(b) 修复被回退——后续重构覆盖了当年的修复。判 ✅ 前问自己：这段代码真的消除了报告描述的问题吗？
7. **宁缺勿编。** 静态读码 + 允许的只读命令都无法判定的，标 ❓ 并写明「缺什么才能验证」。❓ 不是失败，编造才是。

## 四、判定分类（七值）

| 判定 | 含义 | 判定条件 |
|------|------|----------|
| ✅ FIXED | 已修复 | 现行代码按建议或等效方式消除了问题，有代码证据 |
| ❌ UNFIXED | 未修复 | 现行代码仍符合报告对问题的描述，有问题代码证据 |
| ⚠️ PARTIAL | 部分修复 / 另方案残留风险 | 问题被缓解但未全消（如 localStorage 保住了 customName 而 URL 仍不编码），**必须写明残留风险** |
| 🔁 REGRESSED | 已修但被回退 | 仅适用于 R 系列：用 `git log -S` / `git show <commit>` 确认修复曾存在、后被后续提交覆盖（注明回退发生在哪个提交）。无法确认曾经存在的，判 ❌ |
| 🗑 OBSOLETE | 问题已不成立 | 所涉文件/功能/模块已删除或需求已移除；证据 = 文件不存在 / 全仓 grep 零命中，可附 git log 删除记录 |
| ❓ UNVERIFIABLE | 静态无法验证 | 需要真实浏览器 / 构建产物 / 部署环境 / 起服务才能判定；写明需要的验证手段 |
| 🧊 WON'T-FIX | 有意不修，决策维持 | 仅适用于 W 系列：现状仍如决策表所述。现状已变化时如实改判：问题已消失判 ✅、部分变化判 ⚠️，均注明变化点 |

判定顺序建议：先看代码是否还在（→ 🗑 候选）→ 再比对问题是否解决（→ ✅ / ⚠️ / ❌）→ R 系列的 ❌ 再查 git 历史区分 🔁 → 剩下的 → ❓。W 系列不走此流程，按第六节「W 系列轻量确认」行直接判 🧊 / ✅ / ⚠️。

## 五、逐条复核流程（每条固定五步）

对每个复核单元依次执行：

1. **摘要点**：从报告原文摘出该条的 位置（文件 + 符号名）、问题描述事实点、（如有）建议修复 / 声称的修复。
2. **定位现行代码**：按文件路径找；文件不在则全仓 Grep 符号名或特征代码片段；仍无 → 查删除记录，判 🗑 候选。
3. **逐点比对**：将问题描述事实点与现行代码逐点核对，特别当心「修了表面没修根」「修了又被改回去」。
4. **取证**：记录现行 `file:line` 与关键引文；报告给出的验证命令属只读类的（npm audit、单测、node 复算）可以实跑取证。
5. **回填**：写入清单行（判定 + 证据 + 一句话备注）。

**边核边写**：每完成约 5 条就把进度落盘到 `audit-recheck-report.md`，防止长任务中断丢失。

### 允许的只读命令（白名单）

- `npm audit`（可 `--omit=dev`）
- `npm test` / `npx vitest run [文件]`
- `git log` / `git show` / `git blame` / `git diff`
- `node -e '...'`（纯计算，如用项目内置 Luxon 重放报告里的 DST 复现脚本）
- `ls` / `grep` / `rg` / `cat`

**禁止**：任何写操作（改文件、`git commit/checkout/restore`、`npm install`、`npm audit fix`、`npx playwright` 等）、起 dev server、联网核实事实性数据（如 R2-2 的周末规则——以仓库现状为准，不重新联网查证；`npm audit` 访问 registry 获取漏洞公告属白名单允许范围，不算违规）。

## 六、特殊条目核对要点

| 类型 | 条目 | 核对方法 |
|------|------|----------|
| 已删组件（大概率 🗑，须防功能迁移） | C-03、C-14、C-15 | 三条引用的组件在现行 `src/components/` 已不存在（2026-08-25 初查：WorldClockWidget、EventWidget 删于功能精简 `c92b197`；DateJump、CursorBar 删于首页改造 `bf59303`；`[locale]/widget` 路由整体不存在）。判 🗑 前先确认同等交互没有迁移进新组件（日期跳转、游标功能现居何处——首页已改为「时间卡 + 自定义时刻」形态）：功能确已移除判 🗑，迁移且问题仍在则按实际判 ❌/⚠️。另留意删除残余（如 TimeGrid 仍引用 `"DateJump"` 翻译命名空间——确认是仍在使用的键还是死引用），如实记录 |
| 依赖 CVE | C-01、W-1 | 读 `package.json` 的 next/postcss/sharp 版本（报告时为 next@14.2.35，现仓库声明 Next 15）；再实跑 `npm audit --omit=dev` 对照报告结论。剩余的高危项如实记录 |
| i18n | R1-6、R2-4 | Grep `messages/*.json` 相应 key（11 语言齐全性）+ 组件内 `useTranslations` / `localCityName(locale)` 接线是否真的用上了 |
| 数据字面值 | R2-1、R2-2、W-3 | 直接读 `src/data/holidays.ts`（CN/HK/TW 2027 端午应为 `2027-06-09`，RU 的 `2027-05-09` 是正确数据应保留）、`src/data/countries.ts`（AE `[6,7]`、BD `[5,6]`、AF `[5]`；NP `[6,7]`、IR/JO `[5,6]` 维持不修） |
| SEO 运行时 | R1-2、R1-3、R1-4、R3-1、R3-2、C-16 | 代码层证据优先：`buildAlternates()` 内置 types、`canonicalLandingSlug` 经 parseSlug 归一、robots.ts 的 UA 清单、`loading.tsx` 位于 `src/app/[locale]/(home)/` 路由组、三个动态路由 generateMetadata 对未知输入 `notFound()`、`defineRouting({ alternateLinks: false })`。响应头/状态码等运行时行为无法起服务验证的，标「代码层已证，运行时未证」或 ❓ |
| 删除类修复 | R1-5、R1-7 | 证据 = 文件/导出已不存在（`ls`、全仓 grep 零命中）；`git log --diff-filter=D` 查删除记录作旁注 |
| 文档类修复 | R1-8 | 逐处读 AGENTS.md / README.md / code-review-prompt.md 顶部声明 / markdown/REQUIREMENTS.md 现文，核对四处声称的修正是否在 |
| 测试盲区 | C-02 | 看 `tests/` 目录现状 + `vitest.config.mts` 的 include/environment，判断组件/状态层是否仍零测试 |
| 源码逻辑与组件交互 | C-05、C-06、C-08、C-09、C-10、C-11、C-12、C-13、R2-3、R2-5 | 读现行 `src/lib/grid.ts`、`shareUrl.ts`、`heatmap.ts`、`time.ts`、`useLocalPersist.ts`、`useUrlState.ts` 及相应组件实现核对；报告里的复现脚本（如秋退窗口 dayIndex 分布、`decodeState("s=2000-1000")`）可用 `node -e` 重放取实证 |
| 域名一致性 | R1-1 | 全仓 grep `worldtime.app` 于 `src/`、`scripts/` 应零命中；`seo.ts` 的 `SITE_URL_FALLBACK` 应与 `.env.example` 同源（`time.eqde.de`）；`ogArtwork.tsx` 已随 R1-5 删除（初查确认三处 OG 文件均不存在） |
| 样式/主题 | C-07 | 读 `src/app/globals.css`（`.dark` 覆盖或语义 token 变量）+ `heatmap.ts` 的 heatBg + TimeGrid 选区/周末配色，判断深色模式下三色/选区是否有适配；注意仓库方向已转向 token 化主题（见 AGENTS.md），实现方式可能与报告建议不同，等效即可 |
| 类型断言 | C-04 | 全仓 grep `as AppLocale`，看是否仍散落多处、有无封装 `useAppLocale()` 之类 hook；属低优先级建议，未做也判 ❌ 但备注注明低优先级 |
| W 系列轻量确认 | W-2、W-4 | 确认现状仍如决策所述：SEO_KEYWORDS 仍 11 语言共用英文、城市数据仍仅中英双名；若已变化，改判 ✅ 并注明 |

> 上表是加速提示而非判定预设；未单独列出的条目一律按第五节通用五步流程复核，表中标注「初查」的现状信息仍须自行验证后再引用。

## 七、输出物：`audit-recheck-report.md`（仓库根目录）

结构如下（表格模板照用）：

````markdown
# 旧审查报告复核清单（fixed / unfixed）

- 复核日期：YYYY-MM-DD
- 基准 commit：<git rev-parse HEAD 的结果>
- 被复核报告：code-review-report.md（2026-08-11，16 条）· review-fix-report.md（2026-08-22，15 条 + 未修项 4 行）
- 统计：✅ x · ❌ x · ⚠️ x · 🔁 x · 🗑 x · ❓ x · 🧊 x（合计 35）

## 一、code-review-report.md（C 系列，16 条）

| ID | P | 摘要 | 判定 | 证据（现行 file:line） | 备注 |
|----|---|------|------|------------------------|------|

## 二、review-fix-report.md（R 系列 15 条 + W 系列 4 行）

（同上表式；R 系列与 W 系列各用一张表，表间空一行）

## 三、遗留问题清单（所有 ❌ / 🔁 / ⚠️ 逐条展开，可直接当修复任务用）

### <ID> <标题>
- 判定：
- 现状（现行代码 file:line + 引文）：
- 差距 / 残留风险：
- 建议修复方向：

## 四、❓ 待运行时验证清单

| ID | 静态卡在哪 | 需要什么才能验证 | 建议验证方式 |
|----|-----------|------------------|--------------|

## 五、新发现（复核途中顺带注意到、但不属于两份报告任何一条的新问题；无则写「无」）

## 六、纪律声明

全程只读：未修改任何既有文件，未执行任何写操作；唯一新建文件为本报告。<如起过 npm audit / vitest 等命令，在此列出>
````

## 八、完成自检（全部通过才算完成）

1. 35 个复核单元每条都有判定 + 证据；❓ 条目写明了缺什么。
2. 证据抽查：随机取 3 条 ✅，反向复核证据是否真能支撑判定（引文确实存在于所引位置、且确实体现「问题已解决」而非 merely 存在）。
3. 头部统计数字与各表明细行数一致。
4. 全程未出现「以报告声称代替代码取证」的条目。
5. 最后在回复中给出一段人话总结：哪些还遗留（❌/🔁/⚠️ 的 ID 与一句话）、哪些待运行时验证、总体修复率。
