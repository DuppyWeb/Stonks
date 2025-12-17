<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect fill='%231a1a2e' width='32' height='32' rx='4'/><polyline fill='none' stroke='%2300d26a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' points='4,22 10,18 14,20 18,12 22,14 28,6'/><circle fill='%2300d26a' cx='28' cy='6' r='2.5'/></svg>">
    <title>Crawl ID Tracker</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/date-fns@3.0.0/index.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        
        .controls {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        label {
            font-weight: 600;
            color: #555;
        }
        
        select {
            padding: 10px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 200px;
        }
        
        select:hover {
            border-color: #667eea;
        }
        
        select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .chart-wrapper {
            position: relative;
            height: 500px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .legend-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }
        
        .filter-island {
            background: white;
            padding: 16px 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .filter-island label {
            font-weight: 600;
            color: #555;
        }

        .filter-island .spacer {
            width: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🕷️ Crawl ID Tracker</h1>
<?php if (isset($_COOKIE['mode']) && $_COOKIE['mode'] == 'noSecrets'): ?>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <a href="viewer.html" style="padding: 8px 16px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">📋 View All Crawls</a>
                <a href="TPM.html" style="padding: 8px 16px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">🔍 Transparency Mode</a>
            </div>
<?php endif; ?>
            <div class="controls">
            </div>
        </div>
        
        <div class="chart-container">
            <h2>ID Presence Over Time</h2>
            <div class="chart-wrapper">
                <canvas id="idChart"></canvas>
            </div>
            <div class="legend-container" id="legendContainer"></div>
        </div>

        <div class="filter-island">
            <label for="siteSelector">Select Site:</label>
            <select id="siteSelector">
                <option value="">All Sites</option>
            </select>

            <span class="spacer"></span>

            <label for="timeFilter">Time Period:</label>
            <select id="timeFilter">
                <option value="">All Time</option>
                <option value="3h">Last 3 Hours</option>
                <option value="6h">Last 6 Hours</option>
                <option value="12h">Last 12 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="48h">Last 48 Hours</option>
                <option value="72h">Last 72 Hours</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>

            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="deltaMode" style="width: 18px; height: 18px; cursor: pointer;">
                <span>Show Delta</span>
            </label>
        </div>
        
        <div class="chart-container" id="valueChartsContainer" style="display: none;">
            <h2>ID Values Over Time</h2>
            <p style="color: #666; margin-bottom: 20px;">Showing individual charts for each ID type. Y-axis starts at lowest value - 5000.</p>
            <div id="valueChartsGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                <div class="value-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(255, 99, 132, 1);">Account ID</h3>
                    <div style="height: 300px;"><canvas id="accountIdChart"></canvas></div>
                </div>
                <div class="value-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(54, 162, 235, 1);">Order ID</h3>
                    <div style="height: 300px;"><canvas id="orderIdChart"></canvas></div>
                </div>
                <div class="value-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(255, 206, 86, 1);">Cart ID</h3>
                    <div style="height: 300px;"><canvas id="cartIdChart"></canvas></div>
                </div>
                <div class="value-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(75, 192, 192, 1);">Card ID</h3>
                    <div style="height: 300px;"><canvas id="cardIdChart"></canvas></div>
                </div>
                <div class="value-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(153, 102, 255, 1);">Address ID</h3>
                    <div style="height: 300px;"><canvas id="addressIdChart"></canvas></div>
                </div>
            </div>
        </div>

        <div class="chart-container" id="rateChartsContainer" style="display: none;">
            <h2>Rate of Change (Derivative)</h2>
            <p style="color: #666; margin-bottom: 20px;">Showing the rate of change between consecutive data points. Positive values indicate increasing IDs, negative values indicate decreasing.</p>
            <div id="rateChartsGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                <div class="rate-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(255, 99, 132, 1);">Account ID Rate</h3>
                    <div style="height: 300px;"><canvas id="accountIdRateChart"></canvas></div>
                </div>
                <div class="rate-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(54, 162, 235, 1);">Order ID Rate</h3>
                    <div style="height: 300px;"><canvas id="orderIdRateChart"></canvas></div>
                </div>
                <div class="rate-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(255, 206, 86, 1);">Cart ID Rate</h3>
                    <div style="height: 300px;"><canvas id="cartIdRateChart"></canvas></div>
                </div>
                <div class="rate-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(75, 192, 192, 1);">Card ID Rate</h3>
                    <div style="height: 300px;"><canvas id="cardIdRateChart"></canvas></div>
                </div>
                <div class="rate-chart-item">
                    <h3 style="margin-bottom: 10px; color: rgba(153, 102, 255, 1);">Address ID Rate</h3>
                    <div style="height: 300px;"><canvas id="addressIdRateChart"></canvas></div>
                </div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2>Statistics</h2>
            <div class="stats" id="statsContainer">
                <div class="loading">Loading statistics...</div>
            </div>
        </div>
    </div>

    <script>
        let chart = null;
        let valueCharts = {
            account_id: null,
            order_id: null,
            cart_id: null,
            card_id: null,
            address_id: null
        };
        let rateCharts = {
            account_id: null,
            order_id: null,
            cart_id: null,
            card_id: null,
            address_id: null
        };
        const colors = {
            account_id: 'rgba(255, 99, 132, 0.8)',
            order_id: 'rgba(54, 162, 235, 0.8)',
            cart_id: 'rgba(255, 206, 86, 0.8)',
            card_id: 'rgba(75, 192, 192, 0.8)',
            address_id: 'rgba(153, 102, 255, 0.8)'
        };
        
        const labels = {
            account_id: 'Account ID',
            order_id: 'Order ID (Numeric)',
            cart_id: 'Cart ID',
            card_id: 'Card ID',
            address_id: 'Address ID'
        };

        // Load sites on page load
        async function loadSites() {
            try {
                const response = await fetch('api.php?action=get_sites');
                const data = await response.json();
                
                const selector = document.getElementById('siteSelector');
                // Sites are already mapped by the API
                data.sites.forEach(site => {
                    const option = document.createElement('option');
                    option.value = site;
                    option.textContent = site;
                    selector.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading sites:', error);
            }
        }

        // Load and display chart data
        async function loadChartData(site = '') {
            try {
                const url = site ? `api.php?action=get_id_stats&site=${encodeURIComponent(site)}` : 'api.php?action=get_id_stats';
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                updateChart(data.stats);
                updateValueChart(data.stats, site);
                updateRateCharts(data.stats, site);
                updateStats(data.stats);
            } catch (error) {
                console.error('Error loading chart data:', error);
                document.getElementById('statsContainer').innerHTML = `
                    <div class="error">Error loading data: ${error.message}</div>
                `;
            }
        }

        function updateChart(stats) {
            const ctx = document.getElementById('idChart').getContext('2d');
            const idTypes = ['account_id', 'order_id', 'cart_id', 'card_id', 'address_id'];
            const timeFilter = document.getElementById('timeFilter') ? document.getElementById('timeFilter').value : '';
            const { start: rangeStart, end: rangeEnd, unit: rangeUnit } = getTimeRange(timeFilter, stats);

            if (!stats || stats.length === 0) {
                return;
            }
            
            // Helper: check if value is present (not null, not undefined, not empty string)
            function hasValue(val) {
                return val !== null && val !== undefined && val !== '';
            }

            // Helper: extract date (YYYY-MM-DD) from started_at
            function getDateKey(started_at) {
                if (!started_at) return null;
                const str = String(started_at);
                if (str.includes(' ')) return str.split(' ')[0];
                if (str.includes('T')) return str.split('T')[0];
                return str.substring(0, 10);
            }

            // Helper: extract hour key (YYYY-MM-DD HH:00) from started_at
            function getHourKey(started_at) {
                if (!started_at) return null;
                const d = new Date(started_at);
                if (isNaN(d.getTime())) return null;
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd} ${hh}:00`;
            }

            function formatDayKey(date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }

            function formatHourKey(date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                const hh = String(date.getHours()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd} ${hh}:00`;
            }

            const useHourlyGrouping = rangeUnit === 'hour';

            // Group by day: for each day, count how many records have each ID present
            const dayData = {};

            // Pre-fill buckets so the chart always spans the same start/end range as the other graphs
            const buckets = [];
            if (rangeStart && rangeEnd) {
                if (useHourlyGrouping) {
                    const cursor = new Date(rangeStart);
                    cursor.setMinutes(0, 0, 0);
                    const endBucket = new Date(rangeEnd);
                    endBucket.setMinutes(0, 0, 0);

                    while (cursor <= endBucket) {
                        buckets.push(formatHourKey(cursor));
                        cursor.setHours(cursor.getHours() + 1);
                    }
                } else {
                    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
                    const endBucket = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

                    while (cursor <= endBucket) {
                        buckets.push(formatDayKey(cursor));
                        cursor.setDate(cursor.getDate() + 1);
                    }
                }
            }

            buckets.forEach(bucket => {
                dayData[bucket] = {};
                idTypes.forEach(id => dayData[bucket][id] = 0);
            });

            stats.forEach(stat => {
                const bucket = useHourlyGrouping ? getHourKey(stat.started_at) : getDateKey(stat.started_at);
                if (!bucket) return;

                if (!dayData[bucket]) {
                    dayData[bucket] = {};
                    idTypes.forEach(id => dayData[bucket][id] = 0);
                }

                // Check each ID type - add 1 if value is present
                idTypes.forEach(idType => {
                    if (hasValue(stat[idType])) {
                        dayData[bucket][idType] += 1;
                    }
                });
            });
            
            // Sort buckets
            const sortedDays = buckets.length > 0 ? buckets : Object.keys(dayData).sort();
            
            // Build datasets for stacked bar chart
            const datasets = idTypes.map(idType => ({
                label: labels[idType],
                data: sortedDays.map(day => dayData[day][idType]),
                backgroundColor: colors[idType],
                borderColor: colors[idType].replace('0.8', '1'),
                borderWidth: 1
            }));
            
            // Destroy existing chart
            if (chart) {
                chart.destroy();
            }
            
            // Create stacked bar chart
            chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedDays,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'ID Presence Count'
                            }
                        }
                    }
                }
            });
            
            updateLegend();
        }

        function updateLegend() {
            const legendContainer = document.getElementById('legendContainer');
            legendContainer.innerHTML = '';
            
            const idTypes = ['account_id', 'order_id', 'cart_id', 'card_id', 'address_id'];
            idTypes.forEach(idType => {
                const item = document.createElement('div');
                item.className = 'legend-item';
                item.innerHTML = `
                    <div class="legend-color" style="background-color: ${colors[idType]}"></div>
                    <span>${labels[idType]}</span>
                `;
                legendContainer.appendChild(item);
            });
        }

        function updateValueChart(stats, site) {
            const container = document.getElementById('valueChartsContainer');
            
            // Destroy all existing charts
            Object.keys(valueCharts).forEach(key => {
                if (valueCharts[key]) {
                    valueCharts[key].destroy();
                    valueCharts[key] = null;
                }
            });
            
            // Hide if no site selected
            if (!site) {
                container.style.display = 'none';
                return;
            }
            
            container.style.display = 'block';
            
            // Helper to extract numeric ID from order_id like "ayro-594-357939080" => 357939080
            function extractOrderIdNumeric(orderId) {
                if (!orderId) return null;
                const parts = String(orderId).split('-');
                const lastPart = parts[parts.length - 1];
                const num = parseInt(lastPart);
                return isNaN(num) ? null : num;
            }
            
            // Chart config for each ID type
            const chartConfigs = [
                { id: 'account_id', canvasId: 'accountIdChart', field: 'account_id', label: 'Account ID' },
                { id: 'order_id', canvasId: 'orderIdChart', field: 'order_id', label: 'Order ID', parseFunc: extractOrderIdNumeric },
                { id: 'cart_id', canvasId: 'cartIdChart', field: 'cart_id', label: 'Cart ID' },
                { id: 'card_id', canvasId: 'cardIdChart', field: 'card_id', label: 'Card ID' },
                { id: 'address_id', canvasId: 'addressIdChart', field: 'address_id', label: 'Address ID' }
            ];
            
            // Check if delta mode is enabled
            const deltaMode = document.getElementById('deltaMode').checked;

            const timeFilter = document.getElementById('timeFilter') ? document.getElementById('timeFilter').value : '';
            const useHourlyUnit = ['3h', '6h', '12h', '24h', '48h', '72h'].includes(timeFilter);
            const { start: rangeStart, end: rangeEnd } = getTimeRange(timeFilter, stats);
            
            chartConfigs.forEach(config => {
                const ctx = document.getElementById(config.canvasId).getContext('2d');
                
                // Extract data points
                let dataPoints = stats
                    .filter(s => s[config.field] !== null && s[config.field] !== undefined && s[config.field] !== '')
                    .map(s => ({
                        x: new Date(s.started_at),
                        y: config.parseFunc ? config.parseFunc(s[config.field]) : Number(s[config.field])
                    }))
                    .filter(d => d.y !== null && !isNaN(d.y))
                    .sort((a, b) => a.x - b.x); // Sort by date
                
                // Apply delta mode if enabled
                let firstValue = 0;
                if (deltaMode && dataPoints.length > 0) {
                    firstValue = dataPoints[0].y;
                    dataPoints = dataPoints.map(d => ({
                        x: d.x,
                        y: d.y - firstValue
                    }));
                }
                
                // Find min value for y-axis
                let minY = 0;
                if (dataPoints.length > 0) {
                    if (deltaMode) {
                        minY = Math.min(...dataPoints.map(d => d.y));
                    } else {
                        minY = Math.min(...dataPoints.map(d => d.y)) - 5000;
                    }
                }
                
                valueCharts[config.id] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: [{
                            label: config.label,
                            data: dataPoints,
                            borderColor: colors[config.id],
                            backgroundColor: colors[config.id],
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: false,
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return config.label + ': ' + context.parsed.y.toLocaleString();
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: useHourlyUnit ? 'hour' : 'day',
                                    displayFormats: useHourlyUnit ? { hour: 'MMM dd HH:mm' } : { day: 'MMM dd' }
                                },
                                min: rangeStart ? rangeStart : undefined,
                                max: rangeEnd ? rangeEnd : undefined,
                                title: { display: true, text: 'Date' }
                            },
                            y: {
                                min: minY,
                                title: { display: true, text: 'Value' }
                            }
                        }
                    }
                });
            });
        }

        function updateRateCharts(stats, site) {
            const container = document.getElementById('rateChartsContainer');
            
            // Destroy all existing rate charts
            Object.keys(rateCharts).forEach(key => {
                if (rateCharts[key]) {
                    rateCharts[key].destroy();
                    rateCharts[key] = null;
                }
            });
            
            // Hide if no site selected
            if (!site) {
                container.style.display = 'none';
                return;
            }
            
            container.style.display = 'block';
            
            // Helper to extract numeric ID from order_id like "ayro-594-357939080" => 357939080
            function extractOrderIdNumeric(orderId) {
                if (!orderId) return null;
                const parts = String(orderId).split('-');
                const lastPart = parts[parts.length - 1];
                const num = parseInt(lastPart);
                return isNaN(num) ? null : num;
            }
            
            // Chart config for each ID type
            const chartConfigs = [
                { id: 'account_id', canvasId: 'accountIdRateChart', field: 'account_id', label: 'Account ID Rate' },
                { id: 'order_id', canvasId: 'orderIdRateChart', field: 'order_id', label: 'Order ID Rate', parseFunc: extractOrderIdNumeric },
                { id: 'cart_id', canvasId: 'cartIdRateChart', field: 'cart_id', label: 'Cart ID Rate' },
                { id: 'card_id', canvasId: 'cardIdRateChart', field: 'card_id', label: 'Card ID Rate' },
                { id: 'address_id', canvasId: 'addressIdRateChart', field: 'address_id', label: 'Address ID Rate' }
            ];

            const timeFilter = document.getElementById('timeFilter') ? document.getElementById('timeFilter').value : '';
            const useHourlyUnit = ['3h', '6h', '12h', '24h', '48h', '72h'].includes(timeFilter);
            const { start: rangeStart, end: rangeEnd } = getTimeRange(timeFilter, stats);
            
            chartConfigs.forEach(config => {
                const ctx = document.getElementById(config.canvasId).getContext('2d');
                
                // Extract data points with valid values, sorted by time
                let dataPoints = stats
                    .filter(s => s[config.field] !== null && s[config.field] !== undefined && s[config.field] !== '')
                    .map(s => ({
                        x: new Date(s.started_at),
                        y: config.parseFunc ? config.parseFunc(s[config.field]) : Number(s[config.field])
                    }))
                    .filter(p => !isNaN(p.y) && p.y !== null)
                    .sort((a, b) => a.x - b.x);
                
                // Calculate rate of change (derivative) between consecutive points
                let rateDataPoints = [];
                for (let i = 1; i < dataPoints.length; i++) {
                    const timeDiffHours = (dataPoints[i].x - dataPoints[i-1].x) / (1000 * 60 * 60);
                    if (timeDiffHours > 0) {
                        const valueDiff = dataPoints[i].y - dataPoints[i-1].y;
                        const rate = valueDiff / timeDiffHours; // Change per hour
                        rateDataPoints.push({
                            x: dataPoints[i].x,
                            y: Math.round(rate * 100) / 100 // Round to 2 decimal places
                        });
                    }
                }
                
                // Create rate chart
                rateCharts[config.id] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: [{
                            label: config.label,
                            data: rateDataPoints,
                            borderColor: colors[config.id],
                            backgroundColor: colors[config.id].replace('0.8', '0.2'),
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            fill: true,
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const rate = context.parsed.y;
                                        const sign = rate >= 0 ? '+' : '';
                                        return config.label + ': ' + sign + rate.toLocaleString() + '/hour';
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: useHourlyUnit ? 'hour' : 'day',
                                    displayFormats: useHourlyUnit ? { hour: 'MMM dd HH:mm' } : { day: 'MMM dd' }
                                },
                                min: rangeStart ? rangeStart : undefined,
                                max: rangeEnd ? rangeEnd : undefined,
                                title: { display: true, text: 'Date' }
                            },
                            y: {
                                title: { display: true, text: 'Change per Hour' }
                            }
                        }
                    }
                });
            });
        }

        function updateStats(stats) {
            const statsContainer = document.getElementById('statsContainer');
            
            // Calculate statistics
            const totalCrawls = stats.length;
            const idTypes = ['account_id', 'order_id', 'cart_id', 'card_id', 'address_id'];
            
            let html = `
                <div class="stat-card">
                    <div class="stat-value">${totalCrawls}</div>
                    <div class="stat-label">Total Crawls</div>
                </div>
            `;
            
            idTypes.forEach(idType => {
                const hasField = `has_${idType}`;
                const count = stats.filter(s => s[hasField] === 1).length;
                const percentage = totalCrawls > 0 ? Math.round((count / totalCrawls) * 100) : 0;
                
                html += `
                    <div class="stat-card" style="background: ${colors[idType]}">
                        <div class="stat-value">${count}</div>
                        <div class="stat-label">${labels[idType]} (${percentage}%)</div>
                    </div>
                `;
            });
            
            statsContainer.innerHTML = html;
        }

        // Store current stats for re-rendering
        let currentStats = [];
        let currentSite = '';

        function getTimeRange(timeFilter, stats) {
            const now = new Date();
            let start = null;
            let end = now;

            if (!timeFilter) {
                if (stats && stats.length > 0) {
                    const times = stats
                        .map(s => new Date(s.started_at))
                        .filter(d => !isNaN(d.getTime()))
                        .map(d => d.getTime());

                    if (times.length > 0) {
                        start = new Date(Math.min(...times));
                        end = new Date(Math.max(...times));
                    }
                }

                return { start, end, unit: 'day' };
            }

            switch (timeFilter) {
                case '3h':
                    start = new Date(now.getTime() - 3 * 60 * 60 * 1000);
                    break;
                case '6h':
                    start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    break;
                case '12h':
                    start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                    break;
                case '24h':
                    start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '48h':
                    start = new Date(now.getTime() - 48 * 60 * 60 * 1000);
                    break;
                case '72h':
                    start = new Date(now.getTime() - 72 * 60 * 60 * 1000);
                    break;
                case 'today':
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    const dayOfWeek = now.getDay();
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                    break;
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    start = null;
                    break;
            }

            const unit = ['3h', '6h', '12h', '24h', '48h', '72h'].includes(timeFilter) ? 'hour' : 'day';
            if (start && unit === 'day') {
                start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            }

            return { start, end, unit };
        }
        
        // Filter stats by time period
        function filterStatsByTime(stats, timeFilter) {
            if (!timeFilter || !stats || stats.length === 0) {
                return stats;
            }
            
            const now = new Date();
            let cutoffDate;
            
            switch (timeFilter) {
                case '3h':
                    cutoffDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
                    break;
                case '6h':
                    cutoffDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    break;
                case '12h':
                    cutoffDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                    break;
                case '24h':
                    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '48h':
                    cutoffDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
                    break;
                case '72h':
                    cutoffDate = new Date(now.getTime() - 72 * 60 * 60 * 1000);
                    break;
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    const dayOfWeek = now.getDay();
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    return stats;
            }
            
            return stats.filter(stat => {
                const statDate = new Date(stat.started_at);
                return statDate >= cutoffDate;
            });
        }
        
        // Get filtered stats based on current time filter
        function getFilteredStats() {
            const timeFilter = document.getElementById('timeFilter').value;
            return filterStatsByTime(currentStats, timeFilter);
        }
        
        // Re-render all charts with current filters
        function renderAllCharts() {
            const filteredStats = getFilteredStats();
            updateChart(filteredStats);
            updateValueChart(filteredStats, currentSite);
            updateRateCharts(filteredStats, currentSite);
            updateStats(filteredStats);
        }
        
        // Load data from API
        async function loadChartDataWrapper(site = '') {
            currentSite = site;
            try {
                const url = site ? `api.php?action=get_id_stats&site=${encodeURIComponent(site)}` : 'api.php?action=get_id_stats';
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                currentStats = data.stats;
                renderAllCharts();
            } catch (error) {
                console.error('Error loading chart data:', error);
                document.getElementById('statsContainer').innerHTML = `
                    <div class="error">Error loading data: ${error.message}</div>
                `;
            }
        }
        
        // Event listeners
        document.getElementById('siteSelector').addEventListener('change', (e) => {
            loadChartDataWrapper(e.target.value);
        });
        
        document.getElementById('timeFilter').addEventListener('change', () => {
            renderAllCharts();
        });
        
        document.getElementById('deltaMode').addEventListener('change', () => {
            if (currentSite) {
                updateValueChart(getFilteredStats(), currentSite);
                updateRateCharts(getFilteredStats(), currentSite);
            }
        });

        // Initialize
        loadSites();
        loadChartDataWrapper();
    </script>
</body>
</html>
