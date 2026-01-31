const SCREEN_SELECTOR = '[data-screen]';
const NAV_SELECTOR = '.bottom-nav__item';

export const setActiveScreen = (target) => {
  const screens = document.querySelectorAll(SCREEN_SELECTOR);
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === target);
  });

  const navItems = document.querySelectorAll(NAV_SELECTOR);
  navItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.target === target);
  });
};

export const initNavigation = () => {
  const navItems = document.querySelectorAll(NAV_SELECTOR);
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      setActiveScreen(item.dataset.target);
    });
  });
};
