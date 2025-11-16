// tests/storageUtils.test.js
import { describe, it, expect, vi } from 'vitest';

// Mock console.log
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('storageUtils', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  it('should save data to file and log the action', async () => {
    const storageUtils = require('../src/utils/storageUtils.js').default;
    
    await storageUtils.saveToFile('test-key', 'test-data');
    
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: test-key');
  });

  it('should return a resolved promise', async () => {
    const storageUtils = require('../src/utils/storageUtils.js').default;
    
    const result = await storageUtils.saveToFile('key', 'data');
    
    expect(result).toBeUndefined();
  });

  it('should handle different key types', async () => {
    const storageUtils = require('../src/utils/storageUtils.js').default;
    
    await storageUtils.saveToFile(123, {});
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: 123');
    
    await storageUtils.saveToFile('user-token', 'secret-value');
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: user-token');
  });

  it('should handle different data types', async () => {
    const storageUtils = require('../src/utils/storageUtils.js').default;
    
    await storageUtils.saveToFile('string', 'test');
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: string');
    
    await storageUtils.saveToFile('object', { a: 1 });
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: object');
    
    await storageUtils.saveToFile('array', [1, 2, 3]);
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: array');
    
    await storageUtils.saveToFile('number', 42);
    expect(consoleSpy).toHaveBeenCalledWith('Saving data to file for key: number');
  });
});
