// Глобальное состояние
let currentScreen = 1;
let userData = {
    time: {
        sleep: 56,
        work: 40,
        projects: 10,
        household: 20,
        family: 15,
        recovery: 10
    },
    energy: 3,
    stress: 3,
    calculations: {}
};

// Коэффициенты для расчёта нагрузки
const LOAD_COEFFICIENTS = {
    work: 1.2,      // Работа - высокая нагрузка
    projects: 1.1,  // Проекты - высокая нагрузка
    household: 0.8, // Быт - средняя нагрузка
    family: 0.7,    // Семья - средняя нагрузка
    recovery: -0.5, // Восстановление - уменьшает нагрузку
    sleep: -1.0     // Сон - сильно уменьшает нагрузку
};

// Коэффициенты для восстановления
const RECOVERY_COEFFICIENTS = {
    sleep: 1.0,     // Сон - основное восстановление
    recovery: 0.8   // Активное восстановление
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeInputs();
    updateTotalHours();
    updateSliders();
    setupEventListeners();
    showScreen(1);
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Поля ввода времени
    const timeInputs = ['sleep', 'work', 'projects', 'household', 'family', 'recovery'];
    timeInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                userData.time[id] = parseFloat(this.value) || 0;
                updateTotalHours();
                updateTimeChart();
            });
        }
    });

    // Слайдеры энергии и стресса
    const energySlider = document.getElementById('energy');
    const stressSlider = document.getElementById('stress');
    
    if (energySlider) {
        energySlider.addEventListener('input', function() {
            userData.energy = parseFloat(this.value);
            document.getElementById('energy-value').textContent = userData.energy;
        });
    }
    
    if (stressSlider) {
        stressSlider.addEventListener('input', function() {
            userData.stress = parseFloat(this.value);
            document.getElementById('stress-value').textContent = userData.stress;
        });
    }

    // Навигация по шагам
    document.querySelectorAll('.nav-step').forEach(button => {
        button.addEventListener('click', function() {
            const screen = parseInt(this.dataset.screen);
            if (screen <= currentScreen || isScreenValid(currentScreen)) {
                showScreen(screen);
            }
        });
    });
}

// Инициализация полей ввода
function initializeInputs() {
    Object.keys(userData.time).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            input.value = userData.time[key];
        }
    });
    
    document.getElementById('energy').value = userData.energy;
    document.getElementById('stress').value = userData.stress;
}

// Обновление слайдеров
function updateSliders() {
    document.getElementById('energy-value').textContent = userData.energy;
    document.getElementById('stress-value').textContent = userData.stress;
}

// Обновление общего количества часов
function updateTotalHours() {
    const total = Object.values(userData.time).reduce((sum, hours) => sum + hours, 0);
    const totalElement = document.getElementById('total-hours');
    const warningElement = document.getElementById('total-warning');
    
    if (totalElement) {
        totalElement.textContent = total.toFixed(1);
    }
    
    if (warningElement) {
        if (total > 168) {
            warningElement.textContent = `Перерасход: ${(total - 168).toFixed(1)} часов`;
            warningElement.className = 'total-warning over';
        } else {
            warningElement.textContent = '';
            warningElement.className = 'total-warning';
        }
    }
    
    updateTimeChart();
}

