/**
 * Error Boundaries and Logging System
 * Provides comprehensive error handling, logging, and error recovery
 */

import { SecureStorage } from './SecureStorage.js';

/**
 * Logging configuration
 */
const LOG_CONFIG = {
    // Log levels
    LEVELS: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
    },
    // Log retention
    MAX_LOG_ENTRIES: 1000,
    MAX_LOG_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    // Error tracking
    MAX_ERROR_STACKS: 100,
    MAX_ERROR_CONTEXT: 50,
    // Performance monitoring
    ENABLE_PERFORMANCE_LOGGING: true,
    PERFORMANCE_THRESHOLD: 1000, // ms
    // Security logging
    LOG_SECURITY_EVENTS: true,
    SENSITIVE_DATA_MASK: true,
    MASK_PATTERNS: [
        /password/i,
        /token/i,
        /secret/i,
        /key/i,
        /auth/i,
        /session/i
    ]
};

/**
 * Secure logger with encryption and filtering
 */
class SecureLogger {
    constructor(storageKey = null) {
        this.storage = new SecureStorage('localStorage', storageKey);
        this.currentLogLevel = LOG_CONFIG.LEVELS.INFO;
        this.logBuffer = [];
        this.errorCounts = new Map();
        this.performanceMetrics = new Map();
        
        this.initializeLogger();
    }

