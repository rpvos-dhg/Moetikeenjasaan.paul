// Pure rekenfuncties voor Pauze-advies: geen DOM, geen globale state.
// In de browser zijn dit gewone globale functies; in Node (tests) via module.exports.
'use strict';

// ─── Algemeen ────────────────────────────────────────────────────────────────

// Voor tekst van buiten (GitHub-commits) of uit localStorage die in innerHTML belandt.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Badge afleiden uit het eerste woord van de commit ("Fix …" is geen "Nieuw").
function commitType(msg) {
  if (/^(fix|herstel)/i.test(msg)) return 'fix';
  if (/^(refine|improve|update|polish|redesign|qa|follow-?ups?|verbeter)/i.test(msg)) return 'improve';
  return 'new';
}

function durationParts(mins) {
  return { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60), m: mins % 60 };
}

// Deterministische keuze per dag, zodat een tekst niet bij elke verversing wisselt.
function pickDaily(count, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return count > 0 ? h % count : 0;
}

function dateKeyInZone(date, timeZone = 'Europe/Amsterdam') {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date)
    .reduce((acc, part) => { if (part.type !== 'literal') acc[part.type] = part.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// ─── Weerdata ────────────────────────────────────────────────────────────────

// Open-Meteo met timeformat=unixtime geeft seconden (UTC). Hier omgezet naar ms
// voor new Date(). Dat lost ook het dubbele uur bij de wintertijdovergang op,
// dat met lokale tijdstrings niet eenduidig is. Daglabels worden lokale
// datumsleutels (YYYY-MM-DD); rond 12:00 lokaal gemeten, dus DST-veilig.
function normalizeForecast(w) {
  if (!w) return w;
  const off = w.utc_offset_seconds || 0;
  const toMs = v => (typeof v === 'number' ? v * 1000 : Date.parse(v));
  const msArr = arr => (Array.isArray(arr) ? arr.map(toMs) : arr);
  if (w.hourly?.time) w.hourly.time = msArr(w.hourly.time);
  if (w.minutely_15?.time) w.minutely_15.time = msArr(w.minutely_15.time);
  if (w.daily) {
    if (Array.isArray(w.daily.time)) {
      w.daily.time = w.daily.time.map(v => (typeof v === 'number'
        ? new Date((v + off + 43200) * 1000).toISOString().slice(0, 10)
        : v));
    }
    w.daily.sunrise = msArr(w.daily.sunrise);
    w.daily.sunset = msArr(w.daily.sunset);
  }
  if (w.current && w.current.time != null) {
    w.current.time = typeof w.current.time === 'number'
      ? w.current.time * 1000
      : Date.parse(w.current.time + 'Z') - off * 1000;
  }
  return w;
}

// Neemt een hourly-variabele over uit een tweede request, uitgelijnd op tijdstempel.
// replace=false: alleen invullen als het hoofdrequest de variabele niet (bruikbaar) heeft.
function mergeHourlyByTime(target, source, key, replace) {
  const times = source?.time;
  const vals = source?.[key];
  if (!target?.time || !times || !vals) return;
  if (!replace && target[key]?.some(v => v != null)) return;
  const byTime = new Map(times.map((ts, i) => [ts, vals[i]]));
  target[key] = target.time.map(ts => (byTime.has(ts) ? byTime.get(ts) : null));
}

// Tijdstip van de data zelf (ms). Offline kan de service worker een antwoord van
// uren geleden teruggeven; dat mag dan niet als "net bijgewerkt" gelden.
function dataTimestamp(w, nowMs) {
  const ts = w?.current?.time;
  if (!Number.isFinite(ts)) return nowMs;
  return nowMs - ts > 30 * 60000 ? ts : nowMs;
}

// Index van het uurslot dat "nu" bevat (laatste tijdstip <= nu).
function hourlyNowIndex(times, nowMs) {
  if (!times) return -1;
  let idx = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= nowMs) idx = i; else break;
  }
  return idx;
}

// Eerste uurindex vanaf nu waarvan het lokale uur gelijk is aan targetHour.
function hourlyIndexAtHour(times, targetHour, nowMs) {
  if (!times) return -1;
  const start = Math.max(0, hourlyNowIndex(times, nowMs));
  for (let i = start; i < times.length; i++) {
    if (new Date(times[i]).getHours() === targetHour) return i;
  }
  return -1;
}

