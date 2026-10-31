// DevTrack light/dark theme. The saved choice is applied before first paint by
// an inline script in index.html; this module switches it at runtime.
const THEME_KEY = 'devtrack_theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.documentElement.classList.toggle('dark', next === 'dark');
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  return next;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'light' ? 'dark' : 'light');
}

// Icon and label describe what the button switches *to*.
export function themeToggleState(theme = getTheme()) {
  return theme === 'light'
    ? { icon: 'dark_mode', label: 'Switch to dark theme' }
    : { icon: 'light_mode', label: 'Switch to light theme' };
}
