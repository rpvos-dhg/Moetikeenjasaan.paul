# QA-ronde 2: Pauze-advies (oktober 2026)

Datum: 20 oktober 2026
Vorige ronde: [QA-REVIEW.md](QA-REVIEW.md) (juni 2026)

## Aanpak

Zes reviewers hebben de app parallel onderzocht, elk met een eigen focus:

| Spoor | Focus |
|---|---|
| F | Functionaliteit en logica: advies, tijden, foutpaden, opslag, vertaling |
| D | Visueel design en UI: 8 schermformaten, licht/donker, NL/EN, alle tabs |
| U | UX en teksten: flows, informatiehiërarchie, copy, klopt de uitleg |
| A | Toegankelijkheid (WCAG 2.2 AA): axe-core, toetsenbord, schermlezer, contrast |
| T | Techniek: PWA/offline, performance, security, privacy, codekwaliteit |
| I | Ideeën: wat kan slimmer, beter en leuker |

Open-Meteo is vanuit de testomgeving niet bereikbaar. Daarom draaide de app in Chromium (Playwright) met een nepklok, tijdzone Europe/Amsterdam en realistische nepdata voor zes weertypes (mild, koud en nat, warm en zonnig, opklarende motregen, sneeuw, storm) plus foutscenario's. Alle fixes zijn in die opstelling nagelopen. Een controle met de echte API in de browser is nog nodig (zie "Nog te verifiëren").

Ernst: hoog / middel / laag. Status: **gefixt** in deze PR, of open (aanbeveling).

## Samenvatting

- De belangrijkste bugs zaten in de robuustheid. Eén mislukt bij-verzoek (pollen of UV) of één kapotte waarde in localStorage legde het hele advies plat. Commitberichten van GitHub kwamen ongefilterd in de pagina (XSS).
- Het advies keek niet echt naar "nu + 30 min". Regen kwam deels uit het afgelopen uur, en sneeuw, onweer en storm werden niet herkend ("Jas + regen" en "Paraplu mee" bij storm en sneeuw).
- Offline toonde de app oude data als "data vers".
- Toegankelijkheid: veranderingen werden niet voorgelezen, focus ging op vijf plekken verloren, het tabs-patroon was half af.
- Design: in de lichte modus voelt de app sterk ANWB. Wel stond er een leeg navy vlak in de advieskaart op desktop, en mobiel is de pagina lang (4.200 px) met veel ruis.

## 1. Functionaliteit en logica

