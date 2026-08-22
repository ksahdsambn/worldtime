# WorldTime 三轮自主审查修复报告（代码质量 · SEO · GEO）

> 执行日期：2026-08-22 · 分支：`main` · 提交：`2674a3c`（R1）→ `3cb96d8`（R2）→ `6132c9d`（R3）
> 方法：第 0 步建立心智模型（全量通读配置/文档/核心模块/组件），随后三轮独立审查——R1 广度扫描、R2 深挖高风险模块（含真实 IANA 规则实跑验证与联网核实事实数据）、R3 生产构建 + `next start` + curl/node 端到端实证。每轮独立通过全量验证门槛后提交。

---

## 第 1 轮：全局扫描 + 修复（广度优先）

### R1-1 域名不统一（三处）

- **严重度**：P1 · 维度：SEO/GEO · 位置：`src/lib/seo.ts:13`、`scripts/gen-icons.mjs:164,199`、`src/lib/ogArtwork.tsx:196`
- **问题**：`getSiteUrl()` 回退值 `https://worldtime.app` 与 `.env.example` / `.env.local` 的 `https://time.eqde.de` 矛盾；OG 图右下角域名硬编码 `worldtime.app` 字面量。env 缺失时（如本地裸跑构建）全站 canonical/sitemap/robots/llms 会输出第二个域名。
- **验证方式**：`grep -rn "worldtime.app" src/ scripts/` 三处命中；`gen-icons` 独立 node 进程不经过 Next env 加载。
- **修复**：seo.ts 导出 `SITE_URL_FALLBACK = "https://time.eqde.de"`（注释要求与 .env.example 同源维护）；gen-icons.mjs 新增 `siteHost()` 按 `process.env → .env.local → .env.example` 顺序读取；`npm run gen:brand` 重生成素材（仅含域名的 5 个文件变化，图标字节级一致）。ogArtwork.tsx 随 R1-5 删除。
- **决策理由**：任务规定真实域名以 `NEXT_PUBLIC_SITE_URL` 为准；回退值与 `.env.example` 保持同一事实源。

### R1-2 子页面丢失 alternates.types（llms.txt 链接）

- **严重度**：P1 · 维度：SEO/GEO · 位置：`src/lib/seo.ts buildAlternates`、`src/app/[locale]/layout.tsx`
- **问题**：layout 在 `alternates.types` 声明了 `text/plain → /llms.txt`，但 Next 的 metadata 合并按**顶层键整体覆盖**——每个子页的 `buildAlternates()` 返回值替换整个 `alternates` 对象，`types` 全部丢失，GEO 机器可读入口在全部子页缺席。
- **验证方式**：R3 实测（修复后）：`/en/time/jp-tokyo` 等 10 个样本页均含 `<link rel="alternate" type="text/plain" href="https://time.eqde.de/llms.txt"/>`。
- **修复**：`buildAlternates()` 内置 `types`，所有页面统一携带。
- **决策理由**：与其依赖合并行为，不如让每个页面的 alternates 自洽完整。

### R1-3 canonicalLandingSlug 大小写归一缺陷

- **严重度**：P2 · 维度：SEO · 位置：`src/lib/seo.ts canonicalLandingSlug`
- **问题**：原实现按原始字符串比对热门表：`/time-converter/CN-BEIJING--US-NEW-YORK` 能正常渲染（parseSlug 内部小写化），但 canonical 输出保留原始大小写 → 同内容页面出现两个不同 canonical（大小写 URL 对搜索引擎是不同地址），canonical 碎片化。
- **验证方式**：R3 实测：大小写变体、反向热门对、非热门字典序三种输入全部收敛到规范 slug（见第 3 轮实测记录）；单测 +4。
- **修复**：先经 `parseSlug` 归一（城市 id 统一小写、时区缩写统一大写）再比对热门表/字典序；不可解析 slug 原样返回（页面本身 404）。
- **决策理由**：与页面渲染逻辑共用同一归一化路径，杜绝「渲染按小写、canonical 按原文」的双标准。

### R1-4 robots.ts AI 爬虫清单不全

- **严重度**：P2 · 维度：GEO · 位置：`src/app/robots.ts`
- **问题**：缺 `OAI-Searchbot`、`Perplexity-User`、`DuckAssistBot`、`Bytespider` 四个当前实际存在的 AI 爬虫。
- **验证方式**：R3 实测 `/robots.txt` 含全部 13 个爬虫名。
- **修复**：补全四个 UA（GEO 声明用途，与 `*` Allow 等价）。

