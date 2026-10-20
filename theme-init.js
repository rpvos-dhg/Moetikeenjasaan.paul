// Zet het thema vóór de eerste paint, zodat dark mode niet eerst wit flitst.
// De zonsondergang-regel volgt zodra de weerdata binnen is (script.js).
(function () {
  try {
    var forced = localStorage.getItem('dighv_dark_force') || 'auto';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (forced === 'dark' || (forced === 'auto' && systemDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) { /* geen opslag beschikbaar: licht thema tot script.js draait */ }
})();
