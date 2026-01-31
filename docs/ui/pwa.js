const UPDATE_TOAST_SELECTOR = '[data-update-toast]';
const UPDATE_ACTION_SELECTOR = '[data-update-action]';

const showUpdateToast = (worker) => {
  const toast = document.querySelector(UPDATE_TOAST_SELECTOR);
  const button = toast?.querySelector(UPDATE_ACTION_SELECTOR);

  if (!toast || !button) {
    return;
  }

  toast.hidden = false;

  button.addEventListener(
    'click',
    () => {
      toast.hidden = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    },
    { once: true }
  );
};

const listenForWaitingServiceWorker = (registration) => {
  if (registration.waiting && navigator.serviceWorker.controller) {
    showUpdateToast(registration.waiting);
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing;
    if (!installingWorker) {
      return;
    }

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateToast(installingWorker);
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
    window.location.reload();
  });
};