| ID | Ernst | Bevinding | Status |
|---|---|---|---|
| F1 | hoog | Een netwerkfout op het pollen- of UV-verzoek gaf "Kon weerdata niet ophalen", ook als het weer zelf binnen was. | **gefixt**: alleen het weer is verplicht, pollen en UV falen stil |
| F2 | hoog | Geldige maar verkeerd gevormde JSON in `dighv_log` of `dighv_checklist` (bijv. `{}` of `null`) liet de app hangen op "Weer ophalen...". | **gefixt**: vormcontrole, en elke init-stap draait apart |
| F3 | hoog (onzeker) | Het geforceerde KNMI-model levert mogelijk geen `precipitation_probability` (net als bij UV). Dan staat overal 0% regenkans. | **gefixt** als vangnet: valt terug op het standaardmodel als de kans ontbreekt. Live nog te bevestigen |
| F4 | middel | "Nu + 30 min" klopte niet: Open-Meteo telt neerslag over het voorgaande uur, dus een bui van 09-10 u gaf om 10:40 nog "Jas + regen", en regen vanaf 11:00 werd om 10:50 gemist. | **gefixt**: regen uit de kwartierdata in het echte venster |
| F5 | middel | De strook "Stopt zo dadelijk, wacht even" verscheen ook als het droog was. | **gefixt**: alleen bij echte neerslag nu |
| F6 | middel | Pollen "Morgen" toonde tussen 00:00 en 02:00 de waarden van vandaag (UTC-datum). | **gefixt** |
| F7 | middel | Zonder pollendata toonde de app zes keer 0 en een pollentip uit een vaste maandtabel (in mei "ZEER HOGE POLLEN"). | **gefixt**: melding "niet beschikbaar", geen tip |
| F8 | middel | Sneeuw en onweer niet herkend; bij storm "Paraplu mee" naast "paraplu kansloos". | **gefixt**: eigen advies voor sneeuw, onweer en storm; geen paraplu vanaf 40 km/u |
| F9 | middel | Na een mislukte verversing verving een foutmelding het advies, terwijl de rest oude data toonde. | **gefixt**: laatste advies blijft staan met de melding hoe oud het is |
| F10 | middel | Offline gaf de service worker oude data, en de app noemde die "data vers". | **gefixt**: leeftijd uit de data zelf, "NIET LIVE" na 30 min |
| F11 | middel | Commitberichten uit GitHub kwamen ongeëscaped in `innerHTML` (zie T4). | **gefixt** |
| F12 | laag | "Nu!" stond er maar één minuut; om 12:05 telde de app af naar de middagpauze. Vrijdagmiddag gaf "Morgen lunch" (zaterdag). Om 15:30 stond bij beste pauzetijd nog "Nu meteen". | **gefixt**: "Nu!" tijdens 12:00-12:30 en 15:00-15:15, weekend naar maandag, geen pauzetijd meer na 15:30 |
| F13 | laag | Nederlands in de Engelse versie: km/u, "1u 20m", "Versie", aria-labels, paginatitel. | **gefixt** |
| F14 | laag | Checklist en tips gebruikten andere drempels; afvinkjes bleven dagen staan. | **gefixt**: één set condities, lijst reset per dag |
| F15 | laag | Diversen: 6 decimalen in coördinaten, geen timeout op Nominatim, dubbelklik op Opslaan gaf een extra regel, gelijke score gaf "Minder goed", dark-modeknop kon "altijd donker" niet bereiken als auto al donker was, gevoelstemperatuur 16,6 getoond als 17 met advies "Dun jasje". | **gefixt** |
| F16 | laag (onzeker) | Rond de wintertijdovergang (25 okt, dubbel uur 02:00-03:00) kunnen tijdslots verschuiven. | open: overstappen op `timeformat=unixtime` |

## 2. Visueel design en UI

| ID | Ernst | Bevinding | Status |
|---|---|---|---|
| D1 | hoog | Leeg navy vlak van 195-358 px in de advieskaart op desktop. | **gefixt**: kolommen lopen los van elkaar door |
| D2 | hoog | Het advies is kleiner dan de vaste kop "Jas aan of niet?"; hero met locatie en intro kost 300 px voor het advies begint. | open |
| D3 | hoog | Op 320 px liep "Pauze-advies" onder de taalknop. | **gefixt** |
| D4 | hoog | Vier tabs in drie kolommen op mobiel; "Releaselog" alleen op een tweede rij. | **gefixt** |
| D5 | middel | Sticky tabbalk werkte niet op mobiel (`overflow-x: hidden`). | **gefixt** (`overflow-x: clip`) |
| D6 | hoog | Dark mode verliest hiërarchie en huisstijl: advieskaart grijs als de rest, roestbruine hoofdtip, drie verschillende accentkleuren, alles geel. | deels: hoofdtip nu ANWB-geel. Rest open |
| D7 | middel | Dark: randen vielen weg (lijnkleur gelijk aan kaartkleur), grafieklabels 1,3:1, statusrand pollen overschreven. | **gefixt** |
| D8 | middel | Regengrafiek bij droog weer: leeg vlak met streepjes. | **gefixt**: alleen de samenvatting |
| D9 | middel | Laad- en foutstaat: slecht contrast, geen knop om opnieuw te proberen, LIVE bleef groen. | **gefixt** |
| D10 | middel | Pollenkaart zonder data toonde nullen als echte waarden. | **gefixt** |
| D11 | middel | Tips lijken knoppen; lunchkaart even zwaar als advieskaart; 13 verschillende afrondingen. | open |
| D13 | laag | Mobiel: locatiebadge van 170 px met coördinaten, "Jouw type" 230 px, vergelijking 560 px gestapeld. | open (coördinaten nu 4 decimalen) |
| D14 | laag | 19 lettergroottes (9-64 px), geen typografische schaal. | open |
| D15 | laag | Emoji naast SVG-iconen; headerknoppen in drie vormen. | open |
| D16 | laag | Tooltip van de rondleiding bedekt op desktop soms het advies. | open |
| D17 | laag | Focusring op tabs alleen geel op wit (1,5:1). | **gefixt** |
| D18 | laag | CSS-hygiëne: dode regels (`.kicker`, `.tip.pollen`, `#view-advice`), `var(--text)` niet gedefinieerd, #ffcc00 18 keer hard gecodeerd, drie losse `max-width: 640px`-blokken, dark wordt pas na JS gezet (lichte flits). | open; footer eindigt niet meer op "· " |

