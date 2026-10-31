// ─── Personen: standaardlijst. In de app per toestel aan te passen (Looplog → Team bewerken) ───
const WALKERS = [
  'Adam', 'Bob', 'David', 'David E', 'Frank H', 'Frank vd H',
  'Fred', 'Gijs', 'Jeffrey', 'Louise', 'Marlene', 'Noëlla',
  'Nynke', 'Remco', 'Sjors', 'Steven', 'Sven', 'Timke'
];

// ─── huisstijl-klassen voor wat het script opbouwt of omschakelt ───────────────
// Letterlijk uit de huisstijl-componenten; de stijl komt uit huisstijl/huisstijl.css.
const UI_FOCUS = 'focus-visible:outline-200 focus-visible:outline-offset-25 focus-visible:outline-interactive-focus';
const UI = {
  // SubNavigation-item: geselecteerd en niet geselecteerd
  tabOn: 'border-b-static-interactive-highlight-subtle-active text-interactive-neutral-active',
  tabOff: 'border-static-transparent text-interactive-neutral',
  // FilterChip (small): aria-pressed true en false
  chip: `group relative inline-flex cursor-pointer items-center gap-100 rounded-pill disabled:cursor-not-allowed disabled:bg-interactive-disabled disabled:text-interactive-disabled ${UI_FOCUS} h-500 px-150 prose-label-small`,
  chipOn: 'bg-interactive-strong text-inverse-strong hover:bg-interactive-strong-hover active:bg-interactive-strong-active',
  chipOff: 'bg-interactive-weak text-strong hover:bg-interactive-weak-hover active:bg-interactive-weak-active',
  // IconButton (tertiary) en ActionIcon
  iconButton: `flex size-500 shrink-0 items-center justify-center rounded-100 ${UI_FOCUS} active:border-interactive-weak-active active:bg-interactive-weak-active border-100 border-default text-neutral hover:text-neutral hover:border-interactive-weak-hover hover:bg-interactive-weak-hover`,
  actionIcon: `inline-flex size-400 shrink-0 items-center justify-center rounded-100 leading-none ${UI_FOCUS} text-interactive-strong hover:text-interactive-strong-hover active:text-interactive-strong-active`,
  // TextLink als knop
  textLink: `inline-flex items-center min-h-500 px-50 text-interactive-highlight-strong underline hover:text-interactive-highlight-strong-hover active:text-interactive-highlight-strong-active focus-visible:rounded-50 ${UI_FOCUS} prose-paragraph-body-small`,
  // Label (Data display/Label); kleur per niveau of uitkomst
  label: 'inline-flex items-center gap-100 overflow-hidden rounded-100 align-middle text-clip whitespace-nowrap px-150 h-500',
  labelColor: {
    green: 'bg-static-accent-green-strong text-static-inverse',
    yellow: 'bg-static-accent-yellow-strong text-static-strong',
    red: 'bg-static-accent-red-strong text-static-inverse',
    grey: 'bg-static-subtle text-static-neutral',
  },
};

function setUiState(el, on, onClasses, offClasses) {
  el.classList.remove(...(on ? offClasses : onClasses).split(' '));
  el.classList.add(...(on ? onClasses : offClasses).split(' '));
}

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
// Opgeslagen waarden alleen gebruiken als ze geldig zijn.
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
let userPref = oneOf(localStorage_safe_get('dighv_pref'), ['cold', 'normal', 'warm'], 'normal');
let selectedWalkers = new Set();
let darkModeForced = oneOf(localStorage_safe_get('dighv_dark_force'), ['auto', 'dark', 'light'], 'auto');
let lang = oneOf(localStorage_safe_get('dighv_lang'), ['nl', 'en'], 'nl');
let currentLocation = getStoredLocation();
let weatherRequestSeq = 0;
// Eigen lunchtijd (minuten na middernacht), tussen 11:00 en 13:30.
let lunchMinutes = Math.round(Math.min(810, Math.max(660, Number(localStorage_safe_get('dighv_lunch')) || 720)) / 15) * 15;
// Persoonlijke kalibratie uit "te koud / te warm"-feedback, in °C.
let calibration = Math.max(-6, Math.min(6, Number(localStorage_safe_get('dighv_calibration')) || 0));

