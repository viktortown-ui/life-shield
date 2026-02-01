const SCREEN_SELECTOR = '[data-screen]';
const NAV_SELECTOR = '.bottom-nav__item';
const OVERLAY_SCREENS = new Set(['snapshot', 'guide']);

export const setActiveScreen = (target) => {
  const screens = document.querySelectorAll(SCREEN_SELECTOR);
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === target);
  });

  const navItems = document.querySelectorAll(NAV_SELECTOR);
  navItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.target === target);
  });

  document.body.classList.toggle('is-overlay-active', OVERLAY_SCREENS.has(target));
};

export const initNavigation = () => {
  const navItems = document.querySelectorAll(NAV_SELECTOR);
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      setActiveScreen(item.dataset.target);
    });
  });
};
