/* ========================================================
   Soni's Sales Analytics Dashboard - Vibrant Chart.js Engine
   ======================================================== */

let lineChartInstance = null;
let barChartInstance = null;
let doughnutChartInstance = null;
let areaChartInstance = null;
let pendingChartInstance = null;

// Dynamic theme-aware tooltip & text configuration
function getTooltipColors() {
    const isLight = document.body.classList.contains('light-mode');
    return {
        bg: isLight ? '#ffffff' : '#0c1222',
        title: isLight ? '#4f46e5' : '#c084fc',
        body: isLight ? '#0f172a' : '#ffffff',
        border: isLight ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.6)',
        textMuted: isLight ? '#64748b' : '#94a3b8',
        gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.07)'
    };
}

// 1. Real-Time Revenue Timeline (Line Chart with Electric Multi-stop Gradient)
function renderLineChart(labels, values) {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    if (lineChartInstance) lineChartInstance.destroy();
    const colors = getTooltipColors();

    const defaultTimeline = ['Aug 6 09:00 AM', 'Aug 6 11:00 AM', 'Aug 6 01:00 PM', 'Aug 6 03:15 PM', 'Aug 6 05:00 PM', 'Aug 6 07:00 PM', 'Aug 6 09:00 PM'];
    const defaultRevenues = [405000, 415000, 422000, 431100, 438000, 445000, 455000];

    const chartLabels = (labels && labels.length >= 2) ? labels : defaultTimeline;
    const chartValues = (values && values.length >= 2) ? values : defaultRevenues;

    const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    grad.addColorStop(0.5, 'rgba(217, 70, 239, 0.15)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Revenue Timeline (₹)',
                data: chartValues,
                borderColor: '#8b5cf6',
                borderWidth: 3.5,
                backgroundColor: grad,
                fill: true,
                tension: 0.38,
                pointBackgroundColor: '#d946ef',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#8b5cf6',
                pointRadius: 6,
                pointHoverRadius: 9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                    titleColor: colors.title,
                    titleFont: { weight: 'bold', size: 12 },
                    bodyColor: colors.body,
                    bodyFont: { weight: 'bold', size: 13 },
                    padding: 14,
                    displayColors: false,
                    callbacks: { label: ctx => ` Revenue: ₹${Number(ctx.parsed.y).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
                }
            },
            scales: {
                x: { grid: { color: colors.gridColor }, ticks: { color: colors.textMuted, font: { size: 11.5, weight: '700' } } },
                y: { grid: { color: colors.gridColor }, ticks: { color: colors.textMuted, font: { size: 11.5 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') } }
            }
        }
    });
}

// 2. Category Breakdown (Doughnut Chart with Neon Arc Colors)
function renderDoughnutChart(labels, values) {
    const ctx = document.getElementById('doughnutChart');
    if (!ctx) return;

    if (doughnutChartInstance) doughnutChartInstance.destroy();
    const colors = getTooltipColors();

    const chartLabels = (labels && labels.length > 0) ? labels : ['General', 'Metropolitan', 'Cultural', 'Nature'];
    const chartValues = (values && values.length > 0) ? values : [431100.16, 215000, 185000, 120000];

    doughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartValues,
                backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: colors.textMuted, boxWidth: 12, padding: 18, font: { size: 12, weight: '700' } } },
                tooltip: {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                    titleColor: colors.title,
                    titleFont: { weight: 'bold', size: 12 },
                    bodyColor: colors.body,
                    bodyFont: { weight: 'bold', size: 13 },
                    padding: 14,
                    callbacks: { label: ctx => ` ${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
                }
            },
            cutout: '74%'
        }
    });
}

// 3. Sales by Destination (Bar Chart with Neon Gradients)
function renderBarChart(labels, values) {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    if (barChartInstance) barChartInstance.destroy();
    const colors = getTooltipColors();

    const cleanLabels = (labels && labels.length > 0) ? labels.slice(0, 6) : ['Tokyo', 'New York', 'Dubai', 'Paris', 'Sydney', 'Swiss Alps'];
    const cleanValues = (values && values.length > 0) ? values.slice(0, 6) : [142500, 128400, 115200, 98600, 89100, 76400];

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cleanLabels,
            datasets: [{
                label: 'Sales Amount (₹)',
                data: cleanValues,
                backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#d946ef', '#f59e0b', '#f43f5e'],
                borderRadius: 10,
                maxBarThickness: 44
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                    titleColor: colors.title,
                    bodyColor: colors.body,
                    padding: 14,
                    callbacks: { label: ctx => ` Sales: ₹${Number(ctx.parsed.y).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: colors.textMuted, font: { size: 11.5, weight: '700' } } },
                y: { grid: { color: colors.gridColor }, ticks: { color: colors.textMuted, font: { size: 11.5 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') } }
            }
        }
    });
}

// 4. Daily Sales Performance (Emerald Area Chart)
function renderAreaChart(labels, values) {
    const ctx = document.getElementById('areaChart');
    if (!ctx) return;

    if (areaChartInstance) areaChartInstance.destroy();
    const colors = getTooltipColors();

    const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const defaultDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const defaultDaily = [14200, 18500, 22100, 19800, 28400, 34000, 29500];

    areaChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels && labels.length > 0 ? labels : defaultDays,
            datasets: [{
                label: 'Daily Sales (₹)',
                data: values && values.length > 0 ? values : defaultDaily,
                borderColor: '#10b981',
                borderWidth: 3.5,
                backgroundColor: grad,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#34d399',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                    titleColor: colors.title,
                    bodyColor: colors.body,
                    padding: 14,
                    callbacks: { label: ctx => ` Sales: ₹${Number(ctx.parsed.y).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
                }
            },
            scales: {
                x: { grid: { color: colors.gridColor }, ticks: { color: colors.textMuted, font: { size: 11.5, weight: '700' } } },
                y: { grid: { color: colors.gridColor }, ticks: { color: colors.textMuted, font: { size: 11.5 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') } }
            }
        }
    });
}

// 5. Pending vs Completed Orders (Doughnut Chart)
function renderPendingChart(pendingCount = 15, completedCount = 85) {
    const ctx = document.getElementById('pendingChart');
    if (!ctx) return;

    if (pendingChartInstance) pendingChartInstance.destroy();
    const colors = getTooltipColors();

    pendingChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed Orders', 'Pending Orders'],
            datasets: [{
                data: [completedCount, pendingCount],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: colors.textMuted, boxWidth: 12, padding: 16, font: { size: 11.5, weight: '700' } } },
                tooltip: {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                    titleColor: colors.title,
                    bodyColor: colors.body,
                    padding: 14,
                    callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} Orders` }
                }
            },
            cutout: '70%'
        }
    });
}

// Refresh all charts on theme toggle or sidebar collapse
function updateChartsTheme() {
    if (lineChartInstance) { lineChartInstance.resize(); lineChartInstance.update(); }
    if (barChartInstance) { barChartInstance.resize(); barChartInstance.update(); }
    if (doughnutChartInstance) { doughnutChartInstance.resize(); doughnutChartInstance.update(); }
    if (areaChartInstance) { areaChartInstance.resize(); areaChartInstance.update(); }
    if (pendingChartInstance) { pendingChartInstance.resize(); pendingChartInstance.update(); }
}
