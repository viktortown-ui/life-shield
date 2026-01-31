// Работа с localStorage
const STORAGE_KEY = 'burnout-calculator-history';

// Сохранить результат в историю
function saveToHistory(result) {
    try {
        let history = getHistory();
        
        // Добавляем новый результат
        history.unshift(result);
        
        // Ограничиваем историю последними 10 записями
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        // Сохраняем в localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        
        return true;
    } catch (error) {
        console.error('Ошибка при сохранении в историю:', error);
        return false;
    }
}

// Получить историю из localStorage
function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Ошибка при чтении истории:', error);
        return [];
    }
}

// Очистить историю
function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Ошибка при очистке истории:', error);
        return false;
    }
}

// Загрузить и отобразить историю
function loadHistory() {
    const history = getHistory();
    const container = document.getElementById('history-container');
    
    if (!container) {
        return;
    }
    
    if (history.length === 0) {
        container.innerHTML = '<div class="history-empty">История пуста. Сохраните первый расчёт.</div>';
        return;
    }
    
    // Создаём HTML для истории
    const historyHTML = history.map((item, index) => {
        const date = new Date(item.timestamp);
        const dateString = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const riskLevel = item.risk.level;
        const riskClass = riskLevel === 'green' ? 'low' : riskLevel === 'yellow' ? 'medium' : 'high';
        const riskText = riskLevel === 'green' ? 'Низкий' : riskLevel === 'yellow' ? 'Средний' : 'Высокий';
        
        return `
            <div class="history-item">
                <div>
                    <div class="history-date">${dateString}</div>
                    <div class="history-load">Нагрузка: ${item.calculations.loadIndex} | Восстановление: ${item.calculations.recoveryIndex}</div>
                </div>
                <div class="history-risk ${riskClass}">${riskText}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = historyHTML;
    
    // Добавляем график если есть достаточно данных
    if (history.length >= 2) {
        setTimeout(() => {
            updateHistoryChart();
        }, 100);
    }
}

// Экспортировать историю в JSON
function exportHistory() {
    try {
        const history = getHistory();
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `burnout-history-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        return true;
    } catch (error) {
        console.error('Ошибка при экспорте истории:', error);
        return false;
    }
}

// Импортировать историю из JSON
function importHistory(file) {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Валидация данных
                    if (!Array.isArray(data)) {
                        throw new Error('Неверный формат файла');
                    }
                    
                    // Сохраняем данные
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    resolve(data);
                } catch (parseError) {
                    reject(new Error('Ошибка при разборе файла: ' + parseError.message));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Ошибка при чтении файла'));
            };
            
            reader.readAsText(file);
        } catch (error) {
            reject(error);
        }
    });
}

// Получить статистику из истории
function getStatistics() {
    const history = getHistory();
    
    if (history.length === 0) {
        return null;
    }
    
    const riskScores = history.map(item => item.risk.score);
    const loadIndexes = history.map(item => item.calculations.loadIndex);
    const recoveryIndexes = history.map(item => item.calculations.recoveryIndex);
    
    return {
        totalRecords: history.length,
        averageRisk: Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length),
        averageLoad: Math.round(loadIndexes.reduce((sum, load) => sum + load, 0) / loadIndexes.length * 10) / 10,
        averageRecovery: Math.round(recoveryIndexes.reduce((sum, rec) => sum + rec, 0) / recoveryIndexes.length * 10) / 10,
        trend: calculateTrend(riskScores),
        lastRecord: history[0],
        firstRecord: history[history.length - 1]
    };
}

// Рассчитать тренд
function calculateTrend(values) {
    if (values.length < 2) {
        return 'stable';
    }
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 5) {
        return 'increasing';
    } else if (diff < -5) {
        return 'decreasing';
    } else {
        return 'stable';
    }
}

// Автосохранение (опционально)
function enableAutoSave() {
    // Сохраняем данные каждые 30 секунд при изменениях
    let saveTimeout;
    
    function scheduleSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const tempData = {
                timestamp: new Date().toISOString(),
                userData: { ...userData },
                isDraft: true
            };
            
            try {
                localStorage.setItem('burnout-calculator-draft', JSON.stringify(tempData));
            } catch (error) {
                console.error('Ошибка автосохранения:', error);
            }
        }, 30000);
    }
    
    // Добавляем обработчики для отслеживания изменений
    document.addEventListener('input', scheduleSave);
    document.addEventListener('change', scheduleSave);
}

// Загрузить черновик
function loadDraft() {
    try {
        const draft = localStorage.getItem('burnout-calculator-draft');
        if (draft) {
            const data = JSON.parse(draft);
            if (data.isDraft && data.userData) {
                return data.userData;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке черновика:', error);
    }
    
    return null;
}

// Очистить черновик
function clearDraft() {
    try {
        localStorage.removeItem('burnout-calculator-draft');
    } catch (error) {
        console.error('Ошибка при очистке черновика:', error);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем черновик если есть
    const draft = loadDraft();
    if (draft) {
        // Можно предложить восстановить данные
        console.log('Найден черновик:', draft);
    }
    
    // Включаем автосохранение
    enableAutoSave();
});