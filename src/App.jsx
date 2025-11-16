// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import SecurityUtils from './utils/SecurityUtils.js';
import CryptoUtils from './utils/CryptoUtils.js';
import Messages, { getErrorMessage, getSuccessMessage } from './utils/Messages.js';
import LoginScreen from './components/LoginScreen.jsx';
import VaultScreen from './components/VaultScreen.jsx';
import TabBar from './components/TabBar.jsx';
import ErrorBoundaryWrapper from './components/ErrorBoundaryWrapper.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import DeviceDetection from './utils/DeviceDetection.js';
import SecretValidator from './utils/SecretValidator.js';
import storageUtils from './utils/storageUtils.js';

// Import themer CSS and JS
import './styles/themer-config.css';
import './js/themer.js';

// --- VAULT STORAGE KEYS ---
const VAULT_SETUP_KEY = 'vaultSetup';
const VAULT_ENTRIES_KEY = 'vaultEntries';
const VAULT_SESSION_TOKEN_KEY = 'vaultSessionToken';
const VAULT_REMEMBER_ME_KEY = 'vaultRememberMe';
const VAULT_STORAGE_MODE_KEY = 'vaultStorageMode';
const VAULT_AUDIT_LOG_KEY = 'vaultAuditLog';
const VAULT_CLOUD_CREDENTIALS_KEY = 'vaultCloudCredentials';
const VAULT_AI_KEYS_KEY = 'vaultAIKeys';
const VAULT_RECOVERY_KEY_KEY = 'vaultRecoveryKey';

// --- STORAGE CONFIGURATION ---
const STORAGE_CONFIG = {
    mode: 'browser' // browser, file, unc
};

// --- Error Boundary for the entire app ---
function ErrorBoundary({ children }) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const handleError = (event) => {
            console.error('Global error caught:', event.error);
            SecurityUtils.auditLog.log('global_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }, 'error');
        };

        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            SecurityUtils.auditLog.log('unhandled_rejection', {
                reason: event.reason
            }, 'error');
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    if (hasError) {
        return (
            <div className="error-fallback">
                <h2>Application Error</h2>
                <p>An unexpected error occurred. Please refresh the page.</p>
                <button onClick={() => window.location.reload()}>Refresh</button>
            </div>
        );
    }

    return children;
}