// ─── i18n ────────────────────────────────────────────────────────────────────
const i18n = {
  nl: {
    tabAdvice: 'Advies', tabLog: 'Looplog', tabExplain: 'Uitleg', tabChangelog: 'Nieuw',
    tabsLabel: 'Onderdelen',
    h1Html: 'Jas aan of <span class="text-highlight-strong">niet?</span>',
    lead: 'De officieuze DIGHV pauze-scanner. Even checken voor je naar buiten loopt.',
    adviceLabel: 'Advies voor de komende 30 min',
    adviceUpdated: ts => `bijgewerkt ${ts}`,
    yourType: 'Jouw type', prefCold: 'Kouwelijk', prefNormal: 'Normaal', prefWarm: 'Warm\u00ADbloedig',
    prefHint: 'Hoe snel heb jij het koud? We onthouden het op dit toestel.',
    prefGroupLabel: 'Temperatuurvoorkeur',
    prefEdit: 'Wijzig', prefCurrentLine: (type, lunch) => `${type} · lunch ${lunch}`,
    lunchTimeLabel: 'Mijn lunch',
    calibrationNote: n => (n > 0 ? `Op basis van je feedback rekenen we ${n} °C kouder.` : `Op basis van je feedback rekenen we ${-n} °C warmer.`),
    calibrationReset: 'Terugzetten',
    calibrationLimit: 'Dank je. Het advies staat al op de maximale bijstelling van 6 °C.',
    checklistTitle: 'Wat mee naar buiten?',
    nextBreak: 'Volgende pauze', currentConditions: 'Weer nu',
    comingHours: 'Komende uren', forecastLabel: 'Uurverwachting',
    rainPer15: 'Regen per 15 minuten', next2hours: 'komende 2 uur',
    pollenOverview: 'Pollen', todayVsTomorrow: 'Gisteren · vandaag · morgen',
    footerHtml: 'Gebouwd door en voor <strong>DIGHV</strong> · Weerdata via Open&#8209;Meteo · Geen officieel ANWB-product',
    pageTitle: 'Jas of geen jas? | DIGHV Pauze-advies',
    editLocation: 'Locatie wijzigen',
    versionLabel: n => `Versie 1.${n} · `, footerWhatsNew: 'Wat is er nieuw',
    meterCold: 'koud', meterWarm: 'warm',
    locationPanelTitle: 'Locatie',
    useCurrentLocationBtn: 'Gebruik mijn locatie', resetLocationBtn: 'Terug naar ANWB HQ',
    locationSource: 'Weer via Open-Meteo · plaatsnaam © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap-bijdragers</a>',
    locationDefaultLabel: 'Mijn locatie',
    locationCityLabel: city => `Mijn locatie · ${city}`,
    locationSince: ms => `Bewaard sinds ${new Date(ms).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}.`,
    locationFetching: 'Locatie ophalen...', cityFetching: 'Plaatsnaam ophalen...',
    locationActive: 'Je eigen locatie wordt gebruikt.',
    locationActiveCity: city => `Je eigen locatie wordt gebruikt (${city}).`,
    locationNoGeo: 'Huidige locatie is niet beschikbaar in deze browser.',
    locationDenied: 'Je browser deelt je locatie niet. Sta het toe in de browserinstellingen, of gebruik ANWB HQ.',
    locationFailed: 'Je locatie is niet gevonden. Probeer het zo nog eens.',
    anwbHqActive: 'ANWB HQ actief.',
    weatherLoading: 'Weer ophalen...', weatherError: 'Geen weerdata. Controleer je verbinding en probeer het opnieuw, of kijk even uit het raam.', retry: 'Opnieuw proberen',
    dataFresh: 'net bijgewerkt', dataAgeMin: mins => `${mins} min geleden bijgewerkt`,
    dataAgeHours: h => `${h} uur geleden bijgewerkt`,
    staleBadge: 'NIET LIVE', staleNote: ts => `Geen verse data. Dit advies is van ${ts}.`,
    feelsLine: f => `Voelt als ${f} °C`, feelsForYou: f => ` · voor jou ${f} °C`,
    verdictNone: 'Geen jas nodig', jacketNone: 'Lekker zo',
    detailNone: 'Het is aangenaam warm. Lekker weer voor een rondje buiten.',
    verdictLight: 'Dun jasje', jacketLight: 'Vest of windjack',
    detailLight: 'Mild, maar niet zomers. Een dunne laag houdt je comfortabel.',
    verdictAutumn: 'Jas aan', jacketAutumn: 'Herfstjas',
    detailAutumn: 'Fris weer. Een gewone jas is prima voor een korte wandeling.',
    verdictWinter: 'Dikke jas', jacketWinter: 'Winterjas',
    detailWinter: 'Koud. Trek iets warms aan voordat je naar buiten stapt.',
    verdictFreezing: 'Dikke jas + laagjes', jacketFreezing: 'Winterjas + laagjes',
    detailFreezing: 'Echt koud. Trek een goede winterjas aan, met een extra laag eronder.',
    verdictRain: 'Regenjas',
    detailRain: 'Het is warm genoeg, maar er komt regen. Pak iets waterdichts.',
    verdictJacketRain: 'Waterdichte jas',
    detailJacketRain: 'Fris en nat. Een waterdichte jas houdt je droog.',
    detailJacketRainCold: 'Koud en nat. Trek een warme, waterdichte jas aan.',
    verdictSnow: 'Dikke jas, sneeuw', detailSnow: 'Het sneeuwt. Trek een dikke jas aan en let op gladheid.',
    verdictStorm: 'Blijf liever binnen',
    detailThunder: 'Onweer in de buurt. Wacht met je wandeling tot het over is.',
    detailStorm: 'Zware wind. Een rondje buiten is nu geen pretje; wacht op een rustiger moment.',
    tipUmbrella: 'Paraplu mee', tipRainGear: 'Capuchon of regenjas',
    tipRainChance: prob => `${prob}% kans op regen`,
    tipStormWind: 'Harde wind, paraplu kansloos', tipStrongWind: 'Stevige wind',
    tipGusts: g => `Windstoten tot ${g} km/u`,
    tipScarfGloves: 'Sjaal en handschoenen', tipScarfNice: 'Sjaal is fijn', tipSlippery: 'Let op gladheid',
    tipUvHigh: 'Hoge UV: zonnebrand smeren', tipUvMid: 'Matige UV: smeer je in',
    tipMuggy: 'Benauwd: neem water mee', tipFog: 'Mist: kijk goed uit bij het oversteken',
    tipPollenVeryHigh: 'Veel pollen. Hooikoorts? Neem je medicatie mee.',
    tipPollenHigh: 'Verhoogde pollen, let op bij hooikoorts',
    jacketLevels: { Freezing: 'laagjes', Winter: 'winterjas', Autumn: 'herfstjas', Light: 'dun jasje', None: 'geen jas' },
    jacketNeeds: { Freezing: 'een winterjas met laagjes', Winter: 'een winterjas', Autumn: 'een herfstjas', Light: 'een dun jasje' },
    jacketNear: (need, delta) => `Nog ${delta} °C kouder en je hebt ${need} nodig.`,
    jacketMeterLabel: (level, feel) => `Jas-o-meter: ${level}, ${feel} °C voor jou`,
    extremeThunder: ['Onweer. De koffieautomaat telt ook als wandeling.', 'Bliksem in de buurt. Wacht even binnen tot het over is.'],
    extremeStorm: ['Code oranje-gevoel. Hou je jas (en jezelf) goed vast.', 'Storm. Lopen kan, maar je komt terug met een nieuw kapsel.'],
    extremeHeat: ['Tropisch. Zoek de schaduw en neem water mee.', 'Te warm voor een jas, en eigenlijk ook voor haast.'],
    extremeFrost: ['Strenge kou. Muts op, handen in de zakken.', 'IJskoud. Een snel rondje is ook een rondje.'],
    extremeSnow: ['Sneeuw! Kijk uit voor gladde stoepen.', 'Sneeuw. Sneeuwballen buiten werktijd, graag.'],
    extremeFog: ['Mist. Je collega\'s zie je pas als je er bijna bent.', 'Dichte mist: blijf op de stoep.'],
    weekendNote: 'Weekend! Het advies geldt, maar de pauzetijden niet.',
    feedbackQuestion: 'Hoe was het buiten?',
    feedbackCold: 'Ik had het koud', feedbackOk: 'Precies goed', feedbackWarm: 'Ik had het warm',
    feedbackSkip: 'Niet buiten geweest', feedbackSkipped: 'Prima, morgen weer.',
    feedbackThanks: 'Dank je. We passen het advies voor jou aan.',
    feedbackThanksOk: 'Mooi zo. Dan houden we het zo.',
    rainContinues: 'Blijft de komende 3 uur regenen', snowContinues: 'Blijft de komende 3 uur sneeuwen',
    rainStopsSoon: 'Regen stopt binnen 5 minuten', snowStopsSoon: 'Sneeuw stopt binnen 5 minuten',
    rainWait: (mins, ts) => `Wacht ~${mins} min, droog rond <strong>${ts}</strong>`,
    rainStartsAt: ts => `Droog tot <strong>${ts}</strong>, daarna regen`, snowStartsAt: ts => `Droog tot <strong>${ts}</strong>, daarna sneeuw`,
    rainDry: 'Droog de komende 2 uur', rainPeakChance: 'Grootste kans', rainTotal: 'Totaal',
    rainChartAria: (list, total) => `Regen komende 2 uur: ${list}. Totaal ${total} mm.`,
    rainChartAriaDry: 'Regen komende 2 uur: droog.',
    rainChanceSr: 'kans op regen', unitKmh: 'km/u',
    metricTemp: 'Temperatuur', metricFeels: 'Gevoelstemperatuur', metricWind: 'Wind',
    metricGusts: 'Windstoten', metricPrecip: 'Neerslag', metricUv: 'UV-index',
    windDirs: ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'],
    weatherNames: { clear: 'Helder', partly: 'Half bewolkt', cloudy: 'Bewolkt', fog: 'Mist', drizzle: 'Motregen', rain: 'Regen', snow: 'Sneeuw', thunder: 'Onweer' },
    pollenTomorrow: 'Morgen',
    forecastNow: 'NU',
    lunchLabel: 'Lunch', afternoonLabel: 'Middagpauze', tomorrowLunch: 'Morgen lunch',
    dayLunch: day => `${day.charAt(0).toUpperCase()}${day.slice(1)} lunch`,
    countdownNow: 'Nu!', precipPreview: (p, snow) => `${p}% kans op ${snow ? 'sneeuw' : 'regen'}`,
    durationHM: (h, m) => (m ? `${h} u ${m} min` : `${h} u`), durationM: m => `${m} min`,
    durationDH: (d, h) => `${d} ${d === 1 ? 'dag' : 'dagen'} ${h} u`,
    bestMomentLabel: 'Beste moment', bestLeastWetLabel: 'Minst natte moment',
    bestMomentDry: 'droog',
    bestNoMore: 'Het venster 11:00 tot 15:00 is voorbij.',
    bestWeekend: 'Weekend: vandaag geen pauzevenster.',
    bestNoGoodLabel: 'Vandaag geen goed wandelmoment', bestLeastWetAt: ts => `Minst nat: ${ts}`,
    bestNoDry: 'Geen droog moment tussen 11:00 en 15:00.',
    sunLine: (sr, ss) => `Zon op ${sr} · onder ${ss}`,
    shareBtn: 'Collega\'s vragen',
    shareTitle: 'Pauzewandeling?',
    shareText: (options, verdict) => `Pauzewandeling? ${options}. Jasadvies nu: ${verdict}.`,
    shareOption: (ts, temp, dry) => `${ts} (${temp} °C${dry ? ', droog' : ''})`,
    shareCopied: 'Bericht gekopieerd. Plak het in de teamchat.',
    shareFallback: 'Kopieer deze tekst en plak hem in de teamchat:',
    yesterday: 'Gisteren', today: 'Vandaag', tomorrow: 'Morgen',
    better: 'Beter', worse: 'Minder', similar: 'Vergelijkbaar',
    compareSummary: (dir, dT, rainy) => {
      const base = dir === 'better' ? 'Morgen is beter wandelweer' : dir === 'worse' ? 'Morgen is minder wandelweer' : 'Morgen is ongeveer hetzelfde';
      const bits = [];
      if (Math.abs(dT) >= 1) bits.push(`${Math.abs(dT)}° ${dT > 0 ? 'warmer' : 'kouder'}`);
      if (rainy !== null) bits.push(rainy ? 'met regen' : 'droog');
      return bits.length ? `${base}: ${bits.join(', ')}.` : `${base}.`;
    },
    maxLabel: 'max', windLabel: w => `Wind ${w} km/u`, compareWindow: 'Tussen 11:00 en 15:00, het pauzevenster.',
    rainLabel: r => `Regen ${r} mm`,
    logTitle: 'Wie liep er mee?', logNobody: 'Wis selectie', logSave: 'Wandeling opslaan',
    logSaveCount: n => `Wandeling opslaan (${n})`,
    logLocalNote: 'Wordt alleen op dit toestel bewaard. Collega\'s zien dit niet.',
    logDeleteAria: (time, people) => `Verwijder wandeling van ${time}${people ? ` (${people})` : ''}`,
    logSaved: 'Opgeslagen', logEmpty: 'Nog geen wandelingen opgeslagen. Tik aan wie meeliep en kies Wandeling opslaan.',
    logShowOlder: n => `Oudere wandelingen tonen (${n})`,
    saveFailed: 'Opslaan op dit toestel lukte niet. Het blijft staan tot je de pagina sluit.',
    logNobodyWalked: '<em>Niemand meegelopen</em>',
    logWeather: (feels, rain) => [feels === null ? null : `${feels} °C`, rain ? `${rain} mm regen` : 'droog'].filter(Boolean).join(', '),
    toastDeleted: 'Wandeling verwijderd.', toastUndo: 'Ongedaan maken', toastClose: 'Melding sluiten',
    teamEdit: 'Team bewerken', teamAddLabel: 'Naam toevoegen', teamAdd: 'Toevoegen',
    teamReset: 'Standaardlijst terugzetten', teamRemove: name => `${name} verwijderen`,
    teamExists: 'Die naam staat er al.', teamEmpty: 'Nog geen namen. Voeg collega\'s toe via Team bewerken.',
    teamResetDone: 'Standaardlijst teruggezet.',
    logStatsTitle: 'Statistieken',
    statTotal: n => (n === 1 ? 'wandeling' : 'wandelingen'), statMonth: 'deze maand', statStreak: 'droge wandelingen op rij',
    statLoyal: (name, n) => `Trouwste loper deze maand: ${name} (${n}×)`,
    statBravest: (name, n) => `Dapperste: ${name}, ${n}× in de regen`,
    badges: {
      polarBear: ['IJsbeer', 'Gelopen onder 0 °C gevoelstemperatuur'],
      drownedCat: ['Verzopen kat', 'Gelopen bij 1 mm regen of meer'],
      stormBird: ['Stormvogel', 'Gelopen bij zware wind'],
      fullHouse: ['Volle bak', 'Met 8 of meer mensen gelopen'],
      sunSeeker: ['Zonaanbidder', 'Gelopen bij 25 °C of warmer'],
      regular: ['Vaste klant', '10 wandelingen gelogd'],
    },
    pollenLevelLabel: lvl => `Niveau: <strong>${lvl}</strong>`,
    pollenLevelNames: { 'very high': 'zeer hoog', high: 'hoog', low: 'laag' },
    pollenNames: { alder: 'Els', birch: 'Berk', grass: 'Grassen', mugwort: 'Bijvoet', ragweed: 'Ambrosia', olive: 'Olijf' },
    pollenHighPrefix: 'Hoog: ', pollenAllLow: 'Alle pollen laag',
    pollenAllLowSummary: 'Alle pollen laag. Geen hooikoortsweer.',
    pollenShowAll: 'Alle soorten tonen',
    pollenMeasured: time => `(gemeten ${time})`,
    pollenUnavailable: 'Pollendata is nu niet beschikbaar.', pollenUnit: 'korrels/m³',
    pollenItemLevel: { low: 'laag', medium: 'matig', high: 'hoog' },
    groupAlways: 'Altijd mee', groupSun: 'Zon', groupRain: 'Regen',
    groupCold: 'Kou', groupInfo: 'Info',
    checkPersPass: 'Personeelspas',
    checkBezPass: 'Bezoekerspas (check: heeft iemand een pas?)',
    checkPhone: 'Telefoon', checkSunglasses: 'Zonnebril (UV 3+)',
    checkSunscreen: 'Zonnebrandcrème SPF50+', checkHat: 'Pet of hoed (UV 7+)',
    checkUmbrella: 'Paraplu',
    checkWaterproof: 'Waterdichte tas/rugzak',
    checkScarf: 'Sjaal', checkGloves: 'Handschoenen',
    checkWater: 'Waterfles',
    checkRoute: 'Route: bij bezoekerspas → rotonde naar buiten',
    themeBtnLabel: (mode, isDark, next) => {
      const names = { auto: 'automatisch', dark: 'altijd donker', light: 'altijd licht' };
      const now = mode === 'auto' ? `automatisch (nu ${isDark ? 'donker' : 'licht'})` : names[mode];
      return `Thema: ${now}. Wisselt naar ${names[next]}.`;
    },
    langBtnLabel: 'EN, switch to English',
    seasonal: {
      kingsDay: 'Fijne Koningsdag! Oranje jas mag ook.',
      sinterklaas: 'Pakjesavond. Neem je wandeling vóór het donker wordt.',
      christmas: 'Fijne feestdagen. Een frisse neus tussen het eten door.',
      newYear: 'Gelukkig nieuwjaar. Goed voornemen: elke dag een rondje.',
      firstTerrace: 'Eerste terrasdag van het jaar: 20 °C of meer.',
      firstFrost: 'Eerste vorst van het seizoen. Handschoenen erbij.',
    },
    tourBtnTitle: 'Rondleiding bekijken',
    tourSkip: 'Overslaan', tourPrev: 'Vorige', tourNext: 'Volgende',
    tourDone: 'Klaar', tourClose: 'Rondleiding sluiten',
    tourStepOf: (a, b) => `Stap ${a} van ${b}`,
    tourAdviceTitle: 'Welkom: dit is het advies',
    tourAdviceText: 'Jas of geen jas voor de komende 30 minuten, met tips en een jas-o-meter. Na je pauze vraagt de app hoe het buiten was; zo leert hij jouw temperatuurgevoel.',
    tourPrefTitle: 'Jouw type en lunchtijd',
    tourPrefText: 'Snel koud of juist warm? Kies je type. Stel ook je lunchtijd in; daar rekent de app het beste pauzemoment op uit.',
    tourBreakTitle: 'Pauze en beste moment',
    tourBreakText: 'Aftellen naar je pauze, het droogste moment tussen 11:00 en 15:00, en een knop om collega\'s te vragen of ze meegaan.',
    tourMoreTitle: 'Taal, thema en locatie',
    tourMoreText: 'Rechtsboven wissel je taal en thema. Via het potlood bij de locatie kies je een andere plek. Met ? zie je deze rondleiding opnieuw.',
    dateLocale: 'nl-NL',
  },
  en: {
    tabAdvice: 'Advice', tabLog: 'Walk log', tabExplain: 'Guide', tabChangelog: "What's new",
    tabsLabel: 'Sections',
    h1Html: 'Jacket on or <span class="text-highlight-strong">not?</span>',
    lead: 'The unofficial DIGHV break scanner. Check before you head outside.',
    adviceLabel: 'Advice for the next 30 min',
    adviceUpdated: ts => `updated ${ts}`,
    yourType: 'Your type', prefCold: 'I feel the cold', prefNormal: 'Normal', prefWarm: 'I run warm',
    prefHint: 'How quickly do you get cold? We remember this on this device.',
    prefGroupLabel: 'Temperature preference',
    prefEdit: 'Change', prefCurrentLine: (type, lunch) => `${type} · lunch ${lunch}`,
    lunchTimeLabel: 'My lunch',
    calibrationNote: n => (n > 0 ? `Based on your feedback we count ${n} °C colder.` : `Based on your feedback we count ${-n} °C warmer.`),
    calibrationReset: 'Reset',
    calibrationLimit: 'Thanks. The advice is already at the maximum adjustment of 6 °C.',
    checklistTitle: 'What to bring outside?',
    nextBreak: 'Next break', currentConditions: 'Weather now',
    comingHours: 'Next few hours', forecastLabel: 'Hourly forecast',
    rainPer15: 'Rain per 15 minutes', next2hours: 'next 2 hours',
    pollenOverview: 'Pollen', todayVsTomorrow: 'Yesterday · today · tomorrow',
    footerHtml: 'Built by and for <strong>DIGHV</strong> · Weather data via Open&#8209;Meteo · Not an official ANWB product',
    pageTitle: 'Jacket or no jacket? | DIGHV Break advice',
    editLocation: 'Change location',
    versionLabel: n => `Version 1.${n} · `, footerWhatsNew: "What's new",
    meterCold: 'cold', meterWarm: 'warm',
    locationPanelTitle: 'Location',
    useCurrentLocationBtn: 'Use my location', resetLocationBtn: 'Back to ANWB HQ',
    locationSource: 'Weather via Open-Meteo · place name © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
    locationDefaultLabel: 'My location',
    locationCityLabel: city => `My location · ${city}`,
    locationSince: ms => `Saved since ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`,
    locationFetching: 'Getting location...', cityFetching: 'Looking up place name...',
    locationActive: 'Using your location.',
    locationActiveCity: city => `Using your location (${city}).`,
    locationNoGeo: 'Current location is not available in this browser.',
    locationDenied: "Your browser isn't sharing your location. Allow it in your browser settings, or use ANWB HQ.",
    locationFailed: "Couldn't find your location. Try again in a moment.",
    anwbHqActive: 'ANWB HQ active.',
    weatherLoading: 'Getting weather...', weatherError: 'No weather data. Check your connection and try again, or just look outside.', retry: 'Try again',
    dataFresh: 'just updated', dataAgeMin: mins => `updated ${mins} min ago`,
    dataAgeHours: h => `updated ${h} h ago`,
    staleBadge: 'NOT LIVE', staleNote: ts => `No fresh data. This advice is from ${ts}.`,
    feelsLine: f => `Feels like ${f} °C`, feelsForYou: f => ` · for you ${f} °C`,
    verdictNone: 'No jacket needed', jacketNone: 'Enjoy the weather',
    detailNone: "It's pleasantly warm. Nice weather for a walk.",
    verdictLight: 'Light jacket', jacketLight: 'Cardigan or windbreaker',
    detailLight: 'Mild, but not summery. A thin layer will keep you comfortable.',
    verdictAutumn: 'Jacket on', jacketAutumn: 'Autumn jacket',
    detailAutumn: 'Chilly out there. A regular jacket works fine for a short walk.',
    verdictWinter: 'Warm coat', jacketWinter: 'Winter coat',
    detailWinter: 'Cold. Put on something warm before you step outside.',
    verdictFreezing: 'Warm coat + layers', jacketFreezing: 'Winter coat + layers',
    detailFreezing: 'Properly cold. Wear a good winter coat with an extra layer underneath.',
    verdictRain: 'Rain jacket',
    detailRain: 'Warm enough, but rain is coming. Grab something waterproof.',
    verdictJacketRain: 'Waterproof jacket',
    detailJacketRain: 'Chilly and wet. A waterproof jacket keeps you dry.',
    detailJacketRainCold: 'Cold and wet. Wear a warm, waterproof coat.',
    verdictSnow: 'Warm coat, snow', detailSnow: 'It is snowing. Wear a warm coat and watch out for slippery paths.',
    verdictStorm: 'Better stay inside',
    detailThunder: 'Thunderstorm nearby. Wait with your walk until it has passed.',
    detailStorm: 'Gale-force wind. A walk is no fun right now; wait for a calmer moment.',
    tipUmbrella: 'Bring an umbrella', tipRainGear: 'Hood or rain jacket',
    tipRainChance: prob => `${prob}% chance of rain`,
    tipStormWind: 'Strong wind, umbrella is pointless', tipStrongWind: 'Strong wind',
    tipGusts: g => `Gusts up to ${g} km/h`,
    tipScarfGloves: 'Scarf and gloves', tipScarfNice: 'Scarf is a good idea', tipSlippery: 'Watch out for slippery paths',
    tipUvHigh: 'High UV: put on sunscreen', tipUvMid: 'Moderate UV: use sunscreen',
    tipMuggy: 'Muggy: bring water', tipFog: 'Fog: take care when crossing',
    tipPollenVeryHigh: 'Very high pollen. Hay fever? Bring your medication.',
    tipPollenHigh: 'Raised pollen, take care if you have hay fever',
    jacketLevels: { Freezing: 'layers', Winter: 'winter coat', Autumn: 'autumn jacket', Light: 'light jacket', None: 'no jacket' },
    jacketNeeds: { Freezing: 'a winter coat with layers', Winter: 'a winter coat', Autumn: 'an autumn jacket', Light: 'a light jacket' },
    jacketNear: (need, delta) => `${delta} °C colder and you'll need ${need}.`,
    jacketMeterLabel: (level, feel) => `Jacket meter: ${level}, ${feel} °C for you`,
    extremeThunder: ['Thunderstorm. The coffee machine counts as a walk too.', 'Lightning nearby. Wait inside until it has passed.'],
    extremeStorm: ['Feels like a weather warning. Hold on to your jacket (and yourself).', 'Gale. You can walk, but you will come back with a new hairdo.'],
    extremeHeat: ['Tropical. Find the shade and bring water.', 'Too warm for a jacket, and frankly for hurrying.'],
    extremeFrost: ['Bitter cold. Hat on, hands in pockets.', 'Freezing. A quick lap is still a lap.'],
    extremeSnow: ['Snow! Watch out for slippery pavements.', 'Snow. Snowballs after work hours, please.'],
    extremeFog: ['Fog. You will only see your colleagues once you are close.', 'Thick fog: stay on the pavement.'],
    weekendNote: 'Weekend! The advice applies, the break times do not.',
    feedbackQuestion: 'How was it outside?',
    feedbackCold: 'I was cold', feedbackOk: 'Just right', feedbackWarm: 'I was warm',
    feedbackSkip: "Didn't go out", feedbackSkipped: 'Fine, see you tomorrow.',
    feedbackThanks: 'Thanks. We will adjust the advice for you.',
    feedbackThanksOk: 'Great. We will keep it this way.',
    rainContinues: 'Rain continues for the next 3 hours', snowContinues: 'Snow continues for the next 3 hours',
    rainStopsSoon: 'Rain stops within 5 minutes', snowStopsSoon: 'Snow stops within 5 minutes',
    rainWait: (mins, ts) => `Wait ~${mins} min, dry around <strong>${ts}</strong>`,
    rainStartsAt: ts => `Dry until <strong>${ts}</strong>, then rain`, snowStartsAt: ts => `Dry until <strong>${ts}</strong>, then snow`,
    rainDry: 'Dry for the next 2 hours', rainPeakChance: 'Highest chance', rainTotal: 'Total',
    rainChartAria: (list, total) => `Rain in the next 2 hours: ${list}. Total ${total} mm.`,
    rainChartAriaDry: 'Rain in the next 2 hours: dry.',
    rainChanceSr: 'chance of rain', unitKmh: 'km/h',
    metricTemp: 'Temperature', metricFeels: 'Feels like', metricWind: 'Wind',
    metricGusts: 'Gusts', metricPrecip: 'Precipitation', metricUv: 'UV index',
    windDirs: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    weatherNames: { clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog', drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', thunder: 'Thunderstorm' },
    pollenTomorrow: 'Tomorrow',
    forecastNow: 'NOW',
    lunchLabel: 'Lunch', afternoonLabel: 'Afternoon break', tomorrowLunch: "Tomorrow's lunch",
    dayLunch: day => `${day} lunch`,
    countdownNow: 'Now!', precipPreview: (p, snow) => `${p}% chance of ${snow ? 'snow' : 'rain'}`,
    durationHM: (h, m) => (m ? `${h}h ${m}m` : `${h}h`), durationM: m => `${m} min`,
    durationDH: (d, h) => `${d}d ${h}h`,
    bestMomentLabel: 'Best moment', bestLeastWetLabel: 'Least wet moment',
    bestMomentDry: 'dry',
    bestNoMore: 'The 11:00 to 15:00 window has passed.',
    bestWeekend: 'Weekend: no break window today.',
    bestNoGoodLabel: 'No good moment for a walk today', bestLeastWetAt: ts => `Least wet: ${ts}`,
    bestNoDry: 'No dry moment between 11:00 and 15:00.',
    sunLine: (sr, ss) => `Sunrise ${sr} · sunset ${ss}`,
    shareBtn: 'Ask colleagues',
    shareTitle: 'Break walk?',
    shareText: (options, verdict) => `Break walk? ${options}. Jacket advice now: ${verdict}.`,
    shareOption: (ts, temp, dry) => `${ts} (${temp} °C${dry ? ', dry' : ''})`,
    shareCopied: 'Message copied. Paste it in the team chat.',
    shareFallback: 'Copy this text and paste it into the team chat:',
    yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow',
    better: 'Better', worse: 'Not as good', similar: 'Similar',
    compareSummary: (dir, dT, rainy) => {
      const base = dir === 'better' ? 'Tomorrow is better walking weather' : dir === 'worse' ? 'Tomorrow is worse walking weather' : 'Tomorrow is about the same';
      const bits = [];
      if (Math.abs(dT) >= 1) bits.push(`${Math.abs(dT)}° ${dT > 0 ? 'warmer' : 'colder'}`);
      if (rainy !== null) bits.push(rainy ? 'with rain' : 'dry');
      return bits.length ? `${base}: ${bits.join(', ')}.` : `${base}.`;
    },
    maxLabel: 'max', windLabel: w => `Wind ${w} km/h`, compareWindow: 'Between 11:00 and 15:00, the break window.',
    rainLabel: r => `Rain ${r} mm`,
    logTitle: 'Who joined the walk?', logNobody: 'Clear selection', logSave: 'Save walk',
    logSaveCount: n => `Save walk (${n})`,
    logLocalNote: 'Only stored on this device. Colleagues cannot see it.',
    logDeleteAria: (time, people) => `Delete walk at ${time}${people ? ` (${people})` : ''}`,
    logSaved: 'Saved', logEmpty: 'No walks saved yet. Tap who came along and choose Save walk.',
    logShowOlder: n => `Show older walks (${n})`,
    saveFailed: "Couldn't save on this device. It stays until you close the page.",
    logNobodyWalked: '<em>Nobody came along</em>',
    logWeather: (feels, rain) => [feels === null ? null : `${feels} °C`, rain ? `${rain} mm rain` : 'dry'].filter(Boolean).join(', '),
    toastDeleted: 'Walk deleted.', toastUndo: 'Undo', toastClose: 'Close message',
    teamEdit: 'Edit team', teamAddLabel: 'Add name', teamAdd: 'Add',
    teamReset: 'Restore default list', teamRemove: name => `Remove ${name}`,
    teamExists: 'That name is already on the list.', teamEmpty: 'No names yet. Add colleagues via Edit team.',
    teamResetDone: 'Default list restored.',
    logStatsTitle: 'Stats',
    statTotal: n => (n === 1 ? 'walk' : 'walks'), statMonth: 'this month', statStreak: 'dry walks in a row',
    statLoyal: (name, n) => `Most loyal walker this month: ${name} (${n}×)`,
    statBravest: (name, n) => `Bravest: ${name}, ${n}× in the rain`,
    badges: {
      polarBear: ['Polar bear', 'Walked below 0 °C feels-like'],
      drownedCat: ['Drowned rat', 'Walked in 1 mm of rain or more'],
      stormBird: ['Storm bird', 'Walked in a gale'],
      fullHouse: ['Full house', 'Walked with 8 or more people'],
      sunSeeker: ['Sun seeker', 'Walked at 25 °C or warmer'],
      regular: ['Regular', '10 walks logged'],
    },
    pollenLevelLabel: lvl => `Level: <strong>${lvl}</strong>`,
    pollenLevelNames: { 'very high': 'very high', high: 'high', low: 'low' },
    pollenNames: { alder: 'Alder', birch: 'Birch', grass: 'Grasses', mugwort: 'Mugwort', ragweed: 'Ragweed', olive: 'Olive' },
    pollenHighPrefix: 'High: ', pollenAllLow: 'All pollen low',
    pollenAllLowSummary: 'All pollen low. No hay fever weather.',
    pollenShowAll: 'Show all types',
    pollenMeasured: time => `(measured ${time})`,
    pollenUnavailable: 'Pollen data is not available right now.', pollenUnit: 'grains/m³',
    pollenItemLevel: { low: 'low', medium: 'moderate', high: 'high' },
    groupAlways: 'Always bring', groupSun: 'Sun', groupRain: 'Rain',
    groupCold: 'Cold', groupInfo: 'Info',
    checkPersPass: 'Staff pass',
    checkBezPass: 'Visitor pass (check: does someone have a pass?)',
    checkPhone: 'Phone', checkSunglasses: 'Sunglasses (UV 3+)',
    checkSunscreen: 'Sunscreen SPF50+', checkHat: 'Cap or hat (UV 7+)',
    checkUmbrella: 'Umbrella',
    checkWaterproof: 'Waterproof bag/backpack',
    checkScarf: 'Scarf', checkGloves: 'Gloves',
    checkWater: 'Water bottle',
    checkRoute: 'Route: with visitor pass → roundabout to exit',
    themeBtnLabel: (mode, isDark, next) => {
      const names = { auto: 'automatic', dark: 'always dark', light: 'always light' };
      const now = mode === 'auto' ? `automatic (now ${isDark ? 'dark' : 'light'})` : names[mode];
      return `Theme: ${now}. Switches to ${names[next]}.`;
    },
    langBtnLabel: 'NL, schakel naar Nederlands',
    seasonal: {
      kingsDay: "Happy King's Day! An orange jacket is fine too.",
      sinterklaas: 'Sinterklaas evening. Take your walk before dark.',
      christmas: 'Happy holidays. Some fresh air between meals.',
      newYear: 'Happy new year. Resolution: a lap every day.',
      firstTerrace: 'First terrace day of the year: 20 °C or more.',
      firstFrost: 'First frost of the season. Add gloves.',
    },
    tourBtnTitle: 'Show tour',
    tourSkip: 'Skip', tourPrev: 'Back', tourNext: 'Next',
    tourDone: 'Done', tourClose: 'Close tour',
    tourStepOf: (a, b) => `Step ${a} of ${b}`,
    tourAdviceTitle: 'Welcome: this is the advice',
    tourAdviceText: 'Jacket or no jacket for the next 30 minutes, with tips and a jacket meter. After your break the app asks how it was outside; that is how it learns how you feel the temperature.',
    tourPrefTitle: 'Your type and lunch time',
    tourPrefText: 'Cold quickly or always warm? Pick your type. Also set your lunch time; the app uses it to find the best moment for a walk.',
    tourBreakTitle: 'Break and best moment',
    tourBreakText: 'Counts down to your break, shows the driest moment between 11:00 and 15:00, and has a button to ask colleagues to join.',
    tourMoreTitle: 'Language, theme and location',
    tourMoreText: 'Top right you switch language and theme. The pencil next to the location lets you pick another place. The ? button replays this tour.',
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
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  if (appVersionCount) setAppVersion(appVersionCount);
  const explainEl = document.querySelector('.explain-content');
  if (explainEl) {
    explainEl.innerHTML = renderExplainHtml();
    buildExplainToc(explainEl);
  }
  const changelogEl = document.querySelector('.changelog-content');
  if (changelogEl) changelogEl.innerHTML = renderChangelogHtml();
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    // Zichtbare tekst staat vooraan in de naam (WCAG 2.5.3), in de taal van de knop.
    langBtn.textContent = lang === 'nl' ? 'EN' : 'NL';
    langBtn.lang = lang === 'nl' ? 'en' : 'nl';
    langBtn.setAttribute('aria-label', t('langBtnLabel'));
  }
  document.querySelector('.tabs-nav')?.setAttribute('aria-label', t('tabsLabel'));
  document.getElementById('forecast')?.setAttribute('aria-label', t('forecastLabel'));
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
  document.getElementById('teamAddInput')?.setAttribute('placeholder', t('teamAddLabel'));
  renderLunchOptions();
  renderPrefSummary();
  renderCalibrationNote();
  renderFeedbackRow();
  if (toastState && !document.getElementById('toast').hidden) renderToast();
  if (tourStep >= 0) showTourStep(tourStep);
  renderLocationUi();
  renderTeamEditor();
  renderLogHistory();
  applyDarkMode();
  updateClock();
  lastChecklistHtml = '';
  if (weatherData) render();
  else if (document.querySelector('#verdict .error')) showWeatherError();
  else { showWeatherLoading(); renderChecklist(); }
}

