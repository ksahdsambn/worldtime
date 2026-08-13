# 开发进度记录

## 第 22 轮：界面质量审计问题全量修复（无障碍 / 图标体系 / 令牌 / 响应式）

> 时间：2026-08-13
> 范围：依据 `audit` 技能产出的界面质量审计报告（1 严重 / 4 高 / 4 中 / 3 低，共 12 项），逐条修复，零功能回退。审计覆盖无障碍、主题令牌、响应式与设计反模式（AI slop）四个维度。
> 依据：审计最严重项为 **C1——核心「拖拽选区」功能仅指针可用**（WCAG 2.1.1 键盘 A 级失败：键盘用户无法创建选区）；其余系统性问题为 **H1 全站用 Unicode/emoji 充当功能图标**（与「Linear/Notion 精炼质感」目标冲突）、**H2 DST 徽章对比度仅 ~2.9:1**（AA 失败）、**H3 无 success/danger 语义令牌**（破坏性/错误态绕过令牌系统）、**H4 移动端操作行触控目标 36px**（< 44px 建议）。

### 架构决策

1. **图标体系零依赖**（H1）：不引入 `lucide-react`（项目一贯「零新增依赖」纪律，见第 14/21 轮），改为新增 `src/components/icons.tsx`——纯内联 SVG，lucide 风格描边、`stroke="currentColor"`，随 `text-muted/text-faint` 等令牌着色，跨平台渲染一致。功能控件（拖拽手柄/主页/重命名/标签/关闭/更多/下拉/帮助/打印/图片/昼夜/日月/地球/公文包）全部替换；仅保留信息性 emoji（国旗、日出日落 🌅🌇 数据插画）。
2. **键盘选区复用既有游标模型**（C1）：不为网格另建 `role="grid"` + roving tabindex（168 列 × N 行，成本高且与拖拽/冻结列纠缠）。改在既有游标（CursorBar）上加一条键盘路径——`Enter`/`Space` 在游标处开始 1 小时选区，`Shift+←/→` 扩展（复用 `resizeSelection`）。入口「显示时间标记」按钮可聚焦，构成完整键盘链路：启用游标 → 方向键定位 → Enter 选 → Shift+方向键扩展。与全局 `KeyboardShortcuts`（Ctrl/⌘+Enter、Esc、Delete）无冲突。
3. **语义状态令牌补齐**（H3）：`globals.css` `:root`/`.dark` 各加 `--success/--success-fg/--danger/--danger-hover/--danger-fg`（实色填充 + 白字，对比均 ≥4.5:1），`tailwind.config` 映射 `success/danger` 别名，迁移 `btn-danger` + `PlacesPanel` 删除 hover + `GoogleCalendarConnect` 连接点/错误文 + `Toaster` 语义底色。**顺带修复一处潜藏深色对比度 bug**：旧错误 toast 深色用 `--heat-bad-ink`（#f87171 浅红）配白字仅 ~2.4:1，迁到 `--danger`（#dc2626）后达标。
4. **DST 徽章最小且确定达标的修法**（H2）：保留 `bg-warm-soft`（暖色身份）+ 文字由 `text-warm-strong` 改 `text-ink`。`--text` 在两主题下都是「与背景反相的高对比色」——浅色近黑（#0f172a）配暖白底 ~14.5:1、深色近白（#e6ebf2）配半透明暖底 ~9.2:1，均远超 AA，且无需新增令牌。

### 完成内容

**① `src/components/icons.tsx`（新增）—— 内联 SVG 图标集**
- 15 个描边图标（`IconDrag/IconHome/IconEdit/IconTag/IconClose/IconMore/IconChevronDown/IconSun/IconMoon/IconGlobe/IconHelp/IconPrinter/IconImage/IconBriefcase`），24×24 viewBox、`strokeWidth=2`、`aria-hidden`、`focusable=false`，尺寸由调用方 `className`（如 `h-4 w-4`）控制。

**② H1 全站图标替换（10 个组件）**
- `PlacesPanel`：拖拽手柄 `⠿`→`IconDrag`；操作行 `⌂✎#✕`→`IconHome/IconEdit/IconTag/IconClose`；昼夜状态 `💼🌤️🌙`→`IconBriefcase/IconSun/IconMoon`（随 `currentColor` 着色）；折叠 `▾`→`IconChevronDown`。
- `ThemeToggle`：`☀️🌙` 交叉淡入 → `IconSun/IconMoon` 交叉淡入（保留旋转动效，去掉 emoji 平台差异）。
- `HeaderActions`：移动端 `⋯`→`IconMore`。`HelpPopover`：`?`→`IconHelp`、`✕`→`IconClose`。
- `FirstUseEmptyState`：`🌐`→ 品牌 mark（`/brand/worldtime-mark.svg`，与顶栏一致）。
- `PrintExport`：`🖨️🖼️`→`IconPrinter/IconImage`。`Toaster`：关闭 `×`→`IconClose`。`EventView`：主地点 `⌂`→`IconHome`。

**③ C1 键盘选区（`src/components/CursorBar.tsx`）**
- keydown 增 `Enter`/`Space` 分支：游标非空且焦点非按钮时 `preventDefault` + `setSelection({startMs:cursorMs, endMs:cursorMs+3600_000})`；焦点在按钮上放行（避免与按钮激活冲突）。
- 可见提示增 `· Enter {select}`；`HelpPopover` 快捷键列表增 `Enter`（开始选区）与 `Shift+←/→`（扩展/收缩选区）两条。
- 顺带修一处既有 i18n bug：昼夜状态 `title/aria-label` 原用裸枚举值（"work"/"contact"/"rest"），改为翻译键 `Places.periodWork/periodContact/periodRest`。

**④ H2 DST 徽章对比度（`PlacesPanel.tsx`）**
- `bg-warm-soft text-warm-strong`（~2.9:1）→ `bg-warm-soft text-ink`（浅 ~14.5:1 / 深 ~9.2:1）。

**⑤ H3 语义状态令牌（`globals.css` + `tailwind.config.ts` + 3 组件）**
- 新增令牌（两主题）+ Tailwind 别名；迁移 `btn-danger`、`PlacesPanel` 删除 `hover:text-danger`、`GoogleCalendarConnect` 连接点 `bg-success`/错误 `text-danger`、`Toaster` 错误/成功底色用 `--danger/--success`。

**⑥ H4 移动端触控目标（`PlacesPanel.tsx`）**
- 操作行按钮 `h-9 w-9`（36px）→ `h-10 w-10`（40px，匹配应用自身 `.icon-btn` 手机标准），桌面端仍 `md:!h-6 md:!w-6`；破坏性删除按钮 hover 与其余同尺寸，降低误触。

**⑦ M1 卡片同色表面深度（`PlacesPanel.tsx`）**
- 面板内容区 `#places-panel-content` 由继承 `bg-surface` 改为 `bg-surface-inset` + `flex-1`：抬升的 aside（surface 框）内含内凹列表托盘（inset），地点卡（surface）在其上真正抬升，恢复「分层表面」深度意图（深浅两主题均成立）。

**⑧ M2 表格 scope（`TimeGrid.tsx`）**
- 日期组 `<th>` 增 `scope="colgroup"`、城市名列头 `<th>` 增 `scope="col"`、行标签 `<td>` 增 `scope="row"`，屏幕阅读器可建立单元格↔日期/城市关系。

**⑨ M3 链接下划线（`page.tsx` + 着陆页）**
- 内链由 `hover:underline` 改为常驻 `underline underline-offset-2 hover:text-accent-hover`（不再仅靠颜色区分链接，WCAG 1.4.1）。

**⑩ M4 移动端自动定位到现在（`TimeGrid.tsx`）**
- 新增 once-effect：手机端（`max-width:767px`）首屏恢复后把 `td[data-now="1"]` 滚到视口中部（复用 `scrollIntoView`），用户落地即见当前时段而非最左 00:00；桌面端保留「从今日 00:00 起」默认定位不变。

**⑪ L1/L2/L3 细节**
- L1：行标签 `<td>` 加 `select-text`（容器仍 `select-none` 保拖拽洁净），城市名可复制。
- L2：空状态 emoji 换品牌 mark（见 ②）。
- L3：`Toaster` 的 `#ffffff` 经 H3 迁移消除；`PrintExport` 的 `toPng({backgroundColor:"#ffffff"})` 为画布导出目标色（非 CSS 变量、白底导出正确），判定合理保留。

**⑫ i18n（11 语言全量同步）**
- 新增 `Cursor.select`、`Help.shortcutSelect`、`Help.shortcutResize`、`Places.periodWork/periodContact/periodRest`，共 6 键 × 11 文件，CJK/西里尔母语自然，键集一致。经幂等脚本注入（2 脚本用后即删）。

### 涉及文件

- 新增 `src/components/icons.tsx`
- 改 `src/app/globals.css`（状态令牌 + btn-danger 迁移）、`tailwind.config.ts`（success/danger 别名）
- 改 `src/components/{PlacesPanel,CursorBar,ThemeToggle,HeaderActions,HelpPopover,FirstUseEmptyState,PrintExport,Toaster,GoogleCalendarConnect,EventView,TimeGrid}.tsx`
- 改 `src/app/[locale]/page.tsx`、`src/app/[locale]/time-converter/[slug]/page.tsx`（链接下划线）
- 改 `messages/*.json`（11 语言，6 新键）

### 验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript（`tsc --noEmit`） | ✅ 通过（含 `<td scope="row">` —— HTMLTableCellElement 支持） |
| 单元测试（`vitest run`） | ✅ 172/172 通过 |
| ESLint（`next lint`） | ✅ 无警告 / 错误 |
| 生产构建（`next build`） | ✅ 成功，305 个静态页面（11 语言全覆盖） |
| messages 键一致性 | ✅ 11 文件 6 新键完全对齐 |
| 键盘选区链路（C1） | ✅ Tab→「显示时间标记」→ 方向键移游标 → Enter 建 1h 选区 → Shift+方向键扩展，全程无需指针；Enter/Space 在按钮焦点上放行不冲突 |

### 审查与修复（第二轮自审，提交前）

对全部未提交 diff 逐文件复查，纠正 / 加固 3 项：

1. **[关键] C1 键盘选区会拦截链接导航**：`CursorBar` 的 `Enter`/`Space` 处理调用 `e.preventDefault()`，当游标启用且焦点恰在页脚 `<a>` 内链上时，按 Enter 会阻止链接原生导航。修正：跳过清单由 `BUTTON` 扩到 `BUTTON | A`（链接的 Enter 放行交还浏览器）。
2. **[关键] 品牌 logo 经 next/image 静默 404（既存 bug，本轮放大）**：L2 把空状态 emoji 换成品牌 mark 时用了 `<Image src="…svg">`——与顶栏 logo 同一模式。实测 `next/image` 优化器对 SVG 返回 **HTTP 400**（`dangerouslyAllowSVG` 未启用），即**顶栏 logo 自第 13 轮起一直是坏图**（此前 AI 视觉复查未发现）。修正：两处统一改 `<Image … unoptimized>`（跳过优化器、直接服务 SVG，HTTP 200），既修本轮新引入项也修既存坏图；按 Next 自身报错建议处理，未全局开启 `dangerouslyAllowSVG`（避免放行任意 SVG 的脚本注入面）。
3. 复查 `PlacesPanel` 操作行触控目标：移动端 `.icon-btn` 媒体查询为非层化规则、在 CSS 级联中胜过 Tailwind 工具类层，故 `h-10 w-10` 与 40px 媒体查询一致、桌面 `md:!h-6 md:!w-6` 正常——H4 改动确定无回归。

### 第二轮验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript / ESLint / 单测 | ✅ tsc 0 错；lint 0 警告 0 错（`<img>`→`<Image unoptimized>` 后 `no-img-element` 警告消除）；vitest 172/172 |
| 生产构建 | ✅ 305 个静态页面 |
| 运行时核验（`next start` + curl） | ✅ 首页渲染 HTML 含 `src="/brand/worldtime-mark.svg"`（直接路径、非 `/_next/image`）；该 SVG HTTP 200 |

### 设计说明

- **图标零依赖**：选内联 SVG 而非 `lucide-react`，延续项目「零新增依赖」纪律；图标随令牌着色，深浅主题一致，消除 emoji 平台差异（Windows 💼 vs macOS、盲文 `⠿` 拖拽手柄等临时方案）。
- **键盘可达选最小侵入**：C1 复用既有游标而非重建 grid 键盘模型，风险可控且功能完整；游标本就是「键盘可定位时刻」的设施，扩展到「键盘可建选区」是自然延伸。
- **对比度修法求确定**：H2 选 `text-ink`（两主题均远超 AA）而非深挖 `--warm-strong`（需逐主题手算且贴近临界），以「确定达标」优先。

