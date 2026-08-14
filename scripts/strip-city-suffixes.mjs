// 一次性数据清理脚本：把城市显示名中内联的消歧后缀剥离（如 "Oakland US" → "Oakland"、
// "巴勒莫意" → "巴勒莫"），并删除剥离后与既有条目完全相同（国家/时区/中英名均同）的重复行。
// 用法：node scripts/strip-city-suffixes.mjs [--write]
// 默认 dry-run 打印改动；--write 才落盘。执行后人工 review diff，随后可删除本脚本。
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/data/cities.ts";
const src = readFileSync(file, "utf8");
const lines = src.split("\n");

// 中文消歧后缀 → 纯净名（逐一核对过原数据的逐一映射）
const ZH_MAP = {
  福塔莱萨塞: "福塔莱萨",
  马瑙斯亚马逊: "马瑙斯",
  门多萨阿: "门多萨",
  瓦伦西亚西: "瓦伦西亚",
  巴勒莫意: "巴勒莫",
  纽卡斯尔澳: "纽卡斯尔",
  堪培拉澳: "堪培拉",
  蒙巴萨肯: "蒙巴萨",
  瓜亚基尔厄: "瓜亚基尔",
  拉巴斯玻: "拉巴斯",
  圣克鲁斯玻: "圣克鲁斯",
  哥德堡瑞典: "哥德堡",
  莫比尔阿: "莫比尔",
  蒙哥马利阿: "蒙哥马利",
  哥伦布密: "哥伦布",
  格林维尔密: "格林维尔",
  杰克逊密: "杰克逊",
  斯普林菲尔德伊: "斯普林菲尔德",
  迪凯特伊: "迪凯特",
  布卢明顿伊: "布卢明顿",
  蒙特雷加: "蒙特雷",
  博兹曼蒙: "博兹曼",
  布兰登加: "布兰登",
  金斯顿加: "金斯顿",
  巴里加: "巴里",
  伦敦加: "伦敦",
  温莎加: "温莎",
  伯灵顿加: "伯灵顿",
  莱昂西: "莱昂",
  加的斯西: "加的斯",
  卡塔赫纳西: "卡塔赫纳",
  亚历山大港: "亚历山大", // 与非洲段的 Alexandria 重复条目
  塞萨洛尼: "塞萨洛尼基", // 截断音译变体，与塞萨洛尼基同城
  韦尼佩格: "温尼伯", // 错译变体，与温尼伯同城
  哈密尔顿加: "汉密尔顿", // 音译变体，与汉密尔顿同城
  伯明罕亚拉巴马: "伯明翰", // 音译变体，与伯明翰（Birmingham US）同城
};

// 英文名全名级特例（非「空格+两位大写」模式）
const EN_OVERRIDES = {
  "Hamilton Ontario": "Hamilton",
  "León Mexico": "León",
  "Birmingham Alabama": "Birmingham",
};
// 英文名规则：去掉结尾的「空格+两位大写字母」消歧后缀（US/CA/IT/AL/IL/MS/CE 等）
const EN_SUFFIX_RE = /\s+[A-Z]{2}$/;

const tupleRe = /^\s*\["([^"]*)", "([^"]*)", "([A-Z]{2})", "([^"]*)"\],?$/;
const changed = [];
const dropped = [];
const seen = new Map(); // 关键：country|zone|nameEn 完全相同视为重复城市

let inTuples = false;
const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(tupleRe);
  if (!m) {
    out.push(line);
    continue;
  }
  const [raw, zh, en, cc, zone] = m;
  const newZh = ZH_MAP[zh] ?? zh;
  const newEn = EN_OVERRIDES[en] ?? en.replace(EN_SUFFIX_RE, "");
  if (newZh !== zh || newEn !== en) {
    changed.push(`L${i + 1}: [${zh}|${en}] → [${newZh}|${newEn}]`);
  }
  // 去重：仅当剥离后「中文名+英文名+国家+时区」四者与既有行完全相同才删除。
  // 不满足四者全等的保留（如同一国家同名不同城：遂宁/睢宁，恩名/区名各异），
  // 避免把真实不同的城市误合并。
  const key = `${newZh}|${newEn}|${cc}|${zone}`;
  if (seen.has(key)) {
    const prev = seen.get(key);
    dropped.push(`L${i + 1}（${newZh}|${newEn}）与 L${prev} 四字段完全相同，删除`);
    continue;
  }
  seen.set(key, i + 1);
  out.push(line.replace(`"${zh}"`, `"${newZh}"`).replace(`"${en}"`, `"${newEn}"`));
}

console.log("=== 名称变更 ===");
for (const c of changed) console.log(c);
console.log(`\n=== 删除重复行（${dropped.length}）===`);
for (const d of dropped) console.log(d);

// 卫生检查
const remaining = out.filter((l) => l.match(tupleRe));
const bad = remaining.filter((l) => l.match(/"([^"]+) [A-Z]{2}", "[A-Z]{2}"/));
console.log(`\n=== 卫生检查 ===`);
console.log("剩余含空格+两位大写结尾的英文名：", bad.length);
const dupEn = new Map();
for (const l of remaining) {
  const m = l.match(tupleRe);
  if (!m) continue;
  const k = `${m[3]}|${m[4]}|${m[2]}`;
  dupEn.set(k, (dupEn.get(k) ?? 0) + 1);
}
for (const [k, n] of dupEn) if (n > 1) console.log("仍重复(国家|时区|英文名)：", k, n);

if (process.argv.includes("--write")) {
  writeFileSync(file, out.join("\n"), "utf8");
  console.log("\n已写入", file);
} else {
  console.log("\n（dry-run：未写入。加 --write 落盘）");
}
