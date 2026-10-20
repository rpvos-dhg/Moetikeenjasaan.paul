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
    pollenOverview: '🌸 Pollenoverzicht', todayVsTomorrow: 'Gisteren · vandaag · morgen',
    footerHtml: 'Gebouwd door en voor <strong>DIGHV</strong> · Weerdata via Open-Meteo · Geen officieel ANWB-product<span id="appVersion"></span>',
    pageTitle: 'Jas of geen jas? | DIGHV Pauze-advies',
    editLocation: 'Locatie wijzigen',
    versionLabel: n => `Versie 1.${n}`,
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
    weatherLoading: 'Weer ophalen...', weatherError: 'Kon weerdata niet ophalen.', retry: 'Opnieuw proberen',
    dataFresh: 'net bijgewerkt', dataAgeMin: mins => `${mins} min geleden bijgewerkt`,
    dataAgeHours: h => `${h} uur geleden bijgewerkt`,
    staleBadge: 'NIET LIVE', staleNote: ts => `Geen verse data. Dit advies is van ${ts}.`,
    feelsLine: f => `Voelt als ${f} °C`, feelsForYou: f => ` · voor jou ${f} °C`,
    verdictNone: 'Geen jas nodig', jacketNone: 'Lekker zo',
    detailNone: 'Het is aangenaam warm. Perfect voor een rondje buiten.',
    verdictLight: 'Dun jasje', jacketLight: 'Vest of windjack',
    detailLight: 'Mild, maar niet zomers. Een dunne laag houdt je comfortabel.',
    verdictAutumn: 'Jas aan', jacketAutumn: 'Herfstjas',
    detailAutumn: 'Fris weer. Een gewone jas is prima voor een korte wandeling.',
    verdictWinter: 'Dikke jas', jacketWinter: 'Winterjas',
    detailWinter: 'Koud. Trek iets warms aan voordat je naar buiten stapt.',
    verdictFreezing: 'Dikke jas + laagjes', jacketFreezing: 'Winterjas + laagjes',
    detailFreezing: 'Echt koud. Een goede winterjas is geen overbodige luxe.',
    verdictRain: 'Regenjas', jacketRain: 'Regenjas',
    detailRain: 'Het is warm genoeg, maar er komt regen. Pak iets waterdichts.',
    verdictJacketRain: 'Waterdichte jas',
    detailRainAppend: ' Er is flinke kans op regen, dus waterdicht aanbevolen.',
    verdictSnow: 'Dikke jas, sneeuw', detailSnowAppend: ' Er valt sneeuw: let op gladheid.',
    verdictStorm: 'Blijf liever binnen',
    detailThunder: 'Onweer in de buurt. Wacht met je wandeling tot het over is.',
    detailStorm: 'Zware wind. Een rondje buiten is nu geen pretje; wacht op een rustiger moment.',
    tipUmbrella: '☂ Paraplu mee', tipRainGear: '🧥 Capuchon of regenjas',
    tipRainChance: prob => `${prob}% kans op regen`,
    tipStormWind: '💨 Harde wind, paraplu kansloos', tipStrongWind: 'Stevige wind',
    tipScarf: '🧣 Sjaal aanraden', tipGloves: '🧤 Handschoenen', tipScarfNice: 'Sjaal is fijn',
    tipUvHigh: '🧴 Hoge UV: zonnebrand smeren!', tipUvMid: 'Matige UV: smeer je in',
    tipPollenVeryHigh: '🌸 Veel pollen. Hooikoorts? Neem je medicatie mee.',
    tipPollenHigh: '🌸 Verhoogde pollen, let op bij hooikoorts',
    rainContinues: 'Blijft de komende 2 uur regenen',
    rainStopsSoon: 'Stopt zo dadelijk — wacht even',
    rainWait: (mins, ts) => `Wacht ~${mins} min — droog rond <strong>${ts}</strong>`,
    rainDry: '✓ Droog de komende 2 uur', rainPeakChance: 'Grootste kans', rainTotal: 'Totaal',
    rainChartAria: (list, total) => `Regen komende 2 uur: ${list}. Totaal ${total} mm.`,
    rainChartAriaDry: 'Regen komende 2 uur: droog.',
    rainChanceSr: 'kans op regen', unitKmh: 'km/u',
    metricTemp: 'Temperatuur', metricFeels: 'Gevoelstemp.', metricWind: 'Wind',
    metricPrecip: 'Neerslag', metricUv: 'UV-index',
    windDirs: ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'],
    pollenTomorrow: 'Morgen', sunriseLabel: '🌅', sunsetLabel: '🌇',
    forecastNow: 'NU',
    lunchLabel: 'Lunch', afternoonLabel: 'Middagpauze', tomorrowLunch: 'Morgen lunch',
    dayLunch: day => `${day.charAt(0).toUpperCase()}${day.slice(1)} lunch`,
    countdownNow: 'Nu!', rainPreview: rain => `${rain}% regen`,
    durationHM: (h, m) => `${h} u ${m} min`, durationM: m => `${m} min`,
    durationDH: (d, h) => `${d} ${d === 1 ? 'dag' : 'dagen'} ${h} u`,
    bestTimeNow: 'Nu meteen',
    bestTimeRainDetail: (temp, rain) => `${temp}°C · ${rain}% kans op regen`,
    bestTimePauseStart: 'Pauzetijden starten om 11:00',
    bestTimeNoMore: 'Geen pauzetijden meer vandaag',
    yesterday: 'Gisteren', today: 'Vandaag', tomorrow: 'Morgen',
    better: '✓ Beter!', worse: '✗ Minder goed', similar: '≈ Vergelijkbaar',
    scoreLabel: s => `Score: ${s}`, windLabel: w => `Wind: ${w} km/u`,
    rainLabel: r => `Regen: ${r} mm`,
    logTitle: 'Wie gaat er mee?', logNobody: 'Wis selectie', logSave: 'Opslaan',
    logLocalNote: 'Wordt alleen op dit toestel bewaard. Collega\'s zien dit niet.',
    logDeleteAria: (time, people) => `Verwijder pauze van ${time}${people ? ` (${people})` : ''}`,
    logSaved: '✓ Opgeslagen', logEmpty: 'Nog geen pauzes geregistreerd.',
    logNobodyWalked: '<em>Niemand meegelopen</em>',
    pollenLevelLabel: lvl => `Niveau: <strong>${lvl.toUpperCase()}</strong>`,
    pollenSeasonLabel: a => `Seizoen: <strong>${a}</strong>`,
    pollenHighPrefix: 'Hoog: ', pollenAllLow: 'Alle pollen laag',
    pollenUnavailable: 'Pollendata is nu niet beschikbaar.', pollenUnit: 'korrels/m³',
    pollenItemLevel: { medium: 'matig', high: 'hoog' },
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
    checkPhone: 'Telefoon', checkSunglasses: 'Zonnebril (UV 3+)',
    checkSunscreen: 'Zonnebrandcrème SPF50+', checkHat: 'Pet of hoed (UV 7+)',
    checkUmbrella: 'Paraplu', checkRainGear: 'Regenjas met capuchon (te veel wind voor een paraplu)',
    checkWaterproof: 'Waterdichte tas/rugzak',
    checkScarf: 'Sjaal', checkGloves: 'Handschoenen',
    checkWinterJacket: 'Winterjas (< 0°C)', checkWindJacket: 'Stevig jasje (veel wind)',
    checkRoute: 'Route: bij bezoekerspas → rotonde naar buiten',
    themeBtnLabel: (mode, isDark, next) => {
      const names = { auto: 'automatisch', dark: 'altijd donker', light: 'altijd licht' };
      const now = mode === 'auto' ? `automatisch (nu ${isDark ? 'donker' : 'licht'})` : names[mode];
      return `Thema: ${now}. Klik voor ${names[next]}.`;
    },
    tourBtnTitle: 'Rondleiding (opnieuw) bekijken',
    tourSkip: 'Overslaan', tourPrev: 'Vorige', tourNext: 'Volgende',
    tourDone: 'Klaar!', tourClose: 'Rondleiding sluiten',
    tourStepOf: (a, b) => `Stap ${a} van ${b}`,
    tourWelcomeTitle: '👋 Welkom bij Pauze-advies!',
    tourWelcomeText: 'Deze app vertelt je of je een jas nodig hebt voor je pauzewandeling. In een halve minuut lopen we alle functies langs. Liever meteen aan de slag? Klik op "Overslaan" — deze rondleiding verschijnt dan niet meer.',
    tourAdviceTitle: '🧥 Het advies',
    tourAdviceText: 'De kern van de app: het jasadvies voor nu + 30 minuten, op basis van live weerdata. Eronder verschijnen tips, zoals "paraplu mee" of een pollenwaarschuwing.',
    tourPrefTitle: '🌡️ Jouw type',
    tourPrefText: 'Snel koud? Kies "Kouwelijk". Altijd warm? Kies "Warmbloedig". Het advies past zich aan jouw temperatuurgevoel aan en je keuze wordt onthouden.',
    tourChecklistTitle: '✓ Wat mee naar buiten?',
    tourChecklistText: 'Een slimme checklist die meebeweegt met het weer: pasjes, paraplu, zonnebrand, sjaal... Vink af wat je hebt gepakt.',
    tourLocationTitle: '📍 Locatie',
    tourLocationText: 'Standaard kijkt de app naar het weer bij het ANWB HQ in Den Haag. Klik op het potloodje om je huidige locatie te gebruiken.',
    tourLunchTitle: '⏰ Volgende pauze',
    tourLunchText: 'Aftellen tot de volgende pauze (lunch of middagpauze), inclusief het verwachte weer op dat moment.',
    tourConditionsTitle: '🌤️ Huidige condities',
    tourConditionsText: 'Live metingen: temperatuur, gevoelstemperatuur, wind, neerslag en UV-index. De data ververst elke 10 minuten automatisch.',
    tourForecastTitle: '🕐 Komende uren',
    tourForecastText: 'De uurverwachting voor de rest van de dag, met temperatuur, weerbeeld en regenkans per uur.',
    tourBestTimeTitle: '🎯 Beste pauzetijd',
    tourBestTimeText: 'De app rekent uit op welk moment tussen 11:00 en 15:00 het weer het beste is voor een rondje buiten.',
    tourRainTitle: '🌧️ Regen per 15 minuten',
    tourRainText: 'De regenverwachting voor de komende 2 uur in blokken van 15 minuten. Zo zie je precies of je even moet wachten op een droog moment.',
    tourPollenTitle: '🌸 Pollenoverzicht',
    tourPollenText: 'Voor de hooikoortsers: actuele pollenniveaus per soort, plus de verwachting voor morgen.',
    tourComparisonTitle: '📊 Vandaag vs Morgen',
    tourComparisonText: 'Is het morgen beter wandelweer dan vandaag? Hier zie je het in één oogopslag.',
    tourTabsTitle: '🗂️ Meer tabbladen',
    tourTabsText: 'In het Looplog houd je bij wie er meeliep. Bij "Hoe werkt dit?" lees je hoe het advies tot stand komt, en in het Releaselog zie je wat er nieuw is.',
    tourHeaderTitle: '⚙️ Taal & thema',
    tourHeaderText: 'Wissel hier tussen Nederlands en Engels en zet dark mode aan of uit. Via de ?-knop kun je deze rondleiding altijd opnieuw bekijken. Veel wandelplezier!',
    dateLocale: 'nl-NL',
  },
  en: {
    tabAdvice: 'Advice', tabLog: 'Walk log', tabExplain: 'How it works', tabChangelog: 'Release log',
    h1Html: 'Jacket on or <span class="accent">not?</span>',
    lead: 'The unofficial DIGHV break scanner. Check before you head outside.',
    adviceLabel: 'Advice for now + 30 min',
    yourType: 'Your type', prefCold: 'I feel the cold', prefNormal: 'Normal', prefWarm: 'I run warm',
    checklistTitle: '✓ What to bring outside?',
    nextBreak: 'Next break', currentConditions: 'Current conditions',
    comingHours: 'Coming hours', bestBreakTime: 'Best break time',
    rainPer15: 'Rain per 15 minutes', next2hours: 'next 2 hours',
    pollenOverview: '🌸 Pollen overview', todayVsTomorrow: 'Yesterday · today · tomorrow',
    footerHtml: 'Built by and for <strong>DIGHV</strong> · Weather data via Open-Meteo · Not an official ANWB product<span id="appVersion"></span>',
    pageTitle: 'Jacket or no jacket? | DIGHV Break advice',
    editLocation: 'Change location',
    versionLabel: n => `Version 1.${n}`,
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
    weatherLoading: 'Getting weather...', weatherError: 'Could not fetch weather data.', retry: 'Try again',
    dataFresh: 'just updated', dataAgeMin: mins => `updated ${mins} min ago`,
    dataAgeHours: h => `updated ${h} h ago`,
    staleBadge: 'NOT LIVE', staleNote: ts => `No fresh data. This advice is from ${ts}.`,
    feelsLine: f => `Feels like ${f} °C`, feelsForYou: f => ` · for you ${f} °C`,
    verdictNone: 'No jacket needed', jacketNone: 'Enjoy the weather',
    detailNone: "It's pleasantly warm. Perfect for a walk outside.",
    verdictLight: 'Light jacket', jacketLight: 'Cardigan or windbreaker',
    detailLight: 'Mild, but not summery. A thin layer will keep you comfortable.',
    verdictAutumn: 'Jacket on', jacketAutumn: 'Autumn jacket',
    detailAutumn: 'Chilly out there. A regular jacket works fine for a short walk.',
    verdictWinter: 'Thick jacket', jacketWinter: 'Winter coat',
    detailWinter: 'Cold. Put on something warm before you step outside.',
    verdictFreezing: 'Thick jacket + layers', jacketFreezing: 'Winter coat + layers',
    detailFreezing: "Properly freezing. A good winter coat is not a luxury — it's a necessity.",
    verdictRain: 'Rain jacket', jacketRain: 'Rain jacket',
    detailRain: 'Warm enough, but rain is coming. Grab something waterproof.',
    verdictJacketRain: 'Waterproof jacket',
    detailRainAppend: " There's a good chance of rain, so waterproof is recommended.",
    verdictSnow: 'Warm coat, snow', detailSnowAppend: ' Snow is falling: watch out for slippery paths.',
    verdictStorm: 'Better stay inside',
    detailThunder: 'Thunderstorm nearby. Wait with your walk until it has passed.',
    detailStorm: 'Gale-force wind. A walk is no fun right now; wait for a calmer moment.',
    tipUmbrella: '☂ Bring an umbrella', tipRainGear: '🧥 Hood or rain jacket',
    tipRainChance: prob => `${prob}% chance of rain`,
    tipStormWind: '💨 Strong wind, umbrella is pointless', tipStrongWind: 'Strong wind',
    tipScarf: '🧣 Scarf recommended', tipGloves: '🧤 Gloves', tipScarfNice: 'Scarf is a good idea',
    tipUvHigh: '🧴 High UV: put on sunscreen!', tipUvMid: 'Moderate UV: use sunscreen',
    tipPollenVeryHigh: '🌸 Very high pollen. Hay fever? Bring your medication.',
    tipPollenHigh: '🌸 Raised pollen, take care if you have hay fever',
    rainContinues: 'Rain continues for the next 2 hours',
    rainStopsSoon: 'Stops in a moment — just wait',
    rainWait: (mins, ts) => `Wait ~${mins} min — dry around <strong>${ts}</strong>`,
    rainDry: '✓ Dry for the next 2 hours', rainPeakChance: 'Highest chance', rainTotal: 'Total',
    rainChartAria: (list, total) => `Rain in the next 2 hours: ${list}. Total ${total} mm.`,
    rainChartAriaDry: 'Rain in the next 2 hours: dry.',
    rainChanceSr: 'chance of rain', unitKmh: 'km/h',
    metricTemp: 'Temperature', metricFeels: 'Feels like', metricWind: 'Wind',
    metricPrecip: 'Precipitation', metricUv: 'UV index',
    windDirs: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    pollenTomorrow: 'Tomorrow', sunriseLabel: '🌅', sunsetLabel: '🌇',
    forecastNow: 'NOW',
    lunchLabel: 'Lunch', afternoonLabel: 'Afternoon break', tomorrowLunch: "Tomorrow's lunch",
    dayLunch: day => `${day} lunch`,
    countdownNow: 'Now!', rainPreview: rain => `${rain}% rain`,
    durationHM: (h, m) => `${h}h ${m}m`, durationM: m => `${m} min`,
    durationDH: (d, h) => `${d}d ${h}h`,
    bestTimeNow: 'Right now',
    bestTimeRainDetail: (temp, rain) => `${temp}°C · ${rain}% chance of rain`,
    bestTimePauseStart: 'Break times start at 11:00',
    bestTimeNoMore: 'No more break times today',
    yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow',
    better: '✓ Better!', worse: '✗ Not as good', similar: '≈ Similar',
    scoreLabel: s => `Score: ${s}`, windLabel: w => `Wind: ${w} km/h`,
    rainLabel: r => `Rain: ${r} mm`,
    logTitle: "Who's coming along?", logNobody: 'Clear selection', logSave: 'Save',
    logLocalNote: 'Only stored on this device. Colleagues cannot see it.',
    logDeleteAria: (time, people) => `Delete break at ${time}${people ? ` (${people})` : ''}`,
    logSaved: '✓ Saved', logEmpty: 'No breaks logged yet.',
    logNobodyWalked: '<em>Nobody came along</em>',
    pollenLevelLabel: lvl => `Level: <strong>${lvl.toUpperCase()}</strong>`,
    pollenSeasonLabel: a => `Season: <strong>${a}</strong>`,
    pollenHighPrefix: 'High: ', pollenAllLow: 'All pollen low',
    pollenUnavailable: 'Pollen data is not available right now.', pollenUnit: 'grains/m³',
    pollenItemLevel: { medium: 'moderate', high: 'high' },
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
    checkPhone: 'Phone', checkSunglasses: 'Sunglasses (UV 3+)',
    checkSunscreen: 'Sunscreen SPF50+', checkHat: 'Cap or hat (UV 7+)',
    checkUmbrella: 'Umbrella', checkRainGear: 'Rain jacket with hood (too windy for an umbrella)',
    checkWaterproof: 'Waterproof bag/backpack',
    checkScarf: 'Scarf', checkGloves: 'Gloves',
    checkWinterJacket: 'Winter coat (< 0°C)', checkWindJacket: 'Sturdy jacket (strong wind)',
    checkRoute: 'Route: with visitor pass → roundabout to exit',
    themeBtnLabel: (mode, isDark, next) => {
      const names = { auto: 'automatic', dark: 'always dark', light: 'always light' };
      const now = mode === 'auto' ? `automatic (now ${isDark ? 'dark' : 'light'})` : names[mode];
      return `Theme: ${now}. Click for ${names[next]}.`;
    },
    tourBtnTitle: 'View the tour (again)',
    tourSkip: 'Skip', tourPrev: 'Back', tourNext: 'Next',
    tourDone: 'Done!', tourClose: 'Close tour',
    tourStepOf: (a, b) => `Step ${a} of ${b}`,
    tourWelcomeTitle: '👋 Welcome to Pauze-advies!',
    tourWelcomeText: 'This app tells you whether you need a jacket for your break walk. In half a minute we\'ll walk through every feature. Rather dive right in? Click "Skip" — this tour won\'t appear again.',
    tourAdviceTitle: '🧥 The advice',
    tourAdviceText: 'The heart of the app: the jacket advice for now + 30 minutes, based on live weather data. Below it you\'ll find tips, such as "bring an umbrella" or a pollen warning.',
    tourPrefTitle: '🌡️ Your type',
    tourPrefText: 'Cold easily? Pick "Sensitive to cold". Always warm? Pick "Warm-blooded". The advice adapts to how you experience temperature, and your choice is remembered.',
    tourChecklistTitle: '✓ What to bring outside?',
    tourChecklistText: 'A smart checklist that adapts to the weather: passes, umbrella, sunscreen, scarf... Tick off what you\'ve packed.',
    tourLocationTitle: '📍 Location',
    tourLocationText: 'By default the app checks the weather at ANWB HQ in The Hague. Click the pencil to use your current location.',
    tourLunchTitle: '⏰ Next break',
    tourLunchText: 'Counts down to the next break (lunch or afternoon break), including the expected weather at that time.',
    tourConditionsTitle: '🌤️ Current conditions',
    tourConditionsText: 'Live readings: temperature, feels-like, wind, precipitation and UV index. The data refreshes automatically every 10 minutes.',
    tourForecastTitle: '🕐 Coming hours',
    tourForecastText: 'The hourly forecast for the rest of the day, with temperature, conditions and chance of rain per hour.',
    tourBestTimeTitle: '🎯 Best break time',
    tourBestTimeText: 'The app works out when the weather is at its best between 11:00 and 15:00 for a walk outside.',
    tourRainTitle: '🌧️ Rain per 15 minutes',
    tourRainText: 'The rain forecast for the next 2 hours in 15-minute blocks, so you can see exactly whether to wait for a dry window.',
    tourPollenTitle: '🌸 Pollen overview',
    tourPollenText: 'For the hay fever crowd: current pollen levels per type, plus tomorrow\'s outlook.',
    tourComparisonTitle: '📊 Today vs Tomorrow',
    tourComparisonText: 'Is tomorrow better walking weather than today? See it at a glance here.',
    tourTabsTitle: '🗂️ More tabs',
    tourTabsText: 'The Walk log tracks who came along. "How does this work?" explains how the advice is calculated, and the Release log shows what\'s new.',
    tourHeaderTitle: '⚙️ Language & theme',
    tourHeaderText: 'Switch between Dutch and English here and toggle dark mode. The ? button lets you replay this tour anytime. Enjoy your walks!',
    dateLocale: 'en-GB',
  }
};

