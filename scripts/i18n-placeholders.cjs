// Check ICU placeholder consistency between en.json and each locale.
const fs = require('fs');
const path = require('path');
const msgDir = path.join(__dirname, '..', 'messages');
const locales = ['zh','zh-Hant','ja','ko','de','es','fr','pt','ru','vi'];
const en = JSON.parse(fs.readFileSync(path.join(msgDir,'en.json'),'utf8'));

function flatten(obj, prefix='', out={}) {
  for (const [k,v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
function ph(s) {
  const set = new Set();
  const re = /'?\{(\w+)\}'?/g; let m;
  while ((m = re.exec(String(s)))) set.add(m[1]);
  return set;
}
const enFlat = flatten(en);
let issues = 0;
for (const loc of locales) {
  const flat = flatten(JSON.parse(fs.readFileSync(path.join(msgDir,`${loc}.json`),'utf8')));
  for (const [k, enVal] of Object.entries(enFlat)) {
    if (!(k in flat)) continue;
    const a = ph(enVal), b = ph(flat[k]);
    const missing = [...a].filter(x => !b.has(x));
    const extra = [...b].filter(x => !a.has(x));
    if (missing.length || extra.length) {
      issues++;
      console.log(`${loc} ${k}: EN{${[...a]}} vs ${loc}{${[...b]}}  ->  "${flat[k]}"`);
    }
  }
}
console.log(issues ? `\n${issues} placeholder issues` : '\nAll placeholders consistent');
