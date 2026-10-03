// Тема підключається в <head>, щоб сторінка не блимала світлою темою перед темною.
// Пріоритет: тема Planfix із hash (перехід з модалки) → збережений вибір → тема системи.
(() => {
  const STORAGE_KEY = 'daoLicenseCalculatorTheme';
  const THEMES = ['light', 'dark'];
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const readStoredTheme = () => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return THEMES.includes(value) ? value : '';
    } catch (error) {
      return '';
    }
  };

  const storeTheme = (theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Без localStorage тема просто не запам'ятовується між відкриттями.
    }
  };

  const readHashTheme = () => {
    const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('theme');
    return THEMES.includes(value) ? value : '';
  };

  let explicitTheme = readHashTheme() || readStoredTheme();

  const resolveTheme = () => explicitTheme || (systemDarkQuery.matches ? 'dark' : 'light');

  const render = () => {
    document.documentElement.dataset.theme = resolveTheme();
  };

  const apply = (theme, { persist = true } = {}) => {
    if (!THEMES.includes(theme)) {
      return;
    }

    explicitTheme = theme;
    if (persist) {
      storeTheme(theme);
    }
    render();
  };

  if (readHashTheme()) {
    storeTheme(explicitTheme);
  }

  systemDarkQuery.addEventListener('change', () => {
    if (!explicitTheme) {
      render();
    }
  });

  render();

  window.daoCalculatorTheme = Object.freeze({
    current: resolveTheme,
    apply,
    applyFromHash: () => {
      const hashTheme = readHashTheme();
      if (hashTheme) {
        apply(hashTheme);
      }
    },
    toggle: () => apply(resolveTheme() === 'dark' ? 'light' : 'dark')
  });
})();
