/**
 * Enterprise Alerting System
 * 
 * Provides comprehensive alerting and notification capabilities similar to Netdata,
 * including multiple notification channels, alert rules, and escalation policies.
 * 
 * @module alerting
 * @author DAASR Enterprise Team
 * @version 2.0.0
 */

const EventEmitter = require('events');
const winston = require('winston');

class AlertingSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            enabled: options.enabled !== false,
            checkInterval: options.checkInterval || 30000, // 30 seconds
            escalationTimeout: options.escalationTimeout || 300000, // 5 minutes
            maxAlerts: options.maxAlerts || 1000,
            ...options
        };
        
        // Alert rules storage
        this.rules = new Map();
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.suppressedAlerts = new Set();
        
        // Notification channels
        this.channels = new Map();
        
        // Alert states
        this.alertStates = {
            NORMAL: 'normal',
            WARNING: 'warning',
            CRITICAL: 'critical',
            RESOLVED: 'resolved'
        };
        
        // Logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/alerts.log' }),
                new winston.transports.Console()
            ]
        });
        
        this.isRunning = false;
        this.checkTimer = null;
        
        this.initializeDefaultRules();
        this.initializeDefaultChannels();
    }
    
    /**
     * Initialize default alert rules
     */
    initializeDefaultRules() {
        // CPU usage alert
        this.addRule({
            id: 'high_cpu_usage',
            name: 'High CPU Usage',
            description: 'CPU usage is above threshold',
            metric: 'system.cpu.overall',
            condition: 'greater_than',
            threshold: 80,
            duration: 60000, // 1 minute
            severity: 'warning',
            enabled: true
        });
        
        this.addRule({
            id: 'critical_cpu_usage',
            name: 'Critical CPU Usage',
            description: 'CPU usage is critically high',
            metric: 'system.cpu.overall',
            condition: 'greater_than',
            threshold: 95,
            duration: 30000, // 30 seconds
            severity: 'critical',
            enabled: true
        });
        
        // Memory usage alerts
        this.addRule({
            id: 'high_memory_usage',
            name: 'High Memory Usage',
            description: 'Memory usage is above threshold',
            metric: 'system.memory.usagePercent',
            condition: 'greater_than',
            threshold: 85,
            duration: 60000,
            severity: 'warning',
            enabled: true
        });
        
        this.addRule({
            id: 'critical_memory_usage',
            name: 'Critical Memory Usage',
            description: 'Memory usage is critically high',
            metric: 'system.memory.usagePercent',
            condition: 'greater_than',
            threshold: 95,
            duration: 30000,
            severity: 'critical',
            enabled: true
        });
        
        // Load average alerts
        this.addRule({
            id: 'high_load_average',
            name: 'High Load Average',
            description: 'System load average is high',
            metric: 'system.load.load1',
            condition: 'greater_than',
            threshold: 4.0,
            duration: 120000, // 2 minutes
            severity: 'warning',
            enabled: true
        });
        
        // Response time alerts
        this.addRule({
            id: 'slow_response_time',
            name: 'Slow Response Time',
            description: 'Average response time is too high',
            metric: 'application.response_time',
            condition: 'greater_than',
            threshold: 1000, // 1 second
            duration: 60000,
            severity: 'warning',
            enabled: true
        });
        
        // Error rate alerts
        this.addRule({
            id: 'high_error_rate',
            name: 'High Error Rate',
            description: 'Error rate is above acceptable threshold',
            metric: 'application.error_rate',
            condition: 'greater_than',
            threshold: 5, // 5%
            duration: 60000,
            severity: 'critical',
            enabled: true
        });
    }
    
    /**
     * Initialize default notification channels
     */
    initializeDefaultChannels() {
        // Console channel (always available)
        this.addChannel('console', {
            type: 'console',
            enabled: true
        });
        
        // Log file channel
        this.addChannel('logfile', {
            type: 'logfile',
            enabled: true,
            file: 'logs/alerts.log'
        });
        
        // Email channel (if configured)
        if (process.env.SMTP_HOST) {
            this.addChannel('email', {
                type: 'email',
                enabled: true,
                smtp: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                },
                from: process.env.ALERT_FROM_EMAIL,
                to: process.env.ALERT_TO_EMAIL?.split(',') || []
            });
        }
        
        // Webhook channel (if configured)
        if (process.env.WEBHOOK_URL) {
            this.addChannel('webhook', {
                type: 'webhook',
                enabled: true,
                url: process.env.WEBHOOK_URL,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
    }
    
    /**
     * Start the alerting system
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.checkTimer = setInterval(() => {
            this.checkAlerts();
        }, this.config.checkInterval);
        
        this.logger.info('Alerting system started', {
            checkInterval: this.config.checkInterval,
            rulesCount: this.rules.size,
            channelsCount: this.channels.size
        });
        
        this.emit('started');
    }
    
    /**
     * Stop the alerting system
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        
        this.logger.info('Alerting system stopped');
        this.emit('stopped');
    }
    
    /**
     * Add alert rule
     */
    addRule(rule) {
        const ruleWithDefaults = {
            id: rule.id,
            name: rule.name,
            description: rule.description || '',
            metric: rule.metric,
            condition: rule.condition || 'greater_than',
            threshold: rule.threshold,
            duration: rule.duration || 60000,
            severity: rule.severity || 'warning',
            enabled: rule.enabled !== false,
            channels: rule.channels || ['console', 'logfile'],
            suppressionTime: rule.suppressionTime || 300000, // 5 minutes
            escalation: rule.escalation || null,
            metadata: rule.metadata || {},
            created: Date.now(),
            lastTriggered: null,
            triggerCount: 0
        };
        
        this.rules.set(rule.id, ruleWithDefaults);
        this.logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
        
        return ruleWithDefaults;
    }
    
    /**
     * Remove alert rule
     */
    removeRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            this.rules.delete(ruleId);
            this.logger.info('Alert rule removed', { ruleId, name: rule.name });
            return true;
        }
        return false;
    }
    
    /**
     * Update alert rule
     */
    updateRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.logger.info('Alert rule updated', { ruleId, updates });
            return rule;
        }
        return null;
    }
    
    /**
     * Add notification channel
     */
    addChannel(channelId, config) {
        this.channels.set(channelId, {
            id: channelId,
            ...config,
            created: Date.now(),
            lastUsed: null,
            messageCount: 0
        });
        
        this.logger.info('Notification channel added', { channelId, type: config.type });
        
        return this.channels.get(channelId);
    }
    
    /**
     * Remove notification channel
     */
    removeChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (channel) {
            this.channels.delete(channelId);
            this.logger.info('Notification channel removed', { channelId });
            return true;
        }
        return false;
    }
    
    /**
     * Check all alert rules against current metrics
     */
    checkAlerts() {
        if (!this.config.enabled) return;
        
        for (const [ruleId, rule] of this.rules) {
            if (!rule.enabled) continue;
            
            try {
                this.evaluateRule(rule);
            } catch (error) {
                this.logger.error('Error evaluating alert rule', {
                    ruleId,
                    error: error.message
                });
            }
        }
        
        // Clean up resolved alerts
        this.cleanupResolvedAlerts();
    }
    
    /**
     * Evaluate a single alert rule
     */
    evaluateRule(rule) {
        // Get current metric value (this would be integrated with your metrics system)
        const metricValue = this.getMetricValue(rule.metric);
        if (metricValue === null || metricValue === undefined) {
            return;
        }
        
        // Check condition
        const conditionMet = this.evaluateCondition(metricValue, rule.condition, rule.threshold);
        const now = Date.now();
        const alertKey = `${rule.id}`;
        
        if (conditionMet) {
            let alert = this.activeAlerts.get(alertKey);
            
            if (!alert) {
                // New alert condition detected
                alert = {
                    id: `${rule.id}_${now}`,
                    ruleId: rule.id,
                    rule: rule,
                    startTime: now,
                    lastUpdate: now,
                    currentValue: metricValue,
                    state: rule.severity,
                    escalated: false,
                    notificationsSent: 0,
                    suppressedUntil: null
                };
                
                this.activeAlerts.set(alertKey, alert);
                this.logger.info('New alert detected', {
                    alertId: alert.id,
                    ruleId: rule.id,
                    value: metricValue,
                    threshold: rule.threshold
                });
            } else {
                // Update existing alert
                alert.lastUpdate = now;
                alert.currentValue = metricValue;
            }
            
            // Check if alert should be triggered (duration exceeded)
            if (now - alert.startTime >= rule.duration) {
                this.triggerAlert(alert);
            }
            
        } else {
            // Condition not met, resolve alert if it exists
            const alert = this.activeAlerts.get(alertKey);
            if (alert) {
                this.resolveAlert(alert);
            }
        }
    }
    
    /**
     * Get metric value (placeholder - integrate with your metrics system)
     */
    getMetricValue(metricPath) {
        // This should be integrated with your SystemMetricsCollector
        // For now, return simulated values
        const simulated = {
            'system.cpu.overall': Math.random() * 100,
            'system.memory.usagePercent': Math.random() * 100,
            'system.load.load1': Math.random() * 8,
            'application.response_time': Math.random() * 2000,
            'application.error_rate': Math.random() * 10
        };
        
        return simulated[metricPath] || null;
    }
    
    /**
     * Evaluate condition
     */
    evaluateCondition(value, condition, threshold) {
        switch (condition) {
            case 'greater_than':
                return value > threshold;
            case 'less_than':
                return value < threshold;
            case 'equal_to':
                return value === threshold;
            case 'not_equal_to':
                return value !== threshold;
            case 'greater_than_or_equal':
                return value >= threshold;
            case 'less_than_or_equal':
                return value <= threshold;
            default:
                return false;
        }
    }
    
    /**
     * Trigger an alert
     */
    triggerAlert(alert) {
        const now = Date.now();
        
        // Check if alert is suppressed
        if (alert.suppressedUntil && now < alert.suppressedUntil) {
            return;
        }
        
        // Update rule statistics
        const rule = alert.rule;
        rule.lastTriggered = now;
        rule.triggerCount++;
        
        // Add to history
        this.alertHistory.push({
            ...alert,
            triggeredAt: now,
            type: 'triggered'
        });
        
        // Send notifications
        this.sendNotifications(alert);
        
        // Update alert
        alert.notificationsSent++;
        alert.lastNotification = now;
        
        this.logger.warn('Alert triggered', {
            alertId: alert.id,
            ruleId: alert.ruleId,
            severity: alert.state,
            value: alert.currentValue,
            threshold: rule.threshold
        });
        
        this.emit('alertTriggered', alert);
    }
    
    /**
     * Resolve an alert
     */
    resolveAlert(alert) {
        const now = Date.now();
        
        // Add to history
        this.alertHistory.push({
            ...alert,
            resolvedAt: now,
            type: 'resolved'
        });
        
        // Remove from active alerts
        const alertKey = `${alert.ruleId}`;
        this.activeAlerts.delete(alertKey);
        
        // Send resolution notification
        this.sendResolutionNotification(alert);
        
        this.logger.info('Alert resolved', {
            alertId: alert.id,
            ruleId: alert.ruleId,
            duration: now - alert.startTime
        });
        
        this.emit('alertResolved', alert);
    }
    
    /**
     * Send notifications for an alert
     */
    async sendNotifications(alert) {
        const rule = alert.rule;
        const channels = rule.channels || ['console'];
        
        for (const channelId of channels) {
            const channel = this.channels.get(channelId);
            if (!channel || !channel.enabled) continue;
            
            try {
                await this.sendToChannel(channel, alert);
                channel.lastUsed = Date.now();
                channel.messageCount++;
            } catch (error) {
                this.logger.error('Failed to send notification', {
                    channelId,
                    alertId: alert.id,
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Send notification to specific channel
     */
    async sendToChannel(channel, alert) {
        const message = this.formatAlertMessage(alert);
        
        switch (channel.type) {
            case 'console':
                console.log(`🚨 ALERT: ${message}`);
                break;
                
            case 'logfile':
                this.logger.error(`ALERT: ${message}`, alert);
                break;
                
            case 'webhook':
                await this.sendWebhookNotification(channel, alert, message);
                break;
                
            case 'email':
                await this.sendEmailNotification(channel, alert, message);
                break;
                
            default:
                throw new Error(`Unknown channel type: ${channel.type}`);
        }
    }
    
    /**
     * Send webhook notification
     */
    async sendWebhookNotification(channel, alert, message) {
        const payload = {
            alert: {
                id: alert.id,
                ruleId: alert.ruleId,
                name: alert.rule.name,
                description: alert.rule.description,
                severity: alert.state,
                value: alert.currentValue,
                threshold: alert.rule.threshold,
                startTime: alert.startTime,
                message
            },
            timestamp: Date.now()
        };
        
        try {
            const response = await fetch(channel.url, {
                method: channel.method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...channel.headers
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            throw new Error(`Webhook notification failed: ${error.message}`);
        }
    }
    
    /**
     * Send email notification (placeholder - would use nodemailer in production)
     */
    async sendEmailNotification(channel, alert, message) {
        // This is a simplified implementation
        // In production, you would use nodemailer or similar
        this.logger.info('Email notification would be sent', {
            to: channel.to,
            subject: `DAASR Alert: ${alert.rule.name}`,
            message
        });
    }
    
    /**
     * Send resolution notification
     */
    async sendResolutionNotification(alert) {
        const rule = alert.rule;
        const channels = rule.channels || ['console'];
        
        for (const channelId of channels) {
            const channel = this.channels.get(channelId);
            if (!channel || !channel.enabled) continue;
            
            const message = `RESOLVED: ${rule.name} - ${rule.description}`;
            
            try {
                await this.sendToChannel(channel, { ...alert, message });
            } catch (error) {
                this.logger.error('Failed to send resolution notification', {
                    channelId,
                    alertId: alert.id,
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Format alert message
     */
    formatAlertMessage(alert) {
        const rule = alert.rule;
        return `${rule.name}: ${rule.description} (${alert.currentValue} ${rule.condition} ${rule.threshold})`;
    }
    
    /**
     * Clean up resolved alerts from history
     */
    cleanupResolvedAlerts() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        this.alertHistory = this.alertHistory.filter(alert => alert.triggeredAt > cutoff);
        
        // Limit history size
        if (this.alertHistory.length > this.config.maxAlerts) {
            this.alertHistory = this.alertHistory.slice(-this.config.maxAlerts);
        }
    }
    
    /**
     * Suppress an alert for a duration
     */
    suppressAlert(alertId, duration) {
        // Find active alert
        for (const [key, alert] of this.activeAlerts) {
            if (alert.id === alertId) {
                alert.suppressedUntil = Date.now() + duration;
                this.logger.info('Alert suppressed', { alertId, duration });
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    
    /**
     * Get alert history
     */
    getAlertHistory(limit = 100) {
        return this.alertHistory
            .sort((a, b) => b.triggeredAt - a.triggeredAt)
            .slice(0, limit);
    }
    
    /**
     * Get alerting statistics
     */
    getStatistics() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        
        return {
            isRunning: this.isRunning,
            activeAlerts: this.activeAlerts.size,
            totalRules: this.rules.size,
            enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
            alerts24h: this.alertHistory.filter(a => a.triggeredAt > last24h).length,
            channels: this.channels.size,
            enabledChannels: Array.from(this.channels.values()).filter(c => c.enabled).length,
            suppressedAlerts: this.suppressedAlerts.size
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Alerting configuration updated', newConfig);
    }
}

module.exports = AlertingSystem;