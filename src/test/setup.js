import { vi } from 'vitest';

// Mock window with location before any imports
vi.stubGlobal('window', {
  location: {
    origin: 'http://localhost:3000',
    hostname: 'localhost'
  },
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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
};
vi.stubGlobal('localStorage', localStorageMock);