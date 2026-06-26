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
    tabAdvice: 'Advies', tabLog: 'Looplog', tabExplain: 'Hoe werkt dit?', tabChangelog: 'Releaselog',
    h1Html: 'Jas aan of <span class="accent">niet?</span>',
    lead: 'De officieuze DIGHV pauze-scanner. Even checken voor je naar buiten loopt.',
    adviceLabel: 'Advies voor nu + 30 min',
    yourType: 'Jouw type', prefCold: 'Kouwelijk', prefNormal: 'Normaal', prefWarm: 'Warmbloedig',
    checklistTitle: '✓ Wat mee naar buiten?',
    nextBreak: 'Volgende pauze', currentConditions: 'Huidige condities',
    comingHours: 'Komende uren', bestBreakTime: 'Beste pauzetijd',
    rainPer15: 'Regen per 15 minuten', next2hours: 'komende 2 uur',
    pollenOverview: '🌸 Pollenoverzicht', todayVsTomorrow: 'Vandaag vs Morgen',
    footerHtml: 'Gebouwd door en voor <strong>DIGHV</strong> · Weerdata via Open-Meteo · Niet officieel ANWB · <span id="appVersion"></span>',
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
    darkAutoTitle: isDark => `Automatisch thema (nu ${isDark ? 'donker' : 'licht'}) — klik voor altijd ${isDark ? 'licht' : 'donker'}`,
    darkAutoAria: isDark => `Thema automatisch, nu ${isDark ? 'donker' : 'licht'}. Klik voor altijd ${isDark ? 'licht' : 'donker'}.`,
    darkForcedTitle: f => f === 'dark' ? 'Altijd donker — klik voor altijd licht' : 'Altijd licht — klik voor automatisch',
    darkForcedAria: f => f === 'dark' ? 'Altijd donker. Klik voor altijd licht.' : 'Altijd licht. Klik voor automatisch.',
    dateLocale: 'nl-NL',
  },
  en: {
    tabAdvice: 'Advice', tabLog: 'Walk log', tabExplain: 'How does this work?', tabChangelog: 'Release log',
    h1Html: 'Jacket on or <span class="accent">not?</span>',
    lead: 'The unofficial DIGHV break scanner. Check before you head outside.',
    adviceLabel: 'Advice for now + 30 min',
    yourType: 'Your type', prefCold: 'Sensitive to cold', prefNormal: 'Normal', prefWarm: 'Warm-blooded',
    checklistTitle: '✓ What to bring outside?',
    nextBreak: 'Next break', currentConditions: 'Current conditions',
    comingHours: 'Coming hours', bestBreakTime: 'Best break time',
    rainPer15: 'Rain per 15 minutes', next2hours: 'next 2 hours',
    pollenOverview: '🌸 Pollen overview', todayVsTomorrow: 'Today vs Tomorrow',
    footerHtml: 'Built by and for <strong>DIGHV</strong> · Weather data via Open-Meteo · Not official ANWB · <span id="appVersion"></span>',
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
    darkAutoTitle: isDark => `Automatic theme (now ${isDark ? 'dark' : 'light'}) — click for always ${isDark ? 'light' : 'dark'}`,
    darkAutoAria: isDark => `Theme automatic, now ${isDark ? 'dark' : 'light'}. Click for always ${isDark ? 'light' : 'dark'}.`,
    darkForcedTitle: f => f === 'dark' ? 'Always dark — click for always light' : 'Always light — click for automatic',
    darkForcedAria: f => f === 'dark' ? 'Always dark. Click for always light.' : 'Always light. Click for automatic.',
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
  if (appVersionText) setAppVersion(appVersionText);
  const explainEl = document.querySelector('.explain-content');
  if (explainEl) explainEl.innerHTML = renderExplainHtml();
  const changelogEl = document.querySelector('.changelog-content');
  if (changelogEl) changelogEl.innerHTML = renderChangelogHtml();
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.textContent = lang === 'nl' ? 'EN' : 'NL';
    langBtn.setAttribute('aria-label', lang === 'nl' ? 'Switch to English' : 'Schakel naar Nederlands');
  }
  // Translate static aria-labels that aren't visible text
  const ariaMap = lang === 'en'
    ? { prefGroup: 'Temperature preference', forecast: 'Hourly forecast', rainChart: 'Rain radar chart', liveDot: 'Live data' }
    : { prefGroup: 'Temperatuurvoorkeur', forecast: 'Uurverwachting', rainChart: 'Regenradar grafiek', liveDot: 'Live data' };
  document.querySelector('.pref-options')?.setAttribute('aria-label', ariaMap.prefGroup);
  document.getElementById('forecast')?.setAttribute('aria-label', ariaMap.forecast);
  document.getElementById('rainChart')?.setAttribute('aria-label', ariaMap.rainChart);
  document.querySelector('.weather-card .dot')?.setAttribute('aria-label', ariaMap.liveDot);
  renderLocationUi();
  renderLogHistory();
  applyDarkMode();
  if (weatherData) render();
}