let liveChangelogReleases = [];

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
      // Commit-onderwerpen zijn externe tekst: escapen voordat ze in innerHTML komen.
      const subject = String(commit.subject).replace(/\s*\(#\d+\)\s*$/, '');
      if (/^Merge /.test(subject)) continue; // merge-commits zeggen niets over de app
      (byDate[isoDate] ||= []).push(subject);
    }

    liveChangelogReleases = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([isoDate, messages]) => {
        // Commitberichten zijn Nederlands; lang="nl" zodat een schermlezer ze goed uitspreekt.
        const items = messages.map(msg => ({ type: commitType(msg), text: escapeHtml(msg), lang: 'nl' }));
        return { isoDate, items: { nl: items, en: items } };
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
      isoDate: '2026-10-21',
      items: {
        nl: [
          { type: 'fix',     text: 'Advies kijkt nu echt naar de komende 30 minuten en herkent sneeuw, onweer, storm en windstoten' },
          { type: 'fix',     text: 'Eén mislukt verzoek of een kapotte opgeslagen waarde legt de app niet meer plat' },
          { type: 'new',     text: 'Jouw type en kalibratie: na de pauze aangeven hoe het buiten was, het advies past zich aan' },
          { type: 'new',     text: 'Beste moment per kwartier rond je eigen lunchtijd, en een knop om collega\'s te vragen' },
          { type: 'new',     text: 'Jas-o-meter, looplog met weer, statistieken en badges, ongedaan maken' },
          { type: 'improve', text: 'Rustiger ontwerp: advies bovenaan, minder ruis op mobiel, eigen donker thema' },
          { type: 'improve', text: 'Beter te bedienen met toetsenbord en schermlezer; korte rondleiding van 4 stappen' },
          { type: 'improve', text: 'Werkt offline met de laatst bekende data en laat zien hoe oud die is' },
          { type: 'new',     text: 'De pauzekaart zegt welke jas je om je lunchtijd nodig hebt' },
        ],
        en: [
          { type: 'fix',     text: 'Advice now really looks at the next 30 minutes and recognises snow, thunder, storms and gusts' },
          { type: 'fix',     text: 'One failed request or a broken stored value no longer breaks the app' },
          { type: 'new',     text: 'Your type and calibration: tell the app how it was outside and the advice adapts' },
          { type: 'new',     text: 'Best moment per quarter hour around your own lunch time, plus a button to ask colleagues' },
          { type: 'new',     text: 'Jacket meter, walk log with weather, stats and badges, undo' },
          { type: 'improve', text: 'Calmer design: advice first, less noise on mobile, a proper dark theme' },
          { type: 'improve', text: 'Better keyboard and screen reader support; short 4-step tour' },
          { type: 'improve', text: 'Works offline with the last known data and shows how old it is' },
          { type: 'new',     text: 'The break card tells you which jacket you need at your lunch time' },
        ]
      }
    },
    {
      isoDate: '2026-07-09',
      items: {
        nl: [{ type: 'new', text: 'Rondleiding bij het eerste bezoek langs de belangrijkste onderdelen; over te slaan en later opnieuw te openen' }],
        en: [{ type: 'new', text: 'Tour on your first visit along the main parts of the app; you can skip it and open it again later' }],
      }
    },
    {
      isoDate: '2026-06-30',
      items: {
        nl: [{ type: 'improve', text: 'Jasicoon bijgewerkt: lange mouwen en een rits over de hele lengte' }],
        en: [{ type: 'improve', text: 'Jacket icon updated: long sleeves and a full-length zip' }],
      }
    },
    {
      isoDate: '2026-06-26',
      items: {
        nl: [
          { type: 'fix',     text: 'UV-index werkt weer voor locaties in Nederland (het KNMI-model levert geen UV, die komt nu apart)' },
          { type: 'improve', text: 'Nieuw jasicoon met mouwen, kraag en rits' },
        ],
        en: [
          { type: 'fix',     text: 'UV index works again for locations in the Netherlands (the KNMI model has no UV, it is now fetched separately)' },
          { type: 'improve', text: 'New jacket icon with sleeves, collar and zip' },
        ],
      }
    },
    {
      isoDate: '2026-06-21',
      items: {
        nl: [
          { type: 'fix',     text: 'Regengrafiek en wachtstrook verschijnen weer' },
          { type: 'fix',     text: 'Vergelijking gisteren, vandaag en morgen gebruikt de juiste dagen; UV wordt op het goede moment gelezen' },
          { type: 'improve', text: 'Beter te gebruiken met schermlezer en toetsenbord; echte app-iconen voor installatie' },
          { type: 'new',     text: 'Regengrafiek toont de grootste kans op regen' },
        ],
        en: [
          { type: 'fix',     text: 'Rain chart and waiting strip show up again' },
          { type: 'fix',     text: 'Yesterday, today and tomorrow use the right days; UV is read at the right time' },
          { type: 'improve', text: 'Easier to use with a screen reader and keyboard; proper app icons for installing' },
          { type: 'new',     text: 'Rain chart shows the highest chance of rain' },
        ],
      }
    },
    {
      isoDate: '2026-06-07',
      items: {
        nl: [{ type: 'improve', text: 'Verzoeken voor weer- en pollendata bijgewerkt, met pollendata voor locaties in Europa' }],
        en: [{ type: 'improve', text: 'Requests for weather and pollen data updated, with pollen data for locations in Europe' }],
      }
    },
    {
      isoDate: '2026-05-13',
      items: {
        nl: [
          { type: 'fix',     text: 'Pollenbadge toonde altijd "zeer hoog" in april/mei door een vaste maandtabel. Nu gebaseerd op live meetwaarden' },
          { type: 'new',     text: 'Windrichting toegevoegd aan de windmetric (bv. ZW, NO)' },
          { type: 'new',     text: 'Pollenkaart toont nu ook de verwachte pollenwaarden voor morgen' },
          { type: 'new',     text: 'Zonsopgang en -ondergang zichtbaar in de "Beste pauzetijd"-kaart' },
          { type: 'new',     text: 'PWA-ondersteuning: app is installeerbaar als standalone app op mobiel en desktop (via browser-menu of adresbalk)' },
          { type: 'improve', text: 'De themaknop toont nu het huidige thema (🌙/☀️), met een kleine "A" in de automatische stand. Zo zie je of het thema automatisch of vast staat' },
          { type: 'improve', text: 'Dark mode-tooltip beschrijft nu wat klikken zal doen, niet alleen de huidige staat' },
          { type: 'new',     text: 'Versienummer toegevoegd in de footer (automatisch oplopend op basis van commits)' },
          { type: 'security','text': 'Lokale configuratie en looplog-data uit de repository gehaald' },
        ],
        en: [
          { type: 'fix',     text: 'Pollen badge always showed "very high" in April/May due to a fixed monthly table. Now based on live measurements' },
          { type: 'new',     text: 'Wind direction added to wind metric (e.g. SW, NE)' },
          { type: 'new',     text: 'Pollen card now also shows tomorrow\'s expected pollen values' },
          { type: 'new',     text: 'Sunrise and sunset times visible in the "Best break time" card' },
          { type: 'new',     text: 'PWA support: app can be installed as standalone app on mobile and desktop (via browser menu or address bar)' },
          { type: 'improve', text: 'The theme button now shows the current theme (🌙/☀️), with a small "A" in automatic mode. You can see whether the theme is automatic or fixed' },
          { type: 'improve', text: 'Dark mode tooltip now describes what clicking will do, not just the current state' },
          { type: 'new',     text: 'Version number added to footer (auto-increments with each commit)' },
          { type: 'security','text': 'Local configuration and walk log data removed from the repository' },
        ]
      }
    },
    {
      isoDate: '2026-05-08',
      items: {
        nl: [
          { type: 'new',     text: 'Taalswitch NL/EN toegevoegd: volledige vertaling van de gehele interface' },
          { type: 'new',     text: 'ANWB-stijl SVG-favicon toegevoegd' },
          { type: 'new',     text: 'Stadsnaam zichtbaar in de locatiebadge bij gebruik van GPS ("Huidige locatie · Amsterdam")' },
          { type: 'improve', text: 'GPS-nauwkeurigheid verbeterd: geen gecachte positie meer, langere timeout' },
          { type: 'improve', text: 'Beste pauzetijd beperkt tot het venster 11:00–15:00' },
          { type: 'fix',     text: 'Opgelost: "Nu meteen" verscheen ook buiten pauzetijden' },
          { type: 'fix',     text: 'Ruimte onder advieskaart op desktop verwijderd' },
          { type: 'new',     text: 'README toegevoegd aan de repository' },
        ],
        en: [
          { type: 'new',     text: 'NL/EN language toggle added: full translation of the entire interface' },
          { type: 'new',     text: 'ANWB-style SVG favicon added' },
          { type: 'new',     text: 'City name visible in location badge when using GPS ("Current location · Amsterdam")' },
          { type: 'improve', text: 'GPS accuracy improved: no cached position, longer timeout' },
          { type: 'improve', text: 'Best break time now limited to the 11:00–15:00 window' },
          { type: 'fix',     text: 'Fixed: "Right now" appeared outside break hours' },
          { type: 'fix',     text: 'Gap below advice card on desktop removed' },
          { type: 'new',     text: 'README added to the repository' },
        ]
      }
    },
    {
      isoDate: '2026-05-07',
      items: {
        nl: [
          { type: 'improve', text: 'Desktopweergave verbeterd: de kaart "Jouw type" en de uitlijning op brede schermen kloppen weer' },
          { type: 'improve', text: 'Locatieknop en "Jouw type" naar boven verplaatst voor betere volgorde' },
          { type: 'fix',     text: 'Dark mode hero-onderstreping aangepast' },
          { type: 'fix',     text: 'Mobiel schalen en dark mode-problemen opgelost' },
        ],
        en: [
          { type: 'improve', text: 'Desktop view improved: the "Your type" card and the alignment on wide screens are correct again' },
          { type: 'improve', text: 'Location button and "Your type" moved up for better flow' },
          { type: 'fix',     text: 'Dark mode hero underline adjusted' },
          { type: 'fix',     text: 'Mobile scaling and dark mode issues fixed' },
        ]
      }
    },
    {
      isoDate: '2026-04-28',
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
    new:      { label: lang === 'en' ? 'New'       : 'Nieuw',       cls: 'anwb-label--green' },
    fix:      { label: lang === 'en' ? 'Fix'       : 'Opgelost',    cls: 'anwb-label--red' },
    improve:  { label: lang === 'en' ? 'Improved'  : 'Verbeterd',   cls: 'anwb-label--lightblue' },
    security: { label: lang === 'en' ? 'Security'  : 'Beveiliging', cls: 'anwb-label--grey' },
  };

  const today = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Amsterdam' });
  // Commits tonen we alleen als ze nieuwer zijn dan de laatste handgeschreven
  // release; daarvoor staat er al een leesbare tekst in beide talen.
  const latestCurated = releases.reduce((max, r) => (r.isoDate > max ? r.isoDate : max), '');
  const allReleases = [...liveChangelogReleases.filter(r => r.isoDate > latestCurated), ...releases]
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  const dateFmt = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  const title = lang === 'en' ? 'Release log' : 'Releaselog';
  const intro = lang === 'en'
    ? 'An overview of all changes, grouped by release date.'
    : 'Een overzicht van alle wijzigingen, gegroepeerd per releasedatum.';

  let html = `<h1>${title}</h1><p class="intro">${intro}</p>`;

  for (const release of allReleases) {
    const date = dateFmt.format(new Date(release.isoDate + 'T12:00:00Z'));
    const isToday = release.isoDate === today;
    const todayTag = isToday ? (lang === 'en' ? 'Today' : 'Vandaag') : null;
    const staticTag = lang === 'en' ? release.tagEn : release.tag;
    const tag = todayTag || staticTag;
    const items = lang === 'en' ? release.items.en : release.items.nl;

    html += `<div class="cl-release context-default">
      <div class="cl-header">
        <h2 class="cl-date prose-heading-small">${date}</h2>
        ${tag ? `<span class="cl-tag anwb-label anwb-label--small anwb-label--yellow">${tag}</span>` : ''}
      </div>
      <ul class="cl-items">`;

    for (const item of items) {
      const cfg = typeConfig[item.type] || typeConfig.new;
      html += `<li class="cl-item">
        <span class="cl-badge anwb-label anwb-label--small ${cfg.cls}">${cfg.label}</span>
        <span class="cl-text"${item.lang ? ` lang="${item.lang}"` : ''}>${item.text}</span>
      </li>`;
    }

    html += `</ul></div>`;
  }

  return html;
}

// Inhoudsopgave bovenaan de uitleg. De links (#uitleg-N) kiezen ook het tabblad.
function buildExplainToc(root) {
  const sections = [...root.querySelectorAll('.explain-section h2')];
  const nav = document.createElement('nav');
  nav.className = 'toc';
  nav.setAttribute('aria-label', lang === 'en' ? 'Contents' : 'Inhoud');
  sections.forEach((h, i) => {
    h.id = `uitleg-${i + 1}`;
    h.tabIndex = -1;
    const link = document.createElement('a');
    link.href = `#${h.id}`; // werkt ook in een nieuw tabblad, zie selectTabFromHash
    link.textContent = h.textContent.replace(/^\d+\.\s*/, '');
    link.addEventListener('click', e => {
      e.preventDefault();
      h.closest('.explain-section').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      h.focus({ preventScroll: true });
    });
    nav.appendChild(link);
  });
  root.querySelector('.intro')?.after(nav);
}

