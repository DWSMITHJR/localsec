/**
 * Session Management with Timeout and Security
 * Provides secure session management, timeout handling, and session persistence
 */

import { SecureStorage } from './SecureStorage.js';
import { CryptoUtils } from './CryptoUtils.js';
import { logger } from './ErrorBoundary.js';

/**
 * Session configuration
 */
const SESSION_CONFIG = {
    // Timeout settings
    TIMEOUT: {
        IDLE: 30 * 60 * 1000, // 30 minutes
        ABSOLUTE: 8 * 60 * 60 * 1000, // 8 hours
        WARNING: 5 * 60 * 1000, // 5 minutes before timeout
        GRACE_PERIOD: 60 * 1000 // 1 minute grace period
    },
    // Security settings
    SECURITY: {
        MAX_CONCURRENT_SESSIONS: 3,
        SESSION_ROTATION_INTERVAL: 15 * 60 * 1000, // 15 minutes
        ENABLE_SESSION_FIXATION_PROTECTION: true,
        ENABLE_CSRF_PROTECTION: true,
        ENABLE_IP_VALIDATION: false // Requires server-side implementation
    },
    // Storage settings
    STORAGE: {
        PREFIX: 'session_',
        ENCRYPTION: true,
        PERSISTENCE: true
    },
    // Activity tracking
    ACTIVITY: {
        TRACK_MOUSE_MOVEMENT: false,
        TRACK_KEYBOARD_INPUT: true,
        TRACK_PAGE_VISIBILITY: true,
        TRACK_NETWORK_ACTIVITY: true
    }
};

/**
 * Session state enum
 */
const SESSION_STATE = {
    ACTIVE: 'active',
    IDLE: 'idle',
    WARNING: 'warning',
    EXPIRED: 'expired',
    TERMINATED: 'terminated'
};

/**
 * Session Manager class
 */
export class SessionManager {
    constructor(options = {}) {
        this.config = { ...SESSION_CONFIG, ...options };
        this.storage = new SecureStorage('localStorage', this.config.STORAGE.ENCRYPTION ? 'session_master_key' : null);
        this.sessionStorage = new SecureStorage('sessionStorage', this.config.STORAGE.ENCRYPTION ? 'session_master_key' : null);
        
        this.currentSession = null;
        this.state = SESSION_STATE.TERMINATED;
        this.timers = new Map();
        this.eventListeners = new Map();
        this.activityTracker = new ActivityTracker(this.config.ACTIVITY);
        
        this.initializeSessionManager();
    }

    /**
     * Initialize session manager
     */
    async initializeSessionManager() {
        try {
            // Load existing session
            await this.loadSession();
            
            // Setup activity tracking
            this.setupActivityTracking();
            
            // Setup session monitoring
            this.setupSessionMonitoring();
            
            // Check session validity
            await this.validateSession();
            
            logger.info('Session manager initialized', { 
                sessionId: this.currentSession?.id,
                state: this.state 
            });
        } catch (error) {
            logger.error('Failed to initialize session manager', { error: error.message });
            await this.terminateSession();
        }
    }

    /**
     * Create new session
     */
    async createSession(userData, options = {}) {
        try {
            // Validate user data
            if (!userData || typeof userData !== 'object') {
                throw new Error('Invalid user data');
            }
            
            // Terminate existing session
            if (this.currentSession) {
                await this.terminateSession();
            }
            
            // Generate session ID
            const sessionId = await this.generateSessionId();
            
            // Create session object
            const session = {
                id: sessionId,
                userId: userData.id,
                userData: this.sanitizeUserData(userData),
                createdAt: Date.now(),
                lastActivity: Date.now(),
                expiresAt: Date.now() + this.config.TIMEOUT.ABSOLUTE,
                state: SESSION_STATE.ACTIVE,
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent.substring(0, 200),
                deviceFingerprint: await this.getDeviceFingerprint(),
                securityTokens: await this.generateSecurityTokens(),
                options: { ...options }
            };
            
            // Store session
            await this.storeSession(session);
            this.currentSession = session;
            this.state = SESSION_STATE.ACTIVE;
            
            // Setup session timers
            this.setupSessionTimers();
            
            // Emit session created event
            this.emitEvent('session:created', { session });
            
            logger.info('Session created', { sessionId, userId: userData.id });
            
            return session;
        } catch (error) {
            logger.error('Failed to create session', { error: error.message });
            throw error;
        }
    }

