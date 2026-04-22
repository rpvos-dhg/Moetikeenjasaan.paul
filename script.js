// ─── Personen — voeg hier namen toe of verwijder ze ───
const WALKERS = [
  'Adam', 'Bob', 'David', 'Frank H', 'Frank vd H', 'Fred',
  'Gijs', 'Jeffrey', 'Louise', 'Muttalib', 'Noëlla', 'Nynke',
  'Remco', 'Sjors', 'Steven', 'Tessa', 'Timke'
];

// State
let weatherData = null;
let pollenData = null;
let userPref = localStorage_safe_get('dighv_pref') || 'normal';
let selectedWalkers = new Set();
let darkModeForced = localStorage_safe_get('dighv_dark_force') || 'auto'; // 'auto', 'dark', 'light'

// Check if current time is daytime based on sunrise/sunset
function isDayTime(date) {
  if (!weatherData || !weatherData.daily) return true; // Default to day
  const sunrise = new Date(weatherData.daily.sunrise[0]);
  const sunset = new Date(weatherData.daily.sunset[0]);
  return date >= sunrise && date <= sunset;
}

// Listen for device dark mode preference
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', () => {
  if (darkModeForced === 'auto') applyDarkMode();
});

// Apply dark mode
function applyDarkMode() {
  let darkMode;
  if (darkModeForced === 'dark') {
    darkMode = true;
  } else if (darkModeForced === 'light') {
    darkMode = false;
  } else { // auto: device preference + sunset
    const deviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const sunsetDark = !isDayTime(new Date());
    darkMode = deviceDark || sunsetDark;
  }
  document.body.classList.toggle('dark', darkMode);
  const btn = document.getElementById('darkModeToggle');
  if (btn) {
    if (darkModeForced === 'auto') {
      btn.textContent = darkMode ? '🌙' : '☀️';
    } else {
      btn.textContent = darkModeForced === 'dark' ? '🌙' : '☀️';
    }
  }
}
applyDarkMode(); // Init

// Safe storage wrapper (fallback to in-memory)
const memStore = {};
function localStorage_safe_get(key) {
  try { return localStorage.getItem(key); } catch(e) { return memStore[key]; }
}
function localStorage_safe_set(key, val) {
  try { localStorage.setItem(key, val); } catch(e) { memStore[key] = val; }
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    if (target === 'advice') {
      document.getElementById('view-advice-wrap').classList.add('active');
    } else if (target === 'log') {
      document.getElementById('view-log').classList.add('active');
      initLogTab();
      renderLogHistory();
      updateLogTime();
    } else {
      document.getElementById('view-explain').classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Last updated timestamp
let lastUpdate = null;
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  let label = `${hh}:${mm}`;
  if (lastUpdate) {
    const mins = Math.round((now - lastUpdate) / 60000);
    if (mins < 1) label += ` · data vers`;
    else label += ` · data ${mins} min oud`;
  }
  document.getElementById('clock').textContent = label;
  renderLunchCountdown();
  updateLogTime();
}
updateClock();
setInterval(updateClock, 30000);

// Den Haag - ANWB HQ (Wassenaarseweg)
const LAT = 52.0907;
const LON = 4.2676;

async function fetchWeather() {
  // All data from Open-Meteo (reliable, no API key needed)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&minutely_15=precipitation,precipitation_probability&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code,uv_index&daily=sunrise,sunset,pollen_tree,pollen_grass,pollen_weed&timezone=Europe/Amsterdam&forecast_days=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    weatherData = data;
    lastUpdate = new Date();
    updateClock();
    
    // Extract pollen data from Open-Meteo if available
    if (data.daily && data.daily.pollen_tree && data.daily.pollen_tree[0] !== undefined) {
      pollenData = {
        tree: data.daily.pollen_tree[0] || 0,
        grass: data.daily.pollen_grass[0] || 0,
        weed: data.daily.pollen_weed[0] || 0,
        timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
      };
    } else {
      pollenData = null; // Will use seasonal fallback
    }
  } catch (err) {
    console.error('Weerdata fetch error:', err);
    document.getElementById('verdict').innerHTML = `<div class="error">Kon weerdata niet ophalen. Probeer later opnieuw.</div>`;
    return;
  }
  
  render();
  applyDarkMode(); // Update dark mode with new sunrise data
}

