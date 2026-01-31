/**
 * ПРИЛОЖЕНИЕ СТРЕСС-ТЕСТА ЖИЗНИ
 * 
 * Этот модуль управляет всем пользовательским интерфейсом:
 * - Навигация между экранами
 * - Обработка форм ввода
 * - Визуализация результатов
 * - Работа с графиками Chart.js
 * - Управление историей
 */

// Глобальные переменные
let currentScreen = 'input';
let balanceChart = null;

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeInputForm();
    initializeScenarios();
    initializeSimulation();
    initializeVerdict();
    initializeHistory();
    
    // Инициализируем тестер
    stressTester.initializeScenarios();
    
    console.log('Стресс-тест жизни загружен');
});

/**
 * НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
 */
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const screens = document.querySelectorAll('.screen');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetScreen = this.dataset.screen;
            switchScreen(targetScreen);
        });
    });
}

function switchScreen(screenId) {
    // Обновляем навигацию
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-screen="${screenId}"]`).classList.add('active');
    
    // Переключаем экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(`${screenId}-screen`).classList.add('active');
    
    currentScreen = screenId;
    
    // Специальная обработка для некоторых экранов
    if (screenId === 'simulation') {
        updateSimulationView();
    } else if (screenId === 'verdict') {
        updateVerdictView();
    } else if (screenId === 'history') {
        updateHistoryView();
    }
}

/**
 * ЭКРАН 1: ВВОД ДАННЫХ
 */
function initializeInputForm() {
    const form = document.getElementById('data-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Собираем данные из формы
        const formData = {
            income: parseFloat(document.getElementById('income').value) || 0,
            fixedExpenses: parseFloat(document.getElementById('fixed-expenses').value) || 0,
            variableExpenses: parseFloat(document.getElementById('variable-expenses').value) || 0,
            savings: parseFloat(document.getElementById('savings').value) || 0,
            debt: parseFloat(document.getElementById('debt').value) || 0
        };
        
        // Валидация
        if (formData.income === 0) {
            alert('Укажите ваш доход');
            return;
        }
        
        if (formData.savings === 0) {
            if (!confirm('У вас нет финансовой подушки. Продолжить?')) {
                return;
            }
        }
        
        // Сохраняем данные
        stressTester.setBaseData(formData);
        
        // Переходим к сценариям
        switchScreen('scenarios');
    });
}

/**
 * ЭКРАН 2: СЦЕНАРИИ ШОКА
 */
function initializeScenarios() {
    // Обработка переключателей
    document.querySelectorAll('.scenario-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const card = this.closest('.scenario-card');
            const scenarioId = card.dataset.scenario;
            stressTester.toggleScenario(scenarioId, this.checked);
        });
    });
    
    // Обработка ползунков
    document.querySelectorAll('.range-input').forEach(range => {
        const updateRangeValue = function() {
            const valueSpan = this.parentElement.querySelector('.range-value');
            if (valueSpan) {
                valueSpan.textContent = this.value;
            }
            
            // Обновляем сценарий в реальном времени
            updateScenarioFromUI();
        };
        
        range.addEventListener('input', updateRangeValue);
        range.addEventListener('change', updateRangeValue);
    });
    
    // Кнопка запуска симуляции
    document.getElementById('run-simulation').addEventListener('click', function() {
        // Запускаем симуляцию
        stressTester.runSimulation();
        
        // Переходим к результатам
        switchScreen('simulation');
    });
}

function updateScenarioFromUI() {
    // Обновляем параметры сценариев на основе UI
    const combinedIncome = document.getElementById('combined-income');
    const combinedExpenses = document.getElementById('combined-expenses');
    
    if (combinedIncome && combinedExpenses) {
        const incomeDrop = parseInt(combinedIncome.value) / 100;
        const expenseRise = parseInt(combinedExpenses.value) / 100;
        
        stressTester.updateScenario('combined-shock', 1 - incomeDrop, 1 + expenseRise);
        stressTester.updateScenario('income-drop-30', 1 - (parseInt(document.querySelector('[data-scenario="income-drop-30"] .range-input').value) / 100), 1.0);
        stressTester.updateScenario('income-drop-50', 1 - (parseInt(document.querySelector('[data-scenario="income-drop-50"] .range-input').value) / 100), 1.0);
    }
}

/**
 * ЭКРАН 3: СИМУЛЯЦИЯ ПО МЕСЯЦАМ
 */
function initializeSimulation() {
    // Выпадающий список выбора сценария
    document.getElementById('scenario-select').addEventListener('change', function() {
        updateSimulationView();
    });
}

function updateSimulationView() {
    updateScenarioSelect();
    updateBalanceChart();
    updateMonthTables();
}

function updateScenarioSelect() {
    const select = document.getElementById('scenario-select');
    const currentValue = select.value;
    
    // Очищаем опции, кроме "Все сценарии"
    select.innerHTML = '<option value="all">Все сценарии</option>';
    
    // Добавляем активные сценарии
    for (const [id, result] of stressTester.results) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = result.scenarioName;
        select.appendChild(option);
    }
    
    // Восстанавливаем выбор, если возможно
    if (stressTester.results.has(currentValue)) {
        select.value = currentValue;
    }
}

function updateBalanceChart() {
    const ctx = document.getElementById('balance-chart').getContext('2d');
    const selectedScenario = document.getElementById('scenario-select').value;
    
    // Уничтожаем предыдущий график
    if (balanceChart) {
        balanceChart.destroy();
    }
    
    // Подготавливаем данные
    const datasets = [];
    const colors = ['#3498db', '#f39c12', '#e74c3c', '#9b59b6'];
    let colorIndex = 0;
    
    for (const [id, result] of stressTester.results) {
        if (selectedScenario !== 'all' && id !== selectedScenario) continue;
        
        const data = result.monthlyData.map((month, index) => ({
            x: index + 1,
            y: month.balance
        }));
        
        // Ограничиваем данные для наглядности (первые 24 месяца)
        const limitedData = data.slice(0, 24);
        
        datasets.push({
            label: result.scenarioName,
            data: limitedData,
            borderColor: colors[colorIndex % colors.length],
            backgroundColor: colors[colorIndex % colors.length] + '20',
            borderWidth: 3,
            fill: false,
            tension: 0.1
        });
        
        colorIndex++;
    }
    
    // Создаем график
    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Баланс во времени',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `${context.dataset.label}: ${value.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'})}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Месяц'
                    },
                    grid: {
                        color: '#e9ecef'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Баланс (₽)'
                    },
                    grid: {
                        color: '#e9ecef'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'});
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            // Добавляем горизонтальную линию нуля
            plugins: [{
                beforeDraw: function(chart) {
                    const ctx = chart.ctx;
                    const yAxis = chart.scales.y;
                    const zeroY = yAxis.getPixelForValue(0);
                    
                    ctx.save();
                    ctx.strokeStyle = '#e74c3c';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(chart.chartArea.left, zeroY);
                    ctx.lineTo(chart.chartArea.right, zeroY);
                    ctx.stroke();
                    ctx.restore();
                }
            }]
        }
    });
}