Sterk: geen horizontale scroll van 320 tot 1920 px, de lichte modus voelt herkenbaar ANWB, tap-targets op mobiel 40-44 px, de uitleg- en looplogtab zijn rustig opgezet.

## 3. UX en teksten

| ID | Ernst | Bevinding | Status |
|---|---|---|---|
| U1 | hoog | Misleidend advies bij storm en sneeuw (zie F8). | **gefixt** |
| U2 | hoog | Het getal achter het advies stond 1.600 px lager; temperatuur op vijf plekken. | deels: "Voelt als 13 °C" (en "voor jou ..." bij een andere voorkeur) staat nu onder het advies |
| U3 | hoog | Volgorde op mobiel: "Jouw type" voor de checklist, regenkaart ook bij droog weer, pollen 660 px bij allemaal 0. | deels: droge regenkaart ingeklapt. Herordening open |
| U4 | hoog | Looplog lijkt gedeeld maar staat alleen op het eigen toestel; dubbel opslaan; "Niemand" wist alleen de selectie. | **gefixt**: uitleg "alleen op dit toestel", knop heet "Wis selectie", geen dubbele regels. Ongedaan maken na verwijderen is open |
| U5 | middel | Fout- en offline-toestanden half af. | **gefixt** (zie F9, F10, D9) |
| U6 | middel | Checklist reset nooit; UV-labels kloppen niet met drempels. | **gefixt** |
| U7 | middel | Pauzelogica sprak zichzelf tegen; beste pauzetijd kiest bijna altijd 15:00, ook bij 90% regen. | deels: tijden gefixt (F12). Score-formule open (zie I5) |
| U8 | middel | Niet duidelijk wat "Jouw type" doet en dat het onthouden wordt. | deels: effect zichtbaar via "voor jou ... °C" |
| U9 | middel | "Tijdelijk" locatie gebruiken blijkt permanent. | **gefixt** in uitleg en README; afronden op ~100 m |
| U10 | middel | Pollen in µg/m³; Open-Meteo levert korrels/m³. "Ambrosia" en "ragweed" door elkaar. | **gefixt** |
| U11 | middel | Dark-modeknop: 3 standen, 2 iconen; automatisch wordt ook donker na zonsondergang als het systeem op licht staat. | deels: alle standen bereikbaar, duidelijker label. De zonsondergang-regel is een keuze voor jullie |
| U12 | middel | Rondleiding van 14 stappen, "een halve minuut", zegt "klik" op een telefoon. | open: terug naar ~4 stappen |
| U13 | laag | "Score: 16" nergens uitgelegd; titel zegt twee dagen, er staan er drie. | deels: titel "Gisteren · vandaag · morgen", gelijke score "Vergelijkbaar" |
| U14 | laag | Releaselog toont ruwe commits, "Fix ..." met badge "Nieuw", PR-nummers. | **gefixt**: badge uit het eerste woord, PR-nummer weg |
| U15 | middel | "Hoe werkt dit?" en README klopten op meerdere punten niet met de code. | **gefixt** voor alles wat in deze PR veranderde |

