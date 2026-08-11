/**
 * 一次性脚本：为 11 个 messages/*.json 注入 Seo 命名空间（首页 SEO 文案）
 * 并强化 Landing.description（关键词更丰富）。
 *
 * 幂等：若 Seo 已存在则覆盖；Landing.description 永远覆盖为目标文案。
 * 运行：node scripts/seo-messages.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(__dirname, "../messages");

/** 各语言的 SEO 首页文案与强化后的 Landing.description。 */
const CONTENT = {
  zh: {
    landingDesc: "实时时差、时区偏移与逐小时对照表（自动夏令时换算）",
    seo: {
      introTitle: "世界时钟与时区转换器",
      introBody:
        "WorldTime 是一款免费的世界时钟、时区转换器与会议安排工具。跨城市、跨时区对比当地时间，找到国际会议的最佳时段，并支持自动夏令时（DST）换算与选区时间分享。",
      popularTitle: "热门时区转换",
    },
  },
  "zh-Hant": {
    landingDesc: "即時時差、時區偏移與逐小時對照表（自動夏令時間換算）",
    seo: {
      introTitle: "世界時鐘與時區轉換器",
      introBody:
        "WorldTime 是一款免費的世界時鐘、時區轉換器與會議安排工具。跨城市、跨時區對比當地時間，找到國際會議的最佳時段，並支援自動夏令時間（DST）換算與選區時間分享。",
      popularTitle: "熱門時區轉換",
    },
  },
  en: {
    landingDesc:
      "live time difference, time zone offset, and hour-by-hour comparison table (DST-aware)",
    seo: {
      introTitle: "World clock & time zone converter",
      introBody:
        "WorldTime is a free world clock, time zone converter, and meeting planner. Compare the local time across cities and time zones, find the best hours to schedule international meetings, and share time selections with automatic daylight saving time (DST) support.",
      popularTitle: "Popular time zone converters",
    },
  },
  es: {
    landingDesc:
      "diferencia horaria en vivo, desfase de zona horaria y tabla de comparación hora por hora (con horario de verano)",
    seo: {
      introTitle: "Reloj mundial y conversor de zonas horarias",
      introBody:
        "WorldTime es un reloj mundial, conversor de zonas horarias y organizador de reuniones gratuito. Compara la hora local entre ciudades y zonas horarias, encuentra las mejores horas para reuniones internacionales y comparte selecciones de hora con soporte automático del horario de verano (DST).",
      popularTitle: "Conversores de zona horaria populares",
    },
  },
  fr: {
    landingDesc:
      "décalage horaire en direct, décalage de fuseau horaire et tableau de comparaison heure par heure (DST inclus)",
    seo: {
      introTitle: "Horloge mondiale et convertisseur de fuseaux horaires",
      introBody:
        "WorldTime est une horloge mondiale, un convertisseur de fuseaux horaires et un planificateur de réunions gratuit. Comparez l'heure locale entre villes et fuseaux horaires, trouvez les meilleures plages pour vos réunions internationales et partagez vos sélections horaires avec prise en charge automatique de l'heure d'été (DST).",
      popularTitle: "Convertisseurs de fuseau horaire populaires",
    },
  },
  de: {
    landingDesc:
      "aktueller Zeitunterschied, Zeitzonen-Verschiebung und stündlicher Vergleich (sommerzeitfähig)",
    seo: {
      introTitle: "Weltuhr und Zeitzonenkonverter",
      introBody:
        "WorldTime ist eine kostenlose Weltuhr, Zeitzonenkonverter und Terminplaner. Vergleichen Sie die Ortszeit zwischen Städten und Zeitzonen, finden Sie die besten Stunden für internationale Meetings und teilen Sie Zeitauswahlen mit automatischer Sommerzeit-Unterstützung (DST).",
      popularTitle: "Beliebte Zeitzonenkonverter",
    },
  },
  ja: {
    landingDesc:
      "リアルタイムの時差、タイムゾーンオフセット、時間ごとの比較表（夏時間対応）",
    seo: {
      introTitle: "世界時計とタイムゾーン変換",
      introBody:
        "WorldTime は無料の世界時計・タイムゾーン変換・会議スケジュールツールです。都市間・タイムゾーン間の現地時刻を比較し、国際会議に最適な時間帯を見つけ、夏時間（DST）自動対応で時間選択を共有できます。",
      popularTitle: "人気のタイムゾーン変換",
    },
  },
  ko: {
    landingDesc:
      "실시간 시차, 시간대 오프셋, 시간별 비교표 (일광절약시간 지원)",
    seo: {
      introTitle: "세계 시계 및 시간대 변환기",
      introBody:
        "WorldTime은 무료 세계 시계, 시간대 변환기, 회의 일정 도구입니다. 도시 및 시간대 간 현지 시간을 비교하고, 국제 회의에 가장 좋은 시간대를 찾고, 일광절약시간(DST) 자동 지원으로 시간 선택을 공유하세요.",
      popularTitle: "인기 시간대 변환",
    },
  },
  pt: {
    landingDesc:
      "diferença de horário ao vivo, defasagem de fuso horário e tabela de comparação hora a hora (com horário de verão)",
    seo: {
      introTitle: "Relógio mundial e conversor de fusos horários",
      introBody:
        "WorldTime é um relógio mundial, conversor de fusos horários e organizador de reuniões gratuito. Compare o horário local entre cidades e fusos horários, encontre os melhores horários para reuniões internacionais e compartilhe seleções de horário com suporte automático ao horário de verão (DST).",
      popularTitle: "Conversores de fuso horário populares",
    },
  },
  ru: {
    landingDesc:
      "разница во времени в реальном времени, смещение часового пояса и почасовая таблица сравнения (с учётом летнего времени)",
    seo: {
      introTitle: "Мировые часы и конвертер часовых поясов",
      introBody:
        "WorldTime — бесплатные мировые часы, конвертер часовых поясов и планировщик встреч. Сравнивайте местное время между городами и часовыми поясами, находите лучшие часы для международных встреч и делитесь выбором времени с автоматическим учётом летнего времени (DST).",
      popularTitle: "Популярные конвертеры часовых поясов",
    },
  },
  vi: {
    landingDesc:
      "chênh lệch giờ theo thời gian thực, khoảng bù múi giờ và bảng so sánh từng giờ (có hỗ trợ giờ mùa hè)",
    seo: {
      introTitle: "Đồng hồ thế giới và trình chuyển đổi múi giờ",
      introBody:
        "WorldTime là công cụ đồng hồ thế giới, chuyển đổi múi giờ và lên lịch họp miễn phí. So sánh giờ địa phương giữa các thành phố và múi giờ, tìm khung giờ phù hợp cho các cuộc họp quốc tế và chia sẻ lựa chọn thời gian với hỗ trợ tự động giờ mùa hè (DST).",
      popularTitle: "Trình chuyển đổi múi giờ phổ biến",
    },
  },
};

for (const [locale, data] of Object.entries(CONTENT)) {
  const file = resolve(messagesDir, `${locale}.json`);
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.Landing.description = data.landingDesc;
  json.Seo = data.seo;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`updated ${locale}.json (Seo + Landing.description)`);
}
