document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const elements = {
    status: {
      light: document.getElementById("status-light"),
      text: document.getElementById("status-text"),
    },
    metrics: {
      health: document.getElementById("health-metrics"),
      rps: document.getElementById("rps-metric"),
      avgResponse: document.getElementById("avg-response-metric"),
      errorRate: document.getElementById("error-rate-metric"),
    },
    lists: {
      topEndpoints: document.getElementById("top-endpoints"),
      topIps: document.getElementById("top-ips"),
      blocklist: document.getElementById("blocklist"),
    },
    forms: {
      blocklist: document.getElementById("blocklist-form"),
      ipInput: document.getElementById("ip-input"),
    },
    charts: {
      traffic: document.getElementById("traffic-chart")?.getContext("2d"),
      intervalSelector: document.getElementById("chart-interval-selector"),
    },
  };

  // --- State ---
  let trafficChart;
  let chartIntervalSeconds = 60; // Default to 1 minute
  let websocket;

  // --- Chart Configuration ---
  const chartConfig = {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Requests per Second",
          data: [],
          borderColor: "rgb(56, 189, 248)",
          backgroundColor: "rgba(56, 189, 248, 0.2)",
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
        {
          label: "CPU Usage %",
          data: [],
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
        {
          label: "Memory Usage %",
          data: [],
          borderColor: "rgb(249, 115, 22)",
          backgroundColor: "rgba(249, 115, 22, 0.2)",
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "#9ca3af",
            maxRotation: 0,
            minRotation: 0,
            callback: function (value, index, values) {
              return index % 5 === 0 ? this.getLabelForValue(value) : "";
            },
          },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255, 255, 255, 0.1)" },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
          },
        },
      },
    },
  };

  // --- Functions ---

  function initializeChart() {
    if (elements.charts.traffic) {
      trafficChart = new Chart(elements.charts.traffic, chartConfig);
    }
  }

  function updateStatus(isConnected, text) {
    if (elements.status.text) {
      elements.status.text.textContent = text;
    }
    const light = elements.status.light;
    if (light) {
      light.className = "w-3 h-3 rounded-full"; // Reset
      if (isConnected) {
        light.classList.add("bg-green-500");
      } else {
        light.classList.add("bg-yellow-500", "animate-pulse");
      }
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function updateRealtimeData(metricsData) {
    if (!metricsData) return;

    try {
      // Update system health status
      const healthStatus = metricsData.health?.status || 'unknown';
      const light = elements.status.light;
      if (light) {
        if (healthStatus === "healthy") {
          light.className = "w-3 h-3 rounded-full bg-green-500";
        } else if (healthStatus === "warning" || healthStatus === "critical") {
          light.className = "w-3 h-3 rounded-full bg-red-500 animate-pulse";
        } else {
          light.className = "w-3 h-3 rounded-full bg-yellow-500";
        }
      }

      // Update health metrics
      if (elements.metrics.health && metricsData.system) {
        const system = metricsData.system;
        const memory = system.memory?.system || system.memory;
        const cpu = system.cpu || {};
        
        elements.metrics.health.innerHTML = `
          <p><strong>Status:</strong> <span class="font-bold ${healthStatus === "healthy" ? "text-green-400" : "text-red-400"}">${healthStatus}</span></p>
          <p><strong>CPU:</strong> ${cpu.overall ? cpu.overall.toFixed(1) : 'N/A'}%</p>
          <p><strong>Memory:</strong> ${memory ? (memory.usagePercent ? memory.usagePercent.toFixed(1) : ((memory.used / memory.total) * 100).toFixed(1)) : 'N/A'}%</p>
          <p><strong>Load:</strong> ${system.load?.load1 ? system.load.load1.toFixed(2) : 'N/A'}</p>
        `;
      }

      // Get current traffic stats
      fetchTrafficStats();

      // Update chart with real-time data
      if (trafficChart) {
        const now = new Date();
        const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        trafficChart.data.labels.push(timeLabel);
        
        // Add data points
        const rps = getCurrentRPS();
        const cpuUsage = metricsData.system?.cpu?.overall || 0;
        const memoryUsage = metricsData.system?.memory?.system?.usagePercent || 
                          (metricsData.system?.memory?.system ? 
                           (metricsData.system.memory.system.used / metricsData.system.memory.system.total) * 100 : 0);

        trafficChart.data.datasets[0].data.push(rps);
        trafficChart.data.datasets[1].data.push(cpuUsage);
        trafficChart.data.datasets[2].data.push(memoryUsage);

        // Keep only last 30 data points
        const maxDataPoints = 30;
        if (trafficChart.data.labels.length > maxDataPoints) {
          trafficChart.data.labels.shift();
          trafficChart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        trafficChart.update('none');
      }

    } catch (error) {
      console.error('Error updating realtime data:', error);
    }
  }

  let currentRPS = 0;
  function getCurrentRPS() {
    return currentRPS;
  }

  async function fetchTrafficStats() {
    try {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch traffic stats");
      
      const data = await response.json();
      const stats = data.data?.stats || {};
      
      // Update metrics display
      if (elements.metrics.rps) {
        elements.metrics.rps.textContent = stats.requestsPerSecond || 0;
        currentRPS = stats.requestsPerSecond || 0;
      }
      if (elements.metrics.avgResponse) {
        elements.metrics.avgResponse.textContent = `${stats.averageResponseTime || 0}ms`;
      }
      if (elements.metrics.errorRate) {
        const errorRate = ((stats.errorRate || 0) * 100).toFixed(2);
        elements.metrics.errorRate.textContent = `${errorRate}%`;
      }

      // Update lists
      updateLists(data.data);

    } catch (error) {
      console.error('Error fetching traffic stats:', error);
    }
  }

  function updateLists(data) {
    if (data && data.patterns) {
      updateTopList(elements.lists.topEndpoints, data.patterns.topEndpoints);
      updateTopList(elements.lists.topIps, data.patterns.topIPs);
    }
  }

  function updateTopList(element, data) {
    if (!element) return;
    
    element.innerHTML = "";
    if (!data || Object.keys(data).length === 0) {
      element.innerHTML = '<li class="text-gray-500">No data available.</li>';
      return;
    }
    const sortedData = Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    sortedData.forEach(([key, value]) => {
      const li = document.createElement("li");
      li.className = "flex justify-between items-center text-sm";
      li.innerHTML = `<span>${key}</span><span class="font-bold text-cyan-400">${value}</span>`;
      element.appendChild(li);
    });
  }

  async function fetchMetrics() {
    try {
      const response = await fetch("/api/enterprise/metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      
      const data = await response.json();
      updateRealtimeData(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      updateStatus(false, "Connection Error");
    }
  }

  // --- WebSocket Connection ---
  function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
      websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        updateStatus(true, "Connected");
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metrics') {
            updateRealtimeData(data.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus(false, "Disconnected");
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus(false, "Connection Error");
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      // Fallback to polling
      startPolling();
    }
  }

  function startPolling() {
    updateStatus(false, "Polling Mode");
    
    // Fetch initial data
    fetchMetrics();
    fetchTrafficStats();
    
    // Poll every 2 seconds
    setInterval(() => {
      fetchMetrics();
      fetchTrafficStats();
    }, 2000);
  }

  // --- Event Listeners ---
  if (elements.charts.intervalSelector) {
    elements.charts.intervalSelector.addEventListener("change", (e) => {
      chartIntervalSeconds = parseInt(e.target.value);
      // Clear chart data when interval changes
      if (trafficChart) {
        trafficChart.data.labels = [];
        trafficChart.data.datasets.forEach(dataset => dataset.data = []);
        trafficChart.update();
      }
    });
  }

  // --- Initialization ---
  console.log('Initializing DAASR Enterprise Dashboard...');
  
  // Initialize chart
  initializeChart();
  
  // Try WebSocket connection first, fallback to polling
  if (typeof WebSocket !== 'undefined') {
    initializeWebSocket();
  } else {
    startPolling();
  }
  
  console.log('Dashboard initialized successfully');
});