Doorgevoerde tekstcorrecties (selectie): "Dikke jas + laagjes", "Waterdichte jas" in plaats van "Jas + regen", "net bijgewerkt" / "10 min geleden bijgewerkt", "Grootste kans" in plaats van "Piek kans", "Matige UV: smeer je in", rustiger pollentips zonder hoofdletters, "Zonnebrandcrème", "Zonnebril (UV 3+)", "Pet of hoed (UV 7+)", "Geen officieel ANWB-product". Engels: "I feel the cold" / "I run warm", "Chilly out there", "How it works", "Highest chance", "Not an official ANWB product".

## 4. Toegankelijkheid

| ID | Ernst | WCAG | Bevinding | Status |
|---|---|---|---|---|
| A1 | hoog | 4.1.3 | Nieuw advies, foutmelding en opslaan werden niet voorgelezen. | **gefixt**: live region die alleen bij een gewijzigd advies spreekt; fout met `role="alert"` |
| A2 | hoog | 2.4.3 | Focus naar `<body>` bij: verversen in de checklist, Escape in het locatiepaneel, "ANWB HQ", "Huidige locatie", looplog-regel verwijderen. | **gefixt** |
| A3 | middel | 4.1.2 | Tabs zonder pijltjesbediening, zonder tabpanels; `role="tablist"` overschreef het nav-landmark. | **gefixt** (pijltjes, Home, End, roving tabindex, tabpanels) |
| A4 | middel | 1.3.1 | Alleen `main` op de adviestab, geen h1 op andere tabs, koppen in verkeerde volgorde. | **gefixt**; axe meldt alleen nog `region` (tabbalk en hero buiten een landmark, "moderate") |
| A5 | middel | 1.4.11 | Focusring tabs 1,5:1. | **gefixt** |
| A6 | middel | 1.4.3 | Contrast: grafieklabels dark 1,28:1, fout dark 2,54:1, "Score" gisteren 2,83:1, klok looplog 2,84:1, actieve loper dark 3,41:1. | **gefixt** |
| A7 | middel | 1.1.1 | Regengrafiek gaf de data niet door. | **gefixt**: label met tijden en mm |
| A8 | middel | 1.3.1 | Uurverwachting `role="list"` zonder listitems, niet scrollbaar met toetsenbord. | **gefixt** |
| A9 | middel | 1.4.10 | Op 320 px werd een lang woord in de releaselog afgeknipt. | **gefixt** |
| A10 | middel | 4.1.2 | Verwijderknop heette "×". | **gefixt** |
| A11 | laag | 2.5.3 | Taalknop: zichtbare naam "EN" zit niet in de toegankelijke naam. | open |
| A12 | laag | 1.4.1 | Pollenniveau alleen via kleur. | **gefixt**: "matig"/"hoog" in tekst |
| A13 | laag | 1.1.1 | Decoratieve emoji worden voorgelezen. | deels (weer-iconen in advies en uurverwachting verborgen) |
| A15 | laag | 4.1.2 | Verboden `aria-label` op de groene stip; LIVE ook bij fout. | **gefixt** |
| A16 | laag | 2.4.3 | Achtergrond niet `inert` tijdens de rondleiding. | open |
| A17 | laag | 2.3.3 | Smooth scroll bij tabwissel negeerde reduced motion. | **gefixt** |

In orde: aria-selected en aria-pressed, focus trap en Escape in de rondleiding, 200% zoom en text-spacing, target size (min. 24 px).

