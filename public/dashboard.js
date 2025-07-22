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
      traffic: document.getElementById("traffic-chart").getContext("2d"),
      intervalSelector: document.getElementById("chart-interval-selector"),
    },
  };

  // --- State ---
  let trafficChart;
  let chartIntervalSeconds = 60; // Default to 1 minute

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
          pointRadius: 0,
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
    trafficChart = new Chart(elements.charts.traffic, chartConfig);
  }

  function updateStatus(isConnected, text) {
    elements.status.text.textContent = text;
    const light = elements.status.light;
    light.className = "w-3 h-3 rounded-full"; // Reset
    if (isConnected) {
      light.classList.add("bg-green-500");
    } else {
      light.classList.add("bg-yellow-500", "animate-pulse");
    }
  }

  function updateRealtimeData(status) {
    if (!status || !status.system || !status.traffic) return;

    const healthStatus = status.system.status;
    const light = elements.status.light;
    if (healthStatus === "healthy") {
      light.className = "w-3 h-3 rounded-full bg-green-500";
    } else if (healthStatus === "warning" || healthStatus === "critical") {
      light.className = "w-3 h-3 rounded-full bg-red-500 animate-pulse";
    }

    elements.metrics.health.innerHTML = `
        <p><strong>Status:</strong> <span class="font-bold ${healthStatus === "healthy" ? "text-green-400" : "text-red-400"}">${healthStatus}</span></p>
        <p><strong>Uptime:</strong> ${Math.round(status.system.uptime)}s</p>
        <p><strong>Memory:</strong> ${status.system.memory.heapUsed} MB / ${status.system.memory.heapTotal} MB</p>
    `;

    elements.metrics.rps.textContent = status.traffic.requestsPerSecond;
    elements.metrics.avgResponse.textContent = `${status.traffic.averageResponseTime}ms`;
    elements.metrics.errorRate.textContent = `${(status.traffic.errorRate * 100).toFixed(2)}%`;

    const now = new Date();
    const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    trafficChart.data.labels.push(timeLabel);
    trafficChart.data.datasets[0].data.push(status.traffic.requestsPerSecond);

    // Data is pushed every 2 seconds, so max data points = interval / 2
    const maxDataPoints = chartIntervalSeconds / 2;
    if (trafficChart.data.labels.length > maxDataPoints) {
      trafficChart.data.labels.shift();
      trafficChart.data.datasets[0].data.shift();
    }
    trafficChart.update();
  }

  function updateLists(stats, blocklist) {
    if (stats && stats.patterns) {
      updateTopList(elements.lists.topEndpoints, stats.patterns.topEndpoints);
      updateTopList(elements.lists.topIps, stats.patterns.topIPs);
    }
    if (blocklist) {
      updateBlocklist(blocklist.blocklist);
    }
  }

  function updateTopList(element, data) {
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

  function updateBlocklist(blockedIPs) {
    elements.lists.blocklist.innerHTML = "";
    if (!blockedIPs || blockedIPs.length === 0) {
      elements.lists.blocklist.innerHTML =
        '<li class="text-center text-gray-500">No IPs are currently blocked.</li>';
      return;
    }
    blockedIPs.forEach((ip) => {
      const li = document.createElement("li");
      li.innerHTML = `
          <span class="font-mono">${ip}</span>
          <button data-ip="${ip}" class="unblock-btn bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1 px-2 rounded transition-colors">Unblock</button>
      `;
      elements.lists.blocklist.appendChild(li);
    });
  }

  async function fetchStaticData() {
    try {
      const [statsRes, blocklistRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/blocklist"),
      ]);
      if (!statsRes.ok || !blocklistRes.ok)
        throw new Error("Failed to fetch static data");
      const statsData = await statsRes.json();
      const blocklistData = await blocklistRes.json();
      updateLists(statsData.data, blocklistData.data);
    } catch (error) {
      console.error(error.message);
    }
  }

  async function blockIp(ip) {
    try {
      await fetch("/api/blocklist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      fetchStaticData();
    } catch (error) {
      console.error("Failed to block IP:", error);
    }
  }

  async function unblockIp(ip) {
    try {
      await fetch("/api/blocklist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      fetchStaticData();
    } catch (error) {
      console.error("Failed to unblock IP:", error);
    }
  }

  // --- Event Listeners ---
  elements.forms.blocklist.addEventListener("submit", (e) => {
    e.preventDefault();
    const ip = elements.forms.ipInput.value.trim();
    if (ip) {
      blockIp(ip);
      elements.forms.ipInput.value = "";
    }
  });

  elements.lists.blocklist.addEventListener("click", (e) => {
    if (e.target.classList.contains("unblock-btn")) {
      unblockIp(e.target.dataset.ip);
    }
  });

  elements.charts.intervalSelector.addEventListener("click", (e) => {
    if (e.target.classList.contains("interval-btn")) {
      chartIntervalSeconds = parseInt(e.target.dataset.interval, 10);

      // Update active button style
      document
        .querySelectorAll(".interval-btn")
        .forEach((btn) => btn.classList.remove("active-interval"));
      e.target.classList.add("active-interval");

      // Clear chart data on interval change
      trafficChart.data.labels = [];
      trafficChart.data.datasets[0].data = [];
      trafficChart.update();
    }
  });

  // --- WebSocket Connection ---
  function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
      console.log("WebSocket connection established");
      updateStatus(true, "Live");
      fetchStaticData();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "stats") {
          updateRealtimeData(data.payload);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    socket.onclose = () => {
      updateStatus(false, "Reconnecting...");
      setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      updateStatus(false, "Error");
      socket.close();
    };
  }

  // --- Initialization ---
  initializeChart();
  connectWebSocket();
  setInterval(fetchStaticData, 30000);
});
