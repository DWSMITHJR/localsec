import { describe, it, expect, beforeEach, vi } from 'vitest';
import CryptoUtils from '../src/utils/CryptoUtils.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock window.crypto with proper implementations
vi.stubGlobal('window', {
  atob: vi.fn((str) => {
    // Simple base64 decode for testing
    return Buffer.from(str, 'base64').toString('binary');
  }),
  btoa: vi.fn((str) => {
    // Simple base64 encode for testing
    return Buffer.from(str, 'binary').toString('base64');
  }),
  crypto: {
    subtle: {
      generateKey: vi.fn().mockResolvedValue({}),
      deriveKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: vi.fn().mockResolvedValue({}),
      exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  }
});

describe('CryptoUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRandom', () => {
    it('should return random bytes of specified length', () => {
      const length = 32;
      const randomBytes = CryptoUtils.getRandom(length);
      
      expect(randomBytes).toBeInstanceOf(Uint8Array);
      expect(randomBytes.length).toBe(length);
    });

    it('should return different values on multiple calls', () => {
      const bytes1 = CryptoUtils.getRandom(32);
      const bytes2 = CryptoUtils.getRandom(32);
      
      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('bufferToBase64', () => {
    it('should convert buffer to base64 string', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = CryptoUtils.bufferToBase64(buffer.buffer);
      
      expect(base64).toBe('SGVsbG8=');
    });
  });

  describe('base64ToBuffer', () => {
    it('should convert base64 string to buffer', () => {
      const base64 = 'SGVsbG8=';
      const buffer = CryptoUtils.base64ToBuffer(base64);
      
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      const bytes = new Uint8Array(buffer);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });
  });

  describe('hashPassword', () => {
    it('should hash password with salt', async () => {
      const password = 'TestPassword123!';
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      
      const hash = await CryptoUtils.hashPassword(password, salt);
      
      expect(hash).toBeDefined();
      expect(hash).toBeTruthy();
    });
  });

  describe('deriveKey', () => {
    it('should derive key from password and salt', async () => {
      const password = 'TestPassword123!';
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      
      const key = await CryptoUtils.deriveKey(password, salt);
      
      expect(key).toBeInstanceOf(ArrayBuffer);
      expect(key.byteLength).toBe(32);
    });
  });

  describe('encryptData', () => {
    it('should encrypt data with key', async () => {
      const key = new ArrayBuffer(32);
      const data = 'Test data to encrypt';
      
      const encrypted = await CryptoUtils.encryptData(key, data);
      
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });
  });

  describe('decryptData', () => {
    it('should decrypt data correctly', async () => {
      const key = new ArrayBuffer(32);
      const data = 'Test data to encrypt';
      
      // First encrypt the data
      const encrypted = await CryptoUtils.encryptData(key, data);
      
      // Then decrypt it
      const decrypted = await CryptoUtils.decryptData(key, encrypted);
      
      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
    });

    it('should handle decryption errors', async () => {
      const key = new ArrayBuffer(32);
      const invalidEncrypted = 'invalid-base64-data';
      
      const result = await CryptoUtils.decryptData(key, invalidEncrypted);
      expect(result).toBeDefined();
    });
  });

  describe('generatePassword', () => {
    it('should generate password with default length', () => {
      const password = CryptoUtils.generatePassword();
      
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThanOrEqual(12);
    });

    it('should generate password with specified length', () => {
      const length = 20;
      const password = CryptoUtils.generatePassword(length);
      
      expect(password.length).toBe(length);
    });
  });

  describe('generateRecoveryKey', () => {
    it('should generate recovery key', () => {
      const recoveryKey = CryptoUtils.generateRecoveryKey();
      
      expect(typeof recoveryKey).toBe('string');
      expect(recoveryKey.length).toBeGreaterThan(0);
    });
  });

  describe('generateResetToken', () => {
    it('should generate reset token', () => {
      const resetToken = CryptoUtils.generateResetToken();
      
      expect(resetToken).toBeDefined();
      expect(resetToken).toBeTruthy();
    });
  });
});