function getPollenTip() {
  const month = new Date().getMonth() + 1; // 1-12
  const seasonalData = {
    1: { level: 'laag', allergens: 'hazelaar, els' },
    2: { level: 'matig-hoog', allergens: 'hazelaar, els, berken' },
    3: { level: 'hoog', allergens: 'els, berk, iep' },
    4: { level: 'zeer hoog', allergens: 'berk, grassen, taxus' },
    5: { level: 'zeer hoog', allergens: 'grassen, taxus' },
    6: { level: 'hoog', allergens: 'grassen' },
    7: { level: 'matig', allergens: 'grassen, onkruid' },
    8: { level: 'matig', allergens: 'grassen, onkruid' },
    9: { level: 'matig', allergens: 'onkruid, schimmelsporen' },
    10: { level: 'laag-matig', allergens: 'schimmelsporen, taxus' },
    11: { level: 'laag', allergens: 'schimmelsporen' },
    12: { level: 'laag', allergens: 'hazelaar' }
  };
  
  let tip = seasonalData[month] || { level: 'onbekend', allergens: '--' };
  
  // If live pollen data available, enhance
  if (pollenData) {
    const liveLevels = [];
    if (pollenData.tree > 3) liveLevels.push('bomen');
    if (pollenData.grass > 3) liveLevels.push('grassen');
    if (pollenData.weed > 3) liveLevels.push('onkruid');
    
    if (liveLevels.length > 0) {
      tip.live = `${liveLevels.join(', ')} (gemeten ${pollenData.timestamp})`;
    }
  }
  
  return tip;
}

function getWeatherIcon(code, size = 'small', isDay = true) {
  const icons = {
    0:  isDay ? { small: '☀️', large: '☀️' } : { small: '🌙', large: '🌙' },
    1:  { small: '🌤️', large: '🌤️' },
    2:  { small: '⛅', large: '⛅' },
    3:  { small: '☁️', large: '☁️' },
    45: { small: '🌫️', large: '🌫️' },
    48: { small: '🌫️', large: '🌫️' },
    51: { small: '🌦️', large: '🌦️' },
    53: { small: '🌦️', large: '🌦️' },
    55: { small: '🌦️', large: '🌦️' },
    61: { small: '🌧️', large: '🌧️' },
    63: { small: '🌧️', large: '🌧️' },
    65: { small: '🌧️', large: '🌧️' },
    71: { small: '❄️', large: '❄️' },
    73: { small: '❄️', large: '❄️' },
    75: { small: '❄️', large: '❄️' },
    77: { small: '❄️', large: '❄️' },
    80: { small: '🌦️', large: '🌦️' },
    81: { small: '🌦️', large: '🌦️' },
    82: { small: '🌦️', large: '🌦️' },
    85: { small: '🌨️', large: '🌨️' },
    86: { small: '🌨️', large: '🌨️' },
    95: { small: '⛈️', large: '⛈️' },
    96: { small: '⛈️', large: '⛈️' },
    99: { small: '⛈️', large: '⛈️' }
  };
  return icons[code]?.[size] || '☀️';
}

function renderLunchCountdown() {
  const el = document.getElementById('lunchCountdown');
  if (!el) return;

  const now = new Date();
  const h = now.getHours();

  let targetHour, label;
  if (h < 12) {
    targetHour = 12; label = 'Lunch';
  } else if (h < 15) {
    targetHour = 15; label = 'Middagpauze';
  } else {
    targetHour = 12; label = 'Morgen lunch';
  }

  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);
  if (h >= 15) target.setDate(target.getDate() + 1);

  const diffMins = Math.max(0, Math.round((target - now) / 60000));
  const dh = Math.floor(diffMins / 60);
  const dm = diffMins % 60;
  const countdownStr = diffMins === 0 ? 'Nu!' : dh > 0 ? `${dh}u ${dm}m` : `${dm} min`;

  let preview = '';
  if (weatherData && h < 15) {
    const hourly = weatherData.hourly;
    const idx = hourly.time.findIndex(t => new Date(t).getHours() === targetHour);
    if (idx !== -1) {
      const temp = Math.round(hourly.temperature_2m[idx]);
      const rain = hourly.precipitation_probability[idx] || 0;
      const code = hourly.weather_code?.[idx] || 0;
      const hourTime = new Date(hourly.time[idx]);
      const isDay = isDayTime(hourTime);
      preview = `<div class="countdown-preview">${getWeatherIcon(code, 'small', isDay)} ${temp}°C · ${rain}% regen</div>`;
    }
  }

  el.innerHTML = `
    <div class="countdown-label">${label}</div>
    <div class="countdown-value">${countdownStr}</div>
    ${preview}
  `;
}

