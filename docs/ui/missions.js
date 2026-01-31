const STORAGE_KEY = 'life-shield-missions';

const loadMissions = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Не удалось прочитать миссии из хранилища', error);
    return [];
  }
};

const saveMissions = (missions) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
};

const createMissionItem = (mission, onToggle, onRemove) => {
  const item = document.createElement('li');
  item.className = 'missions__item';

  const label = document.createElement('label');
  label.className = 'missions__label';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = mission.completed;
  checkbox.className = 'missions__checkbox';
  checkbox.addEventListener('change', () => onToggle(mission.id));

  const text = document.createElement('span');
  text.className = 'missions__text';
  text.textContent = mission.text;

  label.append(checkbox, text);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'missions__remove';
  removeButton.textContent = 'Удалить';
  removeButton.addEventListener('click', () => onRemove(mission.id));

  item.append(label, removeButton);
  return item;
};

export const initMissions = () => {
  const form = document.querySelector('[data-missions-form]');
  const list = document.querySelector('[data-missions-list]');
  const emptyState = document.querySelector('[data-missions-empty]');

  if (!form || !list || !emptyState) {
    return;
  }

  const missions = loadMissions();

  const render = () => {
    list.innerHTML = '';
    missions.forEach((mission) => {
      const item = createMissionItem(
        mission,
        (id) => {
          const target = missions.find((entry) => entry.id === id);
          if (target) {
            target.completed = !target.completed;
            saveMissions(missions);
            render();
          }
        },
        (id) => {
          const index = missions.findIndex((entry) => entry.id === id);
          if (index >= 0) {
            missions.splice(index, 1);
            saveMissions(missions);
            render();
          }
        },
      );
      list.appendChild(item);
    });

    emptyState.hidden = missions.length > 0;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector('input[name="mission"]');
    if (!input) {
      return;
    }
    const text = input.value.trim();
    if (!text) {
      return;
    }
    missions.unshift({
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    saveMissions(missions);
    input.value = '';
    render();
  });

  render();
};
