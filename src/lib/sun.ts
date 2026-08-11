import { DateTime } from "luxon";

/**
 * 日出日落计算（6.7），基于 NOAA 太阳计算算法的简化实现。
 * 输入：纬度（度）、经度（度）、日期时刻。
 * 输出：日出、日落的本地时刻（DateTime），或 null（极昼/极夜/该日无日出日落）。
 *
 * 参考：https://gml.noaa.gov/grad/solcalc/calcdetails.html
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** 儒略日。 */
function julianDay(dt: DateTime): number {
  return dt.toJSDate().getTime() / 86400000 + 2440587.5;
}

/**
 * 计算太阳赤纬（declination，度）与时差（equation of time，分钟）。
 */
function sunParams(jd: number): { decl: number; eqtime: number } {
  const n = jd - 2451545.0;
  const meanLong = (280.466 + 0.9856474 * n) % 360;
  const meanAnom = 357.528 + 0.9856003 * n;
  const eclipticLong =
    meanLong + 1.915 * Math.sin(meanAnom * RAD) + 0.02 * Math.sin(2 * meanAnom * RAD);
  const obliquity = 23.439 - 0.0000004 * n;
  const decl =
    Math.asin(Math.sin(obliquity * RAD) * Math.sin(eclipticLong * RAD)) * DEG;
  // 时差（分钟）
  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const eqtime =
    4 *
    DEG *
    (y * Math.sin(2 * meanLong * RAD) -
      2 * 0.01671 * Math.sin(meanAnom * RAD) +
      4 * 0.01671 * y * Math.sin(meanAnom * RAD) * Math.cos(2 * meanLong * RAD) -
      0.5 * y * y * Math.sin(4 * meanLong * RAD));
  return { decl, eqtime };
}

/**
 * 计算给定地点在某日的日出日落时刻（DateTime，目标时区）。
 * @param lat 纬度（度，北为正）
 * @param lng 经度（度，东为正）
 * @param zone 目标 IANA 时区
 * @param dateMs 该日任意时刻（毫秒）
 */
export function sunRiseSet(
  lat: number,
  lng: number,
  zone: string,
  dateMs: number,
): { rise: DateTime | null; set: DateTime | null } {
  const dt = DateTime.fromMillis(dateMs, { zone }).startOf("day");
  const jd = julianDay(dt.plus({ hours: 12 }));
  const { decl, eqtime } = sunParams(jd);

  const latR = lat * RAD;
  const declR = decl * RAD;
  const cosH =
    (Math.sin(-0.833 * RAD) - Math.sin(latR) * Math.sin(declR)) /
    (Math.cos(latR) * Math.cos(declR));

  if (cosH > 1) return { rise: null, set: null }; // 极夜
  if (cosH < -1) return { rise: null, set: null }; // 极昼

  const hourAngle = Math.acos(cosH) * DEG;
  // sunrise/sunsetUTC_minutes 是「相对 UTC 午夜的分钟数」。
  // 换算为本地钟面分钟需加上该地的 UTC 偏移（东为正），
  // 再锚定到本地日历日。归一化到 [0,1440) 以处理偏移把分钟推过日界的罕见情形。
  // 注意：不能直接把 UTC 分钟加到 dt.toMillis()（本地午夜 epoch 已含偏移，
  // 否则偏移量会被计算两次，导致结果整体偏差一个 UTC 偏移）。
  const sunriseUTC_minutes = 720 - 4 * (lng + hourAngle) - eqtime;
  const sunsetUTC_minutes = 720 - 4 * (lng - hourAngle) - eqtime;
  const offsetMin = dt.offset;
  const riseMin = ((sunriseUTC_minutes + offsetMin) % 1440 + 1440) % 1440;
  let setMin = ((sunsetUTC_minutes + offsetMin) % 1440 + 1440) % 1440;
  // 处理白昼跨越午夜的近极昼情形（高纬度夏季日落可落在次日 00:00 之后）：
  // 归一化到 [0,1440) 后，若 set < rise，说明日落实际跨入次日，补加一日使其落在
  // 正确的次日时刻（否则会被 dt.plus 解释为当日凌晨、显示「日落早于日出」）。
  if (setMin < riseMin) setMin += 1440;
  return {
    rise: dt.plus({ minutes: riseMin }),
    set: dt.plus({ minutes: setMin }),
  };
}