function renderBestTime() {
  const el = document.getElementById('bestTime');
  if (!el || !weatherData) return;

  const hourly = weatherData.hourly;
  const now = new Date();
  const currentHour = now.getHours();
  const startIdx = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);

  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < 4; i++) {
    const idx = startIdx + i;
    if (idx >= hourly.time.length) break;
    const temp = hourly.temperature_2m[idx];
    const rain = hourly.precipitation_probability[idx] || 0;
    const score = temp - rain * 0.3;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) { el.innerHTML = '--'; return; }

  const bestHour = new Date(hourly.time[bestIdx]);
  const isNow = bestHour.getHours() === currentHour;
  const timeStr = isNow ? 'Nu meteen' : `${String(bestHour.getHours()).padStart(2, '0')}:00`;
  const temp = Math.round(hourly.temperature_2m[bestIdx]);
  const rain = hourly.precipitation_probability[bestIdx] || 0;
  const code = hourly.weather_code?.[bestIdx] || 0;
  const isDay = isDayTime(bestHour);

  el.innerHTML = `
    <div class="best-time-row">
      <div class="best-time-main">
        <span class="best-time-value">${timeStr}</span>
        <span class="best-time-icon">${getWeatherIcon(code, 'small', isDay)}</span>
      </div>
      <div class="best-time-detail">${temp}°C · ${rain}% kans op regen</div>
    </div>
  `;
}

function renderWachtFf() {
  const el = document.getElementById('wachtFf');
  if (!el || !weatherData) { if (el) el.style.display = 'none'; return; }

  const c = weatherData.current;
  const minutely = weatherData.minutely_15;
  const hourly = weatherData.hourly;
  const now = new Date();
  const currentHour = now.getHours();
  const idxNow = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
  const rainProb = hourly.precipitation_probability[idxNow] ?? 0;

  const isRaining = c.precipitation > 0.1 || rainProb >= 50;

  if (!isRaining || !minutely || !minutely.time) {
    el.style.display = 'none';
    return;
  }

  const startIdx = minutely.time.findIndex(t => new Date(t) >= now);
  if (startIdx === -1) { el.style.display = 'none'; return; }

  let clearIdx = -1;
  for (let i = startIdx; i < Math.min(startIdx + 8, minutely.time.length); i++) {
    if ((minutely.precipitation[i] || 0) < 0.05) {
      clearIdx = i;
      break;
    }
  }

  el.style.display = 'flex';

  if (clearIdx === -1) {
    el.innerHTML = `<span class="wacht-icon">🌧️</span><span>Blijft de komende 2 uur regenen</span>`;
  } else {
    const clearTime = new Date(minutely.time[clearIdx]);
    const waitMins = Math.max(1, Math.round((clearTime - now) / 60000));
    const timeStr = String(clearTime.getHours()).padStart(2, '0') + ':' + String(clearTime.getMinutes()).padStart(2, '0');
    if (waitMins <= 5) {
      el.innerHTML = `<span class="wacht-icon">🌤️</span><span>Stopt zo dadelijk — wacht even</span>`;
    } else {
      el.innerHTML = `<span class="wacht-icon">⏱</span><span>Wacht ~${waitMins} min — droog rond <strong>${timeStr}</strong></span>`;
    }
  }
}

function render() {
  if (!weatherData) return;
  renderMetrics();
  renderForecast();
  renderRainChart();
  renderAdvice();
  renderWachtFf();
  renderBestTime();
  renderLunchCountdown();
}

