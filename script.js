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
let darkModeForced = localStorage_safe_get('dighv_dark_force') || 'auto';
let lang = localStorage_safe_get('dighv_lang') || 'nl';
let currentLocation = getStoredLocation();
let weatherRequestSeq = 0;

// ─── i18n ────────────────────────────────────────────────────────────────────
const i18n = {
  nl: {
    tabAdvice: 'Advies', tabLog: 'Looplog', tabExplain: 'Hoe werkt dit?',
    h1Html: 'Jas aan of <span class="accent">niet?</span>',
    lead: 'De officieuze DIGHV pauze-scanner. Even checken voor je naar buiten loopt.',
    adviceLabel: 'Advies voor nu + 30 min',
    yourType: 'Jouw type', prefCold: 'Kouwelijk', prefNormal: 'Normaal', prefWarm: 'Warmbloedig',
    checklistTitle: '✓ Wat mee naar buiten?',
    nextBreak: 'Volgende pauze', currentConditions: 'Huidige condities',
    comingHours: 'Komende uren', bestBreakTime: 'Beste pauzetijd',
    rainPer15: 'Regen per 15 minuten', next2hours: 'komende 2 uur',
    pollenOverview: '🌸 Pollenoverzicht', todayVsTomorrow: 'Vandaag vs Morgen',
    footerHtml: 'Gebouwd door en voor <strong>DIGHV</strong> · Weerdata via Open-Meteo · Niet officieel ANWB',
    locationPanelTitle: 'Locatie',
    useCurrentLocationBtn: 'Huidige locatie', resetLocationBtn: 'ANWB HQ',
    locationDefaultLabel: 'Huidige locatie',
    locationCityLabel: city => `Huidige locatie · ${city}`,
    locationFetching: 'Locatie ophalen...', cityFetching: 'Stad ophalen...',
    locationActive: 'Huidige locatie actief.',
    locationActiveCity: city => `Huidige locatie actief (${city}).`,
    locationNoGeo: 'Huidige locatie is niet beschikbaar in deze browser.',
    locationDenied: 'Locatietoegang geweigerd.',
    locationFailed: 'Locatie kon niet worden opgehaald.',
    anwbHqActive: 'ANWB HQ actief.',
    weatherLoading: 'Weer ophalen...', weatherError: 'Kon weerdata niet ophalen. Probeer later opnieuw.',
    dataFresh: 'data vers', dataAgeMin: mins => `data ${mins} min oud`,
    verdictNone: 'Geen jas nodig', jacketNone: 'Lekker zo',
    detailNone: 'Het is aangenaam warm. Perfect voor een rondje buiten.',
    verdictLight: 'Dun jasje', jacketLight: 'Vest of windjack',
    detailLight: 'Mild, maar niet zomers. Een dunne laag houdt je comfortabel.',
    verdictAutumn: 'Jas aan', jacketAutumn: 'Herfstjas',
    detailAutumn: 'Fris weer. Een gewone jas is prima voor een korte wandeling.',
    verdictWinter: 'Dikke jas', jacketWinter: 'Winterjas',
    detailWinter: 'Koud. Trek iets warms aan voordat je naar buiten stapt.',
    verdictFreezing: 'Dikke jas + extra', jacketFreezing: 'Winterjas + laagjes',
    detailFreezing: 'Echt koud. Een goede winterjas is geen overbodige luxe.',
    verdictRain: 'Regenjas', jacketRain: 'Regenjas',
    detailRain: 'Het is warm genoeg, maar er komt regen. Pak iets waterdichts.',
    verdictJacketRain: 'Jas + regen',
    detailRainAppend: ' Er is flinke kans op regen, dus waterdicht aanbevolen.',
    tipUmbrella: '☂ Paraplu mee',
    tipRainChance: prob => `${prob}% kans op regen`,
    tipStormWind: '💨 Harde wind, paraplu kansloos', tipStrongWind: 'Stevige wind',
    tipScarf: '🧣 Sjaal aanraden', tipGloves: '🧤 Handschoenen', tipScarfNice: 'Sjaal is fijn',
    tipUvHigh: '🧴 Hoge UV: zonnebrand smeren!', tipUvMid: 'Middel UV: bescherm je huid',
    tipPollenVeryHigh: '🌸 ZEER HOGE POLLEN - medicatie aangeraden!',
    tipPollenHigh: '🌸 Hoge pollen - let op allergieën!',
    rainContinues: 'Blijft de komende 2 uur regenen',
    rainStopsSoon: 'Stopt zo dadelijk — wacht even',
    rainWait: (mins, ts) => `Wacht ~${mins} min — droog rond <strong>${ts}</strong>`,
    rainDry: '✓ Droog de komende 2 uur', rainPeakChance: 'Piek kans', rainTotal: 'Totaal',
    metricTemp: 'Temperatuur', metricFeels: 'Gevoelstemp.', metricWind: 'Wind',
    metricPrecip: 'Neerslag', metricUv: 'UV-index',
    windDirs: ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'],
    pollenTomorrow: 'Morgen', sunriseLabel: '🌅', sunsetLabel: '🌇',
    forecastNow: 'NU',
    lunchLabel: 'Lunch', afternoonLabel: 'Middagpauze', tomorrowLunch: 'Morgen lunch',
    countdownNow: 'Nu!', rainPreview: rain => `${rain}% regen`,
    bestTimeNow: 'Nu meteen',
    bestTimeRainDetail: (temp, rain) => `${temp}°C · ${rain}% kans op regen`,
    bestTimePauseStart: 'Pauzetijden starten om 11:00',
    bestTimeNoMore: 'Geen pauzetijden meer vandaag',
    yesterday: 'Gisteren', today: 'Vandaag', tomorrow: 'Morgen',
    better: '✓ Beter!', worse: '✗ Minder goed',
    scoreLabel: s => `Score: ${s}`, windLabel: w => `Wind: ${w} km/u`,
    rainLabel: r => `Regen: ${r} mm`,
    logTitle: 'Wie gaat er mee?', logNobody: 'Niemand', logSave: 'Opslaan',
    logSaved: '✓ Opgeslagen', logEmpty: 'Nog geen pauzes geregistreerd.',
    logNobodyWalked: '<em>Niemand meegelopen</em>',
    pollenLevelLabel: lvl => `Niveau: <strong>${lvl.toUpperCase()}</strong>`,
    pollenSeasonLabel: a => `Seizoen: <strong>${a}</strong>`,
    pollenHighPrefix: 'Hoog: ', pollenAllLow: 'Alle pollen laag',
    pollenMeasured: time => `(gemeten ${time})`,
    pollenLevels: {
      1:{level:'laag',allergens:'hazelaar, els'}, 2:{level:'matig-hoog',allergens:'hazelaar, els, berken'},
      3:{level:'hoog',allergens:'els, berk, iep'}, 4:{level:'zeer hoog',allergens:'berk, grassen, taxus'},
      5:{level:'zeer hoog',allergens:'grassen, taxus'}, 6:{level:'hoog',allergens:'grassen'},
      7:{level:'matig',allergens:'grassen, onkruid'}, 8:{level:'matig',allergens:'grassen, onkruid'},
      9:{level:'matig',allergens:'onkruid, schimmelsporen'}, 10:{level:'laag-matig',allergens:'schimmelsporen, taxus'},
      11:{level:'laag',allergens:'schimmelsporen'}, 12:{level:'laag',allergens:'hazelaar'}
    },
    groupAlways: '✓ Altijd mee', groupSun: '☀️ Zon', groupRain: '🌧️ Regen',
    groupCold: '❄️ Kou', groupWind: '💨 Wind', groupAllergie: '🌸 Allergie', groupInfo: '📍 Info',
    checkPersPass: 'Personeelspas',
    checkBezPass: 'Bezoekerspas (check: heeft iemand een pas?)',
    checkPhone: 'Telefoon', checkSunglasses: 'Zonnebril (hoge UV)',
    checkSunscreen: 'Zonnebrandcreme SPF50+', checkHat: 'Hoed/pet (zeer hoge UV)',
    checkUmbrella: 'Paraplu', checkWaterproof: 'Waterdichte tas/rugzak',
    checkScarf: 'Sjaal', checkGloves: 'Handschoenen',
    checkWinterJacket: 'Winterjas (< 0°C)', checkWindJacket: 'Stevig jasje (wind > 25 km/u)',
    checkRoute: 'Route: bij bezoekerspas → rotonde naar buiten',
    darkAutoTitle: isDark => `Dark mode: Auto (${isDark ? 'donker' : 'licht'})`,
    darkAutoAria: isDark => `Thema: auto ${isDark ? 'donker' : 'licht'}. Klik voor altijd donker.`,
    darkForcedTitle: f => `Dark mode: altijd ${f === 'dark' ? 'donker' : 'licht'}`,
    darkForcedAria: f => `Thema: altijd ${f === 'dark' ? 'donker' : 'licht'}. Klik voor ${f === 'dark' ? 'altijd licht' : 'auto'}.`,
    dateLocale: 'nl-NL',
  },
  en: {
    tabAdvice: 'Advice', tabLog: 'Walk log', tabExplain: 'How does this work?',
    h1Html: 'Jacket on or <span class="accent">not?</span>',
    lead: 'The unofficial DIGHV break scanner. Check before you head outside.',
    adviceLabel: 'Advice for now + 30 min',
    yourType: 'Your type', prefCold: 'Sensitive to cold', prefNormal: 'Normal', prefWarm: 'Warm-blooded',
    checklistTitle: '✓ What to bring outside?',
    nextBreak: 'Next break', currentConditions: 'Current conditions',
    comingHours: 'Coming hours', bestBreakTime: 'Best break time',
    rainPer15: 'Rain per 15 minutes', next2hours: 'next 2 hours',
    pollenOverview: '🌸 Pollen overview', todayVsTomorrow: 'Today vs Tomorrow',
    footerHtml: 'Built by and for <strong>DIGHV</strong> · Weather data via Open-Meteo · Not official ANWB',
    locationPanelTitle: 'Location',
    useCurrentLocationBtn: 'Current location', resetLocationBtn: 'ANWB HQ',
    locationDefaultLabel: 'Current location',
    locationCityLabel: city => `Current location · ${city}`,
    locationFetching: 'Getting location...', cityFetching: 'Looking up city...',
    locationActive: 'Current location active.',
    locationActiveCity: city => `Current location active (${city}).`,
    locationNoGeo: 'Current location is not available in this browser.',
    locationDenied: 'Location access denied.',
    locationFailed: 'Could not get location.',
    anwbHqActive: 'ANWB HQ active.',
    weatherLoading: 'Getting weather...', weatherError: 'Could not fetch weather data. Please try again later.',
    dataFresh: 'data fresh', dataAgeMin: mins => `data ${mins} min old`,
    verdictNone: 'No jacket needed', jacketNone: 'Enjoy the weather',
    detailNone: "It's pleasantly warm. Perfect for a walk outside.",
    verdictLight: 'Light jacket', jacketLight: 'Cardigan or windbreaker',
    detailLight: 'Mild, but not summery. A thin layer will keep you comfortable.',
    verdictAutumn: 'Jacket on', jacketAutumn: 'Autumn jacket',
    detailAutumn: 'Fresh out there. A regular jacket works fine for a short walk.',
    verdictWinter: 'Thick jacket', jacketWinter: 'Winter coat',
    detailWinter: 'Cold. Put on something warm before you step outside.',
    verdictFreezing: 'Thick jacket + layers', jacketFreezing: 'Winter coat + layers',
    detailFreezing: "Properly freezing. A good winter coat is not a luxury — it's a necessity.",
    verdictRain: 'Rain jacket', jacketRain: 'Rain jacket',
    detailRain: 'Warm enough, but rain is coming. Grab something waterproof.',
    verdictJacketRain: 'Jacket + rain',
    detailRainAppend: " There's a good chance of rain, so waterproof is recommended.",
    tipUmbrella: '☂ Bring an umbrella',
    tipRainChance: prob => `${prob}% chance of rain`,
    tipStormWind: '💨 Strong wind, umbrella is pointless', tipStrongWind: 'Strong wind',
    tipScarf: '🧣 Scarf recommended', tipGloves: '🧤 Gloves', tipScarfNice: 'Scarf is a good idea',
    tipUvHigh: '🧴 High UV: put on sunscreen!', tipUvMid: 'Moderate UV: protect your skin',
    tipPollenVeryHigh: '🌸 VERY HIGH POLLEN - medication recommended!',
    tipPollenHigh: '🌸 High pollen - watch out for allergies!',
    rainContinues: 'Rain continues for the next 2 hours',
    rainStopsSoon: 'Stops in a moment — just wait',
    rainWait: (mins, ts) => `Wait ~${mins} min — dry around <strong>${ts}</strong>`,
    rainDry: '✓ Dry for the next 2 hours', rainPeakChance: 'Peak chance', rainTotal: 'Total',
    metricTemp: 'Temperature', metricFeels: 'Feels like', metricWind: 'Wind',
    metricPrecip: 'Precipitation', metricUv: 'UV index',
    windDirs: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    pollenTomorrow: 'Tomorrow', sunriseLabel: '🌅', sunsetLabel: '🌇',
    forecastNow: 'NOW',
    lunchLabel: 'Lunch', afternoonLabel: 'Afternoon break', tomorrowLunch: "Tomorrow's lunch",
    countdownNow: 'Now!', rainPreview: rain => `${rain}% rain`,
    bestTimeNow: 'Right now',
    bestTimeRainDetail: (temp, rain) => `${temp}°C · ${rain}% chance of rain`,
    bestTimePauseStart: 'Break times start at 11:00',
    bestTimeNoMore: 'No more break times today',
    yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow',
    better: '✓ Better!', worse: '✗ Not as good',
    scoreLabel: s => `Score: ${s}`, windLabel: w => `Wind: ${w} km/h`,
    rainLabel: r => `Rain: ${r} mm`,
    logTitle: "Who's coming along?", logNobody: 'Nobody', logSave: 'Save',
    logSaved: '✓ Saved', logEmpty: 'No breaks logged yet.',
    logNobodyWalked: '<em>Nobody came along</em>',
    pollenLevelLabel: lvl => `Level: <strong>${lvl.toUpperCase()}</strong>`,
    pollenSeasonLabel: a => `Season: <strong>${a}</strong>`,
    pollenHighPrefix: 'High: ', pollenAllLow: 'All pollen low',
    pollenMeasured: time => `(measured ${time})`,
    pollenLevels: {
      1:{level:'low',allergens:'hazel, alder'}, 2:{level:'moderate-high',allergens:'hazel, alder, birch'},
      3:{level:'high',allergens:'alder, birch, elm'}, 4:{level:'very high',allergens:'birch, grasses, yew'},
      5:{level:'very high',allergens:'grasses, yew'}, 6:{level:'high',allergens:'grasses'},
      7:{level:'moderate',allergens:'grasses, weeds'}, 8:{level:'moderate',allergens:'grasses, weeds'},
      9:{level:'moderate',allergens:'weeds, mould spores'}, 10:{level:'low-moderate',allergens:'mould spores, yew'},
      11:{level:'low',allergens:'mould spores'}, 12:{level:'low',allergens:'hazel'}
    },
    groupAlways: '✓ Always bring', groupSun: '☀️ Sun', groupRain: '🌧️ Rain',
    groupCold: '❄️ Cold', groupWind: '💨 Wind', groupAllergie: '🌸 Allergies', groupInfo: '📍 Info',
    checkPersPass: 'Staff pass',
    checkBezPass: 'Visitor pass (check: does someone have a pass?)',
    checkPhone: 'Phone', checkSunglasses: 'Sunglasses (high UV)',
    checkSunscreen: 'Sunscreen SPF50+', checkHat: 'Hat/cap (very high UV)',
    checkUmbrella: 'Umbrella', checkWaterproof: 'Waterproof bag/backpack',
    checkScarf: 'Scarf', checkGloves: 'Gloves',
    checkWinterJacket: 'Winter coat (< 0°C)', checkWindJacket: 'Sturdy jacket (wind > 25 km/h)',
    checkRoute: 'Route: with visitor pass → roundabout to exit',
    darkAutoTitle: isDark => `Dark mode: Auto (${isDark ? 'dark' : 'light'})`,
    darkAutoAria: isDark => `Theme: auto ${isDark ? 'dark' : 'light'}. Click for always dark.`,
    darkForcedTitle: f => `Dark mode: always ${f === 'dark' ? 'dark' : 'light'}`,
    darkForcedAria: f => `Theme: always ${f === 'dark' ? 'dark' : 'light'}. Click for ${f === 'dark' ? 'always light' : 'auto'}.`,
    dateLocale: 'en-GB',
  }
};