## 5. Techniek: PWA, performance, security, privacy

| ID | Ernst | Categorie | Bevinding | Status |
|---|---|---|---|---|
| T1 | hoog | robuustheid | Zie F1. | **gefixt** |
| T2 | hoog | pwa | Zie F10. | **gefixt** |
| T3 | hoog | robuustheid | Zie F2. | **gefixt** |
| T4 | middel | security | XSS via commitberichten: een commit met `<img onerror=...>` voerde code uit bij elke paginalaad. | **gefixt**: escapen, en een Content-Security-Policy die inline scripts blokkeert |
| T5 | middel | security | Geen CSP. | **gefixt**: CSP via meta-tag; service-worker-registratie verhuisd naar script.js |
| T6 | middel | perf | Verversen ging door in een verborgen tab; GitHub-API 2 calls per paginalaad (limiet 60 per uur per IP, één kantoor-IP). | **gefixt**: pauze bij verborgen tab, verversen bij terugkeer en bij `online`; GitHub 6 uur in localStorage |
| T7 | middel | privacy | Exacte GPS-positie bewaard, getoond en in de SW-cache. | **gefixt**: afgerond op ~100 m, Nominatim niet meer gecachet |
| T8 | middel | privacy | Zie "Publieke hosting" hieronder. | open, keuze voor het team |
| T9 | middel | pwa | SW-pad hard gecodeerd; manifest en maskable icoon niet in precache; precache kon via HTTP-cache een oude versie pakken. | **gefixt** |
| T10 | middel | pwa | SW wiste bij activeren alle caches op de origin, ook van andere projecten op `rpvos-dhg.github.io`. | **gefixt**: alleen `dighv-*` |
| T11 | middel | perf | Layout shift (CLS 0,21 op desktop) als de data binnenkomt. | open: min-height of skeletons |
| T12 | middel | perf/privacy | Google Fonts blokkeert rendering (2 s vertraging = 2 s later beeld) en stuurt elk IP naar Google. | open: fonts zelf hosten |
| T13 | middel | robuustheid | Geen timeouts; hangende API = eindeloos laden. | **gefixt**: 15 s (weer), 8 s (Nominatim) |
| T14 | laag | robuustheid | Checklist en looplog omzeilden de veilige opslag-wrapper. | **gefixt** |
| T15 | laag | pwa | Manifest mist `id`, `lang`, `screenshots`, `shortcuts`; geen OSM-attributie. | deels: OSM genoemd in de uitleg. Manifest open |
| T16 | laag | code | Eén bestand van 2.500 regels, geen tests of CI, drempels op meerdere plekken. | deels: één `getConditions()` voor advies en checklist. Rest open |
| T17 | laag | perf | Checklist werd elke 10 min opnieuw opgebouwd. | **gefixt**: alleen bij een wijziging |

In orde: SW-update werkt na één gewone reload, offline reload toont de app, Nominatim-plaatsnaam gaat via `textContent`, race-bescherming bij locatiewissel.

## 6. Publieke hosting: punten om als team over te beslissen

De site en de repo zijn openbaar. Per punt is het risico klein, maar samen is het het overwegen waard. Niets hiervan is in deze PR aangepast.

1. **Namen van collega's**: `WALKERS` bevat 17 voornamen, samen met DIGHV en ANWB herleidbaar tot personen. Opties: namen per toestel laten invoeren (localStorage), of delen via een link met `#team=...` (het fragment gaat niet naar de server).
2. **Toegangsinformatie**: "Bezoekerspas (check: heeft iemand een pas?)" en "Route: bij bezoekerspas → rotonde naar buiten" beschrijven hoe je het hoofdkantoor in en uit komt. Algemener formuleren kost weinig.
3. **Git-historie**: een eerder verwijderd VS Code-bestand met een Windows-gebruikersnaam staat nog in de historie, en de releaselog noemt die verwijdering. Opschonen kan met `git filter-repo`, maar herschrijft de historie.
4. **Huisstijl**: ANWB-kleuren en "ANWB HQ" op een publieke URL kunnen officieel overkomen. De disclaimer staat nu iets duidelijker in de footer.

