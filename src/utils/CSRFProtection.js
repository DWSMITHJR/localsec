/**
 * CSRF Protection and Security Headers
 * Provides Cross-Site Request Forgery protection and security headers management
 */

import { CryptoUtils } from './CryptoUtils.js';
import { SecureStorage } from './SecureStorage.js';
import { logger } from './ErrorBoundary.js';
import { sessionManager } from './SessionManager.js';

/**
 * CSRF configuration
 */
const CSRF_CONFIG = {
    // Token settings
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
    TOKEN_ROTATION_INTERVAL: 30 * 60 * 1000, // 30 minutes
    MAX_TOKENS_PER_SESSION: 5,
    
    // Protection methods
    ENABLE_DOUBLE_SUBMIT: true,
    ENABLE_SAME_SITE: true,
    ENABLE_ORIGIN_CHECK: true,
    ENABLE_REFERER_CHECK: false, // Often unreliable due to privacy settings
    
    // Header names
    HEADER_NAME: 'X-CSRF-Token',
    META_NAME: 'csrf-token',
    
    // Storage
    STORAGE_KEY: 'csrf_tokens',
    
    // Protected methods
    PROTECTED_METHODS: ['POST', 'PUT', 'DELETE', 'PATCH'],
    
    // Safe methods (don't require CSRF protection)
    SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS'],
    
    // Content types that require protection
    PROTECTED_CONTENT_TYPES: [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
    ]
};

/**
 * Security Headers configuration
 */
const SECURITY_HEADERS_CONFIG = {
    // Content Security Policy
    CSP: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"]
    },
    
    // Other security headers
    HEADERS: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin'
    }
};

/**
 * CSRF Protection Manager
 */
export class CSRFProtection {
    constructor(config = {}) {
        this.config = { ...CSRF_CONFIG, ...config };
        this.storage = new SecureStorage('sessionStorage', 'csrf_protection_key');
        this.tokens = new Map();
        this.rotationTimer = null;
        
        this.initializeCSRFProtection();
    }

    /**
     * Initialize CSRF protection
     */
    async initializeCSRFProtection() {
        try {
            // Load existing tokens
            await this.loadTokens();
            
            // Setup token rotation
            this.setupTokenRotation();
            
            // Setup request interception
            this.setupRequestInterception();
            
            // Setup form protection
            this.setupFormProtection();
            
            logger.info('CSRF protection initialized');
        } catch (error) {
            logger.error('Failed to initialize CSRF protection', { error: error.message });
        }
    }

    /**
     * Generate CSRF token
     */
    async generateToken() {
        try {
            const randomBytes = CryptoUtils.getRandom(this.config.TOKEN_LENGTH);
            const timestamp = Date.now();
            const sessionId = sessionManager.getSession()?.id || 'anonymous';
            
            const tokenData = {
                token: CryptoUtils.bufferToBase64(randomBytes),
                timestamp,
                sessionId,
                usage: 0,
                maxUsage: 1 // Single use tokens by default
            };
            
            // Create token signature
            const signature = await this.createTokenSignature(tokenData);
            tokenData.signature = signature;
            
            return tokenData;
        } catch (error) {
            logger.error('Failed to generate CSRF token', { error: error.message });
            throw error;
        }
    }

