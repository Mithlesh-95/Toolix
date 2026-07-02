/**
 * Toolix Theme Management
 * Handles light/dark mode based on user preference and system settings.
 */

(function () {
  const THEME_KEY = 'toolix-theme';
  
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    
    // Dispatch custom event for subcomponents to react if necessary
    window.dispatchEvent(new CustomEvent('toolix-theme-change', { detail: { theme } }));
  }

  // Initialize theme instantly to prevent flash of wrong color mode
  const initialTheme = getPreferredTheme();
  setTheme(initialTheme);

  // Expose toggle function globally
  window.ToolixTheme = {
    get: () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
    set: setTheme,
    toggle: () => {
      const current = window.ToolixTheme.get();
      setTheme(current === 'dark' ? 'light' : 'dark');
    }
  };
})();
