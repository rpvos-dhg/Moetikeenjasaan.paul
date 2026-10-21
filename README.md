# Moetikeenjasaan.paul

**De officieuze DIGHV pauze-scanner.** Even checken of je een jas nodig hebt voor je naar buiten loopt.

## Wat doet het?

Een interne webtool voor het DIGHV-team bij ANWB. De app geeft jasadvies op basis van live weerdata en helpt bij het plannen van een buitenpauze.

- **Jasadvies** voor het venster nu + 30 min: gevoelstemperatuur, regen, sneeuw, onweer, storm en windstoten, met een jas-o-meter die laat zien hoe dicht je bij de volgende jas zit
- **Jouw type en kalibratie**: kouwelijk, normaal of warmbloedig, en na de lunch "Hoe was het buiten?" zodat het advies zich aan jou aanpast
- **Pauze en beste moment**: countdown naar je eigen lunchtijd (weekend telt door naar maandag) en het droogste half uur tussen 11:00 en 15:00
- **Collega's vragen**: deelt twee of drie droge tijdstippen via het deelmenu of het klembord
- **Regen per 15 minuten**, alleen zichtbaar als er regen in zit, plus een regel wanneer de regen begint of stopt
- **Checklist** die meebeweegt met het weer; afvinkjes gelden voor één dag
- **Uurverwachting, weer nu, pollen** (ingeklapt als alles laag is) en **gisteren · vandaag · morgen**
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
| `style.css` | Tokens (kleur, typografie, vorm), licht en donker thema |
| `theme-init.js` | Zet het thema vóór de eerste paint |
| `sw.js` | Service worker (offline) |
| `fonts/` | Inter en Bricolage Grotesque, zelf gehost (OFL) |

| Databron | Wat |
|---|---|
| [Open-Meteo Forecast API](https://open-meteo.com/) | Temperatuur, wind, windstoten, dauwpunt, neerslag, UV, weercode |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Live pollenconcentraties |
| [OpenStreetMap Nominatim](https://nominatim.org/) | Plaatsnaam bij "Huidige locatie" |

Data wordt elke 10 minuten ververst (niet in een verborgen tabblad). Standaardlocatie: **ANWB HQ, Wassenaarseweg, Den Haag** (52.0964° N, 4.3268° O). Via het potlood kan de app je huidige locatie gebruiken, afgerond op ~100 m. Die keuze blijft bewaard tot je terugschakelt naar ANWB HQ.

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
