// Визуализация радара и графиков

class RadarVisualization {
    constructor() {
        this.radarChart = null;
        this.trendsChart = null;
    }

    // Инициализация радара
    initRadarChart(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Жизненная устойчивость',
                    data: [],
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: [],
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: [],
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 1,
                        min: 0,
                        ticks: {
                            stepSize: 0.2,
                            callback: function(value) {
                                return (value * 100).toFixed(0);
                            },
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#2c3e50'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const percentage = Math.round(value * 100);
                                let status = '';
                                
                                if (value >= THRESHOLDS.green) {
                                    status = ' (хорошо)';
                                } else if (value >= THRESHOLDS.yellow) {
                                    status = ' (нормально)';
                                } else {
                                    status = ' (требует внимания)';
                                }
                                
                                return `Значение: ${percentage}%${status}`;
                            }
                        }
                    }
                }
            }
        });

        return this.radarChart;
    }

    // Обновление радара
    updateRadar(data) {
        if (!this.radarChart) return;

        // Подготовка данных
        const labels = [];
        const values = [];
        const pointColors = [];

        for (const [sphereId, subindex] of Object.entries(data)) {
            const sphere = SPHERES[sphereId];
            labels.push(sphere.title);
            values.push(subindex);
            pointColors.push(calculator.getSphereColor(sphereId));
        }

        // Обновление данных
        this.radarChart.data.labels = labels;
        this.radarChart.data.datasets[0].data = values;
        this.radarChart.data.datasets[0].pointBackgroundColor = pointColors;
        this.radarChart.data.datasets[0].pointHoverBorderColor = pointColors;

        // Обновление цвета заливки в зависимости от общего индекса
        const totalIndex = calculator.totalIndex / 100;
        let fillColor = 'rgba(52, 152, 219, 0.2)';
        
        if (totalIndex >= THRESHOLDS.green) {
            fillColor = 'rgba(39, 174, 96, 0.2)';
        } else if (totalIndex >= THRESHOLDS.yellow) {
            fillColor = 'rgba(243, 156, 18, 0.2)';
        } else {
            fillColor = 'rgba(231, 76, 60, 0.2)';
        }
        
        this.radarChart.data.datasets[0].backgroundColor = fillColor;

        // Обновление графика
        this.radarChart.update('active');
    }

    // Инициализация графика трендов
    initTrendsChart(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Общий индекс',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: [],
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        min: 0,
                        ticks: {
                            stepSize: 10,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const value = context.raw;
                                let status = '';
                                
                                if (value >= THRESHOLDS.green * 100) {
                                    status = ' (хорошо)';
                                } else if (value >= THRESHOLDS.yellow * 100) {
                                    status = ' (нормально)';
                                } else {
                                    status = ' (требует внимания)';
                                }
                                
                                return `Индекс: ${value}%${status}`;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        return this.trendsChart;
    }

    // Обновление графика трендов
    updateTrends(snapshots) {
        if (!this.trendsChart || !snapshots || snapshots.length === 0) return;

        // Сортировка по дате
        const sortedSnapshots = snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Подготовка данных
        const labels = [];
        const values = [];
        const pointColors = [];

        for (const snapshot of sortedSnapshots) {
            const date = new Date(snapshot.date);
            const formattedDate = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
            labels.push(formattedDate);
            values.push(snapshot.totalIndex);

            // Цвет точки в зависимости от значения
            const value = snapshot.totalIndex;
            if (value >= THRESHOLDS.green * 100) {
                pointColors.push('#27ae60');
            } else if (value >= THRESHOLDS.yellow * 100) {
                pointColors.push('#f39c12');
            } else {
                pointColors.push('#e74c3c');
            }
        }

        // Обновление данных
        this.trendsChart.data.labels = labels;
        this.trendsChart.data.datasets[0].data = values;
        this.trendsChart.data.datasets[0].pointBackgroundColor = pointColors;

        // Обновление графика
        this.trendsChart.update('active');
    }

    // Уничтожение графиков
    destroy() {
        if (this.radarChart) {
            this.radarChart.destroy();
            this.radarChart = null;
        }
        
        if (this.trendsChart) {
            this.trendsChart.destroy();
            this.trendsChart = null;
        }
    }
}

// Глобальный экземпляр визуализации
const radarViz = new RadarVisualization();