function renderRainChart() {
  const minutely = weatherData.minutely_15;
  const card = document.getElementById('rainCard');

  if (!minutely || !minutely.time) {
    card.classList.remove('visible');
    return;
  }

  const now = new Date();
  const startIdx = minutely.time.findIndex(t => new Date(t) >= now);
  if (startIdx === -1) {
    card.classList.remove('visible');
    return;
  }

  const slots = [];
  for (let i = 0; i < 8; i++) {
    const idx = startIdx + i;
    if (idx >= minutely.time.length) break;
    slots.push({
      time: new Date(minutely.time[idx]),
      precip: minutely.precipitation[idx] || 0,
      prob: minutely.precipitation_probability?.[idx] || 0
    });
  }

  card.classList.add('visible');

  const totalRain = slots.reduce((sum, s) => sum + s.precip, 0);
  const maxProb = Math.max(...slots.map(s => s.prob));
  const maxPrecip = Math.max(1, ...slots.map(s => s.precip));

  const html = slots.map(s => {
    const heightPct = s.precip > 0 ? Math.max(4, (s.precip / maxPrecip) * 100) : 2;
    const isDry = s.precip < 0.05;
    const timeStr = String(s.time.getHours()).padStart(2, '0') + ':' + String(s.time.getMinutes()).padStart(2, '0');
    const valueStr = s.precip >= 0.1 ? s.precip.toFixed(1) + 'mm' : '';
    return `
      <div class="bar-group">
        ${valueStr ? `<span class="bar-value">${valueStr}</span>` : ''}
        <div class="bar ${isDry ? 'dry' : ''}" style="height: ${heightPct}%"></div>
        <span class="bar-label">${timeStr}</span>
      </div>
    `;
  }).join('');

  document.getElementById('rainChart').innerHTML = html;

  if (totalRain < 0.1 && maxProb < 20) {
    document.getElementById('rainSummary').innerHTML = `
      <span style="color: var(--good); font-weight: 600;">✓ Droog de komende 2 uur</span>
      <span>Piek kans: <strong>${maxProb}%</strong></span>
    `;
  } else {
    document.getElementById('rainSummary').innerHTML = `
      <span>Totaal: <strong>${totalRain.toFixed(1)} mm</strong></span>
      <span>Piek kans: <strong>${maxProb}%</strong></span>
    `;
  }
}

function renderMetrics() {
  const c = weatherData.current;
  const uv = weatherData.hourly.uv_index[0] || 0;
  document.getElementById('metrics').innerHTML = `
    <div class="metric fade-in">
      <span class="metric-label">Temperatuur</span>
      <span class="metric-value">${Math.round(c.temperature_2m)}<span class="metric-unit">°C</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">Gevoelstemp.</span>
      <span class="metric-value">${Math.round(c.apparent_temperature)}<span class="metric-unit">°C</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">Wind</span>
      <span class="metric-value">${Math.round(c.wind_speed_10m)}<span class="metric-unit">km/u</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">Neerslag</span>
      <span class="metric-value">${c.precipitation.toFixed(1)}<span class="metric-unit">mm</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">UV-index</span>
      <span class="metric-value">${Math.round(uv)}<span class="metric-unit"></span></span>
    </div>
  `;
}

function renderForecast() {
  const hourly = weatherData.hourly;
  const now = new Date();
  const currentHour = now.getHours();

  const startIdx = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
  const slots = [];
  for (let i = 0; i < 7; i++) {
    const idx = startIdx + i;
    if (idx >= hourly.time.length) break;
    slots.push({
      time: new Date(hourly.time[idx]),
      temp: hourly.temperature_2m[idx],
      rain: hourly.precipitation_probability[idx] || 0,
      weatherCode: hourly.weather_code?.[idx] || 0,
      isNow: i === 0
    });
  }

  const html = slots.map(s => {
    const isDay = isDayTime(s.time);
    return `
    <div class="slot ${s.isNow ? 'now' : ''}">
      <div class="slot-time">${s.isNow ? 'NU' : String(s.time.getHours()).padStart(2,'0') + ':00'}</div>
      <div class="slot-icon">${getWeatherIcon(s.weatherCode, 'small', isDay)}</div>
      <div class="slot-temp">${Math.round(s.temp)}°</div>
      <div class="slot-rain">${s.rain}%</div>
    </div>
  `}).join('');
  document.getElementById('forecast').innerHTML = html;
}

