/**
 * МОДУЛЬ СЦЕНАРИЕВ СТРЕСС-ТЕСТА
 * 
 * Этот модуль содержит всю логику расчета стресс-тестов:
 * - Создание сценариев (базовый, падение дохода, потеря дохода, комбинированный)
 * - Месячную симуляцию денежных потоков
 * - Расчет точки разорения
 * - Вычисление индекса стресс-устойчивости
 */

// Класс для работы с финансовыми данными и сценариями
class StressTester {
    constructor() {
        // Базовые финансовые параметры пользователя
        this.baseData = {
            income: 0,
            fixedExpenses: 0,
            variableExpenses: 0,
            savings: 0,
            debt: 0
        };
        
        // Текущие активные сценарии
        this.scenarios = new Map();
        
        // Результаты симуляции
        this.results = new Map();
        
        // История прогонов
        this.history = this.loadHistory();
    }

    /**
     * Установка базовых финансовых данных
     */
    setBaseData(data) {
        this.baseData = {
            income: Number(data.income) || 0,
            fixedExpenses: Number(data.fixedExpenses) || 0,
            variableExpenses: Number(data.variableExpenses) || 0,
            savings: Number(data.savings) || 0,
            debt: Number(data.debt) || 0
        };
    }

    /**
     * Создание сценария на основе параметров
     * Коэффициенты:
     * - incomeFactor: множитель дохода (1.0 = 100%, 0.5 = 50% от дохода)
     * - expenseFactor: множитель расходов (1.0 = 100%, 1.2 = +20% расходов)
     */
    createScenario(id, name, description, incomeFactor, expenseFactor) {
        return {
            id,
            name,
            description,
            incomeFactor,
            expenseFactor,
            enabled: true
        };
    }

    /**
     * Инициализация стандартных сценариев
     */
    initializeScenarios() {
        this.scenarios.clear();
        
        // Базовый сценарий - все как есть
        this.scenarios.set('base', this.createScenario(
            'base',
            '🟢 Базовый',
            'Все остается как сейчас',
            1.0,  // доход 100%
            1.0   // расходы 100%
        ));
        
        // Падение дохода на 30%
        this.scenarios.set('income-drop-30', this.createScenario(
            'income-drop-30',
            '🟡 Падение дохода (-30%)',
            'Потеря части дохода',
            0.7,  // доход 70% (-30%)
            1.0   // расходы 100%
        ));
        
        // Потеря дохода на 50%
        this.scenarios.set('income-drop-50', this.createScenario(
            'income-drop-50',
            '🔴 Потеря дохода (-50%)',
            'Серьезное сокращение',
            0.5,  // доход 50% (-50%)
            1.0   // расходы 100%
        ));
        
        // Комбинированный шок
        this.scenarios.set('combined-shock', this.createScenario(
            'combined-shock',
            '🔥 Комбинированный шок',
            'Падение дохода + рост расходов',
            0.6,  // доход 60% (-40%)
            1.2   // расходы 120% (+20%)
        ));
    }

    /**
     * Обновление параметров сценария
     */
    updateScenario(scenarioId, incomeFactor, expenseFactor) {
        if (this.scenarios.has(scenarioId)) {
            const scenario = this.scenarios.get(scenarioId);
            scenario.incomeFactor = incomeFactor;
            scenario.expenseFactor = expenseFactor;
        }
    }

    /**
     * Включение/выключение сценария
     */
    toggleScenario(scenarioId, enabled) {
        if (this.scenarios.has(scenarioId)) {
            this.scenarios.get(scenarioId).enabled = enabled;
        }
    }

    /**
     * РАСЧЕТ МЕСЯЧНОГО БАЛАНСА
     * 
     * Формула: остаток_текущий = остаток_прошлый + доход_месячный - расходы_месячные
     * 
     * Где:
     * - доход_месячный = базовый_доход * коэффициент_дохода_сценария
     * - расходы_месячные = (обязательные_расходы + переменные_расходы) * коэффициент_расходов_сценария
     * 
     * ВАЖНО: Эта модель НЕ учитывает:
     * - Проценты по долгам и накоплениям
     * - Инфляцию
     * - Нестабильность доходов (все расчеты детерминированные)
     * - Возможность найти новую работу или сократить расходы
     */
    calculateMonthlyBalance(scenario, month, previousBalance) {
        // Расчет дохода в этом месяце с учетом сценария
        const monthlyIncome = this.baseData.income * scenario.incomeFactor;
        
        // Расчет расходов в этом месяце с учетом сценария
        const totalBaseExpenses = this.baseData.fixedExpenses + this.baseData.variableExpenses;
        const monthlyExpenses = totalBaseExpenses * scenario.expenseFactor;
        
        // Расчет нового баланса
        const newBalance = previousBalance + monthlyIncome - monthlyExpenses;
        
        return {
            month: month + 1,
            income: monthlyIncome,
            expenses: monthlyExpenses,
            balance: newBalance,
            isNegative: newBalance <= 0
        };
    }

