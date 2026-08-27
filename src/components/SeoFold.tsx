/**
 * SEO 页脚折叠区块（第一期收缩）：原生 `<details>` / `<summary>`。
 *
 * - 内容直接写在页面文档里（SSR 渲染），禁用脚本后链接依然完整可索引；
 * - 默认收起；开关为原生可聚焦控件（键盘 Enter/Space 触发，读屏可感知
 *   details 的展开状态），不依赖任何脚本请求即可展开；
 * - 样式令牌：箭头用 CSS 三角形随 open 旋转（不以颜色为唯一载体）。
 */
type SeoFoldProps = {
  /** 折叠开关标题（如「更多城市」「全部时差对照」） */
  title: string;
  /** 所属分区的标题 id，供读屏关联上下文 */
  labelledBy?: string;
  /** 追加类名（如与分区标题并排一行时传 "!mt-0"） */
  className?: string;
  children: React.ReactNode;
};

export default function SeoFold({
  title,
  labelledBy,
  className,
  children,
}: SeoFoldProps) {
  return (
    <details
      className={`seo-fold${className ? ` ${className}` : ""}`}
      data-labelledby={labelledBy}
    >
      <summary className="seo-fold__summary">
        <span className="seo-fold__arrow" aria-hidden />
        {title}
      </summary>
      <div className="seo-fold__body">{children}</div>
    </details>
  );
}
