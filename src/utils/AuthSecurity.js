/**
 * Authentication Rate Limiting and Security
 * Provides rate limiting, brute force protection, and authentication security
 */

import { RateLimiter } from './ValidationUtils.js';
import { SecureStorage } from './SecureStorage.js';

/**
 * Authentication security configuration
 */
const AUTH_CONFIG = {
    // Rate limiting settings
    RATE_LIMITS: {
        login: {
            maxAttempts: 5,
            windowMs: 15 * 60 * 1000, // 15 minutes
            blockDuration: 30 * 60 * 1000 // 30 minutes block
        },
        passwordReset: {
            maxAttempts: 3,
            windowMs: 60 * 60 * 1000, // 1 hour
            blockDuration: 60 * 60 * 1000 // 1 hour block
        },
        registration: {
            maxAttempts: 3,
            windowMs: 60 * 60 * 1000, // 1 hour
            blockDuration: 60 * 60 * 1000 // 1 hour block
        },
        api: {
            maxRequests: 100,
            windowMs: 60 * 1000 // 1 minute
        }
    },
    // Security features
    ENABLE_IP_TRACKING: true,
    ENABLE_USER_AGENT_TRACKING: true,
    ENABLE_DEVICE_FINGERPRINTING: true,
    ENABLE_PROGRESSIVE_DELAY: true,
    ENABLE_CAPTCHA_AFTER_FAILURES: 3,
    // Storage keys
    STORAGE_PREFIX: 'auth_security_'
};

/**
 * Device fingerprinting utility
 */
class DeviceFingerprint {
    static async generate() {
        try {
            const components = [];
            
            // Browser information
            components.push(navigator.userAgent);
            components.push(navigator.language);
            components.push(navigator.languages?.join(',') || '');
            
            // Screen information
            components.push(screen.width);
            components.push(screen.height);
            components.push(screen.colorDepth);
            
            // Timezone
            components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
            
            // Canvas fingerprint
            if (document.createElement) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.textBaseline = 'top';
                    ctx.font = '14px Arial';
                    ctx.fillText('Device fingerprint', 2, 2);
                    components.push(canvas.toDataURL());
                }
            }
            
            // WebGL fingerprint
            if (window.WebGLRenderingContext) {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    components.push(gl.getParameter(gl.VENDOR));
                    components.push(gl.getParameter(gl.RENDERER));
                }
            }
            
            // Hash the components
            const combined = components.join('|');
            const encoder = new TextEncoder();
            const data = encoder.encode(combined);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            
            // Convert to hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('[DeviceFingerprint] Failed to generate fingerprint:', error);
            return null;
        }
    }
}

/**
 * Authentication security manager
 */
export class AuthSecurityManager {
    constructor(storageKey = null) {
        this.storage = new SecureStorage('localStorage', storageKey);
        this.rateLimiters = new Map();
        this.blockList = new Map();
        this.failureCounts = new Map();
        this.deviceFingerprint = null;
        
        this.initializeRateLimiters();
        this.initializeDeviceFingerprint();
    }

    /**
     * Initialize rate limiters for different auth actions
     */
    initializeRateLimiters() {
        Object.entries(AUTH_CONFIG.RATE_LIMITS).forEach(([action, config]) => {
            this.rateLimiters.set(action, new RateLimiter(config.maxAttempts, config.windowMs));
        });
    }

    /**
     * Initialize device fingerprint
     */
    async initializeDeviceFingerprint() {
        if (AUTH_CONFIG.ENABLE_DEVICE_FINGERPRINTING) {
            this.deviceFingerprint = await DeviceFingerprint.generate();
        }
    }

    /**
     * Get identifier for rate limiting
     */
    getIdentifier(action, additionalData = {}) {
        const parts = [action];
        
        if (AUTH_CONFIG.ENABLE_IP_TRACKING) {
            // In a real implementation, you'd get the IP from server
            // For demo, we'll use a placeholder
            parts.push('client_ip');
        }
        
        if (AUTH_CONFIG.ENABLE_DEVICE_FINGERPRINTING && this.deviceFingerprint) {
            parts.push(this.deviceFingerprint);
        }
        
        if (AUTH_CONFIG.ENABLE_USER_AGENT_TRACKING) {
            parts.push(navigator.userAgent.substring(0, 100));
        }
        
        if (additionalData.userId) {
            parts.push(`user_${additionalData.userId}`);
        }
        
        if (additionalData.email) {
            parts.push(`email_${additionalData.email}`);
        }
        
        return parts.join('|');
    }

