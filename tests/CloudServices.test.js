import { describe, it, expect, beforeEach, vi } from 'vitest';
import CloudServices from '../src/services/CloudServices.js';
import CryptoUtils from '../src/utils/CryptoUtils.js';


// Mock SecurityUtils
vi.mock('../src/utils/SecurityUtils.js', () => ({
  default: {
    auditLog: {
      log: vi.fn()
    }
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock crypto
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => Array.from({ length: arr.length }, () => Math.floor(Math.random() * 256))),
    subtle: {
      digest: vi.fn().mockResolvedValue(new Uint8Array(32))
    }
  },
  writable: true
});

const localStorageMock = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

vi.stubGlobal('localStorage', localStorageMock);

describe('CloudServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();

    vi.spyOn(CryptoUtils, 'encryptData').mockResolvedValue('encrypted_data');
    vi.spyOn(CryptoUtils, 'decryptData').mockResolvedValue('{"value":"test","expires":' + (Date.now() + 1000000) + ',"checksum":"hash"}');
    vi.spyOn(CryptoUtils, 'calculateChecksum').mockResolvedValue('hash');
    vi.spyOn(CryptoUtils, 'generateSalt').mockReturnValue('salt');
    vi.spyOn(CryptoUtils, 'deriveKey').mockResolvedValue('key');
    vi.spyOn(CryptoUtils, 'testCompatibility').mockResolvedValue(true);
  });

  describe('generateSecureState', () => {
    it('should generate a 64-character hex string', async () => {
      const state = CloudServices.generateSecureState();
      
      expect(state).toMatch(/^[a-f0-9]{64}$/);
      expect(state.length).toBe(64);
    });

    it('should generate different states each time', async () => {
      const state1 = CloudServices.generateSecureState();
      const state2 = CloudServices.generateSecureState();
      
      expect(state1).not.toBe(state2);
    });
  });

  describe('generatePKCEChallenge', () => {
    it('should generate PKCE challenge', async () => {
      const challenge = await CloudServices.generatePKCEChallenge();
      
      expect(challenge).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(challenge.length).toBeGreaterThan(0);
    });
  });

  describe('validateAuthCode', () => {
    it('should validate correct authorization codes', async () => {
      
      expect(CloudServices.validateAuthCode('abc123def456abc123de')).toBe(true);
      expect(CloudServices.validateAuthCode('a'.repeat(50))).toBe(true);
    });

    it('should reject invalid authorization codes', async () => {
      
      expect(CloudServices.validateAuthCode('')).toBe(false);
      expect(CloudServices.validateAuthCode(null)).toBe(false);
      expect(CloudServices.validateAuthCode(undefined)).toBe(false);
      expect(CloudServices.validateAuthCode(123)).toBe(false);
      expect(CloudServices.validateAuthCode('short')).toBe(false);
      expect(CloudServices.validateAuthCode('a'.repeat(150))).toBe(false);
      expect(CloudServices.validateAuthCode('invalid@code')).toBe(false);
    });
  });

  describe('token management', () => {
    it('should check if token is blacklisted', async () => {
      
      expect(CloudServices.isTokenBlacklisted('test_token')).toBe(false);
      
      CloudServices.blacklistToken('test_token');
      expect(CloudServices.isTokenBlacklisted('test_token')).toBe(true);
    });

    it('should hash token for logging', async () => {
      
      const hash = CloudServices.hashToken('abcdefghijklmnopqrstuvwxyz123456');
      expect(hash).toBe('abcdefgh...3456');
    });

    it('should get valid token (non-expired)', async () => {
      
      const credential = {
        accessToken: 'valid_token',
        expiresAt: Date.now() + 1000000
      };
      
      const token = await CloudServices.getValidToken(credential);
      expect(token).toBe('valid_token');
    });

    it('should get valid token (expired but returns current)', async () => {
      
      const credential = {
        accessToken: 'expired_token',
        expiresAt: Date.now() - 1000
      };
      
      const token = await CloudServices.getValidToken(credential);
      expect(token).toBe('expired_token');
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within limit', async () => {
      
      // First request should be allowed
      expect(CloudServices.checkRateLimit('test_key')).toBe(false);
      
      // More requests within limit should be allowed
      for (let i = 0; i < 4; i++) {
        expect(CloudServices.checkRateLimit('test_key')).toBe(false);
      }
    });

    it('should block requests exceeding limit', async () => {
      
      // Exceed the limit (5 attempts)
      for (let i = 0; i < 6; i++) {
        CloudServices.checkRateLimit('test_key');
      }
      
      // Next request should be blocked
      expect(CloudServices.checkRateLimit('test_key')).toBe(true);
    });

    it('should reset rate limit window', async () => {
      
      // Make some requests
      CloudServices.checkRateLimit('test_key');
      CloudServices.checkRateLimit('test_key');
      
      // Mock time passing beyond window
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => originalDateNow() + 16 * 60 * 1000); // 16 minutes later
      
      // Should be allowed again
      expect(CloudServices.checkRateLimit('test_key')).toBe(false);
      
      Date.now = originalDateNow;
    });
  });

  describe('secure storage', () => {
    it('should store and retrieve secure data', async () => {
      const localStorageMock = {
        setItem: vi.fn(),
        getItem: vi.fn().mockReturnValue('encrypted_data'),
      };
      vi.stubGlobal('localStorage', localStorageMock);
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      const testData = { secret: 'value' };
      
      // Mock decryptData to return the test data
      CryptoUtils.decryptData.mockResolvedValueOnce(
        JSON.stringify({
          value: testData,
          expires: Date.now() + 1000000,
          checksum: 'hash'
        })
      );
      
      await CloudServices.secureStorage.set('test_key', testData);
      expect(setItemSpy).toHaveBeenCalledWith('secure_test_key', 'encrypted_data');
      expect(CryptoUtils.encryptData).toHaveBeenCalled();
      
      const retrieved = await CloudServices.secureStorage.get('test_key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle expired secure data', async () => {
      const localStorageMock = {
        removeItem: vi.fn(),
        getItem: vi.fn().mockReturnValue('encrypted_data'),
      };
      vi.stubGlobal('localStorage', localStorageMock);
      const removeItemSpy = vi.spyOn(localStorageMock, 'removeItem');
      // Mock expired data
      CryptoUtils.decryptData.mockResolvedValueOnce(
        JSON.stringify({
          value: 'expired',
          expires: Date.now() - 1000,
          checksum: 'hash'
        })
      );
      
      const result = await CloudServices.secureStorage.get('expired_key');
      expect(result).toBeNull();
      expect(removeItemSpy).toHaveBeenCalledWith('secure_expired_key');
    });

    it('should handle tampered secure data', async () => {
      const localStorageMock = {
        removeItem: vi.fn(),
        getItem: vi.fn().mockReturnValue('tampered_data'),
      };
      vi.stubGlobal('localStorage', localStorageMock);
      const removeItemSpy = vi.spyOn(localStorageMock, 'removeItem');
      // Mock data with wrong checksum
      CryptoUtils.decryptData.mockResolvedValueOnce(
        JSON.stringify({
          value: 'tampered',
          expires: Date.now() + 1000000,
          checksum: 'wrong_hash'
        })
      );
      
      CryptoUtils.calculateChecksum.mockResolvedValueOnce('correct_hash');
      
      const result = await CloudServices.secureStorage.get('tampered_key');
      expect(result).toBeNull();
      expect(removeItemSpy).toHaveBeenCalledWith('secure_tampered_key');
    });

    it('should delete secure data', async () => {
      const localStorageMock = {
        removeItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', localStorageMock);
      const removeItemSpy = vi.spyOn(localStorageMock, 'removeItem');
      CloudServices.secureStorage.delete('test_key');
      expect(removeItemSpy).toHaveBeenCalledWith('secure_test_key');
    });
  });

  describe('getSections', () => {
    it('should fetch OneNote sections', async () => {
      
      const mockResponse = { value: [{ id: '1', name: 'Section 1' }] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });
      
      const result = await CloudServices.getSections('token', 'notebook_id');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/onenote/notebooks/notebook_id/sections',
        {
          headers: {
            'Authorization': 'Bearer token'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch errors', async () => {
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });
      
      await expect(CloudServices.getSections('token', 'notebook_id')).rejects.toThrow('Get sections failed: 401');
    });
  });
});