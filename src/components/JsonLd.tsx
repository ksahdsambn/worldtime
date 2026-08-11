/**
 * JSON-LD 结构化数据注入组件（第 11 轮）。
 *
 * 在服务端渲染为 `<script type="application/ld+json">`，供搜索引擎识别
 * 富结果类型（WebApplication / FAQPage / Event 等）。
 * 仅在服务端组件中使用；数据对象需为纯可序列化 JSON。
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