### 未做（主动克制 / 留作后续）

- **网格本身的 `role="grid"` + 单元格可聚焦键盘模型**：C1 用游标路径已满足 WCAG 2.1.1（核心功能键盘可用），完整 grid 键盘模型成本高、与拖拽/冻结列耦合深，留作后续增强。
- **网格数据单元可文本选中**（L1 仅放开行标签）：数据格是拖拽目标，手势与文本选择本质冲突，已通过 SelectionBar 的「复制摘要」提供等价复制路径。
- **WorldClockWidget 的 slate/gray 原始色**（审计 L3 范围外，独立可嵌入 widget，刻意自成一体）未纳入本轮令牌迁移。

---

## 第 21 轮：上线前细节打磨（无障碍对比度 / 二级页面完成度 / 焦点细节）

> 时间：2026-08-13
> 范围：依据 `polish` 技能与 AGENTS.md 设计原则（「默认无障碍 WCAG 2.1 AA」「精炼 SaaS 质感」），在功能完整的前提下做最后一轮细节打磨，提高整体完成度。零功能/逻辑改动，仅呈现层。
> 依据：系统核查发现三处「好与优秀之间」的细节——① `--text-faint` 令牌对比度未达 WCAG AA（浅色 `#8a97ab` 仅 **2.96:1**、深色 `#64748b` 仅 **3.58:1**，被广泛用于次级标签/提示/偏移/日出日落/图例注），违反项目自身「AA」原则；② 时差对照 SEO 着陆页用了 `prose` 类，但 `@tailwindcss/typography` **未安装**（`plugins: []`），h1/h2/表格退化为浏览器默认样式，在自然搜索入口页质感断层；③ 公开事件页把「事件时间」（本页最关键信息）放在低对比的 `text-faint`，且布局裸露。

### 完成内容

**① `src/app/globals.css` —— `--text-faint` 对比度校准（无障碍）**
- 浅色 `#8a97ab`(2.96:1) → `#64748b`(**4.76:1**，slate-500)；深色 `#64748b`(3.58:1) → `#7c8aa3`(**4.88:1**)。两者在各自抬升面（`--surface`）上均达 AA 正文 4.5:1，并保留「ink > muted > faint」三级层次（muted 仍为 ~7.6:1，差距清晰）与蓝色调中性色基调。打印令牌 `#666666` 原已达标，未动。

**② `src/app/globals.css` —— `:focus-visible` 焦点环贴合元素形状**
- 移除原 `:focus-visible` 中强制的 `border-radius: 4px`（在圆角控件上套方框、在 `rounded-full` chip 上尤其错位），保留 2px accent 描边 + offset；现代浏览器会让 outline 自然跟随元素自身圆角。

**③ `src/components/EventView.tsx` —— 事件页完成度**
- 关键数据上移：事件时间由 `text-faint` 改为 `font-mono font-semibold tabular-nums text-ink`（高对比、可读）；日期 + 时区缩写作次级行（muted）。
- 布局升级：列表包进 `surface` 卡片、行间发丝分隔；主地点（home）置顶并以暖色 ⌂ 标注（语义与主应用地点行一致）；无效态居中 + 图标；「打开原表」CTA 由 ghost 升为 primary。移除 ⌂ 上误导性的 `title`（原借用页面标题文案）。

**④ `src/app/[locale]/time-converter/[slug]/page.tsx` —— 着陆页完成度（SEO）**
- 去掉无效的 `prose` 类（插件未装，纯空转），改用令牌系统手写排版：h1 + eyebrow 小标签；时差作为视觉锚点的 surface 数字卡（大号等宽 + 说明句，非装饰性「hero metric」）；规范的对照表（表头 uppercase、`tabular-nums`、行间分隔、`scope="col"`）；FAQ 改 `divide-y` 列表。**全部 SEO 正文/结构/JSON-LD 原样保留**，仅替换呈现。

### 涉及文件

- `src/app/globals.css`
- `src/components/EventView.tsx`
- `src/app/[locale]/time-converter/[slug]/page.tsx`

### 验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript（`tsc --noEmit`） | ✅ 通过 |
| 单元测试（`vitest run`） | ✅ 172/172 通过 |
| ESLint（`next lint`） | ✅ 无警告 |
| 编译产物核验 | ✅ 抓取 `_next` CSS：确认 `--text-faint` 新值（浅 `#64748b` / 深 `#7c8aa3`）落地、`border-radius:4px` 已消失、`:focus-visible` outline 仍在 |
| SSR 渲染核验 | ✅ 着陆页 HTTP 200（含 h1/diff 卡/对照表新类名）；事件页有效/无效码均 HTTP 200，卡片结构 SSR 正确 |

### 设计说明

- **对比度先于「氛围」**：faint 变深会略微削弱「轻盈感」，但项目原则 #4 明确「默认无障碍 AA」，可读性优先于氛围——这是合规修正而非风格偏好。
- **未引入新依赖**：着陆页选择「手写令牌排版」而非安装 `@tailwindcss/typography`，保持零新增依赖并与全站令牌一致。

### 未做（主动克制）

- **emoji/unicode 图标体系替换**（💼🌤️🌙🖨️⌂✎ 等）：与「Linear/Notion 精炼质感」略有距离，但属较大改造（新依赖、全量重绘、11 语种风险），超出安全打磨范围；留待后续专题。

---

## 第 20 轮：性能优化（渲染热路径缓存 / 派生计算 memo / 拖拽合帧）

> 时间：2026-08-13
> 范围：依据 `optimize` 技能与 AGENTS.md 设计原则，针对「空闲期 CPU/GC 开销大、拖拽掉帧、搜索卡顿」三类性能问题做系统优化，不改变任何功能与可访问性行为。
> 依据：性能评估发现——核心网格与地点列表每 30s/60s 的 `now` tick 都触发**整树重渲染 + 全量重算**，其中多处是重复且昂贵的计算：① `nextDSTChange` 每次调用逐月×逐日探测 ~360 次 Luxon `DateTime` 构造，而 `PlacesPanel` 每个地点行每 30s 调一次（30 个地点 = 上万次分配/分钟）；② `timeZoneAbbrev` / `describeOffset` 每次都 `new Intl.DateTimeFormat`（构造昂贵）；③ `TimeGrid` 每个单元格每次渲染都 `new DateTime`（~168 列 × N 行，含 now tick，是网格最大 GC 源）；④ `prefers12Hour` 每次新建 `Set`；⑤ `CitySearch` 每次按键对全部 1200+ 城市反复 `.toLowerCase()`（~7200 次/查询 + filter+map 双趟）；⑥ 拖拽选区每个 `pointermove` 都 `document.elementFromPoint` + `setState`（快速拖动每秒数十次，单帧多次回流）。

### 优化策略（核心：缓存稳定结果 + 跳过无关重算 + 合帧）

1. **昂贵纯函数做结果/对象缓存**：DST 与时区缩写在「天/会话」尺度上几乎不变，但被每 tick 重算——改为按「时区+本地日」/「locale+时区」缓存，命中即 O(1)。`Intl.DateTimeFormat` 构造（解析 locale/选项、内部建表）是真正昂贵项，缓存**可复用的格式化器对象**、仅保留廉价 `formatToParts`。
2. **组件 memo + 派生值 useMemo**：让「重命名某一地点」不再重算所有兄弟行的 DST/日出/偏移；让 `now` tick 不再触发网格单元格的文字/周末重算（标签 memo 不含 `now` 依赖）。
3. **拖拽 `requestAnimationFrame` 合帧**：pointermove 高频触发，改为把指针位置记入 ref、每帧至多一次命中测试 + 一次 setState；pointerup 时**同步 flush** 最后位置，避免「快速移动→抬起」丢失末格。
4. **搜索预构建索引**：模块加载时一次性建小写字段索引，查询变单趟 `includes` 遍历，去掉重复 `toLowerCase` 与双趟 filter+map。

### 完成内容

**① `src/lib/time.ts` —— 热点纯函数缓存**
- `nextDSTChange`：拆出 `nextDSTChangeUncached`（原逐月×逐日探测逻辑不变），外层加「时区 + fromMs 本地日 + maxMonths」日级 `Map` 缓存（超 1000 项清空兜底）。结果在自然日内恒定，缓存安全；30 地点/分钟上万次分配 → 每时区每日一次真实计算。
- `timeZoneAbbrev`：新增 `tzAbbrevFormatter` 按 `locale|timeZone` 缓存 `Intl.DateTimeFormat`（可复用于任意日期），消除每次构造；locale 列表提为模块常量 `TZ_ABBREV_LOCALES`。
- `prefers12Hour`：国家集合提为模块级常量 `PREFERS_12HOUR_COUNTRIES`（原每次调用新建 `Set`，处于网格/列表热路径）。

**② `src/components/PlacesPanel.tsx` —— PlaceRow memo + 派生值集中 memo**
- `PlaceRow` 用 `memo` 包裹（传入的 store action、next-intl `t/tCom`、`useDialog` 的 `prompt/confirm` 均为稳定引用，默认浅比较即可正确跳过兄弟行）。
- 行内全部 Luxon/DST/日出/偏移/悬浮详情计算收进一个 `useMemo`（依赖 `now/nowRaw/p/hourFormat/home/t`），避免无关重渲染重复调用。

**③ `src/components/TimeGrid.tsx` —— 单元格标签 memo + Row memo + 拖拽合帧**
- `Row` 用 `memo` 包裹；props 由「闭包 `cellLabel`/`inHighlight`」改为「`hourFormat` + `highlight` 范围对象」，便于 memo 浅比较命中。
- 新增 `cellInfo` useMemo：对每列**仅构造一次 `DateTime`**，同时产出「显示文字 + 周末」；依赖 `columns/zone/countryCode/hourFormat`，**不含 `now`** → 每 60s now tick 命中缓存、零 `DateTime` 分配（原 ~168×N 次/渲染）。周末判定改为复用同一 `dt`（`getCountry().weekendDays.includes(dt.weekday)`），不再每格另开 `DateTime`。移除已无用的 `cellLabel`/`inHighlight`/`isWeekendAt` 引用。
- 拖拽选区改 rAF 合帧：`dragPtRef`/`dragRafRef`/`dragEndMsRef` 三 ref；`onPointerMove` 记位置 + 每帧至多一次命中测试/setState；`onPointerUp` 取消挂起 rAF 后**同步 flush** 最后指针位置到 `dragEndMsRef`，并以 ref（而非异步未更新的 state）作为最终 end 计算选区，杜绝末格丢失；新增卸载时 `cancelAnimationFrame` 清理 effect。

**④ `src/components/CitySearch.tsx` —— 搜索索引 + 偏移格式化器缓存**
- 模块级 `SEARCH_INDEX`：加载时一次性预计算每城市的 6 个小写字段；查询改单趟 `for...of` + 按字段优先级（名字<国家<时区/id）直接 push，去掉 filter+map 双趟与每次按键的重复 `toLowerCase`。
- `describeOffset` 走 `getOffsetFormatter` 按 `timeZone` 缓存 `Intl.DateTimeFormat`（shortOffset 格式器可跨日期复用）。

### 审查与修复（提交前自审，纠正 2 项）

1. **[关键] SelectionBar 违反 Rules of Hooks**：初版给 `eventCode` 加 `useMemo`，但放在了 early return（`if (!presence.mounted ...) return null`）**之后**，破坏 hook 调用顺序。鉴于该项收益边际（组件仅在有选区时挂载、encode 本身不贵）且与 ref/early-return 模式纠缠难正确放置，**回退为内联计算**以保正确性。
2. **[轻微] CitySearch 注释错位**：原 `describeOffset` 的 JSDoc（「格式化为 +8/-5 风格」）在重构后落到了 `offsetFormatterCache` 上方，误导读者。修正：把描述性 JSDoc 归位到 `describeOffset`，缓存块改用专门的缓存说明注释。

### 涉及文件

- `src/lib/time.ts`（DST/缩写/12h 三处缓存）
- `src/components/PlacesPanel.tsx`（PlaceRow memo + 派生值 memo）
- `src/components/TimeGrid.tsx`（单元格标签 memo + Row memo + 拖拽 rAF 合帧）
- `src/components/CitySearch.tsx`（搜索索引 + 偏移格式化器缓存）

### 验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript 类型检查（`tsc --noEmit`） | ✅ 通过 |
| 单元测试（`vitest`） | ✅ 172/172 通过（含 time 31 / grid 15） |
| ESLint（`next lint`） | ✅ 无警告或错误 |
| 生产构建（`next build`） | ✅ 成功，305 个静态页面；首屏 JS 体积未增 |

### 设计说明