    /**
     * Load existing session
     */
    async loadSession() {
        try {
            const sessionId = this.getSessionIdFromStorage();
            if (!sessionId) {
                return null;
            }
            
            const session = await this.storage.getItem(`session_${sessionId}`);
            if (!session) {
                return null;
            }
            
            this.currentSession = session;
            this.state = session.state || SESSION_STATE.ACTIVE;
            
            return session;
        } catch (error) {
            logger.error('Failed to load session', { error: error.message });
            return null;
        }
    }

    /**
     * Store session securely
     */
    async storeSession(session) {
        try {
            await this.storage.setItem(`session_${session.id}`, session);
            
            // Store session ID in sessionStorage for quick access
            await this.sessionStorage.setItem('current_session_id', session.id);
            
            // Store session metadata
            const metadata = {
                sessionId: session.id,
                userId: session.userId,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity
            };
            
            await this.sessionStorage.setItem('session_metadata', metadata);
        } catch (error) {
            logger.error('Failed to store session', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate session
     */
    async validateSession() {
        if (!this.currentSession) {
            return false;
        }
        
        try {
            // Check absolute timeout
            if (Date.now() > this.currentSession.expiresAt) {
                await this.terminateSession('absolute_timeout');
                return false;
            }
            
            // Check idle timeout
            const idleTime = Date.now() - this.currentSession.lastActivity;
            if (idleTime > this.config.TIMEOUT.IDLE) {
                await this.terminateSession('idle_timeout');
                return false;
            }
            
            // Check session state
            if (this.currentSession.state === SESSION_STATE.EXPIRED || 
                this.currentSession.state === SESSION_STATE.TERMINATED) {
                return false;
            }
            
            // Validate security tokens if enabled
            if (this.config.SECURITY.ENABLE_SESSION_FIXATION_PROTECTION) {
                const isValid = await this.validateSecurityTokens();
                if (!isValid) {
                    await this.terminateSession('security_violation');
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            logger.error('Session validation failed', { error: error.message });
            return false;
        }
    }

    /**
     * Update session activity
     */
    async updateActivity() {
        if (!this.currentSession) {
            return;
        }
        
        const now = Date.now();
        const previousActivity = this.currentSession.lastActivity;
        
        // Update last activity
        this.currentSession.lastActivity = now;
        await this.storeSession(this.currentSession);
        
        // Reset idle timer
        this.resetTimer('idle');
        
        // Check if session was idle
        const idleTime = now - previousActivity;
        if (idleTime > this.config.TIMEOUT.WARNING && this.state === SESSION_STATE.IDLE) {
            this.state = SESSION_STATE.ACTIVE;
            this.emitEvent('session:reactivated', { idleTime });
        }
        
        logger.debug('Session activity updated', { 
            sessionId: this.currentSession.id,
            idleTime 
        });
    }

    /**
     * Setup session timers
     */
    setupSessionTimers() {
        // Clear existing timers
        this.clearAllTimers();
        
        if (!this.currentSession) {
            return;
        }
        
        // Idle timeout timer
        this.setTimer('idle', () => {
            this.handleIdleTimeout();
        }, this.config.TIMEOUT.IDLE);
        
        // Warning timer
        this.setTimer('warning', () => {
            this.handleWarningTimeout();
        }, this.config.TIMEOUT.IDLE - this.config.TIMEOUT.WARNING);
        
        // Absolute timeout timer
        const absoluteRemaining = this.currentSession.expiresAt - Date.now();
        if (absoluteRemaining > 0) {
            this.setTimer('absolute', () => {
                this.handleAbsoluteTimeout();
            }, absoluteRemaining);
        }
        
        // Session rotation timer
        if (this.config.SECURITY.SESSION_ROTATION_INTERVAL > 0) {
            this.setTimer('rotation', () => {
                this.rotateSession();
            }, this.config.SECURITY.SESSION_ROTATION_INTERVAL);
        }
    }

    /**
     * Handle idle timeout
     */
    async handleIdleTimeout() {
        if (!this.currentSession) {
            return;
        }
        
        this.state = SESSION_STATE.WARNING;
        this.emitEvent('session:idle_warning', {
            remainingTime: this.config.TIMEOUT.GRACE_PERIOD,
            sessionId: this.currentSession.id
        });
        
        // Set grace period timer
        this.setTimer('grace', () => {
            this.terminateSession('idle_timeout');
        }, this.config.TIMEOUT.GRACE_PERIOD);
        
        logger.warn('Session idle timeout warning', { 
            sessionId: this.currentSession.id 
        });
    }

    /**
     * Handle warning timeout
     */
    handleWarningTimeout() {
        if (!this.currentSession) {
            return;
        }
        
        this.emitEvent('session:warning', {
            remainingTime: this.config.TIMEOUT.WARNING,
            sessionId: this.currentSession.id
        });
        
        logger.info('Session timeout warning', { 
            sessionId: this.currentSession.id 
        });
    }

    /**
     * Handle absolute timeout
     */
    async handleAbsoluteTimeout() {
        await this.terminateSession('absolute_timeout');
    }

    /**
     * Rotate session (security feature)
     */
    async rotateSession() {
        if (!this.currentSession) {
            return;
        }
        
        try {
            // Generate new session ID and tokens
            const oldSessionId = this.currentSession.id;
            this.currentSession.id = await this.generateSessionId();
            this.currentSession.securityTokens = await this.generateSecurityTokens();
            this.currentSession.lastActivity = Date.now();
            
            // Update stored session
            await this.storeSession(this.currentSession);
            
            // Reset timers
            this.setupSessionTimers();
            
            this.emitEvent('session:rotated', {
                oldSessionId,
                newSessionId: this.currentSession.id
            });
            
            logger.info('Session rotated', { 
                oldSessionId, 
                newSessionId: this.currentSession.id 
            });
        } catch (error) {
            logger.error('Session rotation failed', { error: error.message });
        }
    }

    /**
     * Terminate session
     */
    async terminateSession(reason = 'manual') {
        if (!this.currentSession) {
            return;
        }
        
        try {
            const sessionId = this.currentSession.id;
            
            // Update session state
            this.currentSession.state = SESSION_STATE.TERMINATED;
            this.currentSession.terminatedAt = Date.now();
            this.currentSession.terminationReason = reason;
            
            // Store terminated session for audit
            await this.storage.setItem(`terminated_${sessionId}`, this.currentSession);
            
            // Remove active session
            await this.storage.removeItem(`session_${sessionId}`);
            await this.sessionStorage.removeItem('current_session_id');
            await this.sessionStorage.removeItem('session_metadata');
            
            // Clear timers
            this.clearAllTimers();
            
            // Update state
            this.state = SESSION_STATE.TERMINATED;
            this.currentSession = null;
            
            // Emit termination event
            this.emitEvent('session:terminated', { sessionId, reason });
            
            logger.info('Session terminated', { sessionId, reason });
        } catch (error) {
            logger.error('Failed to terminate session', { error: error.message });
        }
    }

    /**
     * Setup activity tracking
     */
    setupActivityTracking() {
        this.activityTracker.on('activity', () => {
            this.updateActivity();
        });
        
        this.activityTracker.start();
    }

    /**
     * Setup session monitoring
     */
    setupSessionMonitoring() {
        // Monitor page visibility
        if (this.config.ACTIVITY.TRACK_PAGE_VISIBILITY) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.emitEvent('session:hidden');
                } else {
                    this.updateActivity();
                    this.emitEvent('session:visible');
                }
            });
        }
        
        // Monitor page unload
        window.addEventListener('beforeunload', () => {
            if (this.currentSession) {
                this.updateActivity();
            }
        });
        
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.emitEvent('session:online');
            this.updateActivity();
        });
        
