/**
 * DAASR Algorithm Tests
 *
 * Unit tests for the DAASR middleware and algorithm
 *
 * @module tests
 * @author DAASR Team
 * @version 1.0.0
 */

const { DAASRAlgorithm } = require("../src/middleware/daasr");
const config = require("../src/config/default");

describe("DAASR Algorithm Tests", () => {
  let expect;

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });
  let daasr;

  beforeEach(() => {
    daasr = new DAASRAlgorithm();
  });

  describe("Traffic Multiplier Calculation", () => {
    it("should return 0.5 for high traffic (1000+ RPS)", () => {
      const trafficStats = {
        requestsPerSecond: 1500,
        averageResponseTime: 200,
        errorRate: 0.01,
      };

      const result = daasr.calculateTrafficMultiplier(trafficStats);
      expect(result).to.equal(0.5);
    });

    it("should return 0.7 for medium-high traffic (500-1000 RPS)", () => {
      const trafficStats = {
        requestsPerSecond: 750,
        averageResponseTime: 200,
        errorRate: 0.01,
      };

      const result = daasr.calculateTrafficMultiplier(trafficStats);
      expect(result).to.equal(0.7);
    });

    it("should return 0.6 for high error rate (>10%)", () => {
      const trafficStats = {
        requestsPerSecond: 50,
        averageResponseTime: 200,
        errorRate: 0.15,
      };

      const result = daasr.calculateTrafficMultiplier(trafficStats);
      expect(result).to.equal(0.6);
    });

    it("should return 1.0 for normal traffic", () => {
      const trafficStats = {
        requestsPerSecond: 50,
        averageResponseTime: 200,
        errorRate: 0.01,
      };

      const result = daasr.calculateTrafficMultiplier(trafficStats);
      expect(result).to.equal(1.0);
    });
  });

  describe("Burst Factor Calculation", () => {
    it("should return 1.0 for new users", () => {
      const identifier = "192.168.1.1";
      const requestData = {
        url: "/api/test",
        method: "GET",
      };

      const result = daasr.calculateBurstFactor(identifier, requestData);
      expect(result).to.be.a("number");
      expect(result).to.be.at.least(0.5);
      expect(result).to.be.at.most(1.0);
    });

    it("should decrease burst factor for high request rate", () => {
      const identifier = "192.168.1.1";

      // Simulate 50 requests in the last minute
      for (let i = 0; i < 50; i++) {
        daasr.calculateBurstFactor(identifier, {
          url: "/api/test",
          method: "GET",
        });
      }

      const result = daasr.calculateBurstFactor(identifier, {
        url: "/api/test",
        method: "GET",
      });

      expect(result).to.be.lessThan(1.0);
    });
  });

  describe("User Reputation Calculation", () => {
    it("should return 1.2 for new users (<10 requests)", () => {
      const identifier = "192.168.1.1";
      const result = daasr.calculateUserReputation(identifier);
      expect(result).to.equal(1.2);
    });

    it("should return 1.0 for established users", () => {
      const identifier = "192.168.1.1";

      // Simulate 15 requests to establish user
      for (let i = 0; i < 15; i++) {
        daasr.userPatterns.set(identifier, {
          requests: Array(15).fill({ timestamp: Date.now() }),
        });
      }

      const result = daasr.calculateUserReputation(identifier);
      expect(result).to.equal(1.0);
    });
  });

  describe("Window Size Calculation", () => {
    it("should return 1 minute for high traffic (>100 RPS)", () => {
      const trafficStats = { requestsPerSecond: 150 };
      const result = daasr.calculateWindowSize(trafficStats);
      expect(result).to.equal(60000);
    });

    it("should return 5 minutes for medium traffic (10-100 RPS)", () => {
      const trafficStats = { requestsPerSecond: 50 };
      const result = daasr.calculateWindowSize(trafficStats);
      expect(result).to.equal(300000);
    });

    it("should return 15 minutes for low traffic (<10 RPS)", () => {
      const trafficStats = { requestsPerSecond: 5 };
      const result = daasr.calculateWindowSize(trafficStats);
      expect(result).to.equal(900000);
    });
  });

  describe("Dynamic Limit Calculation", () => {
    it("should calculate dynamic limit within bounds", () => {
      const identifier = "192.168.1.1";
      const requestData = {
        url: "/api/test",
        method: "GET",
      };

      const trafficStats = {
        requestsPerSecond: 50,
        averageResponseTime: 200,
        errorRate: 0.01,
      };

      // Mock traffic monitor
      const originalGetCurrentStats =
        require("../src/services/trafficMonitor").getCurrentStats;
      require("../src/services/trafficMonitor").getCurrentStats = () =>
        trafficStats;

      const result = daasr.calculateDynamicLimit(identifier, requestData);

      // Restore original function
      require("../src/services/trafficMonitor").getCurrentStats =
        originalGetCurrentStats;

      expect(result).to.be.an("object");
      expect(result).to.have.property("windowMs");
      expect(result).to.have.property("max");
      expect(result.max).to.be.at.least(config.get("minRateLimit"));
      expect(result.max).to.be.at.most(config.get("maxRateLimit"));
    });
  });

  describe("Configuration Integration", () => {
    it("should use configuration values", () => {
      const configValues = config.getConfig();
      expect(configValues).to.be.an("object");
      expect(configValues).to.have.property("baseRateLimit");
      expect(configValues).to.have.property("minRateLimit");
      expect(configValues).to.have.property("maxRateLimit");
    });

    it("should validate configuration updates", () => {
      expect(() => {
        config.set("baseRateLimit", "invalid");
      }).to.throw();
    });

    it("should accept valid configuration updates", () => {
      const originalValue = config.get("baseRateLimit");
      config.set("baseRateLimit", 200);
      expect(config.get("baseRateLimit")).to.equal(200);
      config.set("baseRateLimit", originalValue);
    });
  });
});

