# Moetikeenjasaan.paul

**De officieuze DIGHV pauze-scanner.** Even checken of je een jas nodig hebt voor je naar buiten loopt.

## Wat doet het?

Een interne webtool voor het DIGHV-team bij ANWB. De app geeft jasadvies op basis van live weerdata en helpt bij het plannen van een buitenpauze.

- **Jasadvies** voor het venster nu + 30 min: gevoelstemperatuur, regen, sneeuw, onweer, storm en windstoten, met een jas-o-meter die laat zien hoe dicht je bij de volgende jas zit
- **Jouw type en kalibratie**: kouwelijk, normaal of warmbloedig, en na de lunch "Hoe was het buiten?" zodat het advies zich aan jou aanpast
- **Pauze en beste moment**: countdown naar je eigen lunchtijd met het jasadvies voor dat moment (weekend telt door naar maandag), en het droogste half uur tussen 11:00 en 15:00
- **Collega's vragen**: deelt de twee of drie beste tijdstippen via het deelmenu of het klembord
- **Regen per 15 minuten**, alleen zichtbaar als er regen in zit, plus een regel wanneer de regen begint of stopt
- **Checklist** die meebeweegt met het weer; afvinkjes gelden voor één dag
- **Uurverwachting, weer nu, pollen** (ingeklapt als alles laag is) en **gisteren · vandaag · morgen** voor het pauzevenster van 11:00 tot 15:00
- **Looplog** met weersnapshot, statistieken, badges en ongedaan maken; het team is per toestel aan te passen
- Knipogen bij extreem weer en seizoensmomenten (Koningsdag, eerste terrasdag, eerste vorst)
- NL/EN, licht/donker/automatisch, installeerbaar als app (PWA), werkt offline met de laatst bekende data

Checklist, looplog, team en voorkeuren staan alleen in de browser van het eigen toestel (`localStorage`). Er is geen backend en niets wordt gedeeld.

## Tech

HTML, CSS en vanilla JavaScript, zonder build-stap en zonder runtime-dependencies.

| Bestand | Wat |
|---|---|
| `index.html` | Structuur, Content-Security-Policy |
| `logic.js` | Pure rekenlogica (advies, pauzemoment, statistieken); getest |
| `script.js` | Weergave, opslag, data ophalen |
| `nomad/` | ANWB Nomad-designsysteem: tokens, basisstijl en componenten |
| `style.css` | App-stijl op Nomad-tokens, plus het donkere thema |
| `theme-init.js` | Zet het thema vóór de eerste paint |
| `sw.js` | Service worker (offline) |
| `fonts/` | Inter, zelf gehost (OFL), als vervanger van de ANWB-fonts |

| Databron | Wat |
|---|---|
| [Open-Meteo Forecast API](https://open-meteo.com/) | Temperatuur, wind, windstoten, dauwpunt, neerslag, UV, weercode |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Live pollenconcentraties |
| [OpenStreetMap Nominatim](https://nominatim.org/) | Plaatsnaam bij "Gebruik mijn locatie" (© OpenStreetMap-bijdragers) |
| [GitHub API](https://docs.github.com/rest) | Versienummer en releaselog (een paar uur lokaal bewaard) |

Data wordt elke 10 minuten ververst (niet in een verborgen tabblad). Standaardlocatie: **ANWB HQ, Wassenaarseweg, Den Haag** (52.0964° N, 4.3268° O). Via het potlood kan de app je huidige locatie gebruiken, afgerond op ~100 m. Die keuze blijft bewaard tot je terugschakelt naar ANWB HQ.

## Huisstijl

De app volgt Nomad, het designsysteem van ANWB (nomad.anwb.nl): kleuren, typografie, vormtaal en componenten komen uit `nomad/`. `style.css` gebruikt alleen Nomad-tokens, geen eigen kleurwaarden.

- **Geen ANWB-logo.** Dit is geen officieel ANWB-product. Linksboven staat een eigen beeldmerk (gele tegel met een jas), dat ook als favicon en app-icoon dient.
- **Geen ANWB-fonts in de repo.** Clan Pro en Bernina Sans zijn eigendom van ANWB en de repo is openbaar. Staan ze op het toestel, dan gebruikt de app ze; anders valt hij terug op Inter.
- **Donker thema** bestaat niet in Nomad. Het is hier afgeleid van ANWB-ocean.

App-iconen opnieuw maken na een wijziging aan het beeldmerk: `node scripts/generate-icons.js`.

## Lokaal draaien

```bash
git clone https://github.com/rpvos-dhg/Moetikeenjasaan.paul.git
cd Moetikeenjasaan.paul
npx serve .
```

Geen installatie of build nodig.

## Tests en lint

```bash
npm test        # unit tests voor logic.js (node --test, tijdzone Europe/Amsterdam)
npm run lint    # ESLint
```

Beide draaien ook in GitHub Actions bij elke pull request.

## Team aanpassen

De standaardlijst staat bovenin `script.js` (`WALKERS`). Iedereen kan de lijst op het eigen toestel aanpassen via **Looplog → Team bewerken**; met "Standaardlijst terugzetten" komt de lijst uit de code terug.

## Disclaimer

Fun-tool gebouwd door en voor het DIGHV-team. Geen officieel ANWB-product. De drempelwaardes zijn gebaseerd op gezond verstand, niet op meteorologisch onderzoek. Als je nat wordt: niet onze schuld.
