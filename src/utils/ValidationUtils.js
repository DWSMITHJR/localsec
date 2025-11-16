/**
 * Input Validation and Sanitization Utilities
 * Provides centralized validation for user inputs and data
 */

// Security: XSS prevention patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /data:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /expression\s*\(/gi
];

// Security: SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /'|\\'|;|--|\s+(?:or|and)\s+.*(?:=|like)/gi,
  /(union\s+select)/gi,
  /(insert\s+into)/gi,
  /(delete\s+from)/gi,
  /(update\s+.+\s+set)/gi,
  /(drop\s+(table|database))/gi,
  /(exec(\s|\+)+(xp_|sp_))/gi
];

// Security: Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /\//g,
  /\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e\\/gi,
  /\.\.\/\.\.\//g
];

/**
 * Validates and sanitizes string input
 */
export function validateString(input, options = {}) {
  const {
    required = true,
    minLength = 0,
    maxLength = 1000,
    allowEmpty = false,
    trim = true,
    escapeHtml = true,
    removeScripts = true
  } = options;

  const errors = [];
  let sanitized = input;

  // Type check
  if (typeof input !== 'string') {
    errors.push('Input must be a string');
    return { isValid: false, sanitized: null, errors };
  }

  // Trim if requested
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Required validation
  if (required && (!allowEmpty && sanitized.length === 0)) {
    errors.push('Field is required');
  }

  // Length validation
  if (sanitized.length < minLength) {
    errors.push(`Minimum length is ${minLength} characters`);
  }
  if (sanitized.length > maxLength) {
    errors.push(`Maximum length is ${maxLength} characters`);
    sanitized = sanitized.substring(0, maxLength);
  }

  // XSS prevention
  if (removeScripts) {
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
  }

  // HTML escaping
  if (escapeHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validates email addresses
 */
export function validateEmail(email) {
  const errors = [];
  let sanitized = email;

  if (typeof email !== 'string') {
    errors.push('Email must be a string');
    return { isValid: false, sanitized: null, errors };
  }

  sanitized = sanitized.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    errors.push('Invalid email format');
  }

  // Length check
  if (sanitized.length > 254) {
    errors.push('Email is too long');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validates passwords with security requirements
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    minStrength = 3
  } = options;

  const errors = [];
  let strength = 0;

  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, strength: 0, errors };
  }

  // Length validation
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  if (password.length > maxLength) {
    errors.push(`Password must be less than ${maxLength} characters`);
  }

  // Character requirements
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    strength++;
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  } else if (/[a-z]/.test(password)) {
    strength++;
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain number');
  } else if (/\d/.test(password)) {
    strength++;
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>-]/.test(password)) {
    errors.push('Password must contain special character');
  }



  // Additional strength checks
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  if (!/(.)\1{2,}/.test(password)) strength++; // No 3+ repeating chars

  return {
    isValid: errors.length === 0 && strength >= minStrength,
    strength,
    errors
  };
}

/**
 * Validates URLs for security
 */
export function validateUrl(url, options = {}) {
  const { allowedProtocols = ['http:', 'https:'], allowRelative = true } = options;
  const errors = [];
  let sanitized = url;

  if (typeof url !== 'string') {
    errors.push('URL must be a string');
    return { isValid: false, sanitized: null, errors };
  }

  sanitized = sanitized.trim();

  try {
    const parsedUrl = new URL(sanitized, window.location.origin);
    
    // Protocol validation
    if (!allowRelative || !sanitized.startsWith('/')) {
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        errors.push(`Protocol not allowed: ${parsedUrl.protocol}`);
      }
    }

    // XSS prevention
    XSS_PATTERNS.forEach(pattern => {
      if (pattern.test(sanitized)) {
        errors.push('URL contains potentially dangerous content');
      }
    });

    return {
      isValid: errors.length === 0,
      sanitized: parsedUrl.toString(),
      errors
    };
  } catch (e) {
    errors.push('Invalid URL format');
    return { isValid: false, sanitized: null, errors };
  }
}

/**
 * Validates file names and paths for security
 */
export function validateFileName(fileName, options = {}) {
  const {
    allowedExtensions = [],
    maxLength = 255,
    allowPathTraversal = false
  } = options;

  const errors = [];
  let sanitized = fileName;

  if (typeof fileName !== 'string') {
    errors.push('File name must be a string');
    return { isValid: false, sanitized: null, errors };
  }

  sanitized = sanitized.trim();

  // Length validation
  if (sanitized.length > maxLength) {
    errors.push(`File name too long (max ${maxLength} characters)`);
  }

  // Path traversal prevention
  if (!allowPathTraversal) {
    PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
      if (pattern.test(sanitized)) {
        errors.push('Path traversal not allowed');
      }
    });
  }

  // Extension validation
  if (allowedExtensions.length > 0) {
    const extension = sanitized.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }
  }

  // Dangerous file names
  const dangerousNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
  const baseName = sanitized.split('.')[0].toLowerCase();
  if (dangerousNames.includes(baseName)) {
    errors.push('Reserved file name not allowed');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validates numeric input
 */
export function validateNumber(input, options = {}) {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    integer = false,
    required = true
  } = options;

  const errors = [];
  let sanitized = input;

  // Convert string to number if needed
  if (typeof input === 'string') {
    sanitized = parseFloat(input);
    if (isNaN(sanitized)) {
      errors.push('Must be a valid number');
      return { isValid: false, sanitized: null, errors };
    }
  }

  if (typeof sanitized !== 'number' || isNaN(sanitized)) {
    errors.push('Must be a number');
    return { isValid: false, sanitized: null, errors };
  }

  // Integer validation
  if (integer && !Number.isInteger(sanitized)) {
    errors.push('Must be an integer');
  }

  // Range validation
  if (sanitized < min) {
    errors.push(`Must be at least ${min}`);
  }
  if (sanitized > max) {
    errors.push(`Must be at most ${max}`);
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Sanitizes object keys and values recursively
 */
export function sanitizeObject(obj, options = {}) {
  const { maxDepth = 10, currentDepth = 0 } = options;
  
  if (currentDepth >= maxDepth) {
    return null; // Prevent infinite recursion
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const sanitizedKey = key.replace(/[^\w\-]/g, '');
    
    if (value === null || typeof value !== 'object') {
      // Sanitize primitive values
      if (typeof value === 'string') {
        const validation = validateString(value, { maxLength: 1000 });
        sanitized[sanitizedKey] = validation.sanitized;
      } else {
        sanitized[sanitizedKey] = value;
      }
    } else {
      // Recursively sanitize nested objects
      sanitized[sanitizedKey] = sanitizeObject(value, { ...options, currentDepth: currentDepth + 1 });
    }
  }

  return sanitized;
}

/**
 * Rate limiting utility for API calls and actions
 */
export class RateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(identifier = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requests = this.requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, validRequests);
    
    // Check if under limit
    if (validRequests.length < this.maxRequests) {
      validRequests.push(now);
      return { allowed: true, remaining: this.maxRequests - validRequests.length - 1 };
    }
    
    return { allowed: false, remaining: 0, resetTime: validRequests[0] + this.windowMs };
  }

  reset(identifier = 'default') {
    this.requests.delete(identifier);
  }
}

export default {
  validateString,
  validateEmail,
  validatePassword,
  validateUrl,
  validateFileName,
  validateNumber,
  sanitizeObject,
  RateLimiter
};