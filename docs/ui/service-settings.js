const STORAGE_PREFIX = 'life-shield-';

const clearAppStorage = () => {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));
  keys.forEach((key) => localStorage.removeItem(key));
};

const getServiceWorkerStatus = () => {
  if (!('serviceWorker' in navigator)) {
    return 'не поддерживается';
  }
  return navigator.serviceWorker.controller ? 'активен' : 'не активен';
};

export const initServiceSettings = () => {
  const resetButton = document.querySelector('[data-reset-storage]');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      clearAppStorage();
      window.location.reload();
    });
  }

  const status = document.querySelector('[data-sw-status]');
  if (status) {
    status.textContent = getServiceWorkerStatus();
  }
};