### R1-5 动态 OG 图路由死代码

- **严重度**：P2 · 维度：代码质量/性能 · 位置：`src/app/[locale]/opengraph-image.tsx`、`twitter-image.tsx`、`src/lib/ogArtwork.tsx`
- **问题**：三文件构成的路由从未生效：Next 源码 `mergeStaticMetadata`（`node_modules/next/dist/lib/metadata/resolve-metadata.js`）明确——仅当同级 metadata 的 `openGraph.images`/`twitter.images` **不存在**时文件约定才注入；layout 与全部子页都显式声明了 images（指向静态 `/og.png`，爬虫稳定性是有意决策）。死代码还让构建白白生成 22 张 Satori 图，且 ogArtwork 内嵌过时域名字面量。
- **验证方式**：Next 源码走读 + R3 实测 og:image/twitter:image 均为 `/og.png`。
- **修复**：删除三文件（静态素材由 `scripts/gen-icons.mjs` 生成，单一事实源）。
- **决策理由**：任务给出「接线或删除」两个选项；meta 策略已定为静态图，接线无收益，删除消歧义。

### R1-6 复制摘要城市名恒英文

- **严重度**：P2 · 维度：i18n · 位置：`src/lib/summary.ts`、`src/components/SelectionBar.tsx`
- **问题**：复制的时间摘要（用户可见文案）在中文界面仍输出 `Beijing`，违反「用户可见文案走 i18n」原则；其余地点名称展示（TimeGrid/PlacesPanel）均已用 `localCityName`。
- **验证方式**：单测：zh 输出「北京」且不含 "Beijing"，默认 en 相反。
- **修复**：`summaryText` 增加 `locale` 参数（默认 `en`，向后兼容），SelectionBar 传入当前 locale。

### R1-7 死导出 weekendDaysOf

- **严重度**：P3 · 维度：代码质量 · 位置：`src/lib/heatmap.ts`
- **问题**：全仓库（含测试）零引用。
- **修复**：删除（连带清理未用的 `getCountry` import）。

### R1-8 文档与代码不符（四处）

- **严重度**：P3 · 维度：文档 · 位置：`AGENTS.md`、`README.md`、`code-review-prompt.md`、`markdown/REQUIREMENTS.md`
- **问题**：AGENTS.md 仍写「可叠加 Google Calendar free/busy」「Google Calendar OAuth」（功能已删）；README 仅两行；code-review-prompt.md 写 Next 14 并引用已删的 `lib/calendar.ts`/`lib/sun.ts`；REQUIREMENTS.md 未说明多个增强项已移除。
- **修复**：AGENTS.md 定位段改为当前事实（URL 分享 + SEO/GEO 页面体系 + PWA）；README 重写（栈/开发/验证/目录）；code-review-prompt.md 顶部加历史文档声明并修正硬事实；REQUIREMENTS.md 头部加存档注记（以代码为准）。

### R1 记录型决策（审查后不改，附理由）

| 项 | 决策 | 理由 |
| --- | --- | --- |
| `SEO_KEYWORDS` 11 语言共用英文 | 保留 | meta keywords 被 Google 多年忽略；本地化收益≈0、维护成本高；保留作主题范围文档化 |
| FAQPage JSON-LD 输出于城市/对照页 | 保留 | Google 已对多数站点弃用 FAQ 富结果，但结构化 Q&A 对 LLM 摘录（GEO）有利且零成本 |
| 对照页 BreadcrumbList 仅 2 项 | 保留 | 无「对照页索引」中间层级，虚拟层级反而制造无流量页；与可见面包屑一致 |
| llms.txt 三件套仅英文、链接 `/en` | 保留 | llms.txt 规范即英文优先；`/en` 与 x-default 一致；`llms-full.txt` 的 URL 清单已从数据生成而非硬编码 |
| sitemap 城市 `changefreq: hourly` vs 页面 `revalidate: 300` | 保留 | changefreq 是弱提示，hourly ⊂ 每 5 分钟再验证，无矛盾；sitemap 全量（15,510 URL）+ 预渲染仅热门子集是构建成本与收录速度的标准折中 |
| cities/holidays 数据进客户端 bundle（源码 ~100KB） | 保留 | gzip 后体积可控；CitySearch 即时过滤与网格热图依赖全量数据，懒加载会伤首交互（违反「Warm but never slow」） |

---

## 第 2 轮：独立复审 + 深挖 + 修复（深度优先）

