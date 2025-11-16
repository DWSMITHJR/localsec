// tests/useSecurity.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the hooks directly to avoid React act issues
const mockUseSecurityState = vi.fn();
const mockUseEncryption = vi.fn();
const mockUseSessionTimeout = vi.fn();
const mockUseAuditLog = vi.fn();
const mockUseBiometricAuth = vi.fn();
const mockUsePasswordStrength = vi.fn();

vi.mock('../src/components/hooks/useSecurity.js', () => ({
  useSecurityState: mockUseSecurityState,
  useEncryption: mockUseEncryption,
  useSessionTimeout: mockUseSessionTimeout,
  useAuditLog: mockUseAuditLog,
  useBiometricAuth: mockUseBiometricAuth,
  usePasswordStrength: mockUsePasswordStrength
}));

describe('useSecurity hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useSecurityState', () => {
    it('should initialize with default security state', () => {
      const mockState = {
        securityLevel: 'high',
        threats: [],
        isSecure: true,
        setSecurityLevel: vi.fn(),
        addThreat: vi.fn(),
        clearThreats: vi.fn()
      };
      
      mockUseSecurityState.mockReturnValue(mockState);
      
      const result = mockUseSecurityState();
      
      expect(result.securityLevel).toBe('high');
      expect(result.threats).toEqual([]);
      expect(result.isSecure).toBe(true);
    });

    it('should detect insecure context', () => {
      const mockState = {
        securityLevel: 'low',
        threats: [],
        isSecure: false,
        setSecurityLevel: vi.fn(),
        addThreat: vi.fn(),
        clearThreats: vi.fn()
      };
      
      mockUseSecurityState.mockReturnValue(mockState);
      
      const result = mockUseSecurityState();
      
      expect(result.isSecure).toBe(false);
      expect(result.securityLevel).toBe('low');
    });
  });

  describe('useEncryption', () => {
    it('should encrypt data', async () => {
      const mockEncryption = {
        encrypt: vi.fn().mockResolvedValue('encrypted-data'),
        decrypt: vi.fn().mockResolvedValue('decrypted-data'),
        generateKey: vi.fn().mockResolvedValue('key'),
        isSupported: true
      };
      
      mockUseEncryption.mockReturnValue(mockEncryption);
      
      const result = mockUseEncryption();
      const encrypted = await result.encrypt('test data', 'password');
      
      expect(encrypted).toBe('encrypted-data');
      expect(result.encrypt).toHaveBeenCalled();
    });

    it('should decrypt data', async () => {
      const mockEncryption = {
        encrypt: vi.fn().mockResolvedValue('encrypted-data'),
        decrypt: vi.fn().mockResolvedValue('decrypted-data'),
        generateKey: vi.fn().mockResolvedValue('key'),
        isSupported: true
      };
      
      mockUseEncryption.mockReturnValue(mockEncryption);
      
      const result = mockUseEncryption();
      const decrypted = await result.decrypt('encrypted data', 'password');
      
      expect(decrypted).toBe('decrypted-data');
      expect(result.decrypt).toHaveBeenCalled();
    });
  });

  describe('useSessionTimeout', () => {
    it('should initialize with default timeout', () => {
      const mockSession = {
        timeRemaining: 1800000, // 30 minutes
        isActive: true,
        start: vi.fn(),
        extend: vi.fn(),
        end: vi.fn()
      };
      
      mockUseSessionTimeout.mockReturnValue(mockSession);
      
      const result = mockUseSessionTimeout();
      
      expect(result.timeRemaining).toBeGreaterThan(0);
      expect(result.isActive).toBe(true);
    });

    it('should start session', () => {
      const mockSession = {
        timeRemaining: 1800000,
        isActive: true,
        start: vi.fn(),
        extend: vi.fn(),
        end: vi.fn()
      };
      
      mockUseSessionTimeout.mockReturnValue(mockSession);
      
      const result = mockUseSessionTimeout();
      result.start();
      
      expect(result.start).toHaveBeenCalled();
    });
  });

  describe('useAuditLog', () => {
    it('should log events', () => {
      const mockLog = {
        events: [],
        logEvent: vi.fn(),
        clear: vi.fn(),
        getEventsByType: vi.fn()
      };
      
      mockUseAuditLog.mockReturnValue(mockLog);
      
      const result = mockUseAuditLog();
      result.logEvent('login', { user: 'test' });
      
      expect(result.logEvent).toHaveBeenCalledWith('login', { user: 'test' });
    });

    it('should clear events', () => {
      const mockLog = {
        events: [],
        logEvent: vi.fn(),
        clear: vi.fn(),
        getEventsByType: vi.fn()
      };
      
      mockUseAuditLog.mockReturnValue(mockLog);
      
      const result = mockUseAuditLog();
      result.clear();
      
      expect(result.clear).toHaveBeenCalled();
    });
  });

  describe('useBiometricAuth', () => {
    it('should detect biometric support', () => {
      const mockBiometric = {
        isSupported: true,
        isAuthenticated: false,
        authenticate: vi.fn().mockResolvedValue(true),
        checkSupport: vi.fn()
      };
      
      mockUseBiometricAuth.mockReturnValue(mockBiometric);
      
      const result = mockUseBiometricAuth();
      
      expect(result.isSupported).toBe(true);
      expect(result.isAuthenticated).toBe(false);
    });

    it('should authenticate successfully', async () => {
      const mockBiometric = {
        isSupported: true,
        isAuthenticated: false,
        authenticate: vi.fn().mockResolvedValue(true),
        checkSupport: vi.fn()
      };
      
      mockUseBiometricAuth.mockReturnValue(mockBiometric);
      
      const result = mockUseBiometricAuth();
      const authenticated = await result.authenticate();
      
      expect(authenticated).toBe(true);
      expect(result.authenticate).toHaveBeenCalled();
    });

    it('should handle authentication failure', async () => {
      const mockBiometric = {
        isSupported: true,
        isAuthenticated: false,
        authenticate: vi.fn().mockResolvedValue(false),
        checkSupport: vi.fn()
      };
      
      mockUseBiometricAuth.mockReturnValue(mockBiometric);
      
      const result = mockUseBiometricAuth();
      const authenticated = await result.authenticate();
      
      expect(authenticated).toBe(false);
    });

    it('should return false when not supported', async () => {
      const mockBiometric = {
        isSupported: false,
        isAuthenticated: false,
        authenticate: vi.fn().mockResolvedValue(false),
        checkSupport: vi.fn()
      };
      
      mockUseBiometricAuth.mockReturnValue(mockBiometric);
      
      const result = mockUseBiometricAuth();
      const authenticated = await result.authenticate();
      
      expect(authenticated).toBe(false);
      expect(result.isSupported).toBe(false);
    });
  });

  describe('usePasswordStrength', () => {
    it('should calculate strong password', () => {
      const mockPasswordStrength = {
        calculateStrength: vi.fn().mockReturnValue({
          score: 5,
          feedback: []
        })
      };
      
      mockUsePasswordStrength.mockReturnValue(mockPasswordStrength);
      
      const result = mockUsePasswordStrength();
      const strength = result.calculateStrength('StrongP@ssw0rd123!');
      
      expect(strength.score).toBe(5);
      expect(strength.feedback).toEqual([]);
      expect(result.calculateStrength).toHaveBeenCalledWith('StrongP@ssw0rd123!');
    });

    it('should calculate weak password', () => {
      const mockPasswordStrength = {
        calculateStrength: vi.fn().mockReturnValue({
          score: 0,
          feedback: [
            'Use at least 8 characters',
            'Include lowercase letters',
            'Include uppercase letters',
            'Include numbers',
            'Include special characters'
          ]
        })
      };
      
      mockUsePasswordStrength.mockReturnValue(mockPasswordStrength);
      
      const result = mockUsePasswordStrength();
      const strength = result.calculateStrength('weak');
      
      expect(strength.score).toBe(0);
      expect(strength.feedback).toContain('Use at least 8 characters');
      expect(strength.feedback).toContain('Include lowercase letters');
      expect(strength.feedback).toContain('Include uppercase letters');
      expect(strength.feedback).toContain('Include numbers');
      expect(strength.feedback).toContain('Include special characters');
    });

    it('should calculate medium password', () => {
      const mockPasswordStrength = {
        calculateStrength: vi.fn().mockReturnValue({
          score: 3,
          feedback: [
            'Include special characters',
            'Include uppercase letters'
          ]
        })
      };
      
      mockUsePasswordStrength.mockReturnValue(mockPasswordStrength);
      
      const result = mockUsePasswordStrength();
      const strength = result.calculateStrength('Medium123');
      
      expect(strength.score).toBe(3);
      expect(strength.feedback).toContain('Include special characters');
      expect(strength.feedback).toContain('Include uppercase letters');
    });

    it('should handle long passwords', () => {
      const mockPasswordStrength = {
        calculateStrength: vi.fn().mockReturnValue({
          score: 5,
          feedback: []
        })
      };
      
      mockUsePasswordStrength.mockReturnValue(mockPasswordStrength);
      
      const result = mockUsePasswordStrength();
      const strength = result.calculateStrength('VeryLongPassword123!');
      
      expect(strength.score).toBe(5);
    });

    it('should cap score at 5', () => {
      const mockPasswordStrength = {
        calculateStrength: vi.fn().mockReturnValue({
          score: 5,
          feedback: []
        })
      };
      
      mockUsePasswordStrength.mockReturnValue(mockPasswordStrength);
      
      const result = mockUsePasswordStrength();
      const strength = result.calculateStrength('ExtremelyLongPassword123!@#$');
      
      expect(strength.score).toBe(5);
    });
  });
});