- **正确性优先**：所有缓存键按「会改变结果的最粗粒度」取——DST 按「本地日」（同日内下一次切换恒定）、缩写/偏移按「格式器对象」（跨日期复用、随日期变化由 `formatToParts` 自身处理），无一处牺牲精度。
- **零功能改动**：DST 判定、周末、选区、搜索排序、偏移显示逻辑与输出完全一致；纯计算函数 `nextDSTChangeUncached` 与原逐月×逐日算法逐行保留，仅外包缓存层。
- **未做（主动克制）**：未给 `SelectionBar` 强加 memo（hooks 顺序风险 > 收益）；未虚拟化地点列表（≤30 行无必要）；未改 `useNow` 轮询频率（时钟精度需求优先）。

## 第 19 轮：健壮性加固（错误处理 / 空状态 / 边界场景）

> 时间：2026-08-12
> 范围：依据 `harden` 技能与 AGENTS.md 设计原则，全站补齐页面错误处理、空状态与边界场景，让站点在生产现实中更稳健。
> 依据：审计发现——无任何 Next.js 路由边界文件（error/loading/not-found/global-error 全缺，未捕获渲染错误落 Next 默认英文页）；Google 日历叠加**所有失败都静默**（401/500/超时/断网用户毫无感知，叠加直接消失）；`fetchFreeBusy` 无超时/无取消/未防 `res.json()` 解析异常；`gcal-auth` 的 resolver 为模块级单例，并发授权会互相覆盖致 promise 永悬/错路由；`PrintExport` 失败 catch 为空、无 loading/防连点/超时；`Dialog` 堆叠会丢弃前一个 promise；地点数无上限（addPlace / 分享解码 / 事件码解码三处都不设限，畸形链接可致 168 列 × N 行渲染爆炸）；`renamePlace`/标签无长度上限；标签筛选清空时是空白列表；回访用户每次刷新都闪一下完整引导空状态（localStorage/URL 在 effect 里才恢复）；`CitySearch` 输入无 `maxLength`；`WorldClockWidget` 后台标签页仍 1s 轮询。

### 架构决策

1. **路由边界分层**：`[locale]/error.tsx`（client，在 layout 的 NextIntlClientProvider 内，可 `useTranslations`）捕获页面渲染错误并给「重试 / 刷新」；`[locale]/not-found.tsx`、`[locale]/loading.tsx`（server，`getTranslations()` 取 layout `setRequestLocale` 的 locale）补本地化 404 与骨架；`global-error.tsx` 兜底根布局崩溃——**自包含**（自带 `<html><body>`、内联样式、11 语言最小内联本地化字典，从 URL 首段推断 locale），不依赖任何 provider/令牌。
2. **极简 Toast（无依赖、无 Context）**：`src/lib/toast.ts` 模块级 pub/sub + `Toaster.tsx` 订阅渲染，在 `ThemeRegistry` 挂载一次。统一承接复制/导出/日历/上限等瞬时反馈，取代散落内联 flash；`role="alert"/"status"` 按类型播报、`prefers-reduced-motion` 友好、最多 4 条防刷屏。
3. **超时 ≠ 取消的语义分离**：`fetchFreeBusy` 把「内部超时」与「外部取消」合到同一 `AbortController`，但用 `timedOut` 标志区分——超时把 `AbortError` 转为描述性 `Error`（→ 调用方当真实失败报错+重试），外部取消照常抛 `AbortError`（→ 调用方静默，因为是自己卸载）。这样 15s 超时不再被误当「卸载取消」静默吞掉（否则 UI 卡 loading）。
4. **GCal 错误可见性**：`TimeGrid` 加 `gcalStatus`（idle/loading/error/disconnected）状态机——非 401 错误在网格上方显示**横幅 + 重试按钮**（重试计数器触发 effect 重跑），401 静默刷新失败则 `clearGcalSession` + toast 提示重连；不再「失败即静默消失」。
5. **上限单一数据源**：地点上限只在两处入口强制——store `addPlace`（返回 boolean，达上限 no-op）与 `shareUrl.decodeState`（截断到 `MAX_PLACES`）。事件页/事件 widget 都走 `decodeState`，故天然受保护，无需在渲染层重复截断。
6. **hydration 闪屏修复**：store 加 `restored` 标志，`useLocalPersist` 恢复完成（`finally`）置 true；`TimeGrid` 在 `!restored && places.length===0` 显示轻量骨架而非完整 `FirstUseEmptyState`。SSR 与首帧客户端都渲染骨架（初始态一致，无 hydration 不匹配），effect 跑完后一次性切到真实内容（React 18 批处理，无中间闪烁）。

### 完成内容

**① 路由边界（4 个新文件）**
- `[locale]/error.tsx`：捕获渲染错误，「重试 / 刷新」+ 错误 digest 显示 + `console.error` 留痕。
- `[locale]/loading.tsx`：路由切换骨架屏，`aria-busy`。
- `[locale]/not-found.tsx`：本地化 404 + 回首页（i18n `Link`）。
- `global-error.tsx`：根布局崩溃兜底，11 语言内联本地化、内联样式、自推断 locale。

**② 异步 / 功能错误处理**
- `gcal.ts`：`AbortController`+15s 超时、`content-type` 校验、`res.json()` try/catch、过滤 `NaN` 脏区间、可选 `signal`、`isAbortError()` 助手、超时转描述性错误。
- `TimeGrid.tsx`：取消式请求、`gcalStatus` 状态机、错误横幅+重试、401 失效 toast、401 刷新成功靠 store token 变化驱动 effect 重跑（不递归）。
- `gcal-auth.ts`：交互授权 / 静默刷新各加 in-flight 守卫——新请求先把挂起 resolver 按「取消」结算，杜绝并发覆盖致 promise 永悬/错路由。
- `GoogleCalendarConnect.tsx`：断开按钮加 loading/禁用态（原可连点）；错误走 toast。
- `PrintExport.tsx`：导出加 loading 态 + in-flight 防连点 + 12s 超时 + 成功/失败 toast（原 catch 为空）；超时用**手动 timer 控制**（成功/失败都 clearTimeout），避免 `Promise.race` 输家在已结算后再 reject 造成未处理拒绝。
- `Dialog.tsx`：`open` 时若已有挂起对话框，先按「取消」结算旧的（null/false），不再丢弃致 promise 永悬。

**③ 边界场景（上限与校验）**
- store：导出 `MAX_PLACES=30` / `MAX_CUSTOM_NAME_LEN=40` / `MAX_TAGS=6` / `MAX_TAG_LEN=20`；`addPlace` 返回 `boolean`（达上限 no-op）；`renamePlace` 截断超长名；`setPlaceTags` 截断每项+限数量+过滤空串；`setPlaces` 校验 `homeId` 在列表内（否则回退首项，防悬挂主地点）。
- `shareUrl.decodeState`：解码地点截断到 `MAX_PLACES`。
- 事件页 `event/[code]/page.tsx`：服务端校验 `code` 格式（base64url 字符集 + 长度上限），非法 `notFound()` 走本地化 404（与 time-converter 页一致）。

**④ 空状态 / 边缘态**
- `PlacesPanel.tsx`：标签筛选清空时的明确空状态 + 「清除筛选」按钮（原是空白列表）。
- `CitySearch.tsx`：`maxLength=60` + 达上限/重复时 toast 反馈。
- hydration 闪屏修复（见架构决策 6）。

**⑤ 韧性**
- `WorldClockWidget.tsx`：`document.hidden` 时暂停 1s 轮询、回前台对齐 `Date.now()`；畸形 `cities` 列表截断到 30。

**⑥ i18n（11 语言全量同步，键集一致）**
- 新增 `Errors`(4) / `NotFound`(3) / `Loading`(1) 三个命名空间；`Gcal` +3（retry/disconnected/overlayFailed）；`Places` +3（emptyFiltered/clearFilter/limitReached）；`PrintExport` +3（exporting/exportFailed/noTarget）；`Common` +1（close，供 Toast 关闭按钮无障碍标签）。译文人工撰写、CJK/西里尔母语自然。

### 审查与修复（提交前自审，纠正 3 项）

1. **[关键] 超时被误当「卸载取消」**：`fetchFreeBusy` 15s 超时 `controller.abort()` 使 fetch 抛 `AbortError`，而 `TimeGrid` catch 用 `isAbortError(e)` 静默 return → 超时后 UI 永久卡在 loading、无反馈。修正：加 `timedOut` 标志，超时把 `AbortError` 转为描述性 `Error("freebusy timeout")`；TimeGrid 据此走错误分支（横幅+toast+重试）。外部取消（卸载）仍抛 `AbortError` + TimeGrid 自有 controller 已 abort → 静默。
2. **[关键] PrintExport `Promise.race` 未处理拒绝**：`toPng` 先完成时，race 的超时 promise 仍会在 12s 后 reject 且无 handler → 控制台未处理拒绝。修正：改手动 timer 控制，成功/失败都 `clearTimeout`，杜绝迟到的拒绝。
3. **[轻微] Toast 关闭按钮无障碍**：`aria-label="×"` 读屏会念「乘号」。新增 `Common.close`（11 语言），Toaster 改用 `tCom("close")`。

### 涉及文件

- 新增 `src/app/[locale]/error.tsx`、`loading.tsx`、`not-found.tsx`、`src/app/global-error.tsx`（4 个路由边界）
- 新增 `src/lib/toast.ts`、`src/components/Toaster.tsx`（Toast 系统）
- 改 `src/lib/gcal.ts`、`src/lib/gcal-auth.ts`、`src/lib/shareUrl.ts`、`src/lib/useLocalPersist.ts`
- 改 `src/store/useWorldTimeStore.ts`（上限 + restored 标志）
- 改 `src/components/TimeGrid.tsx`、`GoogleCalendarConnect.tsx`、`PrintExport.tsx`、`Dialog.tsx`、`PlacesPanel.tsx`、`CitySearch.tsx`、`WorldClockWidget.tsx`、`ThemeRegistry.tsx`
- 改 `src/app/[locale]/event/[code]/page.tsx`（服务端 code 校验）
- 改 `messages/*.json`（11 语言，新增 4 命名空间 + 现有命名空间扩键）

### 验证

| 检查项 | 结果 |
| --- | --- |
| `npm run type-check`（tsc --noEmit） | ✅ 通过（0 错误） |
| `npm test`（vitest） | ✅ 172/172 通过 |
| `npm run lint`（next lint） | ✅ 无警告 / 错误 |
| `npm run build` | ✅ 成功；路由边界文件全部通过 App Router 构建期约束（global-error 自包含 html/body、error 为 client 等） |
| messages 键一致性 | ✅ 11 文件完全对齐（新增 Errors/NotFound/Loading + Gcal/Places/PrintExport/Common 扩键） |

### 未实现（设计取舍，留作后续）

- **ICS 导出 i18n 泄漏**（`lib/calendar.ts` 硬编码 "Meeting" + `nameEn`）：需把 locale 线程化注入 lib 并新增 key，属较大重构，单独处理风险更低。
- **localStorage schema 迁移**（`:v1`）：当前结构稳定，风险低。
- **localStorage / URL 写入防抖**：纯性能、低风险，非健壮性硬伤。

---

## 第 18 轮：移动端 / 触屏适配（首页核心体验）

> 时间：2026-08-12
> 范围：依据 `adapt` 技能与 AGENTS.md 设计上下文，对首页（核心体验）做移动端优先的响应式改造，并完成 3 轮自审修复。
> 依据：响应式成熟度审计——全站仅 12 处断点工具、零屏幕宽度媒体查询；核心网格仅横向滚动、地点列表面板手机端整宽常驻霸占视口、顶栏次要操作挤成一团、`SelectionBar` 7 个动作换行成高块、触控目标 24–28px（远低于 44px 建议）、`window.prompt/confirm` 在触屏 WebView 体验差、无 `pointer:coarse` / 安全区处理。

### 完成内容

**① 布局重排（手机端释放视口）**
- `PlacesPanel`：手机端改为可折叠手风琴，默认收起，把视口让给网格；带「地点 · N」计数与 ▾ 指示，`aria-expanded`/`aria-controls` 完整。桌面端仍是常驻 288px 侧栏，无任何变化（`md:flex` 保证）。
- 新增 `HeaderActions`：顶栏次要操作（语言/帮助/设置/主题/Google 日历）手机端折叠进「⋯」溢出菜单，桌面端内联不变。SSR 按桌面渲染避免 hydration 闪烁，挂载后用 `matchMedia` 切到对应外壳；操作只挂载一份，避免 `GoogleCalendarConnect` 等带状态组件重复挂载。
- `SelectionBar`：手机端时长独占一行 + 操作区单行横向滚动（7 个动作不再换行成高块），加底部安全区；桌面端右对齐换行不变。

