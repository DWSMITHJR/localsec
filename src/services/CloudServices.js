// src/services/CloudServices.js
import SecurityUtils from '../utils/SecurityUtils.js';
import CryptoUtils from '../utils/CryptoUtils.js';
export class CloudServices {
    // Rate limiting for authentication attempts
    static authRateLimit = new Map();
    static RATE_LIMIT_CONFIG = {
        WINDOW_MS: 300000, // 5 minutes
        MAX_ATTEMPTS: 5,
        BLOCK_DURATION: 900000 // 15 minutes
    };

    // Token blacklist for revoked tokens
    static tokenBlacklist = new Set();
    
    // OAuth configuration with enhanced security
    static oauth = {
        google: {
            clientId: 'your-google-client-id', // Replace with actual client ID
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.profile'],
            redirectUri: window.location.origin
        },
        microsoft: {
            clientId: 'your-microsoft-client-id', // Replace with actual client ID
            scopes: ['https://graph.microsoft.com/Files.ReadWrite', 'https://graph.microsoft.com/User.Read'],
            redirectUri: window.location.origin
        },
        lastpass: {
            clientId: 'your-lastpass-client-id', // Replace with actual client ID
            scopes: ['vault:read', 'vault:write', 'account:read'],
            redirectUri: window.location.origin
        },
        roboform: {
            clientId: 'your-roboform-client-id', // Replace with actual client ID
            scopes: ['passwords:read', 'passwords:write', 'identity:read'],
            redirectUri: window.location.origin
        }
    };

