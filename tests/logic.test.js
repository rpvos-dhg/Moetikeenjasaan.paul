// Tests voor de pure rekenlogica. Draaien met: npm test (zet TZ=Europe/Amsterdam).
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

const H = 3600000;
const Q = 15 * 60000;

// Kleine nep-forecast: uurdata vanaf 00:00 lokaal, kwartierdata idem.
function forecast({ start = Date.parse('2026-10-21T00:00:00+02:00'), hours = 48, temp = 12, feels = 10,
  wind = 15, gust = 25, code = 2, prob = 10, rainFrom = null, rainTo = null, rainPerQuarter = 0.3, dew = 8, now } = {}) {
  const hourly = { time: [], temperature_2m: [], precipitation_probability: [], precipitation: [], weather_code: [], wind_speed_10m: [], wind_gusts_10m: [], uv_index: [] };
  for (let i = 0; i < hours; i++) {
    const t = start + i * H;
    // Uurslot T dekt (T-1u, T]: nat als dat overlapt met (rainFrom, rainTo].
    const wet = rainFrom != null && t > rainFrom && t < (rainTo ?? Infinity) + H;
    hourly.time.push(t);
    hourly.temperature_2m.push(temp);
    hourly.precipitation_probability.push(wet ? 90 : prob);
    hourly.precipitation.push(wet ? rainPerQuarter * 4 : 0);
    hourly.weather_code.push(wet ? 63 : code);
    hourly.wind_speed_10m.push(wind);
    hourly.wind_gusts_10m.push(gust);
    hourly.uv_index.push(2);
  }
  const minutely_15 = { time: [], precipitation: [] };
  for (let i = 0; i < hours * 4; i++) {
    const t = start + i * Q;
    const wet = rainFrom != null && t > rainFrom && t <= (rainTo ?? Infinity);
    minutely_15.time.push(t);
    minutely_15.precipitation.push(wet ? rainPerQuarter : 0);
  }
  const nowMs = now ?? start + 10 * H + 40 * 60000;
  const raining = rainFrom != null && nowMs > rainFrom && nowMs <= (rainTo ?? Infinity);
  return {
    utc_offset_seconds: 7200,
    current: { time: nowMs, temperature_2m: temp, apparent_temperature: feels, precipitation: raining ? rainPerQuarter : 0,
      weather_code: raining ? 63 : code, wind_speed_10m: wind, wind_gusts_10m: gust, dew_point_2m: dew },
    hourly, minutely_15,
  };
}

const at = iso => Date.parse(iso);