    /**
     * Симуляция сценария до точки разорения или до 120 месяцев (10 лет)
     * 
     * Возвращает:
     * - Массив месячных данных
     * - Месяц разорения (deathMonth) - первый месяц с отрицательным балансом
     * - Флаг, дожил ли до конца периода
     */
    simulateScenario(scenario) {
        const monthlyData = [];
        let currentBalance = this.baseData.savings;
        let deathMonth = null;
        const maxMonths = 120; // 10 лет
        
        for (let month = 0; month < maxMonths; month++) {
            const monthResult = this.calculateMonthlyBalance(scenario, month, currentBalance);
            monthlyData.push(monthResult);
            currentBalance = monthResult.balance;
            
            // Определяем месяц разорения
            if (deathMonth === null && monthResult.isNegative) {
                deathMonth = month + 1;
                break; // Прерываем симуляцию при достижении отрицательного баланса
            }
        }
        
        // Если разорения не произошло, считаем выжившим
        const survived = deathMonth === null;
        const survivalMonths = survived ? maxMonths : deathMonth - 1;
        
        return {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            monthlyData,
            deathMonth,
            survived,
            survivalMonths
        };
    }

    /**
     * Запуск симуляции для всех активных сценариев
     */
    runSimulation() {
        this.results.clear();
        
        for (const [id, scenario] of this.scenarios) {
            if (scenario.enabled) {
                const result = this.simulateScenario(scenario);
                this.results.set(id, result);
            }
        }
        
        return this.results;
    }

    /**
     * РАСЧЕТ ИНДЕКСА СТРЕСС-УСТОЙЧИВОСТИ (0-100)
     * 
     * Алгоритм:
     * - Для каждого сценария начисляем баллы на основе месяцев выживания
     * - Больше месяцев = больше баллов
     * - Взвешиваем по критичности сценария (базовый вес = 1, экстремальный = 1.5)
     * - Нормализуем к шкале 0-100
     * 
     * Баллы:
     * - < 3 месяцев: 0 баллов (критический риск)
     * - 3-6 месяцев: 30 баллов (высокий риск)
     * - 6-12 месяцев: 60 баллов (средний риск)
     * - > 12 месяцев: 100 баллов (низкий риск)
     */
    calculateStressIndex() {
        if (this.results.size === 0) return 0;
        
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [id, result] of this.results) {
            const months = result.survivalMonths;
            let scenarioScore = 0;
            let weight = 1.0;
            
            // Определяем вес сценария по критичности
            switch (id) {
                case 'base':
                    weight = 1.0;
                    break;
                case 'income-drop-30':
                    weight = 1.2;
                    break;
                case 'income-drop-50':
                case 'combined-shock':
                    weight = 1.5;
                    break;
            }
            
            // Определяем баллы на основе месяцев выживания
            if (months >= 12) {
                scenarioScore = 100;
            } else if (months >= 6) {
                scenarioScore = 60 + (months - 6) * 6.67; // 60-100
            } else if (months >= 3) {
                scenarioScore = 30 + (months - 3) * 10; // 30-60
            } else {
                scenarioScore = months * 10; // 0-30
            }
            
            totalScore += scenarioScore * weight;
            totalWeight += weight;
        }
        
        // Нормализуем и округляем
        return Math.round(totalScore / totalWeight);
    }

    /**
     * Сохранение прогона в историю
     */
    saveRun() {
        const run = {
            id: Date.now(),
            date: new Date().toISOString(),
            baseData: { ...this.baseData },
            results: Array.from(this.results.entries()).map(([id, result]) => ({
                id,
                scenarioName: result.scenarioName,
                survivalMonths: result.survivalMonths,
                deathMonth: result.deathMonth,
                survived: result.survived
            })),
            stressIndex: this.calculateStressIndex()
        };
        
        this.history.unshift(run); // Добавляем в начало
        
        // Ограничиваем историю 20 записями
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }
        
        this.saveHistory();
        return run;
    }

    /**
     * Сохранение истории в localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem('stress-test-history', JSON.stringify(this.history));
        } catch (e) {
            console.warn('Не удалось сохранить историю:', e);
        }
    }

    /**
     * Загрузка истории из localStorage
     */
    loadHistory() {
        try {
            const stored = localStorage.getItem('stress-test-history');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('Не удалось загрузить историю:', e);
            return [];
        }
    }

    /**
     * Очистка истории
     */
    clearHistory() {
        this.history = [];
        localStorage.removeItem('stress-test-history');
    }

    /**
     * Загрузка прогона из истории
     */
    loadRun(runId) {
        const run = this.history.find(r => r.id === runId);
        if (run) {
            this.setBaseData(run.baseData);
            return run;
        }
        return null;
    }
}

// Создаем глобальный экземпляр тестера
const stressTester = new StressTester();