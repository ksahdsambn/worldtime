# 开发进度记录

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