## 7. Open aanbevelingen op volgorde

Stand 21 oktober: alle zeven punten zijn uitgevoerd in de vervolgronde (zie sectie 10). De lijst blijft staan als verslag.

1. Mobiele volgorde herzien (U3, D2, D13): advies en regen bovenaan, "Jouw type" compact onder het advies, pollen inklappen als alles laag is, hero kleiner.
2. Beste pauzetijd per kwartier rond de echte pauzetijd, met "regen begint om 12:30" (I5, U7).
3. Rondleiding inkorten tot ~4 stappen (U12).
4. Dark mode als eigen ontwerp: navy advieskaart, één accentkleur, tokens (D6).
5. Fonts zelf hosten en layout shift voorkomen (T12, T11).
6. Logica naar een pure functie met een paar `node --test`-tests en eslint in een GitHub Action (T16).
7. Beslissen over de punten in sectie 6.

## 8. Ideeën: slimmer, beter, leuker

Top 5:

| ID | Idee | Moeite |
|---|---|---|
| I1 | Persoonlijke kalibratie: na de wandeling "te koud / goed / te warm" tikken; je offset schuift 1 °C. Na een week klopt het advies voor jou. | S |
| I2 | Advies voor jouw pauzevenster (bijv. 12:15-12:45) in plaats van "nu + 30 min", met min/max over dat venster. | M |
| I5 | Beste tijd per kwartier, met "regen begint/stopt om ...". | M |
| I7 | Deelknop "Wandelen om 12:15? Droog tot 13:00, 14 °C" via Web Share, met kopiëren als terugval. | S |
| I13 | Looplog met weersnapshot en statistieken: "9 droge wandelingen op rij", "dapperste: 4× in de regen". | M |

Verder:

- Slimmer: windstoten (`wind_gusts_10m`) voor "capuchon, geen paraplu" (I3); zon en bewolking voor het gevoel (I3); minder ruis zoals pollen inklappen buiten het seizoen (I6).
- Beter: direct de laatste data tonen bij openen (I10); werkdagbewuste countdown (gedaan, I8); dagelijkse checklistreset (gedaan, I9); teamnamen uit de repo (I11); app-snelkoppelingen en badge (I12).
- Leuk: teksten bij extreem weer ("Code oranje. De koffieautomaat telt ook als wandeling") (I14); jas-o-meter met naald (I15); achievements als "IJsbeer" en "Verzopen kat" (I16); seizoensmomenten zoals eerste terrasdag (I17); teamstemming over het tijdstip (I18, vraagt gedeelde opslag; binnen de eigen tenant via Microsoft Forms/Lists is privacy het makkelijkst te regelen).

## 9. Nog te verifiëren met echte data

- Komt `precipitation_probability` voor de standaardlocatie (KNMI-model) gevuld binnen, of gebruikt de app de terugval? Te zien in DevTools bij het tweede `api.open-meteo.com`-verzoek.
- Verschijnen regengrafiek, "Voelt als" en de wachtstrook zoals verwacht bij een echte bui.
- De service worker op GitHub Pages: na deploy één keer herladen, daarna moet `dighv-v10` de enige cache van de app zijn.
- De Content-Security-Policy op de live site: geen meldingen in de console.

## 10. Vervolgronde: alles doorgevoerd

Na deze ronde zijn alle bevindingen uit sectie 1 tot en met 5 en alle ideeën uit sectie 8 verwerkt. Het team besliste over de punten uit sectie 6:

