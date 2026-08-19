// Applies the saved light/dark theme as early as possible (this is loaded
// in <head>, right after main.css, so it runs before the body paints and
// there's no flash of the wrong theme). Exposes window.gpTheme for the
// Settings page toggle to read/write.
(function () {
  const STORAGE_KEY = 'gp-theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  }

  function setTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, normalized);
    applyTheme(normalized);
  }

  applyTheme(getTheme());

  window.gpTheme = { get: getTheme, set: setTheme };
})();