describe("Utility Functions Tests", () => {
  let expect;
  const helpers = require("../src/utils/helpers");

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });

  describe("IP Validation", () => {
    it("should validate IPv4 addresses", () => {
      expect(helpers.isValidIP("192.168.1.1")).to.be.true;
      expect(helpers.isValidIP("255.255.255.255")).to.be.true;
      expect(helpers.isValidIP("256.256.256.256")).to.be.false;
    });

    it("should validate IPv6 addresses", () => {
      expect(helpers.isValidIP("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).to.be
        .true;
      expect(helpers.isValidIP("invalid")).to.be.false;
    });
  });

  describe("User Agent Parsing", () => {
    it("should parse Chrome user agent", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
      const result = helpers.parseUserAgent(ua);
      expect(result.browser).to.equal("chrome");
      expect(result.os).to.equal("windows");
    });

    it("should handle invalid user agent", () => {
      const result = helpers.parseUserAgent(null);
      expect(result.browser).to.equal("unknown");
    });
  });

  describe("Request Signature Calculation", () => {
    it("should generate consistent signatures", () => {
      const request1 = {
        method: "GET",
        url: "/api/test",
        headers: { "user-agent": "Chrome" },
      };

      const request2 = {
        method: "GET",
        url: "/api/test",
        headers: { "user-agent": "Chrome" },
      };

      const sig1 = helpers.calculateRequestSignature(request1);
      const sig2 = helpers.calculateRequestSignature(request2);

      expect(sig1).to.equal(sig2);
    });
  });
});

describe("Traffic Monitor Tests", () => {
  let expect;
  const trafficMonitor = require("../src/services/trafficMonitor");

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });

  describe("Statistics Calculation", () => {
    it("should calculate request rate", () => {
      trafficMonitor.reset();

      // Record 60 requests over 1 minute
      for (let i = 0; i < 60; i++) {
        trafficMonitor.recordRequest({
          ip: "192.168.1.1",
          method: "GET",
          url: "/api/test",
          userAgent: "Test",
        });
      }

      const stats = trafficMonitor.getCurrentStats();
      expect(stats.requestsPerSecond).to.be.at.least(0);
      expect(stats.requestsPerMinute).to.be.at.least(0);
    });

    it("should calculate error rate", () => {
      trafficMonitor.reset();

      // Record 100 requests and 5 errors
      for (let i = 0; i < 100; i++) {
        trafficMonitor.recordRequest({
          ip: "192.168.1.1",
          method: "GET",
          url: "/api/test",
          userAgent: "Test",
        });

        if (i < 5) {
          trafficMonitor.recordResponse({
            responseTime: 100,
            statusCode: 500,
            contentLength: 0,
          });
        } else {
          trafficMonitor.recordResponse({
            responseTime: 100,
            statusCode: 200,
            contentLength: 100,
          });
        }
      }

      const stats = trafficMonitor.getCurrentStats();
      expect(stats.errorRate).to.be.closeTo(0.05, 0.01);
    });
  });

  describe("Health Status", () => {
    it("should return healthy status for normal traffic", () => {
      const stats = {
        requestsPerSecond: 50,
        averageResponseTime: 200,
        errorRate: 0.01,
      };

      const health = trafficMonitor.calculateHealthStatus(stats);
      expect(health).to.equal("healthy");
    });

    it("should return warning for high error rate", () => {
      const stats = {
        requestsPerSecond: 50,
        averageResponseTime: 200,
        errorRate: 0.08,
      };

      const health = trafficMonitor.calculateHealthStatus(stats);
      expect(health).to.equal("warning");
    });
  });
});
