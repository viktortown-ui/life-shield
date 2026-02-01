const UPDATE_TOAST_SELECTOR = '[data-update-toast]';
const UPDATE_ACTION_SELECTOR = '[data-update-action]';
const UPDATE_DISMISS_SELECTOR = '[data-update-dismiss]';
const UPDATE_DISMISS_KEY = 'life-shield-update-dismissed';

let updateRequested = false;

const getUpdateToast = () => {
  const toast = document.querySelector(UPDATE_TOAST_SELECTOR);
  const button = toast?.querySelector(UPDATE_ACTION_SELECTOR);
  const dismissButton = toast?.querySelector(UPDATE_DISMISS_SELECTOR);

  if (!toast || !button || !dismissButton) {
    return null;
  }

  return { toast, button, dismissButton };
};

const hideUpdateToast = () => {
  const toast = document.querySelector(UPDATE_TOAST_SELECTOR);
  if (toast) {
    toast.hidden = true;
  }
};

const showUpdateToast = (registration) => {
  if (!registration.waiting || !navigator.serviceWorker.controller) {
    return;
  }

  if (sessionStorage.getItem(UPDATE_DISMISS_KEY) === '1') {
    return;
  }

  const elements = getUpdateToast();
  if (!elements) {
    return;
  }

  const { toast, button, dismissButton } = elements;
  toast.hidden = false;

  button.addEventListener(
    'click',
    () => {
      const waitingWorker = registration.waiting;
      if (!waitingWorker) {
        return;
      }

      updateRequested = true;
      sessionStorage.removeItem(UPDATE_DISMISS_KEY);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    },
    { once: true }
  );

  dismissButton.addEventListener(
    'click',
    () => {
      sessionStorage.setItem(UPDATE_DISMISS_KEY, '1');
      hideUpdateToast();
    },
    { once: true }
  );
};

const listenForWaitingServiceWorker = (registration) => {
  if (registration.waiting && navigator.serviceWorker.controller) {
    showUpdateToast(registration);
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing;
    if (!installingWorker) {
      return;
    }

    installingWorker.addEventListener('statechange', () => {
      if (
        installingWorker.state === 'installed' &&
        navigator.serviceWorker.controller &&
        registration.waiting
      ) {
        showUpdateToast(registration);
      }
    });
  });
};

const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    listenForWaitingServiceWorker(registration);
  } catch (error) {
    console.warn('Service worker registration failed', error);
  }
};

export const initPwa = () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    registerServiceWorker();
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested) {
      return;
    }

    updateRequested = false;
    hideUpdateToast();
    window.location.reload();
  });
};
