// State
let weatherData = null;
let userPref = localStorage_safe_get('dighv_pref') || 'normal';

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
}
updateClock();
setInterval(updateClock, 30000);

// Den Haag - ANWB HQ (Wassenaarseweg)
const LAT = 52.0907;
const LON = 4.2676;

async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&minutely_15=precipitation,precipitation_probability&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code&timezone=Europe/Amsterdam&forecast_days=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    weatherData = data;
    lastUpdate = new Date();
    updateClock();
    render();
  } catch (err) {
    document.getElementById('verdict').innerHTML = `<div class="error">Kon weerdata niet ophalen. Probeer later opnieuw.</div>`;
  }
}

function getWeatherIcon(code, size = 'small') {
  const icons = {
    0:  { small: '☀️', large: '☀️' },
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

function render() {
  if (!weatherData) return;
  renderMetrics();
  renderForecast();
  renderRainChart();
  renderAdvice();
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

  const html = slots.map(s => `
    <div class="slot ${s.isNow ? 'now' : ''}">
      <div class="slot-time">${s.isNow ? 'NU' : String(s.time.getHours()).padStart(2,'0') + ':00'}</div>
      <div class="slot-icon">${getWeatherIcon(s.weatherCode)}</div>
      <div class="slot-temp">${Math.round(s.temp)}°</div>
      <div class="slot-rain">${s.rain}%</div>
    </div>
  `).join('');
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

  tips.unshift({ text: jacketType, yellow: true });

  const weatherIcon = getWeatherIcon(c.weather_code, 'large');
  document.getElementById('verdict').innerHTML = `<span class="fade-in">${verdict}</span><div class="weather-illustration">${weatherIcon}</div>`;
  document.getElementById('detail').textContent = detail;
  document.getElementById('tips').innerHTML = tips.map(t =>
    `<span class="tip ${t.yellow ? 'yellow' : ''}">${t.text}</span>`
  ).join('');
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

// Init
fetchWeather();
setInterval(fetchWeather, 10 * 60 * 1000);