    /**
     * Check if action is allowed
     */
    async checkAllowed(action, additionalData = {}) {
        const identifier = this.getIdentifier(action, additionalData);
        
        // Check if blocked
        if (this.isBlocked(identifier)) {
            const blockInfo = this.blockList.get(identifier);
            const remainingTime = Math.ceil((blockInfo.until - Date.now()) / 1000);
            throw new Error(`Action blocked. Try again in ${remainingTime} seconds`);
        }
        
        // Check rate limit
        const rateLimiter = this.rateLimiters.get(action);
        if (!rateLimiter) {
            console.warn(`[AuthSecurity] No rate limiter configured for action: ${action}`);
            return true;
        }
        
        const result = rateLimiter.isAllowed(identifier);
        
        if (!result.allowed) {
            // Block the identifier
            const config = AUTH_CONFIG.RATE_LIMITS[action];
            this.block(identifier, config.blockDuration);
            throw new Error(`Rate limit exceeded. Try again later`);
        }
        
        return result;
    }

    /**
     * Record successful authentication
     */
    recordSuccess(action, additionalData = {}) {
        const identifier = this.getIdentifier(action, additionalData);
        
        // Reset failure count
        this.failureCounts.delete(identifier);
        
        // Remove from block list if exists
        if (this.blockList.has(identifier)) {
            this.blockList.delete(identifier);
        }
        
        console.info(`[AuthSecurity] Success recorded for ${action}: ${identifier}`);
    }

    /**
     * Record failed authentication attempt
     */
    async recordFailure(action, additionalData = {}) {
        const identifier = this.getIdentifier(action, additionalData);
        
        // Increment failure count
        const currentCount = (this.failureCounts.get(identifier) || 0) + 1;
        this.failureCounts.set(identifier, currentCount);
        
        // Store failure details
        const failure = {
            action,
            timestamp: Date.now(),
            count: currentCount,
            identifier,
            additionalData: { ...additionalData }
        };
        
        await this.storage.setItem(`failure_${identifier}`, failure);
        
        console.warn(`[AuthSecurity] Failure recorded for ${action}: ${identifier} (count: ${currentCount})`);
        
        // Check if should block
        if (currentCount >= AUTH_CONFIG.RATE_LIMITS[action].maxAttempts) {
            const config = AUTH_CONFIG.RATE_LIMITS[action];
            this.block(identifier, config.blockDuration);
        }
        
        // Check if should show captcha
        if (currentCount >= AUTH_CONFIG.ENABLE_CAPTCHA_AFTER_FAILURES) {
            return { showCaptcha: true, failureCount: currentCount };
        }
        
        return { showCaptcha: false, failureCount: currentCount };
    }

    /**
     * Block identifier for specified duration
     */
    block(identifier, duration) {
        const until = Date.now() + duration;
        this.blockList.set(identifier, { until, reason: 'rate_limit_exceeded' });
        
        console.warn(`[AuthSecurity] Blocked ${identifier} until ${new Date(until).toISOString()}`);
    }

    /**
     * Check if identifier is blocked
     */
    isBlocked(identifier) {
        const blockInfo = this.blockList.get(identifier);
        if (!blockInfo) {
            return false;
        }
        
        if (Date.now() > blockInfo.until) {
            // Block expired, remove it
            this.blockList.delete(identifier);
            return false;
        }
        
        return true;
    }

    /**
     * Get remaining block time
     */
    getBlockRemainingTime(identifier) {
        const blockInfo = this.blockList.get(identifier);
        if (!blockInfo) {
            return 0;
        }
        
        return Math.max(0, blockInfo.until - Date.now());
    }

    /**
     * Get failure count for identifier
     */
    getFailureCount(action, additionalData = {}) {
        const identifier = this.getIdentifier(action, additionalData);
        return this.failureCounts.get(identifier) || 0;
    }