// --- Main App Component ---
function App() {
    // Core state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [vaultSetup, setVaultSetup] = useState(null);
    const [masterKey, setMasterKey] = useState(null);
    const [entries, setEntries] = useState([]);
    const [aiKeys, setAiKeys] = useState([]);
    const [isLocked, setIsLocked] = useState(true);
    const [sessionToken, setSessionToken] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [storageMode, setStorageMode] = useState(STORAGE_CONFIG.mode);
    const [currentTheme, setCurrentTheme] = useState('light');

    // Browser compatibility check
    useEffect(() => {
        const checkCompatibility = async () => {
            try {
                await CryptoUtils.testCompatibility();
            } catch (e) {
                SecurityUtils.auditLog.log('compatibility_check_failed', { error: e.message }, 'error');
                setError('Your browser does not support the required cryptographic features. Please use a modern browser.');
            }
        };
        
        checkCompatibility();
    }, []);

    // Initialize SecurityUtils audit log and detect device
    useEffect(() => {
        // Detect device and apply platform class
        const device = DeviceDetection.detectDevice();
        setDeviceInfo(device);

        // Apply platform-specific class to body
        const platformClass = `platform-${device.platform.toLowerCase().replace(/\s+/g, '-')}`;
        document.body.classList.add(platformClass);
        if (device.isIOS) document.body.classList.add('platform-ios');
        if (device.isMobile) document.body.classList.add('platform-mobile');
        if (device.isTablet) document.body.classList.add('platform-tablet');
        if (device.isDesktop) document.body.classList.add('platform-desktop');
        
        SecurityUtils.auditLog.loadLogs();
        SecurityUtils.auditLog.log('app_initialized', {
            userAgent: navigator.userAgent,
            platform: device.platform,
            deviceType: device.isTV ? 'TV' : device.isTablet ? 'Tablet' : device.isMobile ? 'Mobile' : 'Desktop',
            timestamp: new Date().toISOString()
        });
        
        console.log('📱 Device detected:', device);
        
        // Run initial security audit
        const audit = SecretValidator.audit();
        if (!audit.isSecure) {
            console.warn('🚨 Security Audit Results:', audit.summary);
            SecurityUtils.auditLog.log('security_audit_failed', { violations: audit.violations }, 'warn');
        } else {
            SecurityUtils.auditLog.log('security_audit_passed', { timestamp: Date.now() });
        }
      }, []);

    // Theme initialization
    useEffect(() => {
        // Initialize themer with default theme
        if (window.Themer) {
            // Register available themes
            window.Themer.register('light', { dataAttr: 'light' });
            window.Themer.register('dark', { dataAttr: 'dark' });
            window.Themer.register('ocean', { dataAttr: 'ocean' });
            window.Themer.register('forest', { dataAttr: 'forest' });
            window.Themer.register('sunset', { dataAttr: 'sunset' });
            window.Themer.register('purple', { dataAttr: 'purple' });
            
            // Initialize with saved theme or default
            window.Themer.init('light');
            const savedTheme = window.Themer.getCurrent();
            setCurrentTheme(savedTheme || 'light');
            
            // Subscribe to theme changes
            const unsubscribe = window.Themer.subscribe((change) => {
                if (change.type === 'change') {
                    setCurrentTheme(change.to);
                }
            });
            
            return unsubscribe;
        }
    }, []);

    // Periodic security audit (every 5 minutes in development, every hour in production)
    useEffect(() => {
        const interval = setInterval(() => {
            const audit = SecretValidator.audit();
            if (!audit.isSecure) {
                console.warn('🚨 Periodic Security Audit:', audit.summary);
                SecurityUtils.auditLog.log('periodic_security_audit_failed', { violations: audit.violations }, 'warn');
            }
        }, window.location.hostname === 'localhost' ? 300000 : 3600000); // 5min dev, 1hr prod
        
        return () => clearInterval(interval);
    }, []);

    // Initialize vault setup and session
    useEffect(() => {
        try {
            // Load vault setup
            const setupData = localStorage.getItem(VAULT_SETUP_KEY);
            if (setupData) {
                const parsedSetup = JSON.parse(setupData);
                setVaultSetup(parsedSetup);
            }
            
            // Load session
            const savedSession = localStorage.getItem(VAULT_SESSION_TOKEN_KEY);
            const savedRememberMe = localStorage.getItem(VAULT_REMEMBER_ME_KEY) === 'true';
            
            if (savedSession && savedRememberMe && SecurityUtils.validateSessionToken(savedSession)) {
                setSessionToken(savedSession);
                setRememberMe(true);
            }
        } catch (e) {
            console.error('Failed to load vault setup:', e);
        }
    }, []);

    // Encrypt and save entries whenever they change
    const saveEntries = useCallback(async (updatedEntries) => {
        if (!masterKey) return; // Don't save if locked

        try {
            // Always save to browser storage first
            const encryptedData = await CryptoUtils.encryptData(masterKey, JSON.stringify(updatedEntries));
            localStorage.setItem(VAULT_ENTRIES_KEY, encryptedData);

            // Try file storage if enabled (but don't fail if it doesn't work)
            if (STORAGE_CONFIG.mode === 'file') {
                try {
                    await storageUtils.saveToFile(VAULT_ENTRIES_KEY, encryptedData);
                } catch (e) {
                    console.warn('File save failed during auto-save, data saved to browser storage:', e);
                }
            }

            setEntries(updatedEntries); // Update state
        } catch (e) {
            console.error("Failed to save entries:", e);
            setError(getErrorMessage('SAVE_FAILED'));
        }
    }, [masterKey, setEntries, setError]);

    // Decrypt entries when vault is unlocked
    const loadEntries = async (key) => {
        setIsLoading(true);
        setError('');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Loading timeout - operation took too long')), 10000)
        );
        
        try {
            const loadPromise = async () => {
                const encryptedData = localStorage.getItem(VAULT_ENTRIES_KEY);
                if (encryptedData) {
                    const decryptedJson = await CryptoUtils.decryptData(key, encryptedData);
                    const entries = JSON.parse(decryptedJson);
                    if (Array.isArray(entries)) {
                        const sanitizedEntries = entries.map(entry => SecurityUtils.sanitizeEntryData(entry));
                        setEntries(sanitizedEntries);
                    }
                }
                
                const encryptedAiKeys = localStorage.getItem(VAULT_AI_KEYS_KEY);
                if (encryptedAiKeys) {
                    const decryptedAiKeys = await CryptoUtils.decryptData(key, encryptedAiKeys);
                    const aiKeys = JSON.parse(decryptedAiKeys);
                    if (Array.isArray(aiKeys)) {
                        setAiKeys(aiKeys);
                    }
                }
            };
            
            await Promise.race([loadPromise(), timeoutPromise]);
        } catch (e) {
            console.error('Failed to load entries:', e);
            if (e.message.includes('timeout')) {
                setError('Loading timed out. Please try again.');
                SecurityUtils.auditLog.log('load_entries_timeout', {}, 'error');
            } else {
                setError('Failed to load vault entries. Data may be corrupt.');
                // Clear corrupted data
                localStorage.removeItem(VAULT_ENTRIES_KEY);
                localStorage.removeItem(VAULT_AI_KEYS_KEY);
                SecurityUtils.auditLog.log('load_entries_failed', { error: e.message }, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Encrypt and save AI keys whenever they change
    const saveAIKeys = useCallback(async (updatedAIKeys) => {
        if (!masterKey) return; // Don't save if locked

        try {
            // Always save to browser storage first
            const encryptedData = await CryptoUtils.encryptData(masterKey, JSON.stringify(updatedAIKeys));
            localStorage.setItem(VAULT_AI_KEYS_KEY, encryptedData);

            // Try file storage if enabled (but don't fail if it doesn't work)
            if (STORAGE_CONFIG.mode === 'file') {
                try {
                    await storageUtils.saveToFile(VAULT_AI_KEYS_KEY, encryptedData);
                } catch (e) {
                    console.warn('AI keys file save failed during auto-save, data saved to browser storage:', e);
                }
            }

            setAiKeys(updatedAIKeys); // Update state
        } catch (e) {
            console.error("Failed to save AI keys:", e);
            setError(getErrorMessage('SAVE_FAILED'));
        }
    }, [masterKey, setAiKeys, setError]);

    
// Master Password Setup
const handleSetup = async (password) => {
    setIsLoading(true);
    setError('');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Setup timeout - operation took too long')), 15000)
    );
    
    try {
        const setupPromise = async () => {
            const validation = SecurityUtils.validatePassword(password);
            if (!validation.valid) {
                setError(getErrorMessage('PASSWORD_TOO_WEAK'));
                return;
            }

            // Generate salt and hash
            const salt = CryptoUtils.generateSalt();
            const hash = await CryptoUtils.hashPassword(password, salt);
            
            // Derive encryption key
            const saltBuffer = CryptoUtils.base64ToBuffer(salt);
            const key = await CryptoUtils.deriveKey(password, saltBuffer);
            
            // Save vault setup
            const setup = { salt, hash, createdAt: Date.now() };
            localStorage.setItem(VAULT_SETUP_KEY, JSON.stringify(setup));
            setVaultSetup(setup);
            setMasterKey(key);
            
            SecurityUtils.auditLog.log('vault_setup_completed', {
                timestamp: Date.now(),
                passwordStrength: validation.strength
            });
            
            setSuccessMessage(getSuccessMessage('VAULT_CREATED'));
            setTimeout(() => setSuccessMessage(''), 5000);
        };
        
        await Promise.race([setupPromise(), timeoutPromise]);
    } catch (e) {
        if (e.message.includes('timeout')) {
            setError('Setup timed out. Please try again.');
            SecurityUtils.auditLog.log('setup_timeout', {}, 'error');
        } else {
            setError('Failed to setup vault: ' + e.message);
            SecurityUtils.auditLog.log('setup_failed', { error: e.message }, 'error');
        }
    } finally {
        setIsLoading(false);
    }
};

// Vault Unlock
const handleLogin = async (password) => {
    setIsLoading(true);
    setError('');

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout - operation took too long')), 15000)
    );

    if (!vaultSetup) {
        setError(getErrorMessage('VAULT_NOT_SETUP'));
        setIsLoading(false);
        return;
    }

    try {
        const loginPromise = async () => {
            // Rate limiting
            if (!SecurityUtils.checkRateLimit('login_attempts', 5, 300000)) {
                setError(getErrorMessage('TOO_MANY_ATTEMPTS'));
                setIsLoading(false);
                return;
            }

            const hash = await CryptoUtils.hashPassword(password, vaultSetup.salt);
            if (hash !== vaultSetup.hash) {
                throw new Error(getErrorMessage('INCORRECT_PASSWORD'));
            }

            const saltBuffer = CryptoUtils.base64ToBuffer(vaultSetup.salt);
            const key = await CryptoUtils.deriveKey(password, saltBuffer);
            setMasterKey(key);

            await loadEntries(key);
            setIsLocked(false);

            if (rememberMe) {
                const sessionId = SecurityUtils.generateSecureToken();
                localStorage.setItem(VAULT_SESSION_TOKEN_KEY, sessionId);
                localStorage.setItem(VAULT_REMEMBER_ME_KEY, 'true');
                setSessionToken(sessionId);
            }

            SecurityUtils.auditLog.log('vault_login_success', { remember_me: rememberMe });
        };

        await Promise.race([loginPromise(), timeoutPromise]);
    } catch (e) {
        if (e.message.includes('timeout')) {
            setError('Login timed out. Please try again.');
            SecurityUtils.auditLog.log('login_timeout', {}, 'error');
        } else {
            setError(e.message);
            SecurityUtils.auditLog.log('login_failed', { error: e.message }, 'error');
        }
        setMasterKey(null);
        setEntries([]);
    } finally {
        setIsLoading(false);
    }
};

// Vault Lock
const handleLock = () => {
        // Secure cleanup of sensitive data
        setMasterKey(null);
        setEntries([]);
        setAiKeys([]);
        setError('');

        // Clear sensitive data from memory
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_SESSION_TOKEN_KEY));
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_REMEMBER_ME_KEY));

        // Clear session if not remembering
        if (!rememberMe) {
            localStorage.removeItem(VAULT_SESSION_TOKEN_KEY);
            localStorage.removeItem(VAULT_REMEMBER_ME_KEY);
            setSessionToken(null);
            setRememberMe(false);
        }

        setIsLocked(true);
        SecurityUtils.auditLog.log('vault_locked', { remember_me: rememberMe });
    };

    // Clear session and logout completely
    const handleLogout = () => {
        // Complete cleanup of all sensitive data
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_SESSION_TOKEN_KEY));
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_REMEMBER_ME_KEY));
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_SETUP_KEY));
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_ENTRIES_KEY));
        SecurityUtils.clearSensitiveData(localStorage.getItem(VAULT_AI_KEYS_KEY));

        localStorage.removeItem(VAULT_SESSION_TOKEN_KEY);
        localStorage.removeItem(VAULT_REMEMBER_ME_KEY);
        localStorage.removeItem(VAULT_STORAGE_MODE_KEY);
        localStorage.removeItem(VAULT_AI_KEYS_KEY);
        localStorage.removeItem(`${VAULT_SESSION_TOKEN_KEY}_expiry`);

        setSessionToken(null);
        setRememberMe(false);
        setMasterKey(null);
        setEntries([]);
        setAiKeys([]);
        setVaultSetup(null);
        setError('');

        handleLock();
        SecurityUtils.auditLog.log('vault_logout', { complete: true });
    };

    // Vault Backup (Safe Export)
    const handleReset = async () => {
        // Use proper UI confirmation instead of browser alert
        const confirmBackup = window.confirm(Messages.CONFIRMATIONS.DELETE_ENTRY.replace('entry', 'vault backup'));
        if (!confirmBackup) return;

        // Get current vault data
        const currentEntries = entries;
        if (currentEntries.length === 0) {
            setError("No entries to backup. Your vault is empty.");
            return;
        }

        try {
            // Use proper UI for password input instead of prompt
            const password = window.prompt("Please enter your master password to encrypt the backup:");
            if (!password) {
                SecurityUtils.auditLog.log('vault_export_cancelled', { reason: 'no_password' });
                return;
            }

            SecurityUtils.auditLog.log('vault_export_started', { entry_count: currentEntries.length });

            const base64Data = await CryptoUtils.exportVault(password, currentEntries);
            const blob = new Blob([base64Data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `vault-backup-${date}.vault`;
            a.click();
            URL.revokeObjectURL(url);

            SecurityUtils.auditLog.log('vault_export_completed', { entry_count: currentEntries.length, file_size: base64Data.length });
            setSuccessMessage(getSuccessMessage('DATA_EXPORTED'));
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e) {
            SecurityUtils.auditLog.log('vault_export_failed', { error: e.message }, 'error');
            setError("Backup failed. Please check your password and try again.");
        }
    };

    // Delete Entry with better confirmation
    const deleteEntry = (id) => {
        if (window.confirm(Messages.CONFIRMATIONS.DELETE_ENTRY)) {
            const entryToDelete = entries.find(e => e.id === id);
            const updatedEntries = entries.filter(entry => entry.id !== id);
            saveEntries(updatedEntries);
            SecurityUtils.auditLog.log('entry_deleted', {
                entry_id: id,
                entry_type: entryToDelete?.type,
                entry_title: entryToDelete?.title
            });
            setSuccessMessage(getSuccessMessage('ENTRY_DELETED'));
            setTimeout(() => setSuccessMessage(''), 2000);
        }
    };

    const addEntry = (entry) => {
        const newEntry = {
            ...entry,
            id: CryptoUtils.generateUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const updatedEntries = [...entries, newEntry];
        saveEntries(updatedEntries);
        setSuccessMessage(getSuccessMessage('ENTRY_SAVED'));
        setTimeout(() => setSuccessMessage(''), 2000);
    };

    const updateEntry = (updatedEntry) => {
        const updatedEntries = entries.map(entry =>
            entry.id === updatedEntry.id ? { ...updatedEntry, updatedAt: new Date().toISOString() } : entry
        );
        saveEntries(updatedEntries);
        setSuccessMessage(getSuccessMessage('ENTRY_UPDATED'));
        setTimeout(() => setSuccessMessage(''), 2000);
    };

    // --- Theme Handler ---
    const toggleTheme = useCallback(() => {
        if (window.Themer) {
            const themes = ['light', 'dark', 'ocean', 'forest', 'sunset', 'purple'];
            window.Themer.toggle(themes);
        }
    }, []);

    // --- UI Handlers ---

    // Copy to Clipboard with timeout cleanup
    const handleCopy = useCallback((text) => {
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
            SecurityUtils.auditLog.log('clipboard_copy', { text_length: text.length });
        }).catch(err => {
            SecurityUtils.auditLog.log('clipboard_copy_failed', { error: err.message }, 'error');
            setError("Failed to copy to clipboard. Please try selecting and copying manually.");
        });
    }, []);

    // Storage configuration with timeout cleanup
    const handleStorageModeChange = useCallback((mode) => {
        const oldMode = STORAGE_CONFIG.mode;
        STORAGE_CONFIG.mode = mode;
        localStorage.setItem(VAULT_STORAGE_MODE_KEY, mode);

        // Show confirmation with accurate messaging
        let message = '';
        switch (mode) {
            case 'browser':
                message = 'Using browser storage (local only, no backup needed)';
                break;
            case 'file':
                message = 'Using file storage (data saved to device, can be backed up)';
                break;
            case 'unc':
                message = 'Using network storage (requires manual configuration)';
                break;
        }

        SecurityUtils.auditLog.log('storage_mode_changed', { from: oldMode, to: mode });

        if (message) {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    }, []);

    // Enhanced session management with validation and expiry
    useEffect(() => {
        if (sessionToken) {
            // Check if session is expired
            const sessionExpiry = localStorage.getItem(`${VAULT_SESSION_TOKEN_KEY}_expiry`);
            if (sessionExpiry && Date.now() > parseInt(sessionExpiry)) {
                console.warn('Session expired, clearing session');
                localStorage.removeItem(VAULT_SESSION_TOKEN_KEY);
                localStorage.removeItem(VAULT_REMEMBER_ME_KEY);
                localStorage.removeItem(`${VAULT_SESSION_TOKEN_KEY}_expiry`);
                setSessionToken(null);
                setRememberMe(false);
                SecurityUtils.auditLog.log('session_expired', { reason: 'timeout' });
                return;
            }

            // Validate session token format
            if (!SecurityUtils.validateSessionToken(sessionToken)) {
                console.warn('Invalid session token detected, clearing session');
                localStorage.removeItem(VAULT_SESSION_TOKEN_KEY);
                localStorage.removeItem(VAULT_REMEMBER_ME_KEY);
                localStorage.removeItem(`${VAULT_SESSION_TOKEN_KEY}_expiry`);
                setSessionToken(null);
                setRememberMe(false);
                SecurityUtils.auditLog.log('session_invalid', { reason: 'invalid_format' });
            }
        }
    }, [sessionToken]);

    // Handle Password Reset Success
    const handlePasswordResetSuccess = async ({ newMasterKey, reEncryptedEntries, recoveryKey }) => {
        try {
            // Update master key
            setMasterKey(newMasterKey);
            
            // Update entries with re-encrypted data
            setEntries(reEncryptedEntries);
            await saveEntries(reEncryptedEntries);
            
            // Store encrypted recovery key
            const encryptedRecoveryKey = await CryptoUtils.encryptRecoveryKey(recoveryKey, newMasterKey);
            localStorage.setItem(VAULT_RECOVERY_KEY_KEY, encryptedRecoveryKey);
            
            // Update vault setup with new salt
            const updatedSetup = {
                ...vaultSetup,
                salt: newMasterKey.salt,
                lastPasswordChange: new Date().toISOString()
            };
            localStorage.setItem(VAULT_SETUP_KEY, JSON.stringify(updatedSetup));
            setVaultSetup(updatedSetup);
            
            SecurityUtils.auditLog.log('password_reset_success', {
                entry_count: reEncryptedEntries.length,
                recovery_key_stored: true
            });
            
            setSuccessMessage('Password updated successfully! Your vault is secure.');
            setTimeout(() => setSuccessMessage(''), 5000);
            setShowPasswordReset(false);
        } catch (err) {
            setError('Failed to complete password reset: ' + err.message);
            SecurityUtils.auditLog.log('password_reset_error', { error: err.message }, 'error');
        }
    };

    // Loading screen with robust error handling
    if (isLoading) {
        return <LoadingScreen setIsLoading={setIsLoading} setError={setError} />;
    }

    return (
        <div className="container">
            {/* Theme Toggle Button */}
            <button 
                onClick={toggleTheme}
                style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    background: 'var(--themer-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--themer-radius)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    zIndex: 1000,
                    fontSize: '0.875rem',
                    boxShadow: 'var(--themer-shadow)'
                }}
                title={`Current theme: ${currentTheme}. Click to switch theme.`}
            >
                🎨 {currentTheme}
            </button>
            
            {isLocked ? (
                <LoginScreen
                    onLogin={handleLogin}
                    onSetup={handleSetup}
                    onReset={handleReset}
                    hasSetup={!!vaultSetup}
                    isLoading={isLoading}
                    error={error}
                    rememberMe={rememberMe}
                    setRememberMe={setRememberMe}
                />
            ) : (
                <VaultScreen
                    entries={entries}
                    onLock={handleLock}
                    onReset={handleReset}
                    onLogout={handleLogout}
                    onPasswordReset={() => setShowPasswordReset(true)}
                    onAddEntry={addEntry}
                    onUpdateEntry={updateEntry}
                    onDeleteEntry={deleteEntry}
                    onCopy={handleCopy}
                    masterPassword={null} // Don't pass password
                    saveEntries={saveEntries} // Pass save function for import
                    setError={setError}
                    error={error}
                    rememberMe={rememberMe}
                    aiKeys={aiKeys}
                    onSaveAIKeys={saveAIKeys}
                    masterKey={masterKey}
                />
            )}
            {copyFeedback && <div className="copy-feedback show">Copied to clipboard!</div>}
            
            {/* Password Reset Modal */}
            {showPasswordReset && (
                <PasswordResetSystem
                    onClose={() => setShowPasswordReset(false)}
                    onSuccess={handlePasswordResetSuccess}
                    currentMasterKey={masterKey}
                    entries={entries}
                />
            )}
        </div>
    );
}

export default App;