**② 触控与可达性基底**
- `globals.css`：手机端 `.icon-btn` 放大到 40px、`.btn-sm` 放大到 ≈36px；全局去除 `-webkit-tap-highlight-color`、加 `:active` 按压反馈（缩放/下沉）；`(hover: none)` 下清除网格点击残留灰底；新增 `.safe-top/.safe-bottom/.safe-x` 与 `.btn-danger`。
- `layout.tsx`：开启 `viewportFit: "cover"`，让 `env(safe-area-inset-*)` 在全面屏生效。

**③ 应用内对话框替代原生 prompt（新增 `Dialog.tsx` + `useDialog` hook）**
- `window.prompt/confirm`（重命名/打标签/删除主城市）替换为令牌化对话框：手机端贴底抽屉、桌面端居中，`role="dialog" aria-modal`，遮罩/Esc/回车/自动聚焦预选。
- 复用已有 `Common.cancel/confirm`，仅新增 `Common.more`（11 语言全量翻译）。

**④ 网格可读性（`TimeGrid.tsx`）**
- 冻结城市名列在手机端最宽 38vw 并截断（包裹 `<span class="truncate">`，跨浏览器稳健），给小时格让空间；小时对照数字 9px→10px；横向滚动加 `overscroll-x-contain` 防滚动链。

### 三轮审查与修复

**第 1 轮（正确性）**：发现 `useDialog.close` 在 `setPending` updater 内调用副作用（StrictMode 下双调用隐患）、confirm 模式缺回车提交 → 已用 ref 镜像 pending 重写 close、整体包裹 `<form>` 使两种模式都支持回车提交。
**第 2 轮（无障碍）**：发现对话框缺焦点管理、`HeaderActions` 用 `role="menu"` 但子元素非 `menuitem` → 已实现「打开移入焦点 / 关闭归还触发元素焦点」、`role="menu"` 改为 `role="group"` + `aria-controls`/`aria-label`。
**第 3 轮（质量/边界）**：confirm 模式打开时焦点应落主按钮 → 用 `data-autofocus` 在 confirm 模式聚焦主按钮；移除冗余 `DialogActions` 子组件内联简化。

### 涉及文件

- 新增 `src/components/HeaderActions.tsx`（顶栏次要操作的响应式外壳）
- 新增 `src/components/Dialog.tsx`（`useDialog`：应用内 prompt/confirm）
- 改 `src/components/PlacesPanel.tsx`（手机端折叠手风琴 + 触控目标 + 接入对话框）
- 改 `src/components/SelectionBar.tsx`（手机端单行横滚 + 安全区）
- 改 `src/components/TimeGrid.tsx`（冻结列截断 + 滚动容纳 + 字号）
- 改 `src/app/[locale]/page.tsx`（接入 `HeaderActions`、顶栏 `safe-top`、清理失效 import）
- 改 `src/app/[locale]/layout.tsx`（`viewportFit: cover`）
- 改 `src/app/globals.css`（移动端/触屏适配段、`.btn-danger`、按压反馈、安全区工具类）
- 改 `messages/*.json`（11 语言，`Common.more`）

### 验证

| 检查项 | 结果 |
| --- | --- |
| `npm run type-check` | 通过（0 错误） |
| `npm run lint` | 通过（0 警告/错误） |
| `npm test` | 172/172 通过 |
| `npm run build` | 通过；305 个静态页面成功生成 |
| 浏览器实测（390px 手机） | 顶栏「⋯ 更多」溢出菜单正常开合（`aria-expanded`）；`PlacesPanel` 折叠/展开；重命名/删除对话框 `role=dialog`、输入框预填聚焦全选、回车提交、Esc 取消、关闭后焦点归还触发按钮 |
| 浏览器实测（1280px 桌面） | 侧栏 + 内联操作恢复，无「⋯」、无折叠开关，布局与改造前一致 |
| 多语言（`/zh` CJK、`/ru` Cyrillic） | 「更多 / Ещё」「地点 / Места」本地化正确，长西里尔文本不破版 |
| 控制台 | 0 错误 0 警告（含无 hydration 不匹配） |

### 未实现（设计取舍，非 Bug）

- **网格横向滚动模型保持不变**：7×24 高密度时间网格用「冻结首列 + 横向滚动」是日历类应用的标准移动做法（AGENTS.md「clarity over cleverness」），仅提升可读性，未强行改成竖排列破坏心智模型。
- **`title` 悬浮提示**（UTC 偏移/DST 详情）触屏不可见，但关键信息（当前时间、偏移、缩写）本就内联可见，构建纯触屏 tooltip 基础设施性价比低，留作后续。
- **对话框焦点陷阱（Tab 循环）**：当前为「焦点移入 + 归还 + Esc + 遮罩 + aria-modal」，已满足主要无障碍需求；完整 Tab 循环陷阱未实现，留作后续增强。

## 第 17 轮：首次使用体验（Onboarding）优化

> 时间：2026-08-12
> 范围：依据 onboard 技能与 AGENTS.md 设计上下文，为空白首屏补上价值引导与首步路径，并补齐渐进式发现与应用内帮助。全程不阻塞、可跳过、11 语言同步。
> 依据：审计发现——首次访客落到完全空白的工具：无价值主张、无首步指引，仅两行淡灰空状态文案（`Places.empty` / `Grid.empty`）；核心「加城市→看热力图→拖拽找重叠」机制不可发现；快捷键已实现但不可见（`KeyboardShortcuts` 渲染 null）；无任何应用内帮助。需在「温暖但不拖慢」前提下尽快把访客送到价值点。

### 完成内容

**① 首屏富空状态（核心）**
- 替换 TimeGrid 原一行 `Grid.empty` 文案，改为首屏教学 + 一步到位 CTA：温暖主标题 + 一行价值说明 + 一键起始预设 + 指向搜索框的轻提示。
- 「从我的时区开始」：用 `Intl.DateTimeFormat().resolvedOptions().timeZone` 探测访客时区 → 匹配数据集城市 → 配上纽约/伦敦（去重取前 3），一点即填入，网格/热力图/拖拽立刻全亮；时区不在数据集时回退纯三巨头。
- 「世界金融时钟」：纽约·伦敦·东京（follow-the-sun 三件套）。

**② 失效工具条自动隐藏**
- 无城市时图例/日期跳转/游标/打印工具条整体隐藏（抽出 client 组件 `GridToolbar` 自管理），首城加入即恢复，让首屏 CTA 聚焦。

**③ 拖拽选区上下文提示（渐进式发现）**
- 有城市、但用户从未做过选区时浮现一次「横向拖动选会议时间」；localStorage 记忆已看（`worldtime:onboarding.dragHintSeen`），只出现一次；首次做出选区后自动消失；可手动「知道了」关闭。

**④ 应用内「? 提示」帮助浮层（常驻）**
- 顶栏新增 `?` 入口，紧凑无障碍浮层：三步上手 + 颜色图例（复用 `HeatmapLegend`）+ 键盘快捷键（显式呈现此前不可见的 Delete / Esc / Ctrl+Enter）。ESC / 外部点击关闭、焦点可见。

**⑤ 11 语言同步（i18n）**
- 新增 `Onboarding`（9 键）+ `Help`（14 键）命名空间，11 文件键集一致；CJK / 西里尔母语自然表达，容器弹性容文本膨胀。

### 涉及文件

- 新增 `src/lib/onboardingFlags.ts`（轻量 typed localStorage 记忆，独立 key `worldtime:onboarding`）
- 新增 `src/data/starterSets.ts`（起始城市预设，按 `CITY_BY_ID` 解析、缺失自动跳过）
- 新增 `src/components/FirstUseEmptyState.tsx`（首屏富空状态 + 时区探测）
- 新增 `src/components/DragHintCoachmark.tsx`（一次性拖拽上下文提示）
- 新增 `src/components/HelpPopover.tsx`（帮助 / 快捷键 / 图例浮层）
- 新增 `src/components/GridToolbar.tsx`（空状态自隐藏工具条）
- 改 `src/components/TimeGrid.tsx`（空状态分支接入 `FirstUseEmptyState`，移除已无用的 `Grid` 命名空间 use）
- 改 `src/app/[locale]/page.tsx`（顶栏加 `HelpPopover`；主区换 `GridToolbar` + 相对容器包裹 `TimeGrid` 与 `DragHintCoachmark`）
- 改 `src/app/globals.css`（新增 `.kbd` 键帽组件类）
- 改 `messages/*.json`（11 语言，新增 `Onboarding` + `Help` 命名空间）

### 验证

| 检查项 | 结果 |
| --- | --- |
| JSON 合法性 | ✅ 11 文件全部合法 |
| 键集一致性 | ✅ `Onboarding` 9 键 + `Help` 14 键，11 语言与 en 完全对齐 |
| 起始城市 id | ✅ `us-new-york` / `gb-london` / `jp-tokyo` 唯一存在，可解析 |
| `npm run type-check`（tsc --noEmit） | ✅ 通过 |
| ESLint（`next lint`） | ✅ 无警告 / 错误 |
| 单元测试（`vitest`） | ✅ 172/172 通过 |
| 生产构建（`next build`） | ✅ 成功，305 个静态页面（11 语言全覆盖） |

### 设计说明

- **刻意选渐进式发现而非强制多步教学遮罩**：AGENTS.md「温暖但不拖慢」——强制 tour 会阻塞专家、违背 calm density。改用「富空状态 + 恰好可用时的一次性提示 + 常驻帮助」三层，零阻塞。
- **全程可跳过、永不重复打扰**：一次性提示由 localStorage 记忆，尊重已关闭选择；SSR 默认不显示，挂载后判定，避免水合不一致。
- **只用现有语义令牌**（`surface` / `accent` / `chip` / `btn` / `icon-btn` / `text-muted` 等），不引入新设计系统；无障碍：语义按钮、ARIA、浮层 ESC / 焦点、尊重 `prefers-reduced-motion`。
- **`Grid.empty` 键保留未删**：虽不再渲染，留在 messages 中无害（`Places.empty` 仍在用），避免影响其他潜在引用。

---

## 第 16 轮：界面文案清晰度优化（按钮 / 提示 / 错误信息）

> 时间：2026-08-12
> 范围：依据 clarify 技能，对全部 11 个语言的按钮、提示与错误文案做清晰度/自然度优化；随后对改动做自查并修复 4 项遗留问题。目标契合 AGENTS.md「immediately legible / 避免行话 / 友好但精准」。
> 依据：原文案存在多处行话（"overlay"、"worst status wins"、"DST"）、死胡同式空状态（"No results"）、含糊确认（"Remove the home place?"），以及一个真实 bug（事件链接失效时误显示正常文案）。

### 完成内容

**文案优化（11 语言同步）**
- 按钮/CTA：`Connect & overlay` → `Connect Google Calendar`（去行话）；已连接状态拆分为状态标签 `Connected` + 新动作 tooltip `Disconnect Google Calendar`。
- 提示/对话框：重命名、标签弹窗由裸标签改为完整指令并带示例；删除主地点确认 `Remove the home place?` → 说清动作与后果的整句。
- 错误/空状态：搜索 `No results` → `No matching cities. Try a country or time zone name.`；Google 连接失败文案更口语；**修复 bug**：事件页链接失效新增 `Event.invalid`（"此事件链接无效或已过期"），`EventView` 失效分支改用它（原先误用 `description` 正常文案）。
- 热力图图例：`worst status wins` → 整句说明着色规则；`Some contactable / Someone resting` → 语法与含义都更清楚的 `Some outside work hours / Someone asleep`。

**自查后修复的 4 项问题**
1. `Cursor.disable` 不对称：`enable`="Show time marker" 而 `disable`="Hide"。统一为 `Hide time marker`（与 enable 对称），11 语言同步。
2. 硬编码全角冒号（既有 i18n 缺陷）：`CursorBar.tsx`/`DateJump.tsx` 直接写了全角 `：`，拉丁/西里尔字母下排版突兀。改为把标点移入 messages（CJK 用全角 `：`，其余用半角 `:`），组件去除硬编码冒号。
3. DST 徽章字面量（既有不一致）：`PlacesPanel` 徽章硬编码 `"DST"`。新增 `Places.dstBadge`（CJK 用本地词「夏令时/夏時間/서머타임」，拉丁/西里尔保留通用缩写 `DST`），徽章改用 i18n key，tooltip 已拼写全称。
4. 过期本地快照：`.playwright-cli/` 为 gitignore 的本地调试产物（未跟踪、不入库），清理陈旧文件。

### 涉及文件

- `messages/*.json`（11 个语言文件，新增 `Gcal.disconnect`、`Event.invalid`、`Places.dstBadge` 三个键，每语言现 119 键且键集一致）
- `src/components/GoogleCalendarConnect.tsx`（已连接按钮 title 改用 `disconnect`）
- `src/components/EventView.tsx`（失效分支改用 `Event.invalid`）
- `src/components/CursorBar.tsx`（去除硬编码冒号）
- `src/components/DateJump.tsx`（去除硬编码冒号）
- `src/components/PlacesPanel.tsx`（DST 徽章改用 `dstBadge`）

