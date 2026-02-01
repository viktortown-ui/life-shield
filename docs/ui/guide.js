import { getCopyData } from './copy.js';
import { setActiveScreen } from './navigation.js';

const renderGuide = async (container) => {
  if (!container) {
    return;
  }
  const copyData = await getCopyData();
  const sections = Array.isArray(copyData?.guideSections) ? copyData.guideSections : [];
  container.innerHTML = '';
  sections.forEach((section) => {
    const details = document.createElement('details');
    details.className = 'guide__details';

    const summary = document.createElement('summary');
    summary.className = 'guide__summary';
    summary.textContent = section.title ?? '';

    const body = document.createElement('div');
    body.className = 'guide__body';
    const lines = Array.isArray(section.body) ? section.body : [section.body].filter(Boolean);
    lines.forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      body.appendChild(paragraph);
    });

    details.append(summary, body);
    container.appendChild(details);
  });
};

export const initGuide = () => {
  const screen = document.querySelector('[data-screen="guide"]');
  if (!screen) {
    return;
  }
  const openButton = document.querySelector('[data-open-guide]');
  const closeButton = screen.querySelector('[data-close-guide]');
  const accordion = screen.querySelector('[data-guide-accordion]');

  openButton?.addEventListener('click', () => {
    setActiveScreen('guide');
  });

  closeButton?.addEventListener('click', () => {
    setActiveScreen('settings');
  });

  void renderGuide(accordion);
};
