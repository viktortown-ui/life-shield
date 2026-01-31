import { getToneLabel, getToneMode, onToneChange, setToneMode } from '../storage/tone.js';

const TONE_BUTTON_SELECTOR = '[data-tone-option]';
const TONE_LABEL_SELECTOR = '[data-tone-label]';

const updateToneUI = (tone, buttons, label) => {
  buttons.forEach((button) => {
    const isActive = button.dataset.toneOption === tone;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (label) {
    label.textContent = getToneLabel(tone);
  }
};

export const initToneSettings = () => {
  const buttons = Array.from(document.querySelectorAll(TONE_BUTTON_SELECTOR));
  if (!buttons.length) {
    return;
  }

  const label = document.querySelector(TONE_LABEL_SELECTOR);
  const initialTone = getToneMode();
  updateToneUI(initialTone, buttons, label);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      setToneMode(button.dataset.toneOption);
    });
  });

  onToneChange((tone) => {
    updateToneUI(tone, buttons, label);
  });
};