function t(key, ...args) {
  const val = i18n[lang]?.[key] ?? i18n.nl[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

function setLang(newLang) {
  lang = newLang;
  localStorage_safe_set('dighv_lang', lang);
  applyTranslations();
}

function applyTranslations() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  const explainEl = document.querySelector('.explain-content');
  if (explainEl) explainEl.innerHTML = renderExplainHtml();
  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.textContent = lang === 'nl' ? 'EN' : 'NL';
  renderLocationUi();
  renderLogHistory();
  applyDarkMode();
  if (weatherData) render();
}

function renderExplainHtml() {
  if (lang === 'en') return `
    <h2>How does this work?</h2>
    <p class="intro">No magic, just a few thresholds based on live weather data. Here's exactly what the tool does.</p>
    <div class="explain-section">
      <h3>1. Data source</h3>
      <p>The tool fetches live weather data from <strong>Open-Meteo</strong> (forecast API) and live pollen data from the <strong>Open-Meteo Air Quality API</strong> every 10 minutes. These APIs combine data from various European meteorological institutes (including the KNMI).</p>
      <p>Default location: <code>52.0964° N, 4.3268° E</code> — ANWB headquarters on Wassenaarseweg in The Hague. Via the location button, the app can temporarily use your current coordinates.</p>
      <div class="callout"><strong>Live check:</strong> the time in the header updates continuously and the green LIVE dot pulses as long as the data is fresh.</div>
    </div>
    <div class="explain-section">
      <h3>2. What is measured?</h3>
      <p>For the advice, the tool looks at 4 values, taken for the window <strong>now + 30 minutes</strong>:</p>
      <table class="threshold-table">
        <tr><th>Signal</th><th>Used for</th></tr>
        <tr><td>Temperature</td><td>Base value, lowest value in the window</td></tr>
        <tr><td>Feels-like temperature</td><td>Main input for jacket type (accounts for wind and humidity)</td></tr>
        <tr><td>Wind speed</td><td>Extra tips (scarf, umbrella pointless in storm)</td></tr>
        <tr><td>Precipitation and chance</td><td>Rain jacket advice and umbrella tip</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h3>3. Jacket type based on feels-like temperature</h3>
      <p>The feels-like temperature (plus your personal offset) determines which jacket is recommended:</p>
      <table class="threshold-table">
        <tr><th>Feels-like temperature</th><th>Advice</th></tr>
        <tr><td>17 °C or warmer</td><td><span class="badge-inline">No jacket</span></td></tr>
        <tr><td>12 to 17 °C</td><td><span class="badge-inline">Light jacket</span> (cardigan or windbreaker)</td></tr>
        <tr><td>5 to 12 °C</td><td><span class="badge-inline">Autumn jacket</span></td></tr>
        <tr><td>0 to 5 °C</td><td><span class="badge-inline">Winter coat</span></td></tr>
        <tr><td>below 0 °C</td><td><span class="badge-inline">Winter coat + layers</span></td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h3>4. Personal preference</h3>
      <p>The <strong>Your type</strong> button applies an offset to the feels-like temperature:</p>
      <table class="threshold-table">
        <tr><th>Type</th><th>Offset</th><th>Effect</th></tr>
        <tr><td>Sensitive to cold</td><td><code>+3 °C cold</code></td><td>Earlier and warmer jacket advice</td></tr>
        <tr><td>Normal</td><td><code>0</code></td><td>Standard</td></tr>
        <tr><td>Warm-blooded</td><td><code>−5 °C cold</code></td><td>No jacket or lighter jacket sooner</td></tr>
      </table>
      <div class="callout"><strong>Example:</strong> feels like 14 °C + warm-blooded means the tool calculates with 19 °C. Advice becomes "no jacket" instead of "light jacket".</div>
    </div>
    <div class="explain-section">
      <h3>5. Rain override</h3>
      <p>If more than <code>0.5 mm</code> of rain falls within the window <strong>or</strong> the chance of rain is above <code>70%</code>, the advice is overridden to a rain jacket. In milder weather, "rain jacket" replaces the regular jacket.</p>
      <p>If the chance of rain is between <code>30%</code> and <code>70%</code>, you get a warning tip only, but the normal jacket advice remains.</p>
    </div>
    <div class="explain-section">
      <h3>6. Rain chart per 15 minutes</h3>
      <p>The bar chart shows the expected precipitation for the next 2 hours, in 15-minute steps. The height of each bar scales with the peak value in the window, so you can quickly see <em>when</em> a shower is expected.</p>
      <p>Grey bars mean dry. Coloured bars show the amount in millimeters. The data comes from the <code>minutely_15</code> feed from Open-Meteo.</p>
    </div>
    <div class="explain-section">
      <h3>7. Extra tips</h3>
      <p>Based on wind, temperature, UV index and <strong>live pollen data via Open-Meteo Air Quality API</strong>, extra recommendations appear:</p>
      <table class="threshold-table">
        <tr><th>Condition</th><th>Tip</th></tr>
        <tr><td>Wind over 40 km/h</td><td>Umbrella is pointless</td></tr>
        <tr><td>Wind over 25 km/h</td><td>Warning for strong wind</td></tr>
        <tr><td>Temperature below 3 °C</td><td>Scarf and gloves recommended</td></tr>
        <tr><td>Temperature below 8 °C</td><td>Scarf is nice</td></tr>
        <tr><td>UV index ≥ 7</td><td>Put on sunscreen!</td></tr>
        <tr><td>UV index ≥ 3</td><td>Protect your skin</td></tr>
        <tr><td>High pollen (live)</td><td>Current pollen concentrations (alder, birch, grasses, mugwort, ragweed, olive) in µg/m³. Pollen-specific medication recommended at high values.</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h3>8. Checklist: What to bring outside?</h3>
      <p>The checklist is <strong>always visible and prominent</strong> below the jacket advice. Items appear automatically based on weather conditions:</p>
      <table class="threshold-table">
        <tr><th>Condition</th><th>Items that appear</th></tr>
        <tr><td><strong>Always</strong></td><td>Staff pass, Visitor pass check, Phone, Route info</td></tr>
        <tr><td>UV index ≥ 3</td><td>🕶️ Sunglasses, 🧴 Sunscreen SPF50+</td></tr>
        <tr><td>UV index ≥ 7</td><td>👒 Hat/cap (very high UV)</td></tr>
        <tr><td>Rain chance ≥ 30%</td><td>☂️ Umbrella</td></tr>
        <tr><td>Rain chance ≥ 50%</td><td>🎒 Waterproof bag/backpack</td></tr>
        <tr><td>Temp ≤ 8°C</td><td>🧣 Scarf</td></tr>
        <tr><td>Temp ≤ 3°C</td><td>🧤 Gloves</td></tr>
        <tr><td>Temp &lt; 0°C</td><td>🧥 Winter coat (extra layers)</td></tr>
        <tr><td>Wind &gt; 25 km/h</td><td>💨 Sturdy jacket</td></tr>
      </table>
      <div class="callout"><strong>Saved:</strong> Checked items are saved in your browser so your progress is kept.</div>
    </div>
    <div class="explain-section">
      <h3>9. Pollen overview</h3>
      <p>The app shows <strong>live pollen concentrations</strong> in a separate block with the volume per allergen in µg/m³. This helps people with allergies see what's currently active in the air.</p>
      <table class="threshold-table">
        <tr><th>Allergen type</th><th>Threshold (high)</th><th>Note</th></tr>
        <tr><td>Alder</td><td>&gt; 20 µg/m³</td><td>Winter/spring, peak February–March</td></tr>
        <tr><td>Birch</td><td>&gt; 20 µg/m³</td><td>Spring, very allergenic, peak April</td></tr>
        <tr><td>Grasses</td><td>&gt; 50 µg/m³</td><td>Summer, large impact on allergies</td></tr>
        <tr><td>Mugwort</td><td>&gt; 10 µg/m³</td><td>Summer/autumn</td></tr>
        <tr><td>Ragweed</td><td>&gt; 10 µg/m³</td><td>Late summer/autumn, very irritating</td></tr>
        <tr><td>Olive</td><td>&gt; 20 µg/m³</td><td>Summer, mainly Southern Europe</td></tr>
      </table>
      <div class="callout"><strong>How to read:</strong> Items are sorted by <strong>current volume (highest first)</strong>. Green = low, yellow = moderate, orange = high. The indicator on the right shows percentage of the threshold.</div>
    </div>
    <div class="explain-section">
      <h3>10. Dark mode</h3>
      <p>The app automatically detects your device settings (macOS/Windows/mobile dark mode) and also switches to dark mode after sunset. Click the 🌙/☀️ button to choose between <strong>Auto</strong> (device + sun), <strong>Always Dark</strong>, or <strong>Always Light</strong>. Preference is saved.</p>
    </div>
    <div class="explain-section" style="background: var(--anwb-navy); color: white; border-color: var(--anwb-navy);">
      <h3 style="color: var(--anwb-yellow);">Disclaimer</h3>
      <p style="color: rgba(255,255,255,0.9);">This is a fun tool built by the DIGHV team. Not an official ANWB product. The thresholds are based on common sense, not meteorological research. If you get wet: not our fault.</p>
    </div>`;

  return `
    <h2>Hoe werkt dit?</h2>
    <p class="intro">Geen magie, gewoon een paar drempelwaardes op basis van live weerdata. Hieronder precies wat de tool doet.</p>
    <div class="explain-section">
      <h3>1. Databron</h3>
      <p>De tool haalt elke 10 minuten actuele weerdata op van <strong>Open-Meteo</strong> (forecast API) en live pollen-gegevens van de <strong>Open-Meteo Air Quality API</strong>. Deze APIs combineren data van diverse Europese meteorologische instituten (waaronder het KNMI).</p>
      <p>Standaardlocatie: <code>52.0964° N, 4.3268° O</code> — ANWB hoofdkantoor aan de Wassenaarseweg in Den Haag. Via de locatieknop kan de app tijdelijk je huidige coordinaten gebruiken.</p>
      <div class="callout"><strong>Live check:</strong> de tijd in de header update continu en het groene LIVE-bolletje pulseert zolang de data vers is.</div>
    </div>
    <div class="explain-section">
      <h3>2. Wat wordt er gemeten?</h3>
      <p>Voor het advies kijkt de tool naar 4 waardes, genomen voor het venster <strong>nu + 30 minuten</strong>:</p>
      <table class="threshold-table">
        <tr><th>Signaal</th><th>Gebruikt voor</th></tr>
        <tr><td>Temperatuur</td><td>Basiswaarde, laagste waarde in het venster</td></tr>
        <tr><td>Gevoelstemperatuur</td><td>Hoofdinput voor jastype (houdt rekening met wind en vocht)</td></tr>
        <tr><td>Windsnelheid</td><td>Extra tips (sjaal, paraplu zinloos bij storm)</td></tr>
        <tr><td>Neerslag en kans</td><td>Regenjas advies en paraplu-tip</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h3>3. Jastype op basis van gevoelstemperatuur</h3>
      <p>De gevoelstemperatuur (plus jouw persoonlijke offset) bepaalt welke jas wordt geadviseerd:</p>
      <table class="threshold-table">
        <tr><th>Gevoelstemperatuur</th><th>Advies</th></tr>
        <tr><td>17 °C of warmer</td><td><span class="badge-inline">Geen jas</span></td></tr>
        <tr><td>12 tot 17 °C</td><td><span class="badge-inline">Dun jasje</span> (vest of windjack)</td></tr>
        <tr><td>5 tot 12 °C</td><td><span class="badge-inline">Herfstjas</span></td></tr>
        <tr><td>0 tot 5 °C</td><td><span class="badge-inline">Winterjas</span></td></tr>
        <tr><td>onder 0 °C</td><td><span class="badge-inline">Winterjas + laagjes</span></td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h3>4. Persoonlijke voorkeur</h3>
      <p>De knop <strong>Jouw type</strong> past een offset toe op de gevoelstemperatuur:</p>
      <table class="threshold-table">
        <tr><th>Type</th><th>Offset</th><th>Effect</th></tr>
        <tr><td>Kouwelijk</td><td><code>+3 °C kou</code></td><td>Eerder een (warmere) jas</td></tr>
        <tr><td>Normaal</td><td><code>0</code></td><td>Standaard</td></tr>
        <tr><td>Warmbloedig</td><td><code>−5 °C kou</code></td><td>Veel eerder geen of dunnere jas</td></tr>
      </table>
      <div class="callout"><strong>Voorbeeld:</strong> gevoelt 14 °C + warmbloedig betekent dat de tool rekent met 19 °C. Advies wordt dan "geen jas" in plaats van "dun jasje".</div>
    </div>
    <div class="explain-section">
      <h3>5. Regenoverride</h3>
      <p>Als er binnen het venster meer dan <code>0.5 mm</code> regen valt <strong>of</strong> de regenkans ligt boven <code>70%</code>, dan wordt het advies overschreven naar een regenjas. Bij milder weer komt daar "regenjas" bij in plaats van een gewone jas.</p>
      <p>Bij een regenkans tussen <code>30%</code> en <code>70%</code> krijg je alleen een waarschuwings-tip, maar blijft het gewone jasadvies staan.</p>
    </div>
    <div class="explain-section">
      <h3>6. Regengrafiek per 15 minuten</h3>
      <p>De staafgrafiek laat de verwachte neerslag zien voor de komende 2 uur, in stappen van 15 minuten. De hoogte van elke staaf schaalt met de piekwaarde in het venster, zodat je snel ziet <em>wanneer</em> een bui verwacht wordt.</p>
      <p>Grijze staafjes betekenen droog. Gekleurde staafjes tonen de hoeveelheid in millimeter. De data komt uit de <code>minutely_15</code> feed van Open-Meteo.</p>
    </div>
    <div class="explain-section">
      <h3>7. Extra tips</h3>
      <p>Op basis van wind, temperatuur, UV-index en <strong>live pollen-data via Open-Meteo Air Quality API</strong> komen er extra aanbevelingen bij:</p>
      <table class="threshold-table">
        <tr><th>Conditie</th><th>Tip</th></tr>
        <tr><td>Wind over 40 km/u</td><td>Paraplu is kansloos</td></tr>
        <tr><td>Wind over 25 km/u</td><td>Waarschuwing voor stevige wind</td></tr>
        <tr><td>Temperatuur onder 3 °C</td><td>Sjaal en handschoenen aangeraden</td></tr>
        <tr><td>Temperatuur onder 8 °C</td><td>Sjaal is fijn</td></tr>
        <tr><td>UV-index ≥ 7</td><td>Zonnebrand smeren!</td></tr>
        <tr><td>UV-index ≥ 3</td><td>Bescherm je huid</td></tr>
        <tr><td>Hoge pollen (live)</td><td>Actuele pollen-concentraties (els, berk, grassen, bijvoet, ambrosia, olijf) in µg/m³. Pollen-specifieke medicatie aanbevolen bij hoge waarden.</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h3>8. Checklist: Wat mee naar buiten?</h3>
      <p>De checklist is <strong>altijd zichtbaar en prominent</strong> onder het jasadvies. Items verschijnen automatisch afhankelijk van weerscondities:</p>
      <table class="threshold-table">
        <tr><th>Conditie</th><th>Items die verschijnen</th></tr>
        <tr><td><strong>Altijd</strong></td><td>Personeelspas, Bezoekerspas-check, Telefoon, Route-info</td></tr>
        <tr><td>UV-index ≥ 3</td><td>🕶️ Zonnebril, 🧴 Zonnebrandcreme SPF50+</td></tr>
        <tr><td>UV-index ≥ 7</td><td>👒 Hoed/pet (zeer hoge UV)</td></tr>
        <tr><td>Regenkans ≥ 30%</td><td>☂️ Paraplu</td></tr>
        <tr><td>Regenkans ≥ 50%</td><td>🎒 Waterdichte tas/rugzak</td></tr>
        <tr><td>Temp ≤ 8°C</td><td>🧣 Sjaal</td></tr>
        <tr><td>Temp ≤ 3°C</td><td>🧤 Handschoenen</td></tr>
        <tr><td>Temp &lt; 0°C</td><td>🧥 Winterjas (extra laagjes)</td></tr>
        <tr><td>Wind &gt; 25 km/u</td><td>💨 Stevig jasje</td></tr>
      </table>
      <div class="callout"><strong>Opgeslagen:</strong> Afvinkingen worden opgeslagen in je browser zodat je voortgang behouden blijft.</div>
    </div>
    <div class="explain-section">
      <h3>9. Pollenoverzicht</h3>
      <p>De app toont <strong>live pollen-concentraties</strong> in een apart blok met per allergeensoort het volume in µg/m³. Dit helpt vooral voor mensen met allergieën om te zien wat nu actief in de lucht is.</p>
      <table class="threshold-table">
        <tr><th>Allergeensoort</th><th>Drempel (hoog)</th><th>Opmerking</th></tr>
        <tr><td>Els (Alder)</td><td>&gt; 20 µg/m³</td><td>Winter/voorjaar, peak februari-maart</td></tr>
        <tr><td>Berk (Birch)</td><td>&gt; 20 µg/m³</td><td>Voorjaar, zeer allergeen, peak april</td></tr>
        <tr><td>Grassen</td><td>&gt; 50 µg/m³</td><td>Zomer, grote impact op allergenen</td></tr>
        <tr><td>Bijvoet (Mugwort)</td><td>&gt; 10 µg/m³</td><td>Zomer/herfst</td></tr>
        <tr><td>Ragweed</td><td>&gt; 10 µg/m³</td><td>Late zomer/herfst, zeer irritant</td></tr>
        <tr><td>Olijf (Olive)</td><td>&gt; 20 µg/m³</td><td>Zomer, vooral Zuid-Europa</td></tr>
      </table>
      <div class="callout"><strong>Hoe te lezen:</strong> Items zijn gesorteerd op <strong>huidige volume (hoogste eerst)</strong>. Groen = laag, geel = matig, oranje = hoog. De indicator rechts toont percentage van de drempel.</div>
    </div>
    <div class="explain-section">
      <h3>10. Dark mode</h3>
      <p>De app detecteert automatisch je device-instellingen (macOS/Windows/mobile dark mode) en schakelt ook over naar dark mode na zonsondergang. Klik de 🌙/☀️ knop om te kiezen tussen <strong>Auto</strong> (device + zon), <strong>Altijd Donker</strong>, of <strong>Altijd Licht</strong>. Voorkeur wordt opgeslagen.</p>
    </div>
    <div class="explain-section" style="background: var(--anwb-navy); color: white; border-color: var(--anwb-navy);">
      <h3 style="color: var(--anwb-yellow);">Disclaimer</h3>
      <p style="color: rgba(255,255,255,0.9);">Dit is een fun-tool gebouwd door het DIGHV team. Geen officieel ANWB-product. De drempels zijn gebaseerd op gezond verstand, niet op meteorologisch onderzoek. Als je nat wordt: niet onze schuld.</p>
    </div>`;
}

// ─── Location helpers ────────────────────────────────────────────────────────
function sanitizeLocation(location) {
  if (!location || typeof location !== 'object') return { ...DEFAULT_LOCATION };
  const lat = Number(location.lat);
  const lon = Number(location.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ...DEFAULT_LOCATION };
  }
  const mode = location.mode === 'current' ? 'current' : 'default';
  let city = location.city || null;
  // Backward compat: extract city from old-format label
  if (!city && location.label && mode === 'current') {
    const match = location.label.match(/(?:Huidige locatie|Current location) · (.+)/);
    if (match) city = match[1];
  }
  return {
    mode,
    city: mode === 'current' ? city : null,
    label: mode === 'default' ? (location.label || DEFAULT_LOCATION.label) : null,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6))
  };
}