        window.addEventListener('offline', () => {
            this.emitEvent('session:offline');
        });
    }

    /**
     * Timer management
     */
    setTimer(name, callback, delay) {
        this.clearTimer(name);
        const timerId = setTimeout(callback, delay);
        this.timers.set(name, timerId);
    }

    clearTimer(name) {
        const timerId = this.timers.get(name);
        if (timerId) {
            clearTimeout(timerId);
            this.timers.delete(name);
        }
    }

    resetTimer(name) {
        const timerId = this.timers.get(name);
        if (timerId) {
            // Get the original delay (this is simplified)
            const delay = name === 'idle' ? this.config.TIMEOUT.IDLE : 
                         name === 'warning' ? this.config.TIMEOUT.IDLE - this.config.TIMEOUT.WARNING : 
                         this.config.TIMEOUT.GRACE_PERIOD;
            
            this.clearTimer(name);
            this.setTimer(name, () => {
                if (name === 'idle') this.handleIdleTimeout();
                else if (name === 'warning') this.handleWarningTimeout();
                else if (name === 'grace') this.terminateSession('idle_timeout');
            }, delay);
        }
    }

    clearAllTimers() {
        this.timers.forEach(timerId => clearTimeout(timerId));
        this.timers.clear();
    }

    /**
     * Event management
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emitEvent(event, data = {}) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    logger.error('Event listener error', { event, error: error.message });
                }
            });
        }
    }

    /**
     * Utility methods
     */
    async generateSessionId() {
        const randomBytes = CryptoUtils.getRandom(32);
        const timestamp = Date.now().toString(36);
        const random = CryptoUtils.bufferToBase64(randomBytes).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        return `sess_${timestamp}_${random}`;
    }

    async generateSecurityTokens() {
        return {
            csrf: CryptoUtils.bufferToBase64(CryptoUtils.getRandom(32)),
            fixation: CryptoUtils.bufferToBase64(CryptoUtils.getRandom(16)),
            timestamp: Date.now()
        };
    }

    async validateSecurityTokens() {
        // Simplified validation - in production, this would involve server-side checks
        if (!this.currentSession.securityTokens) {
            return false;
        }
        
        const tokenAge = Date.now() - this.currentSession.securityTokens.timestamp;
        const maxAge = this.config.SECURITY.SESSION_ROTATION_INTERVAL;
        
        return tokenAge < maxAge;
    }

    sanitizeUserData(userData) {
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        const sanitized = { ...userData };
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    async getClientIP() {
        // In a real implementation, this would come from the server
        // For demo purposes, we'll return a placeholder
        return 'client_ip_placeholder';
    }

    async getDeviceFingerprint() {
        // Simplified device fingerprinting
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('fingerprint', 2, 2);
            return canvas.toDataURL().substring(0, 100);
        }
        return 'unknown';
    }

    getSessionIdFromStorage() {
        return this.sessionStorage.getItem('current_session_id');
    }

    /**
     * Public API methods
     */
    getSession() {
        return this.currentSession;
    }

    getState() {
        return this.state;
    }

    isActive() {
        return this.state === SESSION_STATE.ACTIVE && this.currentSession;
    }

    async extendSession() {
        if (!this.currentSession) {
            return false;
        }
        
        this.currentSession.expiresAt = Date.now() + this.config.TIMEOUT.ABSOLUTE;
        this.currentSession.lastActivity = Date.now();
        await this.storeSession(this.currentSession);
        this.setupSessionTimers();
        
        this.emitEvent('session:extended');
        logger.info('Session extended', { sessionId: this.currentSession.id });
        
        return true;
    }
}

