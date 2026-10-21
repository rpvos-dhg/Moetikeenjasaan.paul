// Zet het thema vóór de eerste paint, zodat dark mode niet eerst wit flitst.
// "Automatisch" is donker als het apparaat donker staat of na zonsondergang;
// zon op/onder (minuten van de dag) bewaart script.js in dighv_sun.
(function () {
  try {
    var forced = localStorage.getItem('dighv_dark_force') || 'auto';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var sun = (localStorage.getItem('dighv_sun') || '').split(',').map(Number);
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var afterDark = sun.length === 2 && isFinite(sun[0]) && isFinite(sun[1]) && (mins < sun[0] || mins > sun[1]);
    if (forced === 'dark' || (forced === 'auto' && (systemDark || afterDark))) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) { /* geen opslag beschikbaar: licht thema tot script.js draait */ }
})();
