const UPDATE_TOAST_SELECTOR = '[data-update-toast]';
const UPDATE_ACTION_SELECTOR = '[data-update-action]';

let updateRequested = false;

const getUpdateToast = () => {
  const toast = document.querySelector(UPDATE_TOAST_SELECTOR);
  const button = toast?.querySelector(UPDATE_ACTION_SELECTOR);

  if (!toast || !button) {
    return null;
  }

  return { toast, button };
};

const hideUpdateToast = () => {
  const toast = document.querySelector(UPDATE_TOAST_SELECTOR);
  if (toast) {
    toast.hidden = true;
  }
};

const showUpdateToast = (registration) => {
  if (!registration.waiting) {
    return;
  }

  const elements = getUpdateToast();
  if (!elements) {
    return;
  }

  const { toast, button } = elements;
  toast.hidden = false;

  button.addEventListener(
    'click',
    () => {
      const waitingWorker = registration.waiting;
      if (!waitingWorker) {
        return;
      }

      updateRequested = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
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