### 验证

| 检查项 | 结果 |
| --- | --- |
| JSON 合法性 | 11 文件全部合法 |
| 键集一致性 | 11 语言各 119 键，与 en 完全一致（next-intl 无 fallback，缺键会在对应语言运行时抛错，故必须一致） |
| `npm run type-check`（tsc --noEmit） | 通过 |
| `npm run lint`（改动组件） | 通过（无警告/错误） |
| `npm test`（vitest） | 172/172 通过 |

## 第 15 轮：UI 视觉重构 —— 令牌化主题系统 + 精致工具质感

> 时间：2026-08-12
> 范围：将主应用页面从「灰色实用主义」整体重构为 Linear/Notion 级「精致工具」质感。架构核心是建立**语义令牌驱动的双主题系统**，替换 `globals.css` 中全部 `.dark !important` 覆盖 hack。覆盖整页：顶部导航、左侧地点面板、7×24 时间网格（主英雄区）、选区浮层操作栏、工具条、SEO 页脚容器。
> 依据：AGENTS.md「Design Context」明确要求——提升现有网格为 refined SaaS 质感，并把 `.dark !important` 类覆盖迁移为正式的**令牌主题系统（语义 CSS 变量）**。自审发现 `tailwind.config` 主题为空、`globals.css` 堆砌 `!important` 覆盖、整站 `bg-white/bg-gray-*` 单调且暖色缺位。

### 架构决策

1. **语义令牌驱动主题**：`globals.css` 的 `:root`（浅）/`.dark`（深）各声明一组语义 CSS 变量（分层表面 `--app-bg/--surface/--surface-inset/--surface-hover`、边框、带色文字 `--text/--text-muted/--text-faint`、主色蓝、暖色琥珀、热力图三色、选区、阴影/圆角）；`tailwind.config` 把它们映射成语义工具类（`bg-surface`/`text-muted`/`border-line`/`bg-warm-soft`…）。组件只消费令牌，深浅主题靠变量切换，彻底告别 `!important`。
2. **网格单元格由 `data-*` 属性驱动**：TimeGrid 已发射 `data-heat/data-now/data-selected/data-weekend/data-busy`，遂把热力/周末/选区/现在/忙碌的视觉全部集中到 globals.css 的令牌化规则；背景色优先级靠源码顺序（周末<热力<选区），选区额外 `!important` 以胜过更高特异性的 `:hover`。「现在」(琥珀左竖条) 与「忙碌」(斜纹) 用 `background-image` 叠加，与 `background-color` 天然共存。**热力图算法（`columnColor`）零改动**。
3. **统一控件系统**：`@layer components` 提供 `.btn/.btn-primary/.btn-ghost/.btn-sm/.icon-btn/.surface/.surface-inset/.chip/.input/.divider`，取代散落各处的 `rounded border px-2 hover:bg-gray-100` 内联组合，建立清晰层级（主按钮/幽灵按钮/图标按钮）。
4. **暖色克制、分层出深度**：琥珀 `#FBBF24` 仅用于「现在」指示线与主地点（契合 logo 中心点）；深度来自分层表面 + 发丝边 + 极淡阴影（非 glassmorphism）。浅色中性色微微偏冷暖白，避免纯黑纯白。
5. **无障碍内建**：`:focus-visible` 统一焦点环、热力图颜色与文字/斜纹冗余（非仅靠颜色）、`prefers-reduced-motion` 关闭进场动效、表格保留语义 `<th>/<td>`。
6. **子路由深色安全**：移除 `!important` hack 后，依赖它的子路由会回归。对 `/time-converter` 着陆页与 `EventView`/`EventWidget` 做最小语义令牌替换（`text-gray-*`→`text-muted/faint`、`bg-white`→`bg-surface`、`border`→`border-line`、`text-blue-600`→`text-accent`），文案/结构化数据/链接零改动。

### 改动清单

#### 删除
- `src/components/AnalogClock.tsx`：模拟时钟仅在地点面板使用；为修复城市名截断（窄面板下时钟挤占空间导致 `"N..."`）而移除后成为孤儿，删除清理。地点改以数字时间为唯一时钟表达。

#### 修改（视觉层，逻辑/测试 id/数据属性/i18n key 全部保留）
- `tailwind.config.ts`：语义颜色别名、字体系列（保留 CJK 回退）、`boxShadow`/`borderRadius` 令牌、`fade-up/fade-in` 关键帧。
- `src/app/globals.css`：整体重写——令牌块 + base 层（body/滚动条/焦点环/选区色）+ components 层（统一控件类）+ `.wt-grid` data 属性规则 + 进场动效 + 打印样式（令牌压回浅色）。修正了关于「选区 `!important`」的注释精度。
- `src/app/[locale]/page.tsx`：抬升粘性顶栏（品牌标+标语+控件组）、内凹网格主区、统一工具条；**SEO 页脚 100% 文案/hreflang/JSON-LD 保留**，仅重排容器与字号节奏。
- `src/components/TimeGrid.tsx`：表头/冻结列抬升表面；单元格去除内联 bg，改由 data 属性驱动；`cellLabel` 重构返回 `{primary, alt}`——**12 小时制下额外显示 24 小时对照（alt），24 小时制下为 null（修复原版始终冗余的双重数字）**；`animate-fade-in` 进场。
- `src/components/PlacesPanel.tsx`：UTC 参考卡、地点卡分层 + hover 阴影、主地点暖色底 + `⌂` 前缀 + **`sr-only`「Home」标签（无障碍：屏幕阅读器可读，`⌂` 标 `aria-hidden`）**；统一 `icon-btn` 操作行（去掉损害对比度的 `opacity-70` 弱化）；标签 chip。
- `src/components/SelectionBar.tsx`：底部浮动抬升卡，时长为英雄指标，导出按钮分级（`.ics` 主按钮/其余幽灵）。
- `src/components/HeatmapLegend.tsx`：令牌色块（所见即所得）+ 文字图例。
- 工具条组件（`CitySearch`/`CursorBar`/`DateJump`/`NowButton`/`ThemeToggle`/`SettingsPanel`/`PrintExport`/`LocaleSwitcher`/`GoogleCalendarConnect`）：统一采用 `.btn*/.icon-btn/.surface/.input/.chip`，下拉与菜单改 `surface + shadow`。
- `src/components/EventView.tsx`、`src/components/EventWidget.tsx`、`src/app/[locale]/time-converter/[slug]/page.tsx`：子路由深色安全令牌替换。
- `src/lib/heatmap.ts`：移除已废弃的 `heatBg()`（单元格背景改由 globals.css 的 `data-heat` 规则渲染），保留 `columnColor`/`heatLabel` 算法与类型。

### 验证

| 检查项 | 结果 |
| --- | --- |
| `npm run type-check` | 通过 |
| `npm run lint` | 通过（无警告/错误） |
| `npm test` | 172/172 通过 |
| 浅色/深色截图（AI 视觉分析） | 两主题均判定「精致/高级」；城市名清晰、琥珀「现在」线 + 热力 + 周末着色可见、对比度良好 |

### 设计取舍与遗留

- **模拟时钟移除**：为面板可读性牺牲装饰性指针时钟（数字时间仍为精确来源）。如需恢复，建议以更紧凑的形式（如悬停展开）回归，避免重新挤占城市名空间。
- **EventWidget 主题行为变更**：原 `bg-white` 经已删除的 `!important` hack 跟随深色；现改用令牌正确跟随主题（与自带 `dark` prop 的 `WorldClockWidget` 一致）。
- **`localHourAt` 保留**：UI 已不再调用，但 `grid.test.ts` 仍测试它，作为合理公共工具函数保留。
- **IAB 点击限制**：内嵌浏览器（IAB）中顶栏按钮（主题切换、设置）的程序化点击偶发不触发 React `onClick`（同一段会话中主题切换亦如此），系宿主 webview 行为而非代码回归；真实浏览器不受影响，组件渲染与可点击性经 DOM 快照确认无误。

---

## 第 14 轮：补全 SEO 文案 / 标题 / 结构化数据 / 图标素材

> 时间：2026-08-12
> 范围：在已完备的 SEO **基建层**（第 11 轮）之上，补全最薄弱的**可索引正文与文案素材**——首页/着陆页的功能·场景·FAQ 正文、关键词 meta 标题与描述、FAQPage/Organization 结构化数据、热门配对扩充、PWA 位图图标。
> 依据：自审发现首页正文仅 1 段引言+9 内链、着陆页正文极薄且 meta description 为小写片段、仅有 WebApplication 单一 JSON-LD、热门配对仅 9 组、manifest 仅 SVG 图标。

### 架构决策

1. **文案集中可审 + 幂等注入**：新增 `scripts/seo-content.mjs`（仿第 11 轮 `seo-messages.mjs`），把 11 语言的全部新键集中在一份 JS 数据对象里，循环注入到 `messages/*.json`。译文人工撰写（非机翻），结构/键位完全对齐。数组类文案（features/useCases/faq）用 next-intl 的 `t.raw()` 取原始数组、组件层 `.map` 渲染。
2. **JSON-LD 只加可核实类型**：首页加 `Organization`（实体识别）+ `FAQPage`（富结果），着陆页加 `FAQPage`；**不加 `WebSite/SearchAction`**——站点无搜索结果页，声明会触发 Google 警告；Organization 不编造 `sameAs` 社交账号（站点暂无官方社交主页，虚假 sameAs 损害可信度）。
3. **FAQ 时差用「绝对值+方向词」表述**：着陆页 FAQ Q1 模板含 `{offset}/{dir}` 占位符，组件层传 `formatOffset(Math.abs(diff))`（去前导 `+`）+ 方向词（dirAhead/dirBehind），避免「-12 落后」这类符号与方向词同时出现的语义冗余；各语言按自身语序重排占位符。
4. **配对扩充驱动 sitemap/内链**：`POPULAR_CITY_PAIRS` 5→16、`POPULAR_TZ_PAIRS` 4→8（共 24），sitemap 与首页/着陆页内链自动跟随 `buildLandingSlugs()`，单一数据源 DRY。新增 id 全部经 `CITY_BY_ID`/tz 表校验存在（测试断言）。
5. **位图图标由 SVG 栅格化**：`scripts/gen-icons.mjs` 用 sharp（已是 next 传递依赖，本轮登记为直接 devDep）把 `src/app/icon.svg` 渲染为 192/512（any）+ maskable（圆角改全出血 `rx=0`，mark 直径 ~62.5% 落在 maskable 80% 安全区内）。

### 改动清单

#### 新增
- `scripts/seo-content.mjs`：11 语言文案注入（App.homeTitle/homeDescription + Seo.features/useCases/faq + Landing.metaDescription/intro/faq/relatedTitle/dirAhead/dirBehind），幂等覆盖。
- `scripts/gen-icons.mjs`：SVG → PNG 栅格化（any 192/512 + maskable 192/512）。
- `public/icons/`：icon-192.png、icon-512.png、icon-192-maskable.png、icon-512-maskable.png。

#### 修改
- `src/lib/seo.ts`：扩充 `POPULAR_CITY_PAIRS`（→16）/`POPULAR_TZ_PAIRS`（→8）；新增 `faqPageJsonLd()`、`organizationJsonLd()`。
- `src/app/[locale]/layout.tsx`：首页 `title.default` 由品牌名改为关键词丰富的 `App.homeTitle`；`description` 改用 `App.homeDescription`（可见 `<h1>` 与品牌后缀模板仍用品牌名）。
- `src/app/[locale]/page.tsx`：footer 扩为「引言 + 核心功能(6) + 使用场景(5) + 常见问题(5) + 热门转换(24 内链)」；多挂 `organizationJsonLd` + `faqPageJsonLd`（保留 `webAppJsonLd`）。
- `src/app/[locale]/time-converter/[slug]/page.tsx`：`generateMetadata.description` 改用独立成句的 `Landing.metaDescription`；正文加 `intro` 关键词引言段、FAQ 模块（3 条，实时时差填充）、相关转换器互链（23 条，排除当前页）；多挂 `faqPageJsonLd`；新增 `interpFaq()`/`relatedConverterLinks()` 纯函数。
- `src/app/manifest.ts`：在 SVG 之外补充 4 个 PNG 图标（带 sizes/type/purpose）。
- `messages/*.json`（11）：新增 App.homeTitle/homeDescription、Seo.featuresTitle/features[6]、Seo.useCasesTitle/useCases[5]、Seo.faqTitle/faq[5]、Landing.metaDescription/intro/dirAhead/dirBehind/faqTitle/faq[3]/relatedTitle。
- `tests/lib/seo.test.ts`：+8 用例（buildLandingSlugs=24、城市对 id 全可解析、tz 缩写全可解析、slug 无重复、faqPageJsonLd/organizationJsonLd schema）。
- `package.json`：`sharp` 加入 devDependencies。