let liveChangelogReleases = [];

async function fetchChangelogUpdates() {
  try {
    const res = await fetch(
      'https://api.github.com/repos/rpvos-dhg/Moetikeenjasaan.paul/commits?since=2026-05-14T00:00:00Z&per_page=100'
    );
    if (!res.ok) return;
    const commits = await res.json();
    if (!commits.length) return;

    const byDate = {};
    for (const commit of commits) {
      const isoDate = new Date(commit.commit.author.date)
        .toLocaleDateString('sv', { timeZone: 'Europe/Amsterdam' });
      if (!byDate[isoDate]) byDate[isoDate] = [];
      const subject = commit.commit.message.split('\n')[0];
      byDate[isoDate].push(subject);
    }

    liveChangelogReleases = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([isoDate, messages]) => {
        const d = new Date(isoDate + 'T12:00:00Z');
        return {
          isoDate,
          date:   d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
          dateEn: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          items: {
            nl: messages.map(msg => ({ type: 'new', text: msg })),
            en: messages.map(msg => ({ type: 'new', text: msg })),
          }
        };
      });

    const changelogEl = document.querySelector('.changelog-content');
    if (changelogEl) changelogEl.innerHTML = renderChangelogHtml();
  } catch {
    // silently ignore — changelog still shows curated history
  }
}

