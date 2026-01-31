// Основная логика приложения

class LifeRadarApp {
    constructor() {
        this.currentScreen = 'screen-welcome';
        this.userName = '';
        this.snapshots = [];
        this.currentSnapshot = null;
        
        this.init();
    }

    // Инициализация приложения
    init() {
        this.loadData();
        this.bindEvents();
        this.showScreen('screen-welcome');
        this.updateHistoryPreview();
    }

    // Привязка событий
    bindEvents() {
        // Экран приветствия
        document.getElementById('start-btn').addEventListener('click', () => this.startAssessment());
        document.getElementById('continue-btn').addEventListener('click', () => this.continueLastSnapshot());

        // Навигация между экранами
        this.bindNavigationEvents();
        
        // Сохранение снимка
        document.getElementById('save-snapshot').addEventListener('click', () => this.saveSnapshot());
        
        // Переключение вида истории
        document.getElementById('show-chart').addEventListener('click', () => this.toggleHistoryView('chart'));
        document.getElementById('show-table').addEventListener('click', () => this.toggleHistoryView('table'));
        
        // Новый снимок
        document.getElementById('new-snapshot').addEventListener('click', () => this.startNewSnapshot());
    }

    // Привязка событий навигации
    bindNavigationEvents() {
        const navPairs = [
            ['back-to-welcome', 'screen-welcome'],
            ['to-weights', 'screen-weights'],
            ['back-to-assessment', 'screen-assessment'],
            ['to-radar', 'screen-radar'],
            ['back-to-weights', 'screen-weights'],
            ['to-interpretation', 'screen-interpretation'],
            ['back-to-radar', 'screen-radar'],
            ['to-history', 'screen-history'],
            ['back-to-interpretation', 'screen-interpretation'],
            ['to-welcome', 'screen-welcome']
        ];

        for (const [buttonId, screenId] of navPairs) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    if (buttonId === 'to-weights') {
                        this.generateWeightsScreen();
                    } else if (buttonId === 'to-radar') {
                        this.generateRadarScreen();
                    } else if (buttonId === 'to-interpretation') {
                        this.generateInterpretationScreen();
                    } else if (buttonId === 'to-history') {
                        this.generateHistoryScreen();
                    }
                    this.showScreen(screenId);
                });
            }
        }
    }

    // Показ экрана
    showScreen(screenId) {
        // Скрыть все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Показать нужный экран
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;

        // Специальная обработка для некоторых экранов
        if (screenId === 'screen-radar' && !radarViz.radarChart) {
            setTimeout(() => {
                radarViz.initRadarChart('radar-chart');
                this.updateRadar();
            }, 100);
        }

        if (screenId === 'screen-history') {
            setTimeout(() => {
                if (!radarViz.trendsChart) {
                    radarViz.initTrendsChart('trends-chart');
                }
                radarViz.updateTrends(this.snapshots);
            }, 100);
        }
    }

    // Начало оценки
    startAssessment() {
        const userNameInput = document.getElementById('user-name');
        this.userName = userNameInput.value.trim() || 'Аноним';
        
        calculator.reset();
        this.generateAssessmentScreen();
        this.showScreen('screen-assessment');
    }

    // Продолжение последнего снимка
    continueLastSnapshot() {
        if (this.snapshots.length === 0) return;
        
        const lastSnapshot = this.snapshots[this.snapshots.length - 1];
        calculator.loadSnapshot(lastSnapshot);
        
        // Заполнить формы данными из снимка
        this.fillAssessmentForm(lastSnapshot.answers);
        this.fillWeightsForm(lastSnapshot.weights);
        
        this.showScreen('screen-radar');
    }

    // Генерация экрана оценки
    generateAssessmentScreen() {
        const container = document.getElementById('assessment-content');
        container.innerHTML = '';

        for (const [sphereId, sphereData] of Object.entries(SPHERES)) {
            const card = this.createSphereCard(sphereId, sphereData);
            container.appendChild(card);
        }

        this.updateProgress();
    }

    // Создание карточки сферы
    createSphereCard(sphereId, sphereData) {
        const card = document.createElement('div');
        card.className = `sphere-card sphere-${sphereId}`;
        
        const header = document.createElement('div');
        header.className = 'sphere-header';
        header.innerHTML = `
            <div class="sphere-icon" style="background-color: ${sphereData.color}20;">
                ${sphereData.icon}
            </div>
            <div class="sphere-title">${sphereData.title}</div>
        `;
        
        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'sphere-questions';
        
        for (const question of sphereData.questions) {
            const questionEl = this.createQuestionElement(sphereId, question);
            questionsContainer.appendChild(questionEl);
        }
        
        card.appendChild(header);
        card.appendChild(questionsContainer);
        
        return card;
    }

    // Создание элемента вопроса
    createQuestionElement(sphereId, question) {
        const container = document.createElement('div');
        container.className = 'question';
        
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.text;
        
        const inputContainer = document.createElement('div');
        inputContainer.className = 'question-input';
        
        if (question.type === 'scale') {
            inputContainer.innerHTML = `
                <div class="scale-container">
                    <span>${question.labels[0]}</span>
                    <input type="range" 
                           min="${question.min}" 
                           max="${question.max}" 
                           value="${Math.floor((question.min + question.max) / 2)}"
                           class="scale-input"
                           data-sphere="${sphereId}"
                           data-question="${question.id}">
                    <span>${question.labels[question.labels.length - 1]}</span>
                </div>
                <div class="scale-labels">
                    ${question.labels.map((label, i) => `<span>${label}</span>`).join('')}
                </div>
            `;
        } else if (question.type === 'radio') {
            const optionsHtml = question.options.map(option => `
                <label class="radio-option">
                    <input type="radio" 
                           name="${sphereId}_${question.id}"
                           value="${option.value}"
                           data-sphere="${sphereId}"
                           data-question="${question.id}"
                           ${option.value === 0.5 ? 'checked' : ''}>
                    <span>${option.label}</span>
                </label>
            `).join('');
            
            inputContainer.innerHTML = `<div class="radio-group">${optionsHtml}</div>`;
        }
        
        const hint = document.createElement('div');
        hint.className = 'question-hint';
        hint.textContent = question.hint;
        
        container.appendChild(questionText);
        container.appendChild(inputContainer);
        container.appendChild(hint);
        
        // Привязка событий
        this.bindQuestionEvents(inputContainer, sphereId, question.id);
        
        return container;
    }

    // Привязка событий вопросов
    bindQuestionEvents(container, sphereId, questionId) {
        const inputs = container.querySelectorAll('input');
        
        for (const input of inputs) {
            input.addEventListener('change', () => {
                // Сохранение ответа
                if (!calculator.answers[sphereId]) {
                    calculator.answers[sphereId] = {};
                }
                
                calculator.answers[sphereId][questionId] = parseFloat(input.value);
                calculator.calculateSubindexes();
                
                this.updateProgress();
                this.updateNextButton();
            });
        }
    }

    // Заполнение формы оценки данными из снимка
    fillAssessmentForm(answers) {
        for (const [sphereId, sphereAnswers] of Object.entries(answers)) {
            for (const [questionId, value] of Object.entries(sphereAnswers)) {
                const input = document.querySelector(`input[data-sphere="${sphereId}"][data-question="${questionId}"][value="${value}"]`);
                if (input) {
                    input.checked = true;
                } else {
                    const slider = document.querySelector(`input[data-sphere="${sphereId}"][data-question="${questionId}"]`);
                    if (slider) {
                        slider.value = value;
                    }
                }
            }
        }
        
        calculator.answers = { ...answers };
        calculator.calculateSubindexes();
        this.updateProgress();
        this.updateNextButton();
    }

    // Обновление прогресса
    updateProgress() {
        const totalQuestions = Object.values(SPHERES).reduce((sum, sphere) => sum + sphere.questions.length, 0);
        const answeredQuestions = Object.values(calculator.answers).reduce((sum, sphereAnswers) => sum + Object.keys(sphereAnswers).length, 0);
        
        const progress = (answeredQuestions / totalQuestions) * 100;
        
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${answeredQuestions} из ${totalQuestions} вопросов`;
    }

    // Обновление кнопки "Далее"
    updateNextButton() {
        const button = document.getElementById('to-weights');
        const totalQuestions = Object.values(SPHERES).reduce((sum, sphere) => sum + sphere.questions.length, 0);
        const answeredQuestions = Object.values(calculator.answers).reduce((sum, sphereAnswers) => sum + Object.keys(sphereAnswers).length, 0);
        
        button.disabled = answeredQuestions < totalQuestions;
    }

    // Генерация экрана весов
    generateWeightsScreen() {
        const container = document.getElementById('weights-content');
        container.innerHTML = '';

        // Установка весов по умолчанию, если не заданы
        if (Object.keys(calculator.weights).length === 0) {
            for (const sphereId of Object.keys(SPHERES)) {
                calculator.weights[sphereId] = 3; // Среднее значение
            }
        }

        for (const [sphereId, sphereData] of Object.entries(SPHERES)) {
            const weightItem = document.createElement('div');
            weightItem.className = 'weight-item';
            
            const currentWeight = calculator.weights[sphereId] || 3;
            
            weightItem.innerHTML = `
                <div class="weight-label">
                    <span>${sphereData.icon}</span>
                    ${sphereData.title}
                </div>
                <input type="range" 
                       min="1" 
                       max="5" 
                       value="${currentWeight}"
                       class="weight-slider"
                       data-sphere="${sphereId}">
                <div class="weight-value">${currentWeight}</div>
            `;
            
            // Привязка события
            const slider = weightItem.querySelector('.weight-slider');
            const valueDisplay = weightItem.querySelector('.weight-value');
            
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                calculator.weights[sphereId] = value;
                valueDisplay.textContent = value;
                calculator.calculateTotalIndex();
            });
            
            container.appendChild(weightItem);
        }
    }

    // Заполнение формы весов данными из снимка
    fillWeightsForm(weights) {
        for (const [sphereId, weight] of Object.entries(weights)) {
            const slider = document.querySelector(`input[data-sphere="${sphereId}"]`);
            const valueDisplay = slider?.parentElement.querySelector('.weight-value');
            
            if (slider) {
                slider.value = weight;
                if (valueDisplay) {
                    valueDisplay.textContent = weight;
                }
            }
        }
        
        calculator.weights = { ...weights };
        calculator.calculateTotalIndex();
    }

    // Генерация экрана радара
    generateRadarScreen() {
        // Установить дату
        document.getElementById('radar-date').textContent = calculator.formatDate(new Date());
        
        // Обновить общий индекс
        document.getElementById('total-index-value').textContent = calculator.totalIndex;
        
        // Обновить цвет общего индекса
        const indexElement = document.getElementById('total-index-value');
        const color = calculator.getColor(calculator.totalIndex / 100);
        indexElement.className = `total-index-value ${color}`;
        
        // Обновить список подиндексов
        this.updateSubindexesList();
        
        // Обновить радар
        setTimeout(() => {
            this.updateRadar();
        }, 100);
    }

    // Обновление радара
    updateRadar() {
        radarViz.updateRadar(calculator.subindexes);
    }

    // Обновление списка подиндексов
    updateSubindexesList() {
        const container = document.getElementById('subindexes-list');
        container.innerHTML = '';

        for (const [sphereId, subindex] of Object.entries(calculator.subindexes)) {
            const sphere = SPHERES[sphereId];
            const color = calculator.getColor(subindex);
            
            const item = document.createElement('div');
            item.className = 'subindex-item';
            item.innerHTML = `
                <span class="subindex-name">
                    <span>${sphere.icon}</span>
                    ${sphere.title}
                </span>
                <span class="subindex-value ${color}">
                    ${Math.round(subindex * 100)}%
                </span>
            `;
            
            container.appendChild(item);
        }
    }

    // Генерация экрана интерпретации
    generateInterpretationScreen() {
        const zones = calculator.getZones();
        
        // Стабильные зоны
        const stableContainer = document.getElementById('stable-list');
        stableContainer.innerHTML = '';
        for (const zone of zones.stable) {
            const tag = document.createElement('span');
            tag.className = 'zone-tag green';
            tag.textContent = `${zone.title} (${Math.round(zone.value * 100)}%)`;
            stableContainer.appendChild(tag);
        }
        
        // Зоны внимания
        const attentionContainer = document.getElementById('attention-list');
        attentionContainer.innerHTML = '';
        for (const zone of zones.attention) {
            const tag = document.createElement('span');
            tag.className = 'zone-tag yellow';
            tag.textContent = `${zone.title} (${Math.round(zone.value * 100)}%)`;
            attentionContainer.appendChild(tag);
        }
        
        // Зоны риска
        const riskContainer = document.getElementById('risk-list');
        riskContainer.innerHTML = '';
        for (const zone of zones.risk) {
            const tag = document.createElement('span');
            tag.className = 'zone-tag red';
            tag.textContent = `${zone.title} (${Math.round(zone.value * 100)}%)`;
            riskContainer.appendChild(tag);
        }
        
        // Приоритеты
        const priorities = calculator.getPriorities(5);
        const prioritiesContainer = document.getElementById('priorities-list');
        prioritiesContainer.innerHTML = '';
        
        if (priorities.length === 0) {
            const item = document.createElement('div');
            item.className = 'priority-item';
            item.textContent = 'Все сферы находятся в стабильном состоянии. Поддерживайте баланс.';
            prioritiesContainer.appendChild(item);
        } else {
            for (const priority of priorities) {
                const item = document.createElement('div');
                item.className = 'priority-item';
                item.innerHTML = `
                    <span>Обратить внимание на сферу "${priority.title}"</span>
                    <small style="color: #7f8c8d; margin-left: 10px;">
                        (${Math.round(priority.subindex * 100)}%, вес ${calculator.weights[priority.id]})
                    </small>
                `;
                prioritiesContainer.appendChild(item);
            }
        }
    }

    // Генерация экрана истории
    generateHistoryScreen() {
        this.updateHistoryTable();
        radarViz.updateTrends(this.snapshots);
    }

    // Обновление таблицы истории
    updateHistoryTable() {
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';

        if (this.snapshots.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center; padding: 20px;">Нет сохраненных снимков</td>';
            tbody.appendChild(row);
            return;
        }

        const sortedSnapshots = [...this.snapshots].sort((a, b) => new Date(b.date) - new Date(a.date));

        for (let i = 0; i < sortedSnapshots.length; i++) {
            const snapshot = sortedSnapshots[i];
            const prevSnapshot = sortedSnapshots[i + 1];
            
            const row = document.createElement('tr');
            
            const date = new Date(snapshot.date);
            const dateStr = calculator.formatDate(date);
            
            let changeClass = 'change-neutral';
            let changeText = '—';
            
            if (prevSnapshot) {
                const change = snapshot.totalIndex - prevSnapshot.totalIndex;
                if (change > 0) {
                    changeClass = 'change-positive';
                    changeText = `+${change}`;
                } else if (change < 0) {
                    changeClass = 'change-negative';
                    changeText = `${change}`;
                }
            }
            
            row.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${snapshot.totalIndex}%</strong></td>
                <td class="${changeClass}">${changeText}</td>
                <td>
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;"
                            onclick="app.loadSnapshotDetails('${snapshot.id}')">
                        Подробности
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        }
    }

    // Загрузка деталей снимка
    loadSnapshotDetails(snapshotId) {
        const snapshot = this.snapshots.find(s => s.id === snapshotId);
        if (!snapshot) return;

        const detailsContainer = document.getElementById('snapshot-details');
        const contentContainer = document.getElementById('snapshot-content');
        
        contentContainer.innerHTML = `
            <h4>Снимок от ${calculator.formatDate(new Date(snapshot.date))}</h4>
            <p><strong>Общий индекс:</strong> ${snapshot.totalIndex}%</p>
            
            <h5>Подиндексы по сферам:</h5>
            <div class="subindexes-list">
                ${Object.entries(snapshot.subindexes).map(([sphereId, subindex]) => {
                    const sphere = SPHERES[sphereId];
                    const color = calculator.getColor(subindex);
                    return `
                        <div class="subindex-item">
                            <span class="subindex-name">
                                <span>${sphere.icon}</span>
                                ${sphere.title}
                            </span>
                            <span class="subindex-value ${color}">
                                ${Math.round(subindex * 100)}%
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <h5>Веса сфер:</h5>
            <ul>
                ${Object.entries(snapshot.weights).map(([sphereId, weight]) => {
                    const sphere = SPHERES[sphereId];
                    return `<li>${sphere.title}: ${weight}</li>`;
                }).join('')}
            </ul>
        `;
        
        detailsContainer.style.display = 'block';
        
        // Кнопка закрытия
        document.getElementById('close-details').onclick = () => {
            detailsContainer.style.display = 'none';
        };
    }

    // Переключение вида истории
    toggleHistoryView(view) {
        const chartBtn = document.getElementById('show-chart');
        const tableBtn = document.getElementById('show-table');
        const chartView = document.getElementById('chart-view');
        const tableView = document.getElementById('table-view');
        
        if (view === 'chart') {
            chartBtn.classList.add('active');
            tableBtn.classList.remove('active');
            chartView.style.display = 'block';
            tableView.style.display = 'none';
        } else {
            tableBtn.classList.add('active');
            chartBtn.classList.remove('active');
            chartView.style.display = 'none';
            tableView.style.display = 'block';
        }
    }

    // Сохранение снимка
    saveSnapshot() {
        const snapshot = calculator.createSnapshot();
        this.snapshots.push(snapshot);
        this.saveData();
        
        // Показать уведомление
        alert('Снимок успешно сохранен!');
        
        this.updateHistoryPreview();
    }

    // Начало нового снимка
    startNewSnapshot() {
        calculator.reset();
        this.generateAssessmentScreen();
        this.showScreen('screen-assessment');
    }

    // Обновление превью истории на главном экране
    updateHistoryPreview() {
        const container = document.getElementById('history-list');
        container.innerHTML = '';
        
        if (this.snapshots.length === 0) {
            container.innerHTML = '<p style="color: #7f8c8d; text-align: center;">Пока нет сохраненных снимков</p>';
            document.getElementById('continue-btn').style.display = 'none';
            return;
        }
        
        document.getElementById('continue-btn').style.display = 'block';
        
        const recentSnapshots = this.snapshots
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        for (const snapshot of recentSnapshots) {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const date = new Date(snapshot.date);
            const dateStr = calculator.formatDate(date);
            
            item.innerHTML = `
                <span class="history-date">${dateStr}</span>
                <span class="history-index ${calculator.getColor(snapshot.totalIndex / 100)}">${snapshot.totalIndex}%</span>
            `;
            
            container.appendChild(item);
        }
    }

    // Сохранение данных в localStorage
    saveData() {
        const data = {
            userName: this.userName,
            snapshots: this.snapshots
        };
        localStorage.setItem('lifeRadarData', JSON.stringify(data));
    }

    // Загрузка данных из localStorage
    loadData() {
        const data = localStorage.getItem('lifeRadarData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.userName = parsed.userName || '';
                this.snapshots = parsed.snapshots || [];
                
                // Заполнить имя пользователя
                if (this.userName) {
                    document.getElementById('user-name').value = this.userName;
                }
            } catch (e) {
                console.error('Ошибка загрузки данных:', e);
            }
        }
    }

    // Экспорт данных
    exportData() {
        const data = {
            userName: this.userName,
            snapshots: this.snapshots,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `life-radar-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Инициализация приложения при загрузке страницы
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new LifeRadarApp();
});