### 验证

| 检查项 | 结果 |
| --- | --- |
| `npm run type-check` | ✅ 通过 |
| `npm test` | ✅ 172/172（原 164 + 新增 8 SEO 用例） |
| `npm run lint` | ✅ 无警告/错误 |
| `npm run build` | ✅ 成功；sitemap 275 条（24 配对×11 + 11 首页） |
| messages 键一致性 | ✅ 11 文件完全对齐（shape 比对） |
| 静态 HTML 核验（首页 zh/en） | ✅ 关键词标题、新 meta description、4 个区块标题、3 类 JSON-LD（WebApplication/Organization/FAQPage 含 5 个 Question）、24 条内链 |
| 静态 HTML 核验（着陆页） | ✅ intro 段、FAQ（FAQPage JSON-LD）、相关转换器 23 互链、独立成句 description |
| FAQ 时差表述 | ✅ 跨 11 语言均为「绝对值 + 方向词」自然句（如 EN「London is 7 hours behind Beijing」、JA「7時間遅れています」、KO「7시간 뒤처집니다」），无符号冗余 |
| PNG 图标 | ✅ 4 文件落盘；manifest 声明 any(192/512)+maskable(192/512) |

### 设计说明与遗留

- **首页 `<title>` vs 可见 `<h1>` 分离**：`<title>` 用关键词丰富的 `homeTitle`（利于搜索），可见 `<h1>` 仍是品牌名 `WorldTime`（保持品牌识别），子路由品牌后缀模板（`%s | WorldTime`）不变。
- **OG 分享图保持英文**：Satori 默认字体无中文字形（已文档化），本轮不动；社交预览国际化是通行做法。
- **不加 `keywords` meta / `WebSite+SearchAction`**：前者现代 SEO 无价值，后者站点无搜索页会触发 Google 警告。
- **运行时核验用静态 HTML**：项目 `output:"standalone"`，`next start` 会因 standalone 配置服务到过期内容（Next 官方告警），故本轮运行时核验改为直接读取 `next build` 产出的预渲染静态 HTML（`.next/server/app/**.html`），即生产 ISR/SSG 的真实产物；生产部署走 `node .next/standalone/server.js`（Dockerfile 已配）。

### 提交与发布

- 工作在 `main` 分支进行。
- 提交内容：2 新脚本（seo-content.mjs / gen-icons.mjs）+ 4 新 PNG + 11 messages + 6 改造源码（seo.ts/layout/page/landing/manifest/test）+ package.json/lock + progress.md。

---

## 第 12 轮：Google 日历叠加接入真实 OAuth（替换 mock）

> 时间：2026-08-12
> 范围：需求 6.1「Google 日历叠加」从 mock 占位接入真实 Google OAuth + Calendar freebusy API，授权后网格显示用户真实忙碌时段。
> 依据：需求 6.1（P2 可选增强）；原 `GoogleCalendarConnect`/`TimeGrid` 的日历叠加为 mock（localStorage 标记 + 写死 10-11/14-15 色块），本轮替换为真实数据。

### 背景

需求 6.1 的日历叠加自 MVP 起即为 mock：`GoogleCalendarConnect` 仅往 localStorage 写一个布尔标记，`TimeGrid` 据此渲染主地点本地 10-11/14-15 的示意性色块，未接真实日历。本轮接入 Google Identity Services（GIS）Token Client 与 Calendar freebusy API，授权后拉取用户主日历真实空闲/忙碌区间并投影到网格列。

### 架构决策

1. **纯前端 Token Client（隐式授权），不引入后端**。项目为纯客户端架构（无 API 路由），需求 6.1 明确「不构成账户体系」。access token 约 1h 过期、无 refresh token，故采用 **静默刷新**：TimeGrid 调 freebusy 收到 401 时，用 `prompt:"none"` 无交互拿新 token（Google 会话还在则用户无感），失败才提示重连。Client Secret 纯前端方案用不上，不入项目。
2. **鉴权与 UI 解耦**：GIS 单例（token client、脚本就绪 Promise、回调 resolver）与连接/断开/静默刷新/恢复函数集中到 `src/lib/gcal-auth.ts`；freebusy 拉取与区间→列投影等纯逻辑放 `src/lib/gcal.ts`（可单测）；`GoogleCalendarConnect` 瘦身为纯 UI；`TimeGrid` 只消费。依赖方向：组件 → lib，无循环。
3. **token 存 sessionStorage 而非 localStorage**：标签关闭即失效，不构成长期凭据；scope 最小化为 `calendar.readonly`（只读）；断开时调 `revoke` 撤销远端授权。
4. **busy 投影与网格列语义严格对齐**：freebusy 返回的 ISO 绝对时刻投影到 column-start ms 集合，只插入真实存在的列（DST 日 23/25 列的非整点小时被自然跳过），与 `Row` 的 `busyMs.has(c.ms)` 精确匹配。
5. **scope 现实**：`calendar.readonly` 是 Google sensitive scope，freebusy 端点无更窄 scope；开发期用 consent screen Testing + 测试用户，正式公开需走 verification。

### 改动清单

#### 新增
- `src/lib/gcal.ts`：`GCAL_SCOPE`/`gcalClientId()`/`freeBusyWindow()`/`fetchFreeBusy()`（401 抛 `GcalUnauthorizedError`）/`busyRangesToMs()`。
- `src/lib/gcal-auth.ts`：`waitForGis()`（轮询脚本就绪）、`ensureTokenClient()`（单例）、`requestInteractiveAuth()`（首次连接）、`requestSilentRefresh()`（静默刷新）、`restoreGcalToken()`/`clearGcalSession()`/`disconnectGcal()`。
- `src/components/GisScript.tsx`：镜像 `ServiceWorkerRegister` 注入 `https://accounts.google.com/gsi/client`。
- `src/types/google-accounts.d.ts`：GIS `google.accounts.oauth2` 最小 ambient 类型。
- `tests/lib/gcal.test.ts`：8 用例覆盖 `busyRangesToMs`（空集/单列/相切不重叠/跨多列/半小时覆盖/幽灵 ms/多区间合并）与 `freeBusyWindow`。
- `.env.example`：`NEXT_PUBLIC_GOOGLE_CLIENT_ID` 占位 + 文档。

#### 修改
- `src/store/useWorldTimeStore.ts`：加 `gcalAccessToken` + `setGcalAccessToken`（不持久化）。
- `src/components/GoogleCalendarConnect.tsx`：重写为纯 UI，调 gcal-auth 函数；加 loading/error 态。
- `src/components/TimeGrid.tsx`：删 mock，加 freebusy effect（401 自动静默刷新）；`gcalBusyMs` 改为 `busyRangesToMs(busyRanges, columns)`。
- `src/app/[locale]/layout.tsx`：挂载 `<GisScript />`。
- `messages/*.json`（11 语言）：`Gcal` 加 `loading`/`error`。
- `Dockerfile`/`docker-compose.yml`：`NEXT_PUBLIC_*` 构建期 `ARG` 注入（此类变量构建期内联进 bundle，运行时再设无效）。

### 验证

- `npm run type-check`：干净通过。
- `npm test`：164 用例全过（含新增 gcal 8 项）。
- `npm run lint`：零警告。
- `npm run build`：成功，139 页生成。

### 审查与修复

逐文件审查后纠正一处 P2：静默刷新成功时 `requestSilentRefresh` 的 callback 已 `setGcalAccessToken(newToken)`，而该字段在 TimeGrid effect 依赖数组中 → effect 会自动重跑拉取；原代码又递归 `run(fresh)`，导致一次刷新触发两次 freebusy 请求。修正为成功后直接 return，依赖 effect 重跑驱动。复测 type-check + 164 用例无回归。

### 安全

- Client Secret **未写入任何文件**（纯前端方案用不上，且建议在 Console 重置已暴露的密钥）。
- `.env.local`（含真实 Client ID）被 `.gitignore` 的 `.env*.local` 忽略，未进 git。
- Client ID 经 `NEXT_PUBLIC_` 内联进客户端 bundle（前端本就暴露，非机密）。

### 提交与发布

- 工作在 `main` 分支进行。
- 部署前置（人工，Console 侧）：OAuth client 的 Authorized JavaScript origins 加生产域名 + localhost；consent screen 加测试用户；重置 Client Secret。
- 生产构建：`NEXT_PUBLIC_*` 必须在 Docker 构建期注入（已配 `build.args`），光运行时设无效。

---

## 第 11 轮：SEO 基建层全量补齐

> 时间：2026-08-11
> 范围：补齐此前缺失的 12 项 SEO 基础设施（sitemap / robots / metadataBase / hreflang / OpenGraph / Twitter Card / OG 图 / JSON-LD / widget noindex / web manifest / 首页文案 / viewport 导出）。
> 依据：项目 SEO 评估（地基良好，但"SEO 基建层"几乎为空，真实成熟度约 45–55 分）。

### 背景

前 10 轮已建立 SSR + next-intl 11 语言 + 专门 SEO 着陆页（`time-converter/[slug]`）的良好地基，但驱动排名的核心 SEO 基建缺失：搜索引擎无法发现长尾页（无 sitemap）、无爬虫指令（无 robots）、11 语言版本互相重复且不收束（无 canonical/hreflang）、社交分享无预览（无 OG/Twitter）、无结构化数据（无 JSON-LD）、嵌入页与主站争抢排名（widget 未 noindex）、有 SW 却无 PWA manifest、首页可索引正文过薄等。本轮系统性补齐这 12 项。

### 架构决策

把所有可在构建期确定的 SEO 派生数据抽为纯函数 `src/lib/seo.ts`（站点 URL、hreflang alternates、OpenGraph 对象、JSON-LD、热门配对枚举），使其可在 `tests/lib/seo.test.ts` 中脱离 Next 运行时单元测试；各路由的 `generateMetadata` 与 `sitemap.ts` / `robots.ts` 只做薄封装。`POPULAR_CITY_PAIRS` / `POPULAR_TZ_PAIRS` 从着陆页抽离为单一数据源，供 `page.tsx`、`sitemap.ts`、首页内链区三处复用，消除重复维护。

### 修复清单

#### 1. 新增 `src/lib/seo.ts`（纯 SEO 助手）
- `getSiteUrl()`：读取 `NEXT_PUBLIC_SITE_URL` 环境变量（生产须配置真实域名），回退占位 `https://worldtime.app`，裁掉末尾斜杠。
- `localeUrl(locale, path)`：拼某语言绝对 URL。
- `buildAlternates(locale, path)`：生成 canonical + 全语言 hreflang（含 `x-default` → 默认语言）。
- `buildOpenGraph(locale, {...})`：生成 OG 对象（type/locale/siteName/title/description/url），返回类型交推断使 `type` 为字面量 `"website"`。
- `LOCALE_OG_MAP`：locale → `og:locale`（`language_REGION`）。
- `POPULAR_CITY_PAIRS` / `POPULAR_TZ_PAIRS` / `buildLandingSlugs()`：热门配对单一数据源。
- `webAppJsonLd({...})`：`WebApplication` 结构化数据（含免费 Offer）。

#### 2. 新增 `tests/lib/seo.test.ts`（+17 用例）
- 覆盖 `getSiteUrl`（环境变量/回退/末尾斜杠）、`localeUrl`（首页/子路径）、`buildAlternates`（canonical/全语言/x-default）、`buildOpenGraph`（字段完备 + 11 语言 og:locale 映射）、`buildLandingSlugs`（数量/slug 格式/`--` 分隔符）、`webAppJsonLd`（schema 字段）。

#### 3. 新增 `src/app/sitemap.ts`（`/sitemap.xml`）
- 110 条：首页 × 11 语言 + 9 个热门配对 × 11 语言，每条附全语言 `xhtml:link` hreflang alternates，把 11 语言版本收束到同一对照页。路径含 `.xml` 被 middleware matcher 排除，直接由 Next 提供服务。

#### 4. 新增 `src/app/robots.ts`（`/robots.txt`）
- 放行 `/`，禁止 `/widget/` 与 `/event/`（嵌入页防关键词蚕食；事件页 URL 为 base64 状态、无稳定 canonical、抓取面无限）。声明 sitemap 与 host。