function renderChangelogHtml() {
  const releases = [
    {
      isoDate: '2026-05-13',
      date: '13 mei 2026',
      dateEn: 'May 13, 2026',
      items: {
        nl: [
          { type: 'fix',     text: 'Pollenbadge toonde altijd "zeer hoog" in april/mei door hardcoded maandtabel — nu gebaseerd op live meetwaarden' },
          { type: 'new',     text: 'Windrichting toegevoegd aan de windmetric (bv. ZW, NO)' },
          { type: 'new',     text: 'Pollenkaart toont nu ook de verwachte pollenwaarden voor morgen' },
          { type: 'new',     text: 'Zonsopgang en -ondergang zichtbaar in de "Beste pauzetijd"-kaart' },
          { type: 'new',     text: 'PWA-ondersteuning: app is installeerbaar als standalone app op mobiel en desktop (via browser-menu of adresbalk)' },
          { type: 'improve', text: 'Dark mode-knop toont nu het huidig thema-icoon (🌙/☀️) met een klein "A" superscript bij automatische modus — duidelijker onderscheid tussen auto en geforceerd' },
          { type: 'improve', text: 'Dark mode-tooltip beschrijft nu wat klikken zal doen, niet alleen de huidige staat' },
          { type: 'new',     text: 'Versienummer toegevoegd in de footer (automatisch oplopend op basis van commits)' },
          { type: 'security','text': 'Gevoelige bestanden verwijderd uit repository: lokaal VS Code-configuratiebestand (met Windows-gebruikersnaam) en looplog-data' },
        ],
        en: [
          { type: 'fix',     text: 'Pollen badge always showed "very high" in April/May due to hardcoded monthly table — now based on live measurements' },
          { type: 'new',     text: 'Wind direction added to wind metric (e.g. SW, NE)' },
          { type: 'new',     text: 'Pollen card now also shows tomorrow\'s expected pollen values' },
          { type: 'new',     text: 'Sunrise and sunset times visible in the "Best break time" card' },
          { type: 'new',     text: 'PWA support: app can be installed as standalone app on mobile and desktop (via browser menu or address bar)' },
          { type: 'improve', text: 'Dark mode button now shows the current theme icon (🌙/☀️) with a small "A" superscript in automatic mode — clearer distinction between auto and forced' },
          { type: 'improve', text: 'Dark mode tooltip now describes what clicking will do, not just the current state' },
          { type: 'new',     text: 'Version number added to footer (auto-increments with each commit)' },
          { type: 'security','text': 'Sensitive files removed from repository: local VS Code config (containing Windows username) and walk log data' },
        ]
      }
    },
    {
      isoDate: '2026-05-08',
      date: '8 mei 2026',
      dateEn: 'May 8, 2026',
      items: {
        nl: [
          { type: 'new',     text: 'Taalswitch NL/EN toegevoegd — volledige vertaling van de gehele interface' },
          { type: 'new',     text: 'ANWB-stijl SVG-favicon toegevoegd' },
          { type: 'new',     text: 'Stadsnaam zichtbaar in de locatiebadge bij gebruik van GPS ("Huidige locatie · Amsterdam")' },
          { type: 'improve', text: 'GPS-nauwkeurigheid verbeterd: geen gecachte positie meer, langere timeout' },
          { type: 'improve', text: 'Beste pauzetijd beperkt tot het venster 11:00–15:00' },
          { type: 'fix',     text: '"Nu meteen" verscheen ook buiten pauzetijden — opgelost' },
          { type: 'fix',     text: 'Ruimte onder advieskaart op desktop verwijderd' },
          { type: 'new',     text: 'README toegevoegd aan de repository' },
        ],
        en: [
          { type: 'new',     text: 'NL/EN language toggle added — full translation of the entire interface' },
          { type: 'new',     text: 'ANWB-style SVG favicon added' },
          { type: 'new',     text: 'City name visible in location badge when using GPS ("Current location · Amsterdam")' },
          { type: 'improve', text: 'GPS accuracy improved: no cached position, longer timeout' },
          { type: 'improve', text: 'Best break time now limited to the 11:00–15:00 window' },
          { type: 'fix',     text: '"Right now" appeared outside break hours — fixed' },
          { type: 'fix',     text: 'Gap below advice card on desktop removed' },
          { type: 'new',     text: 'README added to the repository' },
        ]
      }
    },
    {
      isoDate: '2026-05-07',
      date: '7 mei 2026',
      dateEn: 'May 7, 2026',
      items: {
        nl: [
          { type: 'improve', text: 'Desktop-layout verbeterd: pref-card styling en brede-scherm uitlijning gecorrigeerd' },
          { type: 'improve', text: 'Locatieknop en "Jouw type" naar boven verplaatst voor betere volgorde' },
          { type: 'fix',     text: 'Dark mode hero-onderstreping aangepast' },
          { type: 'fix',     text: 'Mobiel schalen en dark mode-problemen opgelost' },
        ],
        en: [
          { type: 'improve', text: 'Desktop layout improved: pref-card styling and wide-screen alignment corrected' },
          { type: 'improve', text: 'Location button and "Your type" moved up for better flow' },
          { type: 'fix',     text: 'Dark mode hero underline adjusted' },
          { type: 'fix',     text: 'Mobile scaling and dark mode issues fixed' },
        ]
      }
    },
    {
      isoDate: '2026-04-28',
      date: '28 april 2026',
      dateEn: 'April 28, 2026',
      items: {
        nl: [
          { type: 'improve', text: 'CSS opgeschoond: ongebruikte klassen verwijderd en grid geüpdatet' },
        ],
        en: [
          { type: 'improve', text: 'CSS cleanup: removed unused classes and updated grid' },
        ]
      }
    },
    {
      isoDate: '2026-04-24',
      date: '24 april 2026',
      dateEn: 'April 24, 2026',
      items: {
        nl: [
          { type: 'improve', text: 'Dark mode volgt nu apparaatinstellingen (systeem dark mode) én schakelt automatisch bij zonsondergang' },
          { type: 'new',     text: 'UV-index toegevoegd aan de weercondities en pollentips' },
          { type: 'new',     text: 'Dag/nacht weericons op basis van zonsopgang en -ondergang' },
          { type: 'fix',     text: 'Tijdberekening gecorrigeerd naar Amsterdam-tijdzone' },
          { type: 'improve', text: 'Dark mode-knop toegankelijker gemaakt (aria-labels)' },
        ],
        en: [
          { type: 'improve', text: 'Dark mode now follows device settings (system dark mode) and switches automatically at sunset' },
          { type: 'new',     text: 'UV index added to weather conditions and pollen tips' },
          { type: 'new',     text: 'Day/night weather icons based on sunrise and sunset' },
          { type: 'fix',     text: 'Time calculation corrected to Amsterdam timezone' },
          { type: 'improve', text: 'Dark mode button made more accessible (aria labels)' },
        ]
      }
    },
    {
      isoDate: '2026-04-23',
      date: '23 april 2026',
      dateEn: 'April 23, 2026',
      items: {
        nl: [
          { type: 'new',     text: 'Pollenoverzicht uitgebreid naar aparte kaart met volumebalk per allergeen (els, berk, grassen, bijvoet, ambrosia, olijf)' },
          { type: 'new',     text: '"Vandaag vs Morgen" uitgebreid naar 3-daags overzicht: gisteren, vandaag, morgen' },
          { type: 'improve', text: 'Checklist prominenter gemaakt met styling en automatische weercondities-koppeling' },
          { type: 'improve', text: 'Layout omgezet naar echt 2×2 grid met toegankelijkheidsverbeteringen' },
          { type: 'fix',     text: 'Medicatie-item verwijderd uit checklist; pollenwaarschuwingen blijven zichtbaar in het advies' },
        ],
        en: [
          { type: 'new',     text: 'Pollen overview expanded into separate card with volume bar per allergen (alder, birch, grasses, mugwort, ragweed, olive)' },
          { type: 'new',     text: '"Today vs Tomorrow" expanded to 3-day view: yesterday, today, tomorrow' },
          { type: 'improve', text: 'Checklist made more prominent with styling and automatic weather condition linking' },
          { type: 'improve', text: 'Layout converted to true 2×2 grid with accessibility improvements' },
          { type: 'fix',     text: 'Medication item removed from checklist; pollen warnings remain visible in advice' },
        ]
      }
    },
    {
      isoDate: '2026-04-22',
      date: '22 april 2026',
      dateEn: 'April 22, 2026',
      tag: 'Eerste versie',
      tagEn: 'First release',
      items: {
        nl: [
          { type: 'new', text: 'Jasadvies op basis van gevoelstemperatuur (nu + 30 min), met persoonlijke voorkeur (kouwelijk / normaal / warmbloedig)' },
          { type: 'new', text: 'Live weerdata via Open-Meteo: temperatuur, wind, neerslag, UV-index' },
          { type: 'new', text: 'Uurverwachting voor de komende uren' },
          { type: 'new', text: 'Regenradar per 15 minuten voor de komende 2 uur' },
          { type: 'new', text: 'Live pollendata via Open-Meteo Air Quality API (els, berk, grassen, bijvoet, ambrosia, olijf)' },
          { type: 'new', text: 'Beste pauzetijd: berekend op basis van temperatuur en regenkans' },
          { type: 'new', text: 'Volgende pauze: countdown naar lunch of middagpauze' },
          { type: 'new', text: 'Looplog: registreer wie er mee gaat op de wandeling, inclusief geschiedenis' },
          { type: 'new', text: 'Dark mode: automatisch op basis van systeeminstelling en zonsondergang' },
          { type: 'new', text: 'GPS-locatie: tijdelijk overschakelen naar huidige locatie' },
        ],
        en: [
          { type: 'new', text: 'Jacket advice based on feels-like temperature (now + 30 min), with personal preference (sensitive to cold / normal / warm-blooded)' },
          { type: 'new', text: 'Live weather data via Open-Meteo: temperature, wind, precipitation, UV index' },
          { type: 'new', text: 'Hourly forecast for the coming hours' },
          { type: 'new', text: 'Rain radar per 15 minutes for the next 2 hours' },
          { type: 'new', text: 'Live pollen data via Open-Meteo Air Quality API (alder, birch, grasses, mugwort, ragweed, olive)' },
          { type: 'new', text: 'Best break time: calculated based on temperature and rain probability' },
          { type: 'new', text: 'Next break: countdown to lunch or afternoon break' },
          { type: 'new', text: 'Walk log: register who joins the walk, including history' },
          { type: 'new', text: 'Dark mode: automatic based on system settings and sunset' },
          { type: 'new', text: 'GPS location: temporarily switch to current location' },
        ]
      }
    },
  ];

  const typeConfig = {
    new:      { label: lang === 'en' ? 'New'       : 'Nieuw',      cls: 'cl-new' },
    fix:      { label: 'Fix',                                      cls: 'cl-fix' },
    improve:  { label: lang === 'en' ? 'Improved'  : 'Verbeterd',  cls: 'cl-improve' },
    security: { label: 'Security',                                 cls: 'cl-security' },
  };

  const today = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Amsterdam' });
  const allReleases = [...liveChangelogReleases, ...releases];

  const title = lang === 'en' ? 'Release log' : 'Releaselog';
  const intro = lang === 'en'
    ? 'An overview of all changes, grouped by release date.'
    : 'Een overzicht van alle wijzigingen, gegroepeerd per releasedatum.';

  let html = `<h2>${title}</h2><p class="intro">${intro}</p>`;

  for (const release of allReleases) {
    const date = lang === 'en' ? release.dateEn : release.date;
    const isToday = release.isoDate === today;
    const todayTag = isToday ? (lang === 'en' ? 'Today' : 'Vandaag') : null;
    const staticTag = lang === 'en' ? release.tagEn : release.tag;
    const tag = todayTag || staticTag;
    const items = lang === 'en' ? release.items.en : release.items.nl;

    html += `<div class="cl-release">
      <div class="cl-header">
        <span class="cl-date">${date}</span>
        ${tag ? `<span class="cl-tag">${tag}</span>` : ''}
      </div>
      <ul class="cl-items">`;

    for (const item of items) {
      const cfg = typeConfig[item.type] || typeConfig.new;
      html += `<li class="cl-item">
        <span class="cl-badge ${cfg.cls}">${cfg.label}</span>
        <span class="cl-text">${item.text}</span>
      </li>`;
    }

    html += `</ul></div>`;
  }

  return html;
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
      btn.classList.add('dark-mode-auto');
      btn.title = t('darkAutoTitle', darkMode);
      btn.setAttribute('aria-label', t('darkAutoAria', darkMode));
    } else {
      btn.textContent = darkModeForced === 'dark' ? '🌙' : '☀️';
      btn.classList.remove('dark-mode-auto');
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
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    if (target === 'advice') {
      document.getElementById('view-advice-wrap').classList.add('active');
    } else if (target === 'log') {
      document.getElementById('view-log').classList.add('active');
      initLogTab();
      renderLogHistory();
      updateLogTime();
    } else if (target === 'changelog') {
      document.getElementById('view-changelog').classList.add('active');
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
function isContinentalEurope(lat, lon) {
  return (
    lat >= 35.0 &&
    lat <= 71.5 &&
    lon >= -10.5 &&
    lon <= 40.0
  );
}

function buildAirQualityUrl(lat, lon) {
  const isEurope = isContinentalEurope(lat, lon);

  const baseFields = [
    'european_aqi',
    'pm10',
    'pm2_5',
    'uv_index'
  ];

  const pollenFields = [
    'grass_pollen',
    'birch_pollen',
    'alder_pollen',
    'mugwort_pollen',
    'ragweed_pollen',
    'olive_pollen'
  ];

  const fields = isEurope
    ? [...baseFields, ...pollenFields]
    : baseFields;

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: fields.join(','),
    hourly: fields.join(','),
    forecast_days: isEurope ? '4' : '5',
    timezone: 'auto',
    domains: isEurope ? 'cams_europe' : 'auto'
  });

  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
}
async function fetchWeather() {
  const requestId = ++weatherRequestSeq;
  const { lat, lon } = currentLocation;
  const isNetherlands =
  lat >= 50.7 && lat <= 53.7 &&
  lon >= 3.2 && lon <= 7.3;

const modelParam = isNetherlands
  ? '&models=knmi_harmonie_arome_netherlands'
  : '';

// The KNMI Harmonie model forced for NL locations does not output uv_index
// (it comes back as a null array), so we drop uv_index from the KNMI request
// and fetch it separately from the default model below. Non-NL requests have
// no model forced, so uv_index is included directly.
const hourlyVars = 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m'
  + (modelParam ? '' : ',uv_index');

const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${modelParam}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&minutely_15=precipitation&hourly=${hourlyVars}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max&past_days=1&forecast_days=3&timezone=auto`;
// Supplementary UV request on the default model, aligned to the same time grid.
const uvUrl = modelParam
  ? `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index&past_days=1&forecast_days=3&timezone=auto`
  : null;
const airQualityUrl = buildAirQualityUrl(lat, lon);
  try {
    const [weatherRes, airQualityRes, uvRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airQualityUrl),
      uvUrl ? fetch(uvUrl) : Promise.resolve(null)
    ]);
    if (requestId !== weatherRequestSeq) return;
    if (!weatherRes.ok) throw new Error('Weather network error');
    const weatherData_new = await weatherRes.json();
    if (requestId !== weatherRequestSeq) return;
    // Merge UV from the supplementary default-model request (NL only). Aligning
    // by timestamp keeps it correct even if the two time grids ever differ.
    if (uvRes && uvRes.ok && weatherData_new.hourly?.time) {
      try {
        const uvJson = await uvRes.json();
        if (requestId !== weatherRequestSeq) return;
        const uvTimes = uvJson?.hourly?.time;
        const uvVals = uvJson?.hourly?.uv_index;
        if (uvTimes && uvVals) {
          const uvByTime = new Map();
          for (let i = 0; i < uvTimes.length; i++) uvByTime.set(uvTimes[i], uvVals[i]);
          weatherData_new.hourly.uv_index = weatherData_new.hourly.time.map(
            ts => (uvByTime.has(ts) ? uvByTime.get(ts) : null)
          );
        }
      } catch (_) { /* leave uv_index absent; renderers fall back to 0 */ }
    }
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

// Index of the hourly slot that contains "now" (the most recent slot whose
// timestamp is <= now). Robust against past_days padding the array with
// yesterday's hours, unlike a plain getHours() match.
function hourlyNowIndex() {
  const times = weatherData?.hourly?.time;
  if (!times) return -1;
  const now = new Date();
  let idx = -1;
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]) <= now) idx = i; else break;
  }
  return idx;
}

// First hourly index at or after "now" whose local hour matches targetHour.
function hourlyIndexAtHour(targetHour) {
  const times = weatherData?.hourly?.time;
  if (!times) return -1;
  const start = Math.max(0, hourlyNowIndex());
  for (let i = start; i < times.length; i++) {
    if (new Date(times[i]).getHours() === targetHour) return i;
  }
  return -1;
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
    const idx = hourlyIndexAtHour(targetHour);
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

  const todayKey = getAmsterdamDateKey(now);
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

  const startIdx = hourlyNowIndex();
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
  const idxNow = hourlyNowIndex();
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
  // minutely_15 carries no probability, so derive the peak chance from the
  // hourly feed across the window the chart covers (~current hour + next 2h).
  const hourlyProb = weatherData.hourly?.precipitation_probability || [];
  const probStart = Math.max(0, hourlyNowIndex());
  const windowProb = [0, 1, 2].map(o => hourlyProb[probStart + o] ?? 0);
  const minutelyProb = slots.map(s => s.prob);
  const maxProb = Math.max(0, ...windowProb, ...minutelyProb);
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
  const uv = weatherData.hourly.uv_index?.[hourlyNowIndex()] ?? 0;
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
  const startIdx = hourlyNowIndex();
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
  const idxNow = hourlyNowIndex();

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

  const uv = weatherData.hourly.uv_index?.[idxNow] ?? 0;
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
  const nowIdx = hourlyNowIndex();
  const uvNow = weatherData?.hourly?.uv_index?.[nowIdx] ?? 0;
  const hp = weatherData?.hourly?.precipitation_probability;
  const rainProbNow = Math.max(hp?.[nowIdx] ?? 0, hp?.[nowIdx + 1] ?? 0);

  const items = [
    { group: 'Always', icon: '🔑', labelKey: 'checkPersPass', id: 'personeelspas' },
    { group: 'Always', icon: '🎫', labelKey: 'checkBezPass', id: 'bezoekerspas' },
    { group: 'Always', icon: '📱', labelKey: 'checkPhone', id: 'telefoon' },
    { group: 'Zon', icon: '🕶️', labelKey: 'checkSunglasses', id: 'zonnebril', condition: () => uvNow >= 3 },
    { group: 'Zon', icon: '🧴', labelKey: 'checkSunscreen', id: 'zonnebrandcreme', condition: () => uvNow >= 3 },
    { group: 'Zon', icon: '👒', labelKey: 'checkHat', id: 'hoed', condition: () => uvNow >= 7 },
    { group: 'Regen', icon: '☂️', labelKey: 'checkUmbrella', id: 'paraplu', condition: () => rainProbNow >= 30 },
    { group: 'Regen', icon: '🎒', labelKey: 'checkWaterproof', id: 'waterdichte_tas', condition: () => rainProbNow >= 50 },
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
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      if (selectedWalkers.has(name)) {
        selectedWalkers.delete(name);
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      } else {
        selectedWalkers.add(name);
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
    });
    grid.appendChild(btn);
  });

  document.getElementById('logClearBtn').addEventListener('click', () => {
    selectedWalkers.clear();
    grid.querySelectorAll('.walker-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
  });

  document.getElementById('logSaveBtn').addEventListener('click', () => {
    const log = getLog();
    log.unshift({ id: Date.now(), timestamp: new Date().toISOString(), people: [...selectedWalkers] });
    saveLog(log);
    selectedWalkers.clear();
    grid.querySelectorAll('.walker-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
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
  btn.setAttribute('aria-pressed', String(btn.dataset.pref === userPref));
  if (btn.dataset.pref === userPref) {
    document.querySelectorAll('.pref-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pref-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    userPref = btn.dataset.pref;
    localStorage_safe_set('dighv_pref', userPref);
    if (weatherData) renderAdvice();
  });
});

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
  if (darkModeForced === 'auto') {
    // Toggle to the opposite of the current auto state
    const currentlyDark = document.body.classList.contains('dark');
    darkModeForced = currentlyDark ? 'light' : 'dark';
  } else if (darkModeForced === 'dark') {
    darkModeForced = 'light';
  } else {
    darkModeForced = 'auto';
  }
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

let appVersionText = '';
function setAppVersion(text) {
  appVersionText = text;
  document.querySelectorAll('#appVersion').forEach(el => el.textContent = text);
}

async function fetchAppVersion() {
  try {
    const res = await fetch(
      'https://api.github.com/repos/rpvos-dhg/Moetikeenjasaan.paul/commits?per_page=1'
    );
    if (!res.ok) return;
    // GitHub returns total commit count in the Link header rel="last" page number
    const link = res.headers.get('Link') || '';
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
    const count = match ? parseInt(match[1]) : null;
    if (count) setAppVersion(`Versie 1.${count}`);
  } catch {
    // silently ignore — version is non-critical
  }
}

// Init
applyTranslations();
bindLocationControls();
fetchWeather();
fetchAppVersion();
fetchChangelogUpdates();
setInterval(fetchWeather, 10 * 60 * 1000);