function renderExplainHtml() {
  if (lang === 'en') return `
    <h1>How it works</h1>
    <p class="intro">The advice comes from live weather data and a few fixed thresholds. Here they are.</p>
    <div class="explain-section context-default">
      <h2>1. Data source</h2>
      <p>Every 10 minutes the tool fetches weather data from <strong>Open-Meteo</strong> and pollen data from the <strong>Open-Meteo Air Quality API</strong>. For locations in the Netherlands it uses the KNMI model. A hidden tab does not refresh; it does as soon as you come back or the connection returns. The version number and release log come from the <strong>GitHub API</strong>; those requests are kept for a few hours.</p>
      <p>Default location: <code>52.0964° N, 4.3268° E</code>, ANWB headquarters in The Hague. Via the pencil the app can use your current location (rounded to about 100 metres; place name from OpenStreetMap). That choice is kept until you switch back to ANWB HQ.</p>
      <div class="callout anwb-alert anwb-alert--informative"><strong>Live check:</strong> the green LIVE dot means the data is fresh; the advice card shows when it was updated. When opening, the app immediately shows the last known data (at most 6 hours old). Data older than half an hour shows as NOT LIVE, with the time of the advice.</div>
    </div>
    <div class="explain-section context-default">
      <h2>2. What is measured?</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Signal</th><th>Used for</th></tr>
        <tr><td>Feels-like temperature (now)</td><td>Jacket type (accounts for wind, humidity and sun)</td></tr>
        <tr><td>Temperature</td><td>Lowest of now and the next hour; for scarf and gloves</td></tr>
        <tr><td>Wind and gusts</td><td>Tips, and whether an umbrella still makes sense</td></tr>
        <tr><td>Precipitation and chance of rain</td><td>For the <strong>now + 30 minutes</strong> window: amounts from the 15-minute forecast, chance from the hourly forecast</td></tr>
        <tr><td>Dew point</td><td>From 18 °C it feels muggy: bring water</td></tr>
        <tr><td>Weather type</td><td>Thunderstorms, snow and fog get their own advice or tip</td></tr>
      </table>
    </div>
    <div class="explain-section context-default">
      <h2>3. Jacket type and jacket meter</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Feels-like (for you)</th><th>Jacket type</th></tr>
        <tr><td>17 °C or warmer</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">No jacket</span></td></tr>
        <tr><td>12 to 17 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Light jacket</span></td></tr>
        <tr><td>5 to 12 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Autumn jacket</span></td></tr>
        <tr><td>0 to 5 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Winter coat</span></td></tr>
        <tr><td>below 0 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Winter coat + layers</span></td></tr>
      </table>
      <p>The jacket meter shows where you are on this scale. Within 2 °C of the next jacket, it tells you how many degrees colder it needs to be.</p>
    </div>
    <div class="explain-section context-default">
      <h2>4. Your type and calibration</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Type</th><th>Offset</th></tr>
        <tr><td>I feel the cold</td><td>3 °C colder</td></tr>
        <tr><td>Normal</td><td><code>0</code></td></tr>
        <tr><td>I run warm</td><td>5 °C warmer</td></tr>
      </table>
      <p>After your lunch on workdays the app asks how it was outside. "I was cold" makes the advice count 1 °C colder, "I was warm" 1 °C warmer, up to 6 °C. Below the advice you see "for you X °C" whenever an adjustment applies; under "Your type" you can reset it.</p>
    </div>
    <div class="explain-section context-default">
      <h2>5. Rain, snow and storms take priority</h2>
      <p>If more than <code>0.5 mm</code> per hour falls in the now + 30 minutes window <strong>or</strong> the chance of rain is <code>70%</code> or higher, the advice becomes "Waterproof jacket" (from 15 °C: "Rain jacket"; with snow: "Warm coat, snow"). With a chance of <code>30%</code> to <code>70%</code> you only get a tip.</p>
      <p>A thunderstorm, wind from <code>60 km/h</code> or gusts from <code>75 km/h</code> give "Better stay inside". From <code>40 km/h</code> wind or <code>50 km/h</code> gusts an umbrella is pointless; the app then suggests a hood or rain jacket.</p>
    </div>
    <div class="explain-section context-default">
      <h2>6. Break and best moment</h2>
      <p>The countdown runs to your own lunch time (set under "Your type") and the afternoon break at 15:00. During the break it says "Now!". After Friday afternoon it counts to Monday.</p>
      <p>The best moment is a 30-minute block between 11:00 and 15:00, in steps of 15 minutes. Dry weighs most, then closeness to your lunch time, then temperature. If even the best block is wet, it is called "Least wet moment". "Ask colleagues" shares the two or three best times via your phone's share menu, or copies them; not in a storm. At the weekend there is no best moment.</p>
      <p>When rain starts or stops within 3 hours, the strip in the advice card says when.</p>
    </div>
    <div class="explain-section context-default">
      <h2>7. Extra tips</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Condition</th><th>Tip</th></tr>
        <tr><td>Gusts from 50 km/h</td><td>Gusts up to … km/h</td></tr>
        <tr><td>Wind from 40 km/h</td><td>Umbrella is pointless</td></tr>
        <tr><td>Wind from 25 km/h</td><td>Strong wind</td></tr>
        <tr><td>Temperature 3 °C or lower</td><td>Scarf and gloves</td></tr>
        <tr><td>Temperature 8 °C or lower</td><td>Scarf is a good idea</td></tr>
        <tr><td>UV index ≥ 7 / ≥ 3</td><td>Put on sunscreen / use sunscreen</td></tr>
        <tr><td>Dew point ≥ 18 °C</td><td>Muggy: bring water</td></tr>
        <tr><td>Fog</td><td>Take care when crossing</td></tr>
        <tr><td>High pollen (measured)</td><td>Hay fever tip; no pollen data means no tip</td></tr>
      </table>
    </div>
    <div class="explain-section context-default">
      <h2>8. Checklist</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Condition</th><th>Items</th></tr>
        <tr><td><strong>Always</strong></td><td>Staff pass, visitor pass check, phone, route info</td></tr>
        <tr><td>UV index ≥ 3 / ≥ 7</td><td>Sunglasses, sunscreen / cap or hat</td></tr>
        <tr><td>Muggy or 25 °C+</td><td>Water bottle</td></tr>
        <tr><td>Rain chance ≥ 30% or rain, no snow or strong wind</td><td>Umbrella</td></tr>
        <tr><td>Rain chance ≥ 50% or rain</td><td>Waterproof bag</td></tr>
        <tr><td>Temp ≤ 8 / ≤ 3 °C</td><td>Scarf / gloves</td></tr>
      </table>
      <p>Jackets are not on the list: the advice already says which one you need.</p>
      <div class="callout anwb-alert anwb-alert--informative"><strong>Saved:</strong> ticks are kept for the rest of the day. "Always bring" folds away once everything is ticked.</div>
    </div>
    <div class="explain-section context-default">
      <h2>9. Pollen</h2>
      <p>Live concentrations in grains per m³. When everything is low you see one line; the types are behind "Show all types". Without pollen data (or outside Europe) the card says so.</p>
      <table class="threshold-table anwb-table">
        <tr><th>Type</th><th>High from</th></tr>
        <tr><td>Alder, birch, olive</td><td>&gt; 20 grains/m³</td></tr>
        <tr><td>Grasses</td><td>&gt; 50 grains/m³</td></tr>
        <tr><td>Mugwort, ragweed</td><td>&gt; 10 grains/m³</td></tr>
      </table>
    </div>
    <div class="explain-section context-default">
      <h2>10. Walk log</h2>
      <p>Only stored on this device; colleagues cannot see it. Each walk saves a weather snapshot. That gives stats (walks, dry streak, most loyal and bravest walker) and badges such as Polar bear and Drowned rat. You can edit the team per device, and undo a deletion for a few seconds.</p>
    </div>
    <div class="explain-section context-default">
      <h2>11. Theme</h2>
      <p>The theme button (moon or sun, top right) cycles through <strong>Automatic</strong> (device setting, and dark after sunset), <strong>Always dark</strong> and <strong>Always light</strong>. The small A means automatic.</p>
    </div>
    <div class="explain-section disclaimer context-strong">
      <h2>Disclaimer</h2>
      <p>A side project by the DIGHV team. Not an official ANWB product. The thresholds are based on common sense, not meteorological research. If you get wet: not our fault.</p>
    </div>`;

  return `
    <h1>Hoe werkt dit?</h1>
    <p class="intro">Het advies komt uit live weerdata en een paar vaste drempels. Hieronder staat welke.</p>
    <div class="explain-section context-default">
      <h2>1. Databron</h2>
      <p>Elke 10 minuten haalt de tool weerdata op van <strong>Open-Meteo</strong> en pollendata van de <strong>Open-Meteo Air Quality API</strong>. Voor locaties in Nederland gebruikt hij het KNMI-model. In een verborgen tabblad wordt niet ververst; zodra je terugkomt of de verbinding terug is wel. Versienummer en releaselog komen van de <strong>GitHub-API</strong>; die gegevens bewaart de app een paar uur.</p>
      <p>Standaardlocatie: <code>52.0964° N, 4.3268° O</code>, het ANWB-hoofdkantoor in Den Haag. Via het potlood kan de app je huidige locatie gebruiken (afgerond op ongeveer 100 meter; plaatsnaam via OpenStreetMap). Die keuze blijft bewaard tot je terugschakelt naar ANWB HQ.</p>
      <div class="callout anwb-alert anwb-alert--informative"><strong>Live check:</strong> het groene LIVE-bolletje betekent dat de data vers is; in de advieskaart staat wanneer hij is bijgewerkt. Bij openen toont de app meteen de laatst bekende data (hoogstens 6 uur oud). Data ouder dan een half uur staat als NIET LIVE, met het tijdstip van het advies.</div>
    </div>
    <div class="explain-section context-default">
      <h2>2. Wat wordt er gemeten?</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Signaal</th><th>Gebruikt voor</th></tr>
        <tr><td>Gevoelstemperatuur (nu)</td><td>Jastype (houdt rekening met wind, vocht en zon)</td></tr>
        <tr><td>Temperatuur</td><td>Laagste van nu en het volgende uur; voor sjaal en handschoenen</td></tr>
        <tr><td>Wind en windstoten</td><td>Tips, en of een paraplu nog zin heeft</td></tr>
        <tr><td>Neerslag en regenkans</td><td>Voor het venster <strong>nu + 30 minuten</strong>: hoeveelheid uit de kwartierverwachting, kans uit de uurverwachting</td></tr>
        <tr><td>Dauwpunt</td><td>Vanaf 18 °C voelt het benauwd: neem water mee</td></tr>
        <tr><td>Weertype</td><td>Onweer, sneeuw en mist krijgen een eigen advies of tip</td></tr>
      </table>
    </div>
    <div class="explain-section context-default">
      <h2>3. Jastype en jas-o-meter</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Gevoelstemperatuur (voor jou)</th><th>Jastype</th></tr>
        <tr><td>17 °C of warmer</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Geen jas</span></td></tr>
        <tr><td>12 tot 17 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Dun jasje</span></td></tr>
        <tr><td>5 tot 12 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Herfstjas</span></td></tr>
        <tr><td>0 tot 5 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Winterjas</span></td></tr>
        <tr><td>onder 0 °C</td><td><span class="badge-inline anwb-label anwb-label--small anwb-label--yellow">Winterjas + laagjes</span></td></tr>
      </table>
      <p>De jas-o-meter laat zien waar je op deze schaal zit. Zit je binnen 2 °C van de volgende jas, dan staat erbij hoeveel graden kouder het moet worden.</p>
    </div>
    <div class="explain-section context-default">
      <h2>4. Jouw type en kalibratie</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Type</th><th>Correctie</th></tr>
        <tr><td>Kouwelijk</td><td>3 °C kouder</td></tr>
        <tr><td>Normaal</td><td><code>0</code></td></tr>
        <tr><td>Warmbloedig</td><td>5 °C warmer</td></tr>
      </table>
      <p>Na je lunch vraagt de app op werkdagen hoe het buiten was. Bij "Ik had het koud" rekent het advies 1 °C kouder, bij "Ik had het warm" 1 °C warmer, tot maximaal 6 °C. Onder het advies zie je "voor jou X °C" zodra er een bijstelling geldt; onder "Jouw type" zet je hem terug.</p>
    </div>
    <div class="explain-section context-default">
      <h2>5. Regen, sneeuw en storm gaan voor</h2>
      <p>Valt er in het venster nu + 30 minuten meer dan <code>0,5 mm</code> per uur <strong>of</strong> is de regenkans <code>70%</code> of hoger, dan wordt het advies "Waterdichte jas" (vanaf 15 °C: "Regenjas"; bij sneeuw: "Dikke jas, sneeuw"). Bij <code>30%</code> tot <code>70%</code> krijg je alleen een tip.</p>
      <p>Onweer, wind vanaf <code>60 km/u</code> of windstoten vanaf <code>75 km/u</code> geven "Blijf liever binnen". Vanaf <code>40 km/u</code> wind of <code>50 km/u</code> windstoten is een paraplu zinloos; dan adviseert de app een capuchon of regenjas.</p>
    </div>
    <div class="explain-section context-default">
      <h2>6. Pauze en beste moment</h2>
      <p>De countdown loopt naar je eigen lunchtijd (in te stellen onder "Jouw type") en de middagpauze om 15:00. Tijdens de pauze staat er "Nu!". Na vrijdagmiddag telt hij af naar maandag.</p>
      <p>Het beste moment is een blok van 30 minuten tussen 11:00 en 15:00, in stappen van een kwartier. Droog weegt het zwaarst, daarna hoe dicht het bij je lunchtijd ligt, dan de temperatuur. Is zelfs het beste blok nat, dan heet het "Minst natte moment". "Collega's vragen" deelt de twee of drie beste tijdstippen via het deelmenu van je telefoon, of kopieert ze; niet bij storm. In het weekend is er geen beste moment.</p>
      <p>Begint of stopt de regen binnen 3 uur, dan staat in de strook in de advieskaart wanneer.</p>
    </div>
    <div class="explain-section context-default">
      <h2>7. Extra tips</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Conditie</th><th>Tip</th></tr>
        <tr><td>Windstoten vanaf 50 km/u</td><td>Windstoten tot … km/u</td></tr>
        <tr><td>Wind vanaf 40 km/u</td><td>Paraplu is kansloos</td></tr>
        <tr><td>Wind vanaf 25 km/u</td><td>Stevige wind</td></tr>
        <tr><td>Temperatuur 3 °C of lager</td><td>Sjaal en handschoenen</td></tr>
        <tr><td>Temperatuur 8 °C of lager</td><td>Sjaal is fijn</td></tr>
        <tr><td>UV-index ≥ 7 / ≥ 3</td><td>Zonnebrand smeren / smeer je in</td></tr>
        <tr><td>Dauwpunt ≥ 18 °C</td><td>Benauwd: neem water mee</td></tr>
        <tr><td>Mist</td><td>Kijk goed uit bij het oversteken</td></tr>
        <tr><td>Hoge pollen (gemeten)</td><td>Hooikoortstip; zonder pollendata geen tip</td></tr>
      </table>
    </div>
    <div class="explain-section context-default">
      <h2>8. Checklist</h2>
      <table class="threshold-table anwb-table">
        <tr><th>Conditie</th><th>Items</th></tr>
        <tr><td><strong>Altijd</strong></td><td>Personeelspas, bezoekerspas-check, telefoon, route-info</td></tr>
        <tr><td>UV-index ≥ 3 / ≥ 7</td><td>Zonnebril, zonnebrandcrème / pet of hoed</td></tr>
        <tr><td>Benauwd of 25 °C+</td><td>Waterfles</td></tr>
        <tr><td>Regenkans ≥ 30% of regen, geen sneeuw of harde wind</td><td>Paraplu</td></tr>
        <tr><td>Regenkans ≥ 50% of regen</td><td>Waterdichte tas</td></tr>
        <tr><td>Temp ≤ 8 / ≤ 3 °C</td><td>Sjaal / handschoenen</td></tr>
      </table>
      <p>Jassen staan niet in de lijst: welke jas je nodig hebt, zegt het advies al.</p>
      <div class="callout anwb-alert anwb-alert--informative"><strong>Opgeslagen:</strong> afvinkjes gelden voor de rest van de dag. "Altijd mee" klapt in zodra alles is afgevinkt.</div>
    </div>
    <div class="explain-section context-default">
      <h2>9. Pollen</h2>
      <p>Live concentraties in korrels per m³ lucht. Is alles laag, dan zie je één regel; de soorten staan achter "Alle soorten tonen". Zonder pollendata (of buiten Europa) staat dat er.</p>
      <table class="threshold-table anwb-table">
        <tr><th>Soort</th><th>Hoog vanaf</th></tr>
        <tr><td>Els, berk, olijf</td><td>&gt; 20 korrels/m³</td></tr>
        <tr><td>Grassen</td><td>&gt; 50 korrels/m³</td></tr>
        <tr><td>Bijvoet, ambrosia</td><td>&gt; 10 korrels/m³</td></tr>
      </table>
    </div>
    <div class="explain-section context-default">
      <h2>10. Looplog</h2>
      <p>Wordt alleen op dit toestel bewaard; collega's zien het niet. Bij elke wandeling bewaart de app een weersnapshot. Daaruit komen statistieken (wandelingen, droge wandelingen op rij, trouwste en dapperste loper) en badges zoals IJsbeer en Verzopen kat. Het team pas je per toestel aan, en een verwijderde wandeling kun je een paar seconden lang terugzetten.</p>
    </div>
    <div class="explain-section context-default">
      <h2>11. Thema</h2>
      <p>Met de themaknop rechtsboven (maan of zon) wissel je tussen <strong>Automatisch</strong> (apparaatinstelling, en donker na zonsondergang), <strong>Altijd donker</strong> en <strong>Altijd licht</strong>. De kleine A betekent automatisch.</p>
    </div>
    <div class="explain-section disclaimer context-strong">
      <h2>Disclaimer</h2>
      <p>Een hobbyproject van het DIGHV-team. Geen officieel ANWB-product. De drempels zijn gebaseerd op gezond verstand, niet op meteorologisch onderzoek. Als je nat wordt: niet onze schuld.</p>
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
    lon: Number(lon.toFixed(6)),
    savedAt: mode === 'current' && Number.isFinite(location.savedAt) ? location.savedAt : null
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
  return dateKeyInZone(date, 'Europe/Amsterdam');
}

// Zon op/onder als minuten van de dag, bewaard voor theme-init.js: zo staat het
// automatische thema na zonsondergang meteen goed, ook voordat de data binnen is.
const SUN_KEY = 'dighv_sun';
function rememberSunTimes() {
  const idx = weatherData?.daily?.time?.indexOf(getAmsterdamDateKey(new Date())) ?? -1;
  const rise = new Date(weatherData?.daily?.sunrise?.[idx]);
  const set = new Date(weatherData?.daily?.sunset?.[idx]);
  if (idx < 0 || Number.isNaN(rise.getTime()) || Number.isNaN(set.getTime())) return;
  localStorage_safe_set(SUN_KEY, `${minutesOfDay(rise)},${minutesOfDay(set)}`);
}
function storedDayTime(date) {
  const [rise, set] = String(localStorage_safe_get(SUN_KEY) || '').split(',').map(Number);
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return true;
  const mins = minutesOfDay(date);
  return mins >= rise && mins <= set;
}

function isDayTime(date) {
  if (!weatherData || !weatherData.daily) return storedDayTime(date);
  const daily = weatherData.daily;
  const todayKey = getAmsterdamDateKey(date);
  const todayIndex = Array.isArray(daily.time) ? daily.time.findIndex(day => day === todayKey) : -1;
  const index = todayIndex >= 0 ? todayIndex : 0;
  const sunrise = new Date(daily.sunrise?.[index]);
  const sunset = new Date(daily.sunset?.[index]);
  if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) return true;
  return date >= sunrise && date <= sunset;
}


// ─── Thema ───────────────────────────────────────────────────────────────────
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', () => {
  if (darkModeForced === 'auto') applyDarkMode();
});

function isAutoDark() {
  const deviceDark = darkModeMediaQuery.matches;
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

const THEME_ICONS = {
  moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
};

function applyDarkMode() {
  const darkMode = darkModeForced === 'auto' ? isAutoDark() : darkModeForced === 'dark';
  document.documentElement.classList.toggle('dark', darkMode);
  const btn = document.getElementById('darkModeToggle');
  if (btn) {
    // De kleine A betekent: automatisch.
    btn.innerHTML = (darkMode ? THEME_ICONS.moon : THEME_ICONS.sun)
      + (darkModeForced === 'auto' ? '<span class="auto-mark" aria-hidden="true">A</span>' : '');
    const label = t('themeBtnLabel', darkModeForced, darkMode, nextThemeMode());
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}

// ─── Opslag ──────────────────────────────────────────────────────────────────
// Wat niet in localStorage past (vol of geblokkeerd) staat in memStore; die gaat voor,
// anders lees je na een mislukte schrijfactie de oude waarde terug.
function localStorage_safe_get(key) {
  if (Object.prototype.hasOwnProperty.call(memStore, key)) return memStore[key];
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function localStorage_safe_set(key, val) {
  try { localStorage.setItem(key, val); delete memStore[key]; return true; } catch (e) { memStore[key] = val; return false; }
}
function localStorage_safe_remove(key) {
  delete memStore[key];
  try { localStorage.removeItem(key); } catch (e) { /* niets te doen */ }
}
// Voor gegevens die de gebruiker zelf invoert: bij een volle opslag eerst de
// weercache opruimen, en anders melden dat het alleen tijdelijk bewaard is.
function saveImportant(key, val) {
  if (localStorage_safe_set(key, val)) return true;
  try { localStorage.removeItem(DATA_CACHE_KEY); } catch (e) { /* geblokkeerd */ }
  if (localStorage_safe_set(key, val)) return true;
  showToast('saveFailed');
  return false;
}
function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage_safe_get(key) || 'null');
    return v ?? fallback;
  } catch (e) { return fallback; }
}

// ─── Locatie-UI ──────────────────────────────────────────────────────────────
function setLocationPanelOpen(open) {
  const panel = document.getElementById('locationPanel');
  const btn = document.getElementById('locationEditBtn');
  if (!panel || !btn) return;
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
}

// Status als vertaalsleutel bewaren, zodat hij bij een taalwissel mee vertaalt.
let locationStatusState = null;
function setLocationStatus(key, ...args) {
  locationStatusState = key ? { key, args } : null;
  const status = document.getElementById('locationStatus');
  if (status) status.textContent = key ? t(key, ...args) : '';
}

function setLocationButtonsDisabled(disabled) {
  ['useCurrentLocationBtn', 'resetLocationBtn', 'locationEditBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled || (id === 'resetLocationBtn' && isDefaultLocation());
  });
}

// status: undefined = huidige status houden, null = leeg, [sleutel, ...args] = nieuw.
function renderLocationUi(status) {
  const labelEl = document.getElementById('locationLabel');
  const panelCoords = document.getElementById('locationPanelCoords');
  const resetBtn = document.getElementById('resetLocationBtn');
  if (labelEl) labelEl.textContent = getLocationLabel();
  if (panelCoords) panelCoords.textContent = formatCoords();
  if (resetBtn) resetBtn.disabled = isDefaultLocation();
  if (status !== undefined) setLocationStatus(...(status || [null]));
  else if (locationStatusState) setLocationStatus(locationStatusState.key, ...locationStatusState.args);
  else if (currentLocation.mode === 'current' && currentLocation.savedAt) {
    // De eigen locatie blijft bewaard; laat zien sinds wanneer. De datum wordt
    // pas in de vertaling opgemaakt, zodat hij meewisselt van taal.
    setLocationStatus('locationSince', currentLocation.savedAt);
  }
}

function showWeatherLoading() {
  const verdict = document.getElementById('verdict');
  if (verdict) verdict.innerHTML = `<div class="loading"><span class="spinner" aria-hidden="true"></span>${t('weatherLoading')}</div>`;
  ['detail', 'feels'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  const tips = document.getElementById('tips');
  if (tips) tips.innerHTML = '';
  const meter = document.getElementById('jacketMeter');
  if (meter) meter.hidden = true;
  setNoData(true);
}

function setAppLocation(location, message) {
  currentLocation = sanitizeLocation(location);
  persistLocation(currentLocation);
  // De offline-kopie van de weerdata hoort bij de vorige plek (met coördinaten).
  if ('caches' in window) caches.delete('dighv-api').catch(() => {});
  weatherData = null;
  pollenData = null;
  lastUpdate = null;
  showWeatherLoading();
  updateClock();
  renderLocationUi(message || null);
  fetchWeather();
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setLocationStatus('locationNoGeo');
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
  setLocationStatus('locationFetching');
  navigator.geolocation.getCurrentPosition(
    position => {
      // Op ~100 m afronden: genoeg voor het weer, en we bewaren of versturen
      // geen exacte positie.
      const lat = Math.round(position.coords.latitude * 1000) / 1000;
      const lon = Math.round(position.coords.longitude * 1000) / 1000;
      setLocationStatus('cityFetching');
      fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=${lang}`, 8000)
        .then(r => r.json())
        .then(data => {
          const a = data.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.county || null;
          const msg = city ? ['locationActiveCity', city] : ['locationActive'];
          done();
          setAppLocation({ mode: 'current', city, lat, lon, savedAt: Date.now() }, msg);
        })
        .catch(() => {
          done();
          setAppLocation({ mode: 'current', city: null, lat, lon, savedAt: Date.now() }, ['locationActive']);
        });
    },
    error => {
      done();
      const denied = error.code === error.PERMISSION_DENIED;
      setLocationStatus(denied ? 'locationDenied' : 'locationFailed');
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
    setAppLocation({ ...DEFAULT_LOCATION }, ['anwbHqActive']);
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

// ─── Tabs (ARIA-tabs: pijltjes/Home/End) + #hash ─────────────────────────────
const tabs = [...document.querySelectorAll('.tab')];
const TAB_HASHES = { advice: '', log: '#log', explain: '#uitleg', changelog: '#releaselog' };

function selectTab(tab, focus, scroll = true) {
  const target = tab.dataset.tab;
  tabs.forEach(other => {
    const active = other === tab;
    other.classList.toggle('active', active);
    setUiState(other, active, UI.tabOn, UI.tabOff);
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
  // Deelbare links en app-snelkoppelingen (manifest shortcuts) naar een tab.
  const hash = TAB_HASHES[target] ?? '';
  if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
  if (scroll) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}

// Ook #uitleg-3 en dergelijke (inhoudsopgave, gekopieerde link) openen de uitleg,
// op die paragraaf. Na een klik op een link (hashchange) naar boven, bij het laden niet.
function selectTabFromHash(event) {
  const section = /^#uitleg-\d+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
  const name = section ? 'explain' : Object.keys(TAB_HASHES).find(k => TAB_HASHES[k] && TAB_HASHES[k] === location.hash);
  const tab = tabs.find(tb => tb.dataset.tab === (name || 'advice'));
  if (tab && !tab.classList.contains('active')) selectTab(tab, false, !!event && !section);
  if (section) {
    section.closest('.explain-section').scrollIntoView();
    section.focus({ preventScroll: true });
  }
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
window.addEventListener('hashchange', selectTabFromHash);

// ─── Klok en versheid ────────────────────────────────────────────────────────
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
  // Ook op mobiel (waar de klok verborgen is) zichtbaar hoe vers het advies is.
  const updated = document.getElementById('adviceUpdated');
  if (updated) updated.textContent = lastUpdate ? t('adviceUpdated', hhmm(lastUpdate.getTime())) : '';
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
      note.textContent = t('staleNote', lastUpdate.toLocaleString(t('dateLocale'), opts));
    }
  }
  renderLunchCountdown();
  updateLogTime();
}

// ─── Weerdata ophalen ────────────────────────────────────────────────────────
function isContinentalEurope(lat, lon) {
  return lat >= 35.0 && lat <= 71.5 && lon >= -10.5 && lon <= 40.0;
}

function buildAirQualityUrl(lat, lon) {
  const isEurope = isContinentalEurope(lat, lon);
  const baseFields = ['european_aqi', 'pm10', 'pm2_5', 'uv_index'];
  const pollenFields = POLLEN_KEYS.map(k => `${k}_pollen`);
  const fields = isEurope ? [...baseFields, ...pollenFields] : baseFields;
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

// Eén nieuwe poging na 2 s bij een netwerkfout, 429 of 5xx.
async function fetchWithRetry(url) {
  try {
    const res = await fetchWithTimeout(url);
    if (res.ok || (res.status < 500 && res.status !== 429)) return res;
  } catch (e) { /* hieronder opnieuw */ }
  await new Promise(resolve => setTimeout(resolve, 2000));
  return fetchWithTimeout(url);
}

// Laatste data bewaren, zodat de app bij openen meteen iets toont.
const DATA_CACHE_KEY = 'dighv_last_data';
const DATA_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;

function cacheLatestData() {
  localStorage_safe_set(DATA_CACHE_KEY, JSON.stringify({
    lat: currentLocation.lat, lon: currentLocation.lon, savedAt: lastUpdate?.getTime() ?? Date.now(),
    weather: weatherData, pollen: pollenData,
  }));
}

// Genoeg vorm om het advies te tekenen; een half of oud formaat crasht anders de start.
function isUsableWeather(w) {
  return Array.isArray(w?.hourly?.time) && Array.isArray(w.hourly.temperature_2m) &&
    Number.isFinite(w.current?.apparent_temperature) && Number.isFinite(w.current?.temperature_2m);
}

function restoreCachedData() {
  const cached = readJson(DATA_CACHE_KEY, null);
  if (!isUsableWeather(cached?.weather) || !Number.isFinite(cached.savedAt)) return;
  const sameSpot = Math.abs(cached.lat - currentLocation.lat) < 0.01 && Math.abs(cached.lon - currentLocation.lon) < 0.01;
  if (!sameSpot || Date.now() - cached.savedAt > DATA_CACHE_MAX_AGE) return;
  weatherData = cached.weather;
  pollenData = cached.pollen || null;
  lastUpdate = new Date(cached.savedAt);
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
  const hourlyVars = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
    + (modelParam ? '' : ',uv_index');
  const currentVars = 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m';

  // timeformat=unixtime: eenduidige tijden, ook in het dubbele uur bij de wintertijdovergang.
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}${modelParam}&current=${currentVars}&minutely_15=precipitation&hourly=${hourlyVars}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max&past_days=1&forecast_days=3&timezone=auto&timeformat=unixtime`;
  // Supplementary request on the default model, aligned to the same time grid:
  // UV (KNMI has none) and precipitation_probability, which Open-Meteo derives
  // from ensembles and may be missing for a single regional model.
  const extraUrl = modelParam
    ? `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index,precipitation_probability&past_days=1&forecast_days=3&timezone=auto&timeformat=unixtime`
    : null;
  const airQualityUrl = buildAirQualityUrl(lat, lon);
  // Alleen het weer is verplicht. UV en pollen zijn optioneel: als die falen,
  // moet het jasadvies gewoon verschijnen.
  const optionalFetch = url => (url ? fetchWithTimeout(url).catch(() => null) : Promise.resolve(null));
  try {
    const [weatherRes, airQualityRes, extraRes] = await Promise.all([
      fetchWithRetry(weatherUrl),
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
    const normalized = normalizeForecast(weatherData_new);
    if (!isUsableWeather(normalized)) throw new Error('Onvolledige weerdata');
    weatherData = normalized;
    pollenData = parsePollen(airQualityData, getAmsterdamDateKey(new Date()), Date.now());
    lastUpdate = new Date(dataTimestamp(weatherData, Date.now()));
    cacheLatestData();
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

let retryPending = false;
function showWeatherError() {
  if (weatherData) {
    // Verversen mislukt: laat het laatste advies staan, maar teken opnieuw zodat
    // tijdgebonden onderdelen (vandaag/morgen, pauzemoment) kloppen. De klok en
    // de datanotitie laten zien hoe oud de data is.
    try {
      render();
    } catch (err) {
      // Kapotte data: liever een foutmelding met "Opnieuw proberen" dan een hangende app.
      console.error('Weergave mislukt:', err);
      weatherData = null;
      showWeatherError();
      return;
    }
    updateClock();
    return;
  }
  setNoData(true);
  document.getElementById('verdict').innerHTML = `<div class="error" role="alert">${t('weatherError')}
    <button type="button" class="retry-btn anwb-button anwb-button--small anwb-button--primary" id="retryBtn">${t('retry')}</button></div>`;
  ['detail', 'feels'].forEach(id => { document.getElementById(id).textContent = ''; });
  document.getElementById('tips').innerHTML = '';
  document.getElementById('jacketMeter').hidden = true;
  document.getElementById('wachtFf').hidden = true;
  document.getElementById('rainCard').hidden = true;
  renderChecklist();
  updateClock();
  const retryBtn = document.getElementById('retryBtn');
  // Mislukt een poging die iemand zelf startte, dan de focus terug op de knop.
  if (retryPending) retryBtn?.focus();
  retryPending = false;
  retryBtn?.addEventListener('click', () => {
    retryPending = true;
    showWeatherLoading();
    // De knop verdwijnt: focus naar het advieslabel, waar straks het antwoord staat.
    document.getElementById('adviceLabel')?.focus();
    fetchWeather();
  });
}

// ─── Hulpfuncties voor de weergave ───────────────────────────────────────────
// Eén decimaal met de juiste komma voor de taal ("0,4 mm" in het Nederlands).
const fmt1Cache = {};
function fmt1(n) {
  const locale = t('dateLocale');
  fmt1Cache[locale] ||= new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return fmt1Cache[locale].format(n);
}

function setNoData(on) {
  document.querySelector('.advice-grid')?.classList.toggle('no-data', on);
}

function hhmm(ms) {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function nowIndex() {
  return hourlyNowIndex(weatherData?.hourly?.time, Date.now());
}

function formatDuration(mins) {
  const { d, h, m } = durationParts(mins);
  if (d > 0) return t('durationDH', d, h);
  return h > 0 ? t('durationHM', h, m) : t('durationM', m);
}

function currentOffset() {
  return (PREF_OFFSETS[userPref] ?? 0) + calibration;
}

function getConditions() {
  return computeConditions(weatherData, Date.now(), currentOffset());
}

function getPollenLevel() {
  if (!pollenData) return null;
  const n = highPollenKeys(pollenData).length;
  return n >= 2 ? 'very high' : n === 1 ? 'high' : 'low';
}

function isWorkday(date = new Date()) {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

// Weericonen: één lijnstijl (emoji ogen per platform anders).
function weatherKind(code) {
  if (code >= 95) return 'thunder';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3) return 'cloudy';
  if (code === 1 || code === 2) return 'partly';
  return 'clear';
}

const WX = {
  sun: '<circle class="wx-sun" cx="12" cy="12" r="4"/><path class="wx-sun" d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path class="wx-moon" d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  smallSun: '<circle class="wx-sun" cx="8.5" cy="8" r="3"/><path class="wx-sun" d="M8.5 2.5v1.3M3 8h1.3M4.6 4.1l.9.9M12.4 4.1l-.9.9"/>',
  smallMoon: '<path class="wx-moon" d="M12 8.2A4 4 0 0 1 7.3 3.5a4 4 0 1 0 4.7 4.7z"/>',
  cloud: '<path class="wx-cloud" d="M7.5 19h9.5a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.9 12.1 3.5 3.5 0 0 0 7.5 19z"/>',
  cloudHigh: '<path class="wx-cloud" d="M7.5 15h9.5a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.9 8.1 3.5 3.5 0 0 0 7.5 15z"/>',
  rain: '<path class="wx-drop" d="M9 17.5l-1 3M13 17.5l-1 3M17 17.5l-1 3"/>',
  drizzle: '<path class="wx-drop wx-dots" d="M9 18.5h.01M13 18.5h.01M17 18.5h.01M11 21h.01M15 21h.01"/>',
  snow: '<path class="wx-flake" d="M9 17.5v3.5M7.5 18.4l3 1.7M7.5 20.1l3-1.7M15 17.5v3.5M13.5 18.4l3 1.7M13.5 20.1l3-1.7"/>',
  bolt: '<path class="wx-bolt" d="M13 15l-2.5 3.5h3L11 22"/>',
  fog: '<path class="wx-cloud" d="M4 8.5h16M6 12.5h12M4 16.5h16"/>',
};

function weatherIcon(code, isDay = true, size = 24) {
  const kind = weatherKind(code ?? 0);
  const parts = {
    clear: isDay ? WX.sun : WX.moon,
    partly: (isDay ? WX.smallSun : WX.smallMoon) + WX.cloud,
    cloudy: WX.cloud,
    fog: WX.fog,
    drizzle: WX.cloudHigh + WX.drizzle,
    rain: WX.cloudHigh + WX.rain,
    snow: WX.cloudHigh + WX.snow,
    thunder: WX.cloudHigh + WX.bolt,
  }[kind];
  return `<svg class="wx wx-${kind}" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${t('weatherNames')[kind]}">${parts}</svg>`;
}

// ─── Weergave ────────────────────────────────────────────────────────────────
function render() {
  if (!weatherData) return;
  // Geen jasadvies op data van meer dan 6 uur oud (bijvoorbeeld lang offline).
  if (lastUpdate && Date.now() - lastUpdate.getTime() > DATA_CACHE_MAX_AGE) {
    weatherData = null;
    pollenData = null;
    showWeatherError();
    return;
  }
  setNoData(false);
  rememberSunTimes();
  renderMetrics();
  renderForecast();
  renderRainChart();
  renderAdvice();
  renderWachtFf();
  renderLunchCountdown();
  renderBestMoment();
  renderWeatherComparison();
  renderSeasonBanner();
  updateAppBadge();
}

function renderLunchCountdown() {
  const el = document.getElementById('lunchCountdown');
  if (!el) return;

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const workday = isWorkday(now);
  const AFTERNOON = 15 * 60;

  // Een pauze is niet in één minuut voorbij: tijdens de lunch (30 min)
  // en de middagpauze (15 min) staat er "Nu!".
  let targetMin, label, isNow = false, dayOffset = 0;
  if (workday && mins >= lunchMinutes && mins < lunchMinutes + 30) {
    targetMin = lunchMinutes; label = t('lunchLabel'); isNow = true;
  } else if (workday && mins >= AFTERNOON && mins < AFTERNOON + 15) {
    targetMin = AFTERNOON; label = t('afternoonLabel'); isNow = true;
  } else if (workday && mins < lunchMinutes) {
    targetMin = lunchMinutes; label = t('lunchLabel');
  } else if (workday && mins < AFTERNOON) {
    targetMin = AFTERNOON; label = t('afternoonLabel');
  } else {
    // Volgende werkdag: na vrijdagmiddag is dat maandag, niet zaterdag.
    targetMin = lunchMinutes;
    dayOffset = 1;
    while (!isWorkday(new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset))) dayOffset++;
    if (dayOffset === 1) {
      label = t('tomorrowLunch');
    } else {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      label = t('dayLunch', day.toLocaleDateString(t('dateLocale'), { weekday: 'long' }));
    }
  }

  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, Math.floor(targetMin / 60), targetMin % 60);
  const diffMins = Math.max(0, Math.round((target - now) / 60000));
  const countdownStr = isNow || diffMins === 0 ? t('countdownNow') : formatDuration(diffMins);

  // Vooruitblik op de eigen pauze: jas, temperatuur en kans voor dát moment.
  // Binnen een half uur is dat gewoon het advies hierboven.
  let preview = '';
  const outlook = weatherData && dayOffset === 0 && diffMins > 30 ? outlookAt(weatherData, target.getTime(), currentOffset()) : null;
  if (outlook) {
    preview = `<div class="countdown-preview">${weatherIcon(outlook.code, isDayTime(target), 18)}
      <span><strong>${t(outlook.verdict)}</strong> · ${Math.round(outlook.temp)} °C · ${t('precipPreview', outlook.prob, outlook.snow)}</span></div>`;
  }

  el.innerHTML = `
    <div class="countdown-label">${label} · ${hhmm(target)}</div>
    <div class="countdown-value">${countdownStr}</div>
    ${preview}
  `;
}