    // OAuth authentication flow with enhanced security
    static async authenticate(provider) {
        // Rate limiting check
        const rateLimitKey = `auth_${provider}_${window.location.hostname}`;
        if (this.checkRateLimit(rateLimitKey)) {
            throw new Error('Too many authentication attempts. Please try again later.');
        }

        // Validate provider
        const config = this.oauth[provider];
        if (!config) {
            SecurityUtils.auditLog.log('unsupported_provider_attempt', { provider }, 'security');
            throw new Error(`Unsupported provider: ${provider}`);
        }

        // Generate secure state parameter
        const state = this.generateSecureState();
        const authUrl = this.buildAuthUrl(provider, config, state);
        
        // Store state securely for validation
        this.secureStorage.set(`auth_state_${provider}`, state, 300000); // 5 minutes TTL
        const authWindow = window.open(
            authUrl,
            'auth',
            'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        return new Promise((resolve, reject) => {
            const checkClosed = setInterval(() => {
                if (authWindow.closed) {
                    clearInterval(checkClosed);
                    reject(new Error('Authentication cancelled'));
                }
            }, 1000);

            window.addEventListener('message', (event) => {
                // Validate origin and message integrity
                if (event.origin !== window.location.origin) {
                    console.warn('Rejected message from unauthorized origin:', event.origin);
                    SecurityUtils.auditLog.log('unauthorized_origin', { origin: event.origin }, 'security');
                    return;
                }

                // Validate message structure
                if (!event.data || typeof event.data !== 'object') {
                    console.warn('Invalid message structure:', event.data);
                    SecurityUtils.auditLog.log('invalid_message_structure', { data: event.data }, 'security');
                    return;
                }

                // Sanitize message type
                const messageType = SecurityUtils.sanitizeInput(event.data.type, 50);
                const messageState = SecurityUtils.sanitizeInput(event.data.credentials?.state, 128);
                
                // Validate state parameter to prevent CSRF
                const storedState = this.secureStorage.get(`auth_state_${provider}`);
                if (!storedState || storedState !== messageState) {
                    SecurityUtils.auditLog.log('state_validation_failed', { 
                        provider, 
                        received: messageState, 
                        expected: storedState 
                    }, 'security');
                    clearInterval(checkClosed);
                    authWindow.close();
                    reject(new Error('Invalid authentication state. Possible CSRF attack detected.'));
                    return;
                }
                
                if (messageType === 'auth_success') {
                    clearInterval(checkClosed);
                    authWindow.close();
                    
                    // Sanitize and validate credentials
                    const credentials = {
                        code: SecurityUtils.sanitizeInput(event.data.credentials?.code, 1000),
                        state: messageState
                    };

                    // Validate authorization code format
                    if (!this.validateAuthCode(credentials.code)) {
                        SecurityUtils.auditLog.log('invalid_auth_code', { provider }, 'security');
                        reject(new Error('Invalid authorization code format'));
                        return;
                    }

                    // Clear stored state
                    this.secureStorage.delete(`auth_state_${provider}`);
                    
                    resolve(credentials);
                } else if (messageType === 'auth_error') {
                    clearInterval(checkClosed);
                    authWindow.close();
                    
                    // Sanitize error message
                    const errorMessage = SecurityUtils.sanitizeInput(event.data.error, 500);
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    static buildAuthUrl(provider, config, state) {
        // Validate inputs
        if (!provider || !config || !state) {
            throw new Error('Invalid parameters for auth URL building');
        }
        switch (provider) {
            case 'google': {
                const googleParams = new URLSearchParams({
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    response_type: 'code',
                    scope: config.scopes.join(' '),
                    access_type: 'offline',
                    prompt: 'consent',
                    state: state,
                    code_challenge: this.generatePKCEChallenge(),
                    code_challenge_method: 'S256'
                });
                return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams}`;
            }
            case 'microsoft': {
                const microsoftParams = new URLSearchParams({
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    response_type: 'code',
                    scope: config.scopes.join(' '),
                    state: Math.random().toString(36)
                });
                return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${microsoftParams}`;
            }
            case 'lastpass': {
                const lastpassParams = new URLSearchParams({
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    response_type: 'code',
                    scope: config.scopes.join(' '),
                    state: Math.random().toString(36)
                });
                return `https://lastpass.com/oauth2/authorize?${lastpassParams}`;
            }
            case 'roboform': {
                const roboformParams = new URLSearchParams({
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    response_type: 'code',
                    scope: config.scopes.join(' '),
                    state: Math.random().toString(36)
                });
                return `https://roboform.com/oauth2/authorize?${roboformParams}`;
            }
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    // Google Drive API integration
    static googleDrive = {
        async authenticate() {
            try {
                const credentials = await CloudServices.authenticate('google');
                const tokens = await CloudServices.exchangeCodeForToken('google', credentials.code);

                // Store tokens securely
                const serviceCredential = {
                    provider: 'google',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: Date.now() + (tokens.expires_in * 1000),
                    userInfo: await CloudServices.getUserInfo('google', tokens.access_token)
                };

                return serviceCredential;
            } catch (e) {
                console.error('Google authentication failed:', e);
                throw e;
            }
        },

        async listFiles(accessToken) {
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Google Drive API error: ${response.status}`);
            }

            return await response.json();
        },

        async uploadFile(accessToken, fileName, content, parentId = 'root') {
            const metadata = {
                name: fileName,
                parents: [parentId]
            };

            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            formData.append('file', new Blob([content], {type: 'text/plain'}));

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            return await response.json();
        },

        async downloadFile(accessToken, fileId) {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            return await response.text();
        }
    };

    // OneNote API integration
    static oneNote = {
        async authenticate() {
            try {
                const credentials = await CloudServices.authenticate('microsoft');
                const tokens = await CloudServices.exchangeCodeForToken('microsoft', credentials.code);

                const serviceCredential = {
                    provider: 'onenote',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: Date.now() + (tokens.expires_in * 1000),
                    userInfo: await CloudServices.getUserInfo('microsoft', tokens.access_token)
                };

                return serviceCredential;
            } catch (e) {
                console.error('OneNote authentication failed:', e);
                throw e;
            }
        },

        async listNotebooks(accessToken) {
            const response = await fetch('https://graph.microsoft.com/v1.0/me/onenote/notebooks', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`OneNote API error: ${response.status}`);
            }

            return await response.json();
        },

        async createPage(accessToken, notebookId, sectionId, pageName, content) {
            const pageData = {
                title: pageName,
                content: content
            };

            const response = await fetch(`https://graph.microsoft.com/v1.0/me/onenote/notebooks/${notebookId}/sections/${sectionId}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pageData)
            });

            if (!response.ok) {
                throw new Error(`Page creation failed: ${response.status}`);
            }

            return await response.json();
        },

        async getPageContent(accessToken, pageId) {
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/onenote/pages/${pageId}/content`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Get page failed: ${response.status}`);
            }

            return await response.text();
        }
    };

    // LastPass API integration
    static lastpass = {
        async authenticate() {
            try {
                const credentials = await CloudServices.authenticate('lastpass');
                const tokens = await CloudServices.exchangeCodeForToken('lastpass', credentials.code);

                const serviceCredential = {
                    provider: 'lastpass',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: Date.now() + (tokens.expires_in * 1000),
                    userInfo: await CloudServices.getUserInfo('lastpass', tokens.access_token)
                };

                return serviceCredential;
            } catch (e) {
                console.error('LastPass authentication failed:', e);
                throw e;
            }
        },

        async getPasswords(accessToken) {
            const response = await fetch('https://lastpass.com/api/v1/passwords', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`LastPass API error: ${response.status}`);
            }

            return await response.json();
        },

        async getPassword(accessToken, passwordId) {
            const response = await fetch(`https://lastpass.com/api/v1/passwords/${passwordId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Get password failed: ${response.status}`);
            }

            return await response.json();
        },

        async createPassword(accessToken, passwordData) {
            const response = await fetch('https://lastpass.com/api/v1/passwords', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(passwordData)
            });

            if (!response.ok) {
                throw new Error(`Password creation failed: ${response.status}`);
            }

            return await response.json();
        },