const POLLEN_KEYS = ['alder', 'birch', 'grass', 'mugwort', 'ragweed', 'olive'];
const POLLEN_THRESHOLDS = { alder: 20, birch: 20, grass: 50, mugwort: 10, ragweed: 10, olive: 20 };

function parsePollen(aq, todayKey, nowMs) {
  const current = aq?.current;
  // Buiten Europa vragen we geen pollen op; dan is er geen data in plaats van "alles 0".
  if (!current || !POLLEN_KEYS.some(k => current[`${k}_pollen`] != null)) return null;
  const pick = (src, i) => Object.fromEntries(POLLEN_KEYS.map(k => [k, (i == null ? src[`${k}_pollen`] : src[`${k}_pollen`]?.[i]) || 0]));
  let tomorrow = null;
  if (aq.hourly?.time) {
    // Lokale datum, niet UTC: anders toont "morgen" tussen 00:00 en 02:00 de waarden van vandaag.
    const noonIdx = aq.hourly.time.findIndex(ts => ts.slice(0, 10) > todayKey && ts.slice(11, 13) === '12');
    if (noonIdx >= 0) tomorrow = pick(aq.hourly, noonIdx);
  }
  return { ...pick(current), tomorrow, fetchedAt: nowMs };
}

// Soorten boven de drempel, in vaste volgorde.
function highPollenKeys(values) {
  if (!values) return [];
  return POLLEN_KEYS.filter(k => (values[k] || 0) > POLLEN_THRESHOLDS[k]);
}

// ─── Advies ──────────────────────────────────────────────────────────────────

const PREF_OFFSETS = { cold: 3, normal: 0, warm: -5 };

// Eén set condities voor advies, wacht-strip en checklist, zodat die elkaar
// niet tegenspreken. Open-Meteo telt neerslag en regenkans per slot over de
// *voorafgaande* periode, dus voor "nu + 30 min" kijken we naar de slots die
// ná nu eindigen. offset = voorkeur + persoonlijke kalibratie (in °C kou).
function computeConditions(w, nowMs, offset = 0) {
  const c = w.current;
  const hourly = w.hourly;
  const windowEnd = nowMs + 30 * 60000;
  const idxNow = hourlyNowIndex(hourly.time, nowMs);

  // Uurslots die [nu, nu + 30 min] dekken.
  const hourIdx = [];
  for (let i = Math.max(0, idxNow + 1); i < hourly.time.length; i++) {
    hourIdx.push(i);
    if (hourly.time[i] >= windowEnd) break;
  }
  const rainProb = Math.max(0, ...hourIdx.map(i => hourly.precipitation_probability?.[i] ?? 0));

  // Neerslag in mm/u. Liefst uit de kwartierdata, anders uit de uurdata.
  const m = w.minutely_15;
  const mIdx = [];
  m?.time?.forEach((ts, i) => { if (ts > nowMs && ts <= windowEnd + 15 * 60000) mIdx.push(i); });
  const upcoming = mIdx.length
    ? Math.max(...mIdx.map(i => (m.precipitation[i] ?? 0) * 4))
    : Math.max(0, ...hourIdx.map(i => hourly.precipitation?.[i] ?? 0));
  const rainAmount = Math.max(upcoming, c.precipitation ?? 0);

  const codes = [c.weather_code, ...hourIdx.map(i => hourly.weather_code?.[i])];
  const thunder = codes.some(code => code >= 95);
  const snow = codes.some(code => (code >= 71 && code <= 77) || code === 85 || code === 86);
  const fog = c.weather_code === 45 || c.weather_code === 48;

  // Afgerond, zodat het getal in beeld en het advies hetzelfde zeggen.
  const feels = Math.round(c.apparent_temperature);
  const wind = c.wind_speed_10m;
  const gust = Math.max(c.wind_gusts_10m ?? 0, ...hourIdx.map(i => hourly.wind_gusts_10m?.[i] ?? 0));
  const minTemp = Math.min(c.temperature_2m, hourly.temperature_2m[idxNow + 1] ?? c.temperature_2m);
  const wet = rainAmount > 0.5 || rainProb >= 70;

  return {
    feels,
    effectiveFeel: feels - offset,
    temp: c.temperature_2m,
    wind,
    gust,
    rainProb,
    rainAmount,
    wet,
    minTemp,
    uv: hourly.uv_index?.[idxNow] ?? 0,
    dewPoint: c.dew_point_2m ?? null,
    muggy: (c.dew_point_2m ?? -99) >= 18,
    thunder,
    snow,
    fog,
    stormy: thunder || wind >= 60 || gust >= 75,
    // Bij harde wind of stevige windstoten is een paraplu zinloos.
    umbrellaUseless: wind >= 40 || gust >= 50,
  };
}

