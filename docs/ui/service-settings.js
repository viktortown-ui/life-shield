const STORAGE_PREFIX = 'life-shield-';

const clearAppStorage = () => {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));
  keys.forEach((key) => localStorage.removeItem(key));
};

export const initServiceSettings = () => {
  const resetButton = document.querySelector('[data-reset-storage]');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      const shouldReset = window.confirm('Сбросить только данные Life Shield?');
      if (!shouldReset) {
        return;
      }
      clearAppStorage();
      window.location.reload();
    });
  }

  const reloadButton = document.querySelector('[data-reload-app]');
  if (reloadButton) {
    reloadButton.addEventListener('click', () => {
      window.location.reload();
    });
  }

  const updateButton = document.querySelector('[data-check-update]');
  if (updateButton) {
    updateButton.addEventListener('click', async () => {
      if (!('serviceWorker' in navigator)) {
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    });
  }
};
