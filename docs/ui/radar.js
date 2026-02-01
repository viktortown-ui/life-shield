import { RADAR_DOMAINS } from '../modules/radar/data.js';
import { getLatestRadarSnapshot, saveRadarSnapshot } from '../storage/radar.js';
import { getCopyData } from './copy.js';
import { setActiveScreen } from './navigation.js';

const SCALE_VALUES = [1, 2, 3, 4, 5];
const DEFAULT_SCORE = 3;
const MAX_SCORE = 100;

const formatDate = (iso) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getRadarCopy = (copyData) => copyData?.radar ?? {};

const getDomainCopy = (copyData, domainId) => {
  const radarCopy = getRadarCopy(copyData);
  return radarCopy?.domains?.[domainId] ?? {};
};

const normalizeScore = (average) => {
  const clamped = Math.max(1, Math.min(5, average));
  return Math.round(((clamped - 1) / 4) * MAX_SCORE);
};

const buildQuestionField = (question, answer, anchorsFallback) => {
  const field = document.createElement('div');
  field.className = 'radar-snapshot__field';

  const label = document.createElement('p');
  label.className = 'radar-snapshot__question';
  label.textContent = question.text ?? '';

  const options = document.createElement('div');
  options.className = 'radar-snapshot__options';

  SCALE_VALUES.forEach((value, index) => {
    const option = document.createElement('label');
    option.className = 'radar-snapshot__option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = question.id;
    input.value = value.toString();
    if (index === 0) {
      input.required = true;
    }
    if (Number(answer ?? DEFAULT_SCORE) === value) {
      input.checked = true;
    }
    const text = document.createElement('span');
    text.textContent = value.toString();
    option.append(input, text);
    options.appendChild(option);
  });

  const anchors = document.createElement('div');
  anchors.className = 'radar-snapshot__anchors';
  const entries = Object.entries(question.anchors ?? anchorsFallback ?? {});
  entries.forEach(([key, value]) => {
    const item = document.createElement('span');
    item.textContent = `${key} — ${value}`;
    anchors.appendChild(item);
  });

  field.append(label, options, anchors);
  return field;
};

const buildDomainSection = (domain, copyData, answers) => {
  const section = document.createElement('section');
  section.className = 'radar-snapshot__section';
  const header = document.createElement('h3');
  header.className = 'radar-snapshot__section-title';
  header.textContent = getDomainCopy(copyData, domain.id).label ?? domain.id;
  section.appendChild(header);

  const questions = getDomainCopy(copyData, domain.id).questions ?? [];
  const scaleAnchors = getRadarCopy(copyData).scaleAnchors ?? {};
  domain.questionIds.forEach((questionId) => {
    const question = questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }
    section.appendChild(buildQuestionField(question, answers?.[questionId], scaleAnchors));
  });

  return section;
};

const buildWeightField = (domain, copyData, weight) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'radar-snapshot__weight';

  const label = document.createElement('span');
  label.textContent = getDomainCopy(copyData, domain.id).label ?? domain.id;

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '1';
  range.max = '5';
  range.step = '1';
  range.name = `weight-${domain.id}`;
  range.value = Number(weight ?? 3).toString();

  const output = document.createElement('span');
  output.className = 'radar-snapshot__weight-value';
  output.textContent = range.value;

  range.addEventListener('input', () => {
    output.textContent = range.value;
  });

  wrapper.append(label, range, output);
  return wrapper;
};