// Jastype op basis van de (persoonlijke) gevoelstemperatuur.
function jacketLevel(effectiveFeel) {
  if (effectiveFeel >= 17) return 'None';
  if (effectiveFeel >= 12) return 'Light';
  if (effectiveFeel >= 5) return 'Autumn';
  if (effectiveFeel >= 0) return 'Winter';
  return 'Freezing';
}

const MAX_TIPS = 3;

// Vertaalt condities naar i18n-sleutels, zodat de beslisregels los te testen zijn.
// pollenLevel: 'very high' | 'high' | null.
// Eén jasterm per situatie: noemt het oordeel al een jas (regen, sneeuw) of is
// het storm, dan komt er geen apart jaslabel bij.
function adviceKeys(cond, pollenLevel = null) {
  const level = jacketLevel(cond.effectiveFeel);
  const cold = level === 'Winter' || level === 'Freezing';
  let verdict = `verdict${level}`;
  let jacket = level === 'None' ? null : `jacket${level}`;
  let detail = `detail${level}`;

  if (cond.stormy) {
    verdict = 'verdictStorm';
    detail = cond.thunder ? 'detailThunder' : 'detailStorm';
    jacket = null;
  } else if (cond.wet && cond.snow) {
    verdict = 'verdictSnow'; detail = 'detailSnow'; jacket = null;
  } else if (cond.wet && cond.effectiveFeel >= 15) {
    verdict = 'verdictRain'; detail = 'detailRain'; jacket = null;
  } else if (cond.wet) {
    verdict = 'verdictJacketRain'; detail = cold ? 'detailJacketRainCold' : 'detailJacketRain'; jacket = null;
  }

  // Tips op volgorde van belang; hooguit drie, zodat ze gelezen worden.
  const tips = [];
  if (cond.wet && !cond.snow) tips.push({ key: cond.umbrellaUseless ? 'tipRainGear' : 'tipUmbrella' });
  else if (cond.wet && cond.snow) tips.push({ key: 'tipSlippery' });
  else if (cond.rainProb >= 30) tips.push({ key: 'tipRainChance', args: [cond.rainProb] });
  if (cond.gust >= 50 && cond.gust > cond.wind + 15) tips.push({ key: 'tipGusts', args: [Math.round(cond.gust)], warn: true });
  else if (cond.wind >= 40) tips.push({ key: 'tipStormWind', warn: true });
  else if (cond.wind >= 25) tips.push({ key: 'tipStrongWind' });
  if (cond.fog) tips.push({ key: 'tipFog', warn: true });
  if (cond.minTemp <= 3) tips.push({ key: 'tipScarfGloves' });
  else if (cond.minTemp <= 8) tips.push({ key: 'tipScarfNice' });
  if (cond.uv >= 7) tips.push({ key: 'tipUvHigh' });
  else if (cond.uv >= 3) tips.push({ key: 'tipUvMid' });
  if (cond.muggy) tips.push({ key: 'tipMuggy' });
  if (pollenLevel === 'very high') tips.push({ key: 'tipPollenVeryHigh' });
  else if (pollenLevel === 'high') tips.push({ key: 'tipPollenHigh' });

  return { verdict, jacket, detail, tips: tips.slice(0, MAX_TIPS), level };
}

// Knipoog bij bijzonder weer: welke tekstpool past vandaag (of geen).
function extremePool(cond) {
  if (cond.thunder) return 'extremeThunder';
  if (cond.gust >= 75 || cond.wind >= 60) return 'extremeStorm';
  if (cond.feels >= 30) return 'extremeHeat';
  if (cond.feels <= -5) return 'extremeFrost';
  if (cond.snow && cond.wet) return 'extremeSnow';
  if (cond.fog) return 'extremeFog';
  return null;
}