复审第 1 轮 diff（git show 重读）：canonicalLandingSlug 无循环依赖（seo→landingSlug→time/store，store 不回依赖 seo）、删除的 OG 路由无残余引用、`buildAlternates` types 与 layout 自身声明一致——未发现 R1 引入的回归。

深挖按任务指定顺序：time.ts（DST 边界）→ grid.ts → heatmap.ts → landingSlug.ts（parseSlug 歧义）→ shareUrl.ts（解码降级）→ store + useUrlState/useLocalPersist（三态竞态）→ seo.ts。时间类问题全部用 node + Luxon 实跑（见新增 `tests/lib/dstRegressions.test.ts`）：纽约 2026 春进 3/8、悉尼秋退 4/5、Lord Howe 30 分钟切换（660→630）、开罗午夜切换（00:00 不存在日）、春进周 167 列/秋退周 169 列且 epoch 全唯一、加尔各答半小时偏移列对齐、parseSlug 六类歧义输入、decodeState 七类畸形降级——**既有实现全部正确**，固化为回归测试。

### R2-1 假日数据错误：CN/HK/TW 2027 端午

- **严重度**：P1 · 维度：代码质量（数据）· 位置：`src/data/holidays.ts:30,44,59`
- **问题**：三处把 2027 端午写成 `2027-05-09`；2027 年端午（五月初五）实为 **6 月 9 日**（同文件 2024-2026 各年端午 06-10/05-31/06-19 均正确，唯 2027 笔误）。同日期 `2027-05-09` 在 RU（胜利日）是**正确**数据，已核实保留。
- **验证方式**：单测断言 CN/HK/TW 含 `2027-06-09` 且不含 `2027-05-09`；RU 含 `2027-05-09`。
- **修复**：三处 `05-09` → `06-09`。

### R2-2 周末规则数据过时/错误（三国，联网核实）

- **严重度**：P1 · 维度：代码质量（数据）· 位置：`src/data/countries.ts`
- **问题与依据**：
  - **AE 阿联酋 `[5,6]` → `[6,7]`**：2022-01-01 起联邦政府改周六周日休（周五半日），私营部门普遍跟随（Al Jazeera/Bloomberg/CNBC 2021-12 报道）。原数据滞后 4+ 年。
  - **BD 孟加拉 `[6,7]` → `[5,6]`**：周六周日从未是孟加拉周末——传统政府口径周五周六休；2025 起临时政府向周五单休（周日至周四工作）过渡（Financial Express）。周五必休、周日必工作在两种制度下都成立，故取 `[5,6]`。
  - **AF 阿富汗 `[6,7]` → `[5]`**：周六周日均为工作日；共同锚定事实是周五为法定周休（周四半日），多种来源冲突（Thu-Fri 历史/Fri-Sat 少数新说），取无争议的 `[5]`。
- **验证方式**：WebSearch 三次独立核实；单测断言三国 weekendDays。
- **不修同类项（记录）**：NP 尼泊尔保持 `[6,7]`（2026 最新政策恰为周六周日双休，与数据一致）；IR/Jordan 保持 `[5,6]`（来源冲突，现状可辩护，避免凭不确定记忆引入新错）。

### R2-3 useLocalPersist 空参数与 decodeState 语义不一致

- **严重度**：P3 · 维度：代码质量（三态同步）· 位置：`src/lib/useLocalPersist.ts:73-75`
- **问题**：`decodeState` 把 `?p=`（空值）当作「未携带」跳过；`useLocalPersist` 的正则 `[?&]p=` 却判定「URL 带了地点」→ 跳过 localStorage 恢复 → 手工拼的空参数把用户地点清成空列表。
- **修复**：正则改为要求非空值（`p=[^&]`、`s=\d`、`c=\d`），两侧语义对齐：空值一律视为未携带。
- **决策理由**：encodeState 本就不会产出空 `p=`（空列表省略参数），仅手工 URL 会触发，但行为应当自洽。

### R2-4 CitySearch 结果行不随 locale 排序

- **严重度**：P3 · 维度：i18n · 位置：`src/components/CitySearch.tsx`
- **问题**：下拉结果恒中文主显（`nameZh` 为主 + `nameEn` 括号 + `countryZh`），英文/日文等界面下主次颠倒；其余组件均用 `localCityName`。
- **修复**：主名用 `localCityName(locale)`，次名中文页显英文、其余显中文；国家用 `cityCountryName(locale)`。

### R2-5 对话框打开时 Escape 连带清除选区