function t(key, ...args) {
  const val = i18n[lang]?.[key] ?? i18n.nl[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

// Voor tekst van buiten (GitHub-commits) of uit localStorage die in innerHTML belandt.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
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
  if (appVersionCount) setAppVersion(appVersionCount);
  document.title = t('pageTitle');
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
    ? { prefGroup: 'Temperature preference', forecast: 'Hourly forecast', rainChart: 'Rain forecast', tabs: 'Sections' }
    : { prefGroup: 'Temperatuurvoorkeur', forecast: 'Uurverwachting', rainChart: 'Regenverwachting', tabs: 'Onderdelen' };
  document.querySelector('.pref-options')?.setAttribute('aria-label', ariaMap.prefGroup);
  document.getElementById('forecast')?.setAttribute('aria-label', ariaMap.forecast);
  document.getElementById('rainChart')?.setAttribute('aria-label', ariaMap.rainChart);
  document.querySelector('.tabs')?.setAttribute('aria-label', ariaMap.tabs);
  const editBtn = document.getElementById('locationEditBtn');
  if (editBtn) {
    editBtn.title = t('editLocation');
    editBtn.setAttribute('aria-label', t('editLocation'));
  }
  const tourBtn = document.getElementById('tutorialBtn');
  if (tourBtn) {
    tourBtn.title = t('tourBtnTitle');
    tourBtn.setAttribute('aria-label', t('tourBtnTitle'));
  }
  if (tourStep >= 0) showTourStep(tourStep);
  renderLocationUi();
  renderLogHistory();
  applyDarkMode();
  updateClock();
  lastChecklistHtml = '';
  if (weatherData) render();
  else if (!document.querySelector('#verdict .error')) showWeatherLoading();
  else showWeatherError();
}

let liveChangelogReleases = [];

// Badge afleiden uit het eerste woord van de commit ("Fix …" is geen "Nieuw").
function commitType(msg) {
  if (/^(fix|herstel)/i.test(msg)) return 'fix';
  if (/^(refine|improve|update|polish|redesign|qa|follow-?ups?|verbeter)/i.test(msg)) return 'improve';
  return 'new';
}

// De GitHub-API staat 60 calls per uur per IP toe en een heel kantoor zit
// achter één IP. Versie en commits daarom een paar uur lokaal bewaren.
const GITHUB_CACHE_MS = 6 * 60 * 60 * 1000;
function readGithubCache(key) {
  try {
    const v = JSON.parse(localStorage_safe_get(key) || 'null');
    if (v && Date.now() - v.ts < GITHUB_CACHE_MS) return v.data;
  } catch (e) { /* opnieuw ophalen */ }
  return null;
}
function writeGithubCache(key, data) {
  localStorage_safe_set(key, JSON.stringify({ ts: Date.now(), data }));
}

async function fetchChangelogUpdates() {
  try {
    let commits = readGithubCache('dighv_gh_commits');
    if (!Array.isArray(commits)) {
      const res = await fetch(
        'https://api.github.com/repos/rpvos-dhg/Moetikeenjasaan.paul/commits?since=2026-05-14T00:00:00Z&per_page=100'
      );
      if (!res.ok) return;
      const raw = await res.json();
      if (!Array.isArray(raw)) return;
      commits = raw.map(c => ({ date: c.commit.author.date, subject: c.commit.message.split('\n')[0] }));
      writeGithubCache('dighv_gh_commits', commits);
    }
    if (!commits.length) return;

    const byDate = {};
    for (const commit of commits) {
      const isoDate = new Date(commit.date)
        .toLocaleDateString('sv', { timeZone: 'Europe/Amsterdam' });
      if (!byDate[isoDate]) byDate[isoDate] = [];
      // Commit-onderwerpen zijn externe tekst: escapen voordat ze in innerHTML komen.
      const subject = String(commit.subject).replace(/\s*\(#\d+\)\s*$/, '');
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
            nl: messages.map(msg => ({ type: commitType(msg), text: escapeHtml(msg) })),
            en: messages.map(msg => ({ type: commitType(msg), text: escapeHtml(msg) })),
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

  let html = `<h1>${title}</h1><p class="intro">${intro}</p>`;

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
    <h1>How it works</h1>
    <p class="intro">No magic, just a few thresholds based on live weather data. Here's exactly what the tool does.</p>
    <div class="explain-section">
      <h2>1. Data source</h2>
      <p>The tool fetches live weather data from <strong>Open-Meteo</strong> (forecast API) and live pollen data from the <strong>Open-Meteo Air Quality API</strong> every 10 minutes. These APIs combine data from various European meteorological institutes (including the KNMI). A hidden tab does not refresh; it does as soon as you come back.</p>
      <p>Default location: <code>52.0964° N, 4.3268° E</code> — ANWB headquarters on Wassenaarseweg in The Hague. Via the location button the app can use your current location (rounded to about 100 metres). That choice is kept until you switch back to ANWB HQ. The place name comes from OpenStreetMap (Nominatim).</p>
      <div class="callout"><strong>Live check:</strong> the green LIVE dot pulses as long as the data is fresh. If the data is older than half an hour (for example without a connection), it says NOT LIVE and the advice card shows when the advice is from.</div>
    </div>
    <div class="explain-section">
      <h2>2. What is measured?</h2>
      <p>For the advice, the tool looks at these values:</p>
      <table class="threshold-table">
        <tr><th>Signal</th><th>Used for</th></tr>
        <tr><td>Feels-like temperature (now)</td><td>Main input for jacket type (accounts for wind and humidity)</td></tr>
        <tr><td>Temperature</td><td>Lowest of now and the next hour; for scarf and gloves</td></tr>
        <tr><td>Wind speed (now)</td><td>Extra tips, and whether an umbrella still makes sense</td></tr>
        <tr><td>Precipitation and chance of rain</td><td>For the <strong>now + 30 minutes</strong> window, from the 15-minute forecast</td></tr>
        <tr><td>Weather type</td><td>Thunderstorms, snow and gales get their own advice</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h2>3. Jacket type based on feels-like temperature</h2>
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
      <h2>4. Personal preference</h2>
      <p>The <strong>Your type</strong> button applies an offset to the feels-like temperature:</p>
      <table class="threshold-table">
        <tr><th>Type</th><th>Offset</th><th>Effect</th></tr>
        <tr><td>I feel the cold</td><td><code>+3 °C cold</code></td><td>Earlier and warmer jacket advice</td></tr>
        <tr><td>Normal</td><td><code>0</code></td><td>Standard</td></tr>
        <tr><td>I run warm</td><td><code>−5 °C cold</code></td><td>No jacket or lighter jacket sooner</td></tr>
      </table>
      <div class="callout"><strong>Example:</strong> feels like 14 °C + "I run warm" means the tool calculates with 19 °C. Advice becomes "no jacket" instead of "light jacket". Below the advice you see "for you 19 °C".</div>
    </div>
    <div class="explain-section">
      <h2>5. Rain, snow and storms take priority</h2>
      <p>If more than <code>0.5 mm</code> per hour falls in the now + 30 minutes window <strong>or</strong> the chance of rain is <code>70%</code> or higher, the advice becomes "Waterproof jacket". At a feels-like temperature of 15 °C or more it is "Rain jacket". When it snows, it becomes "Warm coat, snow".</p>
      <p>With a chance of rain from <code>30%</code> to <code>70%</code> you only get a tip, and the normal jacket advice remains.</p>
      <p>With a thunderstorm or wind from <code>60 km/h</code> the advice is "Better stay inside". From <code>40 km/h</code> an umbrella is pointless, so the app suggests a hood or rain jacket.</p>
    </div>
    <div class="explain-section">
      <h2>6. Rain chart per 15 minutes</h2>
      <p>The bar chart shows the expected precipitation for the next 2 hours, in 15-minute steps. The height of each bar scales with the peak value in the window, so you can quickly see <em>when</em> a shower is expected.</p>
      <p>Grey bars mean dry. Coloured bars show the amount in millimeters. The data comes from the <code>minutely_15</code> feed from Open-Meteo.</p>
    </div>
    <div class="explain-section">
      <h2>7. Extra tips</h2>
      <p>Based on wind, temperature, UV index and <strong>live pollen data via Open-Meteo Air Quality API</strong>, extra recommendations appear:</p>
      <table class="threshold-table">
        <tr><th>Condition</th><th>Tip</th></tr>
        <tr><td>Wind from 40 km/h</td><td>Umbrella is pointless</td></tr>
        <tr><td>Wind from 25 km/h</td><td>Warning for strong wind</td></tr>
        <tr><td>Temperature 3 °C or lower</td><td>Scarf and gloves recommended</td></tr>
        <tr><td>Temperature 8 °C or lower</td><td>Scarf is nice</td></tr>
        <tr><td>UV index ≥ 7</td><td>Put on sunscreen!</td></tr>
        <tr><td>UV index ≥ 3</td><td>Use sunscreen</td></tr>
        <tr><td>High pollen (live)</td><td>Only with real measurements (alder, birch, grasses, mugwort, ragweed, olive) in grains/m³. No pollen data means no pollen tip.</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h2>8. Checklist: What to bring outside?</h2>
      <p>The checklist is <strong>always visible and prominent</strong> below the jacket advice. Items appear automatically based on weather conditions:</p>
      <table class="threshold-table">
        <tr><th>Condition</th><th>Items that appear</th></tr>
        <tr><td><strong>Always</strong></td><td>Staff pass, Visitor pass check, Phone, Route info</td></tr>
        <tr><td>UV index ≥ 3</td><td>Sunglasses, sunscreen SPF50+</td></tr>
        <tr><td>UV index ≥ 7</td><td>Cap or hat</td></tr>
        <tr><td>Rain chance ≥ 30% or rain, wind below 40 km/h</td><td>Umbrella</td></tr>
        <tr><td>Rain and wind from 40 km/h</td><td>Rain jacket with hood</td></tr>
        <tr><td>Rain chance ≥ 50% or rain</td><td>Waterproof bag/backpack</td></tr>
        <tr><td>Temp ≤ 8 °C</td><td>Scarf</td></tr>
        <tr><td>Temp ≤ 3 °C</td><td>Gloves</td></tr>
        <tr><td>Temp &lt; 0 °C</td><td>Winter coat (extra layers)</td></tr>
        <tr><td>Wind from 25 km/h</td><td>Sturdy jacket</td></tr>
      </table>
      <div class="callout"><strong>Saved:</strong> ticks are kept in your browser for the rest of the day. The next day the list starts empty again.</div>
    </div>
    <div class="explain-section">
      <h2>9. Pollen overview</h2>
      <p>The app shows <strong>live pollen concentrations</strong> in a separate block, per type in grains per m³ of air. This mainly helps people with hay fever see what is in the air right now. When there is no pollen data (or the location is outside Europe), the card says so.</p>
      <table class="threshold-table">
        <tr><th>Allergen type</th><th>Threshold (high)</th><th>Note</th></tr>
        <tr><td>Alder</td><td>&gt; 20 grains/m³</td><td>Winter/spring, peak February–March</td></tr>
        <tr><td>Birch</td><td>&gt; 20 grains/m³</td><td>Spring, very allergenic, peak April</td></tr>
        <tr><td>Grasses</td><td>&gt; 50 grains/m³</td><td>Summer, large impact on hay fever</td></tr>
        <tr><td>Mugwort</td><td>&gt; 10 grains/m³</td><td>Summer/autumn</td></tr>
        <tr><td>Ragweed</td><td>&gt; 10 grains/m³</td><td>Late summer/autumn, very irritating</td></tr>
        <tr><td>Olive</td><td>&gt; 20 grains/m³</td><td>Summer, mainly Southern Europe</td></tr>
      </table>
      <div class="callout"><strong>How to read:</strong> Items are sorted by <strong>current volume (highest first)</strong>. Green = low, yellow = moderate, orange = high; moderate and high are also shown as text. The bar is full at twice the threshold.</div>
    </div>
    <div class="explain-section">
      <h2>10. Dark mode</h2>
      <p>The app automatically detects your device settings (macOS/Windows/mobile dark mode) and also switches to dark mode after sunset. The 🌙/☀️ button cycles through <strong>Automatic</strong> (device + sun), <strong>Always dark</strong> and <strong>Always light</strong>. The small A means automatic. Your choice is saved.</p>
    </div>
    <div class="explain-section" style="background: var(--anwb-navy); color: white; border-color: var(--anwb-navy);">
      <h2 style="color: var(--anwb-yellow);">Disclaimer</h2>
      <p style="color: rgba(255,255,255,0.9);">This is a fun tool built by the DIGHV team. Not an official ANWB product. The thresholds are based on common sense, not meteorological research. If you get wet: not our fault.</p>
    </div>`;

  return `
    <h1>Hoe werkt dit?</h1>
    <p class="intro">Geen magie, gewoon een paar drempelwaardes op basis van live weerdata. Hieronder precies wat de tool doet.</p>
    <div class="explain-section">
      <h2>1. Databron</h2>
      <p>De tool haalt elke 10 minuten actuele weerdata op van <strong>Open-Meteo</strong> (forecast API) en live pollen-gegevens van de <strong>Open-Meteo Air Quality API</strong>. Deze API's combineren data van diverse Europese meteorologische instituten (waaronder het KNMI). In een verborgen tabblad wordt niet ververst; zodra je terugkomt wel.</p>
      <p>Standaardlocatie: <code>52.0964° N, 4.3268° O</code> — ANWB hoofdkantoor aan de Wassenaarseweg in Den Haag. Via de locatieknop kan de app je huidige locatie gebruiken (afgerond op ongeveer 100 meter). Die keuze blijft bewaard tot je terugschakelt naar ANWB HQ. De plaatsnaam komt van OpenStreetMap (Nominatim).</p>
      <div class="callout"><strong>Live check:</strong> het groene LIVE-bolletje pulseert zolang de data vers is. Is de data ouder dan een half uur (bijvoorbeeld zonder verbinding), dan staat er NIET LIVE en zie je in de advieskaart van wanneer het advies is.</div>
    </div>
    <div class="explain-section">
      <h2>2. Wat wordt er gemeten?</h2>
      <p>Voor het advies kijkt de tool naar deze waardes:</p>
      <table class="threshold-table">
        <tr><th>Signaal</th><th>Gebruikt voor</th></tr>
        <tr><td>Gevoelstemperatuur (nu)</td><td>Hoofdinput voor jastype (houdt rekening met wind en vocht)</td></tr>
        <tr><td>Temperatuur</td><td>Laagste waarde van nu en het volgende uur; voor sjaal en handschoenen</td></tr>
        <tr><td>Windsnelheid (nu)</td><td>Extra tips, en of een paraplu nog zin heeft</td></tr>
        <tr><td>Neerslag en regenkans</td><td>Voor het venster <strong>nu + 30 minuten</strong>, uit de kwartierverwachting</td></tr>
        <tr><td>Weertype</td><td>Onweer, sneeuw en storm krijgen een eigen advies</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h2>3. Jastype op basis van gevoelstemperatuur</h2>
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
      <h2>4. Persoonlijke voorkeur</h2>
      <p>De knop <strong>Jouw type</strong> past een offset toe op de gevoelstemperatuur:</p>
      <table class="threshold-table">
        <tr><th>Type</th><th>Offset</th><th>Effect</th></tr>
        <tr><td>Kouwelijk</td><td><code>+3 °C kou</code></td><td>Eerder een (warmere) jas</td></tr>
        <tr><td>Normaal</td><td><code>0</code></td><td>Standaard</td></tr>
        <tr><td>Warmbloedig</td><td><code>−5 °C kou</code></td><td>Veel eerder geen of dunnere jas</td></tr>
      </table>
      <div class="callout"><strong>Voorbeeld:</strong> een gevoelstemperatuur van 14 °C en warmbloedig betekent dat de tool rekent met 19 °C. Advies wordt dan "geen jas" in plaats van "dun jasje". Onder het advies zie je "voor jou 19 °C".</div>
    </div>
    <div class="explain-section">
      <h2>5. Regen, sneeuw en storm gaan voor</h2>
      <p>Valt er in het venster nu + 30 minuten meer dan <code>0,5 mm</code> per uur <strong>of</strong> is de regenkans <code>70%</code> of hoger, dan wordt het advies "Waterdichte jas". Bij een gevoelstemperatuur van 15 °C of meer is dat "Regenjas". Valt er sneeuw, dan wordt het "Dikke jas, sneeuw".</p>
      <p>Bij een regenkans van <code>30%</code> tot <code>70%</code> krijg je alleen een tip, en blijft het gewone jasadvies staan.</p>
      <p>Bij onweer of wind vanaf <code>60 km/u</code> is het advies "Blijf liever binnen". Vanaf <code>40 km/u</code> wind is een paraplu zinloos; dan adviseert de app een capuchon of regenjas.</p>
    </div>
    <div class="explain-section">
      <h2>6. Regengrafiek per 15 minuten</h2>
      <p>De staafgrafiek laat de verwachte neerslag zien voor de komende 2 uur, in stappen van 15 minuten. De hoogte van elke staaf schaalt met de piekwaarde in het venster, zodat je snel ziet <em>wanneer</em> een bui verwacht wordt.</p>
      <p>Grijze staafjes betekenen droog. Gekleurde staafjes tonen de hoeveelheid in millimeter. De data komt uit de <code>minutely_15</code> feed van Open-Meteo.</p>
    </div>
    <div class="explain-section">
      <h2>7. Extra tips</h2>
      <p>Op basis van wind, temperatuur, UV-index en <strong>live pollen-data via Open-Meteo Air Quality API</strong> komen er extra aanbevelingen bij:</p>
      <table class="threshold-table">
        <tr><th>Conditie</th><th>Tip</th></tr>
        <tr><td>Wind vanaf 40 km/u</td><td>Paraplu is kansloos</td></tr>
        <tr><td>Wind vanaf 25 km/u</td><td>Waarschuwing voor stevige wind</td></tr>
        <tr><td>Temperatuur 3 °C of lager</td><td>Sjaal en handschoenen aangeraden</td></tr>
        <tr><td>Temperatuur 8 °C of lager</td><td>Sjaal is fijn</td></tr>
        <tr><td>UV-index ≥ 7</td><td>Zonnebrand smeren!</td></tr>
        <tr><td>UV-index ≥ 3</td><td>Smeer je in</td></tr>
        <tr><td>Hoge pollen (live)</td><td>Alleen bij echte metingen (els, berk, grassen, bijvoet, ambrosia, olijf) in korrels/m³. Zonder pollendata geen pollentip.</td></tr>
      </table>
    </div>
    <div class="explain-section">
      <h2>8. Checklist: Wat mee naar buiten?</h2>
      <p>De checklist is <strong>altijd zichtbaar en prominent</strong> onder het jasadvies. Items verschijnen automatisch afhankelijk van weerscondities:</p>
      <table class="threshold-table">
        <tr><th>Conditie</th><th>Items die verschijnen</th></tr>
        <tr><td><strong>Altijd</strong></td><td>Personeelspas, Bezoekerspas-check, Telefoon, Route-info</td></tr>
        <tr><td>UV-index ≥ 3</td><td>Zonnebril, zonnebrandcrème SPF50+</td></tr>
        <tr><td>UV-index ≥ 7</td><td>Pet of hoed</td></tr>
        <tr><td>Regenkans ≥ 30% of regen, wind onder 40 km/u</td><td>Paraplu</td></tr>
        <tr><td>Regen en wind vanaf 40 km/u</td><td>Regenjas met capuchon</td></tr>
        <tr><td>Regenkans ≥ 50% of regen</td><td>Waterdichte tas/rugzak</td></tr>
        <tr><td>Temp ≤ 8 °C</td><td>Sjaal</td></tr>
        <tr><td>Temp ≤ 3 °C</td><td>Handschoenen</td></tr>
        <tr><td>Temp &lt; 0 °C</td><td>Winterjas (extra laagjes)</td></tr>
        <tr><td>Wind vanaf 25 km/u</td><td>Stevig jasje</td></tr>
      </table>
      <div class="callout"><strong>Opgeslagen:</strong> afvinkjes worden in je browser bewaard voor de rest van de dag. De volgende dag begint de lijst weer leeg.</div>
    </div>
    <div class="explain-section">
      <h2>9. Pollenoverzicht</h2>
      <p>De app toont <strong>live pollen-concentraties</strong> in een apart blok, per soort in korrels per m³ lucht. Dit helpt vooral mensen met hooikoorts om te zien wat nu in de lucht zit. Is er geen pollendata (of ligt de locatie buiten Europa), dan staat dat er.</p>
      <table class="threshold-table">
        <tr><th>Allergeensoort</th><th>Drempel (hoog)</th><th>Opmerking</th></tr>
        <tr><td>Els</td><td>&gt; 20 korrels/m³</td><td>Winter/voorjaar, piek februari–maart</td></tr>
        <tr><td>Berk</td><td>&gt; 20 korrels/m³</td><td>Voorjaar, zeer allergeen, piek april</td></tr>
        <tr><td>Grassen</td><td>&gt; 50 korrels/m³</td><td>Zomer, grote impact bij hooikoorts</td></tr>
        <tr><td>Bijvoet</td><td>&gt; 10 korrels/m³</td><td>Zomer/herfst</td></tr>
        <tr><td>Ambrosia</td><td>&gt; 10 korrels/m³</td><td>Late zomer/herfst, zeer irritant</td></tr>
        <tr><td>Olijf</td><td>&gt; 20 korrels/m³</td><td>Zomer, vooral Zuid-Europa</td></tr>
      </table>
      <div class="callout"><strong>Hoe te lezen:</strong> Items zijn gesorteerd op <strong>huidige volume (hoogste eerst)</strong>. Groen = laag, geel = matig, oranje = hoog; bij matig en hoog staat dat ook in tekst. De balk is vol bij twee keer de drempel.</div>
    </div>
    <div class="explain-section">
      <h2>10. Dark mode</h2>
      <p>De app detecteert automatisch je device-instellingen (macOS/Windows/mobile dark mode) en schakelt ook over naar dark mode na zonsondergang. Met de 🌙/☀️-knop wissel je tussen <strong>Automatisch</strong> (apparaat + zon), <strong>Altijd donker</strong> en <strong>Altijd licht</strong>. De kleine A betekent automatisch. Je keuze wordt opgeslagen.</p>
    </div>
    <div class="explain-section" style="background: var(--anwb-navy); color: white; border-color: var(--anwb-navy);">
      <h2 style="color: var(--anwb-yellow);">Disclaimer</h2>
      <p style="color: rgba(255,255,255,0.9);">Dit is een fun-tool gebouwd door het DIGHV-team. Geen officieel ANWB-product. De drempels zijn gebaseerd op gezond verstand, niet op meteorologisch onderzoek. Als je nat wordt: niet onze schuld.</p>
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
  return `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`;
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

function isAutoDark() {
  const deviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const sunsetDark = !isDayTime(new Date());
  return deviceDark || sunsetDark;
}

// Volgorde: automatisch → het tegenovergestelde van nu → de andere vaste stand
// → automatisch. Zo zijn alle drie de standen altijd bereikbaar.
function nextThemeMode() {
  const autoDark = isAutoDark();
  if (darkModeForced === 'auto') return autoDark ? 'light' : 'dark';
  if ((darkModeForced === 'dark') !== autoDark) return autoDark ? 'dark' : 'light';
  return 'auto';
}

function applyDarkMode() {
  const darkMode = darkModeForced === 'auto' ? isAutoDark() : darkModeForced === 'dark';
  document.body.classList.toggle('dark', darkMode);
  const btn = document.getElementById('darkModeToggle');
  if (btn) {
    btn.textContent = darkMode ? '🌙' : '☀️';
    btn.classList.toggle('dark-mode-auto', darkModeForced === 'auto');
    const label = t('themeBtnLabel', darkModeForced, darkMode, nextThemeMode());
    btn.title = label;
    btn.setAttribute('aria-label', label);
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
  const currentBtn = document.getElementById('useCurrentLocationBtn');
  const hadFocus = document.activeElement === currentBtn;
  // Knoppen worden tijdelijk disabled; zet de focus daarna terug i.p.v. op <body>.
  const done = () => {
    setLocationButtonsDisabled(false);
    if (hadFocus) currentBtn?.focus();
  };
  setLocationButtonsDisabled(true);
  setLocationStatus(t('locationFetching'));
  navigator.geolocation.getCurrentPosition(
    position => {
      // Op ~100 m afronden: genoeg voor het weer, en we bewaren of versturen
      // geen exacte positie.
      const lat = Math.round(position.coords.latitude * 1000) / 1000;
      const lon = Math.round(position.coords.longitude * 1000) / 1000;
      setLocationStatus(t('cityFetching'));
      fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=${lang}`, 8000)
        .then(r => r.json())
        .then(data => {
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.county || null;
          const msg = city ? t('locationActiveCity', city) : t('locationActive');
          done();
          setAppLocation({ mode: 'current', city, lat, lon }, msg);
        })
        .catch(() => {
          done();
          setAppLocation({ mode: 'current', city: null, lat, lon }, t('locationActive'));
        });
    },
    error => {
      done();
      const denied = error.code === error.PERMISSION_DENIED;
      setLocationStatus(denied ? t('locationDenied') : t('locationFailed'));
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60000 }
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
    // De resetknop wordt nu disabled; zet de focus op een bruikbare knop.
    currentBtn?.focus();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const panel = document.getElementById('locationPanel');
    const focusInPanel = panel?.contains(document.activeElement);
    setLocationPanelOpen(false);
    if (focusInPanel) editBtn?.focus();
  });

  document.addEventListener('click', event => {
    const control = document.querySelector('.location-control');
    if (control && !control.contains(event.target)) setLocationPanelOpen(false);
  });

  renderLocationUi();
}

// Tab switching (ARIA tabs-patroon: één tab in de tabvolgorde, pijltjes/Home/End wisselen)
const tabs = [...document.querySelectorAll('.tab')];

function selectTab(tab, focus) {
  const target = tab.dataset.tab;
  tabs.forEach(other => {
    const active = other === tab;
    other.classList.toggle('active', active);
    other.setAttribute('aria-selected', String(active));
    other.tabIndex = active ? 0 : -1;
  });
  if (focus) tab.focus();
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

tabs.forEach((tab, i) => {
  tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', e => {
    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    selectTab(tabs[(keys[e.key] + tabs.length) % tabs.length], true);
  });
});

let lastUpdate = null;
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  let label = `${hh}:${mm}`;
  const mins = lastUpdate ? Math.round((now - lastUpdate) / 60000) : 0;
  if (lastUpdate) {
    if (mins < 1) label += ` · ${t('dataFresh')}`;
    else if (mins < 60) label += ` · ${t('dataAgeMin', mins)}`;
    else label += ` · ${t('dataAgeHours', Math.floor(mins / 60))}`;
  }
  document.getElementById('clock').textContent = label;
  // Oude data (offline of een mislukte verversing) niet als LIVE tonen.
  const stale = !!lastUpdate && mins > 30;
  const noData = !weatherData && !!document.querySelector('#verdict .error');
  const live = document.querySelector('.live-indicator');
  if (live) {
    live.classList.toggle('stale', stale || noData);
    live.lastElementChild.textContent = stale || noData ? t('staleBadge') : 'LIVE';
  }
  const note = document.getElementById('dataNote');
  if (note) {
    note.hidden = !stale;
    if (stale) {
      const opts = mins >= 12 * 60 ? { weekday: 'short', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' };
      const hhmm = lastUpdate.toLocaleString(t('dateLocale'), opts);
      note.textContent = t('staleNote', hhmm);
    }
  }
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
// fetch met timeout: een hangende API mag de app niet eindeloos op "laden" laten staan.
function fetchWithTimeout(url, ms = 15000) {
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
  return fetch(url, { signal });
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

const POLLEN_KEYS = ['alder', 'birch', 'grass', 'mugwort', 'ragweed', 'olive'];

function parsePollen(aq) {
  const current = aq?.current;
  // Buiten Europa vragen we geen pollen op; dan is er geen data in plaats van "alles 0".
  if (!current || !POLLEN_KEYS.some(k => current[`${k}_pollen`] != null)) return null;
  const pick = (src, i) => Object.fromEntries(POLLEN_KEYS.map(k => [k, (i == null ? src[`${k}_pollen`] : src[`${k}_pollen`]?.[i]) || 0]));
  let tomorrow = null;
  if (aq.hourly?.time) {
    // Lokale datum, niet UTC: anders toont "morgen" tussen 00:00 en 02:00 de waarden van vandaag.
    const todayKey = getAmsterdamDateKey(new Date());
    const noonIdx = aq.hourly.time.findIndex(ts => ts.slice(0, 10) > todayKey && ts.slice(11, 13) === '12');
    if (noonIdx >= 0) tomorrow = pick(aq.hourly, noonIdx);
  }
  return { ...pick(current), tomorrow, fetchedAt: new Date() };
}

// Tijdstip van de data zelf. Offline kan de service worker een antwoord van uren
// geleden teruggeven; dat mag dan niet als "data vers" worden getoond.
function dataTimestamp(w) {
  const now = new Date();
  const ts = w?.current?.time;
  if (!ts) return now;
  const ms = Date.parse(ts + 'Z') - (w.utc_offset_seconds || 0) * 1000;
  return Number.isFinite(ms) && now - ms > 30 * 60000 ? new Date(ms) : now;
}

let lastFetchAt = 0;

async function fetchWeather() {
  const requestId = ++weatherRequestSeq;
  lastFetchAt = Date.now();
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
  // Supplementary request on the default model, aligned to the same time grid:
  // UV (KNMI has none) and precipitation_probability, which Open-Meteo derives
  // from ensembles and may be missing for a single regional model.
  const extraUrl = modelParam
    ? `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index,precipitation_probability&past_days=1&forecast_days=3&timezone=auto`
    : null;
  const airQualityUrl = buildAirQualityUrl(lat, lon);
  // Alleen het weer is verplicht. UV en pollen zijn optioneel: als die falen,
  // moet het jasadvies gewoon verschijnen.
  const optionalFetch = url => (url ? fetchWithTimeout(url).catch(() => null) : Promise.resolve(null));
  try {
    const [weatherRes, airQualityRes, extraRes] = await Promise.all([
      fetchWithTimeout(weatherUrl),
      optionalFetch(airQualityUrl),
      optionalFetch(extraUrl)
    ]);
    if (requestId !== weatherRequestSeq) return;
    if (!weatherRes.ok) throw new Error('Weather network error');
    const weatherData_new = await weatherRes.json();
    if (requestId !== weatherRequestSeq) return;
    if (extraRes?.ok && weatherData_new.hourly?.time) {
      try {
        const extra = await extraRes.json();
        if (requestId !== weatherRequestSeq) return;
        mergeHourlyByTime(weatherData_new.hourly, extra?.hourly, 'uv_index', true);
        mergeHourlyByTime(weatherData_new.hourly, extra?.hourly, 'precipitation_probability', false);
      } catch (_) { /* leave uv_index absent; renderers fall back to 0 */ }
    }
    let airQualityData = null;
    if (airQualityRes?.ok) {
      try { airQualityData = await airQualityRes.json(); } catch (_) { /* geen pollen */ }
      if (requestId !== weatherRequestSeq) return;
    }
    weatherData = weatherData_new;
    pollenData = parsePollen(airQualityData);
    lastUpdate = dataTimestamp(weatherData_new);
  } catch (err) {
    if (requestId !== weatherRequestSeq) return;
    console.error('Weerdata fetch error:', err);
    showWeatherError();
    return;
  }
  render();
  updateClock();
  applyDarkMode();
}

function showWeatherError() {
  if (weatherData) {
    // Verversen mislukt: laat het laatste advies staan. De klok en de
    // datanotitie laten zien hoe oud het is.
    updateClock();
    return;
  }
  document.getElementById('verdict').innerHTML = `<div class="error" role="alert">${t('weatherError')}
    <button type="button" class="retry-btn" id="retryBtn">${t('retry')}</button></div>`;
  document.getElementById('detail').textContent = '';
  document.getElementById('feels').textContent = '';
  document.getElementById('tips').innerHTML = '';
  document.getElementById('wachtFf').style.display = 'none';
  document.getElementById('rainCard').classList.remove('visible');
  renderChecklist();
  updateClock();
  document.getElementById('retryBtn')?.addEventListener('click', () => {
    showWeatherLoading();
    fetchWeather();
  });
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
    if (pollenData.ragweed > 10) highPollen.push(lang === 'en' ? 'ragweed' : 'ambrosia');
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

function formatDuration(mins) {
  const dd = Math.floor(mins / 1440);
  const dh = Math.floor((mins % 1440) / 60);
  const dm = mins % 60;
  if (dd > 0) return t('durationDH', dd, dh);
  return dh > 0 ? t('durationHM', dh, dm) : t('durationM', dm);
}

function renderLunchCountdown() {
  const el = document.getElementById('lunchCountdown');
  if (!el) return;

  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const isWorkday = d => d !== 0 && d !== 6;
  const workday = isWorkday(now.getDay());

  // Een pauze is niet in één minuut voorbij: tijdens de lunch (12:00-12:30)
  // en de middagpauze (15:00-15:15) staat er "Nu!".
  let targetHour, label, isNow = false, dayOffset = 0;
  if (workday && h === 12 && m < 30) {
    targetHour = 12; label = t('lunchLabel'); isNow = true;
  } else if (workday && h === 15 && m < 15) {
    targetHour = 15; label = t('afternoonLabel'); isNow = true;
  } else if (workday && h < 12) {
    targetHour = 12; label = t('lunchLabel');
  } else if (workday && h < 15) {
    targetHour = 15; label = t('afternoonLabel');
  } else {
    // Volgende werkdag: na vrijdagmiddag is dat maandag, niet zaterdag.
    targetHour = 12;
    dayOffset = 1;
    while (!isWorkday((now.getDay() + dayOffset) % 7)) dayOffset++;
    if (dayOffset === 1) {
      label = t('tomorrowLunch');
    } else {
      const target = new Date(now);
      target.setDate(target.getDate() + dayOffset);
      label = t('dayLunch', target.toLocaleDateString(t('dateLocale'), { weekday: 'long' }));
    }
  }

  const target = new Date(now);
  target.setDate(target.getDate() + dayOffset);
  target.setHours(targetHour, 0, 0, 0);

  const diffMins = Math.max(0, Math.round((target - now) / 60000));
  const countdownStr = isNow || diffMins === 0 ? t('countdownNow') : formatDuration(diffMins);

  let preview = '';
  if (weatherData && dayOffset === 0) {
    const hourly = weatherData.hourly;
    const idx = hourlyIndexAtHour(targetHour);
    if (idx !== -1) {
      const temp = Math.round(hourly.temperature_2m[idx]);
      const rain = hourly.precipitation_probability?.[idx] || 0;
      const code = hourly.weather_code?.[idx] || 0;
      const hourTime = new Date(hourly.time[idx]);
      const isDay = isDayTime(hourTime);
      preview = `<div class="countdown-preview"><span aria-hidden="true">${getWeatherIcon(code, 'small', isDay)}</span> ${temp}°C · ${t('rainPreview', rain)}</div>`;
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

  // Na de middagpauze (15:30) is er vandaag geen pauzemoment meer.
  if (currentHour > BREAK_END || (currentHour === BREAK_END && now.getMinutes() >= 30)) {
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
    const rain = hourly.precipitation_probability?.[i] || 0;
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
  const rain = hourly.precipitation_probability?.[bestIdx] || 0;
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
  const now = new Date();
  if (!minutely || !minutely.time) { el.style.display = 'none'; return; }

  const startIdx = minutely.time.findIndex(ts => new Date(ts) >= now);
  if (startIdx === -1) { el.style.display = 'none'; return; }

  // Alleen als het nu echt regent; een regenkans in het afgelopen uur telt niet.
  const isRaining = (minutely.precipitation[startIdx] ?? 0) >= 0.05 || c.precipitation > 0.1;
  if (!isRaining) { el.style.display = 'none'; return; }

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
  // Helemaal droog: geen lege grafiek tonen, alleen de samenvatting.
  card.classList.toggle('dry', totalRain < 0.1);
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

  const chart = document.getElementById('rainChart');
  chart.innerHTML = html;
  // De balken zelf zijn voor schermlezers onzichtbaar; geef de data in het label.
  const wetSlots = slots.filter(s => s.precip >= 0.1);
  const fmtTime = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  chart.setAttribute('aria-label', wetSlots.length
    ? t('rainChartAria', wetSlots.map(s => `${fmtTime(s.time)} ${s.precip.toFixed(1)} mm`).join(', '), totalRain.toFixed(1))
    : t('rainChartAriaDry'));

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
      <span class="metric-value">${Math.round(c.wind_speed_10m)}<span class="metric-unit">${t('unitKmh')} · ${windDirection(c.wind_direction_10m ?? 0)}</span></span>
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
      rain: hourly.precipitation_probability?.[idx] || 0,
      weatherCode: hourly.weather_code?.[idx] || 0,
      isNow: i === 0
    });
  }
  const html = slots.map(s => {
    const isDay = isDayTime(s.time);
    const timeLabel = s.isNow ? t('forecastNow') : String(s.time.getHours()).padStart(2,'0') + ':00';
    return `<div class="slot ${s.isNow ? 'now' : ''}" role="listitem">
      <div class="slot-time">${timeLabel}</div>
      <div class="slot-icon" aria-hidden="true">${getWeatherIcon(s.weatherCode, 'small', isDay)}</div>
      <div class="slot-temp">${Math.round(s.temp)}°</div>
      <div class="slot-rain">${s.rain}%<span class="sr-only"> ${t('rainChanceSr')}</span></div>
    </div>`;
  }).join('');
  document.getElementById('forecast').innerHTML = html;
}

// Eén set condities voor advies, wacht-strip en checklist, zodat die elkaar
// niet tegenspreken. Open-Meteo telt neerslag en regenkans per slot over de
// *voorafgaande* periode, dus voor "nu + 30 min" kijken we naar de slots die
// ná nu eindigen.
function getConditions() {
  const c = weatherData.current;
  const hourly = weatherData.hourly;
  const now = Date.now();
  const windowEnd = now + 30 * 60000;
  const idxNow = hourlyNowIndex();

  // Uurslots die [nu, nu + 30 min] dekken: het lopende uur, en het volgende
  // als het venster over het hele uur heen loopt.
  const hourIdx = [];
  for (let i = Math.max(0, idxNow + 1); i < hourly.time.length; i++) {
    hourIdx.push(i);
    if (new Date(hourly.time[i]).getTime() >= windowEnd) break;
  }
  const rainProb = Math.max(0, ...hourIdx.map(i => hourly.precipitation_probability?.[i] ?? 0));

  // Neerslag in mm/u. Liefst uit de kwartierdata, anders uit de uurdata.
  const m = weatherData.minutely_15;
  const mIdx = [];
  m?.time?.forEach((ts, i) => {
    const ms = new Date(ts).getTime();
    if (ms > now && ms <= windowEnd + 15 * 60000) mIdx.push(i);
  });
  const upcoming = mIdx.length
    ? Math.max(...mIdx.map(i => (m.precipitation[i] ?? 0) * 4))
    : Math.max(0, ...hourIdx.map(i => hourly.precipitation?.[i] ?? 0));
  const rainAmount = Math.max(upcoming, c.precipitation ?? 0);

  const codes = [c.weather_code, ...hourIdx.map(i => hourly.weather_code?.[i])];
  const thunder = codes.some(code => code >= 95);
  const snow = codes.some(code => (code >= 71 && code <= 77) || code === 85 || code === 86);

  // Afgerond, zodat het getal in beeld en het advies hetzelfde zeggen.
  const feels = Math.round(c.apparent_temperature);
  const prefOffset = userPref === 'cold' ? 3 : userPref === 'warm' ? -5 : 0;
  const wind = c.wind_speed_10m;
  const minTemp = Math.min(c.temperature_2m, hourly.temperature_2m[idxNow + 1] ?? c.temperature_2m);

  return {
    feels,
    effectiveFeel: feels - prefOffset,
    wind,
    rainProb,
    rainAmount,
    wet: rainAmount > 0.5 || rainProb >= 70,
    minTemp,
    uv: hourly.uv_index?.[idxNow] ?? 0,
    thunder,
    snow,
    stormy: thunder || wind >= 60,
    umbrellaUseless: wind >= 40
  };
}

let lastAdviceAnnouncement = '';

function renderAdvice() {
  const c = weatherData.current;
  const cond = getConditions();
  const effectiveFeel = cond.effectiveFeel;

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

  if (cond.stormy) {
    verdict = t('verdictStorm');
    detail = t(cond.thunder ? 'detailThunder' : 'detailStorm');
  } else if (cond.wet) {
    if (cond.snow) {
      verdict = t('verdictSnow'); detail += t('detailSnowAppend');
    } else if (effectiveFeel >= 15) {
      verdict = t('verdictRain'); jacketType = t('jacketRain'); detail = t('detailRain');
    } else {
      verdict = t('verdictJacketRain'); detail += t('detailRainAppend');
    }
  }

  if (cond.wet) {
    // Bij harde wind is een paraplu zinloos; dan een capuchon of regenjas.
    tips.push({ text: t(cond.umbrellaUseless ? 'tipRainGear' : 'tipUmbrella'), yellow: true });
  } else if (cond.rainProb >= 30) {
    tips.push({ text: t('tipRainChance', cond.rainProb), yellow: false });
  }

  if (cond.wind >= 40) {
    tips.push({ text: t('tipStormWind'), yellow: false });
  } else if (cond.wind >= 25) {
    tips.push({ text: t('tipStrongWind'), yellow: false });
  }

  if (cond.minTemp <= 3) {
    tips.push({ text: t('tipScarf'), yellow: false });
    tips.push({ text: t('tipGloves'), yellow: false });
  } else if (cond.minTemp <= 8) {
    tips.push({ text: t('tipScarfNice'), yellow: false });
  }

  if (cond.uv >= 7) {
    tips.push({ text: t('tipUvHigh'), yellow: false });
  } else if (cond.uv >= 3) {
    tips.push({ text: t('tipUvMid'), yellow: false });
  }

  // Alleen bij echte metingen; zonder pollendata geen gok uit de seizoenstabel.
  if (pollenData) {
    const pollen = getPollenTip();
    if (pollen.level === 'very high' || pollen.level === 'zeer hoog') {
      tips.push({ text: t('tipPollenVeryHigh'), yellow: false });
    } else if (pollen.level === 'high' || pollen.level === 'hoog') {
      tips.push({ text: t('tipPollenHigh'), yellow: false });
    }
  }

  tips.unshift({ text: jacketType, yellow: true });

  const isDay = isDayTime(new Date());
  const weatherIcon = getWeatherIcon(c.weather_code, 'large', isDay);
  document.getElementById('verdict').innerHTML = `<span class="fade-in">${verdict}</span><div class="weather-illustration" aria-hidden="true">${weatherIcon}</div>`;
  document.getElementById('detail').textContent = detail;
  document.getElementById('feels').textContent = t('feelsLine', cond.feels)
    + (userPref !== 'normal' ? t('feelsForYou', effectiveFeel) : '');
  document.getElementById('tips').innerHTML = tips.map(tip =>
    `<span class="tip ${tip.yellow ? 'yellow' : ''}">${tip.text}</span>`
  ).join('');

  // Schermlezers: alleen aankondigen als het advies echt verandert.
  const announcement = `${verdict}. ${jacketType}.`;
  if (announcement !== lastAdviceAnnouncement) {
    lastAdviceAnnouncement = announcement;
    document.getElementById('adviceLive').textContent = announcement;
  }

  renderPollenCard();
  renderChecklist();
}

function renderPollenCard() {
  const pollenGrid = document.getElementById('pollenGrid');
  if (!pollenGrid) return;
  if (!pollenData) {
    // Geen meting: liever eerlijk "niet beschikbaar" dan zes keer 0.
    pollenGrid.innerHTML = `<div class="pollen-unavailable">${t('pollenUnavailable')}</div>`;
    return;
  }

  const pollens = [
    { name: lang === 'en' ? 'Alder' : 'Els', icon: '🌳', value: pollenData?.alder || 0, threshold: 20 },
    { name: lang === 'en' ? 'Birch' : 'Berk', icon: '🌳', value: pollenData?.birch || 0, threshold: 20 },
    { name: lang === 'en' ? 'Grasses' : 'Grassen', icon: '🌾', value: pollenData?.grass || 0, threshold: 50 },
    { name: lang === 'en' ? 'Mugwort' : 'Bijvoet', icon: '🌱', value: pollenData?.mugwort || 0, threshold: 10 },
    { name: lang === 'en' ? 'Ragweed' : 'Ambrosia', icon: '🌱', value: pollenData?.ragweed || 0, threshold: 10 },
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
        <span class="pollen-name"><span aria-hidden="true">${p.icon}</span> ${p.name}</span>
        <span class="pollen-value">${Math.round(p.value)} ${t('pollenUnit')}${p.level !== 'low' ? ` · ${t('pollenItemLevel')[p.level]}` : ''}</span>
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
    if (tm.ragweed > 10) highTomorrow.push(lang === 'en' ? 'ragweed' : 'ambrosia');
    if (tm.olive > 20) highTomorrow.push(lang === 'en' ? 'olive' : 'olijf');
    const tomorrowText = highTomorrow.length > 0
      ? `${t('pollenHighPrefix')}${highTomorrow.join(', ')}`
      : t('pollenAllLow');
    html += `<div class="pollen-tomorrow"><span class="pollen-tomorrow-label">${t('pollenTomorrow')}:</span> ${tomorrowText}</div>`;
  }

  pollenGrid.innerHTML = html;
}

// Afvinkjes gelden voor één dag; de volgende dag begint de lijst weer leeg.
function getCheckedItems() {
  try {
    const v = JSON.parse(localStorage_safe_get('dighv_checklist') || 'null');
    if (v && v.date === getAmsterdamDateKey(new Date()) && v.items && typeof v.items === 'object') return v.items;
  } catch (e) { /* kapotte waarde: opnieuw beginnen */ }
  return {};
}

let lastChecklistHtml = '';

function renderChecklist() {
  const cond = weatherData ? getConditions() : null;
  const umbrellaOk = cond && !cond.umbrellaUseless && (cond.wet || cond.rainProb >= 30);

  const items = [
    { group: 'Always', labelKey: 'checkPersPass', id: 'personeelspas' },
    { group: 'Always', labelKey: 'checkBezPass', id: 'bezoekerspas' },
    { group: 'Always', labelKey: 'checkPhone', id: 'telefoon' },
    { group: 'Zon', labelKey: 'checkSunglasses', id: 'zonnebril', condition: () => cond.uv >= 3 },
    { group: 'Zon', labelKey: 'checkSunscreen', id: 'zonnebrandcreme', condition: () => cond.uv >= 3 },
    { group: 'Zon', labelKey: 'checkHat', id: 'hoed', condition: () => cond.uv >= 7 },
    { group: 'Regen', labelKey: 'checkUmbrella', id: 'paraplu', condition: () => umbrellaOk },
    { group: 'Regen', labelKey: 'checkRainGear', id: 'regenjas', condition: () => cond.wet && cond.umbrellaUseless },
    { group: 'Regen', labelKey: 'checkWaterproof', id: 'waterdichte_tas', condition: () => cond.wet || cond.rainProb >= 50 },
    { group: 'Kou', labelKey: 'checkScarf', id: 'sjaal', condition: () => cond.minTemp <= 8 },
    { group: 'Kou', labelKey: 'checkGloves', id: 'handschoenen', condition: () => cond.minTemp <= 3 },
    { group: 'Kou', labelKey: 'checkWinterJacket', id: 'winterjas_extra', condition: () => cond.minTemp < 0 },
    { group: 'Wind', labelKey: 'checkWindJacket', id: 'stevig_jasje', condition: () => cond.wind >= 25 },
    { group: 'Info', labelKey: 'checkRoute', id: 'route_info' },
  ];

  const checklist = document.getElementById('checklist');
  if (!checklist) return;

  const checked = getCheckedItems();

  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.group]) grouped[item.group] = [];
    // Zonder weerdata alleen de vaste items tonen.
    if (!item.condition || (cond && item.condition())) grouped[item.group].push(item);
  });

  const groupKeyMap = {
    'Always': 'groupAlways', 'Zon': 'groupSun', 'Regen': 'groupRain',
    'Kou': 'groupCold', 'Wind': 'groupWind', 'Info': 'groupInfo'
  };

  let html = '';
  ['Always', 'Zon', 'Regen', 'Kou', 'Wind', 'Info'].forEach(group => {
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

  // Elke 10 minuten wordt opnieuw gerenderd; niets doen als er niets verandert,
  // en anders de toetsenbordfocus terugzetten.
  if (html === lastChecklistHtml && checklist.children.length) return;
  lastChecklistHtml = html;
  const focusedId = checklist.contains(document.activeElement) ? document.activeElement.id : null;
  checklist.innerHTML = html;
  if (focusedId) document.getElementById(focusedId)?.focus();

  checklist.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const items = getCheckedItems();
      items[e.target.id.replace('check_', '')] = e.target.checked;
      localStorage_safe_set('dighv_checklist', JSON.stringify({ date: getAmsterdamDateKey(new Date()), items }));
      lastChecklistHtml = '';
    });
  });
}

// ─── Looplog ───────────────────────────────────────────
function getLog() {
  try {
    const log = JSON.parse(localStorage_safe_get('dighv_log') || '[]');
    // Een kapotte of handmatig aangepaste waarde mag de app niet laten crashen.
    return Array.isArray(log) ? log.filter(e => e && Array.isArray(e.people) && e.timestamp) : [];
  } catch (e) { return []; }
}

function saveLog(log) {
  localStorage_safe_set('dighv_log', JSON.stringify(log));
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
    // Even uitschakelen, anders levert een dubbelklik een extra regel op.
    saveBtn.disabled = true;
    saveBtn.textContent = t('logSaved');
    setTimeout(() => { saveBtn.textContent = t('logSave'); saveBtn.disabled = false; }, 1800);
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
      const names = entry.people.map(escapeHtml).join(', ');
      const peopleStr = entry.people.length === 0 ? t('logNobodyWalked') : names;
      const deleteLabel = escapeHtml(t('logDeleteAria', time, entry.people.join(', ')));
      html += `<div class="log-entry">
        <div class="log-entry-main">
          <span class="log-entry-time">${time}</span>
          <span class="log-entry-people">${peopleStr}</span>
        </div>
        <button class="log-delete-btn" data-id="${escapeHtml(entry.id)}" title="${deleteLabel}" aria-label="${deleteLabel}">×</button>
      </div>`;
    });
  }

  el.innerHTML = html;
  el.querySelectorAll('.log-delete-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const updated = getLog().filter(e => String(e.id) !== btn.dataset.id);
      saveLog(updated);
      renderLogHistory();
      // Focus naar de volgende regel (of de lijst zelf) in plaats van <body>.
      const remaining = el.querySelectorAll('.log-delete-btn');
      const next = remaining[Math.min(idx, remaining.length - 1)];
      if (next) next.focus();
      else { el.tabIndex = -1; el.focus(); }
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
  darkModeForced = nextThemeMode();
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
  // Vergelijken op de getoonde (afgeronde) scores, anders "minder goed" bij gelijke cijfers.
  const todayRounded = Math.round(todayScore);
  const tomorrowRounded = Math.round(tomorrowScore);

  el.innerHTML = `
    <div class="comparison-day">
      <div class="comparison-label">${t('yesterday')}</div>
      <div class="comparison-icon">${getWeatherIcon(yesterday.code, 'small', true)}</div>
      <div class="comparison-temp">${Math.round(yesterday.tempMax ?? 15)}°C</div>
      <div class="comparison-detail">${t('windLabel', Math.round(yesterday.wind))}</div>
      <div class="comparison-detail">${t('rainLabel', yesterday.rain.toFixed(1))}</div>
      <div class="comparison-verdict past">${t('scoreLabel', Math.round(yesterdayScore))}</div>
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
      <div class="comparison-verdict ${tomorrowRounded > todayRounded ? '' : tomorrowRounded === todayRounded ? 'similar' : 'worse'}">
        ${tomorrowRounded > todayRounded ? t('better') : tomorrowRounded === todayRounded ? t('similar') : t('worse')}
      </div>
    </div>
  `;
}

let appVersionCount = null;
function setAppVersion(count) {
  appVersionCount = count;
  // Scheidingsteken in de span zelf, zodat de footer niet op "· " eindigt zonder versie.
  document.querySelectorAll('#appVersion').forEach(el => el.textContent = ` · ${t('versionLabel', count)}`);
}

async function fetchAppVersion() {
  try {
    let count = readGithubCache('dighv_gh_version');
    if (!count) {
      const res = await fetch(
        'https://api.github.com/repos/rpvos-dhg/Moetikeenjasaan.paul/commits?per_page=1'
      );
      if (!res.ok) return;
      // GitHub returns total commit count in the Link header rel="last" page number
      const link = res.headers.get('Link') || '';
      const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      count = match ? parseInt(match[1], 10) : null;
      if (count) writeGithubCache('dighv_gh_version', count);
    }
    if (count) setAppVersion(count);
  } catch {
    // silently ignore — version is non-critical
  }
}

// ─── Tutorial overlay (eerste bezoek) ────────────────────────────────────────
const TUTORIAL_KEY = 'dighv_tutorial_done';
const TOUR_MOBILE_QUERY = '(max-width: 640px)'; // zelfde breakpoint als de CSS

const TUTORIAL_STEPS = [
  { key: 'tourWelcome' },
  { key: 'tourAdvice', target: 'advice' },
  { key: 'tourPref', target: 'pref' },
  { key: 'tourChecklist', target: 'checklist' },
  { key: 'tourLocation', target: 'location' },
  { key: 'tourLunch', target: 'lunch' },
  { key: 'tourConditions', target: 'conditions' },
  { key: 'tourForecast', target: 'forecast' },
  { key: 'tourBestTime', target: 'besttime' },
  { key: 'tourRain', target: 'rain' },
  { key: 'tourPollen', target: 'pollen' },
  { key: 'tourComparison', target: 'comparison' },
  { key: 'tourTabs', target: 'tabs' },
  { key: 'tourHeader', target: 'header' },
];

let tourStep = -1;
let tourEls = null;

function startTutorial() {
  if (tourEls) return;
  // De rondleiding hoort bij het Advies-tabblad
  const adviceTab = document.querySelector('.tab[data-tab="advice"]');
  if (adviceTab && !adviceTab.classList.contains('active')) adviceTab.click();
  buildTourDom();
  showTourStep(0);
  tourEls.nextBtn.focus();
}

function buildTourDom() {
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.id = 'tourOverlay';
  overlay.innerHTML = `
    <div class="tour-spotlight" aria-hidden="true"></div>
    <div class="tour-tooltip" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourText">
      <div class="tour-head">
        <span class="tour-count" id="tourCount"></span>
        <button class="tour-close" id="tourClose" type="button">×</button>
      </div>
      <h3 class="tour-title" id="tourTitle"></h3>
      <p class="tour-text" id="tourText"></p>
      <div class="tour-dots" id="tourDots" aria-hidden="true">${
        TUTORIAL_STEPS.map(() => '<span class="tour-dot"></span>').join('')
      }</div>
      <div class="tour-actions">
        <button class="tour-skip" id="tourSkip" type="button"></button>
        <div class="tour-nav">
          <button class="tour-nav-btn" id="tourPrev" type="button"></button>
          <button class="tour-nav-btn primary" id="tourNext" type="button"></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  tourEls = {
    overlay,
    spotlight: overlay.querySelector('.tour-spotlight'),
    tooltip: overlay.querySelector('.tour-tooltip'),
    count: overlay.querySelector('#tourCount'),
    title: overlay.querySelector('#tourTitle'),
    text: overlay.querySelector('#tourText'),
    dots: [...overlay.querySelectorAll('.tour-dot')],
    skipBtn: overlay.querySelector('#tourSkip'),
    prevBtn: overlay.querySelector('#tourPrev'),
    nextBtn: overlay.querySelector('#tourNext'),
    closeBtn: overlay.querySelector('#tourClose'),
    target: null,
    // Herpositioneren wanneer async data (weer/pollen) de layout verandert
    resizeObserver: typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedulePositionTour) : null,
  };
  tourEls.skipBtn.addEventListener('click', endTutorial);
  tourEls.closeBtn.addEventListener('click', endTutorial);
  tourEls.prevBtn.addEventListener('click', () => showTourStep(tourStep - 1));
  tourEls.nextBtn.addEventListener('click', () => {
    if (tourStep >= TUTORIAL_STEPS.length - 1) endTutorial();
    else showTourStep(tourStep + 1);
  });
  window.addEventListener('resize', schedulePositionTour);
  window.addEventListener('scroll', schedulePositionTour, { passive: true });
  window.addEventListener('keydown', onTourKey);
}

function endTutorial() {
  localStorage_safe_set(TUTORIAL_KEY, '1');
  tourStep = -1;
  window.removeEventListener('resize', schedulePositionTour);
  window.removeEventListener('scroll', schedulePositionTour);
  window.removeEventListener('keydown', onTourKey);
  tourEls?.resizeObserver?.disconnect();
  tourEls?.overlay.remove();
  tourEls = null;
  document.getElementById('tutorialBtn')?.focus();
}

function onTourKey(e) {
  if (!tourEls) return;
  if (e.key === 'Escape') { e.preventDefault(); endTutorial(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); tourEls.nextBtn.click(); }
  else if (e.key === 'ArrowLeft' && tourStep > 0) { e.preventDefault(); showTourStep(tourStep - 1); }
  else if (e.key === 'Tab') {
    // Focus-trap: aria-modal dialoog — houd Tab binnen de tooltip
    const focusables = [...tourEls.tooltip.querySelectorAll('button')]
      .filter(b => b.style.visibility !== 'hidden');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!tourEls.tooltip.contains(document.activeElement)) {
      e.preventDefault(); first.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    }
  }
}

function tourTargetEl(step) {
  return step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
}

function showTourStep(i) {
  if (!tourEls) return;
  tourStep = Math.max(0, Math.min(i, TUTORIAL_STEPS.length - 1));
  const step = TUTORIAL_STEPS[tourStep];
  const last = tourStep === TUTORIAL_STEPS.length - 1;
  tourEls.title.textContent = t(step.key + 'Title');
  tourEls.text.textContent = t(step.key + 'Text');
  tourEls.count.textContent = t('tourStepOf', tourStep + 1, TUTORIAL_STEPS.length);
  tourEls.skipBtn.textContent = t('tourSkip');
  tourEls.skipBtn.style.visibility = last ? 'hidden' : 'visible';
  tourEls.closeBtn.setAttribute('aria-label', t('tourClose'));
  tourEls.prevBtn.textContent = t('tourPrev');
  tourEls.prevBtn.style.visibility = tourStep === 0 ? 'hidden' : 'visible';
  tourEls.nextBtn.textContent = last ? t('tourDone') : t('tourNext');
  tourEls.dots.forEach((d, idx) => d.classList.toggle('active', idx === tourStep));

  const target = tourTargetEl(step);
  tourEls.target = target;
  if (tourEls.resizeObserver) {
    tourEls.resizeObserver.disconnect();
    tourEls.resizeObserver.observe(document.body);
    if (target) tourEls.resizeObserver.observe(target);
  }
  if (target && target.getBoundingClientRect().height > 0) {
    try { target.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    catch (e) { target.scrollIntoView(); }
  } else {
    window.scrollTo(0, 0);
  }
  positionTour();
}

let tourPositionQueued = false;
function schedulePositionTour() {
  if (tourPositionQueued || !tourEls) return;
  tourPositionQueued = true;
  requestAnimationFrame(() => { tourPositionQueued = false; positionTour(); });
}

function positionTour() {
  if (!tourEls) return;
  const { overlay, spotlight, tooltip, target } = tourEls;
  const r = target ? target.getBoundingClientRect() : null;

  // Geen doel, of doel is verborgen (bijv. regenkaart op een droge dag):
  // toon de tooltip gecentreerd zonder spotlight
  if (!r || (r.width === 0 && r.height === 0)) {
    overlay.classList.add('tour-centered');
    spotlight.style.display = 'none';
    tooltip.style.top = '';
    tooltip.style.left = '';
    return;
  }

  // Eerst alle metingen, dan pas schrijven — voorkomt dubbele reflow
  const pad = 8;
  const gap = 14;
  const mobile = window.matchMedia(TOUR_MOBILE_QUERY).matches;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;

  overlay.classList.remove('tour-centered');
  spotlight.style.display = 'block';
  spotlight.style.top = (r.top - pad) + 'px';
  spotlight.style.left = (r.left - pad) + 'px';
  spotlight.style.width = (r.width + pad * 2) + 'px';
  spotlight.style.height = (r.height + pad * 2) + 'px';

  if (mobile) {
    // Op mobiel staat de tooltip vast onderin (via CSS)
    tooltip.style.top = '';
    tooltip.style.left = '';
    return;
  }

  let top = r.bottom + pad + gap;                            // liefst onder het doel
  if (top + th > window.innerHeight - 16) top = r.top - pad - gap - th; // anders erboven
  top = Math.max(16, Math.min(top, window.innerHeight - th - 16));      // en altijd in beeld
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
  tooltip.style.top = top + 'px';
  tooltip.style.left = left + 'px';
}

document.getElementById('tutorialBtn')?.addEventListener('click', startTutorial);

// Init: elke stap apart, zodat één fout (bijv. kapotte localStorage) niet
// verhindert dat het weer wordt opgehaald.
const REFRESH_MS = 10 * 60 * 1000;
[applyTranslations, bindLocationControls, fetchWeather, fetchAppVersion, fetchChangelogUpdates].forEach(step => {
  try { step(); } catch (err) { console.error('Init-stap mislukt:', step.name, err); }
});

// Niet verversen in een verborgen tab (scheelt API-calls), wel meteen bij
// terugkeer of als de verbinding terugkomt en de data oud is.
setInterval(() => { if (!document.hidden) fetchWeather(); }, REFRESH_MS);
const refreshIfStale = () => {
  if (!document.hidden && Date.now() - lastFetchAt > REFRESH_MS) fetchWeather();
};
document.addEventListener('visibilitychange', refreshIfStale);
window.addEventListener('online', () => fetchWeather());

if ('serviceWorker' in navigator) {
  // Relatief pad: werkt op GitHub Pages, een eigen domein en lokaal.
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Rondleiding bij eerste bezoek — na load, zodat fonts/layout staan.
// Vlag opnieuw checken: de gebruiker kan de tour in de tussentijd al
// via de ?-knop hebben geopend en overgeslagen.
if (!localStorage_safe_get(TUTORIAL_KEY)) {
  const autoStartTutorial = () => setTimeout(() => {
    if (!localStorage_safe_get(TUTORIAL_KEY)) startTutorial();
  }, 500);
  if (document.readyState === 'complete') autoStartTutorial();
  else window.addEventListener('load', autoStartTutorial, { once: true });
}