const renderRadarChart = (container, domains, scores) => {
  if (!container) {
    return;
  }
  container.innerHTML = '';

  const size = 240;
  const center = size / 2;
  const radius = 90;
  const ringSteps = [0.25, 0.5, 0.75, 1];

  const points = domains.map((domain, index) => {
    const angle = (Math.PI * 2 * index) / domains.length - Math.PI / 2;
    const value = scores[domain.id] ?? 0;
    const scaled = (radius * value) / MAX_SCORE;
    const x = center + Math.cos(angle) * scaled;
    const y = center + Math.sin(angle) * scaled;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.classList.add('radar-chart');

  ringSteps.forEach((step) => {
    const ringRadius = radius * step;
    const ringPoints = domains.map((domain, index) => {
      const angle = (Math.PI * 2 * index) / domains.length - Math.PI / 2;
      const x = center + Math.cos(angle) * ringRadius;
      const y = center + Math.sin(angle) * ringRadius;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', ringPoints.join(' '));
    polygon.setAttribute('class', 'radar-chart__ring');
    svg.appendChild(polygon);
  });

  domains.forEach((domain, index) => {
    const angle = (Math.PI * 2 * index) / domains.length - Math.PI / 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', center.toString());
    line.setAttribute('y1', center.toString());
    line.setAttribute('x2', x.toFixed(1));
    line.setAttribute('y2', y.toFixed(1));
    line.setAttribute('class', 'radar-chart__axis');
    svg.appendChild(line);
  });

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', points.join(' '));
  polygon.setAttribute('class', 'radar-chart__shape');
  svg.appendChild(polygon);

  container.appendChild(svg);
};

const buildWhyItems = (domainCopy, answers) => {
  const questions = domainCopy?.questions ?? [];
  if (!questions.length) {
    return [];
  }
  const scores = questions.map((question) => ({
    question,
    value: Number(answers?.[question.id] ?? DEFAULT_SCORE),
  }));
  const minValue = Math.min(...scores.map((item) => item.value));
  return scores.filter((item) => item.value === minValue).slice(0, 2);
};

const renderInterpretation = (container, snapshot, copyData) => {
  if (!container) {
    return;
  }
  if (!snapshot) {
    container.hidden = true;
    return;
  }

  const weakList = container.querySelector('[data-radar-weak]');
  const strongList = container.querySelector('[data-radar-strong]');
  const whyList = container.querySelector('[data-radar-why]');
  const stepsList = container.querySelector('[data-radar-steps]');

  if (!weakList || !strongList || !whyList || !stepsList) {
    return;
  }

  const entries = RADAR_DOMAINS.map((domain) => ({
    id: domain.id,
    score: snapshot.domainScores?.[domain.id]?.score ?? 0,
  }));
  const sorted = [...entries].sort((a, b) => a.score - b.score);
  const weak = sorted.slice(0, 2);
  const strong = sorted.slice(-2).reverse();

  weakList.innerHTML = '';
  strongList.innerHTML = '';
  whyList.innerHTML = '';
  stepsList.innerHTML = '';

  weak.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = getDomainCopy(copyData, item.id).label ?? item.id;
    weakList.appendChild(li);
  });

  strong.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = getDomainCopy(copyData, item.id).label ?? item.id;
    strongList.appendChild(li);
  });

  const stepsPool = [];
  weak.forEach((item) => {
    const domainCopy = getDomainCopy(copyData, item.id);
    const answers = snapshot.answers?.[item.id] ?? {};
    const whyItems = buildWhyItems(domainCopy, answers);
    const scaleAnchors = getRadarCopy(copyData).scaleAnchors ?? {};
    whyItems.forEach((entry) => {
      const li = document.createElement('li');
      const anchor = entry.question.anchors?.[entry.value] ?? scaleAnchors?.[entry.value] ?? '';
      li.textContent = `${entry.question.text} — ${entry.value}/5${anchor ? ` · ${anchor}` : ''}`;
      whyList.appendChild(li);
    });

    (domainCopy.actions ?? []).forEach((action) => stepsPool.push(action));
  });

  stepsPool.slice(0, 3).forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    stepsList.appendChild(li);
  });

  container.hidden = false;
};

