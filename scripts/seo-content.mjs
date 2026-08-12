/**
 * 一次性脚本（幂等）：为 11 个 messages/*.json 注入第 14 轮新增的 SEO 文案键。
 *
 * 新增键：
 * - App.homeTitle / App.homeDescription            （首页 meta 标题/描述）
 * - Seo.featuresTitle + features[6]                 （首页「核心功能」）
 * - Seo.useCasesTitle + useCases[5]                 （首页「使用场景」）
 * - Seo.faqTitle + faq[5]                           （首页「常见问题」→ FAQPage JSON-LD）
 * - Landing.metaDescription                         （着陆页独立成句 meta 描述，含 {a}/{b}）
 * - Landing.intro                                   （着陆页关键词引言段，含 {a}/{b}）
 * - Landing.dirAhead / Landing.dirBehind            （FAQ 方向词：领先/落后）
 * - Landing.faqTitle + faq[3]                       （着陆页 FAQ，含 {a}/{b}/{offset}/{dir}）
 * - Landing.relatedTitle                            （「相关时区转换」）
 *
 * 幂等：同名键总是覆盖为目标文案；既有键保留不动。
 * 运行：node scripts/seo-content.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = resolve(__dirname, "../messages");

/**
 * 各语言文案。features/useCases/faq 为对象数组，组件层用 t.raw() 读取后 .map 渲染。
 * ICU 占位符：{a}/{b} = 两端地名，{offset} = 时差，{dir} = 方向（领先/落后）。
 */