        async updatePassword(accessToken, passwordId, passwordData) {
            const response = await fetch(`https://lastpass.com/api/v1/passwords/${passwordId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(passwordData)
            });

            if (!response.ok) {
                throw new Error(`Password update failed: ${response.status}`);
            }

            return await response.json();
        },

        async deletePassword(accessToken, passwordId) {
            const response = await fetch(`https://lastpass.com/api/v1/passwords/${passwordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Password deletion failed: ${response.status}`);
            }

            return true;
        }
    };

    // RoboForm API integration
    static roboform = {
        async authenticate() {
            try {
                const credentials = await CloudServices.authenticate('roboform');
                const tokens = await CloudServices.exchangeCodeForToken('roboform', credentials.code);

                const serviceCredential = {
                    provider: 'roboform',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: Date.now() + (tokens.expires_in * 1000),
                    userInfo: await CloudServices.getUserInfo('roboform', tokens.access_token)
                };

                return serviceCredential;
            } catch (e) {
                console.error('RoboForm authentication failed:', e);
                throw e;
            }
        },

        async getPasswords(accessToken) {
            const response = await fetch('https://roboform.com/api/v1/passwords', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`RoboForm API error: ${response.status}`);
            }

            return await response.json();
        },

        async getPassword(accessToken, passwordId) {
            const response = await fetch(`https://roboform.com/api/v1/passwords/${passwordId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Get password failed: ${response.status}`);
            }

            return await response.json();
        },

        async createPassword(accessToken, passwordData) {
            const response = await fetch('https://roboform.com/api/v1/passwords', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(passwordData)
            });

            if (!response.ok) {
                throw new Error(`Password creation failed: ${response.status}`);
            }

            return await response.json();
        },

        async updatePassword(accessToken, passwordId, passwordData) {
            const response = await fetch(`https://roboform.com/api/v1/passwords/${passwordId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(passwordData)
            });

            if (!response.ok) {
                throw new Error(`Password update failed: ${response.status}`);
            }

            return await response.json();
        },

        async deletePassword(accessToken, passwordId) {
            const response = await fetch(`https://roboform.com/api/v1/passwords/${passwordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Password deletion failed: ${response.status}`);
            }

            return true;
        },

        async getIdentity(accessToken) {
            const response = await fetch('https://roboform.com/api/v1/identity', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Identity fetch failed: ${response.status}`);
            }

            return await response.json();
        },

        async updateIdentity(accessToken, identityData) {
            const response = await fetch('https://roboform.com/api/v1/identity', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(identityData)
            });

            if (!response.ok) {
                throw new Error(`Identity update failed: ${response.status}`);
            }

            return await response.json();
        }
    };

    // Token management
    static async exchangeCodeForToken(provider, code) {
        const config = this.oauth[provider];
        let tokenEndpoint;
        
        switch (provider) {
            case 'google':
                tokenEndpoint = 'https://oauth2.googleapis.com/token';
                break;
            case 'microsoft':
                tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
                break;
            case 'lastpass':
                tokenEndpoint = 'https://lastpass.com/oauth2/token';
                break;
            case 'roboform':
                tokenEndpoint = 'https://roboform.com/oauth2/token';
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret || (() => {
                    throw new Error('Client secret must be provided in config for production use');
                })(),
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: config.redirectUri
            })
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        return await response.json();
    }

    static async getUserInfo(provider, accessToken) {
        let endpoint;
        
        switch (provider) {
            case 'google':
                endpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
                break;
            case 'microsoft':
                endpoint = 'https://graph.microsoft.com/v1.0/me';
                break;
            case 'lastpass':
                endpoint = 'https://lastpass.com/api/v1/account';
                break;
            case 'roboform':
                endpoint = 'https://roboform.com/api/v1/account';
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`User info fetch failed: ${response.status}`);
        }

        return await response.json();
    }

    // File synchronization between services
    static async syncFileBetweenServices(sourceCredential, targetCredential, fileName, content) {
        try {
            let result = { success: false, errors: [] };

            // Upload to Google Drive
            if (sourceCredential.provider === 'google' || targetCredential.provider === 'google') {
                try {
                    const googleToken = await this.getValidToken(sourceCredential.provider === 'google' ? sourceCredential : targetCredential);
                    await this.googleDrive.uploadFile(googleToken, fileName, content);
                    result.googleDrive = { success: true };
                } catch (e) {
                    result.errors.push(`Google Drive: ${e.message}`);
                    result.googleDrive = { success: false, error: e.message };
                }
            }

            // Upload to OneNote
            if (sourceCredential.provider === 'onenote' || targetCredential.provider === 'onenote') {
                try {
                    const oneNoteToken = await this.getValidToken(sourceCredential.provider === 'onenote' ? sourceCredential : targetCredential);
                    // For OneNote, we'll create a page with the content
                    const notebooks = await this.oneNote.listNotebooks(oneNoteToken);
                    if (notebooks.value && notebooks.value.length > 0) {
                        const sections = await this.getSections(oneNoteToken, notebooks.value[0].id);
                        if (sections.value && sections.value.length > 0) {
                            await this.oneNote.createPage(oneNoteToken, notebooks.value[0].id, sections.value[0].id, fileName, content);
                            result.oneNote = { success: true };
                        }
                    }
                } catch (e) {
                    result.errors.push(`OneNote: ${e.message}`);
                    result.oneNote = { success: false, error: e.message };
                }
            }

            // Sync to LastPass (as secure note)
            if (sourceCredential.provider === 'lastpass' || targetCredential.provider === 'lastpass') {
                try {
                    const lastpassToken = await this.getValidToken(sourceCredential.provider === 'lastpass' ? sourceCredential : targetCredential);
                    const passwordData = {
                        name: fileName,
                        username: 'synced_file',
                        password: '', // Empty password for secure note
                        url: '',
                        note: content,
                        group: 'Synced Files'
                    };
                    await this.lastpass.createPassword(lastpassToken, passwordData);
                    result.lastpass = { success: true };
                } catch (e) {
                    result.errors.push(`LastPass: ${e.message}`);
                    result.lastpass = { success: false, error: e.message };
                }
            }

            // Sync to RoboForm (as safe note)
            if (sourceCredential.provider === 'roboform' || targetCredential.provider === 'roboform') {
                try {
                    const roboformToken = await this.getValidToken(sourceCredential.provider === 'roboform' ? sourceCredential : targetCredential);
                    const passwordData = {
                        name: fileName,
                        username: 'synced_file',
                        password: '', // Empty password for safe note
                        url: '',
                        note: content,
                        folder: 'Synced Files'
                    };
                    await this.roboform.createPassword(roboformToken, passwordData);
                    result.roboform = { success: true };
                } catch (e) {
                    result.errors.push(`RoboForm: ${e.message}`);
                    result.roboform = { success: false, error: e.message };
                }
            }

            result.success = result.errors.length === 0;
            return result;
        } catch (e) {
            console.error('Sync operation failed:', e);
            throw e;
        }
    }

    static async getValidToken(credential) {
        // Check if token is expired and refresh if needed
        if (Date.now() >= credential.expiresAt) {
            // Token refresh logic would go here
            // For now, return the current token
            return credential.accessToken;
        }
        return credential.accessToken;
    }

    // Security helper methods
    static checkRateLimit(key) {
        const now = Date.now();
        const attempts = this.authRateLimit.get(key) || { count: 0, resetTime: now + this.RATE_LIMIT_CONFIG.WINDOW_MS };
        
        // Reset window if expired
        if (now > attempts.resetTime) {
            attempts.count = 0;
            attempts.resetTime = now + this.RATE_LIMIT_CONFIG.WINDOW_MS;
        }
        
        // Check if blocked
        if (attempts.blockUntil && now < attempts.blockUntil) {
            return true; // Still blocked
        }
        
        // Increment counter
        attempts.count++;
        this.authRateLimit.set(key, attempts);
        
        // Block if exceeded
        if (attempts.count > this.RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
            attempts.blockUntil = now + this.RATE_LIMIT_CONFIG.BLOCK_DURATION;
            this.authRateLimit.set(key, attempts);
            SecurityUtils.auditLog.log('rate_limit_exceeded', { key, attempts: attempts.count }, 'security');
            return true;
        }
        
        return false;
    }

    static generateSecureState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static generatePKCEChallenge() {
        const verifier = this.generateSecureState();
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        return crypto.subtle.digest('SHA-256', data).then(digest => {
            return btoa(String.fromCharCode(...new Uint8Array(digest)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        });
    }

    static validateAuthCode(code) {
        // Basic validation for OAuth authorization codes
        if (!code || typeof code !== 'string') return false;
        
        // Authorization codes are typically 20-100 characters
        if (code.length < 20 || code.length > 100) return false;
        
        // Should only contain alphanumeric characters and some symbols
        return /^[a-zA-Z0-9\-_~.]+$/.test(code);
    }

    static isTokenBlacklisted(token) {
        return this.tokenBlacklist.has(token);
    }

    static blacklistToken(token) {
        this.tokenBlacklist.add(token);
        SecurityUtils.auditLog.log('token_blacklisted', { tokenHash: this.hashToken(token) }, 'security');
    }

    static hashToken(token) {
        // Create a hash of the token for logging (don't log the actual token)
        return token.substring(0, 8) + '...' + token.substring(token.length - 4);
    }

    // Secure storage wrapper with encryption
    static secureStorage = {
        set: async (key, value, ttl = 3600000) => {
            try {
                const encrypted = await CryptoUtils.encryptData(JSON.stringify({
                    value,
                    expires: Date.now() + ttl,
                    checksum: await CryptoUtils.calculateChecksum(JSON.stringify(value))
                }), 'secure_storage_key');
                localStorage.setItem(`secure_${key}`, encrypted);
            } catch (error) {
                console.error('Failed to store secure data:', error);
                SecurityUtils.auditLog.log('secure_storage_error', { key, error: error.message }, 'security');
            }
        },

        get: async (key) => {
            try {
                const encrypted = localStorage.getItem(`secure_${key}`);
                if (!encrypted) return null;

                const decrypted = await CryptoUtils.decryptData(encrypted, 'secure_storage_key');
                const data = JSON.parse(decrypted);
                
                if (Date.now() > data.expires) {
                    localStorage.removeItem(`secure_${key}`);
                    return null;
                }

                // Verify checksum
                const currentChecksum = await CryptoUtils.calculateChecksum(JSON.stringify(data.value));
                if (currentChecksum !== data.checksum) {
                    SecurityUtils.auditLog.log('storage_tampering_detected', { key }, 'security');
                    localStorage.removeItem(`secure_${key}`);
                    return null;
                }

                return data.value;
            } catch (error) {
                console.error('Failed to retrieve secure data:', error);
                SecurityUtils.auditLog.log('secure_storage_retrieve_error', { key, error: error.message }, 'security');
                return null;
            }
        },

        delete: (key) => {
            localStorage.removeItem(`secure_${key}`);
        }
    };

    static async getSections(accessToken, notebookId) {
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/onenote/notebooks/${notebookId}/sections`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Get sections failed: ${response.status}`);
        }

        return await response.json();
    }
}

export default CloudServices;