const BREAK_WINDOW = { start: 11 * 60, end: 15 * 60 };

function breakOptions() {
  return { ...BREAK_WINDOW, preferred: lunchMinutes };
}

function renderBestMoment() {
  const el = document.getElementById('bestTime');
  const shareBtn = document.getElementById('shareBtn');
  if (!el || !weatherData) return;
  const now = new Date();
  const nowMs = now.getTime();

  let sunHtml = '';
  const todayIdx = weatherData.daily?.time?.findIndex(d => d === getAmsterdamDateKey(now)) ?? -1;
  if (todayIdx >= 0) {
    const sr = weatherData.daily.sunrise?.[todayIdx];
    const ss = weatherData.daily.sunset?.[todayIdx];
    if (sr && ss) sunHtml = `<p class="sun-line">${t('sunLine', hhmm(sr), hhmm(ss))}</p>`;
  }

  // Weekend: de pauzekaart telt al af naar maandag, dus geen "beste moment" voor vandaag.
  if (!isWorkday(now)) {
    el.innerHTML = `<p class="best-time-detail muted">${t('bestWeekend')}</p>${sunHtml}`;
    if (shareBtn) shareBtn.hidden = true;
    return;
  }

  const mins = now.getHours() * 60 + now.getMinutes();
  const best = mins <= BREAK_WINDOW.end + 30 ? bestBreakMoment(weatherData, nowMs, breakOptions()) : null;
  if (!best) {
    el.innerHTML = `<p class="best-time-detail muted">${t('bestNoMore')}</p>${sunHtml}`;
    if (shareBtn) shareBtn.hidden = true;
    return;
  }

  const isNow = best.startMs <= nowMs;
  const timeStr = isNow ? t('countdownNow') : `${hhmm(best.startMs)}–${hhmm(best.endMs)}`;
  const temp = Math.round(best.temp);
  const hIdx = hourlyNowIndex(weatherData.hourly.time, best.startMs);
  const code = weatherData.hourly.weather_code?.[hIdx] ?? 0;
  const dry = best.rainMm < WET_SLOT_MM && best.prob < THRESHOLDS.rainTipProb;
  const detail = `${temp} °C · ${dry ? t('bestMomentDry') : t('precipPreview', best.prob, weatherKind(code) === 'snow')}`;
  // Ook het beste blok is nat: zeg dat eerlijk, en noem het niet "beste".
  const wetBest = best.rainMm >= WET_SLOT_MM || best.prob >= THRESHOLDS.wetProb;
  const noDryHtml = wetBest ? `<p class="rain-change">${t('bestNoDry')}</p>` : '';
  const stormy = getConditions().stormy;

  if (stormy && wetBest) {
    // Storm en nergens droog: geen moment aanprijzen, alleen het minst slechte noemen.
    el.innerHTML = `
      <div class="best-time-row"><span class="best-time-label">${t('bestNoGoodLabel')}</span></div>
      <p class="best-time-detail">${t('bestLeastWetAt', timeStr)} · ${detail}</p>
      ${sunHtml}
    `;
    if (shareBtn) shareBtn.hidden = true;
    return;
  }

  el.innerHTML = `
    <div class="best-time-row">
      <span class="best-time-label">${t(wetBest ? 'bestLeastWetLabel' : 'bestMomentLabel')}</span>
      <span class="best-time-value">${timeStr}</span>
      ${weatherIcon(code, isDayTime(new Date(best.startMs)), 22)}
    </div>
    <p class="best-time-detail">${detail}</p>
    ${noDryHtml}${sunHtml}
  `;
  // Niet uitnodigen bij storm.
  if (shareBtn) shareBtn.hidden = stormy;
}

