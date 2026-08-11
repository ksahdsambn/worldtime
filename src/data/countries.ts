import type { CountryRecord } from "@/lib/types";

/**
 * ISO 国家代码 → 国旗 emoji。
 * 通过 regional indicator symbols 由两位字母代码推导，覆盖全部 ISO alpha-2。
 */
function flagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏳️";
  const base = 0x1f1e6; // 'A' regional indicator
  const chars = countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(base + (c.charCodeAt(0) - 65)));
  return chars.join("");
}

/**
 * 国家元数据表。
 * weekendDays: 1=周一 … 7=周日。
 * 默认 [6,7]（周六、周日）；特殊地区据实标注。
 *
 * 覆盖范围：本项目涉及的主要国家。未列出的国家在运行时按 [6,7] 兜底。
 */
const COUNTRY_META: Array<
  Pick<CountryRecord, "code" | "nameZh" | "nameEn"> & {
    weekendDays: number[];
  }
> = [
  // 东亚
  { code: "CN", nameZh: "中国", nameEn: "China", weekendDays: [6, 7] },
  { code: "HK", nameZh: "中国香港", nameEn: "Hong Kong", weekendDays: [6, 7] },
  { code: "MO", nameZh: "中国澳门", nameEn: "Macao", weekendDays: [6, 7] },
  { code: "TW", nameZh: "中国台湾", nameEn: "Taiwan", weekendDays: [6, 7] },
  { code: "JP", nameZh: "日本", nameEn: "Japan", weekendDays: [6, 7] },
  { code: "KR", nameZh: "韩国", nameEn: "South Korea", weekendDays: [6, 7] },
  { code: "KP", nameZh: "朝鲜", nameEn: "North Korea", weekendDays: [6, 7] },
  { code: "MN", nameZh: "蒙古", nameEn: "Mongolia", weekendDays: [6, 7] },
  // 东南亚
  { code: "SG", nameZh: "新加坡", nameEn: "Singapore", weekendDays: [6, 7] },
  { code: "MY", nameZh: "马来西亚", nameEn: "Malaysia", weekendDays: [6, 7] },
  { code: "ID", nameZh: "印度尼西亚", nameEn: "Indonesia", weekendDays: [6, 7] },
  { code: "TH", nameZh: "泰国", nameEn: "Thailand", weekendDays: [6, 7] },
  { code: "VN", nameZh: "越南", nameEn: "Vietnam", weekendDays: [6, 7] },
  { code: "PH", nameZh: "菲律宾", nameEn: "Philippines", weekendDays: [6, 7] },
  { code: "KH", nameZh: "柬埔寨", nameEn: "Cambodia", weekendDays: [6, 7] },
  { code: "LA", nameZh: "老挝", nameEn: "Laos", weekendDays: [6, 7] },
  { code: "MM", nameZh: "缅甸", nameEn: "Myanmar", weekendDays: [6, 7] },
  { code: "BN", nameZh: "文莱", nameEn: "Brunei", weekendDays: [6, 7] },
  { code: "TL", nameZh: "东帝汶", nameEn: "Timor-Leste", weekendDays: [6, 7] },
  // 南亚
  { code: "IN", nameZh: "印度", nameEn: "India", weekendDays: [6, 7] },
  { code: "PK", nameZh: "巴基斯坦", nameEn: "Pakistan", weekendDays: [6, 7] },
  { code: "BD", nameZh: "孟加拉国", nameEn: "Bangladesh", weekendDays: [6, 7] },
  { code: "LK", nameZh: "斯里兰卡", nameEn: "Sri Lanka", weekendDays: [6, 7] },
  { code: "NP", nameZh: "尼泊尔", nameEn: "Nepal", weekendDays: [6, 7] },
  { code: "BT", nameZh: "不丹", nameEn: "Bhutan", weekendDays: [6, 7] },
  { code: "MV", nameZh: "马尔代夫", nameEn: "Maldives", weekendDays: [6, 7] },
  // 中亚
  { code: "KZ", nameZh: "哈萨克斯坦", nameEn: "Kazakhstan", weekendDays: [6, 7] },
  { code: "UZ", nameZh: "乌兹别克斯坦", nameEn: "Uzbekistan", weekendDays: [6, 7] },
  { code: "TM", nameZh: "土库曼斯坦", nameEn: "Turkmenistan", weekendDays: [6, 7] },
  { code: "KG", nameZh: "吉尔吉斯斯坦", nameEn: "Kyrgyzstan", weekendDays: [6, 7] },
  { code: "TJ", nameZh: "塔吉克斯坦", nameEn: "Tajikistan", weekendDays: [6, 7] },
  { code: "AF", nameZh: "阿富汗", nameEn: "Afghanistan", weekendDays: [6, 7] },
  // 西亚 / 中东 —— 多数为周五、周六休（满足 TC-11 / 4.3.2 周末覆盖测试需求）
  { code: "SA", nameZh: "沙特阿拉伯", nameEn: "Saudi Arabia", weekendDays: [5, 6] },
  { code: "AE", nameZh: "阿联酋", nameEn: "United Arab Emirates", weekendDays: [5, 6] },
  { code: "QA", nameZh: "卡塔尔", nameEn: "Qatar", weekendDays: [5, 6] },
  { code: "BH", nameZh: "巴林", nameEn: "Bahrain", weekendDays: [5, 6] },
  { code: "KW", nameZh: "科威特", nameEn: "Kuwait", weekendDays: [5, 6] },
  { code: "OM", nameZh: "阿曼", nameEn: "Oman", weekendDays: [5, 6] },
  { code: "YE", nameZh: "也门", nameEn: "Yemen", weekendDays: [5, 6] },
  { code: "IR", nameZh: "伊朗", nameEn: "Iran", weekendDays: [5, 6] },
  { code: "IQ", nameZh: "伊拉克", nameEn: "Iraq", weekendDays: [5, 6] },
  { code: "SY", nameZh: "叙利亚", nameEn: "Syria", weekendDays: [6, 7] },
  { code: "JO", nameZh: "约旦", nameEn: "Jordan", weekendDays: [6, 7] },
  { code: "LB", nameZh: "黎巴嫩", nameEn: "Lebanon", weekendDays: [6, 7] },
  { code: "IL", nameZh: "以色列", nameEn: "Israel", weekendDays: [5, 6] },
  { code: "PS", nameZh: "巴勒斯坦", nameEn: "Palestine", weekendDays: [5, 6] },
  { code: "TR", nameZh: "土耳其", nameEn: "Turkey", weekendDays: [6, 7] },
  { code: "CY", nameZh: "塞浦路斯", nameEn: "Cyprus", weekendDays: [6, 7] },
  { code: "GE", nameZh: "格鲁吉亚", nameEn: "Georgia", weekendDays: [6, 7] },
  { code: "AM", nameZh: "亚美尼亚", nameEn: "Armenia", weekendDays: [6, 7] },
  { code: "AZ", nameZh: "阿塞拜疆", nameEn: "Azerbaijan", weekendDays: [6, 7] },
  // 欧洲
  { code: "GB", nameZh: "英国", nameEn: "United Kingdom", weekendDays: [6, 7] },
  { code: "IE", nameZh: "爱尔兰", nameEn: "Ireland", weekendDays: [6, 7] },
  { code: "FR", nameZh: "法国", nameEn: "France", weekendDays: [6, 7] },
  { code: "DE", nameZh: "德国", nameEn: "Germany", weekendDays: [6, 7] },
  { code: "IT", nameZh: "意大利", nameEn: "Italy", weekendDays: [6, 7] },
  { code: "ES", nameZh: "西班牙", nameEn: "Spain", weekendDays: [6, 7] },
  { code: "PT", nameZh: "葡萄牙", nameEn: "Portugal", weekendDays: [6, 7] },
  { code: "NL", nameZh: "荷兰", nameEn: "Netherlands", weekendDays: [6, 7] },
  { code: "BE", nameZh: "比利时", nameEn: "Belgium", weekendDays: [6, 7] },
  { code: "LU", nameZh: "卢森堡", nameEn: "Luxembourg", weekendDays: [6, 7] },
  { code: "CH", nameZh: "瑞士", nameEn: "Switzerland", weekendDays: [6, 7] },
  { code: "AT", nameZh: "奥地利", nameEn: "Austria", weekendDays: [6, 7] },
  { code: "LI", nameZh: "列支敦士登", nameEn: "Liechtenstein", weekendDays: [6, 7] },
  { code: "SE", nameZh: "瑞典", nameEn: "Sweden", weekendDays: [6, 7] },
  { code: "NO", nameZh: "挪威", nameEn: "Norway", weekendDays: [6, 7] },
  { code: "DK", nameZh: "丹麦", nameEn: "Denmark", weekendDays: [6, 7] },
  { code: "FI", nameZh: "芬兰", nameEn: "Finland", weekendDays: [6, 7] },
  { code: "IS", nameZh: "冰岛", nameEn: "Iceland", weekendDays: [6, 7] },
  { code: "EE", nameZh: "爱沙尼亚", nameEn: "Estonia", weekendDays: [6, 7] },
  { code: "LV", nameZh: "拉脱维亚", nameEn: "Latvia", weekendDays: [6, 7] },
  { code: "LT", nameZh: "立陶宛", nameEn: "Lithuania", weekendDays: [6, 7] },
  { code: "PL", nameZh: "波兰", nameEn: "Poland", weekendDays: [6, 7] },
  { code: "CZ", nameZh: "捷克", nameEn: "Czechia", weekendDays: [6, 7] },
  { code: "SK", nameZh: "斯洛伐克", nameEn: "Slovakia", weekendDays: [6, 7] },
  { code: "HU", nameZh: "匈牙利", nameEn: "Hungary", weekendDays: [6, 7] },
  { code: "RO", nameZh: "罗马尼亚", nameEn: "Romania", weekendDays: [6, 7] },
  { code: "BG", nameZh: "保加利亚", nameEn: "Bulgaria", weekendDays: [6, 7] },
  { code: "GR", nameZh: "希腊", nameEn: "Greece", weekendDays: [6, 7] },
  { code: "RS", nameZh: "塞尔维亚", nameEn: "Serbia", weekendDays: [6, 7] },
  { code: "HR", nameZh: "克罗地亚", nameEn: "Croatia", weekendDays: [6, 7] },
  { code: "SI", nameZh: "斯洛文尼亚", nameEn: "Slovenia", weekendDays: [6, 7] },
  { code: "BA", nameZh: "波黑", nameEn: "Bosnia and Herzegovina", weekendDays: [6, 7] },
  { code: "MK", nameZh: "北马其顿", nameEn: "North Macedonia", weekendDays: [6, 7] },
  { code: "AL", nameZh: "阿尔巴尼亚", nameEn: "Albania", weekendDays: [6, 7] },
  { code: "ME", nameZh: "黑山", nameEn: "Montenegro", weekendDays: [6, 7] },
  { code: "XK", nameZh: "科索沃", nameEn: "Kosovo", weekendDays: [6, 7] },
  { code: "MD", nameZh: "摩尔多瓦", nameEn: "Moldova", weekendDays: [6, 7] },
  { code: "UA", nameZh: "乌克兰", nameEn: "Ukraine", weekendDays: [6, 7] },
  { code: "BY", nameZh: "白俄罗斯", nameEn: "Belarus", weekendDays: [6, 7] },
  { code: "RU", nameZh: "俄罗斯", nameEn: "Russia", weekendDays: [6, 7] },
  { code: "MT", nameZh: "马耳他", nameEn: "Malta", weekendDays: [6, 7] },
  { code: "MC", nameZh: "摩纳哥", nameEn: "Monaco", weekendDays: [6, 7] },
  { code: "AD", nameZh: "安道尔", nameEn: "Andorra", weekendDays: [6, 7] },
  { code: "SM", nameZh: "圣马力诺", nameEn: "San Marino", weekendDays: [6, 7] },
  { code: "VA", nameZh: "梵蒂冈", nameEn: "Vatican City", weekendDays: [6, 7] },
  { code: "GI", nameZh: "直布罗陀", nameEn: "Gibraltar", weekendDays: [6, 7] },
  // 北美
  { code: "US", nameZh: "美国", nameEn: "United States", weekendDays: [6, 7] },
  { code: "CA", nameZh: "加拿大", nameEn: "Canada", weekendDays: [6, 7] },
  { code: "MX", nameZh: "墨西哥", nameEn: "Mexico", weekendDays: [6, 7] },
  { code: "GT", nameZh: "危地马拉", nameEn: "Guatemala", weekendDays: [6, 7] },
  { code: "BZ", nameZh: "伯利兹", nameEn: "Belize", weekendDays: [6, 7] },
  { code: "SV", nameZh: "萨尔瓦多", nameEn: "El Salvador", weekendDays: [6, 7] },
  { code: "HN", nameZh: "洪都拉斯", nameEn: "Honduras", weekendDays: [6, 7] },
  { code: "NI", nameZh: "尼加拉瓜", nameEn: "Nicaragua", weekendDays: [6, 7] },
  { code: "CR", nameZh: "哥斯达黎加", nameEn: "Costa Rica", weekendDays: [6, 7] },
  { code: "PA", nameZh: "巴拿马", nameEn: "Panama", weekendDays: [6, 7] },
  { code: "CU", nameZh: "古巴", nameEn: "Cuba", weekendDays: [6, 7] },
  { code: "JM", nameZh: "牙买加", nameEn: "Jamaica", weekendDays: [6, 7] },
  { code: "BS", nameZh: "巴哈马", nameEn: "Bahamas", weekendDays: [6, 7] },
  { code: "HT", nameZh: "海地", nameEn: "Haiti", weekendDays: [6, 7] },
  { code: "DO", nameZh: "多米尼加", nameEn: "Dominican Republic", weekendDays: [6, 7] },
  { code: "PR", nameZh: "波多黎各", nameEn: "Puerto Rico", weekendDays: [6, 7] },
  { code: "TT", nameZh: "特立尼达和多巴哥", nameEn: "Trinidad and Tobago", weekendDays: [6, 7] },
  { code: "BB", nameZh: "巴巴多斯", nameEn: "Barbados", weekendDays: [6, 7] },
  // 南美
  { code: "BR", nameZh: "巴西", nameEn: "Brazil", weekendDays: [6, 7] },
  { code: "AR", nameZh: "阿根廷", nameEn: "Argentina", weekendDays: [6, 7] },
  { code: "CL", nameZh: "智利", nameEn: "Chile", weekendDays: [6, 7] },
  { code: "CO", nameZh: "哥伦比亚", nameEn: "Colombia", weekendDays: [6, 7] },
  { code: "PE", nameZh: "秘鲁", nameEn: "Peru", weekendDays: [6, 7] },
  { code: "VE", nameZh: "委内瑞拉", nameEn: "Venezuela", weekendDays: [6, 7] },
  { code: "EC", nameZh: "厄瓜多尔", nameEn: "Ecuador", weekendDays: [6, 7] },
  { code: "BO", nameZh: "玻利维亚", nameEn: "Bolivia", weekendDays: [6, 7] },
  { code: "PY", nameZh: "巴拉圭", nameEn: "Paraguay", weekendDays: [6, 7] },
  { code: "UY", nameZh: "乌拉圭", nameEn: "Uruguay", weekendDays: [6, 7] },
  { code: "GY", nameZh: "圭亚那", nameEn: "Guyana", weekendDays: [6, 7] },
  { code: "SR", nameZh: "苏里南", nameEn: "Suriname", weekendDays: [6, 7] },
  // 非洲
  { code: "EG", nameZh: "埃及", nameEn: "Egypt", weekendDays: [6, 7] },
  { code: "LY", nameZh: "利比亚", nameEn: "Libya", weekendDays: [6, 7] },
  { code: "TN", nameZh: "突尼斯", nameEn: "Tunisia", weekendDays: [6, 7] },
  { code: "DZ", nameZh: "阿尔及利亚", nameEn: "Algeria", weekendDays: [6, 7] },
  { code: "MA", nameZh: "摩洛哥", nameEn: "Morocco", weekendDays: [6, 7] },
  { code: "SD", nameZh: "苏丹", nameEn: "Sudan", weekendDays: [6, 7] },
  { code: "SS", nameZh: "南苏丹", nameEn: "South Sudan", weekendDays: [6, 7] },
  { code: "ET", nameZh: "埃塞俄比亚", nameEn: "Ethiopia", weekendDays: [6, 7] },
  { code: "ER", nameZh: "厄立特里亚", nameEn: "Eritrea", weekendDays: [6, 7] },
  { code: "DJ", nameZh: "吉布提", nameEn: "Djibouti", weekendDays: [6, 7] },
  { code: "SO", nameZh: "索马里", nameEn: "Somalia", weekendDays: [6, 7] },
  { code: "KE", nameZh: "肯尼亚", nameEn: "Kenya", weekendDays: [6, 7] },
  { code: "UG", nameZh: "乌干达", nameEn: "Uganda", weekendDays: [6, 7] },
  { code: "TZ", nameZh: "坦桑尼亚", nameEn: "Tanzania", weekendDays: [6, 7] },
  { code: "RW", nameZh: "卢旺达", nameEn: "Rwanda", weekendDays: [6, 7] },
  { code: "BI", nameZh: "布隆迪", nameEn: "Burundi", weekendDays: [6, 7] },
  { code: "MZ", nameZh: "莫桑比克", nameEn: "Mozambique", weekendDays: [6, 7] },
  { code: "MW", nameZh: "马拉维", nameEn: "Malawi", weekendDays: [6, 7] },
  { code: "ZM", nameZh: "赞比亚", nameEn: "Zambia", weekendDays: [6, 7] },
  { code: "ZW", nameZh: "津巴布韦", nameEn: "Zimbabwe", weekendDays: [6, 7] },
  { code: "BW", nameZh: "博茨瓦纳", nameEn: "Botswana", weekendDays: [6, 7] },
  { code: "NA", nameZh: "纳米比亚", nameEn: "Namibia", weekendDays: [6, 7] },
  { code: "ZA", nameZh: "南非", nameEn: "South Africa", weekendDays: [6, 7] },
  { code: "LS", nameZh: "莱索托", nameEn: "Lesotho", weekendDays: [6, 7] },
  { code: "SZ", nameZh: "斯威士兰", nameEn: "Eswatini", weekendDays: [6, 7] },
  { code: "MG", nameZh: "马达加斯加", nameEn: "Madagascar", weekendDays: [6, 7] },
  { code: "MU", nameZh: "毛里求斯", nameEn: "Mauritius", weekendDays: [6, 7] },
  { code: "SC", nameZh: "塞舌尔", nameEn: "Seychelles", weekendDays: [6, 7] },
  { code: "KM", nameZh: "科摩罗", nameEn: "Comoros", weekendDays: [6, 7] },
  { code: "CV", nameZh: "佛得角", nameEn: "Cape Verde", weekendDays: [6, 7] },
  { code: "ST", nameZh: "圣多美和普林西比", nameEn: "São Tomé and Príncipe", weekendDays: [6, 7] },
  { code: "GN", nameZh: "几内亚", nameEn: "Guinea", weekendDays: [6, 7] },
  { code: "GW", nameZh: "几内亚比绍", nameEn: "Guinea-Bissau", weekendDays: [6, 7] },
  { code: "SL", nameZh: "塞拉利昂", nameEn: "Sierra Leone", weekendDays: [6, 7] },
  { code: "LR", nameZh: "利比里亚", nameEn: "Liberia", weekendDays: [6, 7] },
  { code: "CI", nameZh: "科特迪瓦", nameEn: "Côte d'Ivoire", weekendDays: [6, 7] },
  { code: "GH", nameZh: "加纳", nameEn: "Ghana", weekendDays: [6, 7] },
  { code: "TG", nameZh: "多哥", nameEn: "Togo", weekendDays: [6, 7] },
  { code: "BJ", nameZh: "贝宁", nameEn: "Benin", weekendDays: [6, 7] },
  { code: "NG", nameZh: "尼日利亚", nameEn: "Nigeria", weekendDays: [6, 7] },
  { code: "NE", nameZh: "尼日尔", nameEn: "Niger", weekendDays: [6, 7] },
  { code: "BF", nameZh: "布基纳法索", nameEn: "Burkina Faso", weekendDays: [6, 7] },
  { code: "ML", nameZh: "马里", nameEn: "Mali", weekendDays: [6, 7] },
  { code: "SN", nameZh: "塞内加尔", nameEn: "Senegal", weekendDays: [6, 7] },
  { code: "GM", nameZh: "冈比亚", nameEn: "Gambia", weekendDays: [6, 7] },
  { code: "MR", nameZh: "毛里塔尼亚", nameEn: "Mauritania", weekendDays: [6, 7] },
  { code: "CM", nameZh: "喀麦隆", nameEn: "Cameroon", weekendDays: [6, 7] },
  { code: "TD", nameZh: "乍得", nameEn: "Chad", weekendDays: [6, 7] },
  { code: "CF", nameZh: "中非", nameEn: "Central African Republic", weekendDays: [6, 7] },
  { code: "CG", nameZh: "刚果（布）", nameEn: "Republic of the Congo", weekendDays: [6, 7] },
  { code: "CD", nameZh: "刚果（金）", nameEn: "DR Congo", weekendDays: [6, 7] },
  { code: "AO", nameZh: "安哥拉", nameEn: "Angola", weekendDays: [6, 7] },
  { code: "GA", nameZh: "加蓬", nameEn: "Gabon", weekendDays: [6, 7] },
  { code: "GQ", nameZh: "赤道几内亚", nameEn: "Equatorial Guinea", weekendDays: [6, 7] },
  // 大洋洲
  { code: "AU", nameZh: "澳大利亚", nameEn: "Australia", weekendDays: [6, 7] },
  { code: "NZ", nameZh: "新西兰", nameEn: "New Zealand", weekendDays: [6, 7] },
  { code: "PG", nameZh: "巴布亚新几内亚", nameEn: "Papua New Guinea", weekendDays: [6, 7] },
  { code: "FJ", nameZh: "斐济", nameEn: "Fiji", weekendDays: [6, 7] },
  { code: "SB", nameZh: "所罗门群岛", nameEn: "Solomon Islands", weekendDays: [6, 7] },
  { code: "VU", nameZh: "瓦努阿图", nameEn: "Vanuatu", weekendDays: [6, 7] },
  { code: "WS", nameZh: "萨摩亚", nameEn: "Samoa", weekendDays: [6, 7] },
  { code: "TO", nameZh: "汤加", nameEn: "Tonga", weekendDays: [6, 7] },
];

/** 国家代码 → 元数据 映射。 */
export const COUNTRIES: Record<string, CountryRecord> = (() => {
  const map: Record<string, CountryRecord> = {};
  for (const c of COUNTRY_META) {
    map[c.code] = { ...c, flag: flagEmoji(c.code) };
  }
  return map;
})();

/** 获取国家元数据；未收录时返回兜底（默认周六周日休）。 */
export function getCountry(code: string): CountryRecord {
  return (
    COUNTRIES[code] ?? {
      code,
      nameZh: code,
      nameEn: code,
      flag: flagEmoji(code),
      weekendDays: [6, 7],
    }
  );
}