function getLocationLabel(location) {
  const loc = location || currentLocation;
  if (loc.mode === 'current') {
    return loc.city ? t('locationCityLabel', loc.city) : t('locationDefaultLabel');
  }
  return loc.label || DEFAULT_LOCATION.label;
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

function formatCoords(location) {
  const loc = location || currentLocation;
  return `${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}`;
}

function isDefaultLocation(location) {
  return (location || currentLocation).mode === 'default';
}

function getAmsterdamDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isDayTime(date) {
  if (!weatherData || !weatherData.daily) return true;
  const daily = weatherData.daily;
  const todayKey = getAmsterdamDateKey(date);
  const todayIndex = Array.isArray(daily.time) ? daily.time.findIndex(day => day === todayKey) : -1;
  const index = todayIndex >= 0 ? todayIndex : 0;
  const sunrise = new Date(daily.sunrise?.[index]);
  const sunset = new Date(daily.sunset?.[index]);
  if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) return true;
  return date >= sunrise && date <= sunset;
}

const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', () => {
  if (darkModeForced === 'auto') applyDarkMode();
});

function applyDarkMode() {
  let darkMode;
  if (darkModeForced === 'dark') {
    darkMode = true;
  } else if (darkModeForced === 'light') {
    darkMode = false;
  } else {
    const deviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const sunsetDark = !isDayTime(new Date());
    darkMode = deviceDark || sunsetDark;
  }
  document.body.classList.toggle('dark', darkMode);
  const btn = document.getElementById('darkModeToggle');
  if (btn) {
    if (darkModeForced === 'auto') {
      btn.textContent = darkMode ? '🌙' : '☀️';
      btn.title = t('darkAutoTitle', darkMode);
      btn.setAttribute('aria-label', t('darkAutoAria', darkMode));
    } else {
      btn.textContent = darkModeForced === 'dark' ? '🌙' : '☀️';
      btn.title = t('darkForcedTitle', darkModeForced);
      btn.setAttribute('aria-label', t('darkForcedAria', darkModeForced));
    }
  }
}
applyDarkMode();

