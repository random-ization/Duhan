/* global document, window */

(function () {
  var storageKey = 'duhan-theme';
  var root = document.documentElement;

  function isTheme(value) {
    return value === 'light' || value === 'dark' || value === 'system';
  }

  try {
    var storedTheme = localStorage.getItem(storageKey);
    var theme = isTheme(storedTheme) ? storedTheme : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && prefersDark);

    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#0f172a' : '#f0f4f8');
    }
  } catch {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
})();
