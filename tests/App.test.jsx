import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';

// Mock window and location before any imports
vi.stubGlobal('window', {
  location: {
    origin: 'http://localhost:3000',
    hostname: 'localhost'
  },
  atob: vi.fn(),
  btoa: vi.fn(),
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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock CloudServices at the module level
vi.mock('../services/CloudServices.js', () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(true),
    backup: vi.fn().mockResolvedValue(true),
    restore: vi.fn().mockResolvedValue([]),
    sync: vi.fn().mockResolvedValue(true),
    checkConnectivity: vi.fn().mockResolvedValue(true),
    OAUTH_CONFIG: {
      google: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/oauth/google',
        scopes: ['https://www.googleapis.com/auth/drive']
      },
      microsoft: {
        clientId: 'test-ms-client-id',
        redirectUri: 'http://localhost:3000/oauth/microsoft',
        scopes: ['https://graph.microsoft.com/Files.ReadWrite']
      }
    }
  },
}));

// Mock the SecurityUtils
vi.mock('../utils/SecurityUtils.js', () => ({
  default: {
    auditLog: {
      loadLogs: vi.fn(),
      log: vi.fn(),
    },
    validatePassword: vi.fn().mockReturnValue({ valid: true, strength: 'strong' }),
    checkRateLimit: vi.fn().mockReturnValue(true),
    generateSecureToken: vi.fn().mockReturnValue('test-token'),
    validateSessionToken: vi.fn().mockReturnValue(true),
    sanitizeInput: vi.fn((input) => input),
    sanitizeEntryData: vi.fn((entry) => entry),
    sanitizeAIEntryData: vi.fn((entry) => entry),
    validateFileType: vi.fn().mockReturnValue(true),
    validateFileSize: vi.fn().mockReturnValue(true),
    STORAGE_CONFIG: {
      MAX_FILE_SIZE: 10485760,
      ALLOWED_FILE_TYPES: ['.vault'],
    },
  },
}));

// Mock the CryptoUtils
vi.mock('../utils/CryptoUtils.js', () => ({
  CryptoUtils: {
    hashPassword: vi.fn().mockResolvedValue('test-hash'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    deriveKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    encryptData: vi.fn().mockResolvedValue('encrypted-data'),
    decryptData: vi.fn().mockResolvedValue('decrypted-data'),
    exportVault: vi.fn().mockResolvedValue('export-data'),
    importVault: vi.fn().mockResolvedValue([]),
    exportAIApiKeys: vi.fn().mockResolvedValue('export-data'),
    importAIApiKeys: vi.fn().mockResolvedValue([]),
    generatePassword: vi.fn().mockReturnValue('GeneratedPassword123!'),
    generateRecoveryKey: vi.fn().mockReturnValue('recovery-key'),
    generateResetToken: vi.fn().mockReturnValue('reset-token'),
    getRandom: vi.fn().mockReturnValue(new Uint8Array(32)),
    bufferToBase64: vi.fn().mockReturnValue('base64-data'),
    base64ToBuffer: vi.fn().mockReturnValue(new ArrayBuffer(32)),
    CRYPTO_CONFIG: {
      IV_LENGTH_BYTES: 12,
      SALT_LENGTH_BYTES: 32,
      KEY_LENGTH_BYTES: 32,
      ITERATIONS: 100000,
      KEY_ALGORITHM: 'AES-GCM',
    },
  },
}));

// Mock Messages
vi.mock('../utils/Messages.js', () => ({
  getErrorMessage: vi.fn().mockImplementation(key => `Error: ${key}`),
  getSuccessMessage: vi.fn().mockImplementation(key => `Success: ${key}`),
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Now import App after mocks are set up
import App from '../src/App.jsx';

describe('App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vault_setup') return null;
      return null;
    });
    localStorageMock.setItem.mockClear();
  });

  it('should import without errors', () => {
    expect(App).toBeDefined();
  });

  it('should be a React component', () => {
    expect(typeof App).toBe('function');
  });

  it('should have correct component name', () => {
    expect(App.name).toBe('App');
  });
});
