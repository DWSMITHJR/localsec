/**
 * Security Headers and Secure Defaults
 * Comprehensive security headers implementation with secure defaults
 */

import { logger } from './ErrorBoundary.js';

/**
 * Security Headers Configuration
 */
const SECURITY_HEADERS_DEFAULTS = {
    // Content Security Policy
    'Content-Security-Policy': {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': []
    },
    
    // Transport Security
    'Strict-Transport-Security': {
        'max-age': '31536000',
        'includeSubDomains': '',
        'preload': ''
    },
    
    // Content Type Protection
    'X-Content-Type-Options': 'nosniff',
    
    // Frame Protection
    'X-Frame-Options': 'DENY',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': {
        'accelerometer': '()',
        'ambient-light-sensor': '()',
        'autoplay': '()',
        'battery': '()',
        'camera': '()',
        'cross-origin-isolated': '()',
        'display-capture': '()',
        'document-domain': '()',
        'encrypted-media': '()',
        'execution-while-out-of-viewport': '()',
        'execution-while-not-rendered': '()',
        'fullscreen': '()',
        'geolocation': '()',
        'gyroscope': '()',
        'hid': '()',
        'identity-credentials-get': '()',
        'idle-detection': '()',
        'local-fonts': '()',
        'magnetometer': '()',
        'microphone': '()',
        'midi': '()',
        'otp-credentials': '()',
        'payment': '()',
        'picture-in-picture': '()',
        'publickey-credentials-get': '()',
        'screen-wake-lock': '()',
        'serial': '()',
        'storage-access': '()',
        'usb': '()',
        'web-share': '()',
        'window-management': '()',
        'xr-spatial-tracking': '()'
    },
    
    // Cross-Origin Policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Cache Control
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
};

/**
 * Production-specific security headers
 */
const PRODUCTION_SECURITY_HEADERS = {
    ...SECURITY_HEADERS_DEFAULTS,
    'Content-Security-Policy': {
        ...SECURITY_HEADERS_DEFAULTS['Content-Security-Policy'],
        'script-src': ["'self'"], // Remove unsafe-inline in production
        'style-src': ["'self'"], // Remove unsafe-inline in production
        'report-uri': ['/csp-violation-report-endpoint']
    },
    'Strict-Transport-Security': {
        'max-age': '31536000',
        'includeSubDomains': '',
        'preload': ''
    }
};

/**
 * Security Headers Manager
 */
export class SecurityHeadersManager {
    constructor(options = {}) {
        this.options = {
            isProduction: process?.env?.NODE_ENV === 'production' || false,
            enableReporting: true,
            reportEndpoint: '/api/security-headers-report',
            customHeaders: {},
            ...options
        };
        
        this.appliedHeaders = new Set();
        this.violationReports = [];
        this.isInitialized = false;
        
        this.initialize();
    }

    /**
     * Initialize security headers
     */
    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Apply security headers
            this.applySecurityHeaders();
            
            // Setup monitoring
            this.setupMonitoring();
            
            // Setup CSP violation reporting
            if (this.options.enableReporting) {
                this.setupCSPReporting();
            }
            
            // Validate headers
            this.validateHeaders();
            