// Deelknop: 2-3 opties naar de teamchat, stemmen gebeurt daar.
let shareStatusTimer = null;
async function shareBreak() {
  const status = document.getElementById('shareStatus');
  const nowMs = Date.now();
  const options = topBreakOptions(weatherData, nowMs, breakOptions(), 3);
  if (!options.length) return;
  const parts = options.map(o => t('shareOption', hhmm(o.startMs), Math.round(o.temp), o.rainMm < WET_SLOT_MM && o.prob < THRESHOLDS.rainTipProb));
  // "11:30, 12:00 of 12:30" in de taal van de app
  const list = typeof Intl.ListFormat === 'function'
    ? new Intl.ListFormat(t('dateLocale'), { type: 'disjunction' }).format(parts)
    : parts.join(', ');
  const verdict = document.querySelector('#verdict .verdict-text')?.textContent || '';
  const text = `${t('shareText', list, verdict)} ${location.origin + location.pathname}`;
  clearTimeout(shareStatusTimer);
  try {
    if (navigator.share) {
      await navigator.share({ title: t('shareTitle'), text });
      status.textContent = '';
      return;
    }
    await navigator.clipboard.writeText(text);
    status.textContent = t('shareCopied');
    shareStatusTimer = setTimeout(() => { status.textContent = ''; }, 8000);
  } catch (err) {
    if (err?.name === 'AbortError') return;
    // Geen deelmenu en geen klembord: toon de tekst zodat je hem zelf kopieert.
    status.textContent = '';
    const label = document.createElement('span');
    label.dataset.i18n = 'shareFallback'; // wisselt mee bij een taalwissel
    label.textContent = t('shareFallback');
    const area = document.createElement('textarea');
    area.className = 'share-fallback';
    area.readOnly = true;
    area.rows = 3;
    area.value = text;
    status.append(label, area);
    area.focus();
    area.select();
  }
}

// App-badge (geïnstalleerde PWA): een stip als het rond jouw lunch nat wordt.
function updateAppBadge() {
  if (!('setAppBadge' in navigator) || !weatherData) return;
  const now = new Date();
  const lunch = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(lunchMinutes / 60), lunchMinutes % 60);
  const outlook = lunch > now ? outlookAt(weatherData, lunch.getTime(), currentOffset()) : null;
  const wet = !!outlook?.wet;
  (wet ? navigator.setAppBadge(1) : navigator.clearAppBadge()).catch(() => {});
}

function renderWachtFf() {
  const el = document.getElementById('wachtFf');
  if (!el) return;
  const now = Date.now();
  const nc = weatherData ? nowcast(weatherData, now) : null;
  // Eén plek voor "regen begint/stopt": deze strook.
  if (!nc || (!nc.raining && !nc.changeAtMs)) { el.hidden = true; return; }
  const kind = nc.snow ? 'snow' : 'rain';
  const icon = weatherIcon(nc.snow ? 73 : 61, true, 20);
  let text;
  if (!nc.raining) {
    text = t(`${kind}StartsAt`, hhmm(nc.changeAtMs));
  } else if (nc.continues) {
    text = t(`${kind}Continues`);
  } else {
    const waitMins = Math.max(1, Math.round((nc.changeAtMs - now) / 60000));
    text = waitMins <= 5 ? t(`${kind}StopsSoon`) : t('rainWait', waitMins, hhmm(nc.changeAtMs));
  }
  el.hidden = false;
  el.innerHTML = `${nc.raining && !nc.continues ? weatherIcon(2, true, 20) : icon}<span>${text}</span>`;
}

function rainSlots() {
  const minutely = weatherData.minutely_15;
  if (!minutely?.time) return [];
  const now = Date.now();
  const startIdx = minutely.time.findIndex(ts => ts >= now);
  if (startIdx === -1) return [];
  const slots = [];
  for (let i = 0; i < 8 && startIdx + i < minutely.time.length; i++) {
    const idx = startIdx + i;
    slots.push({ time: minutely.time[idx], precip: minutely.precipitation[idx] || 0 });
  }
  return slots;
}

function renderRainChart() {
  const card = document.getElementById('rainCard');
  const slots = rainSlots();
  const totalRain = slots.reduce((sum, s) => sum + s.precip, 0);
  // Kwartierdata heeft geen kans; neem de hoogste uurkans van de uren die voor
  // minstens een half uur binnen de grafiek vallen. Een uurslot telt het voorgaande uur.
  const hourly = weatherData.hourly;
  const chartStart = slots.length ? slots[0].time - 15 * 60000 : 0;
  const chartEnd = slots.length ? slots[slots.length - 1].time : 0;
  const maxProb = Math.max(0, ...(hourly?.time || []).map((ts, i) => {
    const overlap = Math.min(ts, chartEnd) - Math.max(ts - 3600000, chartStart);
    return overlap >= 30 * 60000 ? hourly.precipitation_probability?.[i] ?? 0 : 0;
  }));
  // Droog: de kaart verdwijnt en het advies zegt "droog de komende 2 uur".
  card.hidden = !slots.length || (totalRain < WET_SLOT_MM && maxProb < THRESHOLDS.rainTipProb);
  if (card.hidden) return;

  const maxPrecip = Math.max(1, ...slots.map(s => s.precip));
  const html = slots.map(s => {
    const heightPct = s.precip > 0 ? Math.max(4, (s.precip / maxPrecip) * 100) : 2;
    const isDry = s.precip < WET_SLOT_MM;
    const valueStr = isDry ? '' : fmt1(s.precip);
    return `<div class="bar-group">
      <div class="bar ${isDry ? 'dry' : ''}" style="height: ${heightPct}%">${valueStr ? `<span class="bar-value">${valueStr}</span>` : ''}</div>
      <span class="bar-label">${hhmm(s.time)}</span>
    </div>`;
  }).join('');

  const chart = document.getElementById('rainChart');
  chart.innerHTML = html;
  // De balken zelf zijn voor schermlezers onzichtbaar; geef de data in het label.
  const wetSlots = slots.filter(s => s.precip >= WET_SLOT_MM);
  chart.setAttribute('aria-label', wetSlots.length
    ? t('rainChartAria', wetSlots.map(sl => `${hhmm(sl.time)} ${fmt1(sl.precip)} mm`).join(', '), fmt1(totalRain))
    : t('rainChartAriaDry'));

  document.getElementById('rainSummary').innerHTML = `
    <span>${t('rainTotal')}: <strong>${fmt1(totalRain)} mm</strong></span>
    <span>${t('rainPeakChance')}: <strong>${maxProb}%</strong></span>
  `;
}

function windDirection(deg) {
  return t('windDirs')[Math.round(deg / 45) % 8];
}

function renderMetrics() {
  const c = weatherData.current;
  const uv = weatherData.hourly.uv_index?.[nowIndex()];
  const metric = (label, value, unit = '') => `<div class="metric">
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}<span class="metric-unit">${unit}</span></span>
    </div>`;
  document.getElementById('metrics').innerHTML = [
    metric(t('metricTemp'), Math.round(c.temperature_2m), '°C'),
    metric(t('metricFeels'), Math.round(c.apparent_temperature), '°C'),
    metric(t('metricWind'), Math.round(c.wind_speed_10m), `${t('unitKmh')} · ${windDirection(c.wind_direction_10m ?? 0)}`),
    c.wind_gusts_10m != null ? metric(t('metricGusts'), Math.round(c.wind_gusts_10m), t('unitKmh')) : '',
    metric(t('metricPrecip'), fmt1(c.precipitation ?? 0), 'mm'),
    metric(t('metricUv'), uv == null ? '–' : Math.round(uv)),
  ].join('');
}

function renderForecast() {
  const hourly = weatherData.hourly;
  const startIdx = Math.max(0, nowIndex());
  const html = [];
  for (let i = 0; i < 7 && startIdx + i < hourly.time.length; i++) {
    const idx = startIdx + i;
    const time = new Date(hourly.time[idx]);
    const isNow = i === 0;
    const rain = hourly.precipitation_probability?.[idx] || 0;
    const timeLabel = isNow ? t('forecastNow') : String(time.getHours()).padStart(2, '0') + ':00';
    html.push(`<div class="slot ${isNow ? 'now' : ''}" role="listitem">
      <div class="slot-time">${timeLabel}</div>
      <div class="slot-icon">${weatherIcon(hourly.weather_code?.[idx] || 0, isDayTime(time), 26)}</div>
      <div class="slot-temp">${Math.round(hourly.temperature_2m[idx])}°</div>
      <div class="slot-rain">${rain}%<span class="sr-only"> ${t('rainChanceSr')}</span></div>
    </div>`);
  }
  const forecast = document.getElementById('forecast');
  forecast.innerHTML = html.join('');
  if (!forecast.dataset.fadeBound) {
    forecast.dataset.fadeBound = '1';
    forecast.addEventListener('scroll', updateForecastFade, { passive: true });
    window.addEventListener('resize', updateForecastFade);
  }
  updateForecastFade();
}

