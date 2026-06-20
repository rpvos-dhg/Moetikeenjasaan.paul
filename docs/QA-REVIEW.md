# QA / UX / UI / Accessibility Review — Pauze-advies

Review date: 2026-06-20
Scope: full-stack QA, UX/UI, accessibility (WCAG 2.1 AA), responsive / multi-device,
performance, PWA and i18n review of the vanilla HTML/CSS/JS app.

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low / polish.
Items marked **[fixed]** are addressed in this PR; the rest are recommendations.

---

## 1. Functional bugs (QA)

### 🔴 Rain chart & "wacht ff" strip never rendered — **[fixed]**
`renderRainChart()` and `renderWachtFf()` both read `weatherData.minutely_15`, but the
weather request never asked for it. The result: the headline "Regen per 15 minuten"
card (`#rainCard`) was permanently hidden and the "wacht even, het droogt zo op" strip
never appeared — two documented features that were effectively dead.
Fix: added `&minutely_15=precipitation` to the forecast URL.

### 🔴 "Vandaag vs Morgen" compared the wrong days — **[fixed]**
The request used `forecast_days=3` with no `past_days`, so `daily` index 0 was **today**,
not yesterday. The comparison card therefore labelled today's data as "Gisteren",
tomorrow's as "Vandaag", and the day-after as "Morgen" — every column was off by one day.
Fix: added `&past_days=1` so indices 0/1/2 are genuinely yesterday/today/tomorrow.

### 🟠 UV index always read at midnight (≈0) — **[fixed]**
`renderMetrics()`, `renderAdvice()` and the checklist read `hourly.uv_index[0]`, i.e. the
first hourly sample = today 00:00, where UV is always 0. As a result the UV metric was
nearly always "0", and the UV tips / sunglasses / sunscreen / hat checklist items almost
never appeared, even on sunny afternoons.
Fix: UV (and the rain-probability checklist conditions) now use the **current-hour**
index via a new `hourlyNowIndex()` helper.

### 🟠 Hour lookups would break after adding `past_days` — **[fixed]**
Several functions located "now" with `time.findIndex(t => new Date(t).getHours() === currentHour)`.
With `past_days=1` the array now starts at yesterday, so that match returns **yesterday's**
slot of the same hour. Introduced timezone-consistent helpers `hourlyNowIndex()` (current
slot) and `hourlyIndexAtHour()` (next occurrence of a target hour) and routed all hour
lookups through them.

### 🟡 English changelog badges were Dutch — **[fixed]**
`typeConfig` returned `'Nieuw'`/`'Verbeterd'` in both languages, so the EN release log
showed Dutch badge labels. Now "New"/"Improved".

### 🟡 `renderBestTime` used a UTC date key — **[fixed]**
`todayKey` was `now.toISOString().slice(0,10)` (UTC) compared against local `daily.time`
entries — a mismatch around midnight in CEST. Switched to `getAmsterdamDateKey()`.

### 🔵 Dead style branch
`renderAdvice()` pushes pollen tips with `pollen: false`, so the `.tip.pollen` style is
never applied. Harmless, but the class/branch can be removed.

---

## 2. Accessibility (WCAG 2.1 AA)

### 🟠 Toggle state not exposed to assistive tech — **[fixed]**
Tabs, "Jouw type" preference buttons and walker buttons signalled their selected state
with a CSS class only. Screen-reader users could not tell what was active. Added
`role="tab"`/`aria-selected` on tabs (+ `aria-controls` to the panels) and `aria-pressed`
on the preference and walker buttons, kept in sync on every toggle.

### 🟡 Hard-coded Dutch `aria-label`s — **[fixed]**
`aria-label`s on the preference group, forecast list, rain chart and live dot were Dutch
regardless of the active language, and the language button had no label at all. These are
now translated in `applyTranslations()` and the language button announces its action.

### 🟡 Reduced-motion not honoured — **[fixed]**
Continuous `pulse` / `livePulse` animations and smooth-scroll ran for everyone. Added a
`prefers-reduced-motion: reduce` block that neutralises animations and transitions.

### 🟡 Muted text contrast — **[fixed]**
`--muted` was `#5a6b80` (~4.6:1 on paper) used at 10–12px in several places — at or below
the AA threshold for small text. Darkened to `#4d5d72` (~5.5:1) for margin.

### 🔵 Remaining recommendations (not in this PR)
- Tabs lack roving-`tabindex` / arrow-key navigation expected of an ARIA tablist.
- Focus ring is yellow (`--anwb-yellow`) and has low contrast when the focused control is
  itself yellow (checklist card, active pref). Consider a dark inner ring on yellow surfaces.
- `role="heading" aria-level="2"` on `<div>`s works, but native `<h2>` is more robust.

---

## 3. Responsive / multi-device

- 🔵 **Notch / safe-area** — **[fixed]** added `viewport-fit=cover` plus `env(safe-area-inset-*)`
  padding on the header/footer so content clears the status bar and home indicator on
  iOS and Android cut-outs (esp. landscape).
- 🟢 Layout is otherwise solid: the 2×2 grid collapses to one column at 960px, the 640px
  breakpoint enlarges tap targets to ≥40px, the forecast strip scrolls horizontally, and
  long location strings wrap. Verified by reading the breakpoints; no overflow traps found.
- 🔵 `min-height: 100vh` can leave a gap under mobile browser chrome; `100dvh` is more exact.

---

## 4. PWA

- 🟠 **iOS install icon** — manifest ships only an SVG icon (`sizes:"any"`); iOS ignores SVG
  for the home-screen icon, producing a blank/letter icon. Added an `apple-touch-icon`
  link as a stop-gap, but a real fix needs **PNG 180×180, 192×192 and 512×512** assets
  (the 512 also `purpose:"maskable"`). Recommended follow-up — requires binary assets.
- 🟡 Service worker registered at the hard-coded path `/Moetikeenjasaan.paul/sw.js`; fine on
  the current GitHub Pages project URL but breaks on a custom domain or local root. Prefer a
  path relative to the document.
- ✅ Bumped the SW cache to `dighv-v2` and the `?v=` asset query strings so clients pick up
  this release.

---

## 5. Performance & robustness

- 🔵 `fetchAppVersion()` and `fetchChangelogUpdates()` call the **unauthenticated GitHub API**
  (60 req/h per IP). A whole office behind one NAT IP can hit the limit; both fail silently,
  which is acceptable, but consider caching the version in `localStorage`.
- 🔵 The service worker caches cross-origin API GETs (network-first). Good for offline, but
  there is no cache-size cap — weather/air-quality responses accumulate indefinitely.

---

## 6. Security / privacy

- ✅ No secrets in the client. Reverse-geocoding goes to Nominatim only on explicit "current
  location" use, and GPS coordinates are stored locally, not transmitted to a backend.
- 🔵 Nominatim usage policy expects a meaningful `User-Agent`/referrer for production volume.
- 🔵 Walk-log and checklist data live in `localStorage` (per-device, unsynced) — fine for the
  tool's scope; worth stating in the UI so users don't expect shared history.

---

## 7. Verification note

This environment's network policy blocks the Open-Meteo host, so the new request could not
be exercised live here. All added parameters (`minutely_15`, `past_days`) are valid
Open-Meteo parameters and the renderers already guard against missing data, so the change is
safe; please confirm in a browser that the rain chart now appears and the day comparison is
correctly labelled (especially for the default NL location, which forces the KNMI model).
