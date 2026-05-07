// ─── Personen — voeg hier namen toe of verwijder ze ───
const WALKERS = [
  'Adam', 'Bob', 'David', 'Frank H', 'Frank vd H', 'Fred',
  'Gijs', 'Jeffrey', 'Louise', 'Muttalib', 'Noëlla', 'Nynke',
  'Remco', 'Sjors', 'Steven', 'Tessa', 'Timke'
];

// State
let weatherData = null;
let pollenData = null;
const memStore = {};
const DEFAULT_LOCATION = Object.freeze({
  mode: 'default',
  label: 'ANWB HQ · Wassenaarseweg, Den Haag',
  lat: 52.0964,
  lon: 4.3268
});
const LOCATION_STORAGE_KEY = 'dighv_location';
let userPref = localStorage_safe_get('dighv_pref') || 'normal';
let selectedWalkers = new Set();
let darkModeForced = localStorage_safe_get('dighv_dark_force') || 'auto'; // 'auto', 'dark', 'light'
let currentLocation = getStoredLocation();
let weatherRequestSeq = 0;

function sanitizeLocation(location) {
  if (!location || typeof location !== 'object') return { ...DEFAULT_LOCATION };
  const lat = Number(location.lat);
  const lon = Number(location.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ...DEFAULT_LOCATION };
  }
  const mode = location.mode === 'current' ? 'current' : 'default';
  return {
    mode,
    label: mode === 'current' ? 'Huidige locatie' : DEFAULT_LOCATION.label,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6))
  };
}

function getStoredLocation() {
  try {
    const stored = localStorage_safe_get(LOCATION_STORAGE_KEY);
    return stored ? sanitizeLocation(JSON.parse(stored)) : { ...DEFAULT_LOCATION };
  } catch (e) {
    return { ...DEFAULT_LOCATION };
  }
}

function persistLocation(location) {
  if (location.mode === 'default') {
    localStorage_safe_remove(LOCATION_STORAGE_KEY);
  } else {
    localStorage_safe_set(LOCATION_STORAGE_KEY, JSON.stringify(location));
  }
}

function formatCoords(location = currentLocation) {
  return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
}

function isDefaultLocation(location = currentLocation) {
  return location.mode === 'default';
}

function getAmsterdamDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Check if current time is daytime based on sunrise/sunset
function isDayTime(date) {
  if (!weatherData || !weatherData.daily) return true; // Default to day
  const daily = weatherData.daily;
  const todayKey = getAmsterdamDateKey(date);
  const todayIndex = Array.isArray(daily.time)
    ? daily.time.findIndex(day => day === todayKey)
    : -1;
  const index = todayIndex >= 0 ? todayIndex : 0;
  const sunrise = new Date(daily.sunrise?.[index]);
  const sunset = new Date(daily.sunset?.[index]);
  if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) {
    return true;
  }
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
      btn.title = `Dark mode: Auto (${darkMode ? 'donker' : 'licht'})`;
      btn.setAttribute('aria-label', `Thema: auto ${darkMode ? 'donker' : 'licht'}. Klik voor altijd donker.`);
    } else {
      btn.textContent = darkModeForced === 'dark' ? '🌙' : '☀️';
      btn.title = `Dark mode: altijd ${darkModeForced === 'dark' ? 'donker' : 'licht'}`;
      btn.setAttribute('aria-label', `Thema: altijd ${darkModeForced === 'dark' ? 'donker' : 'licht'}. Klik voor ${darkModeForced === 'dark' ? 'altijd licht' : 'auto'}.`);
    }
  }
}
applyDarkMode(); // Init

// Safe storage wrapper (fallback to in-memory)
function localStorage_safe_get(key) {
  try { return localStorage.getItem(key); } catch(e) { return memStore[key]; }
}
function localStorage_safe_set(key, val) {
  try { localStorage.setItem(key, val); } catch(e) { memStore[key] = val; }
}
function localStorage_safe_remove(key) {
  try { localStorage.removeItem(key); } catch(e) { delete memStore[key]; }
}

function setLocationPanelOpen(open) {
  const panel = document.getElementById('locationPanel');
  const btn = document.getElementById('locationEditBtn');
  if (!panel || !btn) return;
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
}

function setLocationStatus(message) {
  const status = document.getElementById('locationStatus');
  if (status) status.textContent = message || '';
}

