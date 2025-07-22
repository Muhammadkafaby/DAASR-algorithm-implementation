document.addEventListener("DOMContentLoaded", () => {
  const statusLight = document.getElementById("status-light");
  const statusText = document.getElementById("status-text");
  const healthMetrics = document.getElementById("health-metrics");
  const topEndpoints = document.getElementById("top-endpoints");
  const topIps = document.getElementById("top-ips");
  const blocklistForm = document.getElementById("blocklist-form");
  const ipInput = document.getElementById("ip-input");
  const blocklist = document.getElementById("blocklist");

  const trafficChartCtx = document
    .getElementById("traffic-chart")
    .getContext("2d");
  const historicalTrafficChartCtx = document
    .getElementById("historical-traffic-chart")
    .getContext("2d");
  let trafficChart, historicalTrafficChart;

  function initializeChart() {
    trafficChart = new Chart(trafficChartCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Requests per Second",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Time",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "RPS",
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  async function fetchData() {
    try {
      const response = await fetch("/api/status");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { data } = await response.json();
      updateDashboard(data);
      updateStatus(true, "Connected");
    } catch (error) {
      console.error("Failed to fetch data:", error);
      updateStatus(false, "Disconnected");
    }
  }

  function updateDashboard(data) {
    // Update health metrics
    healthMetrics.innerHTML = `
            <p><strong>Status:</strong> ${data.system.status}</p>
            <p><strong>Uptime:</strong> ${Math.round(data.system.uptime)}s</p>
            <p><strong>Memory:</strong> ${data.system.memory.heapUsed} MB / ${data.system.memory.heapTotal} MB</p>
            <p><strong>RPS:</strong> ${data.traffic.requestsPerSecond}</p>
            <p><strong>Avg. Response:</strong> ${data.traffic.averageResponseTime}ms</p>
            <p><strong>Error Rate:</strong> ${(data.traffic.errorRate * 100).toFixed(2)}%</p>
        `;

    // Update status indicator
    statusLight.className = "status-light"; // Reset
    if (data.system.status === "healthy") {
      statusLight.classList.add("healthy");
    } else if (data.system.status === "warning") {
      statusLight.classList.add("warning");
    }

    // Update traffic chart
    const now = new Date();
    const timeLabel = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    trafficChart.data.labels.push(timeLabel);
    trafficChart.data.datasets[0].data.push(data.traffic.requestsPerSecond);

    if (trafficChart.data.labels.length > 30) {
      trafficChart.data.labels.shift();
      trafficChart.data.datasets[0].data.shift();
    }
    trafficChart.update();

    // Fetch and update top endpoints and IPs
    fetchTopData();
    fetchBlocklist();
    fetchHistoricalData();
  }

  async function fetchTopData() {
    try {
      const response = await fetch("/api/stats");
      const { data } = await response.json();

      // Update top endpoints
      updateList(topEndpoints, data.patterns.topEndpoints);

      // Update top IPs
      updateList(topIps, data.patterns.topIPs);
    } catch (error) {
      console.error("Failed to fetch top data:", error);
    }
  }

  function updateList(element, data) {
    element.innerHTML = "";
    const sortedData = Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    sortedData.forEach(([key, value]) => {
      const li = document.createElement("li");
      li.textContent = `${key}: ${value} requests`;
      element.appendChild(li);
    });
  }

  function updateStatus(isConnected, text) {
    statusText.textContent = text;
    if (isConnected) {
      statusLight.classList.remove("warning");
      statusLight.classList.add("healthy");
    } else {
      statusLight.classList.remove("healthy");
      statusLight.classList.add("warning");
    }
  }

  async function fetchBlocklist() {
    try {
      const response = await fetch("/api/blocklist");
      const { data } = await response.json();
      updateBlocklist(data.blocklist);
    } catch (error) {
      console.error("Failed to fetch blocklist:", error);
    }
  }

  function updateBlocklist(blockedIPs) {
    blocklist.innerHTML = "";
    blockedIPs.forEach((ip) => {
      const li = document.createElement("li");
      li.textContent = ip;
      const removeButton = document.createElement("button");
      removeButton.textContent = "Unblock";
      removeButton.onclick = () => unblockIp(ip);
      li.appendChild(removeButton);
      blocklist.appendChild(li);
    });
  }

  async function blockIp(ip) {
    try {
      await fetch("/api/blocklist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      fetchBlocklist();
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
      fetchBlocklist();
    } catch (error) {
      console.error("Failed to unblock IP:", error);
    }
  }

  blocklistForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const ip = ipInput.value.trim();
    if (ip) {
      blockIp(ip);
      ipInput.value = "";
    }
  });

  async function fetchHistoricalData() {
    try {
      const response = await fetch("/api/history?minutes=60");
      const { data } = await response.json();
      updateHistoricalChart(data.history);
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
    }
  }

  function updateHistoricalChart(history) {
    if (historicalTrafficChart) {
      historicalTrafficChart.destroy();
    }

    const labels = [];
    const requestsData = [];
    const errorsData = [];

    const sixtyMinutesAgo = Date.now() - 60 * 60 * 1000;
    const filteredRequests = history.requests.filter(
      (req) => req.timestamp > sixtyMinutesAgo
    );

    const requestsByMinute = {};

    filteredRequests.forEach((req) => {
      const minute = new Date(req.timestamp).getMinutes();
      requestsByMinute[minute] = (requestsByMinute[minute] || 0) + 1;
    });

    for (let i = 0; i < 60; i++) {
      const date = new Date(Date.now() - (59 - i) * 60 * 1000);
      const minute = date.getMinutes();
      labels.push(`${date.getHours()}:${minute}`);
      requestsData.push(requestsByMinute[minute] || 0);
    }

    historicalTrafficChart = new Chart(historicalTrafficChartCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Requests per Minute",
            data: requestsData,
            backgroundColor: "rgba(52, 152, 219, 0.5)",
            borderColor: "#3498db",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Time",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "Requests",
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  initializeChart();
  fetchData();
  setInterval(fetchData, 5000); // Refresh every 5 seconds
});
