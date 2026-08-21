import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

function shape(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [`${prefix}[]:${obj.length}`];
  if (obj && typeof obj === "object") {
    return Object.keys(obj as object)
      .sort()
      .flatMap((k) => shape((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("messages 11 语言键位对齐", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const byLocale: Record<string, string> = {};
  for (const file of files) {
    const json = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
    byLocale[file] = shape(json).join("\n");
  }

  it("11 个文件", () => {
    expect(files).toHaveLength(11);
  });
  it("键树与 en.json 完全一致", () => {
    const baseline = byLocale["en.json"];
    expect(baseline).toBeTruthy();
    for (const [file, s] of Object.entries(byLocale)) {
      expect(s, file).toBe(baseline);
    }
  });
  it("含 GEO 命名空间与 openApp", () => {
    const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));
    expect(en.App.openApp).toBeTruthy();
    expect(en.City.title).toBeTruthy();
    expect(en.Country.title).toBeTruthy();
    expect(en.About.title).toBeTruthy();
    expect(en.Privacy.paragraphs.length).toBeGreaterThan(0);
    expect(en.Seo.citiesTitle).toBeTruthy();
    expect(en.Landing.factLead).toBeTruthy();
    expect(en.Seo.faq[4].a).toMatch(/minute|分钟|分鐘/i);
  });
});