            this.isInitialized = true;
            logger.info('Security headers initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize security headers', { error: error.message });
        }
    }

    /**
     * Apply security headers
     */
    applySecurityHeaders() {
        const headers = this.options.isProduction ? 
            PRODUCTION_SECURITY_HEADERS : 
            SECURITY_HEADERS_DEFAULTS;
        
        // Apply custom headers
        const allHeaders = { ...headers, ...this.options.customHeaders };
        
        for (const [headerName, headerValue] of Object.entries(allHeaders)) {
            this.applyHeader(headerName, headerValue);
        }
    }

    /**
     * Apply individual header
     */
    applyHeader(headerName, headerValue) {
        try {
            let processedValue;
            
            if (typeof headerValue === 'object' && headerValue !== null) {
                processedValue = this.processHeaderValue(headerName, headerValue);
            } else {
                processedValue = headerValue;
            }
            
            // Create meta tag
            const meta = document.createElement('meta');
            meta.httpEquiv = headerName;
            meta.content = processedValue;
            
            // Remove existing meta tag
            const existing = document.querySelector(`meta[http-equiv="${headerName}"]`);
            if (existing) {
                existing.replaceWith(meta);
            } else {
                document.head.appendChild(meta);
            }
            
            this.appliedHeaders.add(headerName);
            logger.debug(`Applied security header: ${headerName}`);
        } catch (error) {
            logger.error(`Failed to apply header ${headerName}`, { error: error.message });
        }
    }

    /**
     * Process header value based on type
     */
    processHeaderValue(headerName, headerValue) {
        switch (headerName) {
            case 'Content-Security-Policy':
                return this.processCSPHeader(headerValue);
            case 'Strict-Transport-Security':
                return this.processHSTSHeader(headerValue);
            case 'Permissions-Policy':
                return this.processPermissionsHeader(headerValue);
            default:
                return String(headerValue);
        }
    }

    /**
     * Process CSP header
     */
    processCSPHeader(cspConfig) {
        const directives = [];
        
        for (const [directive, sources] of Object.entries(cspConfig)) {
            if (Array.isArray(sources)) {
                const value = sources.join(' ');
                directives.push(`${directive} ${value}`.trim());
            }
        }
        
        return directives.join('; ');
    }

    /**
     * Process HSTS header
     */
    processHSTSHeader(hstsConfig) {
        const parts = [];
        
        if (hstsConfig['max-age']) {
            parts.push(`max-age=${hstsConfig['max-age']}`);
        }
        
        if (hstsConfig['includeSubDomains']) {
            parts.push('includeSubDomains');
        }
        
        if (hstsConfig['preload']) {
            parts.push('preload');
        }
        
        return parts.join('; ');
    }

    /**
     * Process Permissions Policy header
     */
    processPermissionsHeader(permissionsConfig) {
        const permissions = [];
        
        for (const [feature, value] of Object.entries(permissionsConfig)) {
            permissions.push(`${feature}=${value}`);
        }
        
        return permissions.join(', ');
    }

    /**
     * Setup monitoring
     */
    setupMonitoring() {
        // Monitor for header removal attempts
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.tagName === 'META' && 
                        node.httpEquiv) {
                        
                        const headerName = node.httpEquiv;
                        if (this.appliedHeaders.has(headerName)) {
                            logger.warn(`Security header removed: ${headerName}`, {
                                element: node.outerHTML
                            });
                            
                            // Re-apply the header
                            setTimeout(() => {
                                this.reapplyHeader(headerName);
                            }, 100);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.head, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Re-apply removed header
     */
    reapplyHeader(headerName) {
        const headers = this.options.isProduction ? 
            PRODUCTION_SECURITY_HEADERS : 
            SECURITY_HEADERS_DEFAULTS;
        
        const headerValue = headers[headerName] || this.options.customHeaders[headerName];
        
        if (headerValue) {
            this.applyHeader(headerName, headerValue);
            logger.info(`Re-applied security header: ${headerName}`);
        }
    }

    /**
     * Setup CSP violation reporting
     */
    setupCSPReporting() {
        // Use ReportingObserver if available
        if (window.ReportingObserver) {
            const observer = new ReportingObserver((reports) => {
                reports.forEach(report => {
                    this.handleViolationReport(report);
                });
            });
            
            observer.observe();
        }
        
        // Fallback to window.addEventListener for older browsers
        window.addEventListener('securitypolicyviolation', (event) => {
            this.handleCSPViolation(event);
        });
    }

    /**
     * Handle violation report
     */
    handleViolationReport(report) {
        const violation = {
            type: report.type,
            timestamp: Date.now(),
            url: report.body.url,
            blockedURL: report.body.blockedURL,
            violatedDirective: report.body.violatedDirective,
            effectiveDirective: report.body.effectiveDirective,
            originalPolicy: report.body.originalPolicy,
            referrer: report.body.referrer,
            sample: report.body.sample,
            sourceFile: report.body.sourceFile,
            lineNumber: report.body.lineNumber,
            columnNumber: report.body.columnNumber
        };
        
        this.violationReports.push(violation);
        this.logViolation(violation);
        
        // Send to server if configured
        if (this.options.reportEndpoint) {
            this.sendViolationReport(violation);
        }
    }

    /**
     * Handle CSP violation event
     */
    handleCSPViolation(event) {
        const violation = {
            type: 'csp-violation',
            timestamp: Date.now(),
            blockedURI: event.blockedURI,
            documentURI: event.documentURI,
            referrer: event.referrer,
            violatedDirective: event.violatedDirective,
            effectiveDirective: event.effectiveDirective,
            originalPolicy: event.originalPolicy,
            sourceFile: event.sourceFile,
            lineNumber: event.lineNumber,
            columnNumber: event.columnNumber,
            statusCode: event.statusCode
        };
        
        this.violationReports.push(violation);
        this.logViolation(violation);
        
        // Send to server if configured
        if (this.options.reportEndpoint) {
            this.sendViolationReport(violation);
        }
    }

    /**
     * Log violation
     */
    logViolation(violation) {
        logger.warn('Security header violation detected', violation);
    }

    /**
     * Send violation report to server
     */
    async sendViolationReport(violation) {
        try {
            await fetch(this.options.reportEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(violation)
            });
        } catch (error) {
            logger.error('Failed to send violation report', { 
                error: error.message,
                violation 
            });
        }
    }

    /**
     * Validate applied headers
     */
    validateHeaders() {
        const validationResults = {
            passed: [],
            failed: [],
            warnings: []
        };
        
        // Check each applied header
        this.appliedHeaders.forEach(headerName => {
            const meta = document.querySelector(`meta[http-equiv="${headerName}"]`);
            
            if (!meta) {
                validationResults.failed.push({
                    header: headerName,
                    reason: 'Meta tag not found'
                });
            } else if (!meta.content) {
                validationResults.failed.push({
                    header: headerName,
                    reason: 'Empty content'
                });
            } else {
                validationResults.passed.push(headerName);
            }
        });
        
        // Log validation results
        if (validationResults.failed.length > 0) {
            logger.error('Security header validation failed', validationResults.failed);
        } else {
            logger.info('All security headers validated successfully');
        }
        
        return validationResults;
    }

    /**
     * Get security status
     */
    getSecurityStatus() {
        return {
            isInitialized: this.isInitialized,
            appliedHeaders: Array.from(this.appliedHeaders),
            violationCount: this.violationReports.length,
            recentViolations: this.violationReports.slice(-10),
            validationResults: this.validateHeaders(),
            configuration: {
                isProduction: this.options.isProduction,
                enableReporting: this.options.enableReporting,
                customHeadersCount: Object.keys(this.options.customHeaders).length
            }
        };
    }

    /**
     * Add custom header
     */
    addCustomHeader(headerName, headerValue) {
        this.options.customHeaders[headerName] = headerValue;
        this.applyHeader(headerName, headerValue);
        logger.info(`Added custom security header: ${headerName}`);
    }

    /**
     * Remove header
     */
    removeHeader(headerName) {
        const meta = document.querySelector(`meta[http-equiv="${headerName}"]`);
        if (meta) {
            meta.remove();
            this.appliedHeaders.delete(headerName);
            logger.info(`Removed security header: ${headerName}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all headers
     */
    clearAllHeaders() {
        const metas = document.querySelectorAll('meta[http-equiv]');
        metas.forEach(meta => {
            if (this.appliedHeaders.has(meta.httpEquiv)) {
                meta.remove();
            }
        });
        
        this.appliedHeaders.clear();
        logger.warn('All security headers cleared');
    }

    /**
     * Export configuration
     */
    exportConfiguration() {
        return {
            appliedHeaders: Array.from(this.appliedHeaders),
            customHeaders: this.options.customHeaders,
            violationReports: this.violationReports,
            isProduction: this.options.isProduction,
            timestamp: Date.now()
        };
    }
}

/**
 * Secure Defaults Manager
 */
export class SecureDefaultsManager {
    constructor() {
        this.secureDefaults = {
            // Cookie settings
            cookies: {
                secure: true,
                httpOnly: true,
                sameSite: 'Strict',
                maxAge: 3600 // 1 hour
            },
            
            // Form defaults
            forms: {
                autocomplete: 'off',
                novalidate: true
            },
            
            // Input defaults
            inputs: {
                autocomplete: 'off',
                spellcheck: false
            },
            
            // Link defaults
            links: {
                rel: 'noopener noreferrer',
                target: '_blank'
            },
            
            // Iframe defaults
            iframes: {
                sandbox: 'allow-scripts allow-same-origin',
                loading: 'lazy'
            }
        };
        
        this.applySecureDefaults();
    }

    /**
     * Apply secure defaults to elements
     */
    applySecureDefaults() {
        this.applyFormDefaults();
        this.applyInputDefaults();
        this.applyLinkDefaults();
        this.applyIframeDefaults();
        
        logger.info('Secure defaults applied');
    }

    /**
     * Apply form defaults
     */
    applyFormDefaults() {
        const forms = document.querySelectorAll('form:not([data-secure-applied])');
        
        forms.forEach(form => {
            // Set autocomplete off
            if (!form.hasAttribute('autocomplete')) {
                form.setAttribute('autocomplete', this.secureDefaults.forms.autocomplete);
            }
            
            // Set novalidate
            if (!form.hasAttribute('novalidate')) {
                form.setAttribute('novalidate', this.secureDefaults.forms.novalidate);
            }
            
            form.setAttribute('data-secure-applied', 'true');
        });
    }

    /**
     * Apply input defaults
     */
    applyInputDefaults() {
        const inputs = document.querySelectorAll('input:not([data-secure-applied])');
        
        inputs.forEach(input => {
            // Skip certain input types
            if (['file', 'checkbox', 'radio'].includes(input.type)) {
                return;
            }
            
            // Set autocomplete off for sensitive fields
            if (['password', 'email', 'tel', 'credit-card'].includes(input.type) ||
                input.name?.toLowerCase().includes('password') ||
                input.name?.toLowerCase().includes('secret')) {
                
                if (!input.hasAttribute('autocomplete')) {
                    input.setAttribute('autocomplete', this.secureDefaults.inputs.autocomplete);
                }
            }
            
            // Set spellcheck off
            if (!input.hasAttribute('spellcheck')) {
                input.setAttribute('spellcheck', this.secureDefaults.inputs.spellcheck);
            }
            
            input.setAttribute('data-secure-applied', 'true');
        });
    }

    /**
     * Apply link defaults
     */
    applyLinkDefaults() {
        const links = document.querySelectorAll('a[href^="http"]:not([data-secure-applied])');
        
        links.forEach(link => {
            // Add security attributes for external links
            if (link.hostname !== window.location.hostname) {
                if (!link.hasAttribute('rel')) {
                    link.setAttribute('rel', this.secureDefaults.links.rel);
                }
                
                if (!link.hasAttribute('target')) {
                    link.setAttribute('target', this.secureDefaults.links.target);
                }
            }
            
            link.setAttribute('data-secure-applied', 'true');
        });
    }

    /**
     * Apply iframe defaults
     */
    applyIframeDefaults() {
        const iframes = document.querySelectorAll('iframe:not([data-secure-applied])');
        
        iframes.forEach(iframe => {
            // Set sandbox
            if (!iframe.hasAttribute('sandbox')) {
                iframe.setAttribute('sandbox', this.secureDefaults.iframes.sandbox);
            }
            
            // Set loading lazy
            if (!iframe.hasAttribute('loading')) {
                iframe.setAttribute('loading', this.secureDefaults.iframes.loading);
            }
            
            iframe.setAttribute('data-secure-applied', 'true');
        });
    }

    /**
     * Monitor for new elements
     */
    startMonitoring() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.applySecureDefaultsToElement(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        logger.info('Secure defaults monitoring started');
    }

    /**
     * Apply secure defaults to specific element
     */
    applySecureDefaultsToElement(element) {
        switch (element.tagName) {
            case 'FORM':
                this.applyFormDefaults();
                break;
            case 'INPUT':
                this.applyInputDefaults();
                break;
            case 'A':
                this.applyLinkDefaults();
                break;
            case 'IFRAME':
                this.applyIframeDefaults();
                break;
        }
        
        // Check child elements
        const forms = element.querySelectorAll?.('form:not([data-secure-applied])') || [];
        const inputs = element.querySelectorAll?.('input:not([data-secure-applied])') || [];
        const links = element.querySelectorAll?.('a[href^="http"]:not([data-secure-applied])') || [];
        const iframes = element.querySelectorAll?.('iframe:not([data-secure-applied])') || [];
        
        if (forms.length > 0) this.applyFormDefaults();
        if (inputs.length > 0) this.applyInputDefaults();
        if (links.length > 0) this.applyLinkDefaults();
        if (iframes.length > 0) this.applyIframeDefaults();
    }
}

/**
 * Create global instances
 */
export const securityHeadersManager = new SecurityHeadersManager();
export const secureDefaultsManager = new SecureDefaultsManager();

// Start monitoring for new elements
secureDefaultsManager.startMonitoring();

export default {
    SecurityHeadersManager,
    SecureDefaultsManager,
    securityHeadersManager,
    secureDefaultsManager,
    SECURITY_HEADERS_DEFAULTS,
    PRODUCTION_SECURITY_HEADERS
};