// Vervaag de rechterrand zolang er nog uren buiten beeld staan: dan zie je dat
// de strook scrolt, ook als een uur precies wegvalt.
function updateForecastFade() {
  const el = document.getElementById('forecast');
  if (el) el.classList.toggle('has-more', el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
}

let lastAdviceAnnouncement = '';

function renderAdvice() {
  const c = weatherData.current;
  const cond = getConditions();
  const advice = adviceKeys(cond, getPollenLevel());
  const verdict = t(advice.verdict);
  const jacketType = advice.jacket ? t(advice.jacket) : '';

  const tips = advice.tips.map(tip => ({ text: t(tip.key, ...(tip.args || [])), warn: tip.warn }));
  // Droog weer verdient ook een zin, nu de regenkaart dan verdwijnt.
  const slots = rainSlots();
  if (tips.length < 3 && !cond.wet && cond.rainProb < THRESHOLDS.rainTipProb && slots.length && slots.every(sl => sl.precip < WET_SLOT_MM)) {
    tips.unshift({ text: t('rainDry') });
  }
  // Eén jasterm: het jaslabel alleen als het oordeel zelf geen jas noemt.
  if (advice.jacket) tips.unshift({ text: jacketType, primary: true });

  const isDay = isDayTime(new Date());
  document.getElementById('verdict').innerHTML = `<span class="verdict-text fade-in">${verdict}</span><span class="weather-illustration">${weatherIcon(c.weather_code, isDay, 72)}</span>`;
  document.getElementById('detail').textContent = t(advice.detail);
  document.getElementById('feels').textContent = t('feelsLine', cond.feels)
    + (currentOffset() !== 0 ? t('feelsForYou', cond.effectiveFeel) : '');
  document.getElementById('tips').innerHTML = tips.map(tip =>
    `<li class="tip${tip.primary ? ' primary' : ''}${tip.warn ? ' warn' : ''}">${tip.text}</li>`
  ).join('');

  renderJacketMeter(cond);
  renderExtremeNote(cond);
  renderFeedbackRow(cond);

  // Schermlezers: alleen aankondigen als het advies echt verandert.
  const announcement = jacketType ? `${verdict}. ${jacketType}.` : `${verdict}.`;
  if (announcement !== lastAdviceAnnouncement) {
    lastAdviceAnnouncement = announcement;
    document.getElementById('adviceLive').textContent = announcement;
  }

  renderPollenCard();
  renderChecklist();
}

function renderJacketMeter(cond) {
  const meter = document.getElementById('jacketMeter');
  if (!meter) return;
  const scale = jacketScale(cond.effectiveFeel);
  const levels = t('jacketLevels');
  // Bij storm gaat het niet om de jas; dan geen meter.
  meter.hidden = cond.stormy;
  if (meter.hidden) return;
  document.getElementById('jacketNeedle').style.left = `${scale.pct}%`;
  meter.querySelectorAll('.jacket-meter-seg').forEach(seg => seg.classList.toggle('active', seg.dataset.level === scale.level));
  const track = meter.querySelector('.jacket-meter-track');
  track.setAttribute('role', 'img');
  track.setAttribute('aria-label', t('jacketMeterLabel', levels[scale.level], cond.effectiveFeel));
  document.getElementById('jacketNote').textContent = scale.near
    ? t('jacketNear', t('jacketNeeds')[scale.near.level], scale.near.delta)
    : '';
}

function renderExtremeNote(cond) {
  const el = document.getElementById('extremeNote');
  if (!el) return;
  const pool = extremePool(cond);
  const todayKey = getAmsterdamDateKey(new Date());
  let text = '';
  if (pool) {
    const lines = t(pool);
    text = lines[pickDaily(lines.length, todayKey + pool)];
  } else if (!isWorkday()) {
    text = t('weekendNote');
  }
  el.hidden = !text;
  el.textContent = text;
}

// Na de lunch op werkdagen: hoe was het buiten? Eén keer per dag, niet bij storm.
function renderFeedbackRow(cond = weatherData ? getConditions() : null) {
  const row = document.getElementById('feedbackRow');
  if (!row) return;
  const question = document.getElementById('feedbackQuestion');
  // Na een antwoord blijft de bedankregel staan (en wordt hij mee vertaald).
  if (row.dataset.answer) {
    question.textContent = t(row.dataset.answer);
    return;
  }
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const answered = localStorage_safe_get('dighv_feedback_date') === getAmsterdamDateKey(now);
  const show = isWorkday(now) && mins >= lunchMinutes + 30 && mins < 18 * 60 && !answered && !cond?.stormy;
  row.hidden = !show;
  if (show) question.textContent = t('feedbackQuestion');
}

function giveFeedback(kind) {
  const before = calibration;
  if (kind !== 'skip') calibration = calibrate(calibration, kind);
  const atLimit = kind !== 'ok' && kind !== 'skip' && calibration === before;
  localStorage_safe_set('dighv_calibration', String(calibration));
  localStorage_safe_set('dighv_feedback_date', getAmsterdamDateKey(new Date()));
  const row = document.getElementById('feedbackRow');
  row.dataset.answer = kind === 'skip' ? 'feedbackSkipped' : kind === 'ok' ? 'feedbackThanksOk' : atLimit ? 'calibrationLimit' : 'feedbackThanks';
  row.querySelector('.feedback-actions').hidden = true;
  renderFeedbackRow();
  renderCalibrationNote();
  if (weatherData) renderAdvice();
  // De knoppen zijn weg: focus en voorlezen via de bedankregel.
  const question = document.getElementById('feedbackQuestion');
  question?.focus();
  if (question) announce(question.textContent);
}

function renderCalibrationNote() {
  const el = document.getElementById('calibrationNote');
  if (!el) return;
  el.hidden = calibration === 0;
  if (el.hidden) { el.textContent = ''; return; }
  el.innerHTML = `${escapeHtml(t('calibrationNote', calibration))} <button type="button" class="calibration-reset ${UI.textLink}" id="calibrationReset">${t('calibrationReset')}</button>`;
  document.getElementById('calibrationReset').addEventListener('click', () => {
    calibration = 0;
    localStorage_safe_set('dighv_calibration', '0');
    renderCalibrationNote();
    renderPrefSummary();
    if (weatherData) renderAdvice();
    document.getElementById('lunchTime')?.focus();
  });
}

// Ingeklapte voorkeuren tonen wat er nu geldt: "Normaal · lunch 12:00".
function renderPrefSummary() {
  const el = document.getElementById('prefCurrent');
  if (!el) return;
  const typeKey = { cold: 'prefCold', normal: 'prefNormal', warm: 'prefWarm' }[userPref];
  const lunch = `${String(Math.floor(lunchMinutes / 60)).padStart(2, '0')}:${String(lunchMinutes % 60).padStart(2, '0')}`;
  el.textContent = t('prefCurrentLine', t(typeKey), lunch);
}

function getPollenTip() {
  const highPollen = highPollenKeys(pollenData).map(k => t('pollenNames')[k].toLowerCase());
  const level = getPollenLevel();
  const timeStr = new Date(pollenData.fetchedAt).toLocaleTimeString(t('dateLocale'), { hour: '2-digit', minute: '2-digit' });
  const summary = highPollen.length > 0 ? `${t('pollenHighPrefix')}${highPollen.join(', ')}` : t('pollenAllLow');
  return { level, live: `${summary} ${t('pollenMeasured', timeStr)}` };
}

// Pollen ververst elke 10 minuten mee. Zelfde HTML: niets doen. Anders de
// uitgeklapte lijst open houden en de focus op "Alle soorten tonen" terugzetten.
function setPollenHtml(grid, html) {
  if (grid.dataset.html === html) return;
  const wasOpen = grid.querySelector('.pollen-details')?.open;
  const hadFocus = grid.contains(document.activeElement) && document.activeElement.tagName === 'SUMMARY';
  grid.innerHTML = html;
  grid.dataset.html = html;
  const details = grid.querySelector('.pollen-details');
  if (details && wasOpen) details.open = true;
  if (hadFocus) details?.querySelector('summary')?.focus();
}

function renderPollenCard() {
  const pollenGrid = document.getElementById('pollenGrid');
  if (!pollenGrid) return;
  if (!pollenData) {
    // Geen meting: liever eerlijk "niet beschikbaar" dan zes keer 0.
    setPollenHtml(pollenGrid, `<p class="pollen-unavailable">${t('pollenUnavailable')}</p>`);
    return;
  }

  const items = POLLEN_KEYS.map(k => {
    const value = pollenData[k] || 0;
    const threshold = POLLEN_THRESHOLDS[k];
    const level = value > threshold ? 'high' : value > threshold * 0.5 ? 'medium' : 'low';
    return { name: t('pollenNames')[k], value, threshold, level };
  }).sort((a, b) => b.value - a.value);

  // Niveau als huisstijl Label. Geen Meter: die betekent in huisstijl "hoe voller, hoe beter".
  const levelColor = { low: 'green', medium: 'yellow', high: 'red' };
  const list = `<ul class="pollen-items">${items.map(p => {
    return `<li class="pollen-item">
      <span class="pollen-name">${p.name}</span>
      <span class="pollen-value">${Math.round(p.value)} ${t('pollenUnit')}</span>
      <span class="${UI.label} ${UI.labelColor[levelColor[p.level]]}"><span class="prose-label-small">${t('pollenItemLevel')[p.level]}</span></span>
    </li>`;
  }).join('')}</ul>`;

  let tomorrowHtml = '';
  if (pollenData.tomorrow) {
    const high = highPollenKeys(pollenData.tomorrow).map(k => t('pollenNames')[k].toLowerCase());
    const text = high.length ? `${t('pollenHighPrefix')}${high.join(', ')}` : t('pollenAllLow');
    tomorrowHtml = `<p class="pollen-tomorrow"><span class="pollen-tomorrow-label">${t('pollenTomorrow')}:</span> ${text}</p>`;
  }

  const level = getPollenLevel();
  if (level === 'low') {
    // Buiten het seizoen geen zes lege balken: één regel, details op verzoek.
    setPollenHtml(pollenGrid, `<p class="pollen-summary">${t('pollenAllLowSummary')}</p>
      <details class="pollen-details anwb-accordion"><summary>${t('pollenShowAll')}</summary>${list}</details>${tomorrowHtml}`);
    return;
  }
  setPollenHtml(pollenGrid, `<p class="pollen-summary">${t('pollenLevelLabel', t('pollenLevelNames')[level])} · ${getPollenTip().live}</p>${list}${tomorrowHtml}`);
}

// ─── Checklist ───────────────────────────────────────────────────────────────
// Afvinkjes gelden voor één dag; de volgende dag begint de lijst weer leeg.
function getCheckedItems() {
  const v = readJson('dighv_checklist', null);
  if (v && v.date === getAmsterdamDateKey(new Date()) && v.items && typeof v.items === 'object') return v.items;
  return {};
}

let lastChecklistHtml = '';

function renderChecklist() {
  const cond = weatherData ? getConditions() : null;
  // Welke items het weer vraagt, staat in logic.js (checklistConditions, getest).
  const shown = cond ? checklistConditions(cond) : {};
  const when = id => () => shown[id];

  const items = [
    { group: 'Always', labelKey: 'checkPersPass', id: 'personeelspas' },
    { group: 'Always', labelKey: 'checkBezPass', id: 'bezoekerspas' },
    { group: 'Always', labelKey: 'checkPhone', id: 'telefoon' },
    { group: 'Zon', labelKey: 'checkSunglasses', id: 'zonnebril', condition: when('zonnebril') },
    { group: 'Zon', labelKey: 'checkSunscreen', id: 'zonnebrandcreme', condition: when('zonnebrandcreme') },
    { group: 'Zon', labelKey: 'checkHat', id: 'hoed', condition: when('hoed') },
    { group: 'Zon', labelKey: 'checkWater', id: 'water', condition: when('water') },
    { group: 'Regen', labelKey: 'checkUmbrella', id: 'paraplu', condition: when('paraplu') },
    { group: 'Regen', labelKey: 'checkWaterproof', id: 'waterdichte_tas', condition: when('waterdichte_tas') },
    { group: 'Kou', labelKey: 'checkScarf', id: 'sjaal', condition: when('sjaal') },
    { group: 'Kou', labelKey: 'checkGloves', id: 'handschoenen', condition: when('handschoenen') },
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

  const groupKeyMap = { Always: 'groupAlways', Zon: 'groupSun', Regen: 'groupRain', Kou: 'groupCold', Info: 'groupInfo' };
  const itemHtml = item => `<li class="checklist-item anwb-check">
      <input type="checkbox" id="check_${item.id}" ${checked[item.id] ? 'checked' : ''}>
      <label for="check_${item.id}">${t(item.labelKey)}</label>
    </li>`;

  let html = '';
  ['Always', 'Zon', 'Regen', 'Kou', 'Info'].forEach(group => {
    const list = grouped[group];
    if (!list || list.length === 0) return;
    const inner = `<ul class="checklist-list">${list.map(itemHtml).join('')}</ul>`;
    if (group === 'Always') {
      // Vaste spullen inklappen zodra alles is afgevinkt; het weer-deel blijft zichtbaar.
      const allDone = list.every(item => checked[item.id]);
      html += `<details class="checklist-group anwb-accordion" ${allDone ? '' : 'open'}>
        <summary class="checklist-group-title">${t(groupKeyMap[group])}${allDone ? ' ✓' : ''}</summary>${inner}</details>`;
    } else {
      html += `<div class="checklist-group"><h3 class="checklist-group-title">${t(groupKeyMap[group])}</h3>${inner}</div>`;
    }
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
      const saved = getCheckedItems();
      saved[e.target.id.replace('check_', '')] = e.target.checked;
      localStorage_safe_set('dighv_checklist', JSON.stringify({ date: getAmsterdamDateKey(new Date()), items: saved }));
      // Niet meteen opnieuw renderen (focus en het open/dicht klappen blijven rustig).
      lastChecklistHtml = '';
    });
  });
}

// ─── Looplog ─────────────────────────────────────────────────────────────────
function getLog() {
  const log = readJson('dighv_log', []);
  // Een kapotte of handmatig aangepaste waarde mag de app niet laten crashen.
  return Array.isArray(log) ? log.filter(e => e && Array.isArray(e.people) && e.timestamp) : [];
}

function saveLog(log) {
  saveImportant('dighv_log', JSON.stringify(log));
}

// Team: standaard de lijst uit de code, per toestel aan te passen.
function getTeam() {
  const team = readJson('dighv_team', null);
  return Array.isArray(team) && team.every(n => typeof n === 'string') ? team : [...WALKERS];
}

function saveTeam(team) {
  saveImportant('dighv_team', JSON.stringify(team));
}

function updateLogTime() {
  const el = document.getElementById('logTime');
  if (el) el.textContent = hhmm(Date.now());
}

const X_ICON = '<svg class="x-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// Opslaan kan pas als er iemand is aangevinkt; het aantal staat in de knop.
let saveFeedbackTimer = null;
function updateSaveButton() {
  const saveBtn = document.getElementById('logSaveBtn');
  const clearBtn = document.getElementById('logClearBtn');
  if (!saveBtn || saveFeedbackTimer) return;
  const n = selectedWalkers.size;
  saveBtn.disabled = n === 0;
  saveBtn.textContent = n ? t('logSaveCount', n) : t('logSave');
  if (clearBtn) clearBtn.disabled = n === 0;
}

function renderWalkerGrid() {
  const grid = document.getElementById('walkerGrid');
  if (!grid) return;
  const team = getTeam();
  [...selectedWalkers].forEach(name => { if (!team.includes(name)) selectedWalkers.delete(name); });
  grid.innerHTML = '';
  if (!team.length) {
    grid.innerHTML = `<p class="log-empty">${t('teamEmpty')}</p>`;
  }
  updateSaveButton();
  team.forEach(name => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `walker-btn ${UI.chip}`;
    btn.textContent = name;
    const on = selectedWalkers.has(name);
    setUiState(btn, on, UI.chipOn, UI.chipOff);
    btn.setAttribute('aria-pressed', String(on));
    btn.addEventListener('click', () => {
      const nowOn = !selectedWalkers.has(name);
      if (nowOn) selectedWalkers.add(name); else selectedWalkers.delete(name);
      setUiState(btn, nowOn, UI.chipOn, UI.chipOff);
      btn.setAttribute('aria-pressed', String(nowOn));
      updateSaveButton();
    });
    grid.appendChild(btn);
  });
}

let logTabReady = false;
function initLogTab() {
  if (logTabReady) return;
  logTabReady = true;
  renderWalkerGrid();

  // Na wissen of opslaan wordt de knop uitgezet; zet de focus dan op de namen.
  const focusFirstWalker = () => document.querySelector('#walkerGrid .walker-btn')?.focus();

  document.getElementById('logClearBtn').addEventListener('click', () => {
    selectedWalkers.clear();
    renderWalkerGrid();
    focusFirstWalker();
  });

  document.getElementById('logSaveBtn').addEventListener('click', () => {
    if (!selectedWalkers.size) return;
    const log = getLog();
    const entry = { id: Date.now(), timestamp: new Date().toISOString(), people: [...selectedWalkers] };
    if (weatherData) {
      // Weersnapshot voor statistieken en badges.
      const cond = getConditions();
      entry.weather = {
        feels: cond.feels, temp: Math.round(cond.temp), rain: Math.round(cond.rainAmount * 10) / 10,
        wind: Math.round(cond.wind), gust: Math.round(cond.gust), code: weatherData.current.weather_code,
      };
    }
    log.unshift(entry);
    saveLog(log);
    selectedWalkers.clear();
    renderWalkerGrid();
    renderLogHistory();
    const saveBtn = document.getElementById('logSaveBtn');
    // Even "Opgeslagen" tonen; de knop blijft uit tot iemand is aangevinkt.
    saveBtn.disabled = true;
    saveBtn.textContent = t('logSaved');
    saveFeedbackTimer = setTimeout(() => { saveFeedbackTimer = null; updateSaveButton(); }, 1800);
    focusFirstWalker();
    announce(t('logSaved'));
  });

  const editBtn = document.getElementById('teamEditBtn');
  editBtn.addEventListener('click', () => {
    const editor = document.getElementById('teamEditor');
    editor.hidden = !editor.hidden;
    editBtn.setAttribute('aria-expanded', String(!editor.hidden));
    if (!editor.hidden) document.getElementById('teamAddInput').focus();
  });

  document.getElementById('teamAddForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('teamAddInput');
    const name = input.value.trim().slice(0, 30);
    if (!name) return;
    const team = getTeam();
    if (team.some(n => n.toLowerCase() === name.toLowerCase())) {
      showToast('teamExists');
      return;
    }
    team.push(name);
    saveTeam(team);
    input.value = '';
    renderTeamEditor();
    renderWalkerGrid();
  });

  document.getElementById('teamResetBtn').addEventListener('click', () => {
    // Eigen namen gaan verloren; daarom een paar seconden terug te draaien.
    const previous = localStorage_safe_get('dighv_team');
    localStorage_safe_remove('dighv_team');
    renderTeamEditor();
    renderWalkerGrid();
    if (previous) {
      showToast('teamResetDone', 'toastUndo', () => {
        saveImportant('dighv_team', previous);
        renderTeamEditor();
        renderWalkerGrid();
      });
    }
  });

  renderTeamEditor();
}

