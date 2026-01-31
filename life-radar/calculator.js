// Логика расчета индексов

class LifeRadarCalculator {
    constructor() {
        this.answers = {};
        this.weights = {};
        this.subindexes = {};
        this.totalIndex = 0;
    }

    // Установка ответов
    setAnswers(answers) {
        this.answers = answers;
        this.calculateSubindexes();
    }

    // Установка весов
    setWeights(weights) {
        this.weights = weights;
    }

    // Расчет подиндексов для каждой сферы
    calculateSubindexes() {
        this.subindexes = {};
        
        for (const [sphereId, sphereData] of Object.entries(SPHERES)) {
            const sphereAnswers = this.answers[sphereId] || {};
            const questions = sphereData.questions;
            
            let totalScore = 0;
            let questionCount = 0;
            
            for (const question of questions) {
                const answer = sphereAnswers[question.id];
                if (answer !== undefined && answer !== null) {
                    // Нормализация значения в диапазон 0-1
                    const normalizedValue = this.normalizeAnswer(answer, question);
                    totalScore += normalizedValue;
                    questionCount++;
                }
            }
            
            // Среднее значение по вопросам сферы
            this.subindexes[sphereId] = questionCount > 0 ? totalScore / questionCount : 0;
        }
        
        this.calculateTotalIndex();
    }

    // Нормализация ответа в диапазон 0-1
    normalizeAnswer(value, question) {
        switch (question.type) {
            case 'scale':
                // Шкала 1-5 нормализуется в 0-1
                return (value - question.min) / (question.max - question.min);
                
            case 'radio':
                // Радиокнопки уже имеют нормализованные значения
                return value;
                
            case 'boolean':
                // Да/нет в 1/0
                return value ? 1 : 0;
                
            default:
                return 0;
        }
    }

    // Расчет общего индекса
    calculateTotalIndex() {
        let weightedSum = 0;
        let weightSum = 0;
        
        for (const [sphereId, subindex] of Object.entries(this.subindexes)) {
            const weight = this.weights[sphereId] || 3; // Значение по умолчанию
            weightedSum += subindex * weight;
            weightSum += weight;
        }
        
        // Взвешенное среднее, умноженное на 100 для шкалы 0-100
        this.totalIndex = weightSum > 0 ? Math.round((weightedSum / weightSum) * 100) : 0;
    }

    // Получение цвета по значению
    getColor(value) {
        if (value >= THRESHOLDS.green) {
            return 'green';
        } else if (value >= THRESHOLDS.yellow) {
            return 'yellow';
        } else {
            return 'red';
        }
    }

    // Получение CSS цвета сферы
    getSphereColor(sphereId) {
        return SPHERE_COLORS[sphereId] || '#7f8c8d';
    }

    // Получение данных для радара
    getRadarData() {
        const labels = [];
        const data = [];
        const backgroundColor = [];
        const borderColor = [];
        
        for (const [sphereId, subindex] of Object.entries(this.subindexes)) {
            const sphere = SPHERES[sphereId];
            labels.push(sphere.title);
            data.push(subindex);
            backgroundColor.push(this.getSphereColor(sphereId) + '40'); // 40 = 25% прозрачности
            borderColor.push(this.getSphereColor(sphereId));
        }
        
        return {
            labels,
            datasets: [{
                label: 'Жизненная устойчивость',
                data,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: borderColor
            }]
        };
    }

    // Формирование приоритетов
    getPriorities(maxCount = 5) {
        const priorities = [];
        const scores = {};
        
        // Расчет очков приоритета: (1 - подиндекс) * вес
        for (const [sphereId, subindex] of Object.entries(this.subindexes)) {
            const weight = this.weights[sphereId] || 3;
            const urgency = 1 - subindex;
            scores[sphereId] = urgency * weight;
        }
        
        // Сортировка по очкам приоритета
        const sortedSpheres = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, maxCount);
        
        for (const [sphereId, score] of sortedSpheres) {
            const subindex = this.subindexes[sphereId];
            if (subindex < THRESHOLDS.green) { // Только если не в зеленой зоне
                const sphere = SPHERES[sphereId];
                priorities.push({
                    id: sphereId,
                    title: sphere.title,
                    score: score,
                    subindex: subindex,
                    color: this.getColor(subindex)
                });
            }
        }
        
        return priorities;
    }

    // Получение зон (стабильные, внимания, риска)
    getZones() {
        const zones = {
            stable: [],
            attention: [],
            risk: []
        };
        
        for (const [sphereId, subindex] of Object.entries(this.subindexes)) {
            const sphere = SPHERES[sphereId];
            const color = this.getColor(subindex);
            const zoneData = {
                id: sphereId,
                title: sphere.title,
                value: subindex,
                color: color
            };
            
            switch (color) {
                case 'green':
                    zones.stable.push(zoneData);
                    break;
                case 'yellow':
                    zones.attention.push(zoneData);
                    break;
                case 'red':
                    zones.risk.push(zoneData);
                    break;
            }
        }
        
        return zones;
    }

    // Форматирование даты
    formatDate(date) {
        const d = new Date(date);
        const day = d.getDate();
        const month = MONTH_NAMES[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    }

    // Создание снимка состояния
    createSnapshot() {
        return {
            id: 'snap_' + Date.now(),
            date: new Date().toISOString(),
            answers: { ...this.answers },
            weights: { ...this.weights },
            subindexes: { ...this.subindexes },
            totalIndex: this.totalIndex,
            priorities: this.getPriorities(5)
        };
    }

    // Загрузка снимка
    loadSnapshot(snapshot) {
        this.answers = { ...snapshot.answers };
        this.weights = { ...snapshot.weights };
        this.subindexes = { ...snapshot.subindexes };
        this.totalIndex = snapshot.totalIndex;
    }

    // Очистка данных
    reset() {
        this.answers = {};
        this.weights = {};
        this.subindexes = {};
        this.totalIndex = 0;
    }
}

// Глобальный экземпляр калькулятора
const calculator = new LifeRadarCalculator();