/**
 * Activity Tracker class
 */
class ActivityTracker {
    constructor(config) {
        this.config = config;
        this.eventListeners = new Map();
        this.lastActivity = Date.now();
        this.isTracking = false;
    }

    start() {
        if (this.isTracking) {
            return;
        }
        
        this.isTracking = true;
        
        // Track keyboard input
        if (this.config.TRACK_KEYBOARD_INPUT) {
            document.addEventListener('keydown', this.handleActivity);
        }
        
        // Track mouse movement
        if (this.config.TRACK_MOUSE_MOVEMENT) {
            let mouseTimer;
            document.addEventListener('mousemove', () => {
                if (!mouseTimer) {
                    mouseTimer = setTimeout(() => {
                        this.handleActivity();
                        mouseTimer = null;
                    }, 1000); // Throttle to once per second
                }
            });
        }
        
        // Track network activity
        if (this.config.TRACK_NETWORK_ACTIVITY) {
            // Override fetch to track activity
            const originalFetch = window.fetch;
            window.fetch = (...args) => {
                this.handleActivity();
                return originalFetch.apply(window, args);
            };
        }
    }

    stop() {
        this.isTracking = false;
        document.removeEventListener('keydown', this.handleActivity);
    }

    handleActivity = () => {
        if (!this.isTracking) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastActivity > 1000) { // Throttle to once per second
            this.lastActivity = now;
            this.emit('activity');
        }
    };

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data = {}) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }
}

/**
 * Create global session manager instance
 */
export const sessionManager = new SessionManager();

export default {
    SessionManager,
    ActivityTracker,
    sessionManager,
    SESSION_CONFIG,
    SESSION_STATE
};