function renderTeamEditor() {
  const list = document.getElementById('teamList');
  if (!list) return;
  list.innerHTML = getTeam().map((name, i) => `<li class="team-item">
      <span>${escapeHtml(name)}</span>
      <button type="button" class="team-remove ${UI.actionIcon}" data-index="${i}" aria-label="${escapeHtml(t('teamRemove', name))}">${X_ICON}</button>
    </li>`).join('');
  list.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    const team = getTeam();
    team.splice(Number(btn.dataset.index), 1);
    saveTeam(team);
    renderTeamEditor();
    renderWalkerGrid();
    (list.querySelector('button') || document.getElementById('teamAddInput'))?.focus();
  }));
}

function renderLogStats(log) {
  const section = document.getElementById('logStats');
  if (!section) return;
  const stats = logStats(log, Date.now());
  section.hidden = stats.total === 0;
  if (section.hidden) return;
  const tile = (n, label) => `<div class="stat"><span class="stat-value">${n}</span><span class="stat-label">${label}</span></div>`;
  let html = tile(stats.total, t('statTotal', stats.total)) + tile(stats.thisMonth, t('statMonth')) + tile(stats.dryStreak, t('statStreak'));
  const lines = [];
  if (stats.loyal) lines.push(t('statLoyal', escapeHtml(stats.loyal.name), stats.loyal.count));
  if (stats.bravest) lines.push(t('statBravest', escapeHtml(stats.bravest.name), stats.bravest.count));
  if (lines.length) html += `<p class="stat-lines">${lines.join('<br>')}</p>`;
  document.getElementById('statsGrid').innerHTML = html;
  const badges = t('badges');
  document.getElementById('badgeList').innerHTML = achievements(log)
    .map(id => `<li class="badge" title="${badges[id][1]}"><strong>${badges[id][0]}</strong><span>${badges[id][1]}</span></li>`)
    .join('');
}

const LOG_PAGE = 50;
let logVisible = LOG_PAGE;

function renderLogHistory() {
  const el = document.getElementById('logHistory');
  if (!el) return;
  // Een lange log kost tijd; alleen tekenen als de Looplog open is.
  if (!document.getElementById('view-log')?.classList.contains('active')) return;
  const log = getLog();
  renderLogStats(log);
  updateSaveButton();

  if (log.length === 0) {
    el.innerHTML = `<p class="log-empty">${t('logEmpty')}</p>`;
    return;
  }

  const days = {};
  log.slice(0, logVisible).forEach(entry => {
    const d = new Date(entry.timestamp);
    const key = d.toLocaleDateString(t('dateLocale'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!days[key]) days[key] = [];
    days[key].push(entry);
  });

  let html = '';
  for (const [day, entries] of Object.entries(days)) {
    html += `<h2 class="log-day-header">${day}</h2><ul class="log-day">`;
    entries.forEach(entry => {
      const time = hhmm(new Date(entry.timestamp).getTime());
      const names = entry.people.map(escapeHtml).join(', ');
      const peopleStr = entry.people.length === 0 ? t('logNobodyWalked') : names;
      let weather = '';
      if (entry.weather) {
        const feels = Number(entry.weather.feels);
        const rain = Number(entry.weather.rain) || 0;
        const text = t('logWeather', Number.isFinite(feels) ? Math.round(feels) : null, rain >= WET_SLOT_MM ? fmt1(rain) : null);
        weather = `<span class="log-entry-weather">${escapeHtml(text)}</span>`;
      }
      const deleteLabel = escapeHtml(t('logDeleteAria', time, entry.people.join(', ')));
      html += `<li class="log-entry">
        <div class="log-entry-main">
          <span class="log-entry-time">${time}</span>
          <span class="log-entry-people">${peopleStr}</span>
          ${weather}
        </div>
        <button class="log-delete-btn ${UI.iconButton}" type="button" data-id="${escapeHtml(entry.id)}" title="${deleteLabel}" aria-label="${deleteLabel}">${X_ICON}</button>
      </li>`;
    });
    html += '</ul>';
  }
  if (log.length > logVisible) {
    html += `<button type="button" class="log-more ${UI.textLink} mt-200" id="logMore">${t('logShowOlder', log.length - logVisible)}</button>`;
  }

  el.innerHTML = html;
  document.getElementById('logMore')?.addEventListener('click', () => {
    const firstNew = logVisible;
    logVisible += LOG_PAGE;
    renderLogHistory();
    // Focus op de eerste regel die er net bij kwam.
    el.querySelectorAll('.log-delete-btn')[firstNew]?.focus();
  });
  el.querySelectorAll('.log-delete-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const current = getLog();
      const removed = current.find(e => String(e.id) === btn.dataset.id);
      saveLog(current.filter(e => e !== removed));
      renderLogHistory();
      // Verwijderen is direct, maar een paar seconden ongedaan te maken.
      showToast('toastDeleted', 'toastUndo', () => {
        const restored = [...getLog(), removed].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        saveLog(restored);
        renderLogHistory();
        [...el.querySelectorAll('.log-delete-btn')].find(b => b.dataset.id === String(removed.id))?.focus();
      });
      // Focus naar de volgende regel (of de lijst zelf) in plaats van <body>.
      const remaining = el.querySelectorAll('.log-delete-btn');
      const next = remaining[Math.min(idx, remaining.length - 1)];
      if (next) next.focus();
      else { el.tabIndex = -1; el.focus(); }
    });
  });
}

// Melding onderin, eventueel met een actie ("Ongedaan maken"). Tekst als
// vertaalsleutel, zodat een taalwissel de zichtbare melding mee vertaalt.
let toastTimer = null;
let toastState = null;
// Korte meldingen voor schermlezers. Eerst leeg en dan pas de tekst, zodat
// dezelfde melding twee keer na elkaar ook opnieuw wordt voorgelezen.
function announce(text) {
  const el = document.getElementById('srStatus');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = text; }, 60);
}

function showToast(key, actionKey, onAction) {
  toastState = { key, actionKey, onAction };
  renderToast();
  announce(t(key));
  const toast = document.getElementById('toast');
  toast.hidden = false;
  clearTimeout(toastTimer);
  // Huisstijl: een Toast met een actie mag niet vanzelf verdwijnen als die actie nergens
  // anders op de pagina staat (ongedaan maken). Die blijft staan tot sluiten of actie.
  if (!actionKey) toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  clearTimeout(toastTimer);
  document.getElementById('toast').hidden = true;
  toastState = null;
}

function renderToast() {
  const action = document.getElementById('toastAction');
  const { key, actionKey, onAction } = toastState;
  document.getElementById('toastText').textContent = t(key);
  action.hidden = !actionKey;
  action.textContent = actionKey ? t(actionKey) : '';
  action.onclick = () => { hideToast(); onAction?.(); };
  const close = document.getElementById('toastClose');
  close.setAttribute('aria-label', t('toastClose'));
  close.onclick = hideToast;
}

// ─── Voorkeuren ──────────────────────────────────────────────────────────────
function renderLunchOptions() {
  const select = document.getElementById('lunchTime');
  if (!select) return;
  const options = [];
  for (let m = 11 * 60; m <= 13 * 60 + 30; m += 15) options.push(m);
  select.innerHTML = options.map(m => {
    const label = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return `<option value="${m}" ${m === lunchMinutes ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

function bindPrefControls() {
  // Eerste bezoek: voorkeuren open, daarna ingeklapt tot één regel.
  const prefCard = document.getElementById('prefCard');
  if (prefCard && !localStorage_safe_get('dighv_pref')) prefCard.open = true;

  // huisstijl ToggleButton: radioknoppen, de stijl volgt :checked
  document.querySelectorAll('input[name="pref"]').forEach(radio => {
    radio.checked = radio.value === userPref;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      userPref = radio.value;
      localStorage_safe_set('dighv_pref', userPref);
      renderPrefSummary();
      if (weatherData) renderAdvice();
    });
  });

  document.getElementById('lunchTime')?.addEventListener('change', e => {
    lunchMinutes = Number(e.target.value);
    localStorage_safe_set('dighv_lunch', String(lunchMinutes));
    renderPrefSummary();
    renderLunchCountdown();
    if (weatherData) { renderBestMoment(); renderFeedbackRow(); updateAppBadge(); }
  });

  document.querySelectorAll('#feedbackRow [data-feedback]').forEach(btn => btn.addEventListener('click', () => giveFeedback(btn.dataset.feedback)));
  document.getElementById('shareBtn')?.addEventListener('click', shareBreak);

  document.getElementById('darkModeToggle').addEventListener('click', () => {
    darkModeForced = nextThemeMode();
    localStorage_safe_set('dighv_dark_force', darkModeForced);
    applyDarkMode();
  });

  document.getElementById('langToggle')?.addEventListener('click', () => {
    setLang(lang === 'nl' ? 'en' : 'nl');
  });
}

// ─── Vergelijking en seizoen ─────────────────────────────────────────────────
function renderWeatherComparison() {
  const el = document.getElementById('comparisonGrid');
  const card = el?.closest('#comparisonCard');
  if (!el || !weatherData?.daily?.time) return;
  const daily = weatherData.daily;
  // Op datum zoeken, niet op vaste posities: na middernacht met oude data
  // schuift "vandaag" anders een dag op.
  const i = daily.time.indexOf(getAmsterdamDateKey(new Date()));
  if (card) card.hidden = i < 1 || i + 1 >= daily.time.length;
  if (card?.hidden) return;

  // Het pauzevenster telt, niet de hele dag (regen 's nachts maakt een dag niet nat).
  // Zonder uurdata voor die dag: de dagwaarden.
  const getData = idx => windowDayStats(weatherData, daily.time[idx]) ?? {
    tempMax: daily.temperature_2m_max?.[idx] ?? null,
    code: daily.weather_code?.[idx],
    rain: daily.precipitation_sum?.[idx] || 0,
    wind: daily.wind_speed_10m_max?.[idx] || 0,
  };
  const days = [getData(i - 1), getData(i), getData(i + 1)];
  const todayScore = Math.round(dayScore(days[1]));
  const tomorrowScore = Math.round(dayScore(days[2]));
  const dir = tomorrowScore > todayScore ? 'better' : tomorrowScore === todayScore ? 'similar' : 'worse';

  const labels = [t('yesterday'), t('today'), t('tomorrow')];
  el.innerHTML = days.map((day, n) => `
    <div class="comparison-day ${n === 1 ? 'today' : ''}">
      <div class="comparison-label">${labels[n]}</div>
      <div class="comparison-icon">${weatherIcon(day.code, true, 28)}</div>
      <div class="comparison-temp"><span class="comparison-max">${t('maxLabel')}</span> ${day.tempMax == null ? '–' : Math.round(day.tempMax)}°</div>
      <div class="comparison-detail">${t('rainLabel', fmt1(day.rain))}</div>
      <div class="comparison-detail">${t('windLabel', Math.round(day.wind))}</div>
      ${n === 2 ? `<span class="comparison-verdict ${UI.label} ${UI.labelColor[{ better: 'green', worse: 'red', similar: 'grey' }[dir]]}"><span class="prose-label-small">${t(dir)}</span></span>` : ''}
    </div>`).join('');

  const dT = days[2].tempMax != null && days[1].tempMax != null ? Math.round(days[2].tempMax - days[1].tempMax) : 0;
  const rainy = days[2].rain >= 1 ? true : days[2].rain < 0.2 ? false : null;
  const summary = document.getElementById('comparisonSummary');
  if (summary) summary.textContent = t('compareSummary', dir, dT, rainy);
}

function renderSeasonBanner() {
  const el = document.getElementById('seasonBanner');
  if (!el || !weatherData?.daily) return;
  const todayKey = getAmsterdamDateKey(new Date());
  const idx = weatherData.daily.time.indexOf(todayKey);
  const today = idx >= 0 ? { max: weatherData.daily.temperature_2m_max[idx], min: weatherData.daily.temperature_2m_min[idx] } : null;
  const result = seasonalMoment(todayKey, today, readJson('dighv_season', {}));
  el.hidden = !result;
  if (!result) return;
  el.textContent = t('seasonal')[result.key];
  el.dataset.moment = result.key;
  localStorage_safe_set('dighv_season', JSON.stringify(result.memory));
}

// ─── Versie ──────────────────────────────────────────────────────────────────
let appVersionCount = null;
function setAppVersion(count) {
  appVersionCount = count;
  const el = document.getElementById('appVersion');
  if (el) el.textContent = t('versionLabel', count);
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

// ─── Rondleiding (eerste bezoek) ─────────────────────────────────────────────
const TUTORIAL_KEY = 'dighv_tutorial_done';
const TOUR_MOBILE_QUERY = '(max-width: 640px), (max-height: 500px)'; // zelfde breakpoints als de CSS

// Kort gehouden: vier stappen die samen de hele app dekken.
const TUTORIAL_STEPS = [
  { key: 'tourAdvice', target: 'advice' },
  { key: 'tourBreak', target: 'lunch' },
  { key: 'tourPref', target: 'pref' },
  { key: 'tourMore', target: 'header' },
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
        <button class="tour-close ${UI.actionIcon}" id="tourClose" type="button">${X_ICON}</button>
      </div>
      <h2 class="tour-title" id="tourTitle" tabindex="-1"></h2>
      <p class="tour-text" id="tourText"></p>
      <div class="tour-dots" aria-hidden="true">${TUTORIAL_STEPS.map(() => '<span class="tour-dot"></span>').join('')}</div>
      <div class="tour-actions">
        <button class="tour-skip" id="tourSkip" type="button"></button>
        <div class="tour-nav">
          <button class="tour-nav-btn anwb-button anwb-button--small anwb-button--tertiary" id="tourPrev" type="button"></button>
          <button class="tour-nav-btn primary anwb-button anwb-button--small anwb-button--secondary" id="tourNext" type="button"></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  // Achtergrond onbereikbaar voor muis, toetsenbord en schermlezer.
  const wrapper = document.querySelector('.app-shell');
  if (wrapper) wrapper.inert = true;
  tourEls = {
    overlay,
    wrapper,
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
  tourEls.prevBtn.addEventListener('click', () => showTourStep(tourStep - 1, true));
  tourEls.nextBtn.addEventListener('click', () => {
    if (tourStep >= TUTORIAL_STEPS.length - 1) endTutorial();
    else showTourStep(tourStep + 1, true);
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
  if (tourEls?.wrapper) tourEls.wrapper.inert = false;
  tourEls?.overlay.remove();
  tourEls = null;
  document.getElementById('tutorialBtn')?.focus();
}

function onTourKey(e) {
  if (!tourEls) return;
  if (e.key === 'Escape') { e.preventDefault(); endTutorial(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); tourEls.nextBtn.click(); }
  else if (e.key === 'ArrowLeft' && tourStep > 0) { e.preventDefault(); showTourStep(tourStep - 1, true); }
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

function showTourStep(i, announce = false) {
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
  // De voorkeuren zijn meestal ingeklapt; in de rondleiding tonen we ze open.
  if (target?.tagName === 'DETAILS') target.open = true;
  if (tourEls.resizeObserver) {
    tourEls.resizeObserver.disconnect();
    tourEls.resizeObserver.observe(document.body);
    if (target) tourEls.resizeObserver.observe(target);
  }
  if (target && target.getBoundingClientRect().height > 0) {
    if (window.matchMedia(TOUR_MOBILE_QUERY).matches) {
      // Op mobiel staat de uitleg onderin; zet het doel bovenaan zodat het niet bedekt wordt.
      const header = document.querySelector('.tabs-nav')?.offsetHeight || 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header - 12, behavior: 'instant' });
    } else {
      try { target.scrollIntoView({ block: 'center', behavior: 'instant' }); }
      catch (e) { target.scrollIntoView(); }
    }
  } else {
    window.scrollTo(0, 0);
  }
  positionTour();
  // Bij een stapwissel de titel focussen, zodat een schermlezer de nieuwe stap voorleest.
  if (announce) tourEls.title.focus();
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

  // Geen doel, of doel is verborgen: toon de tooltip gecentreerd zonder spotlight
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
  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
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

  // Kies de eerste plek die het doel niet bedekt: onder, boven, rechts, links.
  const centerX = Math.max(margin, Math.min(r.left + r.width / 2 - tw / 2, vw - tw - margin));
  const centerY = Math.max(margin, Math.min(r.top + r.height / 2 - th / 2, vh - th - margin));
  const candidates = [
    { top: r.bottom + pad + gap, left: centerX, fits: r.bottom + pad + gap + th <= vh - margin },
    { top: r.top - pad - gap - th, left: centerX, fits: r.top - pad - gap - th >= margin },
    { top: centerY, left: r.right + pad + gap, fits: r.right + pad + gap + tw <= vw - margin },
    { top: centerY, left: r.left - pad - gap - tw, fits: r.left - pad - gap - tw >= margin },
  ];
  const spot = candidates.find(c => c.fits) || { top: vh - th - margin, left: centerX };
  tooltip.style.top = Math.max(margin, Math.min(spot.top, vh - th - margin)) + 'px';
  tooltip.style.left = Math.max(margin, Math.min(spot.left, vw - tw - margin)) + 'px';
}

document.getElementById('tutorialBtn')?.addEventListener('click', startTutorial);

// ─── Init ────────────────────────────────────────────────────────────────────
// Elke stap apart, zodat één fout (bijv. kapotte localStorage) niet
// verhindert dat het weer wordt opgehaald.
const REFRESH_MS = 10 * 60 * 1000;
[restoreCachedData, bindPrefControls, applyTranslations, bindLocationControls, selectTabFromHash,
  fetchWeather, fetchAppVersion, fetchChangelogUpdates].forEach(step => {
  try { step(); } catch (err) { console.error('Init-stap mislukt:', step.name, err); }
});

// Niet verversen in een verborgen tab (scheelt API-calls), wel meteen bij
// terugkeer of als de verbinding terugkomt en de data oud is.
setInterval(() => { if (!document.hidden) fetchWeather(); }, REFRESH_MS);
setInterval(updateClock, 30000);
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
