/**
 * Secure Storage Utilities
 * Provides encrypted localStorage and sessionStorage with security features
 */

import { CryptoUtils } from './CryptoUtils.js';

/**
 * Storage configuration and security settings
 */
const STORAGE_CONFIG = {
    // Encryption key derivation settings
    KEY_DERIVATION: {
        iterations: 100000,
        saltLength: 16
    },
    // Data size limits
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_ITEM_SIZE: 1024 * 1024, // 1MB
    // Session settings
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    // Key rotation
    KEY_ROTATION_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 7 days
    // Security features
    ENABLE_INTEGRITY_CHECK: true,
    ENABLE_VERSION_CONTROL: true
};

/**
 * Secure Storage class with encryption and security features
 */
export class SecureStorage {
    constructor(type = 'localStorage', masterKey = null) {
        this.type = type;
        this.storage = type === 'sessionStorage' ? window.sessionStorage : window.localStorage;
        this.masterKey = masterKey;
        this.keyVersion = 1;
        this.lastAccessTime = Date.now();
        
        // Initialize storage if not exists
        this.initializeStorage();
    }

    /**
     * Initialize storage with security metadata
     */
    initializeStorage() {
        const metaKey = this.getMetaKey();
        let metadata = this.getMetadata();
        
        if (!metadata) {
            metadata = {
                version: 1,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                keyRotation: Date.now() + STORAGE_CONFIG.KEY_ROTATION_INTERVAL,
                itemCount: 0
            };
            this.storage.setItem(metaKey, JSON.stringify(metadata));
        }
        
        // Update last access time
        metadata.lastAccessed = Date.now();
        this.storage.setItem(metaKey, JSON.stringify(metadata));
    }

    /**
     * Get metadata key for this storage type
     */
    getMetaKey() {
        return `secure_${this.type}_meta`;
    }

    /**
     * Get storage metadata
     */
    getMetadata() {
        try {
            const metaKey = this.getMetaKey();
            const metaStr = this.storage.getItem(metaKey);
            return metaStr ? JSON.parse(metaStr) : null;
        } catch (error) {
            console.error('[SecureStorage] Failed to get metadata:', error);
            return null;
        }
    }

    /**
     * Set storage metadata
     */
    setMetadata(metadata) {
        try {
            const metaKey = this.getMetaKey();
            this.storage.setItem(metaKey, JSON.stringify(metadata));
        } catch (error) {
            console.error('[SecureStorage] Failed to set metadata:', error);
            throw new Error('Failed to update storage metadata');
        }
    }

    /**
     * Derive encryption key from master key and salt
     */
    async deriveEncryptionKey(salt) {
        if (!this.masterKey) {
            throw new Error('Master key not set');
        }
        
        try {
            const keyBuffer = await CryptoUtils.deriveKey(this.masterKey, salt);
            return keyBuffer;
        } catch (error) {
            console.error('[SecureStorage] Key derivation failed:', error);
            throw new Error('Failed to derive encryption key');
        }
    }

    /**
     * Generate new salt for key derivation
     */
    generateSalt() {
        return CryptoUtils.getRandom(STORAGE_CONFIG.KEY_DERIVATION.saltLength);
    }