function updateMonthTables() {
    const container = document.getElementById('tables-container');
    container.innerHTML = '';
    
    const selectedScenario = document.getElementById('scenario-select').value;
    
    for (const [id, result] of stressTester.results) {
        if (selectedScenario !== 'all' && id !== selectedScenario) continue;
        
        const tableDiv = document.createElement('div');
        tableDiv.className = 'month-table';
        
        // Заголовок таблицы
        const title = document.createElement('h4');
        title.textContent = result.scenarioName;
        tableDiv.appendChild(title);
        
        // Ограничиваем показ первыми 12 месяцами для компактности
        const limitedData = result.monthlyData.slice(0, 12);
        
        // Создаем таблицу
        const table = document.createElement('table');
        
        // Заголовок
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Месяц</th>
                <th>Доход</th>
                <th>Расходы</th>
                <th>Баланс</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Тело таблицы
        const tbody = document.createElement('tbody');
        limitedData.forEach(month => {
            const row = document.createElement('tr');
            
            // Помечаем месяц разорения
            if (month.isNegative) {
                row.classList.add('death-month');
            }
            
            row.innerHTML = `
                <td>${month.month}</td>
                <td>${month.income.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'})}</td>
                <td>${month.expenses.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'})}</td>
                <td class="${month.isNegative ? 'negative' : ''}">
                    ${month.balance.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'})}
                </td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        tableDiv.appendChild(table);
        container.appendChild(tableDiv);
    }
}

/**
 * ЭКРАН 4: ВЕРДИКТ
 */
function initializeVerdict() {
    document.getElementById('save-run').addEventListener('click', function() {
        const run = stressTester.saveRun();
        alert(`Прогон сохранен! Индекс устойчивости: ${run.stressIndex}`);
    });
    
    document.getElementById('change-params').addEventListener('click', function() {
        switchScreen('input');
    });
}

function updateVerdictView() {
    updateVerdictGrid();
    updateStressIndex();
}

function updateVerdictGrid() {
    const grid = document.getElementById('verdict-grid');
    grid.innerHTML = '';
    
    for (const [id, result] of stressTester.results) {
        const card = document.createElement('div');
        card.className = 'verdict-card';
        
        // Определяем цвет карточки
        let colorClass = '';
        if (result.survivalMonths >= 6) {
            colorClass = 'green';
        } else if (result.survivalMonths >= 3) {
            colorClass = 'yellow';
        } else {
            colorClass = 'red';
        }
        card.classList.add(colorClass);
        
        // Определяем статус
        let status = '';
        if (result.survived) {
            status = 'Выживет более 10 лет';
        } else if (result.deathMonth) {
            status = `Разорение в ${result.deathMonth} месяце`;
        }
        
        card.innerHTML = `
            <h3>${result.scenarioName}</h3>
            <div class="survival-months">${result.survivalMonths}</div>
            <div class="status">${status}</div>
        `;
        
        grid.appendChild(card);
    }
}

function updateStressIndex() {
    const index = stressTester.calculateStressIndex();
    const circle = document.getElementById('index-circle');
    const score = document.getElementById('index-score');
    const description = document.getElementById('index-description');
    
    score.textContent = index;
    
    // Убираем предыдущие классы
    circle.classList.remove('good', 'medium', 'bad');
    
    // Определяем цвет и описание
    if (index >= 70) {
        circle.classList.add('good');
        description.textContent = 'Отличная стресс-устойчивость! Вы спокойно переживете временные трудности.';
    } else if (index >= 40) {
        circle.classList.add('medium');
        description.textContent = 'Средняя устойчивость. Рекомендуется увеличить финансовую подушку.';
    } else {
        circle.classList.add('bad');
        description.textContent = 'Низкая стресс-устойчивость. Ваши финансы уязвимы к шокам.';
    }
}

/**
 * ЭКРАН 5: ИСТОРИЯ
 */
function initializeHistory() {
    document.getElementById('clear-history').addEventListener('click', function() {
        if (confirm('Очистить всю историю? Это действие нельзя отменить.')) {
            stressTester.clearHistory();
            updateHistoryView();
        }
    });
}

function updateHistoryView() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (stressTester.history.length === 0) {
        historyList.innerHTML = '<div class="text-center text-gray">История пуста. Проведите первый прогон!</div>';
        return;
    }
    
    stressTester.history.forEach(run => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = new Date(run.date);
        const dateStr = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Определяем цвет индекса
        let indexClass = '';
        if (run.stressIndex >= 70) {
            indexClass = 'good';
        } else if (run.stressIndex >= 40) {
            indexClass = 'medium';
        } else {
            indexClass = 'bad';
        }
        
        item.innerHTML = `
            <div class="history-info">
                <div class="history-date">${dateStr}</div>
                <div class="history-params">
                    Доход: ${run.baseData.income.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'})} | 
                    Подушка: ${run.baseData.savings.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB'})}
                </div>
            </div>
            <div class="history-result">
                <div class="history-index ${indexClass}">${run.stressIndex}</div>
                <button class="btn load-btn" onclick="loadHistoryRun(${run.id})">Загрузить</button>
            </div>
        `;
        
        historyList.appendChild(item);
    });
}

/**
 * Загрузка прогона из истории
 */
function loadHistoryRun(runId) {
    const run = stressTester.loadRun(runId);
    if (run) {
        // Заполняем форму данными
        document.getElementById('income').value = run.baseData.income;
        document.getElementById('fixed-expenses').value = run.baseData.fixedExpenses;
        document.getElementById('variable-expenses').value = run.baseData.variableExpenses;
        document.getElementById('savings').value = run.baseData.savings;
        document.getElementById('debt').value = run.baseData.debt;
        
        // Переходим к экрану ввода
        switchScreen('input');
        
        alert('Данные загружены! Можете изменить параметры и запустить новый прогон.');
    }
}