const renderRadarView = async (screen) => {
  const snapshot = getLatestRadarSnapshot();
  const copyData = await getCopyData();

  const dateLabel = screen.querySelector('[data-radar-date]');
  const totalValue = screen.querySelector('[data-radar-total]');
  const domainsContainer = screen.querySelector('[data-radar-domains]');
  const chartContainer = screen.querySelector('[data-radar-chart]');
  const emptyState = screen.querySelector('[data-radar-empty]');
  const content = screen.querySelector('[data-radar-content]');
  const interpretation = screen.querySelector('[data-radar-interpretation]');

  if (!dateLabel || !totalValue || !domainsContainer || !chartContainer || !emptyState || !content) {
    return;
  }

  if (!snapshot) {
    emptyState.hidden = false;
    content.hidden = true;
    if (interpretation) {
      interpretation.hidden = true;
    }
    return;
  }

  emptyState.hidden = true;
  content.hidden = false;

  dateLabel.textContent = formatDate(snapshot.createdAt);
  totalValue.textContent = (snapshot.totalIndex ?? 0).toString();

  const scoreMap = {};
  RADAR_DOMAINS.forEach((domain) => {
    const score = snapshot.domainScores?.[domain.id]?.score ?? 0;
    scoreMap[domain.id] = score;
  });

  domainsContainer.innerHTML = '';
  RADAR_DOMAINS.forEach((domain) => {
    const card = document.createElement('div');
    card.className = 'radar__domain-card';
    const value = document.createElement('p');
    value.className = 'radar__domain-value';
    value.textContent = `${scoreMap[domain.id]}%`;
    const label = document.createElement('p');
    label.className = 'radar__domain-label';
    label.textContent = getDomainCopy(copyData, domain.id).label ?? domain.id;
    card.append(value, label);
    domainsContainer.appendChild(card);
  });

  renderRadarChart(chartContainer, RADAR_DOMAINS, scoreMap);
  renderInterpretation(interpretation, snapshot, copyData);
};

const applyStaticCopy = async (screen, snapshotScreen) => {
  const copyData = await getCopyData();
  const radarCopy = getRadarCopy(copyData);

  const setText = (selector, value) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      element.textContent = value ?? '';
    });
  };

  setText('[data-radar-pro-label]', radarCopy.proLabel);
  setText('[data-radar-pro-title]', radarCopy.proTitle);
  setText('[data-radar-pro-subtitle]', radarCopy.proSubtitle);
  setText('[data-open-radar]', radarCopy.proButton);
  setText('[data-radar-eyebrow]', radarCopy.eyebrow);
  setText('[data-radar-title]', radarCopy.title);
  setText('[data-radar-subtitle]', radarCopy.subtitle);
  setText('[data-open-radar-snapshot]', radarCopy.openSnapshot);
  setText('[data-radar-total-label]', radarCopy.totalLabel);
  setText('[data-radar-empty-title]', radarCopy.emptyTitle);
  setText('[data-radar-empty-text]', radarCopy.emptyText);
  setText('[data-radar-interpretation-toggle]', radarCopy.interpretationButton);
  setText('[data-radar-weak-title]', radarCopy.weakTitle);
  setText('[data-radar-strong-title]', radarCopy.strongTitle);
  setText('[data-radar-why-title]', radarCopy.whyTitle);
  setText('[data-radar-steps-title]', radarCopy.stepsTitle);

  if (snapshotScreen) {
    setText('[data-radar-snapshot-eyebrow]', radarCopy.snapshot?.eyebrow);
    setText('[data-radar-snapshot-title]', radarCopy.snapshot?.title);
    setText('[data-radar-snapshot-subtitle]', radarCopy.snapshot?.subtitle);
    setText('[data-radar-advanced-summary]', radarCopy.snapshot?.advancedSummary);
    setText('[data-radar-advanced-hint]', radarCopy.snapshot?.advancedHint);
    setText('[data-radar-submit]', radarCopy.snapshot?.submit);
  }
};

const hydrateForm = async (form) => {
  const snapshot = getLatestRadarSnapshot();
  const copyData = await getCopyData();
  const questionsContainer = form.querySelector('[data-radar-questions]');
  const weightsContainer = form.querySelector('[data-radar-weights]');
  if (!questionsContainer || !weightsContainer) {
    return;
  }

  questionsContainer.innerHTML = '';
  RADAR_DOMAINS.forEach((domain) => {
    const answers = snapshot?.answers?.[domain.id] ?? {};
    questionsContainer.appendChild(buildDomainSection(domain, copyData, answers));
  });

  weightsContainer.innerHTML = '';
  RADAR_DOMAINS.forEach((domain) => {
    const weight = snapshot?.weights?.[domain.id] ?? 3;
    weightsContainer.appendChild(buildWeightField(domain, copyData, weight));
  });

  const advancedDetails = form.querySelector('[data-radar-advanced]');
  if (advancedDetails && snapshot?.advanced) {
    advancedDetails.open = true;
  }
};

