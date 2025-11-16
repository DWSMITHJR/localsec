// src/utils/CryptoUtils.js
export class CryptoUtils {
    static CRYPTO_CONFIG = {
        PBKDF2_ITERATIONS: 100000,
        SALT_LENGTH_BYTES: 16,
        IV_LENGTH_BYTES: 12,
        KEY_LENGTH_BYTES: 32,
        KEY_ALGORITHM: 'AES-GCM',
        HASH_ALGORITHM: 'SHA-256',
        RSA_KEY_SIZE: 2048,
        RSA_ALGORITHM: 'RSA-OAEP',
        RSA_MODULUS_LENGTH: 2048,
        RSA_PUBLIC_EXPONENT: new Uint8Array([1, 0, 1]),
        RSA_HASH: 'SHA-256'
    };

    // Test browser compatibility for cryptographic features
    static async testCompatibility() {
        // Check for required APIs
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }

        if (!window.TextEncoder) {
            throw new Error('TextEncoder not supported');
        }

        if (!window.TextDecoder) {
            throw new Error('TextDecoder not supported');
        }

        // Check for secure context
        if (!window.isSecureContext && location.protocol !== 'https:') {
            console.warn('[CryptoUtils] Warning: Not running in secure context');
        }

        // Test basic crypto operations
        try {
            // Test random number generation
            const randomBytes = this.getRandom(16);
            if (!randomBytes || randomBytes.length !== 16) {
                throw new Error('Random number generation failed');
            }

            // Test hashing
            const testPassword = 'test';
            const testSalt = this.getRandom(16);
            const hash = await this.hashPassword(testPassword, this.bufferToBase64(testSalt));
            if (!hash) {
                throw new Error('Password hashing failed');
            }

            // Test key derivation
            const key = await this.deriveKey(testPassword, testSalt);
            if (!key) {
                throw new Error('Key derivation failed');
            }

            // Test encryption/decryption
            const testData = 'test data';
            const encrypted = await this.encryptData(key, testData);
            const decrypted = await this.decryptData(key, encrypted);
            if (decrypted !== testData) {
                throw new Error('Encryption/decryption failed');
            }

            return true;
        } catch (error) {
            throw new Error(`Cryptographic compatibility test failed: ${error.message}`);
        }
    }

    // Generate cryptographically random bytes (for salt, IV)
    static getRandom(byteLength) {
        if (!byteLength || byteLength <= 0 || byteLength > 65536) {
            throw new Error('Invalid random byte length: must be between 1 and 65536');
        }
        if (!window.crypto || !window.crypto.getRandomValues) {
            throw new Error('Random number generation not supported');
        }
        return window.crypto.getRandomValues(new Uint8Array(byteLength));
    }

    // Generate random salt for password hashing
    static generateSalt() {
        const saltBytes = this.getRandom(this.CRYPTO_CONFIG.SALT_LENGTH_BYTES);
        return this.bufferToBase64(saltBytes);
    }

    // Convert ArrayBuffer to Base64
    static bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    // Convert Base64 to ArrayBuffer
    static base64ToBuffer(base64) {
        if (!base64 || typeof base64 !== 'string') {
            throw new Error('Invalid Base64 input');
        }
        
        // Remove whitespace and validate base64 format
        const cleanBase64 = base64.replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
            throw new Error('Invalid Base64 format');
        }
        
        try {
            const binaryString = window.atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        } catch (error) {
            throw new Error('Base64 decoding failed');
        }
    }

    // --- Password Hashing (PBKDF2) ---
    static async hashPassword(password, saltBase64) {
        // Validate inputs
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        if (password.length > 1024) {
            throw new Error('Password too long (max 1024 characters)');
        }
        if (!saltBase64 || typeof saltBase64 !== 'string') {
            throw new Error('Salt must be a Base64 string');
        }
        
        const saltBuffer = this.base64ToBuffer(saltBase64);
        if (saltBuffer.byteLength !== this.CRYPTO_CONFIG.SALT_LENGTH_BYTES) {
            throw new Error(`Invalid salt length: expected ${this.CRYPTO_CONFIG.SALT_LENGTH_BYTES} bytes`);
        }
        
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const hashBuffer = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: this.CRYPTO_CONFIG.PBKDF2_ITERATIONS,
                hash: this.CRYPTO_CONFIG.HASH_ALGORITHM
            },
            keyMaterial,
            256
        );

        return this.bufferToBase64(hashBuffer);
    }

    // --- Key Derivation ---
    static async deriveKey(password, saltBuffer) {
        // Validate inputs
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        if (password.length > 1024) {
            throw new Error('Password too long (max 1024 characters)');
        }
        if (!saltBuffer || !(saltBuffer instanceof ArrayBuffer)) {
            throw new Error('Salt must be an ArrayBuffer');
        }
        if (saltBuffer.byteLength !== this.CRYPTO_CONFIG.SALT_LENGTH_BYTES) {
            throw new Error(`Invalid salt length: expected ${this.CRYPTO_CONFIG.SALT_LENGTH_BYTES} bytes`);
        }
        
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: this.CRYPTO_CONFIG.PBKDF2_ITERATIONS,
                hash: this.CRYPTO_CONFIG.HASH_ALGORITHM
            },
            keyMaterial,
            {
                name: this.CRYPTO_CONFIG.KEY_ALGORITHM,
                length: this.CRYPTO_CONFIG.KEY_LENGTH_BYTES * 8
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // --- Encryption ---
    static async encryptData(key, data) {
        // Validate inputs
        if (!key) {
            throw new Error('Key is required');
        }
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }
        if (data.length > 1048576) { // 1MB limit
            throw new Error('Data too large for encryption (max 1MB)');
        }
        
        const iv = this.getRandom(this.CRYPTO_CONFIG.IV_LENGTH_BYTES);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: this.CRYPTO_CONFIG.KEY_ALGORITHM,
                iv: iv
            },
            key,
            dataBuffer
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return this.bufferToBase64(combined.buffer);
    }

    // --- Decryption ---
    static async decryptData(key, encryptedBase64) {
        // Validate inputs
        if (!key) {
            throw new Error('Key is required');
        }
        if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
            throw new Error('Encrypted data must be a Base64 string');
        }
        
        const encryptedBuffer = this.base64ToBuffer(encryptedBase64);
        const encryptedArray = new Uint8Array(encryptedBuffer);
        
        // Check minimum length (IV + some data)
        if (encryptedArray.length <= this.CRYPTO_CONFIG.IV_LENGTH_BYTES) {
            throw new Error('Invalid encrypted data format');
        }

        // Extract IV and encrypted data
        const iv = encryptedArray.slice(0, this.CRYPTO_CONFIG.IV_LENGTH_BYTES);
        const encryptedData = encryptedArray.slice(this.CRYPTO_CONFIG.IV_LENGTH_BYTES);

        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: this.CRYPTO_CONFIG.KEY_ALGORITHM,
                    iv: iv
                },
                key,
                encryptedData
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            throw new Error('Decryption failed - invalid key or corrupted data');
        }
    }

    // --- Password Generator ---
    static generatePassword(length = 16) {
        // Validate length
        if (!Number.isInteger(length) || length < 8 || length > 128) {
            throw new Error('Password length must be between 8 and 128 characters');
        }
        
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const allChars = lowercase + uppercase + numbers + symbols;
        let password = '';

        // Ensure at least one character from each category
        password += lowercase[this.getRandomIndex(lowercase.length)];
        password += uppercase[this.getRandomIndex(uppercase.length)];
        password += numbers[this.getRandomIndex(numbers.length)];
        password += symbols[this.getRandomIndex(symbols.length)];

        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars[this.getRandomIndex(allChars.length)];
        }

        // Shuffle the password using crypto-secure shuffle
        return this.shuffleString(password);
    }
    
    // Helper method to get cryptographically secure random index
    static getRandomIndex(max) {
        if (!window.crypto || !window.crypto.getRandomValues) {
            throw new Error('Secure random not available');
        }
        // Use rejection sampling to avoid modulo bias
        const randomBytes = new Uint32Array(1);
        let randomValue;
        do {
            window.crypto.getRandomValues(randomBytes);
            randomValue = randomBytes[0];
        } while (randomValue >= Math.floor(0xFFFFFFFF / max) * max);
        return randomValue % max;
    }
    
    // Fisher-Yates shuffle using crypto-secure random
    static shuffleString(str) {
        const arr = str.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.getRandomIndex(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    }

    // --- RSA Key Pair Generation ---
    static async generateRsaKeyPair() {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: this.CRYPTO_CONFIG.RSA_ALGORITHM,
                modulusLength: this.CRYPTO_CONFIG.RSA_MODULUS_LENGTH,
                publicExponent: this.CRYPTO_CONFIG.RSA_PUBLIC_EXPONENT,
                hash: this.CRYPTO_CONFIG.RSA_HASH
            },
            true,
            ['encrypt', 'decrypt']
        );

        const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

        return {
            privateKey: this.bufferToBase64(privateKey),
            publicKey: this.bufferToBase64(publicKey)
        };
    }

    // --- Vault Export/Import ---
    static async exportVault(password, entries) {
        // Create export data with metadata
        const exportData = {
            version: '2.1.0',
            timestamp: new Date().toISOString(),
            entries: entries,
            checksum: '' // Will be calculated below
        };

        const jsonString = JSON.stringify(exportData);

        // Generate a salt for this export
        const salt = this.getRandom(this.CRYPTO_CONFIG.SALT_LENGTH_BYTES);
        const key = await this.deriveKey(password, salt);

        // Encrypt the data
        const encryptedData = await this.encryptData(key, jsonString);

        // Calculate checksum of encrypted data
        const checksum = await this.calculateChecksum(encryptedData);
        exportData.checksum = checksum;

        // Combine salt, checksum, and encrypted data
        const finalData = this.bufferToBase64(salt) + '.' + checksum + '.' + encryptedData;

        return finalData;
    }

    static async importVault(password, base64Data) {
        try {
            const parts = base64Data.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid vault file format');
            }

            const [saltBase64, checksum, encryptedData] = parts;
            const salt = this.base64ToBuffer(saltBase64);

            // Verify checksum
            const calculatedChecksum = await this.calculateChecksum(encryptedData);
            if (calculatedChecksum !== checksum) {
                throw new Error('Vault file corrupted - checksum mismatch');
            }

            // Derive key and decrypt
            const key = await this.deriveKey(password, salt);
            const decryptedJson = await this.decryptData(key, encryptedData);

            const importData = JSON.parse(decryptedJson);

            // Basic validation
            if (!importData.entries || !Array.isArray(importData.entries)) {
                throw new Error('Invalid vault data format');
            }

            return importData.entries;
        } catch (e) {
            throw new Error(`Import failed: ${e.message}`);
        }
    }

    static async calculateChecksum(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        return this.bufferToBase64(hashBuffer).substring(0, 16); // First 16 chars of hash
    }

    // --- AI API Key Management ---

    // Encrypt AI API key data
    static async encryptAIApiKey(key, service, apiKey, metadata = {}) {
        const keyData = {
            service,
            apiKey,
            metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const jsonString = JSON.stringify(keyData);
        return await this.encryptData(key, jsonString);
    }

    // Decrypt AI API key data
    static async decryptAIApiKey(masterKey, encryptedBase64) {
        const decryptedJson = await this.decryptData(masterKey, encryptedBase64);
        return JSON.parse(decryptedJson);
    }

    // Export AI API keys for backup
    static async exportAIApiKeys(password, aiKeys) {
        const exportData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            aiKeys: aiKeys,
            checksum: ''
        };

        const jsonString = JSON.stringify(exportData);

        // Generate a salt for this export
        const salt = this.getRandom(this.CRYPTO_CONFIG.SALT_LENGTH_BYTES);
        const key = await this.deriveKey(password, salt);

        // Encrypt the data
        const encryptedData = await this.encryptData(key, jsonString);

        // Calculate checksum of encrypted data
        const checksum = await this.calculateChecksum(encryptedData);
        exportData.checksum = checksum;

        // Combine salt, checksum, and encrypted data
        const finalData = this.bufferToBase64(salt) + '.' + checksum + '.' + encryptedData;

        return finalData;
    }

    // Import AI API keys from backup
    static async importAIApiKeys(password, base64Data) {
        try {
            const parts = base64Data.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid AI API keys file format');
            }

            const [saltBase64, checksum, encryptedData] = parts;
            const salt = this.base64ToBuffer(saltBase64);

            // Verify checksum
            const calculatedChecksum = await this.calculateChecksum(encryptedData);
            if (calculatedChecksum !== checksum) {
                throw new Error('AI API keys file corrupted - checksum mismatch');
            }

            // Derive key and decrypt
            const key = await this.deriveKey(password, salt);
            const decryptedJson = await this.decryptData(key, encryptedData);

            const importData = JSON.parse(decryptedJson);

            // Basic validation
            if (!importData.aiKeys || !Array.isArray(importData.aiKeys)) {
                throw new Error('Invalid AI API keys data format');
            }

            return importData.aiKeys;
        } catch (e) {
            throw new Error(`AI API keys import failed: ${e.message}`);
        }
    }

    // Validate AI service configuration
    static validateAIService(service) {
        const supportedServices = [
            'openai', 'anthropic', 'google', 'claude', 'gemini',
            'cohere', 'huggingface', 'azure-openai', 'aws-bedrock',
            'replicate', 'stability-ai', 'deepseek'
        ];

        return supportedServices.includes(service.toLowerCase());
    }

    // Validate AI API key format
    static validateAIApiKey(service, apiKey) {
        if (!service || !apiKey) {
            return { valid: false, error: 'Service and API key are required' };
        }

        if (!this.validateAIService(service)) {
            return { valid: false, error: `Unsupported AI service: ${service}` };
        }

        // Service-specific validation
        const validations = {
            'openai': /^sk-[a-zA-Z0-9]{48,}$/,
            'anthropic': /^sk-ant-api03-[a-zA-Z0-9_-]{93}$/,
            'google': /^AIza[a-zA-Z0-9_-]{35}$/,
            'claude': /^sk-ant-api03-[a-zA-Z0-9_-]{93}$/,
            'gemini': /^AIza[a-zA-Z0-9_-]{35}$/,
            'cohere': /^.{40,}$/,
            'huggingface': /^hf_[a-zA-Z0-9]{34,}$/,
            'azure-openai': /^[a-zA-Z0-9]{32,}$/,
            'aws-bedrock': /^[A-Za-z0-9]{20,}$/,
            'replicate': /^r8_[a-zA-Z0-9]{40}$/,
            'stability-ai': /^sk-[a-zA-Z0-9]{64}$/,
            'deepseek': /^sk-[a-zA-Z0-9]{32,}$/
        };

        const pattern = validations[service.toLowerCase()];
        if (pattern && !pattern.test(apiKey)) {
            return { valid: false, error: `Invalid API key format for ${service}` };
        }

        return { valid: true };
    }

    // --- Browser Compatibility ---
    static validateCryptoSupport() {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }

        // Test basic crypto operations
        const testData = 'test';
        const testSalt = this.getRandom(16);

        // Perform actual crypto validation
        return this.deriveKey(testData, testSalt)
            .then(key => {
                // Test encryption/decryption
                return this.encryptData(key, testData)
                    .then(encrypted => this.decryptData(key, encrypted));
            })
            .then(() => {
                console.log('✅ Web Crypto API validation passed');
            })
            .catch(e => {
                throw new Error(`Crypto validation failed: ${e.message}`);
            });
    }

    // --- Password Reset & Recovery Functions ---
    
    // Generate a secure recovery key (256-bit random key encoded as base64)
    static generateRecoveryKey() {
        const randomBytes = this.getRandom(32); // 256 bits
        const base64Key = this.bufferToBase64(randomBytes);
        
        // Format for readability: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
        const formatted = base64Key.match(/.{1,4}/g).join('-');
        return formatted;
    }

    // Verify recovery key format
    static verifyRecoveryKey(recoveryKey) {
        try {
            // Remove formatting
            const cleaned = recoveryKey.replace(/-/g, '');
            
            // Check if it's valid base64
            const decoded = this.base64ToBuffer(cleaned);
            
            // Check if it's the right length (32 bytes = 256 bits)
            return decoded.byteLength === 32;
        } catch {
            return false;
        }
    }

    // Derive master key from password
    static async deriveMasterKey(password) {
        const salt = this.getRandom(this.CRYPTO_CONFIG.SALT_LENGTH_BYTES);
        const saltBase64 = this.bufferToBase64(salt);
        
        const key = await this.deriveKey(password, salt);
        
        return {
            key,
            salt: saltBase64
        };
    }

    // Verify master password against stored key
    static async verifyMasterPassword(password, storedMasterKey) {
        try {
            const salt = this.base64ToBuffer(storedMasterKey.salt);
            const derivedKey = await this.deriveKey(password, salt);
            
            // Export both keys and compare
            const storedKeyData = await window.crypto.subtle.exportKey('raw', storedMasterKey.key);
            const derivedKeyData = await window.crypto.subtle.exportKey('raw', derivedKey);
            
            // Compare byte by byte
            const stored = new Uint8Array(storedKeyData);
            const derived = new Uint8Array(derivedKeyData);
            
            if (stored.length !== derived.length) return false;
            
            let match = true;
            for (let i = 0; i < stored.length; i++) {
                if (stored[i] !== derived[i]) {
                    match = false;
                    break;
                }
            }
            
            return match;
        } catch {
            return false;
        }
    }

    // Re-encrypt all entries with new master key
    static async reEncryptEntries(entries, oldMasterKey, newMasterKey) {
        const reEncrypted = [];
        
        for (const entry of entries) {
            try {
                // Decrypt with old key
                const decryptedEntry = {};
                
                for (const [field, value] of Object.entries(entry)) {
                    if (typeof value === 'string' && field !== 'id' && field !== 'type' && field !== 'createdAt' && field !== 'updatedAt') {
                        try {
                            // Try to decrypt (it might be encrypted)
                            const decrypted = await this.decryptData(oldMasterKey.key, value);
                            decryptedEntry[field] = decrypted;
                        } catch {
                            // If decryption fails, it might be plain text
                            decryptedEntry[field] = value;
                        }
                    } else {
                        decryptedEntry[field] = value;
                    }
                }
                
                // Encrypt with new key
                const encryptedEntry = { ...decryptedEntry };
                
                for (const [field, value] of Object.entries(decryptedEntry)) {
                    if (typeof value === 'string' && field !== 'id' && field !== 'type' && field !== 'createdAt' && field !== 'updatedAt') {
                        encryptedEntry[field] = await this.encryptData(newMasterKey.key, value);
                    }
                }
                
                reEncrypted.push(encryptedEntry);
            } catch (err) {
                console.error('Error re-encrypting entry:', err);
                throw new Error(`Failed to re-encrypt entry: ${entry.title || 'Unknown'}`);
            }
        }
        
        return reEncrypted;
    }

    // Store recovery key encrypted with master key
    static async encryptRecoveryKey(recoveryKey, masterKey) {
        const cleaned = recoveryKey.replace(/-/g, '');
        return await this.encryptData(masterKey.key, cleaned);
    }

    // Decrypt recovery key with master key
    static async decryptRecoveryKey(encryptedRecoveryKey, masterKey) {
        const decrypted = await this.decryptData(masterKey.key, encryptedRecoveryKey);
        // Format for readability
        const formatted = decrypted.match(/.{1,4}/g).join('-');
        return formatted;
    }

    // Recover master key from recovery key
    static async recoverMasterKeyFromRecoveryKey(recoveryKey) {
        try {
            // Clean the recovery key
            const cleaned = recoveryKey.replace(/-/g, '');
            
            // Convert to buffer
            const keyBuffer = this.base64ToBuffer(cleaned);
            
            // Import as CryptoKey
            const key = await window.crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: this.CRYPTO_CONFIG.KEY_ALGORITHM },
                false,
                ['encrypt', 'decrypt']
            );
            
            // Generate a deterministic salt from the recovery key
            const saltBuffer = await window.crypto.subtle.digest('SHA-256', keyBuffer);
            const salt = new Uint8Array(saltBuffer).slice(0, this.CRYPTO_CONFIG.SALT_LENGTH_BYTES);
            const saltBase64 = this.bufferToBase64(salt);
            
            return {
                key,
                salt: saltBase64
            };
        } catch (err) {
            throw new Error('Invalid recovery key format');
        }
    }

    // Generate password reset token (for future email-based reset)
    static async generateResetToken() {
        const randomBytes = this.getRandom(32);
        const token = this.bufferToBase64(randomBytes);
        const expiry = Date.now() + (3600000); // 1 hour
        
        return {
            token,
            expiry
        };
    }

    // Validate reset token
    static validateResetToken(token, storedToken) {
        if (!storedToken) return false;
        if (Date.now() > storedToken.expiry) return false;
        return token === storedToken.token;
    }
}

export default CryptoUtils;
