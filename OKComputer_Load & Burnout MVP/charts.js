// График распределения времени
function updateTimeChart() {
    const time = userData.time;
    const labels = ['Сон', 'Работа', 'Проекты', 'Быт', 'Семья', 'Восстановление'];
    const values = [time.sleep, time.work, time.projects, time.household, time.family, time.recovery];
    const colors = ['#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#27ae60'];
    
    const data = [{
        values: values,
        labels: labels,
        type: 'pie',
        hole: 0.4,
        textinfo: 'label+percent',
        textposition: 'outside',
        marker: {
            colors: colors,
            line: {
                color: '#fff',
                width: 2
            }
        },
        textfont: {
            size: 14,
            color: '#2c3e50'
        }
    }];
    
    const layout = {
        title: {
            text: 'Распределение времени в неделю',
            font: {
                size: 18,
                color: '#2c3e50',
                family: 'inherit'
            }
        },
        showlegend: false,
        margin: {
            l: 20,
            r: 20,
            t: 60,
            b: 20
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: 'inherit',
            color: '#2c3e50'
        }
    };
    
    const config = {
        displayModeBar: false,
        responsive: true
    };
    
    Plotly.newPlot('time-chart', data, layout, config);
}

// График нагрузки и восстановления
function updateLoadChart() {
    const categories = ['Работа', 'Проекты', 'Быт', 'Семья'];
    const loadValues = [
        userData.time.work * LOAD_COEFFICIENTS.work,
        userData.time.projects * LOAD_COEFFICIENTS.projects,
        userData.time.household * LOAD_COEFFICIENTS.household,
        userData.time.family * LOAD_COEFFICIENTS.family
    ];
    
    const recoveryCategories = ['Сон', 'Восстановление'];
    const recoveryValues = [
        Math.abs(userData.time.sleep * LOAD_COEFFICIENTS.sleep),
        Math.abs(userData.time.recovery * LOAD_COEFFICIENTS.recovery)
    ];
    
    const trace1 = {
        x: categories,
        y: loadValues,
        name: 'Нагрузка',
        type: 'bar',
        marker: {
            color: '#e74c3c',
            opacity: 0.8
        },
        text: loadValues.map(v => v.toFixed(1)),
        textposition: 'outside',
        textfont: {
            size: 12,
            color: '#2c3e50'
        }
    };
    
    const trace2 = {
        x: recoveryCategories,
        y: recoveryValues,
        name: 'Восстановление',
        type: 'bar',
        marker: {
            color: '#27ae60',
            opacity: 0.8
        },
        text: recoveryValues.map(v => v.toFixed(1)),
        textposition: 'outside',
        textfont: {
            size: 12,
            color: '#2c3e50'
        },
        yaxis: 'y2'
    };
    
    const data = [trace1, trace2];
    
    const layout = {
        title: {
            text: 'Баланс нагрузки и восстановления',
            font: {
                size: 18,
                color: '#2c3e50',
                family: 'inherit'
            }
        },
        xaxis: {
            title: '',
            tickfont: {
                size: 12,
                color: '#2c3e50'
            }
        },
        yaxis: {
            title: {
                text: 'Индекс нагрузки',
                font: {
                    size: 14,
                    color: '#e74c3c'
                }
            },
            tickfont: {
                size: 12,
                color: '#2c3e50'
            },
            side: 'left'
        },
        yaxis2: {
            title: {
                text: 'Индекс восстановления',
                font: {
                    size: 14,
                    color: '#27ae60'
                }
            },
            tickfont: {
                size: 12,
                color: '#2c3e50'
            },
            overlaying: 'y',
            side: 'right'
        },
        legend: {
            x: 0.5,
            xanchor: 'center',
            y: 1.1,
            orientation: 'h',
            font: {
                size: 12,
                color: '#2c3e50'
            }
        },
        margin: {
            l: 60,
            r: 60,
            t: 80,
            b: 40
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: 'inherit',
            color: '#2c3e50'
        },
        barmode: 'group'
    };
    
    const config = {
        displayModeBar: false,
        responsive: true
    };
    
    Plotly.newPlot('load-chart', data, layout, config);
}

// График истории риска
function updateHistoryChart() {
    const history = getHistory();
    
    if (history.length === 0) {
        return;
    }
    
    const dates = history.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'short' 
        });
    });
    
    const riskScores = history.map(item => item.risk.score);
    const loadIndexes = history.map(item => item.calculations.loadIndex);
    
    const trace1 = {
        x: dates,
        y: riskScores,
        name: 'Риск выгорания (%)',
        type: 'scatter',
        mode: 'lines+markers',
        line: {
            color: '#e74c3c',
            width: 3
        },
        marker: {
            color: '#e74c3c',
            size: 8
        },
        yaxis: 'y'
    };
    
    const trace2 = {
        x: dates,
        y: loadIndexes,
        name: 'Индекс нагрузки',
        type: 'scatter',
        mode: 'lines+markers',
        line: {
            color: '#3498db',
            width: 3
        },
        marker: {
            color: '#3498db',
            size: 8
        },
        yaxis: 'y2'
    };
    
    const data = [trace1, trace2];
    
    const layout = {
        title: {
            text: 'Динамика нагрузки и риска',
            font: {
                size: 18,
                color: '#2c3e50',
                family: 'inherit'
            }
        },
        xaxis: {
            title: '',
            tickfont: {
                size: 12,
                color: '#2c3e50'
            }
        },
        yaxis: {
            title: {
                text: 'Риск выгорания (%)',
                font: {
                    size: 14,
                    color: '#e74c3c'
                }
            },
            tickfont: {
                size: 12,
                color: '#2c3e50'
            },
            side: 'left',
            range: [0, 100]
        },
        yaxis2: {
            title: {
                text: 'Индекс нагрузки',
                font: {
                    size: 14,
                    color: '#3498db'
                }
            },
            tickfont: {
                size: 12,
                color: '#2c3e50'
            },
            overlaying: 'y',
            side: 'right'
        },
        legend: {
            x: 0.5,
            xanchor: 'center',
            y: 1.1,
            orientation: 'h',
            font: {
                size: 12,
                color: '#2c3e50'
            }
        },
        margin: {
            l: 60,
            r: 60,
            t: 80,
            b: 40
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: 'inherit',
            color: '#2c3e50'
        }
    };
    
    const config = {
        displayModeBar: false,
        responsive: true
    };
    
    // Создаём контейнер для графика в истории
    const historyContainer = document.getElementById('history-container');
    const chartDiv = document.createElement('div');
    chartDiv.id = 'history-chart';
    chartDiv.style.height = '300px';
    chartDiv.style.marginTop = '20px';
    
    // Удаляем старый график если есть
    const oldChart = document.getElementById('history-chart');
    if (oldChart) {
        oldChart.remove();
    }
    
    historyContainer.appendChild(chartDiv);
    
    Plotly.newPlot('history-chart', data, layout, config);
}

// Инициализация графиков при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем график времени
    setTimeout(() => {
        updateTimeChart();
    }, 100);
});