// Positie op de jas-o-meter (−5 tot 25 °C) en hoe dicht je bij de volgende jas zit.
const JACKET_BOUNDARIES = [0, 5, 12, 17];
function jacketScale(effectiveFeel) {
  const min = -5;
  const max = 25;
  const pct = Math.max(0, Math.min(100, ((effectiveFeel - min) / (max - min)) * 100));
  let near = null;
  for (const b of JACKET_BOUNDARIES) {
    const delta = effectiveFeel - b;
    // Net boven een grens (hele graden): zoveel graden kouder en je zit een jas warmer.
    if (delta >= 0 && delta < 2) near = { level: jacketLevel(b - 1), delta: Math.floor(delta) + 1 };
  }
  return { pct, level: jacketLevel(effectiveFeel), near };
}

// Persoonlijke kalibratie na feedback: "te koud" maakt het advies warmer.
function calibrate(current, feedback) {
  const step = feedback === 'cold' ? 1 : feedback === 'warm' ? -1 : 0;
  return Math.max(-6, Math.min(6, (current || 0) + step));
}

// ─── Pauzemoment ─────────────────────────────────────────────────────────────

function minutesOfDay(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

// Scoort blokken van 30 min (in stappen van 15 min) binnen het pauzevenster van
// vandaag. Droog weegt het zwaarst, daarna de afstand tot je eigen pauzetijd en
// de temperatuur. opts: { start, end, preferred } in minuten na middernacht.
function scoreBreakBlocks(w, nowMs, opts) {
  const m = w.minutely_15;
  const hourly = w.hourly;
  if (!m?.time || !hourly?.time) return [];
  const todayKey = new Date(nowMs).toDateString();
  const blocks = [];
  for (let i = 0; i < m.time.length; i++) {
    const startMs = m.time[i];
    if (new Date(startMs).toDateString() !== todayKey) continue;
    const mins = minutesOfDay(startMs);
    if (mins < opts.start || mins > opts.end) continue;
    if (startMs < nowMs - 10 * 60000) continue;
    const endMs = startMs + 30 * 60000;
    // Kwartierwaarden gelden voor het voorafgaande kwartier: slots die na start eindigen.
    let rainMm = 0;
    for (let j = i + 1; j < m.time.length && m.time[j] <= endMs; j++) rainMm += m.precipitation[j] ?? 0;
    const hIdx = hourly.time.findIndex(ts => ts > startMs);
    const prob = hIdx >= 0 ? (hourly.precipitation_probability?.[hIdx] ?? 0) : 0;
    const tIdx = Math.max(0, hourlyNowIndex(hourly.time, startMs));
    const temp = hourly.temperature_2m[tIdx];
    const distanceH = Math.abs(mins - opts.preferred) / 60;
    const score = -rainMm * 20 - prob * 0.05 + temp * 0.3 - distanceH * 1.5;
    blocks.push({ startMs, endMs, rainMm, prob, temp, score });
  }
  return blocks;
}

function bestBreakMoment(w, nowMs, opts) {
  const blocks = scoreBreakBlocks(w, nowMs, opts);
  if (!blocks.length) return null;
  return blocks.reduce((best, b) => (b.score > best.score ? b : best));
}

// Twee of drie niet-overlappende opties om met collega's te delen.
function topBreakOptions(w, nowMs, opts, n = 3) {
  const sorted = scoreBreakBlocks(w, nowMs, opts).sort((a, b) => b.score - a.score);
  const picked = [];
  for (const b of sorted) {
    if (picked.every(p => Math.abs(p.startMs - b.startMs) >= 30 * 60000)) picked.push(b);
    if (picked.length === n) break;
  }
  return picked.sort((a, b) => a.startMs - b.startMs);
}

// Eén drempel voor "het regent in dit kwartier", zodat wachtstrook en grafiek
// elkaar niet tegenspreken.
const WET_SLOT_MM = 0.1;

// Regent het nu, en wanneer begint of stopt het in de komende 3 uur?
// Geeft { raining, snow, changeAtMs (of null), continues } of null zonder data.
function nowcast(w, nowMs) {
  const m = w.minutely_15;
  if (!m?.time) return null;
  const start = m.time.findIndex(ts => ts >= nowMs);
  if (start === -1) return null;
  const wet = i => (m.precipitation[i] ?? 0) >= WET_SLOT_MM;
  const raining = wet(start) || (w.current?.precipitation ?? 0) >= WET_SLOT_MM;
  const code = w.current?.weather_code ?? 0;
  const snow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const end = Math.min(start + 12, m.time.length);
  for (let i = start + 1; i < end; i++) {
    if (wet(i) !== raining) {
      // Slot i telt het kwartier ervóór: daar begint (of stopt) het.
      return { raining, snow, changeAtMs: m.time[i] - 15 * 60000, continues: false };
    }
  }
  return { raining, snow, changeAtMs: null, continues: raining };
}

// Wandelweer per dag: dicht bij 18 °C is het fijnst, regen en wind kosten punten.
function dayScore(day) {
  const t = day.tempMax ?? 15;
  return -Math.abs(t - 18) - ((day.rain ?? 0) > 0.5 ? 5 : 0) - ((day.wind ?? 0) > 25 ? 3 : 0);
}

// ─── Looplog ─────────────────────────────────────────────────────────────────

function isDryEntry(e) {
  return e.weather && (e.weather.rain ?? 0) < 0.1;
}

// Statistieken over de looplog (alleen lokale data). log is nieuwste eerst.
function logStats(log, nowMs) {
  const walks = log.filter(e => e.people.length > 0);
  const now = new Date(nowMs);
  const thisMonth = walks.filter(e => {
    const d = new Date(e.timestamp);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  let dryStreak = 0;
  for (const e of walks) {
    if (!e.weather) break;
    if (!isDryEntry(e)) break;
    dryStreak++;
  }
  const count = (entries, filter = () => true) => {
    const tally = {};
    entries.filter(filter).forEach(e => e.people.forEach(p => { tally[p] = (tally[p] || 0) + 1; }));
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return top ? { name: top[0], count: top[1] } : null;
  };
  return {
    total: walks.length,
    thisMonth: thisMonth.length,
    dryStreak,
    loyal: count(thisMonth),
    bravest: count(walks, e => e.weather && !isDryEntry(e)),
  };
}

const ACHIEVEMENTS = [
  { id: 'polarBear', test: e => e.weather && e.weather.feels < 0 },
  { id: 'drownedCat', test: e => e.weather && e.weather.rain >= 1 },
  { id: 'stormBird', test: e => e.weather && (e.weather.gust >= 60 || e.weather.wind >= 50) },
  { id: 'fullHouse', test: e => e.people.length >= 8 },
  { id: 'sunSeeker', test: e => e.weather && e.weather.feels >= 25 },
];

function achievements(log) {
  const walks = log.filter(e => e.people.length > 0);
  const earned = ACHIEVEMENTS.filter(a => walks.some(a.test)).map(a => a.id);
  if (walks.length >= 10) earned.push('regular');
  return earned;
}

// ─── Seizoensmomenten ────────────────────────────────────────────────────────

// dateKey: YYYY-MM-DD (vandaag). today: { max, min } van vandaag. memory: wat er
// dit jaar al gevierd is. Geeft { key, memory } terug, of null.
function seasonalMoment(dateKey, today, memory = {}) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const md = `${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (md === '04-27') return { key: 'kingsDay', memory };
  if (md === '12-05') return { key: 'sinterklaas', memory };
  if (md >= '12-24' && md <= '12-26') return { key: 'christmas', memory };
  if (md === '01-01') return { key: 'newYear', memory };
  if (today) {
    // "Eerste" momenten tellen de hele dag, en daarna dat jaar niet meer.
    if (memory.terrace === dateKey || (mo >= 3 && mo <= 5 && today.max >= 20 && memory.terraceYear !== y)) {
      return { key: 'firstTerrace', memory: { ...memory, terraceYear: y, terrace: dateKey } };
    }
    const season = mo >= 9 ? y : y - 1;
    if (memory.frost === dateKey || ((mo >= 10 || mo <= 2) && today.min < 0 && memory.frostSeason !== season)) {
      return { key: 'firstFrost', memory: { ...memory, frostSeason: season, frost: dateKey } };
    }
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml, commitType, durationParts, pickDaily, dateKeyInZone,
    normalizeForecast, mergeHourlyByTime, dataTimestamp, hourlyNowIndex, hourlyIndexAtHour,
    POLLEN_KEYS, POLLEN_THRESHOLDS, parsePollen, highPollenKeys,
    PREF_OFFSETS, computeConditions, jacketLevel, adviceKeys, extremePool, jacketScale, calibrate,
    minutesOfDay, scoreBreakBlocks, bestBreakMoment, topBreakOptions, WET_SLOT_MM, nowcast, dayScore,
    logStats, achievements, seasonalMoment,
  };
}