    /**
     * Initialize logger and cleanup old logs
     */
    async initializeLogger() {
        try {
            // Load existing logs
            await this.loadLogs();
            
            // Cleanup old logs
            await this.cleanupOldLogs();
            
            // Set up global error handlers
            this.setupGlobalHandlers();
            
            // Log initialization
            this.info('Logger initialized', { timestamp: Date.now() });
        } catch (error) {
            console.error('[SecureLogger] Failed to initialize:', error);
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.error('Uncaught error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled promise rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });
    }

    /**
     * Load logs from storage
     */
    async loadLogs() {
        try {
            const logs = await this.storage.getItem('logs') || [];
            this.logBuffer = Array.isArray(logs) ? logs : [];
        } catch (error) {
            console.error('[SecureLogger] Failed to load logs:', error);
            this.logBuffer = [];
        }
    }

    /**
     * Save logs to storage
     */
    async saveLogs() {
        try {
            // Limit buffer size
            if (this.logBuffer.length > LOG_CONFIG.MAX_LOG_ENTRIES) {
                this.logBuffer = this.logBuffer.slice(-LOG_CONFIG.MAX_LOG_ENTRIES);
            }
            
            await this.storage.setItem('logs', this.logBuffer);
        } catch (error) {
            console.error('[SecureLogger] Failed to save logs:', error);
        }
    }

    /**
     * Cleanup old logs
     */
    async cleanupOldLogs() {
        const cutoffTime = Date.now() - LOG_CONFIG.MAX_LOG_AGE;
        this.logBuffer = this.logBuffer.filter(log => log.timestamp > cutoffTime);
        await this.saveLogs();
    }

    /**
     * Mask sensitive data in log entries
     */
    maskSensitiveData(data) {
        if (!LOG_CONFIG.SENSITIVE_DATA_MASK || typeof data !== 'object') {
            return data;
        }

        const masked = { ...data };
        
        for (const key in masked) {
            if (typeof key === 'string') {
                for (const pattern of LOG_CONFIG.MASK_PATTERNS) {
                    if (pattern.test(key)) {
                        masked[key] = '[MASKED]';
                        break;
                    }
                }
            }
            
            // Recursively mask nested objects
            if (typeof masked[key] === 'object' && masked[key] !== null) {
                masked[key] = this.maskSensitiveData(masked[key]);
            }
        }
        
        return masked;
    }

    /**
     * Create log entry
     */
    createLogEntry(level, message, data = {}) {
        const entry = {
            timestamp: Date.now(),
            level,
            message,
            data: this.maskSensitiveData(data),
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 200),
            sessionId: this.getSessionId()
        };
        
        return entry;
    }

    /**
     * Get session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('logger_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('logger_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * Add log entry
     */
    async addLogEntry(level, message, data = {}) {
        if (level > this.currentLogLevel) {
            return;
        }
        
        const entry = this.createLogEntry(level, message, data);
        this.logBuffer.push(entry);
        
        // Update error counts
        if (level === LOG_CONFIG.LEVELS.ERROR) {
            const key = `${message}_${entry.url}`;
            this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        }
        
        // Save to storage
        await this.saveLogs();
        
        // Output to console
        this.outputToConsole(entry);
    }

    /**
     * Output log entry to console
     */
    outputToConsole(entry) {
        const timestamp = new Date(entry.timestamp).toISOString();
        const prefix = `[${timestamp}] [${this.getLevelName(entry.level)}]`;
        
        switch (entry.level) {
            case LOG_CONFIG.LEVELS.ERROR:
                console.error(prefix, entry.message, entry.data);
                break;
            case LOG_CONFIG.LEVELS.WARN:
                console.warn(prefix, entry.message, entry.data);
                break;
            case LOG_CONFIG.LEVELS.INFO:
                console.info(prefix, entry.message, entry.data);
                break;
            case LOG_CONFIG.LEVELS.DEBUG:
                console.debug(prefix, entry.message, entry.data);
                break;
            case LOG_CONFIG.LEVELS.TRACE:
                console.trace(prefix, entry.message, entry.data);
                break;
        }
    }

    /**
     * Get level name
     */
    getLevelName(level) {
        const names = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
        return names[level] || 'UNKNOWN';
    }

    /**
     * Log methods
     */
    error(message, data) {
        return this.addLogEntry(LOG_CONFIG.LEVELS.ERROR, message, data);
    }

    warn(message, data) {
        return this.addLogEntry(LOG_CONFIG.LEVELS.WARN, message, data);
    }

    info(message, data) {
        return this.addLogEntry(LOG_CONFIG.LEVELS.INFO, message, data);
    }

    debug(message, data) {
        return this.addLogEntry(LOG_CONFIG.LEVELS.DEBUG, message, data);
    }

    trace(message, data) {
        return this.addLogEntry(LOG_CONFIG.LEVELS.TRACE, message, data);
    }

    /**
     * Security event logging
     */
    security(event, data = {}) {
        if (LOG_CONFIG.LOG_SECURITY_EVENTS) {
            return this.warn(`SECURITY: ${event}`, {
                ...data,
                securityEvent: true,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Performance logging
     */
    async performance(operation, duration, data = {}) {
        if (LOG_CONFIG.ENABLE_PERFORMANCE_LOGGING) {
            const perfData = {
                operation,
                duration,
                threshold: LOG_CONFIG.PERFORMANCE_THRESHOLD,
                slow: duration > LOG_CONFIG.PERFORMANCE_THRESHOLD,
                ...data
            };
            
            // Store performance metrics
            this.performanceMetrics.set(operation, {
                count: (this.performanceMetrics.get(operation)?.count || 0) + 1,
                totalDuration: (this.performanceMetrics.get(operation)?.totalDuration || 0) + duration,
                averageDuration: 0
            });
            
            // Calculate average
            const metrics = this.performanceMetrics.get(operation);
            metrics.averageDuration = metrics.totalDuration / metrics.count;
            
            if (duration > LOG_CONFIG.PERFORMANCE_THRESHOLD) {
                return this.warn(`PERFORMANCE: Slow ${operation}`, perfData);
            } else {
                return this.debug(`PERFORMANCE: ${operation}`, perfData);
            }
        }
    }

    /**
     * Get logs
     */
    async getLogs(filter = {}) {
        let logs = [...this.logBuffer];
        
        // Apply filters
        if (filter.level !== undefined) {
            logs = logs.filter(log => log.level === filter.level);
        }
        
        if (filter.since) {
            logs = logs.filter(log => log.timestamp >= filter.since);
        }
        
        if (filter.until) {
            logs = logs.filter(log => log.timestamp <= filter.until);
        }
        
        if (filter.search) {
            const search = filter.search.toLowerCase();
            logs = logs.filter(log => 
                log.message.toLowerCase().includes(search) ||
                JSON.stringify(log.data).toLowerCase().includes(search)
            );
        }
        
        return logs;
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.logBuffer.filter(log => log.level === LOG_CONFIG.LEVELS.ERROR).length,
            errorCounts: Object.fromEntries(this.errorCounts),
            topErrors: []
        };
        
        // Get top errors
        stats.topErrors = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key, count]) => ({ key, count }));
        
        return stats;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return Object.fromEntries(this.performanceMetrics);
    }

    /**
     * Clear logs
     */
    async clearLogs() {
        this.logBuffer = [];
        this.errorCounts.clear();
        this.performanceMetrics.clear();
        await this.saveLogs();
        this.info('Logs cleared');
    }

    /**
     * Export logs
     */
    async exportLogs() {
        return {
            timestamp: Date.now(),
            logs: this.logBuffer,
            errorStats: this.getErrorStats(),
            performanceMetrics: this.getPerformanceMetrics()
        };
    }
}

/**
 * Error Boundary Component
 */
export class ErrorBoundary {
    constructor(logger, options = {}) {
        this.logger = logger;
        this.options = {
            maxRetries: 3,
            retryDelay: 1000,
            fallbackComponent: null,
            onError: null,
            ...options
        };
        this.retryCount = new Map();
        this.componentStates = new Map();
    }

