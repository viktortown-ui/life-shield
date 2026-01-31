const STORAGE_KEY = 'life-shield-tone';

const TONES = ['soft', 'sarcastic'];
const DEFAULT_TONE = 'soft';

export const getToneMode = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return TONES.includes(saved) ? saved : DEFAULT_TONE;
};

export const setToneMode = (tone) => {
  if (!TONES.includes(tone)) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, tone);
  window.dispatchEvent(new CustomEvent('tone-change', { detail: { tone } }));
};

export const onToneChange = (handler) => {
  window.addEventListener('tone-change', (event) => handler(event.detail.tone));
};

export const getToneLabel = (tone) => (tone === 'sarcastic' ? 'Саркастично' : 'Мягко');
