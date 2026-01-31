const STORAGE_KEY = 'life-shield-theme';

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
};

const getPreferredTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return saved;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const toggleTheme = () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
};

export const initTheme = () => {
  applyTheme(getPreferredTheme());

  const toggleButton = document.getElementById('theme-toggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleTheme);
  }
};