| Punt | Besluit |
|---|---|
| Namen in de code | Blijven staan als standaardlijst; per toestel aan te passen via Looplog → Team bewerken |
| Toegangsinformatie in de checklist | Blijft staan |
| Git-historie | Wordt opgeschoond (laatste stap, zie hieronder) |
| Teamstemming (I18) | Zonder opslag: alleen een deelknop met twee of drie droge tijdstippen |

Belangrijkste wijzigingen:

- Rekenlogica apart in `logic.js` met unit tests (`node --test`), ESLint en een GitHub Action.
- Fonts zelf gehost, thema vóór de eerste paint, data in unixtime, laatst bekende data direct zichtbaar bij openen.
- Kalibratie, pauzevenster, beste moment per kwartier, jas-o-meter, windstoten en dauwpunt, looplog met weersnapshot, statistieken en badges, ongedaan maken, seizoensmomenten.
- Rondleiding van 4 stappen, ARIA-tabs, één `main`-landmark, live region voor het advies.

Gemeten in de testopstelling: axe-core 0 meldingen (licht, donker, mobiel, warm, fout; alle tabs), CLS van 0,21 naar 0,03, geen horizontale scroll van 320 tot 1280 px, geen CSP-meldingen.

## 11. Impeccable-ronde

Vier reviewers draaiden daarna de impeccable-skill: audit, critique, polish (met typeset en layout) en harden (met clarify). Uitgangsscore: audit 14/20 ("pass, krap"), critique 26/40. De automatische detector vond 15 patronen.

| Thema | Wat er veranderd is |
|---|---|
| Structuur | De DOM staat in de mobiele leesvolgorde, zonder CSS `order`. Beeld- en focusvolgorde zijn nu gelijk. "Jouw type" is een compacte uitklapregel onder het advies. |
| Visueel | Rasterachtergrond, decoratieve cirkel en gekleurde zijstrepen weg. Koel grijs papier. Kaarttitels in zinsvorm, cijfers in Inter met vaste breedte. LIVE-stip pulseert niet meer. |
| Typografie en maten | Alle tekstmaten in rem. Uitleg in 16 px met een maximale regellengte. Tikdoelen minimaal 44 px op touchscreens. |
| Advies | Eén jasterm per advies, max. drie tips als lijst, één regendrempel. Regen begint/stopt alleen nog in de wachtstrook, met sneeuwwoorden bij sneeuw. Bij storm geen deelknop, jas-o-meter of feedback. |
| Teksten | "Hoe was het buiten?" met "Ik had het koud / Precies goed / Ik had het warm / Niet buiten geweest". Bijwerktijd in het advieslabel. Kortere tabnamen (Uitleg, Nieuw). Inhoudsopgave in de uitleg. |
| Robuustheid | Opslag vol: oude cache wissen en opnieuw proberen, anders een melding. Lege kaarten verborgen tijdens laden en bij een fout. Meldingen wisselen mee van taal. Kalibratie heeft een grens en een knop Terugzetten. Looplog toont 50 wandelingen met "oudere tonen". |
| Delen | Als delen en klembord niet werken, verschijnt de tekst in een selecteerbaar veld. |

Niet overgenomen: het voorstel om route- en pasteksten algemener te maken (keuze van het team, zie sectie 10).

Detector na de fixes: 3 van 15 patronen over. Twee daarvan gaan over Inter als lettertype; dat is een bewuste keuze. De derde ("dark glow") is een focusring en geen gloed. Een nieuwe audit- en critique-score is niet gemeten.

### Git-historie

`.vscode/launch.json` en `log.json` zijn met `git filter-repo` uit de historie gehaald, en een commitbericht met een gebruikersnaam is aangepast. Daarna zijn de branches geforceerd gepusht. Iedereen met een lokale kopie moet opnieuw clonen. Oude pull requests op GitHub (`refs/pull/*`) verwijzen nog naar de oude commits; die zijn alleen via GitHub Support volledig te verwijderen.

## 12. Controleronde: is alles echt verwerkt?

