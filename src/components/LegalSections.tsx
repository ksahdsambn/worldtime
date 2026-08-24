/**
 * 隐私政策 / 使用条款共用的分节正文渲染。
 * 长文阅读面（AGENTS.md：不玻璃化），h2 样式与 FAQ 页保持一致。
 */
export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export default function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="mt-8 space-y-8">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-base font-semibold text-ink">{section.heading}</h2>
          <div className="mt-2 space-y-3 leading-relaxed text-muted">
            {section.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
