# Moetikeenjasaan.paul

**De officieuze DIGHV pauze-scanner.** Even checken of je een jas nodig hebt voor je naar buiten loopt.

## Wat doet het?

Een interne webtool voor het DIGHV-team bij ANWB. De app geeft realtime jasadvies op basis van live weerdata en helpt bij het plannen van een buitenpauze.

- **Jasadvies** — gebaseerd op gevoelstemperatuur (nu + 30 min), met persoonlijke voorkeur (kouwelijk / normaal / warmbloedig)
- **Weercondities** — temperatuur, gevoelstemperatuur, wind, neerslag
- **Uurverwachting** — scrollbare strip voor de komende uren
- **Beste pauzetijd** — kiest het lekkerste moment tussen 11:00 en 15:00
- **Regengrafiek** — neerslag per 15 minuten voor de komende 2 uur
- **Pollenoverzicht** — live concentraties per allergeen (els, berk, grassen, bijvoet, ragweed, olijf)
- **Vandaag vs morgen** — snelle vergelijking voor de volgende dag
- **Volgende pauze** — countdown naar lunch of middagpauze
- **Checklist** — wat mee naar buiten? Automatisch gegenereerd op basis van weer
- **Looplog** — registreer wie er mee gaat op de wandeling

## Tech

Puur HTML, CSS en vanilla JavaScript — geen build-stap, geen dependencies.

| Databron | Wat |
|---|---|
| [Open-Meteo Forecast API](https://open-meteo.com/) | Temperatuur, wind, neerslag, UV, weercode |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Live pollenconcentraties |

Data wordt elke 10 minuten ververst. Standaardlocatie: **ANWB HQ, Wassenaarseweg, Den Haag** (52.0964° N, 4.3268° O). Via de locatieknop kan de app tijdelijk je huidige coördinaten gebruiken.

## Lokaal draaien

```bash
git clone https://github.com/rpvos-dhg/Moetikeenjasaan.paul.git
cd Moetikeenjasaan.paul
# Open index.html in een browser, of start een lokale server:
npx serve .
```

Geen installatie of build nodig.

## Team aanpassen

Namen in de looplog staan bovenin `script.js`:

```js
const WALKERS = [
  'Adam', 'Bob', 'David', ...
];
```

Voeg namen toe of verwijder ze daar.

## Disclaimer

Fun-tool gebouwd door en voor het DIGHV-team. Geen officieel ANWB-product. De drempelwaardes zijn gebaseerd op gezond verstand, niet op meteorologisch onderzoek. Als je nat wordt: niet onze schuld.