const readAnswers = (form) => {
  const answers = {};
  RADAR_DOMAINS.forEach((domain) => {
    answers[domain.id] = {};
    domain.questionIds.forEach((questionId) => {
      const field = form.querySelector(`input[name="${questionId}"]:checked`);
      const value = Number(field?.value ?? DEFAULT_SCORE);
      answers[domain.id][questionId] = value;
    });
  });
  return answers;
};

const readWeights = (form) => {
  const weights = {};
  RADAR_DOMAINS.forEach((domain) => {
    const input = form.querySelector(`input[name="weight-${domain.id}"]`);
    weights[domain.id] = Number(input?.value ?? 3);
  });
  return weights;
};

const buildScores = (answers) => {
  const domainScores = {};
  RADAR_DOMAINS.forEach((domain) => {
    const values = domain.questionIds.map((questionId) => Number(answers?.[domain.id]?.[questionId] ?? DEFAULT_SCORE));
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    domainScores[domain.id] = {
      average: Number(average.toFixed(2)),
      score: normalizeScore(average),
    };
  });
  return domainScores;
};

const buildTotalIndex = (domainScores, weights, advanced) => {
  const entries = RADAR_DOMAINS.map((domain) => {
    const weight = advanced ? Number(weights[domain.id] ?? 3) : 1;
    const score = domainScores[domain.id]?.score ?? 0;
    return { weight, score };
  });
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }
  const total = entries.reduce((sum, entry) => sum + entry.score * entry.weight, 0) / totalWeight;
  return Math.round(total);
};

export const initRadar = () => {
  const screen = document.querySelector('[data-screen="radar"]');
  const snapshotScreen = document.querySelector('[data-screen="radar-snapshot"]');
  const openButtons = document.querySelectorAll('[data-open-radar]');
  const openSnapshotButtons = document.querySelectorAll('[data-open-radar-snapshot]');
  const closeButtons = document.querySelectorAll('[data-close-radar]');
  const closeSnapshotButtons = document.querySelectorAll('[data-close-radar-snapshot]');

  if (!screen || !snapshotScreen) {
    return;
  }

  const form = snapshotScreen.querySelector('[data-radar-form]');
  const interpretationToggle = screen.querySelector('[data-radar-interpretation-toggle]');
  const interpretationBody = screen.querySelector('[data-radar-interpretation]');

  openButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveScreen('radar');
      void renderRadarView(screen);
    });
  });

  openSnapshotButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveScreen('radar-snapshot');
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveScreen('shield');
    });
  });

  closeSnapshotButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveScreen('radar');
    });
  });

  interpretationToggle?.addEventListener('click', () => {
    if (!interpretationBody) {
      return;
    }
    const isHidden = interpretationBody.hidden;
    interpretationBody.hidden = !isHidden;
    getCopyData().then((copyData) => {
      const radarCopy = getRadarCopy(copyData);
      interpretationToggle.textContent = isHidden
        ? radarCopy.interpretationHide ?? 'Скрыть интерпретацию'
        : radarCopy.interpretationButton ?? 'Интерпретация';
    });
  });

  if (form) {
    void hydrateForm(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const answers = readAnswers(form);
      const weights = readWeights(form);
      const advanced = form.querySelector('[data-radar-advanced]')?.open ?? false;
      const domainScores = buildScores(answers);
      const totalIndex = buildTotalIndex(domainScores, weights, advanced);

      saveRadarSnapshot({
        createdAt: new Date().toISOString(),
        answers,
        weights,
        advanced,
        domainScores,
        totalIndex,
      });

      void renderRadarView(screen);
      setActiveScreen('radar');
    });
  }

  void applyStaticCopy(screen, snapshotScreen);
  void renderRadarView(screen);
};