- **严重度**：P3 · 维度：a11y/UX · 位置：`src/components/KeyboardShortcuts.tsx`
- **问题**：全局 Escape 清选区监听与应用内 Dialog 的 Esc 关闭同时触发：重命名对话框中按 Esc 取消会意外清掉选区。附：注释声称与 PlacesPanel 同用 window.confirm，实际 PlacesPanel 已改用 Dialog，注释过时。
- **修复**：`document.querySelector('[role="dialog"]')` 守卫（Dialog 确认渲染 `role="dialog"`）；注释改为如实描述双路径。

### R2 记录型决策（不改，附理由）

| 项 | 决策 | 理由 |
| --- | --- | --- |
| npm audit 3 high（postcss ≤8.5.22 / sharp <0.35.0） | 跳过 | 两者均为 devDependencies、只存在于构建期（不进 standalone 运行镜像）；postcss 修复需强制升级 next@16、sharp 需 0.35 破坏性升级——违反「保守、不破坏现有功能」与不改依赖约束；且相应 CVE 需要处理攻击者控制的 CSS/图片，本站构建输入全部为仓库内可信资产 |
| 对照表在 a 侧秋退日出现两行 `01:00` | 保留 | 物理正确（该日本地确有两个 01:00，对应不同绝对时刻与对方时间），每年仅 1 天、仅 a 侧 |
| ISR 双时间源（服务端烘焙 ≤300s 陈旧 + 客户端每分钟刷新） | 保留 | revalidate=300 已是构建成本与新鲜度的折中；页面明示 "current offset; may differ on DST transition days" 类免责；进一步降值会放大 1200 城市 × 11 语言的再生成成本 |
| 假日数据仅覆盖 2024–2027 | 保留 | 随版本更新是既定策略；范围外 `isHoliday` 安全返回 false，周末覆盖仍生效 |

---

## 第 3 轮：终审 + 端到端实证 + 收尾

先交叉验证前两轮全部发现（逐条复核修复正确、无误报残留），随后 `npm run build` + `next start` 实抓。**实证发现两个仅靠走读无法确认的 P1**：

### R3-1 未知动态路由返回 200 软 404

- **严重度**：P1 · 维度：SEO · 位置：`src/app/[locale]/loading.tsx`、三个动态路由页
- **问题**：`/en/time/xx-nowhere`、`/en/time-converter/gibberish-pair`、`/en/country/zz` 返回 **HTTP 200**（体含 404 UI + noindex）。走读层面 `notFound()` 似乎是对的；实测暴露根因：`[locale]/loading.tsx` 使流式 shell 在页面渲染前先行提交 200，页面组件随后抛出的 `notFound()` 只能把 404 UI 渲进已提交的流，无法改状态码。generateMetadata 阶段抛 `notFound()` 同样太晚（元数据解析后 shell 照样先流）。
- **验证方式**：实测矩阵——移除 loading.tsx 后三路由全部 404（假设证实）；最终方案实测三路由 404、首页及其余页面 200 不受影响。
- **修复**：`loading.tsx` 移入首页专属路由组 `src/app/[locale]/(home)/`（首页保留骨架 UX，URL 不变）；三个动态路由的 generateMetadata 对未知输入直接 `notFound()`（原 noindex 分支移除——硬 404 是更强的信号，无需 noindex 兜底）。
- **决策理由**：软 404 依赖搜索引擎启发式识别（不可靠）且污染 noindex 语义；路由组方案两全。

### R3-2 next-intl 中间件注入矛盾 hreflang Link 头

- **严重度**：P1 · 维度：SEO · 位置：`src/i18n/routing.ts`、`src/middleware.ts`
- **问题**：每个页面响应自带 `Link: <...>; rel="alternate"; hreflang=...` 头（next-intl `getAlternateLinksHeaderValue`），但内容与页面 head 的 hreflang 三重矛盾：① 用原始 locale 码 `zh`/`pt` 而非 BCP47 `zh-Hans`/`pt-BR`；② `x-default` 指向未加前缀的 `/`（307 跳 `/zh`）而非 head 的 `/en`；③ host 取请求方（localhost/代理域名）而非站点域名。
- **验证方式**：实测修复前 `/zh` 响应头含 12 条 localhost URL 的 hreflang；修复后 grep `hreflang` 计数为 0。
- **修复**：`defineRouting({ alternateLinks: false })` 关闭；head 内 hreflang（完整映射 + 绝对 URL + x-default→/en）为唯一事实来源。

### R3 实证结果全录（修复后）