// Safe storage wrapper
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

function renderLocationUi(message) {
  const labelEl = document.getElementById('locationLabel');
  const coords = document.getElementById('locationCoords');
  const panelCoords = document.getElementById('locationPanelCoords');
  const resetBtn = document.getElementById('resetLocationBtn');
  if (labelEl) labelEl.textContent = getLocationLabel();
  if (coords) coords.textContent = formatCoords();
  if (panelCoords) panelCoords.textContent = formatCoords();
  if (resetBtn) resetBtn.disabled = isDefaultLocation();
  if (message !== undefined) setLocationStatus(message);
}

function showWeatherLoading() {
  const verdict = document.getElementById('verdict');
  const detail = document.getElementById('detail');
  const tips = document.getElementById('tips');
  if (verdict) verdict.innerHTML = `<div class="loading"><span class="spinner"></span>${t('weatherLoading')}</div>`;
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
    setLocationStatus(t('locationNoGeo'));
    return;
  }
  setLocationButtonsDisabled(true);
  setLocationStatus(t('locationFetching'));
  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setLocationStatus(t('cityFetching'));
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=nl`)
        .then(r => r.json())
        .then(data => {
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.county || null;
          const msg = city ? t('locationActiveCity', city) : t('locationActive');
          setLocationButtonsDisabled(false);
          setAppLocation({ mode: 'current', city, lat, lon }, msg);
        })
        .catch(() => {
          setLocationButtonsDisabled(false);
          setAppLocation({ mode: 'current', city: null, lat, lon }, t('locationActive'));
        });
    },
    error => {
      setLocationButtonsDisabled(false);
      const denied = error.code === error.PERMISSION_DENIED;
      setLocationStatus(denied ? t('locationDenied') : t('locationFailed'));
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
    setAppLocation({ ...DEFAULT_LOCATION }, t('anwbHqActive'));
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

let lastUpdate = null;
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  let label = `${hh}:${mm}`;
  if (lastUpdate) {
    const mins = Math.round((now - lastUpdate) / 60000);
    if (mins < 1) label += ` · ${t('dataFresh')}`;
    else label += ` · ${t('dataAgeMin', mins)}`;
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
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code&minutely_15=precipitation,precipitation_probability&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code,uv_index&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Europe/Amsterdam&past_days=1&forecast_days=2`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen,olive_pollen&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen,olive_pollen&past_days=0&forecast_days=2`;

  try {
    const [weatherRes, airQualityRes] = await Promise.all([fetch(weatherUrl), fetch(airQualityUrl)]);
    if (requestId !== weatherRequestSeq) return;
    if (!weatherRes.ok) throw new Error('Weather network error');
    const weatherData_new = await weatherRes.json();
    if (requestId !== weatherRequestSeq) return;
    weatherData = weatherData_new;
    lastUpdate = new Date();
    updateClock();
    if (airQualityRes.ok) {
      const airQualityData = await airQualityRes.json();
      if (requestId !== weatherRequestSeq) return;
      if (airQualityData.current) {
        let tomorrowPollen = null;
        if (airQualityData.hourly?.time) {
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
          const noonIdx = airQualityData.hourly.time.findIndex(ts => ts.startsWith(tomorrowStr + 'T12'));
          if (noonIdx >= 0) {
            tomorrowPollen = {
              alder: airQualityData.hourly.alder_pollen?.[noonIdx] || 0,
              birch: airQualityData.hourly.birch_pollen?.[noonIdx] || 0,
              grass: airQualityData.hourly.grass_pollen?.[noonIdx] || 0,
              mugwort: airQualityData.hourly.mugwort_pollen?.[noonIdx] || 0,
              ragweed: airQualityData.hourly.ragweed_pollen?.[noonIdx] || 0,
              olive: airQualityData.hourly.olive_pollen?.[noonIdx] || 0,
            };
          }
        }
        pollenData = {
          alder: airQualityData.current.alder_pollen || 0,
          birch: airQualityData.current.birch_pollen || 0,
          grass: airQualityData.current.grass_pollen || 0,
          mugwort: airQualityData.current.mugwort_pollen || 0,
          ragweed: airQualityData.current.ragweed_pollen || 0,
          olive: airQualityData.current.olive_pollen || 0,
          tomorrow: tomorrowPollen,
          fetchedAt: new Date()
        };
      }
    } else {
      pollenData = null;
    }
  } catch (err) {
    if (requestId !== weatherRequestSeq) return;
    console.error('Weerdata fetch error:', err);
    document.getElementById('verdict').innerHTML = `<div class="error">${t('weatherError')}</div>`;
    return;
  }
  render();
  applyDarkMode();
}

function getPollenTip() {
  const month = new Date().getMonth() + 1;
  const seasonalData = t('pollenLevels');
  let tip = { ...(seasonalData[month] || { level: 'unknown', allergens: '--' }) };

  if (pollenData) {
    const highPollen = [];
    if (pollenData.alder > 20) highPollen.push(lang === 'en' ? 'alder' : 'els');
    if (pollenData.birch > 20) highPollen.push(lang === 'en' ? 'birch' : 'berk');
    if (pollenData.grass > 50) highPollen.push(lang === 'en' ? 'grasses' : 'grassen');
    if (pollenData.mugwort > 10) highPollen.push(lang === 'en' ? 'mugwort' : 'bijvoet');
    if (pollenData.ragweed > 10) highPollen.push('ragweed');
    if (pollenData.olive > 20) highPollen.push(lang === 'en' ? 'olive' : 'olijf');

    // Override level based on live measurements instead of seasonal hardcoding
    if (highPollen.length >= 2) {
      tip.level = lang === 'en' ? 'very high' : 'zeer hoog';
    } else if (highPollen.length === 1) {
      tip.level = lang === 'en' ? 'high' : 'hoog';
    } else {
      tip.level = lang === 'en' ? 'low' : 'laag';
    }

    const summary = highPollen.length > 0
      ? `${t('pollenHighPrefix')}${highPollen.join(', ')}`
      : t('pollenAllLow');

    const timeStr = pollenData.fetchedAt.toLocaleTimeString(t('dateLocale'), { hour: '2-digit', minute: '2-digit' });
    tip.live = `${summary} ${t('pollenMeasured', timeStr)}`;
  }

  return tip;
}

function getWeatherIcon(code, size = 'small', isDay = true) {
  const icons = {
    0:  isDay ? { small: '☀️', large: '☀️' } : { small: '🌙', large: '🌙' },
    1:  { small: '🌤️', large: '🌤️' }, 2: { small: '⛅', large: '⛅' },
    3:  { small: '☁️', large: '☁️' }, 45: { small: '🌫️', large: '🌫️' },
    48: { small: '🌫️', large: '🌫️' }, 51: { small: '🌦️', large: '🌦️' },
    53: { small: '🌦️', large: '🌦️' }, 55: { small: '🌦️', large: '🌦️' },
    61: { small: '🌧️', large: '🌧️' }, 63: { small: '🌧️', large: '🌧️' },
    65: { small: '🌧️', large: '🌧️' }, 71: { small: '❄️', large: '❄️' },
    73: { small: '❄️', large: '❄️' }, 75: { small: '❄️', large: '❄️' },
    77: { small: '❄️', large: '❄️' }, 80: { small: '🌦️', large: '🌦️' },
    81: { small: '🌦️', large: '🌦️' }, 82: { small: '🌦️', large: '🌦️' },
    85: { small: '🌨️', large: '🌨️' }, 86: { small: '🌨️', large: '🌨️' },
    95: { small: '⛈️', large: '⛈️' }, 96: { small: '⛈️', large: '⛈️' },
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
    targetHour = 12; label = t('lunchLabel');
  } else if (h < 15) {
    targetHour = 15; label = t('afternoonLabel');
  } else {
    targetHour = 12; label = t('tomorrowLunch');
  }

  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);
  if (h >= 15) target.setDate(target.getDate() + 1);

  const diffMins = Math.max(0, Math.round((target - now) / 60000));
  const dh = Math.floor(diffMins / 60);
  const dm = diffMins % 60;
  const countdownStr = diffMins === 0 ? t('countdownNow') : dh > 0 ? `${dh}u ${dm}m` : `${dm} min`;

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
      preview = `<div class="countdown-preview">${getWeatherIcon(code, 'small', isDay)} ${temp}°C · ${t('rainPreview', rain)}</div>`;
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

  const todayKey = now.toISOString().slice(0, 10);
  const todayIdx = weatherData.daily?.time?.findIndex(d => d === todayKey) ?? -1;
  let sunHtml = '';
  if (todayIdx >= 0) {
    const fmt = d => new Date(d).toLocaleTimeString(t('dateLocale'), { hour: '2-digit', minute: '2-digit' });
    const sr = weatherData.daily.sunrise?.[todayIdx];
    const ss = weatherData.daily.sunset?.[todayIdx];
    if (sr && ss) sunHtml = `<div class="sunrise-sunset">${t('sunriseLabel')} ${fmt(sr)} &nbsp;·&nbsp; ${t('sunsetLabel')} ${fmt(ss)}</div>`;
  }

  if (currentHour > BREAK_END) {
    el.innerHTML = `<div class="best-time-detail" style="color:var(--muted)">${t('bestTimeNoMore')}</div>${sunHtml}`;
    return;
  }

  const startIdx = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
  if (startIdx === -1) { el.innerHTML = `--${sunHtml}`; return; }

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
    el.innerHTML = `<div class="best-time-detail" style="color:var(--muted)">${t('bestTimePauseStart')}</div>${sunHtml}`;
    return;
  }

  const bestHour = new Date(hourly.time[bestIdx]);
  const isNow = bestHour.getHours() === currentHour && currentHour >= BREAK_START && currentHour <= BREAK_END;
  const timeStr = isNow ? t('bestTimeNow') : `${String(bestHour.getHours()).padStart(2, '0')}:00`;
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
      <div class="best-time-detail">${t('bestTimeRainDetail', temp, rain)}</div>
    </div>
    ${sunHtml}
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
    if ((minutely.precipitation[i] || 0) < 0.05) { clearIdx = i; break; }
  }

  el.style.display = 'flex';

  if (clearIdx === -1) {
    el.innerHTML = `<span class="wacht-icon">🌧️</span><span>${t('rainContinues')}</span>`;
  } else {
    const clearTime = new Date(minutely.time[clearIdx]);
    const waitMins = Math.max(1, Math.round((clearTime - now) / 60000));
    const timeStr = String(clearTime.getHours()).padStart(2, '0') + ':' + String(clearTime.getMinutes()).padStart(2, '0');
    if (waitMins <= 5) {
      el.innerHTML = `<span class="wacht-icon">🌤️</span><span>${t('rainStopsSoon')}</span>`;
    } else {
      el.innerHTML = `<span class="wacht-icon">⏱</span><span>${t('rainWait', waitMins, timeStr)}</span>`;
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

  if (!minutely || !minutely.time) { card.classList.remove('visible'); return; }

  const now = new Date();
  const startIdx = minutely.time.findIndex(t => new Date(t) >= now);
  if (startIdx === -1) { card.classList.remove('visible'); return; }

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
    return `<div class="bar-group">
      ${valueStr ? `<span class="bar-value">${valueStr}</span>` : ''}
      <div class="bar ${isDry ? 'dry' : ''}" style="height: ${heightPct}%"></div>
      <span class="bar-label">${timeStr}</span>
    </div>`;
  }).join('');

  document.getElementById('rainChart').innerHTML = html;

  if (totalRain < 0.1 && maxProb < 20) {
    document.getElementById('rainSummary').innerHTML = `
      <span style="color: var(--good); font-weight: 600;">${t('rainDry')}</span>
      <span>${t('rainPeakChance')}: <strong>${maxProb}%</strong></span>
    `;
  } else {
    document.getElementById('rainSummary').innerHTML = `
      <span>${t('rainTotal')}: <strong>${totalRain.toFixed(1)} mm</strong></span>
      <span>${t('rainPeakChance')}: <strong>${maxProb}%</strong></span>
    `;
  }
}

function windDirection(deg) {
  return t('windDirs')[Math.round(deg / 45) % 8];
}

function renderMetrics() {
  const c = weatherData.current;
  const uv = weatherData.hourly.uv_index[0] || 0;
  document.getElementById('metrics').innerHTML = `
    <div class="metric fade-in">
      <span class="metric-label">${t('metricTemp')}</span>
      <span class="metric-value">${Math.round(c.temperature_2m)}<span class="metric-unit">°C</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">${t('metricFeels')}</span>
      <span class="metric-value">${Math.round(c.apparent_temperature)}<span class="metric-unit">°C</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">${t('metricWind')}</span>
      <span class="metric-value">${Math.round(c.wind_speed_10m)}<span class="metric-unit">km/u · ${windDirection(c.wind_direction_10m ?? 0)}</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">${t('metricPrecip')}</span>
      <span class="metric-value">${c.precipitation.toFixed(1)}<span class="metric-unit">mm</span></span>
    </div>
    <div class="metric fade-in">
      <span class="metric-label">${t('metricUv')}</span>
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
    return `<div class="slot ${s.isNow ? 'now' : ''}">
      <div class="slot-time">${s.isNow ? t('forecastNow') : String(s.time.getHours()).padStart(2,'0') + ':00'}</div>
      <div class="slot-icon">${getWeatherIcon(s.weatherCode, 'small', isDay)}</div>
      <div class="slot-temp">${Math.round(s.temp)}°</div>
      <div class="slot-rain">${s.rain}%</div>
    </div>`;
  }).join('');
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
  const rainProb = Math.max(hourly.precipitation_probability[idxNow] ?? 0, hourly.precipitation_probability[idxNow + 1] ?? 0);
  const rainAmount = Math.max(hourly.precipitation[idxNow] ?? 0, hourly.precipitation[idxNow + 1] ?? 0);
  const minTemp = Math.min(...temps);
  const prefOffset = userPref === 'cold' ? 3 : userPref === 'warm' ? -5 : 0;
  const effectiveFeel = feels - prefOffset;

  let verdict, detail, jacketType;
  const tips = [];

  if (effectiveFeel >= 17) {
    verdict = t('verdictNone'); jacketType = t('jacketNone'); detail = t('detailNone');
  } else if (effectiveFeel >= 12) {
    verdict = t('verdictLight'); jacketType = t('jacketLight'); detail = t('detailLight');
  } else if (effectiveFeel >= 5) {
    verdict = t('verdictAutumn'); jacketType = t('jacketAutumn'); detail = t('detailAutumn');
  } else if (effectiveFeel >= 0) {
    verdict = t('verdictWinter'); jacketType = t('jacketWinter'); detail = t('detailWinter');
  } else {
    verdict = t('verdictFreezing'); jacketType = t('jacketFreezing'); detail = t('detailFreezing');
  }

  if (rainAmount > 0.5 || rainProb >= 70) {
    if (effectiveFeel >= 15) {
      verdict = t('verdictRain'); jacketType = t('jacketRain'); detail = t('detailRain');
    } else {
      verdict = t('verdictJacketRain'); detail += t('detailRainAppend');
    }
    tips.push({ text: t('tipUmbrella'), yellow: true });
  } else if (rainProb >= 30) {
    tips.push({ text: t('tipRainChance', rainProb), yellow: false });
  }

  if (wind >= 40) {
    tips.push({ text: t('tipStormWind'), yellow: false });
  } else if (wind >= 25) {
    tips.push({ text: t('tipStrongWind'), yellow: false });
  }

  if (minTemp <= 3) {
    tips.push({ text: t('tipScarf'), yellow: false });
    tips.push({ text: t('tipGloves'), yellow: false });
  } else if (minTemp <= 8) {
    tips.push({ text: t('tipScarfNice'), yellow: false });
  }

  const uv = weatherData.hourly.uv_index[0] || 0;
  if (uv >= 7) {
    tips.push({ text: t('tipUvHigh'), yellow: false });
  } else if (uv >= 3) {
    tips.push({ text: t('tipUvMid'), yellow: false });
  }

  const pollen = getPollenTip();
  if (pollen.level === 'very high' || pollen.level === 'zeer hoog') {
    tips.push({ text: t('tipPollenVeryHigh'), yellow: false, pollen: false });
  } else if (pollen.level === 'high' || pollen.level === 'hoog') {
    tips.push({ text: t('tipPollenHigh'), yellow: false, pollen: false });
  }

  tips.unshift({ text: jacketType, yellow: true });

  const isDay = isDayTime(new Date());
  const weatherIcon = getWeatherIcon(c.weather_code, 'large', isDay);
  document.getElementById('verdict').innerHTML = `<span class="fade-in">${verdict}</span><div class="weather-illustration">${weatherIcon}</div>`;
  document.getElementById('detail').textContent = detail;
  document.getElementById('tips').innerHTML = tips.map(tip =>
    `<span class="tip ${tip.yellow ? 'yellow' : ''} ${tip.pollen ? 'pollen' : ''}">${tip.text}</span>`
  ).join('');

  renderPollenCard();
  renderChecklist();
}