function setLocationButtonsDisabled(disabled) {
  ['useCurrentLocationBtn', 'resetLocationBtn', 'locationEditBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled || (id === 'resetLocationBtn' && isDefaultLocation());
  });
}

function renderLocationUi(message = '') {
  const label = document.getElementById('locationLabel');
  const coords = document.getElementById('locationCoords');
  const panelCoords = document.getElementById('locationPanelCoords');
  const resetBtn = document.getElementById('resetLocationBtn');
  if (label) label.textContent = currentLocation.label;
  if (coords) coords.textContent = formatCoords();
  if (panelCoords) panelCoords.textContent = formatCoords();
  if (resetBtn) resetBtn.disabled = isDefaultLocation();
  setLocationStatus(message);
}

function showWeatherLoading() {
  const verdict = document.getElementById('verdict');
  const detail = document.getElementById('detail');
  const tips = document.getElementById('tips');
  if (verdict) verdict.innerHTML = `<div class="loading"><span class="spinner"></span>Weer ophalen...</div>`;
  if (detail) detail.textContent = '';
  if (tips) tips.innerHTML = '';
}

function setAppLocation(location, message) {
  currentLocation = sanitizeLocation(location);
  persistLocation(currentLocation);
  weatherData = null;
  pollenData = null;
  lastUpdate = null;
  showWeatherLoading();
  updateClock();
  renderLocationUi(message || '');
  fetchWeather();
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setLocationStatus('Huidige locatie is niet beschikbaar in deze browser.');
    return;
  }

  setLocationButtonsDisabled(true);
  setLocationStatus('Locatie ophalen...');
  navigator.geolocation.getCurrentPosition(
    position => {
      setLocationButtonsDisabled(false);
      setAppLocation({
        mode: 'current',
        label: 'Huidige locatie',
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }, 'Huidige locatie actief.');
    },
    error => {
      setLocationButtonsDisabled(false);
      const denied = error.code === error.PERMISSION_DENIED;
      setLocationStatus(denied ? 'Locatietoegang geweigerd.' : 'Locatie kon niet worden opgehaald.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
  );
}

function bindLocationControls() {
  const editBtn = document.getElementById('locationEditBtn');
  const currentBtn = document.getElementById('useCurrentLocationBtn');
  const resetBtn = document.getElementById('resetLocationBtn');

  editBtn?.addEventListener('click', () => {
    const panel = document.getElementById('locationPanel');
    setLocationPanelOpen(panel?.hidden !== false);
  });

  currentBtn?.addEventListener('click', useCurrentLocation);

  resetBtn?.addEventListener('click', () => {
    setAppLocation({ ...DEFAULT_LOCATION }, 'ANWB HQ actief.');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setLocationPanelOpen(false);
  });

  document.addEventListener('click', event => {
    const control = document.querySelector('.location-control');
    if (control && !control.contains(event.target)) setLocationPanelOpen(false);
  });

  renderLocationUi();
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

async function fetchWeather() {
  const requestId = ++weatherRequestSeq;
  const { lat, lon } = currentLocation;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&minutely_15=precipitation,precipitation_probability&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code,uv_index&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Europe/Amsterdam&past_days=1&forecast_days=2`;

  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen,olive_pollen&past_days=0&forecast_days=1`;

  try {
    // Fetch both weather and air quality data in parallel
    const [weatherRes, airQualityRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airQualityUrl)
    ]);
    
    if (requestId !== weatherRequestSeq) return;
    if (!weatherRes.ok) throw new Error('Weather network error');
    const weatherData_new = await weatherRes.json();
    if (requestId !== weatherRequestSeq) return;
    weatherData = weatherData_new;
    lastUpdate = new Date();
    updateClock();
    
    // Extract pollen data from air quality API if available
    if (airQualityRes.ok) {
      const airQualityData = await airQualityRes.json();
      if (requestId !== weatherRequestSeq) return;
      if (airQualityData.current) {
        pollenData = {
          alder: airQualityData.current.alder_pollen || 0,
          birch: airQualityData.current.birch_pollen || 0,
          grass: airQualityData.current.grass_pollen || 0,
          mugwort: airQualityData.current.mugwort_pollen || 0,
          ragweed: airQualityData.current.ragweed_pollen || 0,
          olive: airQualityData.current.olive_pollen || 0,
          timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
        };
      }
    } else {
      pollenData = null; // Fallback to seasonal data
    }
  } catch (err) {
    if (requestId !== weatherRequestSeq) return;
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
  
  // If live pollen data available, enhance with actual measurements
  if (pollenData) {
    const highPollen = [];
    // Thresholds for high pollen (in µg/m³ - typical values)
    if (pollenData.alder > 20) highPollen.push('els');
    if (pollenData.birch > 20) highPollen.push('berk');
    if (pollenData.grass > 50) highPollen.push('grassen');
    if (pollenData.mugwort > 10) highPollen.push('bijvoet');
    if (pollenData.ragweed > 10) highPollen.push('ragweed');
    if (pollenData.olive > 20) highPollen.push('olijf');
    
    const summary = highPollen.length > 0 
      ? `Hoog: ${highPollen.join(', ')}` 
      : 'Alle pollen laag';
    
    tip.live = `${summary} (gemeten ${pollenData.timestamp})`;
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
  const amsterdamDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"}));
const h = amsterdamDate.getHours();

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
  const BREAK_START = 11;
  const BREAK_END = 15;

  if (currentHour > BREAK_END) {
    el.innerHTML = '<div class="best-time-detail" style="color:var(--muted)">Geen pauzetijden meer vandaag</div>';
    return;
  }

  const startIdx = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
  if (startIdx === -1) { el.innerHTML = '--'; return; }

  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = startIdx; i < hourly.time.length; i++) {
    const h = new Date(hourly.time[i]).getHours();
    if (h > BREAK_END) break;
    if (h < BREAK_START) continue;
    const temp = hourly.temperature_2m[i];
    const rain = hourly.precipitation_probability[i] || 0;
    const score = temp - rain * 0.3;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }

  if (bestIdx === -1) {
    el.innerHTML = '<div class="best-time-detail" style="color:var(--muted)">Pauzetijden starten om 11:00</div>';
    return;
  }

  const bestHour = new Date(hourly.time[bestIdx]);
  const isNow = bestHour.getHours() === currentHour && currentHour >= BREAK_START && currentHour <= BREAK_END;
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
  renderWeatherComparison();
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

  if (effectiveFeel >= 17) {
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

  // Pollen tip (только предупреждение в советах, детали - в отдельном блоке)
  const pollen = getPollenTip();
  if (pollen.level === 'zeer hoog') {
    tips.push({ text: '🌸 ZEER HOGE POLLEN - medicatie aangeraden!', yellow: false, pollen: false });
  } else if (pollen.level === 'hoog') {
    tips.push({ text: '🌸 Hoge pollen - let op allergieën!', yellow: false, pollen: false });
  }

  tips.unshift({ text: jacketType, yellow: true });

  const isDay = isDayTime(new Date());
  const weatherIcon = getWeatherIcon(c.weather_code, 'large', isDay);
  document.getElementById('verdict').innerHTML = `<span class="fade-in">${verdict}</span><div class="weather-illustration">${weatherIcon}</div>`;
  document.getElementById('detail').textContent = detail;
  document.getElementById('tips').innerHTML = tips.map(t =>
    `<span class="tip ${t.yellow ? 'yellow' : ''} ${t.pollen ? 'pollen' : ''}">${t.text}</span>`
  ).join('');
  
  renderPollenCard();
  renderChecklist();
}

function renderPollenCard() {
  const pollenGrid = document.getElementById('pollenGrid');
  if (!pollenGrid) return;

  const pollens = [
    { name: 'Els', icon: '🌳', value: pollenData?.alder || 0, threshold: 20, season: true },
    { name: 'Berk', icon: '🌳', value: pollenData?.birch || 0, threshold: 20, season: true },
    { name: 'Grassen', icon: '🌾', value: pollenData?.grass || 0, threshold: 50, season: true },
    { name: 'Bijvoet', icon: '🌱', value: pollenData?.mugwort || 0, threshold: 10, season: true },
    { name: 'Ambrosia', icon: '🌱', value: pollenData?.ragweed || 0, threshold: 10, season: true },
    { name: 'Olijf', icon: '🌳', value: pollenData?.olive || 0, threshold: 20, season: false },
  ];

  // Calculate levels and sort by highest first
  const withLevels = pollens.map(p => ({
    ...p,
    level: p.value > p.threshold ? 'hoog' : p.value > p.threshold * 0.5 ? 'matig' : 'laag',
    intensity: p.value
  })).sort((a, b) => b.intensity - a.intensity);

  // Get pollen tip for context
  const tip = getPollenTip();

  let html = `<div class="pollen-info">
    <div class="pollen-level">Niveau: <strong>${tip.level.toUpperCase()}</strong></div>
    <div class="pollen-allergens">Seizoen: <strong>${tip.allergens}</strong></div>
  </div>`;

  html += '<div class="pollen-items">';
  withLevels.forEach(p => {
    const percentage = Math.min(100, (p.value / (p.threshold * 2)) * 100);
    const levelClass = p.level === 'hoog' ? 'high' : p.level === 'matig' ? 'medium' : 'low';
    html += `<div class="pollen-item ${levelClass}">
      <div class="pollen-item-header">
        <span class="pollen-name">${p.icon} ${p.name}</span>
        <span class="pollen-value">${Math.round(p.value)} µg/m³</span>
      </div>
      <div class="pollen-bar">
        <div class="pollen-bar-fill" style="width: ${percentage}%"></div>
      </div>
    </div>`;
  });
  html += '</div>';

  pollenGrid.innerHTML = html;
}

function renderChecklist() {
  const items = [
    { group: 'Always', icon: '🔑', label: 'Personeelspas', id: 'personeelspas' },
    { group: 'Always', icon: '🎫', label: 'Bezoekerspas (check: heeft iemand een pas?)', id: 'bezoekerspas' },
    { group: 'Always', icon: '📱', label: 'Telefoon', id: 'telefoon' },
    
    // UV-based items
    { group: 'Zon', icon: '🕶️', label: 'Zonnebril (hoge UV)', id: 'zonnebril', condition: () => weatherData?.hourly?.uv_index?.[0] >= 3 },
    { group: 'Zon', icon: '🧴', label: 'Zonnebrandcreme SPF50+', id: 'zonnebrandcreme', condition: () => weatherData?.hourly?.uv_index?.[0] >= 3 },
    { group: 'Zon', icon: '👒', label: 'Hoed/pet (zeer hoge UV)', id: 'hoed', condition: () => weatherData?.hourly?.uv_index?.[0] >= 7 },
    
    // Rain-based items
    { group: 'Regen', icon: '☂️', label: 'Paraplu', id: 'paraplu', condition: () => {
      if (!weatherData) return false;
      const hourly = weatherData.hourly;
      const now = new Date();
      const currentHour = now.getHours();
      const idxNow = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
      const rainProb = Math.max(hourly.precipitation_probability?.[idxNow] ?? 0, hourly.precipitation_probability?.[idxNow + 1] ?? 0);
      return rainProb >= 30;
    } },
    { group: 'Regen', icon: '🎒', label: 'Waterdichte tas/rugzak', id: 'waterdichte_tas', condition: () => {
      if (!weatherData) return false;
      const hourly = weatherData.hourly;
      const now = new Date();
      const currentHour = now.getHours();
      const idxNow = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
      const rainProb = Math.max(hourly.precipitation_probability?.[idxNow] ?? 0, hourly.precipitation_probability?.[idxNow + 1] ?? 0);
      return rainProb >= 50;
    } },
    
    // Cold-based items
    { group: 'Kou', icon: '🧣', label: 'Sjaal', id: 'sjaal', condition: () => weatherData?.current?.temperature_2m <= 8 },
    { group: 'Kou', icon: '🧤', label: 'Handschoenen', id: 'handschoenen', condition: () => weatherData?.current?.temperature_2m <= 3 },
    { group: 'Kou', icon: '🧥', label: 'Winterjas (< 0°C)', id: 'winterjas_extra', condition: () => weatherData?.current?.temperature_2m < 0 },
    
    // Wind-based items
    { group: 'Wind', icon: '💨', label: 'Stevig jasje (wind > 25 km/u)', id: 'stevig_jasje', condition: () => weatherData?.current?.wind_speed_10m > 25 },
    
    // Info items
    { group: 'Info', icon: '📍', label: 'Route: bij bezoekerspas → rotonde naar buiten', id: 'route_info' },
  ];

  const checklist = document.getElementById('checklist');
  if (!checklist) return;

  // Get checked items from storage
  let checked = {};
  try {
    checked = JSON.parse(localStorage.getItem('dighv_checklist') || '{}');
  } catch(e) {}

  // Group items
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    const shouldShow = !item.condition || item.condition();
    if (shouldShow) grouped[item.group].push(item);
  });

  let html = '';
  const groupOrder = ['Always', 'Zon', 'Regen', 'Kou', 'Wind', 'Allergie', 'Info'];
  const groupLabels = {
    'Always': '✓ Altijd mee',
    'Zon': '☀️ Zon',
    'Regen': '🌧️ Regen',
    'Kou': '❄️ Kou',
    'Wind': '💨 Wind',
    'Allergie': '🌸 Allergie',
    'Info': '📍 Info'
  };

  groupOrder.forEach(group => {
    if (!grouped[group] || grouped[group].length === 0) return;
    html += `<div class="checklist-group">
      <div class="checklist-group-title">${groupLabels[group]}</div>`;
    grouped[group].forEach(item => {
      const isChecked = checked[item.id];
      html += `<div class="checklist-item">
        <input type="checkbox" id="check_${item.id}" ${isChecked ? 'checked' : ''}>
        <label for="check_${item.id}">${item.label}</label>
      </div>`;
    });
    html += '</div>';
  });

  checklist.innerHTML = html;

  // Add event listeners
  checklist.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.id.replace('check_', '');
      checked[id] = e.target.checked;
      try {
        localStorage.setItem('dighv_checklist', JSON.stringify(checked));
      } catch(e) {}
    });
  });
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

