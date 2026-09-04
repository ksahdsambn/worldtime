// Compare each locale against en.json: missing keys, extra keys, and values identical to English (possibly untranslated).
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
const enFlat = flatten(en);
console.log(`en.json flat keys: ${Object.keys(enFlat).length}`);

for (const loc of locales) {
  const data = JSON.parse(fs.readFileSync(path.join(msgDir,`${loc}.json`),'utf8'));
  const flat = flatten(data);
  const missing = Object.keys(enFlat).filter(k => !(k in flat));
  const extra = Object.keys(flat).filter(k => !(k in enFlat));
  const sameAsEn = Object.keys(enFlat).filter(k => k in flat && flat[k] === enFlat[k] && /[a-zA-Z]{2}/.test(String(enFlat[k])));
  console.log(`\n=== ${loc}: ${Object.keys(flat).length} keys | missing: ${missing.length} | extra: ${extra.length} | identical-to-EN: ${sameAsEn.length}`);
  if (missing.length) console.log('  MISSING:', missing.join(', '));
  if (extra.length) console.log('  EXTRA:', extra.join(', '));
  if (sameAsEn.length) console.log('  SAME-AS-EN:', sameAsEn.join(', '));
}