function renderAdvice() {
  const c = weatherData.current;
  const hourly = weatherData.hourly;

  const now = new Date();
  const currentHour = now.getHours();
  const idxNow = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);

  const temps = [c.temperature_2m, hourly.temperature_2m[idxNow + 1] ?? c.temperature_2m];
  const feels = c.apparent_temperature;
  const wind = c.wind_speed_10m;
  const rainProb = Math.max(
    hourly.precipitation_probability[idxNow] ?? 0,
    hourly.precipitation_probability[idxNow + 1] ?? 0
  );
  const rainAmount = Math.max(
    hourly.precipitation[idxNow] ?? 0,
    hourly.precipitation[idxNow + 1] ?? 0
  );

  const minTemp = Math.min(...temps);

  const prefOffset = userPref === 'cold' ? 3 : userPref === 'warm' ? -5 : 0;
  const effectiveFeel = feels - prefOffset;

  let verdict, detail, jacketType;
  const tips = [];

  if (effectiveFeel >= 18) {
    verdict = 'Geen jas nodig';
    jacketType = 'Lekker zo';
    detail = 'Het is aangenaam warm. Perfect voor een rondje buiten.';
  } else if (effectiveFeel >= 12) {
    verdict = 'Dun jasje';
    jacketType = 'Vest of windjack';
    detail = 'Mild, maar niet zomers. Een dunne laag houdt je comfortabel.';
  } else if (effectiveFeel >= 5) {
    verdict = 'Jas aan';
    jacketType = 'Herfstjas';
    detail = 'Fris weer. Een gewone jas is prima voor een korte wandeling.';
  } else if (effectiveFeel >= 0) {
    verdict = 'Dikke jas';
    jacketType = 'Winterjas';
    detail = 'Koud. Trek iets warms aan voordat je naar buiten stapt.';
  } else {
    verdict = 'Dikke jas + extra';
    jacketType = 'Winterjas + laagjes';
    detail = 'Echt koud. Een goede winterjas is geen overbodige luxe.';
  }

  if (rainAmount > 0.5 || rainProb >= 70) {
    if (effectiveFeel >= 15) {
      verdict = 'Regenjas';
      jacketType = 'Regenjas';
      detail = 'Het is warm genoeg, maar er komt regen. Pak iets waterdichts.';
    } else {
      verdict = 'Jas + regen';
      detail += ' Er is flinke kans op regen, dus waterdicht aanbevolen.';
    }
    tips.push({ text: '☂ Paraplu mee', yellow: true });
  } else if (rainProb >= 30) {
    tips.push({ text: `${rainProb}% kans op regen`, yellow: false });
  }

  if (wind >= 40) {
    tips.push({ text: '💨 Harde wind, paraplu kansloos', yellow: false });
  } else if (wind >= 25) {
    tips.push({ text: 'Stevige wind', yellow: false });
  }

  if (minTemp <= 3) {
    tips.push({ text: '🧣 Sjaal aanraden', yellow: false });
    tips.push({ text: '🧤 Handschoenen', yellow: false });
  } else if (minTemp <= 8) {
    tips.push({ text: 'Sjaal is fijn', yellow: false });
  }

  // UV tip
  const uv = weatherData.hourly.uv_index[0] || 0;
  if (uv >= 7) {
    tips.push({ text: '🧴 Hoge UV: zonnebrand smeren!', yellow: false });
  } else if (uv >= 3) {
    tips.push({ text: 'Middel UV: bescherm je huid', yellow: false });
  }

  // Pollen tip (specifieke allergens per seizoen)
  const pollen = getPollenTip();
  if (pollen.level === 'zeer hoog') {
    let msg = `🌸 ZEER HOGE POLLEN: ${pollen.allergens}. Allergie medicatie aangeraden!`;
    if (pollen.live) msg += ` LIVE: ${pollen.live}`;
    tips.push({ text: msg, yellow: false });
  } else if (pollen.level === 'hoog') {
    let msg = `🌸 Hoge pollen: ${pollen.allergens}. Let op je allergieën!`;
    if (pollen.live) msg += ` LIVE: ${pollen.live}`;
    tips.push({ text: msg, yellow: false });
  } else if (pollen.level === 'matig-hoog') {
    let msg = `🌾 Matig-hoge pollen: ${pollen.allergens}`;
    if (pollen.live) msg += ` LIVE: ${pollen.live}`;
    tips.push({ text: msg, yellow: false });
  } else if (pollen.level === 'matig') {
    let msg = `🌾 Matige pollen: ${pollen.allergens}`;
    if (pollen.live) msg += ` LIVE: ${pollen.live}`;
    tips.push({ text: msg, yellow: false });
  }

  tips.unshift({ text: jacketType, yellow: true });

  const isDay = isDayTime(new Date());
  const weatherIcon = getWeatherIcon(c.weather_code, 'large', isDay);
  document.getElementById('verdict').innerHTML = `<span class="fade-in">${verdict}</span><div class="weather-illustration">${weatherIcon}</div>`;
  document.getElementById('detail').textContent = detail;
  document.getElementById('tips').innerHTML = tips.map(t =>
    `<span class="tip ${t.yellow ? 'yellow' : ''}">${t.text}</span>`
  ).join('');
}