#### 5. 新增 `src/app/manifest.ts`（`/manifest.webmanifest`）
- PWA 清单（项目已注册 SW）。名称/简称/描述/start_url/display/theme_color(#2563eb)/background_color/icons(favicon)。PNG 多尺寸图标作为后续可选增强。

#### 6. 新增 `src/app/[locale]/opengraph-image.tsx`（OG 分享图）
- 1200×630 PNG，`next/og` ImageResponse 渲染。**刻意放置在 `[locale]` 段内**：OG 图路由无扩展名，放根段会被 next-intl 中间件拦截重定向；置于 `[locale]` 段则作为合法 locale 路由放行。文案仅用英文（Satori 默认字体不含中文字形），由 Next 自动注入到所有 `[locale]` 子路由 `og:image`。

#### 7. 新增 `src/components/JsonLd.tsx`
- 通用 `<script type="application/ld+json">` 注入组件，供各页注入结构化数据。

#### 8. 改造 `src/app/[locale]/layout.tsx`
- 新增 `export const viewport`（Next 15 起 `themeColor` 须从 metadata 迁出）：`width/initialScale` + 浅/深 `themeColor`。
- `generateMetadata`：补 `metadataBase`、`title.default + template`（子路由仅声明页面名，品牌后缀由模板统一追加）、`applicationName`、首页 `alternates`（canonical + hreflang）、`openGraph`、`twitter: summary_large_image`、`manifest`、`icons`。

#### 9. 改造首页 `src/app/[locale]/page.tsx`（元数据继承自 layout，已是正确首页 canonical/OG）
- 新增服务端渲染的 `<footer>` SEO 区：本地化关键词导向文案（`Seo.introTitle` / `introBody`）+ 「热门时区转换」内链列表（用 next-intl `Link` 指向 9 个热门配对，当前语言）。增强可索引正文与站内链接权重传递。
- 注入 `WebApplication` JSON-LD。

#### 10. 改造 `src/app/[locale]/time-converter/[slug]/page.tsx`
- 删除内联 `POPULAR_*`，改从 `@/lib/seo` 导入（DRY）。
- `generateMetadata`：title 走模板（`${a} ↔ ${b} · 时区转换` → 自动追加 `| WorldTime`）；强化 description；补 `alternates`（per-slug 全语言 hreflang）与 `openGraph`。
- 注入 per-pair `WebApplication` JSON-LD。

#### 11. 改造事件页与 widget 页（noindex）
- `event/[code]/page.tsx`：`robots: { index:false, follow:false }` + 同 code 全语言 `alternates`（仍可被分享后识别语言版本，但不入索引）。
- `widget/event`、`widget/world-clock`：`robots: { index:false, follow:false }`，title 用 `{ absolute }` 跳过模板（避免与品牌后缀重复）。

#### 12. 强化文案（11 个 `messages/*.json`，脚本 `scripts/seo-messages.mjs` 一次性注入，幂等）
- 新增 `Seo` 命名空间（`introTitle` / `introBody` / `popularTitle`，各语言本地化关键词文案）。
- 强化 `Landing.description` 为关键词更丰富的版本（实时时差/偏移/逐小时对照/DST 感知）。
- 11 文件 × 21 命名空间完全对齐（原 20 + Seo）。

### 验证

| 检查项 | 结果 |
| --- | --- |
| 单元测试（`npm test`） | ✅ 156/156 通过（原 139 + 新增 17 SEO 用例） |
| TypeScript 类型检查（`tsc --noEmit`） | ✅ 通过 |
| ESLint（`next lint`） | ✅ 无警告/错误 |
| 生产构建（`next build`） | ✅ 138 个静态页（原 135 + sitemap/robots/manifest 三个元路由；OG 图为按需 ƒ 路由） |
| messages 键结构一致性 | ✅ 11 文件 × 21 命名空间完全对齐 |
| 运行时 head 核验（`next start` + curl） | ✅ 首页含 viewport/theme-color/title/description/application-name/manifest/canonical/全语言 hreflang/og:*/twitter:*/JSON-LD |
| OG 图运行时 | ✅ `/zh/opengraph-image` 返回 200 `image/png` |
| 着陆页 title/canonical/hreflang | ✅ `Beijing ↔ New York · 时区转换 \| WorldTime`、per-slug canonical、同 slug 全语言 hreflang |
| widget/event noindex | ✅ 二者均输出 `<meta name="robots" content="noindex, nofollow">` |
| sitemap.xml | ✅ 110 条，含 `xhtml:link` hreflang alternates |
| robots.txt | ✅ Allow / + Disallow /widget/ /event/ + Sitemap/Host |

### 设计说明与遗留

- **站点域名**：`metadataBase` / canonical / sitemap 走 `NEXT_PUBLIC_SITE_URL` 环境变量，回退占位 `https://worldtime.app`。**生产部署须设置该环境变量为真实域名**，否则 canonical/sitemap 会指向占位域。
- **OG 图置于 `[locale]` 段**：因 OG 图路由无扩展名，放根段会被 next-intl 中间件拦截；放 `[locale]` 段作为合法 locale 路由放行。内容与语言无关（英文品牌图），按 locale 参数生成（11 份相同图，可接受）。
- **event 页 noindex**：事件 URL 为 base64 状态、无稳定 canonical、抓取面无限，故禁止索引；robots.txt 同步禁止 `/event/`。仍输出同 code 的 hreflang 以备分享后识别。
- **manifest 图标**：暂复用 `favicon.ico`（`image/x-icon`）。多尺寸 PNG 图标作为可选后续增强（不影响 manifest 有效性）。
- **OG 图字体**：Satori 默认字体不含中文字形，故 OG 图仅用英文文案（社交预览国际化通行做法）。

### 自审纠正记录

提交前对全部未提交更改做了逐文件运行时核验，纠正了两处：

1. **[关键] favicon 404 + 移位**：原 `src/app/[locale]/favicon.ico` 因 Next 的 `favicon.ico` 约定只在 `app/` 根目录生效，实际 `/favicon.ico` 返回 404（且在 layout 显式加了 `icons` 引用后变成可见的坏链接）。修正：`git mv` 移到 `src/app/favicon.ico`（app 根），并移除 layout 的显式 `icons` 字段改由 Next 根 favicon 约定自动注入。核验：`/favicon.ico` → 200 `image/x-icon`，`<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16"/>`。
2. **[关键] 着陆页/事件页 og:image 缺失**：Next.js 中 `openGraph` 字段在子页面显式设置时**整体替换**父段而非浅合并，导致 `[locale]` 段的 file-based og 图无法传递到覆盖了 `openGraph` 的页面（着陆页、事件页实测无 `og:image`）。修正：在 `buildOpenGraph` 显式注入 `images`（引用 `/{locale}/opengraph-image` 路由，经 metadataBase 解析为绝对 URL），并把尺寸/alt 抽为 `OG_IMAGE` 常量供 opengraph-image.tsx 复用（单一数据源）。核验：首页/着陆/事件/widget 五类页面均输出 `og:image`，首页无重复（1 条）。
3. **[轻微] OG 图 emoji 跨环境渲染风险**：OG 图原含 🌍⏱️🗓️，本机（Windows）构建渲染正常，但 OG 图是**运行时动态生成**（`ƒ` 路由），项目经 Docker/Alpine 部署，Alpine 无 emoji 字体会渲染成豆腐块。移除 emoji，仅保留纯文本特性标签，保证品牌图跨环境一致渲染。
4. **[轻微] `buildOpenGraph` JSDoc 过时**：第 2 项修复改了代码（显式加 `images`）但漏同步注释——原注释仍称"OG 图由 file-based 自动注入，此处不重复"，与实现矛盾。已更正注释，说明为何必须显式注入。

### 提交与发布

- 工作在 `main` 分支进行。
- 提交内容：7 个新增文件（seo.ts / seo.test.ts / JsonLd.tsx / sitemap.ts / robots.ts / manifest.ts / opengraph-image.tsx）+ 6 个改造文件（layout/page/landing/event/2×widget）+ 11 个 messages + seo-messages.mjs 脚本 + progress.md。
- 提交后可推送到 `origin/main`。

---

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

---

## 第 13 轮：品牌与 SEO 视觉素材

> 时间：2026-08-12
> 范围：为 WorldTime 补齐统一的品牌标识、favicon、PWA 图标与社交分享视觉素材，并接入首页、Web App Manifest 和 Open Graph 图片。

### 完成内容

- 新增可缩放 SVG 品牌图标与横向 Logo：地球经纬线结合时钟指针，使用深海军蓝、亮蓝与金色秒针作为品牌色。
- 新增 `src/app/icon.svg`，由 Next.js 作为站点 favicon；PWA manifest 同步声明常规与 maskable SVG 图标。
- 生成并保存 1200×630 社交分享卡片与高清原始背景图：地球、时针与城市轨迹表达跨时区协作，并预留左侧文案安全区。
- 首页标题接入品牌图标；动态 Open Graph 图片增加与 favicon 一致的时钟标识，提升搜索结果和社交分享的一致性。

### 涉及文件

- `public/brand/worldtime-mark.svg`
- `public/brand/worldtime-logo.svg`
- `public/brand/worldtime-social-card.png`
- `public/brand/worldtime-social-background.png`
- `src/app/icon.svg`
- `src/app/manifest.ts`
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/opengraph-image.tsx`

### 验证

| 检查项 | 结果 |
| --- | --- |
| `npm run type-check` | 通过 |
| `npm test` | 164/164 通过 |
| `npm run build` | 通过；140 个静态页面成功生成 |

---

## 第 14 轮：动效与过渡体系（全面铺开）

> 时间：2026-08-13
> 范围：为全站加入有目的的动画与微交互——进场编排、弹层/浮层进出场、主题切换平滑、反馈微交互。纯 CSS + Tailwind，零新依赖；遵循品牌基调「温暖但绝不拖泥带水」。核心英雄时刻 = 时间网格进场。

### 完成内容

**基础层（动效令牌 + 退场基础设施）**
- 新增动效令牌：`--ease-out-quart/quint/expo`（指数级 ease-out）与 `--dur-fast/base/slow`（150/200/320ms），集中管理时长与缓动。
- 主题切换平滑：`body` 与 `.surface/.surface-inset` 加 `background-color/border-color/color` 过渡，明暗切换由硬切变为 200ms 色彩 morph（首次渲染无 from 态变化，不闪）。
- 选区单元格：`td[data-ms]` 的 transition 由 `background-color` 扩展为含 `box-shadow`，选区 inset 描边 ease-in。
- 新增 `.motion-pop/-overlay/-sheet/-toast/-fade` 数据态驱动的进出场组件类（基态=隐藏、`[data-state="enter"]`=显示），退场期统一 `pointer-events:none` 防误点。
- `@keyframes shimmer`（骨架扫光）与 `now-pulse`（现在指示呼吸）**直接定义于 globals.css**（不放在 tailwind.config——后者会被 Tailwind 按工具类使用情况 tree-shake，导致按名引用的动画无声失效）。
- 新增 `src/lib/usePresence.ts`：零依赖「穷人版 AnimatePresence」。挂载与 `open` 同步（保留既有焦点管理），关闭时延迟 `exitMs` 卸载以播退场；双 rAF 触发进场过渡。

**弹层/浮层进出场（9 处）**：Dialog（Promise 立即 resolve、卸载延迟、退场后归还焦点）、Toaster（逐条滑出，自动到期/手动关闭均走退场）、SelectionBar（清除时下滑）、CitySearch 下拉、SettingsPanel、HelpPopover、HeaderActions 移动菜单（含遮罩）、DragHintCoachmark、FirstUseEmptyState。

**进场编排**：header 淡入 → PlacesPanel 淡入 + 地点行 `nth-child` 错落级联 → 时间网格英雄进场（淡入 + 极轻微缩放 `grid-in`）→ 路由加载态由单调 `animate-pulse` 升级为 `.shimmer` 扫光。

**反馈微交互**：ThemeToggle 日月 emoji 交叉淡入 + 旋转；「现在」琥珀指示由 `background-image` 改为 `::before` 伪元素并附 2.4s 呼吸；地点行拖拽抬升（用独立 `scale` 属性与 dnd-kit 的 `transform` 叠加，不冲突，加深阴影）。

### 涉及文件

- 新增：`src/lib/usePresence.ts`
- `tailwind.config.ts`、`src/app/globals.css`
- `src/app/[locale]/page.tsx`、`src/app/[locale]/loading.tsx`
- `src/components/{Dialog,Toaster,SelectionBar,CitySearch,SettingsPanel,HelpPopover,HeaderActions,DragHintCoachmark,FirstUseEmptyState,ThemeToggle,TimeGrid,PlacesPanel}.tsx`

### 验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript 类型检查（`tsc --noEmit`） | ✅ 通过 |
| 单元测试（`vitest`） | ✅ 172/172 通过 |
| ESLint（`next lint`） | ✅ 无警告 |
| 生产构建（`next build`） | ✅ 成功，305 个静态页面 |
| 编译产物关键帧核验 | ✅ 抓取 `.next/static/css`，确认 `@keyframes shimmer/now-pulse/grid-in/fade-up/fade-in` 与全部 `.motion-*` 类均落地 |
| 客户端水合 | ✅ 浏览器确认正常水合（主题按钮渲染、store 恢复），`usePresence` 未引入水合错误 |

### 设计说明

- **克制纪律**：仅动 transform/opacity（高度变化本可用 `grid-template-rows`，但本轮未做列表删除退场）；不用 bounce/elastic；反馈类 ≤200ms、进场 ≤500ms；全部动效被既有全局 `prefers-reduced-motion` 开关覆盖。
- **抓到并修复的真实 bug**：`shimmer`/`now-pulse` 关键帧原放 tailwind.config，因被原始 CSS 按名引用（非 `animate-*` 工具类）被 tree-shake 掉——骨架不扫光、现在指示不呼吸。已移至 globals.css 直接定义并复查编译产物。

### 未做（主动克制）

- **地点行删除退场** 与 **Google 日历忙碌斜纹淡入**：前者与 dnd-kit 内联 `transform/transition`、`animate-fade-in` 的 `fill:both` 冲突；后者受限于网格逐格 `data-busy` 属性系统。两者都会给核心组件引入脆弱性而价值有限，故未强行加入。

---

## 第 23 轮：全站「科技 premium」视觉重设计 + 3 轮审查修复

> 时间：2026-08-13
> 范围：在既有令牌/动效体系上叠加「氛围层 + 玻璃/发光层 + 动效语言层」三层，全站（首页工作区 / time-converter 落地页 / 事件页 / 状态页 / widget / 页脚）统一升级为 Linear·Vercel·Raycast 式「科技 premium · 精炼」质感；**亮暗双主题同等全力打造**；零新增依赖。随后对全部未提交改动做 **3 轮独立审查**（正确性回归 / 无障碍·性能·i18n / 一致性·边界），发现并修复 4 个真实问题。
> 方向抉择：用户诉求「科技感 + 设计感 + 更多动画」与 AGENTS.md「温暖·友好·人文 / 拒绝冰冷终端」存在张力——经澄清选定**「科技 premium · 精炼」**（非赛博朋克霓虹、非冰冷终端），保留品牌蓝 + 琥珀暖色为前提注入发光/玻璃/动效。

### 架构决策

1. **三层叠加、不动网格内核**：①氛围层（`AtmosphereBackground`，固定全屏极光径向网格 + 点阵纹理 + 顶部光晕，缓慢漂移）②玻璃/发光层（顶栏/选区栏/浮层磨砂玻璃 + 主色发光描边）③动效语言层（扩展既有 `usePresence`/`animate-*`，新增进场/主题圆形揭示/现在线/错落）。**网格数据单元格保持冷静**（仅表头磨砂 + 现在线发光 + 行悬停发光），坚守 AGENTS.md「可读性第一」。
2. **令牌驱动、亮暗双写**：18 个新语义令牌（`--aurora-1/2/3`/`--grid-texture`/`--glass-bg/-border/-blur`/`--glow-accent/-warm`/`--shadow-glow/-glow-warm`/`--border-gradient`/`--text-gradient-from/-to`/`--dur-slower`/`--ease-in-out-quart`）在 `:root` 与 `.dark` 各声明一套，`tailwind.config` 映射为工具类。暗色作「秀场」略放开发光，亮色协调收敛。
3. **主题切换圆形揭示（原生 View Transitions API）**：新增 `useViewTransition`（feature-detect + try/catch 回退 + reduced-motion 跳过），`ThemeToggle` 以点击点为圆心写 `--vt-x/-y`，`::view-transition-new(root)` 做 clip-path 圆形扩散；`flushSync` 在回调内同步提交 next-themes 状态，确保过渡捕获真实 DOM 变化。所有分支保证 `setTheme` 执行——功能绝不丢失。
4. **状态界面统一抽取**：新增 `StateSurface`（居中玻璃卡 + scale-in 图标 + 渐变标题），统一 loading/error/not-found/事件失效态；`WorldClockWidget` 消除历史硬编码（`bg-slate-800/bg-white/text-gray-*`）改令牌驱动（根元素 `.dark` 类响应 `?theme=`）。

### 完成内容

**① 令牌 + 氛围层（`globals.css` + `tailwind.config.ts` + 新增 `AtmosphereBackground.tsx`）**
- 18 个亮暗双写令牌；6 个新 `@keyframes`（`aurora-drift`/`glow-breathe`/`gradient-pan`/`scan-sweep`/`orbit-slow`/`pulse-dot`，定义于 globals.css 防 tree-shake）；`animate-blur-in/-slide-in-left/-slide-down/-scale-in` 及 `aurora-drift/glow-breathe/gradient-pan` 工具类；`shadow-glow/-glow-warm` 阴影档。
- `AtmosphereBackground`（server 组件，纯 CSS，`fixed -z-10 pointer-events:none`，`reduced-motion` 归零、`.no-print` 隐藏）挂入 `layout.tsx`；首页根容器去 `bg-app` 使氛围层可见（`body` 仍铺 `--app-bg` 基底）。

**② 玻璃/发光组件类（`globals.css`）**
- `.surface-glass`（半透明 + `backdrop-filter` + 顶部高光 hairline）、`.glass-bar`（粘性栏 + 底部主色渐变发丝线 `::after`）、`.glow-hover`、`.live-dot`（脉冲点）、`.text-gradient`/`-flow`（`@supports background-clip:text` + 实色回退，CJK/降级安全）、`.brand-mark`（logo 主色 drop-shadow）、`.home-row`（主地点暖色 `::before` 发光导轨）。
- `.btn-primary:hover` 叠加 `--shadow-glow`；`.input:focus` 叠加主色外发光；`.shimmer` 升级为双带扫光；`.stagger > *` 通用错落（nth-child 50ms 步进，封顶第 8）。

**③ 主工作区**
- 顶栏：`glass-bar` + 品牌名 `text-gradient` + logo `brand-mark`，进场改 `animate-blur-in`。
- 选区栏：`motion-sheet surface-glass shadow-glow`（玻璃 + 主色发光）。
- 地点行：悬停 `shadow-glow`、主地点 `home-row` 暖色导轨；面板进场 `animate-slide-in-left`。
- 网格表头：`var(--glass-bg)` + `backdrop-filter`（frosted header，仅 ~8 个 th，成本可控）；「现在」线升级上下渐隐渐变 + 暖色外发光；工具条 `animate-fade-up`。

**④ 动效语言**
- `Reveal`（IntersectionObserver 滚动进场，SSR 安全 + reduced-motion 直显）；`useViewTransition`（主题圆形揭示）。落地于页脚、time-converter 章节、事件列表错落、各处进场。

**⑤ 次级界面**
- time-converter 落地页：玻璃 hero + 大号渐变时差数字 + 玻璃对照表（行悬停）+ 3 个渐变章节标题 + 滚动 `Reveal`。
- EventView：玻璃列表 + 错落进场 + 失效态接入 `StateSurface`。
- 状态页：loading/error/not-found 统一 `StateSurface`（loading 升级玻璃药丸 + shimmer）。
- widget：`WorldClockWidget`/`EventWidget` 令牌归一化 + 渐变标题。
- 页脚：`Reveal` 包裹 + intro 标题渐变 + 链接 transition。

### 3 轮审查发现并修复（4 项）

| # | 轮次 | 类别 | 问题 | 修复 |
| --- | --- | --- | --- | --- |
| 1 | R2·无障碍 | **对比度回归（关键）** | 亮色 `--text-gradient-to: #0284c7` 白底仅 **4.09:1**，未达 AA 4.5:1；被用于 14–16px 标题（品牌标题/小节/widget），且注释误标「≥4.5:1」 | 下沉为 `#0369a1`（sky-700，~5.9:1），两端均达 AA 正文；订正注释 |
| 2 | R3·动效 | **进出场过渡冲突** | `SelectionBar` 用 `motion-sheet surface-glass`，`.surface-glass` 的 `transition` 简写在源码中位于 `.motion-sheet` **之后**→ 覆盖后者，选区栏**丢失 opacity 淡入淡出**且时长 320→200ms（原 `motion-sheet surface` 因 `.surface` 在前而未受影响） | 移除 `.surface-glass` 基类的 `transition`（交还 motion-\* 接管；独立玻璃卡的主题切换由 View Transition 整体覆盖，无需自带 morph）；交互态过渡迁至 `.surface-glass-interactive` |
| 3 | R3·打印 | **打印半透明** | 网格表头改 `var(--glass-bg)` 后，打印块仅覆盖 `--surface` 未覆盖 `--glass-bg` → 表头/玻璃卡打印半透明 + 失效 backdrop-filter 脏污 | 打印 `:root` 补 `--glass-bg:#fff`/`--glass-border:#ccc`/`--shadow-glow:none`/`--shadow-glow-warm:none` |
| 4 | R3·无障碍 | **reduced-motion 闪隐** | `Reveal` 在 reduced-motion 下虽 `shown=true` 仍挂 `animate-fade-up`（`both` fill 的 opacity:0 起态）+ 内联 `animation-delay` → 带 `delay` 的 time-converter 章节在 delay 期间短暂闪隐 | 新增 `noMotion` state，reduced-motion 时**完全不挂动画类、不设 delay**，直接可见 |

> R1（正确性）未发现回归：`StateSurface`/`Reveal` 的 `<main>`/`<div>` 嵌套与 server/client 边界均正确；`flushSync` 在事件处理器内安全；`useViewTransition` 泛型 `<T,>` 合法；`vt-reveal` 的 `circle(150%)` 经核算可覆盖任意宽高比视口的对角线。thead 仅 ~8 个 `th`，`backdrop-filter` 成本可控。

### 涉及文件

- 新增：`src/components/AtmosphereBackground.tsx`、`src/components/Reveal.tsx`、`src/components/StateSurface.tsx`、`src/lib/useViewTransition.ts`
- 令牌/动效：`src/app/globals.css`、`tailwind.config.ts`
- 布局/页面：`src/app/[locale]/layout.tsx`、`src/app/[locale]/page.tsx`、`src/app/[locale]/loading.tsx`、`src/app/[locale]/error.tsx`、`src/app/[locale]/not-found.tsx`、`src/app/[locale]/time-converter/[slug]/page.tsx`
- 组件：`src/components/{ThemeToggle,SelectionBar,PlacesPanel,GridToolbar,EventView,EventWidget,WorldClockWidget}.tsx`

### 验证

| 检查项 | 结果 |
| --- | --- |
| TypeScript 类型检查（`tsc --noEmit`） | ✅ 通过 |
| 单元测试（`vitest`） | ✅ 172/172 通过 |
| ESLint（`next lint`） | ✅ 无警告 |
| 生产构建（`next build`） | ✅ 成功，305 个静态页面；First Load JS 共享 103 kB（持平，零新增依赖） |
| 浏览器计算样式核验 | ✅ 亮色：氛围层 `fixed/-z-10/pointer-events:none`、aurora 渐变 `rgba(37,99,235,.1)`、顶栏 `backdrop-filter: blur(14px) saturate(1.4)`、品牌名 `background-clip:text`、logo `drop-shadow(accent)`；落地页：玻璃 hero/对照表 `backdrop-filter`、渐变数字、3 个渐变章节标题 |
| reduced-motion / 打印 / 焦点 | ✅ 全局守卫归零 + `useViewTransition`/`Reveal` 侧判定；打印块补玻璃令牌；`:focus-visible` 叠加发光 |

### 设计说明 / 护栏

- **可读性第一**：氛围/玻璃/动效集中在外层铬与交互瞬间，网格数据区不加持续动画；热力图颜色仍与文字/图案冗余。
- **对比度**：渐变文字亮色两端 `#2563eb`(~5.2:1)/`#0369a1`(~5.9:1) 均 ≥ AA 正文；暗色端 `#60a5fa`/`#38bdf8` 远超。
- **性能**：`backdrop-filter` 仅用于顶栏/选区栏/网格表头（~8 th）/关键浮层；`will-change` 仅氛围两子层；纯 CSS 动画，无动效/状态库。
- **环境限制（诚实告知）**：主题切换的圆形揭示经 `flushSync + startViewTransition` 集成（文档推荐 + try/catch 回退），但本会话内置浏览器经自动化点击无法驱动 next-themes（连最简 `setTheme` 也不生效，原版同样）——系 IAB 对合成点击/存储沙盒的限制，非代码缺陷；真实浏览器点击会正常触发。

### 未做（主动克制 / 待决）

- **签名西文字体**（Inter/Sora/Geist + CJK 回退）：「设计感」另一高杠杆，但增体积/FOUT；默认不做，待用户拍板。
- **GridToolbar 玻璃化**：与顶栏玻璃相邻，为免「过度玻璃」与保对比，保留不透明 `bg-surface` + fade-up 进场。
- **选区创建一次性 sweep**：需 TimeGrid 内状态机配合，价值有限且触及核心组件，本轮未做（仅留 `scan-sweep` keyframe 备用）。
