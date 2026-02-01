const STORAGE_KEY = 'life-shield-theme';
const THEME_LABELS = {
  light: 'Светлая',
  dark: 'Тёмная',
};

const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
};

const getPreferredTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && THEME_LABELS[saved]) {
    return saved;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const updateThemeControls = (theme) => {
  const buttons = document.querySelectorAll('[data-theme-option]');
  buttons.forEach((button) => {
    const option = button.dataset.themeOption;
    const isActive = option === theme;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  const label = document.querySelector('[data-theme-label]');
  if (label) {
    label.textContent = THEME_LABELS[theme] ?? THEME_LABELS.light;
  }
};

export const initTheme = () => {
  const preferredTheme = getPreferredTheme();
  applyTheme(preferredTheme);
  updateThemeControls(preferredTheme);

  const buttons = document.querySelectorAll('[data-theme-option]');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.themeOption;
      if (!THEME_LABELS[selected]) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, selected);
      applyTheme(selected);
      updateThemeControls(selected);
    });
  });
};