    /**
     * Encrypt data with integrity check
     */
    async encryptData(data, key) {
        try {
            // Add version and timestamp
            const payload = {
                version: this.keyVersion,
                timestamp: Date.now(),
                data: data
            };
            
            const jsonString = JSON.stringify(payload);
            const encrypted = await CryptoUtils.encryptData(key, jsonString);
            
            // Add integrity check if enabled
            if (STORAGE_CONFIG.ENABLE_INTEGRITY_CHECK) {
                const checksum = await this.calculateChecksum(encrypted);
                return { encrypted, checksum };
            }
            
            return { encrypted };
        } catch (error) {
            console.error('[SecureStorage] Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data with integrity verification
     */
    async decryptData(encryptedData, key, expectedChecksum = null) {
        try {
            // Verify integrity check if provided
            if (STORAGE_CONFIG.ENABLE_INTEGRITY_CHECK && expectedChecksum) {
                const calculatedChecksum = await this.calculateChecksum(encryptedData);
                if (calculatedChecksum !== expectedChecksum) {
                    throw new Error('Data integrity check failed');
                }
            }
            
            const decrypted = await CryptoUtils.decryptData(key, encryptedData);
            const payload = JSON.parse(decrypted);
            
            // Validate payload structure
            if (!payload || typeof payload !== 'object' || !payload.data) {
                throw new Error('Invalid decrypted data structure');
            }
            
            // Check version compatibility
            if (payload.version > this.keyVersion) {
                console.warn('[SecureStorage] Data version newer than current version');
            }
            
            return payload.data;
        } catch (error) {
            console.error('[SecureStorage] Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Calculate checksum for integrity verification
     */
    async calculateChecksum(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        return CryptoUtils.bufferToBase64(hashBuffer).substring(0, 16);
    }

    /**
     * Store encrypted data
     */
    async setItem(key, value, options = {}) {
        try {
            // Validate inputs
            if (!key || typeof key !== 'string') {
                throw new Error('Key must be a non-empty string');
            }
            if (key.length > 255) {
                throw new Error('Key too long (max 255 characters)');
            }
            if (value === undefined || value === null) {
                throw new Error('Value cannot be null or undefined');
            }
            
            // Serialize value
            const serializedValue = JSON.stringify(value);
            if (serializedValue.length > STORAGE_CONFIG.MAX_ITEM_SIZE) {
                throw new Error('Value too large for storage');
            }
            
            // Check storage quota
            if (this.getStorageSize() + serializedValue.length > STORAGE_CONFIG.MAX_STORAGE_SIZE) {
                throw new Error('Storage quota exceeded');
            }
            
            // Generate salt and derive key
            const salt = this.generateSalt();
            const keyBuffer = await this.deriveEncryptionKey(salt);
            
            // Encrypt data
            const { encrypted, checksum } = await this.encryptData(serializedValue, keyBuffer);
            
            // Store with metadata
            const storageKey = this.getStorageKey(key);
            const storageData = {
                salt: CryptoUtils.bufferToBase64(salt),
                encrypted,
                checksum,
                createdAt: Date.now(),
                accessCount: 0
            };
            
            this.storage.setItem(storageKey, JSON.stringify(storageData));
            
            // Update metadata
            const metadata = this.getMetadata();
            metadata.itemCount = this.getItemCount();
            this.setMetadata(metadata);
            
            this.lastAccessTime = Date.now();
            return true;
        } catch (error) {
            console.error('[SecureStorage] Failed to set item:', error);
            throw error;
        }
    }

    /**
     * Retrieve and decrypt data
     */
    async getItem(key) {
        try {
            // Validate input
            if (!key || typeof key !== 'string') {
                throw new Error('Key must be a non-empty string');
            }
            
            const storageKey = this.getStorageKey(key);
            const storedData = this.storage.getItem(storageKey);
            
            if (!storedData) {
                return null;
            }
            
            const storageData = JSON.parse(storedData);
            
            // Validate stored data structure
            if (!storageData || !storageData.salt || !storageData.encrypted) {
                throw new Error('Invalid stored data format');
            }
            
            // Derive key and decrypt
            const salt = CryptoUtils.base64ToBuffer(storageData.salt);
            const keyBuffer = await this.deriveEncryptionKey(salt);
            
            const decryptedValue = await this.decryptData(
                storageData.encrypted,
                keyBuffer,
                storageData.checksum
            );
            
            // Update access count and time
            storageData.accessCount = (storageData.accessCount || 0) + 1;
            storageData.lastAccessed = Date.now();
            this.storage.setItem(storageKey, JSON.stringify(storageData));
            
            // Update metadata
            const metadata = this.getMetadata();
            metadata.lastAccessed = Date.now();
            this.setMetadata(metadata);
            
            this.lastAccessTime = Date.now();
            return JSON.parse(decryptedValue);
        } catch (error) {
            console.error('[SecureStorage] Failed to get item:', error);
            // Remove corrupted item
            this.removeItem(key);
            return null;
        }
    }

    /**
     * Remove item from storage
     */
    removeItem(key) {
        try {
            if (!key || typeof key !== 'string') {
                throw new Error('Key must be a non-empty string');
            }
            
            const storageKey = this.getStorageKey(key);
            this.storage.removeItem(storageKey);
            
            // Update metadata
            const metadata = this.getMetadata();
            metadata.itemCount = this.getItemCount();
            this.setMetadata(metadata);
            
            return true;
        } catch (error) {
            console.error('[SecureStorage] Failed to remove item:', error);
            return false;
        }
    }

    /**
     * Clear all encrypted storage
     */
    clear() {
        try {
            // Get all keys and remove them
            const keys = this.getAllKeys();
            keys.forEach(key => this.removeItem(key));
            
            // Reset metadata
            this.initializeStorage();
            return true;
        } catch (error) {
            console.error('[SecureStorage] Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get storage key for encrypted data
     */
    getStorageKey(key) {
        return `secure_${this.type}_${key}`;
    }

    /**
     * Get all keys in storage
     */
    getAllKeys() {
        const keys = [];
        const prefix = `secure_${this.type}_`;
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(prefix) && key !== this.getMetaKey()) {
                // Remove prefix to get original key
                keys.push(key.substring(prefix.length));
            }
        }
        
        return keys;
    }

    /**
     * Get item count
     */
    getItemCount() {
        return this.getAllKeys().length;
    }

    /**
     * Get storage size in bytes
     */
    getStorageSize() {
        let size = 0;
        const prefix = `secure_${this.type}_`;
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(prefix)) {
                const value = this.storage.getItem(key);
                size += key.length + (value ? value.length : 0);
            }
        }
        
        return size;
    }

    /**
     * Check if storage is available
     */
    isAvailable() {
        try {
            const testKey = '__secure_storage_test__';
            this.storage.setItem(testKey, 'test');
            this.storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Rotate encryption keys
     */
    async rotateKeys() {
        try {
            const keys = this.getAllKeys();
            const newData = {};
            
            // Decrypt all data with old key
            for (const key of keys) {
                const value = await this.getItem(key);
                if (value !== null) {
                    newData[key] = value;
                }
            }
            
            // Clear storage
            this.clear();
            
            // Re-encrypt with new key
            for (const [key, value] of Object.entries(newData)) {
                await this.setItem(key, value);
            }
            
            // Update key rotation time
            const metadata = this.getMetadata();
            metadata.keyRotation = Date.now() + STORAGE_CONFIG.KEY_ROTATION_INTERVAL;
            this.setMetadata(metadata);
            
            console.info('[SecureStorage] Key rotation completed');
            return true;
        } catch (error) {
            console.error('[SecureStorage] Key rotation failed:', error);
            throw error;
        }
    }

    /**
     * Check if key rotation is needed
     */
    needsKeyRotation() {
        const metadata = this.getMetadata();
        return metadata && Date.now() > metadata.keyRotation;
    }

    /**
     * Export storage data for backup
     */
    async exportData(password) {
        try {
            const keys = this.getAllKeys();
            const exportData = {
                version: '1.0.0',
                type: this.type,
                timestamp: Date.now(),
                keys: []
            };
            
            for (const key of keys) {
                const value = await this.getItem(key);
                if (value !== null) {
                    exportData.keys.push({ key, value });
                }
            }
            
            const jsonString = JSON.stringify(exportData);
            const salt = CryptoUtils.getRandom(16);
            const key = await CryptoUtils.deriveKey(password, salt);
            const encrypted = await CryptoUtils.encryptData(key, jsonString);
            
            return CryptoUtils.bufferToBase64(salt) + '.' + encrypted;
        } catch (error) {
            console.error('[SecureStorage] Export failed:', error);
            throw error;
        }
    }

    /**
     * Import storage data from backup
     */
    async importData(password, exportData) {
        try {
            const parts = exportData.split('.');
            if (parts.length !== 2) {
                throw new Error('Invalid export data format');
            }
            
            const [saltBase64, encrypted] = parts;
            const salt = CryptoUtils.base64ToBuffer(saltBase64);
            const key = await CryptoUtils.deriveKey(password, salt);
            const decrypted = await CryptoUtils.decryptData(key, encrypted);
            const importData = JSON.parse(decrypted);
            
            // Validate import data
            if (!importData.keys || !Array.isArray(importData.keys)) {
                throw new Error('Invalid import data format');
            }
            
            // Clear current storage
            this.clear();
            
            // Import all keys
            for (const { key, value } of importData.keys) {
                await this.setItem(key, value);
            }
            
            console.info('[SecureStorage] Import completed');
            return true;
        } catch (error) {
            console.error('[SecureStorage] Import failed:', error);
            throw error;
        }
    }
}

/**
 * Factory function to create secure storage instances
 */
export function createSecureStorage(type = 'localStorage', masterKey = null) {
    return new SecureStorage(type, masterKey);
}

/**
 * Session storage with automatic timeout
 */
export class SecureSessionStorage extends SecureStorage {
    constructor(masterKey = null, timeout = STORAGE_CONFIG.SESSION_TIMEOUT) {
        super('sessionStorage', masterKey);
        this.timeout = timeout;
        this.sessionStart = Date.now();
        
        // Check session timeout
        this.checkSessionTimeout();
    }

    checkSessionTimeout() {
        if (Date.now() - this.sessionStart > this.timeout) {
            console.warn('[SecureSessionStorage] Session timeout, clearing storage');
            this.clear();
            return false;
        }
        return true;
    }

    async getItem(key) {
        if (!this.checkSessionTimeout()) {
            return null;
        }
        return super.getItem(key);
    }

    async setItem(key, value, options = {}) {
        if (!this.checkSessionTimeout()) {
            throw new Error('Session expired');
        }
        return super.setItem(key, value, options);
    }
}

export default {
    SecureStorage,
    SecureSessionStorage,
    createSecureStorage,
    STORAGE_CONFIG
};
