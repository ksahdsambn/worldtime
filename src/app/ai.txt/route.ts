import { getSiteUrl } from "@/lib/seo";

export function GET() {
  const base = getSiteUrl();
  const body = `# WorldTime — AI crawler notes
# Preferred context: ${base}/llms.txt (llmstxt.org)

User-Agent: *
Allow: /

llms.txt: ${base}/llms.txt
llms-full.txt: ${base}/llms-full.txt
sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