    /**
     * Create token signature
     */
    async createTokenSignature(tokenData) {
        const data = `${tokenData.token}:${tokenData.timestamp}:${tokenData.sessionId}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        return CryptoUtils.bufferToBase64(hashBuffer);
    }

    /**
     * Verify token signature
     */
    async verifyTokenSignature(tokenData) {
        if (!tokenData.signature) {
            return false;
        }
        
        const expectedSignature = await this.createTokenSignature(tokenData);
        return tokenData.signature === expectedSignature;
    }

    /**
     * Get current CSRF token
     */
    async getCurrentToken() {
        // Find a valid token
        for (const [tokenId, tokenData] of this.tokens) {
            if (await this.isTokenValid(tokenData)) {
                return { tokenId, ...tokenData };
            }
        }
        
        // Generate new token if none valid
        const newToken = await this.generateToken();
        const tokenId = this.generateTokenId();
        this.tokens.set(tokenId, newToken);
        await this.saveTokens();
        
        return { tokenId, ...newToken };
    }

    /**
     * Generate token ID
     */
    generateTokenId() {
        return 'csrf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if token is valid
     */
    async isTokenValid(tokenData) {
        // Check expiry
        if (Date.now() - tokenData.timestamp > this.config.TOKEN_EXPIRY) {
            return false;
        }
        
        // Check usage limit
        if (tokenData.usage >= tokenData.maxUsage) {
            return false;
        }
        
        // Check session
        const currentSession = sessionManager.getSession();
        if (currentSession && tokenData.sessionId !== currentSession.id) {
            return false;
        }
        
        // Verify signature
        return await this.verifyTokenSignature(tokenData);
    }

    /**
     * Validate CSRF token for request
     */
    async validateToken(token, tokenId) {
        try {
            if (!token || !tokenId) {
                return false;
            }
            
            const storedToken = this.tokens.get(tokenId);
            if (!storedToken) {
                return false;
            }
            
            // Check if token matches
            if (storedToken.token !== token) {
                return false;
            }
            
            // Validate token
            if (!(await this.isTokenValid(storedToken))) {
                return false;
            }
            
            // Increment usage
            storedToken.usage++;
            await this.saveTokens();
            
            // Remove single-use tokens
            if (storedToken.usage >= storedToken.maxUsage) {
                this.tokens.delete(tokenId);
                await this.saveTokens();
            }
            
            return true;
        } catch (error) {
            logger.error('CSRF token validation failed', { error: error.message });
            return false;
        }
    }

    /**
     * Setup request interception
     */
    setupRequestInterception() {
        // Override fetch
        const originalFetch = window.fetch;
        window.fetch = async (input, init = {}) => {
            const request = new Request(input, init);
            
            if (this.requiresProtection(request)) {
                const isValid = await this.validateRequest(request);
                if (!isValid) {
                    throw new Error('CSRF validation failed');
                }
            }
            
            return originalFetch.call(window, input, init);
        };
        
        // Override XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._method = method.toUpperCase();
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...args]);
        };
        
        XMLHttpRequest.prototype.send = async function(body) {
            if (this._method && this.requiresProtectionForMethod(this._method)) {
                const isValid = await this.validateXHROnly(this);
                if (!isValid) {
                    throw new Error('CSRF validation failed');
                }
            }
            
            return originalXHRSend.apply(this, [body]);
        };
    }

    /**
     * Check if request requires CSRF protection
     */
    requiresProtection(request) {
        const method = request.method.toUpperCase();
        
        // Check method
        if (this.config.SAFE_METHODS.includes(method)) {
            return false;
        }
        
        // Check if it's same-origin
        if (!this.isSameOrigin(request.url)) {
            return false;
        }
        
        // Check content type
        const contentType = request.headers.get('content-type');
        if (contentType && !this.config.PROTECTED_CONTENT_TYPES.some(type => 
            contentType.toLowerCase().includes(type.toLowerCase()))) {
            return false;
        }
        
        return true;
    }

    /**
     * Check if method requires protection
     */
    requiresProtectionForMethod(method) {
        return this.config.PROTECTED_METHODS.includes(method.toUpperCase());
    }

    /**
     * Validate request
     */
    async validateRequest(request) {
        // Get token from header
        const token = request.headers.get(this.config.HEADER_NAME);
        
        // Get token ID from custom header or body
        const tokenId = request.headers.get('X-CSRF-Token-ID') || 
                       await this.extractTokenIdFromBody(request);
        
        return await this.validateToken(token, tokenId);
    }

    /**
     * Validate XMLHttpRequest
     */
    async validateXHROnOnly(xhr) {
        // Get token from header
        const token = xhr.getRequestHeader?.(this.config.HEADER_NAME);
        
        // For simplicity, we'll use a fallback method
        if (!token) {
            // Try to get from request headers (limited in XHR)
            return false;
        }
        
        // Get current token and validate
        const currentToken = await this.getCurrentToken();
        return token === currentToken.token;
    }

    /**
     * Extract token ID from request body
     */
    async extractTokenIdFromBody(request) {
        try {
            const contentType = request.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                const body = await request.clone().json();
                return body.csrfTokenId;
            } else if (contentType.includes('x-www-form-urlencoded')) {
                const body = await request.clone().text();
                const params = new URLSearchParams(body);
                return params.get('csrfTokenId');
            }
        } catch (error) {
            // Failed to parse body
        }
        
        return null;
    }

    /**
     * Check if URL is same-origin
     */
    isSameOrigin(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.origin === window.location.origin;
        } catch (error) {
            return false;
        }
    }

    /**
     * Setup form protection
     */
    setupFormProtection() {
        // Add CSRF tokens to all forms
        document.addEventListener('DOMContentLoaded', () => {
            this.protectAllForms();
        });
        
        // Monitor for dynamically added forms
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'FORM') {
                            this.protectForm(node);
                        } else {
                            const forms = node.querySelectorAll?.('form') || [];
                            forms.forEach(form => this.protectForm(form));
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Protect all forms on page
     */
    async protectAllForms() {
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            await this.protectForm(form);
        }
    }

    /**
     * Protect individual form
     */
    async protectForm(form) {
        try {
            // Skip if already protected
            if (form.querySelector(`input[name="${this.config.META_NAME}"]`)) {
                return;
            }
            
            // Get current token
            const tokenData = await this.getCurrentToken();
            
            // Add hidden input for token
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = this.config.META_NAME;
            tokenInput.value = tokenData.token;
            form.appendChild(tokenInput);
            
            // Add token ID input
            const tokenIdInput = document.createElement('input');
            tokenIdInput.type = 'hidden';
            tokenInput.name = 'csrfTokenId';
            tokenIdInput.value = tokenData.tokenId;
            form.appendChild(tokenIdInput);
            
            logger.debug('Form protected with CSRF token', { form: form.action });
        } catch (error) {
            logger.error('Failed to protect form', { error: error.message });
        }
    }

    /**
     * Setup token rotation
     */
    setupTokenRotation() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
        
        this.rotationTimer = setInterval(async () => {
            await this.rotateTokens();
        }, this.config.TOKEN_ROTATION_INTERVAL);
    }

    /**
     * Rotate tokens
     */
    async rotateTokens() {
        try {
            // Remove expired tokens
            for (const [tokenId, tokenData] of this.tokens) {
                if (!(await this.isTokenValid(tokenData))) {
                    this.tokens.delete(tokenId);
                }
            }
            
            // Limit number of tokens
            if (this.tokens.size > this.config.MAX_TOKENS_PER_SESSION) {
                const sortedTokens = Array.from(this.tokens.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                const toRemove = sortedTokens.slice(0, this.tokens.size - this.config.MAX_TOKENS_PER_SESSION);
                toRemove.forEach(([tokenId]) => this.tokens.delete(tokenId));
            }
            
            await this.saveTokens();
            logger.debug('CSRF tokens rotated');
        } catch (error) {
            logger.error('Failed to rotate CSRF tokens', { error: error.message });
        }
    }

    /**
     * Save tokens to storage
     */
    async saveTokens() {
        try {
            const tokensArray = Array.from(this.tokens.entries());
            await this.storage.setItem(this.config.STORAGE_KEY, tokensArray);
        } catch (error) {
            logger.error('Failed to save CSRF tokens', { error: error.message });
        }
    }

    /**
     * Load tokens from storage
     */
    async loadTokens() {
        try {
            const tokensArray = await this.storage.getItem(this.config.STORAGE_KEY) || [];
            this.tokens = new Map(tokensArray);
        } catch (error) {
            logger.error('Failed to load CSRF tokens', { error: error.message });
            this.tokens = new Map();
        }
    }

    /**
     * Clear all tokens
     */
    async clearTokens() {
        this.tokens.clear();
        await this.storage.removeItem(this.config.STORAGE_KEY);
        logger.info('CSRF tokens cleared');
    }
}

/**
 * Security Headers Manager
 */
export class SecurityHeadersManager {
    constructor(config = {}) {
        this.config = { ...SECURITY_HEADERS_CONFIG, ...config };
        this.appliedHeaders = new Set();
        
        this.initializeSecurityHeaders();
    }

    /**
     * Initialize security headers
     */
    initializeSecurityHeaders() {
        this.applyCSP();
        this.applySecurityHeaders();
        this.setupHeaderMonitoring();
        
        logger.info('Security headers initialized');
    }

    /**
     * Apply Content Security Policy
     */
    applyCSP() {
        const cspDirectives = [];
        
        for (const [directive, sources] of Object.entries(this.config.CSP)) {
            const value = sources.join(' ');
            cspDirectives.push(`${directive} ${value}`);
        }
        
        const cspValue = cspDirectives.join('; ');
        this.addMetaTag('Content-Security-Policy', cspValue);
        this.appliedHeaders.add('Content-Security-Policy');
    }

    /**
     * Apply security headers via meta tags
     */
    applySecurityHeaders() {
        for (const [header, value] of Object.entries(this.config.HEADERS)) {
            this.addMetaTag(header, value);
            this.appliedHeaders.add(header);
        }
    }

    /**
     * Add meta tag for header
     */
    addMetaTag(httpEquiv, content) {
        // Remove existing meta tag if present
        const existing = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
        if (existing) {
            existing.remove();
        }
        
        // Create new meta tag
        const meta = document.createElement('meta');
        meta.httpEquiv = httpEquiv;
        meta.content = content;
        
        // Add to head
        const head = document.head || document.getElementsByTagName('head')[0];
        if (head) {
            head.appendChild(meta);
        }
    }

    /**
     * Setup header monitoring
     */
    setupHeaderMonitoring() {
        // Monitor for CSP violations
        if (window.ReportingObserver) {
            const observer = new ReportingObserver((reports) => {
                reports.forEach(report => {
                    if (report.type === 'csp-violation') {
                        logger.warn('CSP violation detected', report.body);
                    }
                });
            });
            
            observer.observe();
        }
        
        // Check if headers are properly applied
        setTimeout(() => {
            this.validateHeaders();
        }, 1000);
    }

    /**
     * Validate applied headers
     */
    validateHeaders() {
        const missingHeaders = [];
        
        for (const header of this.appliedHeaders) {
            const meta = document.querySelector(`meta[http-equiv="${header}"]`);
            if (!meta) {
                missingHeaders.push(header);
            }
        }
        
        if (missingHeaders.length > 0) {
            logger.warn('Missing security headers', { missingHeaders });
        } else {
            logger.info('All security headers applied successfully');
        }
    }

    /**
     * Get current security configuration
     */
    getSecurityConfig() {
        return {
            appliedHeaders: Array.from(this.appliedHeaders),
            cspConfig: this.config.CSP,
            headersConfig: this.config.HEADERS
        };
    }
}

/**
 * Create global instances
 */
export const csrfProtection = new CSRFProtection();
export const securityHeaders = new SecurityHeadersManager();

export default {
    CSRFProtection,
    SecurityHeadersManager,
    csrfProtection,
    securityHeaders,
    CSRF_CONFIG,
    SECURITY_HEADERS_CONFIG
};
