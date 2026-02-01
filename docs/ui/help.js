import { getCopyData } from './copy.js';

const updateBodySheetState = () => {
  const anyOpen = Array.from(document.querySelectorAll('.sheet')).some((sheet) => !sheet.hasAttribute('hidden'));
  document.body.classList.toggle('is-sheet-open', anyOpen);
};

export const openSheet = (sheet) => {
  if (!sheet) {
    return;
  }
  sheet.removeAttribute('hidden');
  updateBodySheetState();
};

export const closeSheet = (sheet) => {
  if (!sheet) {
    return;
  }
  sheet.setAttribute('hidden', '');
  updateBodySheetState();
};

export const initSheetCloseHandlers = (sheet) => {
  if (!sheet) {
    return;
  }
  const closeButtons = sheet.querySelectorAll('[data-sheet-close]');
  closeButtons.forEach((button) => {
    button.addEventListener('click', () => closeSheet(sheet));
  });
};

export const initHelp = () => {
  const helpSheet = document.querySelector('[data-sheet="help"]');
  const helpTitle = helpSheet?.querySelector('[data-help-title]');
  const helpBody = helpSheet?.querySelector('[data-help-body]');
  const copyPromise = getCopyData();

  initSheetCloseHandlers(helpSheet);

  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest('[data-help]');
    if (!button || !helpSheet || !helpTitle || !helpBody) {
      return;
    }
    event.preventDefault();
    const copyData = await copyPromise;
    const info = copyData?.microHelp?.[button.dataset.help];
    if (!info) {
      return;
    }
    helpTitle.textContent = info.title ?? 'Подсказка';
    helpBody.innerHTML = '';
    const lines = Array.isArray(info.body) ? info.body : [info.body].filter(Boolean);
    lines.forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      helpBody.appendChild(paragraph);
    });
    openSheet(helpSheet);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (!helpSheet?.hasAttribute('hidden')) {
      closeSheet(helpSheet);
    }
  });
};