    /**
     * Get security statistics
     */
    async getSecurityStats() {
        const stats = {
            totalFailures: 0,
            blockedCount: this.blockList.size,
            rateLimitStats: {},
            recentFailures: []
        };
        
        // Count total failures
        for (const count of this.failureCounts.values()) {
            stats.totalFailures += count;
        }
        
        // Rate limiter stats
        this.rateLimiters.forEach((limiter, action) => {
            stats.rateLimitStats[action] = {
                maxRequests: limiter.maxRequests,
                windowMs: limiter.windowMs,
                activeRequests: limiter.requests.size || 0
            };
        });
        
        // Recent failures (last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (let i = 0; i < this.storage.storage.length; i++) {
            const key = this.storage.storage.key(i);
            if (key && key.startsWith('failure_')) {
                try {
                    const failure = await this.storage.getItem(key);
                    if (failure && failure.timestamp > oneHourAgo) {
                        stats.recentFailures.push(failure);
                    }
                } catch (error) {
                    // Ignore errors reading failures
                }
            }
        }
        
        return stats;
    }

    /**
     * Clear security data for identifier
     */
    async clearSecurityData(action, additionalData = {}) {
        const identifier = this.getIdentifier(action, additionalData);
        
        // Remove from all tracking
        this.failureCounts.delete(identifier);
        this.blockList.delete(identifier);
        
        // Remove from rate limiters
        this.rateLimiters.forEach(limiter => {
            limiter.reset(identifier);
        });
        
        // Remove stored failures
        await this.storage.removeItem(`failure_${identifier}`);
        
        console.info(`[AuthSecurity] Security data cleared for: ${identifier}`);
    }

    /**
     * Export security data for analysis
     */
    async exportSecurityData() {
        const data = {
            timestamp: Date.now(),
            stats: await this.getSecurityStats(),
            failures: [],
            blocks: []
        };
        
        // Export failures
        for (let i = 0; i < this.storage.storage.length; i++) {
            const key = this.storage.storage.key(i);
            if (key && key.startsWith('failure_')) {
                try {
                    const failure = await this.storage.getItem(key);
                    if (failure) {
                        data.failures.push(failure);
                    }
                } catch (error) {
                    // Ignore errors
                }
            }
        }
        
        // Export blocks
        this.blockList.forEach((blockInfo, identifier) => {
            data.blocks.push({
                identifier,
                until: blockInfo.until,
                reason: blockInfo.reason,
                remainingTime: this.getBlockRemainingTime(identifier)
            });
        });
        
        return data;
    }

    /**
     * Progressive delay for failed attempts
     */
    getProgressiveDelay(failureCount) {
        if (!AUTH_CONFIG.ENABLE_PROGRESSIVE_DELAY) {
            return 0;
        }
        
        // Exponential backoff: 2^failureCount seconds, max 30 seconds
        const delay = Math.min(Math.pow(2, failureCount) * 1000, 30000);
        return delay;
    }

    /**
     * Check if progressive delay should be applied
     */
    async checkProgressiveDelay(action, additionalData = {}) {
        const failureCount = this.getFailureCount(action, additionalData);
        const delay = this.getProgressiveDelay(failureCount);
        
        if (delay > 0) {
            console.warn(`[AuthSecurity] Applying progressive delay: ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return delay;
    }
}

/**
 * Authentication middleware wrapper
 */
export function withAuthSecurity(authSecurityManager, action) {
    return async (additionalData = {}, ...args) => {
        try {
            // Check rate limit first
            await authSecurityManager.checkAllowed(action, additionalData);
            
            // Check progressive delay
            await authSecurityManager.checkProgressiveDelay(action, additionalData);
            
            // Execute the actual authentication function
            const result = await authenticateUser(action, additionalData, ...args);
            
            // Record success
            authSecurityManager.recordSuccess(action, additionalData);
            
            return result;
        } catch (error) {
            // Record failure
            const failureInfo = await authSecurityManager.recordFailure(action, additionalData);
            
            // Re-throw with additional context
            throw {
                ...error,
                failureCount: failureInfo.failureCount,
                showCaptcha: failureInfo.showCaptcha,
                blocked: authSecurityManager.isBlocked(
                    authSecurityManager.getIdentifier(action, additionalData)
                )
            };
        }
    };
}

/**
 * Mock authentication function (replace with actual implementation)
 */
async function authenticateUser(action, additionalData) {
    // This would be your actual authentication logic
    // For demo purposes, we'll simulate success/failure
    if (additionalData.simulateFailure) {
        throw new Error('Authentication failed');
    }
    
    return { success: true, user: { id: 1, email: additionalData.email } };
}

/**
 * Create global auth security instance
 */
export const authSecurity = new AuthSecurityManager();

export default {
    AuthSecurityManager,
    DeviceFingerprint,
    withAuthSecurity,
    authSecurity,
    AUTH_CONFIG
};