// ─── Looplog ───────────────────────────────────────────
function getLog() {
  try { return JSON.parse(localStorage.getItem('dighv_log') || '[]'); } catch(e) { return []; }
}

function saveLog(log) {
  try { localStorage.setItem('dighv_log', JSON.stringify(log)); } catch(e) {}
}

function updateLogTime() {
  const el = document.getElementById('logTime');
  if (!el) return;
  const now = new Date();
  el.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
}

function initLogTab() {
  const grid = document.getElementById('walkerGrid');
  if (!grid || grid.children.length > 0) return;

  WALKERS.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'walker-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      if (selectedWalkers.has(name)) {
        selectedWalkers.delete(name);
        btn.classList.remove('active');
      } else {
        selectedWalkers.add(name);
        btn.classList.add('active');
      }
    });
    grid.appendChild(btn);
  });

  document.getElementById('logClearBtn').addEventListener('click', () => {
    selectedWalkers.clear();
    grid.querySelectorAll('.walker-btn').forEach(b => b.classList.remove('active'));
  });

  document.getElementById('logSaveBtn').addEventListener('click', () => {
    const log = getLog();
    log.unshift({ id: Date.now(), timestamp: new Date().toISOString(), people: [...selectedWalkers] });
    saveLog(log);
    selectedWalkers.clear();
    grid.querySelectorAll('.walker-btn').forEach(b => b.classList.remove('active'));
    renderLogHistory();
    const saveBtn = document.getElementById('logSaveBtn');
    saveBtn.textContent = '✓ Opgeslagen';
    setTimeout(() => { saveBtn.textContent = 'Opslaan'; }, 1800);
  });
}

function renderLogHistory() {
  const el = document.getElementById('logHistory');
  if (!el) return;
  const log = getLog();

  if (log.length === 0) {
    el.innerHTML = '<div class="log-empty">Nog geen pauzes geregistreerd.</div>';
    return;
  }

  const days = {};
  log.forEach(entry => {
    const d = new Date(entry.timestamp);
    const key = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!days[key]) days[key] = [];
    days[key].push(entry);
  });

  let html = '';
  for (const [day, entries] of Object.entries(days)) {
    html += `<div class="log-day-header">${day}</div>`;
    entries.forEach(entry => {
      const d = new Date(entry.timestamp);
      const time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      const peopleStr = entry.people.length === 0 ? '<em>Niemand meegelopen</em>' : entry.people.join(', ');
      html += `
        <div class="log-entry">
          <div class="log-entry-main">
            <span class="log-entry-time">${time}</span>
            <span class="log-entry-people">${peopleStr}</span>
          </div>
          <button class="log-delete-btn" data-id="${entry.id}" title="Verwijderen">×</button>
        </div>`;
    });
  }

  el.innerHTML = html;
  el.querySelectorAll('.log-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = getLog().filter(e => e.id !== Number(btn.dataset.id));
      saveLog(updated);
      renderLogHistory();
    });
  });
}

// Preference buttons
document.querySelectorAll('.pref-btn').forEach(btn => {
  if (btn.dataset.pref === userPref) {
    document.querySelectorAll('.pref-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pref-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    userPref = btn.dataset.pref;
    localStorage_safe_set('dighv_pref', userPref);
    if (weatherData) renderAdvice();
  });
});

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
  if (darkModeForced === 'auto') {
    darkModeForced = 'dark';
  } else if (darkModeForced === 'dark') {
    darkModeForced = 'light';
  } else {
    darkModeForced = 'auto';
  }
  localStorage_safe_set('dighv_dark_force', darkModeForced);
  applyDarkMode();
});

// Init
fetchWeather();
setInterval(fetchWeather, 10 * 60 * 1000);
