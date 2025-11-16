/**
 * Content Security Policy and Security Headers Implementation
 * Provides CSP configuration and security header utilities
 */

// Default CSP policy for the application
export const DEFAULT_CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // Temporary: remove 'unsafe-eval' in production
  'style-src': ["'self'", "'unsafe-inline'"], // Required for themer.js CSS manipulation
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://api.github.com'],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'frame-src': ["'none'"],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': []
};

// Production CSP policy (stricter)
export const PRODUCTION_CSP_POLICY = {
  ...DEFAULT_CSP_POLICY,
  'script-src': ["'self'"], // Remove unsafe-eval
  'style-src': ["'self'"], // Remove unsafe-inline when possible
  'require-trusted-types-for': ["'script'"]
};

/**
 * Converts CSP policy object to CSP header string
 * @param {Object} policy - CSP policy object
 * @returns {string} - CSP header string
 */
export function cspPolicyToString(policy) {
  return Object.entries(policy)
    .map(([directive, values]) => {
      const valueString = values.length > 0 ? ' ' + values.join(' ') : '';
      return `${directive}${valueString};`;
    })
    .join(' ');
}

/**
 * Applies CSP header via meta tag
 * @param {Object} policy - CSP policy object
 * @param {boolean} isProduction - Whether to use production policy
 */
export function applyCSP(policy = DEFAULT_CSP_POLICY, isProduction = false) {
  const cspPolicy = isProduction ? PRODUCTION_CSP_POLICY : policy;
  const cspString = cspPolicyToString(cspPolicy);
  
  // Remove existing CSP meta tags
  const existingCspTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
  existingCspTags.forEach(tag => tag.remove());
  
  // Create and insert new CSP meta tag
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = cspString;
  
  // Insert at the beginning of head for early enforcement
  const head = document.head;
  if (head.firstChild) {
    head.insertBefore(meta, head.firstChild);
  } else {
    head.appendChild(meta);
  }
  
  console.info('[Security] CSP applied:', cspString);
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Applies security headers via meta tags where possible
 * Note: Some headers can only be set server-side
 */
export function applySecurityHeaders() {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    // Skip headers that must be set server-side
    if (header === 'Strict-Transport-Security') {
      console.warn(`[Security] ${header} must be set server-side via HTTPS`);
      return;
    }
    
    // Convert header name to meta http-equiv format
    const httpEquiv = header.replace(/-/g, '-');
    
    // Remove existing meta tags for this header
    const existingTags = document.querySelectorAll(`meta[http-equiv="${httpEquiv}"]`);
    existingTags.forEach(tag => tag.remove());
    
    // Create and insert new meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = httpEquiv;
    meta.content = value;
    document.head.appendChild(meta);
    
    console.info(`[Security] Header applied: ${header}=${value}`);
  });
}

/**
 * Trusted Types policy for DOM manipulation
 */
export function setupTrustedTypes() {
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      const policy = window.trustedTypes.createPolicy('default', {
        createHTML: (string) => {
          // Basic HTML sanitization
          return string.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        },
        createScript: (string) => {
          // Allow only specific safe scripts
          if (string.includes('eval(') || string.includes('Function(')) {
            throw new Error('Unsafe script content detected');
          }
          return string;
        },
        createScriptURL: (url) => {
          // Validate script URLs
          const allowedOrigins = [window.location.origin];
          const urlObj = new URL(url, window.location.origin);
          
          if (!allowedOrigins.includes(urlObj.origin)) {
            throw new Error('Script URL not allowed');
          }
          
          return url;
        }
      });
      
      console.info('[Security] Trusted Types policy created');
      return policy;
    } catch (error) {
      console.error('[Security] Failed to create Trusted Types policy:', error);
    }
  }
}

/**
 * Feature detection for security APIs
 */
export function detectSecurityFeatures() {
  const features = {
    trustedTypes: !!window.trustedTypes,
    crypto: !!window.crypto && !!window.crypto.subtle,
    secureContext: window.isSecureContext || location.protocol === 'https:',
    serviceWorker: !!navigator.serviceWorker,
    webAuthn: !!navigator.credentials && !!navigator.credentials.create,
    reporting: !!window.ReportingObserver,
    permissions: !!navigator.permissions
  };
  
  console.info('[Security] Feature detection:', features);
  return features;
}

/**
 * Content Security Report Collector
 */
export class CSPReportCollector {
  constructor() {
    this.reports = [];
    this.setupReportObserver();
  }
  
  setupReportObserver() {
    if (window.ReportingObserver) {
      const observer = new window.ReportingObserver(
        (reports) => {
          reports.forEach(report => {
            this.handleReport(report);
          });
        },
        { buffered: true }
      );
      
      observer.observe();
      console.info('[Security] CSP report collector initialized');
    } else {
      console.warn('[Security] ReportingObserver not supported');
    }
  }
  
  handleReport(report) {
    const reportData = {
      type: report.type,
      url: report.url,
      timestamp: Date.now(),
      body: report.body
    };
    
    this.reports.push(reportData);
    
    // Log CSP violations
    if (report.type === 'csp-violation') {
      console.error('[Security] CSP Violation:', reportData);
    }
    
    // Report to server in production
    if (process.env.NODE_ENV === 'production') {
      this.reportToServer(reportData);
    }
  }
  
  async reportToServer(reportData) {
    try {
      await fetch('/api/security/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
    } catch (error) {
      console.error('[Security] Failed to report to server:', error);
    }
  }
  
  getReports() {
    return this.reports;
  }
  
  clearReports() {
    this.reports = [];
  }
}

/**
 * Initialize all security configurations
 */
export function initializeSecurity(options = {}) {
  const {
    isProduction = process.env.NODE_ENV === 'production',
    enableCSP = true,
    enableSecurityHeaders = true,
    enableTrustedTypes = true,
    enableReportCollector = true
  } = options;
  
  console.info('[Security] Initializing security configurations...');
  
  // Detect security features
  detectSecurityFeatures();
  
  // Apply CSP
  if (enableCSP) {
    applyCSP(DEFAULT_CSP_POLICY, isProduction);
  }
  
  // Apply security headers
  if (enableSecurityHeaders) {
    applySecurityHeaders();
  }
  
  // Setup Trusted Types
  if (enableTrustedTypes) {
    setupTrustedTypes();
  }
  
  // Setup report collector
  let reportCollector = null;
  if (enableReportCollector) {
    reportCollector = new CSPReportCollector();
  }
  
  console.info('[Security] Security initialization complete');
  
  return {
    reportCollector,
    updateCSP: (policy) => applyCSP(policy, isProduction)
  };
}

export default {
  DEFAULT_CSP_POLICY,
  PRODUCTION_CSP_POLICY,
  cspPolicyToString,
  applyCSP,
  SECURITY_HEADERS,
  applySecurityHeaders,
  setupTrustedTypes,
  detectSecurityFeatures,
  CSPReportCollector,
  initializeSecurity
};
