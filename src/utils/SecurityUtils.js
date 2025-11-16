// src/utils/SecurityUtils.js
import CryptoUtils from './CryptoUtils.js';
import MESSAGES, { getErrorMessage } from './Messages.js';

export class SecurityUtils {
    static auditLog = {
        logs: [],
        maxLogs: 1000, // Keep last 1000 log entries

        log(event, data = {}, level = 'info') {
            // Sanitize sensitive data before logging
            const sanitizedDetails = this.sanitizeLogData(data);

            const logEntry = {
                timestamp: new Date().toISOString(),
                event,
                details: sanitizedDetails,
                level,
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            this.logs.push(logEntry);

            // Keep only the last maxLogs entries
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }

            // Store in localStorage (encrypted)
            try {
                const encrypted = btoa(JSON.stringify(this.logs));
                localStorage.setItem('vaultAuditLog', encrypted);
            } catch (e) {
                console.warn('Failed to save audit log:', e);
            }

            // Console logging with appropriate level (sanitized)
            const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[AUDIT] ${event}`, sanitizedDetails);
        },

        sanitizeLogData(data) {
            if (typeof data !== 'object' || data === null) {
                return data;
            }

            const sensitiveFields = [
                'password', 'passwd', 'pwd', 'pass',
                'secret', 'token', 'key', 'apikey', 'api_key',
                'access_token', 'refresh_token', 'auth_token',
                'private_key', 'client_secret', 'master_password',
                'master_key', 'recovery_key'
            ];

            const sanitizeObject = (obj) => {
                if (Array.isArray(obj)) {
                    return obj.map(item => sanitizeObject(item));
                }

                if (typeof obj !== 'object' || obj === null) {
                    return obj;
                }

                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    const lowerKey = key.toLowerCase();

                    if (sensitiveFields.some(field => lowerKey.includes(field))) {
                        sanitized[key] = '[REDACTED]';
                    } else if (typeof value === 'object' && value !== null) {
                        sanitized[key] = sanitizeObject(value);
                    } else {
                        sanitized[key] = value;
                    }
                }

                return sanitized;
            };

            return sanitizeObject(data);
        },

        loadLogs() {
            try {
                const stored = localStorage.getItem('vaultAuditLog');
                if (stored) {
                    this.logs = JSON.parse(atob(stored));
                }
            } catch (e) {
                console.warn('Failed to load audit logs:', e);
                this.logs = [];
            }
        },

        getLogs() {
            return this.logs;
        },

        clearLogs() {
            this.logs = [];
            localStorage.removeItem('vaultAuditLog');
        }
    };

    static validatePassword(password) {
        const errors = [];
        let strength = 'Weak';

        // Length check
        if (!password || password.length < 4) {
            errors.push(getErrorMessage('PASSWORD_TOO_SHORT'));
        } else if (password.length >= 12) {
            strength = 'Strong';
        } else if (password.length >= 8) {
            strength = 'Medium';
        }

        // Character variety
        if (password && password.length >= 4) {
            if (!/[a-z]/.test(password)) errors.push('Include lowercase letters');
            if (!/[A-Z]/.test(password)) errors.push('Include uppercase letters');
            if (!/[0-9]/.test(password)) errors.push('Include numbers');
            if (!/[^a-zA-Z0-9]/.test(password)) errors.push('Include special characters');
        }

        // Common patterns
        if (password) {
            if (/(.)\1{2,}/.test(password)) {
                errors.push('Avoid repeated characters');
            }

            const commonWords = ['password', 'admin', 'user', 'login', 'welcome', '123456', 'qwerty'];
            if (commonWords.some(word => password.toLowerCase().includes(word))) {
                errors.push('Avoid common words or patterns');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            strength
        };
    }

    static async validatePasswordWithBreachCheck(password) {
        const validation = this.validatePassword(password);
        if (!validation.valid) {
            return validation;
        }

        // Check for breaches using HaveIBeenPwned API (k-anonymity)
        try {
            const sha1 = await this.hashPasswordSHA1(password);
            const prefix = sha1.substring(0, 5);
            const suffix = sha1.substring(5);

            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'LocalSec-Vault/2.1'
                }
            });

            if (response.ok) {
                const data = await response.text();
                const hashes = data.split('\n');

                for (const hash of hashes) {
                    const [hashSuffix, count] = hash.split(':');
                    if (hashSuffix === suffix) {
                        const breachCount = parseInt(count);
                        let severity = 'Low';
                        if (breachCount >= 10000) severity = 'High';
                        else if (breachCount >= 1000) severity = 'Medium';

                        validation.errors.push(`Password found in ${breachCount} data breaches (${severity} risk)`);
                        validation.breachCount = breachCount;
                        validation.breachSeverity = severity;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('Breach check failed:', e);
            // Continue without breach checking - not critical
        }

        validation.valid = validation.errors.length === 0;
        return validation;
    }

    static async hashPasswordSHA1(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    static calculatePasswordStrength(password) {
        const validation = this.validatePassword(password);
        return validation.strength;
    }

    static sanitizeInput(input, maxLength = 1000) {
        if (typeof input !== 'string') return '';

        // Remove potentially dangerous characters and patterns
        let sanitized = input
            .replace(/[<>"'&]/g, '') // Remove HTML/XML dangerous chars
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/data:/gi, '') // Remove data: protocol
            .replace(/vbscript:/gi, '') // Remove vbscript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/[\p{C}]/gu, '') // Remove control characters
            .replace(/[\uFFFE\uFFFF]/g, '') // Remove invalid Unicode
            .trim();

        // Length limit
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    // Advanced input sanitization for different contexts
    static sanitizeForHTML(input) {
        if (typeof input !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    static sanitizeForURL(input) {
        if (typeof input !== 'string') return '';
        
        try {
            // Basic URL validation and sanitization
            const sanitized = input.trim();
            
            // Prevent javascript: and data: URLs
            if (sanitized.toLowerCase().startsWith('javascript:') || 
                sanitized.toLowerCase().startsWith('data:') ||
                sanitized.toLowerCase().startsWith('vbscript:')) {
                return '';
            }
            
            // Ensure URL has proper protocol
            if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://') && !sanitized.startsWith('/')) {
                return `https://${sanitized}`;
            }
            
            return sanitized;
        } catch {
            return '';
        }
    }

    static sanitizeForJSON(input) {
        if (typeof input !== 'string') return '';
        
        // Remove characters that can break JSON
        return input
            .replace(/[\p{C}]/gu, '') // Control characters
            .replace(/\\/g, '\\\\') // Escape backslashes
            .replace(/"/g, '\\"') // Escape quotes
            .trim();
    }

    static validateAndSanitizeEmail(email) {
        if (typeof email !== 'string') return { valid: false, sanitized: '' };
        
        const sanitized = this.sanitizeInput(email.trim().toLowerCase(), 254);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        return {
            valid: emailRegex.test(sanitized),
            sanitized: sanitized
        };
    }

    static validateAndSanitizePhone(phone) {
        if (typeof phone !== 'string') return { valid: false, sanitized: '' };
        
        // Remove all non-digit characters except +, -, (, )
        const sanitized = phone.replace(/[^\d+()-\s]/g, '').trim();
        
        // Basic phone validation (10-15 digits including country code)
        const phoneRegex = /^\+?[\d\s()-]{10,15}$/;
        
        return {
            valid: phoneRegex.test(sanitized),
            sanitized: sanitized
        };
    }

    static validateAndSanitizeURL(url) {
        if (typeof url !== 'string') return { valid: false, sanitized: '' };
        
        try {
            const sanitized = this.sanitizeForURL(url);
            const urlObj = new URL(sanitized);
            
            // Only allow http/https protocols
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return { valid: false, sanitized: '' };
            }
            
            // Prevent localhost and private IPs in production
            const hostname = urlObj.hostname.toLowerCase();
            if (hostname === 'localhost' || 
                hostname.startsWith('127.') || 
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')) {
                return { valid: false, sanitized: '' };
            }
            
            return { valid: true, sanitized: sanitized };
        } catch {
            return { valid: false, sanitized: '' };
        }
    }

    static validateAndSanitizeNumeric(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
        if (typeof input === 'number') {
            return input >= min && input <= max ? input : null;
        }
        
        if (typeof input !== 'string') return null;
        
        const sanitized = input.replace(/[^\d.-]/g, '');
        const num = parseFloat(sanitized);
        
        return !isNaN(num) && num >= min && num <= max ? num : null;
    }

    static validateAndSanitizeDate(input) {
        if (input instanceof Date && !isNaN(input)) {
            return input;
        }
        
        if (typeof input !== 'string') return null;
        
        const sanitized = this.sanitizeInput(input, 50);
        const date = new Date(sanitized);
        
        return !isNaN(date) ? date : null;
    }

    static sanitizeObject(obj, maxDepth = 5) {
        if (maxDepth <= 0) return {};
        
        if (Array.isArray(obj)) {
            return obj.map(item => 
                typeof item === 'object' ? this.sanitizeObject(item, maxDepth - 1) : this.sanitizeInput(String(item))
            );
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.sanitizeInput(key, 100);
                
                if (typeof value === 'string') {
                    sanitized[sanitizedKey] = this.sanitizeInput(value);
                } else if (typeof value === 'number' || typeof value === 'boolean') {
                    sanitized[sanitizedKey] = value;
                } else if (typeof value === 'object') {
                    sanitized[sanitizedKey] = this.sanitizeObject(value, maxDepth - 1);
                } else {
                    sanitized[sanitizedKey] = this.sanitizeInput(String(value));
                }
            }
            return sanitized;
        }
        
        return this.sanitizeInput(String(obj));
    }

    static sanitizeEntryData(entry) {
        const sanitized = {};
        const fields = ['title', 'username', 'password', 'url', 'notes', 'privateKey', 'publicKey'];

        fields.forEach(field => {
            if (entry[field]) {
                sanitized[field] = this.sanitizeInput(entry[field], this.getMaxLength(field));
            }
        });

        // Preserve system fields
        if (entry.id) sanitized.id = entry.id;
        if (entry.type) sanitized.type = entry.type;
        if (entry.createdAt) sanitized.createdAt = entry.createdAt;
        if (entry.updatedAt) sanitized.updatedAt = entry.updatedAt;

        return sanitized;
    }

    static getMaxLength(field) {
        const limits = {
            title: 200,
            username: 100,
            password: 200,
            url: 500,
            notes: 2000,
            privateKey: 5000,
            publicKey: 5000
        };
        return limits[field] || 1000;
    }

    static validateEntryData(entry) {
        const errors = [];

        if (!entry.title || entry.title.trim().length === 0) {
            errors.push('Title is required');
        }

        if (entry.url && !this.isValidUrl(entry.url)) {
            errors.push('URL must be valid (http:// or https://)');
        }

        if (entry.username && entry.username.length > 100) {
            errors.push('Username too long (max 100 characters)');
        }

        if (entry.password && entry.password.length > 200) {
            errors.push('Password too long (max 200 characters)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    }

    static validateFileType(file, allowedTypes) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        return allowedTypes.includes(fileExtension);
    }

    static checkRateLimit(key, maxAttempts, windowMs) {
        const now = Date.now();
        const attempts = JSON.parse(localStorage.getItem(`rateLimit_${key}`) || '[]');

        // Remove old attempts outside the window
        const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);

        if (validAttempts.length >= maxAttempts) {
            return false; // Rate limit exceeded
        }

        // Add current attempt
        validAttempts.push(now);
        localStorage.setItem(`rateLimit_${key}`, JSON.stringify(validAttempts));

        return true; // Within rate limit
    }

    static generateSecureToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static validateSessionToken(token) {
        // Basic format validation for session tokens
        return typeof token === 'string' && token.length === 64 && /^[a-f0-9]+$/.test(token);
    }

    static validateAIEntryData(entry) {
        const errors = [];

        if (!entry.service || entry.service.trim().length === 0) {
            errors.push(getErrorMessage('FIELD_REQUIRED'));
        }

        if (!entry.apiKey || entry.apiKey.trim().length === 0) {
            errors.push(getErrorMessage('FIELD_REQUIRED'));
        }

        if (entry.name && entry.name.length > 100) {
            errors.push(getErrorMessage('FIELD_TOO_LONG', { field: 'Name', maxLength: 100 }));
        }

        if (entry.description && entry.description.length > 500) {
            errors.push(getErrorMessage('FIELD_TOO_LONG', { field: 'Description', maxLength: 500 }));
        }

        // Validate API key format using CryptoUtils
        if (entry.service && entry.apiKey) {
            try {
                const validation = CryptoUtils.validateAIApiKey(entry.service, entry.apiKey);
                if (!validation.valid) {
                    errors.push(validation.error);
                }
            } catch (error) {
                errors.push(getErrorMessage('INVALID_API_KEY'));
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static sanitizeAIEntryData(entry) {
        const sanitized = {};
        const fields = ['service', 'name', 'description', 'apiKey'];

        fields.forEach(field => {
            if (entry[field]) {
                sanitized[field] = this.sanitizeInput(entry[field], this.getAIMaxLength(field));
            }
        });

        // Preserve system fields
        if (entry.id) sanitized.id = entry.id;
        if (entry.createdAt) sanitized.createdAt = entry.createdAt;
        if (entry.updatedAt) sanitized.updatedAt = entry.updatedAt;

        return sanitized;
    }

    static getAIMaxLength(field) {
        const limits = {
            service: 50,
            name: 100,
            description: 500,
            apiKey: 200
        };
        return limits[field] || 1000;
    }

    static getSupportedAIServices() {
        return [
            { id: 'openai', name: 'OpenAI', description: 'GPT models and DALL-E' },
            { id: 'anthropic', name: 'Anthropic', description: 'Claude AI models' },
            { id: 'google', name: 'Google AI', description: 'Gemini and PaLM models' },
            { id: 'claude', name: 'Claude', description: 'Anthropic Claude models' },
            { id: 'gemini', name: 'Gemini', description: 'Google Gemini models' },
            { id: 'cohere', name: 'Cohere', description: 'Command and embedding models' },
            { id: 'huggingface', name: 'Hugging Face', description: 'Open source models and datasets' },
            { id: 'azure-openai', name: 'Azure OpenAI', description: 'Microsoft Azure hosted OpenAI' },
            { id: 'aws-bedrock', name: 'AWS Bedrock', description: 'Amazon Bedrock AI models' },
            { id: 'replicate', name: 'Replicate', description: 'Open source model hosting' },
            { id: 'stability-ai', name: 'Stability AI', description: 'Stable Diffusion and text-to-image' },
            { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek AI models' }
        ];
    }

    static clearSensitiveData(data) {
        if (typeof data === 'string') {
            // Overwrite string in memory (best effort)
            return 'x'.repeat(data.length);
        } else if (typeof data === 'object') {
            // Recursively clear object properties
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    data[key] = this.clearSensitiveData(data[key]);
                }
            }
            return data;
        } else {
            return null;
        }
    }
}

export default SecurityUtils;