function renderPollenCard() {
  const pollenGrid = document.getElementById('pollenGrid');
  if (!pollenGrid) return;

  const pollens = [
    { name: lang === 'en' ? 'Alder' : 'Els', icon: '🌳', value: pollenData?.alder || 0, threshold: 20 },
    { name: lang === 'en' ? 'Birch' : 'Berk', icon: '🌳', value: pollenData?.birch || 0, threshold: 20 },
    { name: lang === 'en' ? 'Grasses' : 'Grassen', icon: '🌾', value: pollenData?.grass || 0, threshold: 50 },
    { name: lang === 'en' ? 'Mugwort' : 'Bijvoet', icon: '🌱', value: pollenData?.mugwort || 0, threshold: 10 },
    { name: 'Ambrosia', icon: '🌱', value: pollenData?.ragweed || 0, threshold: 10 },
    { name: lang === 'en' ? 'Olive' : 'Olijf', icon: '🌳', value: pollenData?.olive || 0, threshold: 20 },
  ];

  const withLevels = pollens.map(p => ({
    ...p,
    level: p.value > p.threshold ? 'high' : p.value > p.threshold * 0.5 ? 'medium' : 'low',
    intensity: p.value
  })).sort((a, b) => b.intensity - a.intensity);

  const tip = getPollenTip();

  let html = `<div class="pollen-info">
    <div class="pollen-level">${t('pollenLevelLabel', tip.level)}</div>
    <div class="pollen-allergens">${t('pollenSeasonLabel', tip.allergens)}</div>
  </div>`;

  html += '<div class="pollen-items">';
  withLevels.forEach(p => {
    const percentage = Math.min(100, (p.value / (p.threshold * 2)) * 100);
    html += `<div class="pollen-item ${p.level}">
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

  if (pollenData?.tomorrow) {
    const tm = pollenData.tomorrow;
    const highTomorrow = [];
    if (tm.alder > 20) highTomorrow.push(lang === 'en' ? 'alder' : 'els');
    if (tm.birch > 20) highTomorrow.push(lang === 'en' ? 'birch' : 'berk');
    if (tm.grass > 50) highTomorrow.push(lang === 'en' ? 'grasses' : 'grassen');
    if (tm.mugwort > 10) highTomorrow.push(lang === 'en' ? 'mugwort' : 'bijvoet');
    if (tm.ragweed > 10) highTomorrow.push('ragweed');
    if (tm.olive > 20) highTomorrow.push(lang === 'en' ? 'olive' : 'olijf');
    const tomorrowText = highTomorrow.length > 0
      ? `${t('pollenHighPrefix')}${highTomorrow.join(', ')}`
      : t('pollenAllLow');
    html += `<div class="pollen-tomorrow"><span class="pollen-tomorrow-label">${t('pollenTomorrow')}:</span> ${tomorrowText}</div>`;
  }

  pollenGrid.innerHTML = html;
}

function renderChecklist() {
  const items = [
    { group: 'Always', icon: '🔑', labelKey: 'checkPersPass', id: 'personeelspas' },
    { group: 'Always', icon: '🎫', labelKey: 'checkBezPass', id: 'bezoekerspas' },
    { group: 'Always', icon: '📱', labelKey: 'checkPhone', id: 'telefoon' },
    { group: 'Zon', icon: '🕶️', labelKey: 'checkSunglasses', id: 'zonnebril', condition: () => weatherData?.hourly?.uv_index?.[0] >= 3 },
    { group: 'Zon', icon: '🧴', labelKey: 'checkSunscreen', id: 'zonnebrandcreme', condition: () => weatherData?.hourly?.uv_index?.[0] >= 3 },
    { group: 'Zon', icon: '👒', labelKey: 'checkHat', id: 'hoed', condition: () => weatherData?.hourly?.uv_index?.[0] >= 7 },
    { group: 'Regen', icon: '☂️', labelKey: 'checkUmbrella', id: 'paraplu', condition: () => {
      if (!weatherData) return false;
      const hourly = weatherData.hourly; const now = new Date(); const currentHour = now.getHours();
      const idxNow = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
      return Math.max(hourly.precipitation_probability?.[idxNow] ?? 0, hourly.precipitation_probability?.[idxNow + 1] ?? 0) >= 30;
    }},
    { group: 'Regen', icon: '🎒', labelKey: 'checkWaterproof', id: 'waterdichte_tas', condition: () => {
      if (!weatherData) return false;
      const hourly = weatherData.hourly; const now = new Date(); const currentHour = now.getHours();
      const idxNow = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);
      return Math.max(hourly.precipitation_probability?.[idxNow] ?? 0, hourly.precipitation_probability?.[idxNow + 1] ?? 0) >= 50;
    }},
    { group: 'Kou', icon: '🧣', labelKey: 'checkScarf', id: 'sjaal', condition: () => weatherData?.current?.temperature_2m <= 8 },
    { group: 'Kou', icon: '🧤', labelKey: 'checkGloves', id: 'handschoenen', condition: () => weatherData?.current?.temperature_2m <= 3 },
    { group: 'Kou', icon: '🧥', labelKey: 'checkWinterJacket', id: 'winterjas_extra', condition: () => weatherData?.current?.temperature_2m < 0 },
    { group: 'Wind', icon: '💨', labelKey: 'checkWindJacket', id: 'stevig_jasje', condition: () => weatherData?.current?.wind_speed_10m > 25 },
    { group: 'Info', icon: '📍', labelKey: 'checkRoute', id: 'route_info' },
  ];

  const checklist = document.getElementById('checklist');
  if (!checklist) return;

  let checked = {};
  try { checked = JSON.parse(localStorage.getItem('dighv_checklist') || '{}'); } catch(e) {}

  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    if (!item.condition || item.condition()) grouped[item.group].push(item);
  });

  const groupKeyMap = {
    'Always': 'groupAlways', 'Zon': 'groupSun', 'Regen': 'groupRain',
    'Kou': 'groupCold', 'Wind': 'groupWind', 'Allergie': 'groupAllergie', 'Info': 'groupInfo'
  };

  let html = '';
  ['Always', 'Zon', 'Regen', 'Kou', 'Wind', 'Allergie', 'Info'].forEach(group => {
    if (!grouped[group] || grouped[group].length === 0) return;
    html += `<div class="checklist-group">
      <div class="checklist-group-title">${t(groupKeyMap[group])}</div>`;
    grouped[group].forEach(item => {
      const isChecked = checked[item.id];
      html += `<div class="checklist-item">
        <input type="checkbox" id="check_${item.id}" ${isChecked ? 'checked' : ''}>
        <label for="check_${item.id}">${t(item.labelKey)}</label>
      </div>`;
    });
    html += '</div>';
  });

  checklist.innerHTML = html;

  checklist.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.id.replace('check_', '');
      checked[id] = e.target.checked;
      try { localStorage.setItem('dighv_checklist', JSON.stringify(checked)); } catch(e) {}
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
    saveBtn.textContent = t('logSaved');
    setTimeout(() => { saveBtn.textContent = t('logSave'); }, 1800);
  });
}

function renderLogHistory() {
  const el = document.getElementById('logHistory');
  if (!el) return;
  const log = getLog();

  if (log.length === 0) {
    el.innerHTML = `<div class="log-empty">${t('logEmpty')}</div>`;
    return;
  }

  const days = {};
  log.forEach(entry => {
    const d = new Date(entry.timestamp);
    const key = d.toLocaleDateString(t('dateLocale'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!days[key]) days[key] = [];
    days[key].push(entry);
  });

  let html = '';
  for (const [day, entries] of Object.entries(days)) {
    html += `<div class="log-day-header">${day}</div>`;
    entries.forEach(entry => {
      const d = new Date(entry.timestamp);
      const time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      const peopleStr = entry.people.length === 0 ? t('logNobodyWalked') : entry.people.join(', ');
      html += `<div class="log-entry">
        <div class="log-entry-main">
          <span class="log-entry-time">${time}</span>
          <span class="log-entry-people">${peopleStr}</span>
        </div>
        <button class="log-delete-btn" data-id="${entry.id}" title="×">×</button>
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
  if (darkModeForced === 'auto') darkModeForced = 'dark';
  else if (darkModeForced === 'dark') darkModeForced = 'light';
  else darkModeForced = 'auto';
  localStorage_safe_set('dighv_dark_force', darkModeForced);
  applyDarkMode();
});

// Lang toggle
document.getElementById('langToggle')?.addEventListener('click', () => {
  setLang(lang === 'nl' ? 'en' : 'nl');
});

function renderWeatherComparison() {
  const el = document.getElementById('comparisonGrid');
  if (!el || !weatherData || !weatherData.daily) return;

  const daily = weatherData.daily;
  if (!daily.time[2]) return;

  const getData = (idx) => ({
    tempMax: daily.temperature_2m_max?.[idx],
    code: daily.weather_code?.[idx],
    rain: daily.precipitation_sum?.[idx] || 0,
    wind: daily.wind_speed_10m_max?.[idx] || 0,
    date: new Date(daily.time[idx])
  });

  const yesterday = getData(0);
  const today = getData(1);
  const tomorrow = getData(2);

  const calcScore = (day) => (day.tempMax ?? 15) - (day.rain > 0.5 ? 5 : 0) - (day.wind > 25 ? 3 : 0);
  const todayScore = calcScore(today);
  const tomorrowScore = calcScore(tomorrow);
  const yesterdayScore = calcScore(yesterday);

  el.innerHTML = `
    <div class="comparison-day">
      <div class="comparison-label">${t('yesterday')}</div>
      <div class="comparison-icon">${getWeatherIcon(yesterday.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(yesterday.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">${t('windLabel', Math.round(yesterday.wind))}</div>
      <div class="comparison-detail">${t('rainLabel', yesterday.rain.toFixed(1))}</div>
      <div class="comparison-verdict" style="opacity: 0.7;">${t('scoreLabel', Math.round(yesterdayScore))}</div>
    </div>
    <div class="comparison-day today">
      <div class="comparison-label">${t('today')}</div>
      <div class="comparison-icon">${getWeatherIcon(today.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(today.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">${t('windLabel', Math.round(today.wind))}</div>
      <div class="comparison-detail">${t('rainLabel', today.rain.toFixed(1))}</div>
      <div class="comparison-verdict">${t('scoreLabel', Math.round(todayScore))}</div>
    </div>
    <div class="comparison-day">
      <div class="comparison-label">${t('tomorrow')}</div>
      <div class="comparison-icon">${getWeatherIcon(tomorrow.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(tomorrow.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">${t('windLabel', Math.round(tomorrow.wind))}</div>
      <div class="comparison-detail">${t('rainLabel', tomorrow.rain.toFixed(1))}</div>
      <div class="comparison-verdict ${tomorrowScore > todayScore ? '' : 'worse'}">
        ${tomorrowScore > todayScore ? t('better') : t('worse')}
      </div>
    </div>
  `;
}

// Init
applyTranslations();
bindLocationControls();
fetchWeather();
setInterval(fetchWeather, 10 * 60 * 1000);
