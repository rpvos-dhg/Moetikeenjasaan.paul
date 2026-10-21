// ESLint (flat config) zonder extra pakketten. Draaien: npm run lint
const browser = Object.fromEntries([
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'history', 'fetch',
  'setTimeout', 'clearTimeout', 'setInterval', 'requestAnimationFrame', 'console', 'Intl', 'URL',
  'URLSearchParams', 'AbortSignal', 'ResizeObserver', 'Request', 'caches', 'self',
].map(name => [name, 'readonly']));

// Functies uit logic.js die script.js gebruikt (beide gewone <script>-bestanden).
const logic = Object.fromEntries([
  'escapeHtml', 'commitType', 'durationParts', 'pickDaily', 'dateKeyInZone', 'normalizeForecast',
  'mergeHourlyByTime', 'dataTimestamp', 'hourlyNowIndex', 'hourlyIndexAtHour', 'POLLEN_KEYS',
  'POLLEN_THRESHOLDS', 'parsePollen', 'highPollenKeys', 'PREF_OFFSETS', 'computeConditions',
  'jacketLevel', 'adviceKeys', 'extremePool', 'jacketScale', 'calibrate', 'minutesOfDay',
  'scoreBreakBlocks', 'bestBreakMoment', 'topBreakOptions', 'WET_SLOT_MM', 'nowcast', 'dayScore', 'logStats',
  'achievements', 'seasonalMoment',
].map(name => [name, 'readonly']));

const node = Object.fromEntries(['require', 'module', 'process', '__dirname', 'Buffer', 'console'].map(n => [n, 'readonly']));

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  eqeqeq: ['error', 'smart'],
  radix: 'error',
};

module.exports = [
  { ignores: ['node_modules/**'] },
  { files: ['logic.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...browser, module: 'writable' } }, rules: { ...rules, 'no-unused-vars': 'off' } },
  { files: ['script.js', 'theme-init.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...browser, ...logic } }, rules },
  { files: ['sw.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: browser }, rules },
  { files: ['tests/**/*.js', 'scripts/**/*.js', 'eslint.config.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: node }, rules },
];