function renderWeatherComparison() {
  const el = document.getElementById('comparisonGrid');
  if (!el || !weatherData || !weatherData.daily) return;

  const daily = weatherData.daily;

  // Index: 0 = yesterday, 1 = today, 2 = tomorrow
  const yesterdayIdx = 0;
  const todayIdx = 1;
  const tomorrowIdx = 2;

  // Check if all data exists
  if (!daily.time[tomorrowIdx]) return;

  const getData = (idx) => ({
    tempMax: daily.temperature_2m_max?.[idx],
    code: daily.weather_code?.[idx],
    rain: daily.precipitation_sum?.[idx] || 0,
    wind: daily.wind_speed_10m_max?.[idx] || 0,
    date: new Date(daily.time[idx])
  });

  const yesterday = getData(yesterdayIdx);
  const today = getData(todayIdx);
  const tomorrow = getData(tomorrowIdx);

  // Calculate weather score (higher = better for outdoor break)
  const calcScore = (day) => {
    return (day.tempMax ?? 15) - (day.rain > 0.5 ? 5 : 0) - (day.wind > 25 ? 3 : 0);
  };

  const yesterdayScore = calcScore(yesterday);
  const todayScore = calcScore(today);
  const tomorrowScore = calcScore(tomorrow);

  const formatDate = (d) => d.toLocaleDateString('nl-NL', { weekday: 'short', month: 'short', day: 'numeric' });

  el.innerHTML = `
    <div class="comparison-day">
      <div class="comparison-label">Gisteren</div>
      <div class="comparison-icon">${getWeatherIcon(yesterday.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(yesterday.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">Wind: ${Math.round(yesterday.wind)} km/u</div>
      <div class="comparison-detail">Regen: ${yesterday.rain.toFixed(1)} mm</div>
      <div class="comparison-verdict" style="opacity: 0.7;">Score: ${Math.round(yesterdayScore)}</div>
    </div>
    <div class="comparison-day today">
      <div class="comparison-label">Vandaag</div>
      <div class="comparison-icon">${getWeatherIcon(today.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(today.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">Wind: ${Math.round(today.wind)} km/u</div>
      <div class="comparison-detail">Regen: ${today.rain.toFixed(1)} mm</div>
      <div class="comparison-verdict">Score: ${Math.round(todayScore)}</div>
    </div>
    <div class="comparison-day">
      <div class="comparison-label">Morgen</div>
      <div class="comparison-icon">${getWeatherIcon(tomorrow.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(tomorrow.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">Wind: ${Math.round(tomorrow.wind)} km/u</div>
      <div class="comparison-detail">Regen: ${tomorrow.rain.toFixed(1)} mm</div>
      <div class="comparison-verdict ${tomorrowScore > todayScore ? '' : 'worse'}">
        ${tomorrowScore > todayScore ? '✓ Beter!' : '✗ Minder goed'}
      </div>
    </div>
  `;
}

// Init
bindLocationControls();
fetchWeather();
setInterval(fetchWeather, 10 * 60 * 1000);