// Переключение экранов
function showScreen(screenNumber) {
    // Скрыть все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показать нужный экран
    const targetScreen = document.getElementById(`screen-${screenNumber}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Обновить навигацию
    updateNavigation(screenNumber);
    
    // Выполнить расчёты для текущего экрана
    if (screenNumber === 3) {
        calculateLoad();
    } else if (screenNumber === 4) {
        calculateRisk();
    } else if (screenNumber === 5) {
        loadHistory();
    }
    
    currentScreen = screenNumber;
}

// Обновление навигации
function updateNavigation(screenNumber) {
    document.querySelectorAll('.nav-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber === screenNumber) {
            step.classList.add('active');
        } else if (stepNumber < screenNumber) {
            step.classList.add('completed');
        }
    });
}

// Проверка валидности экрана
function isScreenValid(screenNumber) {
    switch (screenNumber) {
        case 1:
            const total = Object.values(userData.time).reduce((sum, hours) => sum + hours, 0);
            return total > 0;
        case 2:
            return userData.energy > 0 && userData.stress > 0;
        default:
            return true;
    }
}

// Навигация вперёд
function nextScreen() {
    if (currentScreen < 5) {
        if (isScreenValid(currentScreen)) {
            showScreen(currentScreen + 1);
        } else {
            showNotification('Заполните все обязательные поля');
        }
    }
}

// Навигация назад
function prevScreen() {
    if (currentScreen > 1) {
        showScreen(currentScreen - 1);
    }
}

// Расчёт нагрузки
function calculateLoad() {
    const time = userData.time;
    
    // Расчёт индекса нагрузки
    const loadIndex = 
        time.work * LOAD_COEFFICIENTS.work +
        time.projects * LOAD_COEFFICIENTS.projects +
        time.household * LOAD_COEFFICIENTS.household +
        time.family * LOAD_COEFFICIENTS.family +
        time.recovery * LOAD_COEFFICIENTS.recovery +
        time.sleep * LOAD_COEFFICIENTS.sleep;
    
    // Расчёт индекса восстановления
    const recoveryIndex = 
        time.sleep * RECOVERY_COEFFICIENTS.sleep +
        time.recovery * RECOVERY_COEFFICIENTS.recovery;
    
    // Коэффициент перегруза
    const overloadRatio = recoveryIndex > 0 ? Math.abs(loadIndex) / recoveryIndex : 0;
    
    // Сохраняем расчёты
    userData.calculations = {
        loadIndex: Math.round(loadIndex * 10) / 10,
        recoveryIndex: Math.round(recoveryIndex * 10) / 10,
        overloadRatio: Math.round(overloadRatio * 100) / 100
    };
    
    // Обновляем отображение
    document.getElementById('load-index').textContent = userData.calculations.loadIndex;
    document.getElementById('recovery-index').textContent = userData.calculations.recoveryIndex;
    document.getElementById('overload-ratio').textContent = userData.calculations.overloadRatio;
    
    // Обновляем график нагрузки
    updateLoadChart();
}

// Расчёт риска выгорания
function calculateRisk() {
    const time = userData.time;
    const { energy, stress, calculations } = userData;
    
    // Факторы риска
    const timeOverload = Math.max(0, (Object.values(time).reduce((sum, h) => sum + h, 0) - 168) / 20);
    const energyImbalance = Math.max(0, (5 - energy) / 4);
    const stressFactor = Math.max(0, (stress - 2) / 3);
    const recoveryDeficit = Math.max(0, (calculations.overloadRatio - 1) * 50);
    
    // Индекс риска (0-100)
    const riskScore = Math.min(100, 
        timeOverload * 20 +
        energyImbalance * 30 +
        stressFactor * 25 +
        recoveryDeficit * 25
    );
    
    // Определение уровня риска
    let riskLevel, riskText, riskClass;
    
    if (riskScore < 30) {
        riskLevel = 'green';
        riskText = 'Режим устойчив';
        riskClass = 'green';
    } else if (riskScore < 60) {
        riskLevel = 'yellow';
        riskText = 'Граница';
        riskClass = 'yellow';
    } else {
        riskLevel = 'red';
        riskText = 'Выгорание почти гарантировано';
        riskClass = 'red';
    }
    
    // Обновляем индикатор риска
    document.querySelectorAll('.light').forEach(light => {
        light.classList.remove('active');
    });
    document.getElementById(`light-${riskLevel}`).classList.add('active');
    
    // Обновляем текст и процент
    const riskTextElement = document.getElementById('risk-text');
    riskTextElement.textContent = riskText;
    riskTextElement.className = `risk-text ${riskClass}`;
    
    document.getElementById('risk-score').textContent = Math.round(riskScore) + '%';
    
    // Обновляем детали
    document.getElementById('time-overload').textContent = Math.round(timeOverload * 100) + '%';
    document.getElementById('energy-imbalance').textContent = Math.round(energyImbalance * 100) + '%';
    document.getElementById('recovery-deficit').textContent = Math.round(recoveryDeficit * 100) + '%';
    
    // Сохраняем результат
    userData.risk = {
        score: Math.round(riskScore),
        level: riskLevel,
        text: riskText
    };
}

// Показать уведомление
function showNotification(message) {
    // Простое уведомление (можно заменить на более красивое)
    alert(message);
}

// Сохранить результат
function saveResult() {
    const timestamp = new Date().toISOString();
    const result = {
        timestamp,
        data: { ...userData },
        risk: { ...userData.risk },
        calculations: { ...userData.calculations }
    };
    
    saveToHistory(result);
    showNotification('Результат сохранён в историю');
    showScreen(5);
}

// Новый расчёт
function startNew() {
    // Сброс данных
    userData = {
        time: {
            sleep: 56,
            work: 40,
            projects: 10,
            household: 20,
            family: 15,
            recovery: 10
        },
        energy: 3,
        stress: 3,
        calculations: {}
    };
    
    // Обновить поля ввода
    initializeInputs();
    updateTotalHours();
    updateSliders();
    
    // Вернуться на первый экран
    showScreen(1);
}