const LOCALES = {
  en: {
    appHomeTitle: "WorldTime — World Clock, Time Zone Converter & Meeting Planner",
    appHomeDescription:
      "Free world clock and time zone converter. Compare local time across cities, plan international meetings, and schedule across time zones with automatic daylight saving support.",
    seo: {
      featuresTitle: "Key features",
      features: [
        { title: "World clock", desc: "See the current local time in cities and time zones around the world, side by side." },
        { title: "Time zone converter", desc: "Convert any time between two cities or zones and get a live offset, updated in real time." },
        { title: "Meeting planner", desc: "Pick a time once and instantly see the matching local hours for every participant." },
        { title: "DST-aware", desc: "Daylight saving time is detected automatically, so offsets stay correct all year round." },
        { title: "11 languages", desc: "The interface, cities, and time zones are fully localized into 11 languages." },
        { title: "Free, no sign-up", desc: "No account, no install, no paywall. Open the page and start comparing time right away." },
      ],
      useCasesTitle: "Use cases",
      useCases: [
        { title: "Distributed remote teams", desc: "Find the overlap between teammates in different zones and choose hours that work for everyone." },
        { title: "International travel", desc: "Check the time at your destination before you fly and plan calls back home." },
        { title: "Forex & trading", desc: "Track market hours across London, New York, Tokyo, and Sydney at a glance." },
        { title: "Global support & follow-the-sun", desc: "Hand off shifts between regions and always know who is on the clock." },
        { title: "Cross-office scheduling", desc: "Book meetings between offices without mental math or off-by-one mistakes." },
      ],
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "How do I compare the time in two cities?", a: "Add the cities with the search box and the time grid shows every hour side by side, with the live offset between them." },
        { q: "Does WorldTime handle daylight saving time?", a: "Yes. Daylight saving transitions are detected automatically for each city, so the offset is correct on spring-forward and fall-back days too." },
        { q: "How do I find the best time for an international meeting?", a: "Add everyone's cities, then use the color heatmap to find hours where no one is asleep. Select a slot to export it to your calendar." },
        { q: "Is WorldTime free to use?", a: "Yes, WorldTime is completely free, runs in the browser, and does not require an account." },
        { q: "Is the time shown in real time?", a: "The current time updates live in your browser. The converter pages refresh their tables hourly." },
      ],
    },
    landing: {
      metaDescription:
        "{a} to {b} time difference: live time zone offset, an hour-by-hour comparison table, and DST-aware meeting planning. See what time it is in {b} right now.",
      intro:
        "Convert time between {a} and {b}: see the current time difference (offset), a full hour-by-hour comparison, and whether daylight saving time applies. Use it to schedule calls, meetings, and travel between the two locations.",
      dirAhead: "ahead of",
      dirBehind: "behind",
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "What is the time difference between {a} and {b}?", a: "{b} is {offset} hours {dir} {a}. This is the current offset; on daylight saving transition days some hours may differ by one hour." },
        { q: "Do {a} or {b} observe daylight saving time?", a: "WorldTime detects daylight saving time automatically for each city. The comparison table already reflects each day's actual offset." },
        { q: "What is the best time for a meeting between {a} and {b}?", a: "Open the home page, add both cities, and use the heatmap to find overlapping working hours, then export the slot to your calendar." },
      ],
      relatedTitle: "Related time zone converters",
    },
  },

  zh: {
    appHomeTitle: "WorldTime — 世界时钟、时区转换器与会议排期工具",
    appHomeDescription:
      "免费的世界时钟与时区转换器。跨城市对比当地时间，安排国际会议，自动适配夏令时，跨时区排期更轻松。",
    seo: {
      featuresTitle: "核心功能",
      features: [
        { title: "世界时钟", desc: "并排查看全球各城市与时区的当前当地时间。" },
        { title: "时区转换", desc: "在任意两个城市或时区之间换算时间，实时返回时差偏移。" },
        { title: "会议排期", desc: "选定一个时间，立即看到每位参与者的对应本地时段。" },
        { title: "夏令时自动", desc: "自动识别各城市的夏令时切换，全年时差始终正确。" },
        { title: "11 种语言", desc: "界面、城市与时区已完整本地化为 11 种语言。" },
        { title: "免费、免登录", desc: "无需账号、无需安装、无付费墙，打开页面即可对比时间。" },
      ],
      useCasesTitle: "使用场景",
      useCases: [
        { title: "跨时区远程团队", desc: "找到身处不同时区队友的重叠时段，选出大家都方便的时间。" },
        { title: "国际出行", desc: "出发前查看目的地时间，提前规划与国内的通话。" },
        { title: "外汇与交易", desc: "一眼掌握伦敦、纽约、东京、悉尼各市场的交易时段。" },
        { title: "全球支持与日不落排班", desc: "在各地团队间交接班次，随时清楚谁在岗。" },
        { title: "跨办公室排会", desc: "在办公室之间预订会议，免去心算和差一小时的失误。" },
      ],
      faqTitle: "常见问题",
      faq: [
        { q: "如何对比两个城市的时间？", a: "用搜索框添加城市，时间网格会逐小时并排显示，并标注两地实时时差。" },
        { q: "WorldTime 支持夏令时吗？", a: "支持。系统为每个城市自动识别夏令时切换，春进、秋退当天时差同样正确。" },
        { q: "如何为国际会议选择最佳时间？", a: "添加所有与会者所在城市，用热力图找到无人熟睡的时段，选中后导出到日历。" },
        { q: "WorldTime 是免费的吗？", a: "完全免费，直接在浏览器中使用，无需注册账号。" },
        { q: "显示的时间是实时的吗？", a: "当前时间在浏览器中实时更新；时区转换页的对照表每小时刷新一次。" },
      ],
    },
    landing: {
      metaDescription:
        "{a} 与 {b} 的时差：实时时区偏移、逐小时对照表，以及支持夏令时的会议排期。立即查看 {b} 现在几点。",
      intro:
        "在 {a} 与 {b} 之间换算时间：查看当前时差（偏移）、完整的逐小时对照，以及是否适用夏令时，用于安排两地间的通话、会议与出行。",
      dirAhead: "领先",
      dirBehind: "落后",
      faqTitle: "常见问题",
      faq: [
        { q: "{a} 与 {b} 的时差是多少？", a: "{b} {dir} {a} {offset} 小时。这是当前偏移；夏令时切换日部分小时可能相差一小时。" },
        { q: "{a} 或 {b} 实行夏令时吗？", a: "WorldTime 会为每个城市自动识别夏令时，对照表已体现每一天的实际偏移。" },
        { q: "{a} 与 {b} 之间开会的最佳时间？", a: "打开首页，添加这两个城市，用热力图找到重叠的工作时段，再导出到日历。" },
      ],
      relatedTitle: "相关时区转换",
    },
  },

  "zh-Hant": {
    appHomeTitle: "WorldTime — 世界時鐘、時區轉換器與會議排程工具",
    appHomeDescription:
      "免費的世界時鐘與時區轉換器。跨城市對比當地時間，安排國際會議，自動適配夏令時間，跨時區排程更輕鬆。",
    seo: {
      featuresTitle: "核心功能",
      features: [
        { title: "世界時鐘", desc: "並排查看全球各城市與時區的當前本地時間。" },
        { title: "時區轉換", desc: "在任意兩個城市或時區之間換算時間，即時傳回時差偏移。" },
        { title: "會議排程", desc: "選定一個時間，立即看到每位參與者的對應本地時段。" },
        { title: "夏令時間自動", desc: "自動辨識各城市的夏令時間切換，全年時差始終正確。" },
        { title: "11 種語言", desc: "介面、城市與時區已完整本地化為 11 種語言。" },
        { title: "免費、免登入", desc: "無需帳號、無需安裝、無付費牆，開啟頁面即可對比時間。" },
      ],
      useCasesTitle: "使用情境",
      useCases: [
        { title: "跨時區遠端團隊", desc: "找出身處不同時區隊友的重疊時段，選擇大家都方便的時間。" },
        { title: "國際出行", desc: "出發前查看目的地時間，提前規劃與國內的通話。" },
        { title: "外匯與交易", desc: "一眼掌握倫敦、紐約、東京、雪梨各市場的交易時段。" },
        { title: "全球支援與日不落排班", desc: "在各地團隊間交接班次，隨時清楚誰在值班。" },
        { title: "跨辦公室排會", desc: "在辦公室之間預約會議，免去心算和差一小時的失誤。" },
      ],
      faqTitle: "常見問題",
      faq: [
        { q: "如何對比兩個城市的時間？", a: "用搜尋框新增城市，時間網格會逐小時並排顯示，並標註兩地即時時差。" },
        { q: "WorldTime 支援夏令時間嗎？", a: "支援。系統為每個城市自動辨識夏令時間切換，春進、秋退當天時差同樣正確。" },
        { q: "如何為國際會議選擇最佳時間？", a: "新增所有與會者所在城市，用熱力圖找到無人熟睡的時段，選取後匯出至日曆。" },
        { q: "WorldTime 是免費的嗎？", a: "完全免費，直接在瀏覽器中使用，無需註冊帳號。" },
        { q: "顯示的時間是即時的嗎？", a: "目前時間在瀏覽器中即時更新；時區轉換頁的對照表每小時刷新一次。" },
      ],
    },
    landing: {
      metaDescription:
        "{a} 與 {b} 的時差：即時時區偏移、逐小時對照表，以及支援夏令時間的會議排程。立即查看 {b} 現在幾點。",
      intro:
        "在 {a} 與 {b} 之間換算時間：查看目前時差（偏移）、完整的逐小時對照，以及是否適用夏令時間，用於安排兩地間的通話、會議與出行。",
      dirAhead: "領先",
      dirBehind: "落後",
      faqTitle: "常見問題",
      faq: [
        { q: "{a} 與 {b} 的時差是多少？", a: "{b} {dir} {a} {offset} 小時。這是目前偏移；夏令時間切換日部分小時可能相差一小時。" },
        { q: "{a} 或 {b} 實行夏令時間嗎？", a: "WorldTime 會為每個城市自動辨識夏令時間，對照表已體現每一天的實際偏移。" },
        { q: "{a} 與 {b} 之間開會的最佳時間？", a: "開啟首頁，新增這兩個城市，用熱力圖找到重疊的工作時段，再匯出至日曆。" },
      ],
      relatedTitle: "相關時區轉換",
    },
  },

  es: {
    appHomeTitle: "WorldTime — Reloj mundial, conversor de zonas horarias y planificador de reuniones",
    appHomeDescription:
      "Reloj mundial y conversor de zonas horarias gratuito. Compara la hora local entre ciudades, planifica reuniones internacionales y organiza tu agenda entre zonas horarias con soporte automático del horario de verano.",
    seo: {
      featuresTitle: "Funciones principales",
      features: [
        { title: "Reloj mundial", desc: "Consulta la hora local actual de ciudades y zonas horarias de todo el mundo, una al lado de otra." },
        { title: "Conversor de zonas horarias", desc: "Convierte cualquier hora entre dos ciudades o zonas y obtén la diferencia en tiempo real." },
        { title: "Planificador de reuniones", desc: "Elige una hora una vez y ve al instante las horas locales de cada participante." },
        { title: "Compatible con horario de verano", desc: "Los cambios de horario de verano se detectan automáticamente, por lo que la diferencia es correcta todo el año." },
        { title: "11 idiomas", desc: "La interfaz, las ciudades y las zonas horarias están traducidas a 11 idiomas." },
        { title: "Gratis y sin registro", desc: "Sin cuenta, sin instalación y sin pago. Abre la página y empieza a comparar horas." },
      ],
      useCasesTitle: "Casos de uso",
      useCases: [
        { title: "Equipos remotos distribuidos", desc: "Encuentra el solapamiento entre compañeros de distintas zonas y elige horas que sirvan para todos." },
        { title: "Viajes internacionales", desc: "Comprueba la hora de tu destino antes de volar y planifica las llamadas a casa." },
        { title: "Forex y trading", desc: "Controla de un vistazo el horario de mercado de Londres, Nueva York, Tokio y Sídney." },
        { title: "Soporte global y turno Follow-the-Sun", desc: "Pasa turnos entre regiones y siempre sabe quién está trabajando." },
        { title: "Reuniones entre oficinas", desc: "Agenda reuniones entre oficinas sin cálculos mentales ni errores de una hora." },
      ],
      faqTitle: "Preguntas frecuentes",
      faq: [
        { q: "¿Cómo comparo la hora de dos ciudades?", a: "Añade las ciudades con el buscador y la cuadrícula muestra cada hora una al lado de otra, con la diferencia en tiempo real." },
        { q: "¿WorldTime tiene en cuenta el horario de verano?", a: "Sí. Los cambios de horario de verano se detectan automáticamente para cada ciudad, por lo que la diferencia es correcta también en los días de cambio." },
        { q: "¿Cómo encuentro la mejor hora para una reunión internacional?", a: "Añade las ciudades de todos los participantes y usa el mapa de calor para encontrar horas en las que nadie esté dormido. Selecciona una franja para exportarla al calendario." },
        { q: "¿Es gratis WorldTime?", a: "Sí, WorldTime es totalmente gratuito, funciona en el navegador y no necesita cuenta." },
        { q: "¿La hora que se muestra es en tiempo real?", a: "La hora actual se actualiza en vivo en tu navegador. Las páginas de conversión actualizan sus tablas cada hora." },
      ],
    },
    landing: {
      metaDescription:
        "Diferencia horaria entre {a} y {b}: desfase de zona horaria en vivo, tabla de comparación hora por hora y planificación de reuniones con horario de verano. Consulta qué hora es ahora en {b}.",
      intro:
        "Convierte la hora entre {a} y {b}: consulta la diferencia horaria actual (desfase), una comparación completa hora por hora y si aplica el horario de verano. Úsalo para organizar llamadas, reuniones y viajes entre ambas ubicaciones.",
      dirAhead: "por delante de",
      dirBehind: "por detrás de",
      faqTitle: "Preguntas frecuentes",
      faq: [
        { q: "¿Cuál es la diferencia horaria entre {a} y {b}?", a: "{b} está {offset} horas {dir} {a}. Es el desfase actual; en los días de cambio de horario de verano algunas horas pueden diferir en una hora." },
        { q: "¿{a} o {b} tienen horario de verano?", a: "WorldTime detecta el horario de verano automáticamente para cada ciudad. La tabla de comparación ya refleja el desfase real de cada día." },
        { q: "¿Cuál es la mejor hora para una reunión entre {a} y {b}?", a: "Abre la página principal, añade ambas ciudades y usa el mapa de calor para encontrar horas laborables que se solapen; luego exporta la franja al calendario." },
      ],
      relatedTitle: "Conversores de zona horaria relacionados",
    },
  },

  fr: {
    appHomeTitle: "WorldTime — Horloge mondiale, convertisseur de fuseaux horaires et planificateur de réunions",
    appHomeDescription:
      "Horloge mondiale et convertisseur de fuseaux horaires gratuits. Comparez l'heure locale entre villes, planifiez vos réunions internationales et organisez votre agenda entre fuseaux avec prise en charge automatique de l'heure d'été.",
    seo: {
      featuresTitle: "Fonctionnalités principales",
      features: [
        { title: "Horloge mondiale", desc: "Affichez l'heure locale actuelle des villes et fuseaux horaires du monde entier, côte à côte." },
        { title: "Convertisseur de fuseaux horaires", desc: "Convertit n'importe quelle heure entre deux villes ou fuseaux et donne le décalage en temps réel." },
        { title: "Planificateur de réunions", desc: "Choisissez une heure une fois et voyez instantanément les heures locales de chaque participant." },
        { title: "Compatible heure d'été", desc: "Les passages à l'heure d'été sont détectés automatiquement, le décalage reste correct toute l'année." },
        { title: "11 langues", desc: "L'interface, les villes et les fuseaux horaires sont traduits en 11 langues." },
        { title: "Gratuit, sans inscription", desc: "Sans compte, sans installation, sans paywall. Ouvrez la page et commencez à comparer les heures." },
      ],
      useCasesTitle: "Cas d'usage",
      useCases: [
        { title: "Équipes distantes distribuées", desc: "Trouvez les créneaux communs entre collègues de fuseaux différents et choisissez des heures qui conviennent à tous." },
        { title: "Voyages internationaux", desc: "Vérifiez l'heure de votre destination avant de partir et planifiez vos appels vers chez vous." },
        { title: "Forex et trading", desc: "Suivez d'un coup d'œil les heures d'ouverture de Londres, New York, Tokyo et Sydney." },
        { title: "Support global et Follow-the-Sun", desc: "Transférez les relèves entre régions et sachez toujours qui est en service." },
        { title: "Réunions intersites", desc: "Planifiez des réunions entre bureaux sans calcul mental ni erreur d'une heure." },
      ],
      faqTitle: "Questions fréquentes",
      faq: [
        { q: "Comment comparer l'heure de deux villes ?", a: "Ajoutez les villes via la barre de recherche et la grille affiche chaque heure côte à côte, avec le décalage en temps réel." },
        { q: "WorldTime gère-t-il l'heure d'été ?", a: "Oui. Les passages à l'heure d'été sont détectés automatiquement pour chaque ville, le décalage reste correct les jours de changement." },
        { q: "Comment trouver la meilleure heure pour une réunion internationale ?", a: "Ajoutez les villes de tous les participants, puis utilisez la carte de chaleur pour trouver des créneaux où personne ne dort. Sélectionnez une plage pour l'exporter vers votre calendrier." },
        { q: "WorldTime est-il gratuit ?", a: "Oui, WorldTime est entièrement gratuit, fonctionne dans le navigateur et ne nécessite pas de compte." },
        { q: "L'heure affichée est-elle en temps réel ?", a: "L'heure actuelle se met à jour en direct dans votre navigateur. Les pages de conversion actualisent leurs tableaux toutes les heures." },
      ],
    },
    landing: {
      metaDescription:
        "Décalage horaire entre {a} et {b} : décalage de fuseau en direct, tableau de comparaison heure par heure et planification de réunions avec heure d'été. Voyez quelle heure il est à {b} maintenant.",
      intro:
        "Convertir l'heure entre {a} et {b} : consultez le décalage horaire actuel, une comparaison complète heure par heure et l'application de l'heure d'été, pour organiser appels, réunions et déplacements entre les deux lieux.",
      dirAhead: "en avance sur",
      dirBehind: "en retard sur",
      faqTitle: "Questions fréquentes",
      faq: [
        { q: "Quelle est la différence d'heure entre {a} et {b} ?", a: "{b} est {offset} heures {dir} {a}. C'est le décalage actuel ; les jours de passage à l'heure d'été, certaines heures peuvent différer d'une heure." },
        { q: "{a} ou {b} appliquent-ils l'heure d'été ?", a: "WorldTime détecte l'heure d'été automatiquement pour chaque ville. Le tableau de comparaison reflète déjà le décalage réel de chaque jour." },
        { q: "Quelle est la meilleure heure pour une réunion entre {a} et {b} ?", a: "Ouvrez la page d'accueil, ajoutez les deux villes et utilisez la carte de chaleur pour trouver les heures de travail communes, puis exportez la plage vers votre calendrier." },
      ],
      relatedTitle: "Convertisseurs de fuseau horaire associés",
    },
  },

  de: {
    appHomeTitle: "WorldTime — Weltuhr, Zeitzonenkonverter und Meeting-Planer",
    appHomeDescription:
      "Kostenlose Weltuhr und Zeitzonenkonverter. Vergleichen Sie die Ortszeit zwischen Städten, planen Sie internationale Meetings und organisieren Sie Termine über Zeitzonen hinweg mit automatischer Sommerzeit-Unterstützung.",
    seo: {
      featuresTitle: "Hauptfunktionen",
      features: [
        { title: "Weltuhr", desc: "Sehen Sie die aktuelle Ortszeit von Städten und Zeitzonen weltweit, Seite an Seite." },
        { title: "Zeitzonenkonverter", desc: "Rechnen Sie jede Zeit zwischen zwei Städten oder Zonen um und erhalten Sie den Versatz in Echtzeit." },
        { title: "Meeting-Planer", desc: "Wählen Sie einmal eine Uhrzeit und sehen Sie sofort die passende Ortszeit jedes Teilnehmers." },
        { title: "Sommerzeitfähig", desc: "Sommerzeitumstellungen werden automatisch erkannt, der Versatz bleibt das ganze Jahr korrekt." },
        { title: "11 Sprachen", desc: "Oberfläche, Städte und Zeitzonen sind vollständig in 11 Sprachen übersetzt." },
        { title: "Kostenlos, ohne Anmeldung", desc: "Kein Konto, keine Installation, keine Paywall. Seite öffnen und sofort Zeiten vergleichen." },
      ],
      useCasesTitle: "Anwendungsfälle",
      useCases: [
        { title: "Verteilte Remote-Teams", desc: "Finden Sie die Überschneidung zwischen Teamkollegen in verschiedenen Zonen und wählen Sie passende Uhrzeiten." },
        { title: "Internationales Reisen", desc: "Prüfen Sie die Zeit am Zielort vor dem Flug und planen Sie Anrufe nach Hause." },
        { title: "Forex & Trading", desc: "Behalten Sie die Handelszeiten von London, New York, Tokio und Sydney auf einen Blick." },
        { title: "Globaler Support & Follow-the-Sun", desc: "Geben Sie Schichten zwischen Regionen weiter und wissen Sie immer, wer Dienst hat." },
        { title: "Standortübergreifende Meetings", desc: "Buchen Sie Meetings zwischen Büros ohne Kopfrechnen oder Ein-Stunden-Fehler." },
      ],
      faqTitle: "Häufige Fragen",
      faq: [
        { q: "Wie vergleiche ich die Zeit in zwei Städten?", a: "Fügen Sie die Städte über das Suchfeld hinzu, und das Raster zeigt jede Stunde Seite an Seite mit dem Versatz in Echtzeit." },
        { q: "Berücksichtigt WorldTime die Sommerzeit?", a: "Ja. Sommerzeitumstellungen werden automatisch pro Stadt erkannt, der Versatz stimmt auch an Umstellungstagen." },
        { q: "Wie finde ich die beste Zeit für ein internationales Meeting?", a: "Fügen Sie die Städte aller Teilnehmer hinzu und nutzen Sie die Heatmap, um Stunden ohne Schlafende zu finden. Wählen Sie ein Fenster und exportieren Sie es in den Kalender." },
        { q: "Ist WorldTime kostenlos?", a: "Ja, WorldTime ist komplett kostenlos, läuft im Browser und benötigt kein Konto." },
        { q: "Ist die angezeigte Zeit echtzeitig?", a: "Die aktuelle Zeit aktualisiert sich live im Browser. Die Konverterseiten aktualisieren ihre Tabellen stündlich." },
      ],
    },
    landing: {
      metaDescription:
        "Zeitunterschied zwischen {a} und {b}: Live-Zeitzonenversatz, stündliche Vergleichstabelle und sommerzeitfähige Meeting-Planung. Sehen Sie sofort, wie spät es jetzt in {b} ist.",
      intro:
        "Zeit zwischen {a} und {b} umrechnen: aktueller Zeitunterschied (Versatz), ein vollständiger stündlicher Vergleich und ob Sommerzeit gilt – für Anrufe, Meetings und Reisen zwischen beiden Orten.",
      dirAhead: "vor",
      dirBehind: "hinter",
      faqTitle: "Häufige Fragen",
      faq: [
        { q: "Wie groß ist der Zeitunterschied zwischen {a} und {b}?", a: "{b} liegt {offset} Stunden {dir} {a}. Das ist der aktuelle Versatz; an Sommerzeitumstellungstagen können einige Stunden um eine Stunde abweichen." },
        { q: "Gelten in {a} oder {b} Sommerzeit?", a: "WorldTime erkennt die Sommerzeit automatisch für jede Stadt. Die Vergleichstabelle spiegelt bereits den tatsächlichen Versatz jedes Tages wider." },
        { q: "Wann ist die beste Zeit für ein Meeting zwischen {a} und {b}?", a: "Öffnen Sie die Startseite, fügen Sie beide Städte hinzu und nutzen Sie die Heatmap für gemeinsame Arbeitszeiten; exportieren Sie das Fenster dann in den Kalender." },
      ],
      relatedTitle: "Verwandte Zeitzonenkonverter",
    },
  },

  ja: {
    appHomeTitle: "WorldTime — 世界時計・タイムゾーン変換・会議スケジュールツール",
    appHomeDescription:
      "無料の世界時計・タイムゾーン変換ツール。都市間の現地時刻を比較し、国際会議を計画し、夏時間に自動対応してタイムゾーンをまたぐ予定調整を支援します。",
    seo: {
      featuresTitle: "主な機能",
      features: [
        { title: "世界時計", desc: "世界中の都市とタイムゾーンの現在の現地時刻を横並びで表示します。" },
        { title: "タイムゾーン変換", desc: "2つの都市またはゾーン間の任意の時刻を換算し、リアルタイムの時差を取得します。" },
        { title: "会議スケジュール", desc: "時間を一度選ぶだけで、全参加者の現地時刻が即座に分かります。" },
        { title: "夏時間対応", desc: "夏時間の切替を自動検出するため、時差は一年中正確です。" },
        { title: "11言語対応", desc: "インターフェイス・都市・タイムゾーンは11言語に完全ローカライズされています。" },
        { title: "無料・登録不要", desc: "アカウント不要・インストール不要・課金なし。ページを開けばすぐに時刻を比較できます。" },
      ],
      useCasesTitle: "ユースケース",
      useCases: [
        { title: "時差のあるリモートチーム", desc: "異なるゾーンのメンバーの重なる時間を見つけ、全員に合う時刻を選びます。" },
        { title: "海外出張", desc: "出発前に目的地の時刻を確認し、本国への電話を計画できます。" },
        { title: "FX・トレード", desc: "ロンドン・ニューヨーク・東京・シドニーの市場時間を一目で把握できます。" },
        { title: "グローバルサポート・サンセット引き継ぎ", desc: "地域間でシフトを引き継ぎ、誰が勤務中かを常に把握できます。" },
        { title: "拠点間会議設定", desc: "オフィス間の会議を、暗算や1時間の誤差なしに予約できます。" },
      ],
      faqTitle: "よくある質問",
      faq: [
        { q: "2つの都市の時刻を比較するには？", a: "検索ボックスで都市を追加すると、時間グリッドが1時間ごとに横並びで表示され、リアルタイムの時差も分かります。" },
        { q: "WorldTimeは夏時間に対応していますか？", a: "はい。各都市の夏時間切替を自動検出するため、サマータイム導入・終了当日の時差も正確です。" },
        { q: "国際会議の最適な時間をどう見つければよいですか？", a: "全参加者の都市を追加し、ヒートマップで誰も寝ていない時間帯を見つけます。枠を選んでカレンダーにエクスポートできます。" },
        { q: "WorldTimeは無料ですか？", a: "完全無料で、ブラウザで動作し、アカウントは不要です。" },
        { q: "表示される時刻はリアルタイムですか？", a: "現在時刻はブラウザでライブ更新されます。変換ページの表は1時間ごとに更新されます。" },
      ],
    },
    landing: {
      metaDescription:
        "{a}と{b}の時差：リアルタイムのタイムゾーンオフセット、時間ごとの比較表、夏時間対応の会議計画。今の{b}の現地時刻を確認できます。",
      intro:
        "{a}と{b}の間で時刻を変換：現在の時差（オフセット）、完全な時間ごとの比較、夏時間の有無を確認できます。両地間の電話・会議・移動の計画にご利用ください。",
      dirAhead: "進んでいます",
      dirBehind: "遅れています",
      faqTitle: "よくある質問",
      faq: [
        { q: "{a}と{b}の時差はどれくらいですか？", a: "{b}は{a}より{offset}時間{dir}。これは現在のオフセットで、夏時間切替日は一部の時間が1時間異なる場合があります。" },
        { q: "{a}や{b}は夏時間を採用していますか？", a: "WorldTimeは各都市の夏時間を自動検出します。比較表は毎日の実際のオフセットを反映しています。" },
        { q: "{a}と{b}の会議に最適な時間は？", a: "ホームページを開き、両都市を追加して、ヒートマップで重なる勤務時間を見つけ、カレンダーにエクスポートしてください。" },
      ],
      relatedTitle: "関連するタイムゾーン変換",
    },
  },

  ko: {
    appHomeTitle: "WorldTime — 세계 시계, 시간대 변환기 및 회의 일정 도구",
    appHomeDescription:
      "무료 세계 시계 및 시간대 변환기입니다. 도시 간 현지 시간을 비교하고, 국제 회의를 계획하며, 일광절약시간을 자동으로 지원하여 시간대 간 일정을 쉽게 관리하세요.",
    seo: {
      featuresTitle: "주요 기능",
      features: [
        { title: "세계 시계", desc: "전 세계 도시와 시간대의 현재 현지 시간을 나란히 확인하세요." },
        { title: "시간대 변환", desc: "두 도시 또는 시간대 간 임의 시간을 변환하고 실시간 오프셋을 받습니다." },
        { title: "회의 일정", desc: "시간을 한 번 선택하면 모든 참여자의 현지 시간을 즉시 볼 수 있습니다." },
        { title: "일광절약시간 지원", desc: "일광절약시간 전환을 자동으로 감지하여 연중 오프셋이 정확합니다." },
        { title: "11개 언어", desc: "인터페이스, 도시, 시간대가 11개 언어로 완전 번역되어 있습니다." },
        { title: "무료, 가입 불필요", desc: "계정 없음, 설치 없음, 유료 결제 없음. 페이지를 열면 바로 시간을 비교할 수 있습니다." },
      ],
      useCasesTitle: "활용 사례",
      useCases: [
        { title: "시간대가 다른 원격 팀", desc: "다른 시간대 팀원 간 겹치는 시간을 찾아 모두에게 맞는 시간을 선택하세요." },
        { title: "해외 여행", desc: "출발 전 목적지 시간을 확인하고 본국과의 통화를 계획하세요." },
        { title: "외환 및 트레이딩", desc: "런던·뉴욕·도쿄·시드니 시장 시간을 한눈에 파악하세요." },
        { title: "글로벌 지원 및 주야 교대", desc: "지역 간 교대를 넘기고 누가 근무 중인지 항상 알 수 있습니다." },
        { title: "사무실 간 회의 예약", desc: "암산이나 한 시간 오차 없이 사무실 간 회의를 잡으세요." },
      ],
      faqTitle: "자주 묻는 질문",
      faq: [
        { q: "두 도시의 시간을 어떻게 비교하나요?", a: "검색창에 도시를 추가하면 시간 그리드가 매 시간마다 나란히 표시되며 실시간 오프셋도 보여줍니다." },
        { q: "WorldTime은 일광절약시간을 지원하나요?", a: "네. 각 도시의 일광절약시간 전환을 자동으로 감지하여 전환 당일에도 오프셋이 정확합니다." },
        { q: "국제 회의의 최적 시간을 어떻게 찾나요?", a: "모든 참여자의 도시를 추가한 뒤 색상 히트맵으로 아무도 자지 않는 시간을 찾으세요. 슬롯을 선택해 캘린더로 내보낼 수 있습니다." },
        { q: "WorldTime은 무료인가요?", a: "네, 완전 무료이며 브라우저에서 작동하고 계정이 필요 없습니다." },
        { q: "표시되는 시간이 실시간인가요?", a: "현재 시간은 브라우저에서 실시간으로 업데이트됩니다. 변환 페이지의 표는 매시간 새로고침됩니다." },
      ],
    },
    landing: {
      metaDescription:
        "{a}와(과) {b}의 시차: 실시간 시간대 오프셋, 시간별 비교표, 일광절약시간을 지원하는 회의 계획. 지금 {b}의 현지 시간을 확인하세요.",
      intro:
        "{a}와(과) {b} 사이 시간 변환: 현재 시차(오프셋), 전체 시간별 비교, 일광절약시간 적용 여부를 확인하세요. 두 지역 간 통화·회의·여행 일정에 활용하세요.",
      dirAhead: "앞섭니다",
      dirBehind: "뒤처집니다",
      faqTitle: "자주 묻는 질문",
      faq: [
        { q: "{a}와(과) {b}의 시차는 얼마인가요?", a: "{b}는(은) {a}보다 {offset}시간 {dir}. 현재 오프셋이며, 일광절약시간 전환일에는 일부 시간이 1시간 다를 수 있습니다." },
        { q: "{a} 또는 {b}는 일광절약시간을 사용하나요?", a: "WorldTime은 각 도시의 일광절약시간을 자동으로 감지합니다. 비교표는 매일의 실제 오프셋을 반영합니다." },
        { q: "{a}와(과) {b} 회의의 최적 시간은?", a: "홈페이지를 열고 두 도시를 추가한 뒤 히트맵으로 겹치는 근무 시간을 찾고 캘린더로 내보내세요." },
      ],
      relatedTitle: "관련 시간대 변환",
    },
  },

  pt: {
    appHomeTitle: "WorldTime — Relógio mundial, conversor de fusos horários e agenda de reuniões",
    appHomeDescription:
      "Relógio mundial e conversor de fusos horários gratuito. Compare o horário local entre cidades, planeje reuniões internacionais e organize sua agenda entre fusos com suporte automático ao horário de verão.",
    seo: {
      featuresTitle: "Principais recursos",
      features: [
        { title: "Relógio mundial", desc: "Veja a hora local atual de cidades e fusos horários do mundo todo, lado a lado." },
        { title: "Conversor de fusos horários", desc: "Converta qualquer hora entre duas cidades ou fusos e obtenha a diferença em tempo real." },
        { title: "Agenda de reuniões", desc: "Escolha um horário uma vez e veja instantaneamente as horas locais de cada participante." },
        { title: "Suporta horário de verão", desc: "As mudanças de horário de verão são detectadas automaticamente, mantendo a diferença correta o ano todo." },
        { title: "11 idiomas", desc: "A interface, as cidades e os fusos horários estão totalmente traduzidos em 11 idiomas." },
        { title: "Grátis, sem cadastro", desc: "Sem conta, sem instalação, sem paywall. Abra a página e comece a comparar horários." },
      ],
      useCasesTitle: "Casos de uso",
      useCases: [
        { title: "Equipes remotas distribuídas", desc: "Encontre a interseção entre colegas de fusos diferentes e escolha horários que servem para todos." },
        { title: "Viagens internacionais", desc: "Confira a hora do destino antes de voar e planeje ligações para casa." },
        { title: "Forex e trading", desc: "Acompanhe de relance o horário de mercado de Londres, Nova York, Tóquio e Sydney." },
        { title: "Suporte global e Follow-the-Sun", desc: "Repasse turnos entre regiões e saiba sempre quem está trabalhando." },
        { title: "Reuniões entre escritórios", desc: "Agende reuniões entre escritórios sem cálculo mental nem erros de uma hora." },
      ],
      faqTitle: "Perguntas frequentes",
      faq: [
        { q: "Como comparo a hora em duas cidades?", a: "Adicione as cidades pela busca e a grade mostra cada hora lado a lado, com a diferença em tempo real." },
        { q: "O WorldTime considera o horário de verão?", a: "Sim. As mudanças de horário de verão são detectadas automaticamente por cidade, então a diferença fica correta também nos dias de transição." },
        { q: "Como encontro o melhor horário para uma reunião internacional?", a: "Adicione as cidades de todos os participantes e use o mapa de calor para achar faixas em que ninguém esteja dormindo. Selecione um slot para exportá-lo ao calendário." },
        { q: "O WorldTime é gratuito?", a: "Sim, o WorldTime é totalmente gratuito, funciona no navegador e não exige conta." },
        { q: "A hora mostrada é em tempo real?", a: "A hora atual é atualizada ao vivo no seu navegador. As páginas de conversão atualizam suas tabelas a cada hora." },
      ],
    },
    landing: {
      metaDescription:
        "Diferença de horário entre {a} e {b}: defasagem de fuso ao vivo, tabela de comparação hora a hora e planejamento de reuniões com horário de verão. Veja que horas são agora em {b}.",
      intro:
        "Converta a hora entre {a} e {b}: veja a diferença de horário atual (defasagem), uma comparação completa hora a hora e se o horário de verão se aplica, para organizar ligações, reuniões e viagens entre os dois locais.",
      dirAhead: "à frente de",
      dirBehind: "atrás de",
      faqTitle: "Perguntas frequentes",
      faq: [
        { q: "Qual é a diferença de horário entre {a} e {b}?", a: "{b} está {offset} horas {dir} {a}. Esta é a defasagem atual; nos dias de mudança de horário de verão, algumas horas podem diferir em uma hora." },
        { q: "{a} ou {b} adotam horário de verão?", a: "O WorldTime detecta o horário de verão automaticamente para cada cidade. A tabela de comparação já reflete a defasagem real de cada dia." },
        { q: "Qual o melhor horário para uma reunião entre {a} e {b}?", a: "Abra a página inicial, adicione ambas as cidades e use o mapa de calor para encontrar horários úteis sobrepostos; depois exporte o slot ao calendário." },
      ],
      relatedTitle: "Conversores de fuso horário relacionados",
    },
  },

  ru: {
    appHomeTitle: "WorldTime — Мировые часы, конвертер часовых поясов и планировщик встреч",
    appHomeDescription:
      "Бесплатные мировые часы и конвертер часовых поясов. Сравнивайте местное время между городами, планируйте международные встречи и ведите расписание между поясами с автоматическим учётом летнего времени.",
    seo: {
      featuresTitle: "Основные возможности",
      features: [
        { title: "Мировые часы", desc: "Видите текущее местное время городов и часовых поясов всего мира — бок о бок." },
        { title: "Конвертер поясов", desc: "Переводите любое время между двумя городами или поясами и получаете смещение в реальном времени." },
        { title: "Планировщик встреч", desc: "Выберите время один раз — и сразу видите местные часы каждого участника." },
        { title: "С учётом летнего времени", desc: "Переходы на летнее время определяются автоматически, смещение корректно круглый год." },
        { title: "11 языков", desc: "Интерфейс, города и часовые пояса полностью переведены на 11 языков." },
        { title: "Бесплатно, без регистрации", desc: "Без аккаунта, без установки, без платных функций. Откройте страницу и сравнивайте время сразу." },
      ],
      useCasesTitle: "Сценарии использования",
      useCases: [
        { title: "Распределённые удалённые команды", desc: "Находите пересечение коллег из разных поясов и выбирайте удобные для всех часы." },
        { title: "Международные поездки", desc: "Проверяйте время в пункте назначения до вылета и планируйте звонки домой." },
        { title: "Форекс и трейдинг", desc: "Следите за часами работы рынков Лондона, Нью-Йорка, Токио и Сиднея с одного взгляда." },
        { title: "Глобальная поддержка и Follow-the-Sun", desc: "Передавайте смены между регионами и всегда знаете, кто на смене." },
        { title: "Встречи между офисами", desc: "Назначайте встречи между офисами без подсчётов в уме и ошибок на час." },
      ],
      faqTitle: "Частые вопросы",
      faq: [
        { q: "Как сравнить время в двух городах?", a: "Добавьте города через поиск — сетка покажет каждый час бок о бок с живым смещением между ними." },
        { q: "WorldTime учитывает летнее время?", a: "Да. Переходы на летнее время определяются автоматически для каждого города, поэтому смещение корректно и в дни перевода часов." },
        { q: "Как найти лучшее время для международной встречи?", a: "Добавьте города всех участников и с помощью тепловой карты найдите часы, когда никто не спит. Выберите слот и экспортируйте его в календарь." },
        { q: "WorldTime бесплатен?", a: "Да, WorldTime полностью бесплатен, работает в браузере и не требует аккаунта." },
        { q: "Показанное время обновляется в реальном времени?", a: "Текущее время обновляется вживую в браузере. Таблицы на страницах конвертера обновляются ежечасно." },
      ],
    },
    landing: {
      metaDescription:
        "Разница во времени между {a} и {b}: смещение пояса в реальном времени, таблица сравнения по часам и планирование встреч с учётом летнего времени. Узнайте, который час сейчас в {b}.",
      intro:
        "Перевод времени между {a} и {b}: текущая разница (смещение), полное сравнение по часам и применение летнего времени — для звонков, встреч и поездок между двумя местами.",
      dirAhead: "опережает",
      dirBehind: "отстаёт от",
      faqTitle: "Частые вопросы",
      faq: [
        { q: "Какова разница во времени между {a} и {b}?", a: "{b} {dir} {a} на {offset} часов. Это текущее смещение; в дни перехода на летнее время некоторые часы могут отличаться на один час." },
        { q: "В {a} или {b} есть летнее время?", a: "WorldTime определяет летнее время автоматически для каждого города. Таблица сравнения уже учитывает фактическое смещение каждого дня." },
        { q: "Лучшее время для встречи между {a} и {b}?", a: "Откройте главную страницу, добавьте оба города и найдите пересечение рабочих часов по тепловой карте, затем экспортируйте слот в календарь." },
      ],
      relatedTitle: "Похожие конвертеры часовых поясов",
    },
  },

  vi: {
    appHomeTitle: "WorldTime — Đồng hồ thế giới, trình chuyển đổi múi giờ và lên lịch họp",
    appHomeDescription:
      "Đồng hồ thế giới và trình chuyển đổi múi giờ miễn phí. So sánh giờ địa phương giữa các thành phố, lên lịch họp quốc tế và sắp xếp thời gian biểu giữa các múi giờ với hỗ trợ giờ mùa hè tự động.",
    seo: {
      featuresTitle: "Tính năng chính",
      features: [
        { title: "Đồng hồ thế giới", desc: "Xem giờ địa phương hiện tại của các thành phố và múi giờ trên toàn thế giới, xếp cạnh nhau." },
        { title: "Chuyển đổi múi giờ", desc: "Chuyển đổi bất kỳ giờ nào giữa hai thành phố hoặc múi giờ và nhận độ lệch theo thời gian thực." },
        { title: "Lên lịch họp", desc: "Chọn giờ một lần và xem ngay giờ địa phương của từng người tham gia." },
        { title: "Hỗ trợ giờ mùa hè", desc: "Giờ mùa hè được phát hiện tự động nên độ lệch luôn đúng quanh năm." },
        { title: "11 ngôn ngữ", desc: "Giao diện, thành phố và múi giờ được dịch đầy đủ sang 11 ngôn ngữ." },
        { title: "Miễn phí, không cần đăng ký", desc: "Không tài khoản, không cài đặt, không trả phí. Mở trang là có thể so sánh giờ ngay." },
      ],
      useCasesTitle: "Trường hợp sử dụng",
      useCases: [
        { title: "Nhóm từ xa phân tán", desc: "Tìm khoảng giao thoa giữa đồng nghiệp ở các múi giờ khác nhau và chọn giờ phù hợp với tất cả." },
        { title: "Du lịch quốc tế", desc: "Kiểm tra giờ tại điểm đến trước khi bay và lên kế hoạch gọi về nhà." },
        { title: "Forex & giao dịch", desc: "Theo dõi nhanh giờ giao dịch của London, New York, Tokyo và Sydney." },
        { title: "Hỗ trợ toàn cầu & Follow-the-sun", desc: "Bàn giao ca giữa các khu vực và luôn biết ai đang trực." },
        { title: "Đặt họp giữa các văn phòng", desc: "Đặt lịch họp giữa các văn phòng không cần tính nhẩm hay sai lệch một giờ." },
      ],
      faqTitle: "Câu hỏi thường gặp",
      faq: [
        { q: "Làm sao để so sánh giờ ở hai thành phố?", a: "Thêm thành phố qua ô tìm kiếm, lưới thời gian sẽ hiển thị từng giờ cạnh nhau cùng độ lệch theo thời gian thực." },
        { q: "WorldTime có hỗ trợ giờ mùa hè không?", a: "Có. Việc chuyển đổi giờ mùa hè được phát hiện tự động cho từng thành phố, nên độ lệch đúng cả những ngày đổi giờ." },
        { q: "Tìm giờ tốt nhất cho cuộc họp quốc tế thế nào?", a: "Thêm thành phố của mọi người, dùng bản đồ nhiệt để tìm khung giờ không ai ngủ. Chọn khung và xuất sang lịch." },
        { q: "WorldTime có miễn phí không?", a: "Có, WorldTime hoàn toàn miễn phí, chạy trên trình duyệt và không cần tài khoản." },
        { q: "Giờ hiển thị có theo thời gian thực không?", a: "Giờ hiện tại cập nhật trực tiếp trong trình duyệt. Các trang chuyển đổi làm mới bảng mỗi giờ." },
      ],
    },
    landing: {
      metaDescription:
        "Chênh lệch giờ giữa {a} và {b}: độ bù múi giờ trực tiếp, bảng so sánh từng giờ và lên lịch họp có hỗ trợ giờ mùa hè. Xem ngay bây giờ là mấy giờ ở {b}.",
      intro:
        "Chuyển đổi giờ giữa {a} và {b}: xem chênh lệch giờ hiện tại (độ bù), bảng so sánh từng giờ đầy đủ và việc có áp dụng giờ mùa hè, để sắp xếp cuộc gọi, họp và chuyến đi giữa hai địa điểm.",
      dirAhead: "nhanh hơn",
      dirBehind: "chậm hơn",
      faqTitle: "Câu hỏi thường gặp",
      faq: [
        { q: "Chênh lệch giờ giữa {a} và {b} là bao nhiêu?", a: "{b} {dir} {a} {offset} giờ. Đây là độ bù hiện tại; vào ngày chuyển đổi giờ mùa hè một số giờ có thể lệch một giờ." },
        { q: "{a} hay {b} có dùng giờ mùa hè không?", a: "WorldTime tự động phát hiện giờ mùa hè cho từng thành phố. Bảng so sánh đã phản ánh độ bù thực của từng ngày." },
        { q: "Giờ tốt nhất cho cuộc họp giữa {a} và {b}?", a: "Mở trang chủ, thêm cả hai thành phố và dùng bản đồ nhiệt tìm giờ làm việc chồng lấp, sau đó xuất khung giờ sang lịch." },
      ],
      relatedTitle: "Trình chuyển đổi múi giờ liên quan",
    },
  },
};

let touched = 0;
for (const [locale, data] of Object.entries(LOCALES)) {
  const file = resolve(messagesDir, `${locale}.json`);
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.App = json.App ?? {};
  json.App.homeTitle = data.appHomeTitle;
  json.App.homeDescription = data.appHomeDescription;
  json.Seo = json.Seo ?? {};
  json.Seo.featuresTitle = data.seo.featuresTitle;
  json.Seo.features = data.seo.features;
  json.Seo.useCasesTitle = data.seo.useCasesTitle;
  json.Seo.useCases = data.seo.useCases;
  json.Seo.faqTitle = data.seo.faqTitle;
  json.Seo.faq = data.seo.faq;
  json.Landing = json.Landing ?? {};
  json.Landing.metaDescription = data.landing.metaDescription;
  json.Landing.intro = data.landing.intro;
  json.Landing.dirAhead = data.landing.dirAhead;
  json.Landing.dirBehind = data.landing.dirBehind;
  json.Landing.faqTitle = data.landing.faqTitle;
  json.Landing.faq = data.landing.faq;
  json.Landing.relatedTitle = data.landing.relatedTitle;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  touched++;
  console.log(`updated ${locale}.json (App + Seo + Landing)`);
}
console.log(`done: ${touched} locale files updated`);