    /**
     * Wrap component with error boundary
     */
    wrap(component, componentId) {
        const self = this;
        
        return async function(...args) {
            try {
                const result = await component.apply(this, args);
                
                // Reset retry count on success
                self.retryCount.delete(componentId);
                
                // Store component state
                self.componentStates.set(componentId, {
                    lastSuccess: Date.now(),
                    callCount: (self.componentStates.get(componentId)?.callCount || 0) + 1
                });
                
                return result;
            } catch (error) {
                return self.handleError(error, componentId, component, args);
            }
        };
    }

    /**
     * Handle component error
     */
    async handleError(error, componentId, originalComponent, originalArgs) {
        const retryCount = this.retryCount.get(componentId) || 0;
        
        // Log error
        this.logger.error('Component error', {
            componentId,
            error: error.message,
            stack: error.stack,
            retryCount,
            args: this.sanitizeArgs(originalArgs)
        });

        // Check if should retry
        if (retryCount < this.options.maxRetries) {
            this.retryCount.set(componentId, retryCount + 1);
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
            
            this.logger.info(`Retrying component ${componentId}`, { retryCount: retryCount + 1 });
            
            try {
                return await originalComponent.apply(null, originalArgs);
            } catch (retryError) {
                return this.handleError(retryError, componentId, originalComponent, originalArgs);
            }
        }

        // Call error callback
        if (this.options.onError) {
            this.options.onError(error, componentId);
        }

        // Return fallback component or error
        if (this.options.fallbackComponent) {
            return this.options.fallbackComponent(error, componentId);
        }

        throw error;
    }

    /**
     * Sanitize arguments for logging
     */
    sanitizeArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                return this.logger.maskSensitiveData(arg);
            }
            return typeof arg === 'string' && arg.length > 200 ? arg.substring(0, 200) + '...' : arg;
        });
    }

    /**
     * Get component statistics
     */
    getComponentStats() {
        const stats = {
            retryCounts: Object.fromEntries(this.retryCount),
            componentStates: Object.fromEntries(this.componentStates),
            totalComponents: this.componentStates.size,
            componentsWithRetries: this.retryCount.size
        };
        
        return stats;
    }

    /**
     * Reset component statistics
     */
    resetComponentStats() {
        this.retryCount.clear();
        this.componentStates.clear();
        this.logger.info('Component statistics reset');
    }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
    constructor(logger) {
        this.logger = logger;
        this.timers = new Map();
        this.metrics = new Map();
    }

    /**
     * Start timer
     */
    start(operation) {
        this.timers.set(operation, {
            startTime: performance.now(),
            startTimestamp: Date.now()
        });
    }

    /**
     * End timer and log performance
     */
    async end(operation, data = {}) {
        const timer = this.timers.get(operation);
        if (!timer) {
            this.logger.warn(`Performance timer not found for: ${operation}`);
            return;
        }

        const duration = performance.now() - timer.startTime;
        this.timers.delete(operation);

        await this.logger.performance(operation, duration, data);

        // Store metrics
        const existing = this.metrics.get(operation) || { count: 0, totalDuration: 0 };
        this.metrics.set(operation, {
            count: existing.count + 1,
            totalDuration: existing.totalDuration + duration,
            averageDuration: (existing.totalDuration + duration) / (existing.count + 1),
            minDuration: Math.min(existing.minDuration || Infinity, duration),
            maxDuration: Math.max(existing.maxDuration || 0, duration)
        });
    }

    /**
     * Measure function performance
     */
    async measure(operation, fn, data = {}) {
        this.start(operation);
        try {
            const result = await fn();
            await this.end(operation, { ...data, success: true });
            return result;
        } catch (error) {
            await this.end(operation, { ...data, success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return Object.fromEntries(this.metrics);
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics.clear();
        this.timers.clear();
        this.logger.info('Performance metrics cleared');
    }
}

/**
 * Create global logger instance
 */
export const logger = new SecureLogger();

/**
 * Create global error boundary
 */
export const errorBoundary = new ErrorBoundary(logger);

/**
 * Create global performance monitor
 */
export const performanceMonitor = new PerformanceMonitor(logger);

export default {
    SecureLogger,
    ErrorBoundary,
    PerformanceMonitor,
    logger,
    errorBoundary,
    performanceMonitor,
    LOG_CONFIG
};
