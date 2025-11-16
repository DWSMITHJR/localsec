// tests/SecretValidator.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return index < keys.length ? keys[index] : null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

// Mock the global objects
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Now import SecretValidator after mocks are set up
import SecretValidator from '../src/utils/SecretValidator.js';

describe('SecretValidator', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return secure when no secrets are found', () => {
    localStorageMock.setItem('user', 'john');
    localStorageMock.setItem('theme', 'dark');
    sessionStorageMock.setItem('temp', 'data');
    
    const result = SecretValidator.audit();
    
    expect(result.isSecure).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.summary).toBe('0 potential security violations found.');
  });

  it('should detect secrets in localStorage', () => {
    localStorageMock.setItem('api_secret', 'secret123');
    localStorageMock.setItem('auth_token', 'token456');
    localStorageMock.setItem('user', 'john');
    
    const result = SecretValidator.audit();
    
    expect(result.isSecure).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations).toContain('Potential secret found in localStorage: api_secret');
    expect(result.violations).toContain('Potential secret found in localStorage: auth_token');
    expect(result.summary).toBe('2 potential security violations found.');
  });

  it('should detect secrets in sessionStorage', () => {
    sessionStorageMock.setItem('session_secret', 'temp_secret');
    sessionStorageMock.setItem('csrf_token', 'csrf123');
    sessionStorageMock.setItem('temp', 'data');
    
    const result = SecretValidator.audit();
    
    expect(result.isSecure).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations).toContain('Potential secret found in sessionStorage: session_secret');
    expect(result.violations).toContain('Potential secret found in sessionStorage: csrf_token');
    expect(result.summary).toBe('2 potential security violations found.');
  });

  it('should detect secrets in both storage types', () => {
    localStorageMock.setItem('api_secret', 'secret123');
    sessionStorageMock.setItem('session_token', 'token456');
    
    const result = SecretValidator.audit();
    
    expect(result.isSecure).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.summary).toBe('2 potential security violations found.');
  });

  it('should be case insensitive when detecting secrets', () => {
    localStorageMock.setItem('SECRET_KEY', 'value');
    sessionStorageMock.setItem('TOKEN_VALUE', 'value');
    
    const result = SecretValidator.audit();
    
    expect(result.isSecure).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations).toContain('Potential secret found in localStorage: SECRET_KEY');
    expect(result.violations).toContain('Potential secret found in sessionStorage: TOKEN_VALUE');
  });

  it('should return correct audit structure', () => {
    localStorageMock.setItem('user', 'john');
    
    const result = SecretValidator.audit();
    
    expect(result).toHaveProperty('isSecure');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.violations)).toBe(true);
    expect(typeof result.summary).toBe('string');
  });
});