Na de merge van de impeccable-ronde hebben vier controleurs elke bevinding opnieuw tegen de code gelegd. Ze keken naar dit rapport, het rapport van juni en de impeccable-ronde, en ook naar de ruwe rapporten van de eerste reviewers, omdat daar details in stonden die in de samenvatting waren weggevallen.

| Bron | Gecontroleerd | In orde | Half verwerkt |
|---|---|---|---|
| Functionaliteit en techniek (F, T, sectie 9) | 38 | 26 | 12 |
| Design en toegankelijkheid (D, A) | 36 | 24 | 12 |
| UX, aanbevelingen en ideeën (U, sectie 7, I) | 40 | 27 | 13 |
| Juni-rapport | 25 | 24 | 1 |
| Impeccable-ronde | 70 | 54 | 16 |

Een deel van de halve punten kwam bij meerdere controleurs terug. Alle halve punten zijn daarna opgelost. De belangrijkste:

- **Advies**: de gevoelstemperatuur is nu de laagste over het hele venster. Bij aanhoudende motregen meldt de app niet meer dat de regen stopt na één droog kwartier. Bij storm zonder droog moment staat er "Vandaag geen goed wandelmoment".
- **Pauze**: de pauzekaart geeft een jasadvies voor je eigen lunchtijd. Regenkans en de app-badge gebruiken het juiste uurslot: Open-Meteo telt een uur over het voorgaande uur. In het weekend is er geen beste moment voor vandaag.
- **Vergelijking**: gisteren, vandaag en morgen kijken naar 11:00 tot 15:00. Regen 's nachts maakt een dag niet meer nat.
- **Checklist**: geen jassen meer (die noemt het advies al) en geen paraplu bij sneeuw. De regels staan in `logic.js`, net als alle drempels (`THRESHOLDS`), en zijn getest.
- **Robuustheid**: een kapotte of onvolledige opgeslagen of opgehaalde weerset laat de app niet meer hangen. Data van meer dan 6 uur oud geeft geen jasadvies meer.
- **Privacy en PWA**: weerdata in de service worker staat in een eigen, kleine cache (maximaal 6 antwoorden) die bij een locatiewissel wordt gewist. Manifest-URL's zijn relatief. OpenStreetMap staat met licentievermelding in beeld.
- **Releaselog**: leesbare NL- en EN-teksten voor alle releases. Commits verschijnen alleen nog als ze nieuwer zijn dan de laatste geschreven release, zonder merge-commits.
- **Design**: Inter toont nu echt 700 en 800 (het lettertype stond op 400 tot 600). De keuzelijst heeft weer een pijltje. In donker thema is de waarschuwing oranje in plaats van bijna hetzelfde geel. Een rand vervaagt als de uurstrook nog verder scrolt. Afrondingen en kleuren lopen via tokens.
- **Toegankelijkheid**: meldingen (opgeslagen, toast, bedankje) worden voorgelezen. Na een actie staat de focus op een logische plek in plaats van op de pagina. Op een liggende telefoon blijft de h1 voor schermlezers bestaan en staat de rondleiding rechts. Tikdoelen zijn op touchscreens overal 44 px.
- **Layout**: regen staat direct onder het advies, daarna de pauze en "Jouw type". De uitlegregel bij "Jouw type" is ook op mobiel zichtbaar. Verspringen bij de eerste keer laden: telefoon van 0,29 naar 0,09, desktop 0,03.
- **Thema**: "Automatisch" blijft donker na zonsondergang (bestaande keuze), maar flitst niet meer van licht naar donker: de app onthoudt de tijden van zon op en zon onder.

Bewust niet veranderd:
- "Nieuw" blijft een tab naast de footerlink. Een releaselog buiten het tabpatroon zou de ARIA-tabs breken.
- Het jaslabel staat als gele chip boven de tips en telt niet mee voor het maximum van drie.
- Route- en pasteksten blijven staan; dat koos het team.

