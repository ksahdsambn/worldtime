import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { routing } from "@/i18n/routing";
import { CITY_BY_ID } from "@/data/cities";
import { TIME_ZONE_ABBREVIATIONS } from "@/data/timeZoneAbbreviations";
import {
  getSiteUrl,
  localeUrl,
  buildAlternates,
  buildOpenGraph,
  buildLandingSlugs,
  POPULAR_CITY_PAIRS,
  POPULAR_TZ_PAIRS,
  LOCALE_OG_MAP,
  webAppJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
} from "@/lib/seo";

describe("getSiteUrl", () => {
  const ORIG = process.env.NEXT_PUBLIC_SITE_URL;
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIG;
  });

  it("未设环境变量时回退到占位域名", () => {
    expect(getSiteUrl()).toBe("https://worldtime.app");
  });
  it("读取环境变量并裁掉末尾斜杠", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com////";
    expect(getSiteUrl()).toBe("https://example.com");
  });
  it("空字符串环境变量回退", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    expect(getSiteUrl()).toBe("https://worldtime.app");
  });
});

describe("localeUrl", () => {
  it("首页路径（path 为空）", () => {
    expect(localeUrl("zh")).toBe(`${getSiteUrl()}/zh`);
  });
  it("带子路径（以 / 开头）", () => {
    expect(localeUrl("en", "/time-converter/EST--PST")).toBe(
      `${getSiteUrl()}/en/time-converter/EST--PST`,
    );
  });
  it("子路径不以 / 开头时自动补 /", () => {
    expect(localeUrl("ja", "time-converter/EST--PST")).toBe(
      `${getSiteUrl()}/ja/time-converter/EST--PST`,
    );
  });
});

describe("buildAlternates", () => {
  it("canonical 指向当前语言本页", () => {
    const a = buildAlternates("zh", "/time-converter/EST--PST");
    expect(a.canonical).toBe(`${getSiteUrl()}/zh/time-converter/EST--PST`);
  });
  it("languages 覆盖全部支持语言", () => {
    const a = buildAlternates("en");
    for (const l of routing.locales) {
      expect(a.languages?.[l]).toBe(`${getSiteUrl()}/${l}`);
    }
  });
  it("languages 包含 x-default 指向默认语言", () => {
    const a = buildAlternates("en");
    expect(a.languages?.["x-default"]).toBe(
      `${getSiteUrl()}/${routing.defaultLocale}`,
    );
  });
  it("首页（空 path）每语言 URL 不含多余斜杠", () => {
    const a = buildAlternates("zh");
    expect(a.canonical).toBe(`${getSiteUrl()}/zh`);
    expect(a.languages?.["en"]).toBe(`${getSiteUrl()}/en`);
  });
});

describe("buildOpenGraph", () => {
  it("含 type/locale/siteName/title/description/url/images", () => {
    const og = buildOpenGraph("ja", {
      title: "T",
      description: "D",
      path: "/time-converter/EST--PST",
    });
    expect(og.type).toBe("website");
    expect(og.locale).toBe("ja_JP");
    expect(og.siteName).toBe("WorldTime");
    expect(og.title).toBe("T");
    expect(og.url).toBe(`${getSiteUrl()}/ja/time-converter/EST--PST`);
    // images 必须显式存在：子页面覆盖 openGraph 时不继承 file-based og 图
    expect(og.images?.[0]?.url).toBe("/ja/opengraph-image");
    expect(og.images?.[0]?.width).toBe(1200);
    expect(og.images?.[0]?.height).toBe(630);
  });
  it("每个 locale 都能映射到 og:locale", () => {
    for (const l of routing.locales) {
      const og = buildOpenGraph(l, { title: "t", description: "d" });
      expect(LOCALE_OG_MAP[l]).toBeTruthy();
      expect(og.locale).toBe(LOCALE_OG_MAP[l]);
    }
  });
});

describe("buildLandingSlugs", () => {
  it("数量 = 城市对 + 时区对", () => {
    expect(buildLandingSlugs().length).toBe(
      POPULAR_CITY_PAIRS.length + POPULAR_TZ_PAIRS.length,
    );
  });
  it("第 14 轮扩充后共 24 条（16 城市对 + 8 时区对）", () => {
    expect(POPULAR_CITY_PAIRS.length).toBe(16);
    expect(POPULAR_TZ_PAIRS.length).toBe(8);
    expect(buildLandingSlugs()).toHaveLength(24);
  });
  it("城市对 slug 以 -- 分隔且保留城市 id 内的单连号", () => {
    const slugs = buildLandingSlugs();
    expect(slugs).toContain("cn-beijing--us-new-york");
    expect(slugs).toContain("us-los-angeles--de-berlin");
  });
  it("时区缩写对 slug 以 -- 分隔", () => {
    expect(buildLandingSlugs()).toContain("EST--PST");
  });
  it("全部 slug 恰好含一个 -- 分隔符", () => {
    for (const s of buildLandingSlugs()) {
      expect(s.split("--").length).toBe(2);
    }
  });
  it("每个热门城市对的 id 都能在 CITY_BY_ID 解析（防配对写错）", () => {
    for (const [a, b] of POPULAR_CITY_PAIRS) {
      expect(CITY_BY_ID[a], `unknown city id: ${a}`).toBeDefined();
      expect(CITY_BY_ID[b], `unknown city id: ${b}`).toBeDefined();
    }
  });
  it("每个热门时区缩写对都能在缩写表解析（防配对写错）", () => {
    const known = new Set(TIME_ZONE_ABBREVIATIONS.map((x) => x.abbr));
    for (const [a, b] of POPULAR_TZ_PAIRS) {
      expect(known.has(a), `unknown tz abbr: ${a}`).toBe(true);
      expect(known.has(b), `unknown tz abbr: ${b}`).toBe(true);
    }
  });
  it("热门 slug 无重复", () => {
    const slugs = buildLandingSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("webAppJsonLd", () => {
  it("产出 WebApplication 结构化数据", () => {
    const ld = webAppJsonLd({
      name: "WorldTime",
      url: "https://x/zh",
      description: "d",
    });
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebApplication");
    expect(ld.name).toBe("WorldTime");
    expect(ld.offers.price).toBe("0");
    expect(ld.operatingSystem).toContain("Web");
  });
});

describe("faqPageJsonLd", () => {
  it("产出 FAQPage 结构化数据，逐条映射 Question/AcceptedAnswer", () => {
    const ld = faqPageJsonLd([
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
    ]);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(2);
    expect(ld.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Q1?",
      acceptedAnswer: { "@type": "Answer", text: "A1" },
    });
  });
  it("空列表产出空 mainEntity（不抛错）", () => {
    const ld = faqPageJsonLd([]);
    expect(ld.mainEntity).toEqual([]);
  });
});

describe("organizationJsonLd", () => {
  it("产出 Organization 结构化数据，含 logo 且无虚假 sameAs", () => {
    const ld = organizationJsonLd({ url: "https://x/zh", name: "WorldTime" });
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("WorldTime");
    expect(ld.url).toBe("https://x/zh");
    expect(ld.logo).toContain("worldtime-mark.svg");
    expect(JSON.stringify(ld)).not.toContain("sameAs");
  });
  it("未传 name/logo 时回退默认值", () => {
    const ld = organizationJsonLd({ url: "https://x/zh" });
    expect(ld.name).toBe("WorldTime");
    expect(ld.logo).toBeTruthy();
  });
});