test('escapeHtml neutraliseert HTML', () => {
  assert.equal(L.escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});

test('commitType leidt de badge af uit het eerste woord', () => {
  assert.equal(L.commitType('Fix UV index'), 'fix');
  assert.equal(L.commitType('Refine jacket icon'), 'improve');
  assert.equal(L.commitType('Tutorial overlay'), 'new');
});

test('normalizeForecast zet unixtime om naar ms en lokale datumsleutels', () => {
  const w = L.normalizeForecast({
    utc_offset_seconds: 7200,
    current: { time: 1792571400 },
    hourly: { time: [1792533600] },
    daily: { time: [1792533600], sunrise: [1792563120], sunset: [1792600860] },
  });
  assert.equal(w.hourly.time[0], 1792533600000);
  assert.equal(w.current.time, 1792571400000);
  assert.equal(w.daily.time[0], '2026-10-21');
  assert.equal(typeof w.daily.sunrise[0], 'number');
});

test('dataTimestamp: vers blijft "nu", oude data houdt het eigen tijdstip', () => {
  const now = at('2026-10-21T12:00:00+02:00');
  assert.equal(L.dataTimestamp({ current: { time: now - 10 * 60000 } }, now), now);
  assert.equal(L.dataTimestamp({ current: { time: now - 5 * H } }, now), now - 5 * H);
});

test('mergeHourlyByTime vult alleen ontbrekende regenkans aan', () => {
  const target = { time: [1, 2, 3], precipitation_probability: [null, null, null] };
  L.mergeHourlyByTime(target, { time: [2, 3], precipitation_probability: [40, 50] }, 'precipitation_probability', false);
  assert.deepEqual(target.precipitation_probability, [null, 40, 50]);
  const filled = { time: [1], precipitation_probability: [10] };
  L.mergeHourlyByTime(filled, { time: [1], precipitation_probability: [99] }, 'precipitation_probability', false);
  assert.deepEqual(filled.precipitation_probability, [10]);
});

test('parsePollen: geen pollenvelden betekent geen data, morgen op lokale datum', () => {
  assert.equal(L.parsePollen({ current: { pm10: 3 } }, '2026-10-21', 0), null);
  const aq = {
    current: { grass_pollen: 5 },
    hourly: { time: ['2026-10-21T12:00', '2026-10-22T12:00'], grass_pollen: [5, 60] },
  };
  const p = L.parsePollen(aq, '2026-10-21', 0);
  assert.equal(p.grass, 5);
  assert.equal(p.tomorrow.grass, 60);
  assert.deepEqual(L.highPollenKeys(p.tomorrow), ['grass']);
});

test('regen van het afgelopen uur telt niet voor nu + 30 min', () => {
  const start = at('2026-10-21T00:00:00+02:00');
  const w = forecast({ rainFrom: start + 9 * H, rainTo: start + 10 * H });
  const now = start + 10 * H + 40 * 60000;
  const cond = L.computeConditions(w, now, 0);
  assert.equal(cond.wet, false);
});

test('regen die over 20 minuten begint telt wel', () => {
  const start = at('2026-10-21T00:00:00+02:00');
  const now = start + 10 * H + 40 * 60000;
  const w = forecast({ rainFrom: now + 15 * 60000, rainPerQuarter: 0.4, prob: 10, now });
  w.hourly.precipitation_probability = w.hourly.precipitation_probability.map(() => 10);
  const cond = L.computeConditions(w, now, 0);
  assert.equal(cond.wet, true);
});

test('storm, onweer en windstoten bepalen paraplu en advies', () => {
  const now = at('2026-10-21T10:40:00+02:00');
  const gusty = L.computeConditions(forecast({ wind: 30, gust: 55, now }), now, 0);
  assert.equal(gusty.umbrellaUseless, true);
  assert.equal(gusty.stormy, false);
  const storm = L.computeConditions(forecast({ wind: 65, gust: 90, now }), now, 0);
  assert.equal(L.adviceKeys(storm).verdict, 'verdictStorm');
  const w = forecast({ now });
  w.current.weather_code = 95;
  assert.equal(L.adviceKeys(L.computeConditions(w, now, 0)).detail, 'detailThunder');
});

test('sneeuw geeft een sneeuwadvies, geen regenadvies', () => {
  const now = at('2026-10-21T10:40:00+02:00');
  const w = forecast({ rainFrom: now - H, feels: -3, temp: 0, now });
  w.current.weather_code = 73;
  const advice = L.adviceKeys(L.computeConditions(w, now, 0));
  assert.equal(advice.verdict, 'verdictSnow');
});

test('jastype volgt de drempels, voorkeur verschuift ze', () => {
  assert.equal(L.jacketLevel(17), 'None');
  assert.equal(L.jacketLevel(16), 'Light');
  assert.equal(L.jacketLevel(4), 'Winter');
  const now = at('2026-10-21T10:40:00+02:00');
  const cold = L.computeConditions(forecast({ feels: 14, now }), now, L.PREF_OFFSETS.cold);
  assert.equal(cold.effectiveFeel, 11);
});

test('één jasterm: bij regen of storm geen apart jaslabel, hooguit drie tips', () => {
  const now = at('2026-10-21T10:40:00+02:00');
  const wet = L.adviceKeys(L.computeConditions(forecast({ rainFrom: now - H, feels: 8, now }), now, 0));
  assert.equal(wet.verdict, 'verdictJacketRain');
  assert.equal(wet.jacket, null);
  const dry = L.adviceKeys(L.computeConditions(forecast({ feels: 8, now }), now, 0));
  assert.equal(dry.jacket, 'jacketAutumn');
  const busy = forecast({ feels: 1, temp: 2, wind: 45, gust: 70, now });
  busy.current.weather_code = 45;
  assert.ok(L.adviceKeys(L.computeConditions(busy, now, 0), 'very high').tips.length <= 3);
  // Zeer veel pollen valt niet weg achter comforttips.
  const windy = forecast({ feels: 7, temp: 7, wind: 30, prob: 40, now });
  assert.ok(L.adviceKeys(L.computeConditions(windy, now, 0), 'very high').tips.some(x => x.key === 'tipPollenVeryHigh'));
  assert.equal(L.adviceKeys(L.computeConditions(forecast({ feels: 25, now }), now, 0)).jacket, null);
});

test('jas-o-meter meldt hoe ver de volgende jas is', () => {
  const s = L.jacketScale(13);
  assert.equal(s.level, 'Light');
  assert.deepEqual(s.near, { level: 'Autumn', delta: 2 });
  assert.equal(L.jacketScale(20).near, null);
});

test('kalibratie schuift per feedback en blijft begrensd', () => {
  assert.equal(L.calibrate(0, 'cold'), 1);
  assert.equal(L.calibrate(0, 'warm'), -1);
  assert.equal(L.calibrate(6, 'cold'), 6);
  assert.equal(L.calibrate(2, 'ok'), 2);
});

test('beste pauzemoment ontwijkt regen en blijft dicht bij de eigen lunch', () => {
  const start = at('2026-10-21T00:00:00+02:00');
  const now = start + 10 * H;
  const w = forecast({ rainFrom: start + 11.75 * H, rainTo: start + 12.75 * H, now });
  const best = L.bestBreakMoment(w, now, { start: 660, end: 900, preferred: 720 });
  assert.ok(best.rainMm < 0.1, 'kiest een droog blok');
  const mins = L.minutesOfDay(best.startMs);
  assert.ok(mins >= 660 && mins <= 900);
  const options = L.topBreakOptions(w, now, { start: 660, end: 900, preferred: 720 }, 3);
  assert.equal(options.length, 3);
  for (let i = 1; i < options.length; i++) assert.ok(options[i].startMs - options[i - 1].startMs >= 30 * 60000);
});

test('nowcast: regen begint, stopt of blijft', () => {
  const start = at('2026-10-21T00:00:00+02:00');
  const now = start + 10 * H;
  const starts = L.nowcast(forecast({ rainFrom: now + H, now }), now);
  assert.equal(starts.raining, false);
  assert.equal(starts.changeAtMs, now + H);
  const stops = L.nowcast(forecast({ rainFrom: now - H, rainTo: now + 30 * 60000, now }), now);
  assert.equal(stops.raining, true);
  assert.equal(stops.changeAtMs, now + 30 * 60000);
  const stays = L.nowcast(forecast({ rainFrom: now - H, now }), now);
  assert.equal(stays.continues, true);
  // Bui net voorbij: "nu" nog nat, het huidige kwartier al droog.
  const mid = now + 5 * 60000;
  const ended = forecast({ rainFrom: mid + 2 * H, now: mid });
  ended.current.precipitation = 0.3;
  const nc = L.nowcast(ended, mid);
  assert.equal(nc.raining, true);
  assert.equal(nc.continues, false);
  assert.ok(nc.changeAtMs <= mid);
  // Motregen met af en toe één droog kwartier: blijft regenen.
  const drizzle = forecast({ rainFrom: now - H, now });
  drizzle.minutely_15.precipitation = drizzle.minutely_15.precipitation.map((v, i) => (i % 2 ? 0 : 0.2));
  drizzle.current.precipitation = 0.2;
  assert.equal(L.nowcast(drizzle, now).continues, true);
  // Droog, dan één natte kwartier: die bui wordt wel gemeld.
  const shower = forecast({ now });
  const k = shower.minutely_15.time.findIndex(ts => ts >= now) + 4;
  shower.minutely_15.precipitation[k] = 0.6;
  const sc = L.nowcast(shower, now);
  assert.equal(sc.raining, false);
  assert.equal(sc.changeAtMs, shower.minutely_15.time[k] - 15 * 60000);
});

test('dagscore: dicht bij 18 °C wint, warmer is niet altijd beter', () => {
  assert.ok(L.dayScore({ tempMax: 18 }) > L.dayScore({ tempMax: 25 }));
  assert.ok(L.dayScore({ tempMax: 29 }) > L.dayScore({ tempMax: 31 }));
  assert.ok(L.dayScore({ tempMax: 17, rain: 3 }) < L.dayScore({ tempMax: 17, rain: 0 }));
});

test('looplog: statistieken en badges', () => {
  const now = at('2026-10-21T13:00:00+02:00');
  const e = (days, people, weather) => ({ id: days, timestamp: new Date(now - days * 24 * H).toISOString(), people, weather });
  const log = [
    e(0, ['Remco', 'Tessa'], { feels: 10, rain: 0, wind: 10, gust: 20 }),
    e(1, ['Remco'], { feels: -2, rain: 0, wind: 10, gust: 20 }),
    e(2, ['Tessa'], { feels: 8, rain: 1.5, wind: 10, gust: 20 }),
    e(3, [], null),
  ];
  const stats = L.logStats(log, now);
  assert.equal(stats.total, 3);
  assert.equal(stats.dryStreak, 2);
  assert.deepEqual(stats.bravest, { name: 'Tessa', count: 1 });
  assert.deepEqual(stats.loyal, { name: 'Remco', count: 2 });
  assert.deepEqual(L.achievements(log).sort(), ['drownedCat', 'polarBear']);
});

test('seizoensmomenten', () => {
  assert.equal(L.seasonalMoment('2026-04-27', null).key, 'kingsDay');
  const first = L.seasonalMoment('2026-04-10', { max: 21, min: 8 }, {});
  assert.equal(first.key, 'firstTerrace');
  assert.equal(L.seasonalMoment('2026-04-11', { max: 22, min: 9 }, first.memory), null);
  assert.equal(L.seasonalMoment('2026-07-10', { max: 25, min: 15 }, {}), null);
});

test('pickDaily is stabiel per dag', () => {
  assert.equal(L.pickDaily(3, '2026-10-21x'), L.pickDaily(3, '2026-10-21x'));
  assert.ok(L.pickDaily(3, 'abc') < 3);
});

test('vooruitblik op de lunch: slot ná de start, temperatuur geïnterpoleerd', () => {
  const now = at('2026-10-21T10:40:00+02:00');
  const lunch = at('2026-10-21T12:30:00+02:00');
  // Regen alleen in het uur 12:00-13:00 (slot met tijdstempel 13:00).
  const w = forecast({ rainFrom: at('2026-10-21T12:00:00+02:00'), rainTo: at('2026-10-21T13:00:00+02:00'), feels: 12, now });
  const o = L.outlookAt(w, lunch, 0);
  assert.equal(o.prob, 90);
  assert.equal(o.wet, true);
  assert.equal(o.verdict, 'verdictJacketRain');
  // Om 11:30 is het nog droog: het slot van 12:00 telt 11:00-12:00.
  assert.equal(L.outlookAt(w, at('2026-10-21T11:30:00+02:00'), 0).wet, false);
  assert.equal(L.outlookAt({ hourly: { time: [] } }, lunch, 0), null);
  // Zware windstoten rond de lunch: storm, geen dun jasje.
  const gusty = forecast({ gust: 90, feels: 16, temp: 17, now });
  assert.equal(L.outlookAt(gusty, lunch, 0).verdict, 'verdictStorm');
});

test('pauzevenster per dag: regen buiten 11-15 uur telt niet', () => {
  const now = at('2026-10-21T10:40:00+02:00');
  // Regen alleen 's nachts (02:00-05:00).
  const w = forecast({ rainFrom: at('2026-10-21T02:00:00+02:00'), rainTo: at('2026-10-21T05:00:00+02:00'), now });
  const s = L.windowDayStats(w, '2026-10-21');
  assert.equal(s.rain, 0);
  // Regen om 13:00 lokale tijd telt wel, ook als het toestel in een andere zone staat.
  const mid = forecast({ rainFrom: at('2026-10-21T12:00:00+02:00'), rainTo: at('2026-10-21T13:00:00+02:00'), now });
  assert.ok(L.windowDayStats(mid, '2026-10-21').rain > 0);
  assert.equal(L.windowDayStats(w, '2030-01-01'), null);
});

test('checklist: geen paraplu bij sneeuw of harde wind, sjaal en handschoenen op drempel', () => {
  const base = { uv: 0, muggy: false, feels: 10, wet: true, snow: false, umbrellaUseless: false, rainProb: 90, minTemp: 10 };
  assert.equal(L.checklistConditions(base).paraplu, true);
  assert.equal(L.checklistConditions({ ...base, snow: true }).paraplu, false);
  assert.equal(L.checklistConditions({ ...base, umbrellaUseless: true }).paraplu, false);
  const cold = L.checklistConditions({ ...base, minTemp: 3 });
  assert.equal(cold.sjaal && cold.handschoenen, true);
  assert.equal(L.checklistConditions({ ...base, minTemp: 8 }).handschoenen, false);
});