**元数据抽样（4 语言 × 4 页类）**：`/zh /en /ja /ru /pt` 首页与 `/en/time/jp-tokyo`、`/zh/time/cn-beijing`、`/de/country/jp`、`/en/time-converter/cn-beijing--us-new-york`、`/ru/time-converter/EST--PST` 的 title（各语言唯一、品牌后缀模板正确）、description（各语言唯一）、canonical（域名 `time.eqde.de`、路径正确）、hreflang（11 语言 + x-default→/en、`zh-Hans`/`pt-BR` 映射、URL 用应用 locale 路径）、og:title/url/locale/image（绝对 URL `/og.png`）、twitter:card=summary_large_image + twitter:image——**全部正确**。

**canonical 收敛**：反向热门对 `us-new-york--cn-beijing` → `cn-beijing--us-new-york`；大小写变体 `CN-BEIJING--US-NEW-YORK` → `cn-beijing--us-new-york`；非热门 `jp-osaka--cn-chengdu` → `cn-chengdu--jp-osaka`（字典序）——**全部收敛**。

**noindex/404 边界**：未知城市、不可解析 slug、无城市国家 → **HTTP 404**（R3-1 修复后）。真未知路由 `/en/definitely-not-a-route` → 404。

**JSON-LD**：10 个样本页（首页/城市×2/国家/对照×2/about/faq/privacy）共 27 段 JSON-LD 全部 `JSON.parse` 成功；`@context` 全为 `https://schema.org`；BreadcrumbList position 从 1 起、item 全绝对 URL；WebPage.url 绝对；Place 含 `ianaTimeZone`；FAQPage mainEntity 非空。

**sitemap/robots/llms 三件套**：`/sitemap.xml` 15,510 URL（城市 12,892 / 国家 2,068 / 对照 506 / 静态 44），4 条抽样全部 200 可达，lastmod=2026-08-22，含 xhtml:link alternates；`/robots.txt` 含全部 13 个 AI 爬虫；`/llms.txt`、`/llms-full.txt`、`/ai.txt` 均 200 + `Cache-Control: public, max-age=3600` 且域名统一、无 `worldtime.app` 残留。

**用户路径模拟（5 条）**：① 分享 URL `?p=*cn-beijing,us-new-york&s=...&c=...` 打开首页 200（客户端还原已由单测覆盖）；② 城市页 → 国家页 → 对照页互链（jp-tokyo 页含 country/jp、time-converter、打开网格 CTA）；③ 对照页 58 条内链（56 唯一）+ 双城市页回链；④ 首页 footer 城市列/对照列/about/faq/privacy 齐全；⑤ 国家页 → 17 个城市链接——**全部走通**。

**SSG 页面数**：1045（近期历史口径 1033，更早 283/305 为 SEO 页面体系上线前的阶段值；本轮 +12 源于路由组迁移不影响计数、热门集合与国家集合的枚举差异，无异常）。

---

## 汇总

| 轮次 | 修复数 | P0 | P1 | P2 | P3 | 提交 |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | 8 | 0 | 2 | 4 | 2 | `2674a3c` |
| R2 | 5 | 0 | 2 | 0 | 3 | `3cb96d8` |
| R3 | 2 | 0 | 2 | 0 | 0 | `6132c9d` |
| **合计** | **15** | **0** | **6** | **4** | **5** | 另记录型决策 12 项 |

**测试**：192 → 215（+23：canonical 大小写/不可解析/字典序 4、alternates types 1、summary 本地化 1、dstRegressions 11、假日端午回归 2、周末规则 3、（其余为既有用例适配断言））。

### 全量验证结果（每轮均通过，末轮数值）

| 检查项 | 结果 |
| --- | --- |
| `npm run type-check` | ✅ 0 错误 |
| `npm run lint` | ✅ 无警告无错误 |
| `npm run test` | ✅ 215/215（15→16 文件） |
| `npm run build` | ✅ 1045 静态页，构建成功 |

### 未修项及原因

| 项 | 原因 |
| --- | --- |
| npm audit postcss/sharp 高危 | 构建期 devDep、不进运行时；修复需 next@16 / sharp@0.35 破坏性升级，违反保守约束（详见 R2 记录） |
| SEO_KEYWORDS 本地化 / FAQPage JSON-LD 去留 / 对照页面包屑层级 / llms.txt 多语言 | 有意取舍，理由见 R1 记录型决策表 |
| IR/Jordan/NP 等周末规则 | NP 与最新政策一致；IR/JO 来源冲突，现状可辩护，不凭不确定记忆改动 |
| 城市数据仅中英双名 | 既有产品决策（非中文 locale 回退英文名是国际惯例），超出本轮范围 |
