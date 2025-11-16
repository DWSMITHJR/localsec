// tests/themer.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
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
      store = {};
    }),
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock document and CSS custom properties
const mockStyle = {
  setProperty: vi.fn(),
  removeProperty: vi.fn()
};

Object.defineProperty(document, 'documentElement', {
  value: {
    style: mockStyle,
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    getAttribute: vi.fn()
  },
  writable: true
});

describe('themer', () => {
  beforeEach(async () => {
    vi.resetModules();
    // Clear global Themer before importing
    if (global.Themer) {
      delete global.Themer;
    }
    // Import the themer script after resetting modules
    await import('../src/js/themer.js');
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset themer state
    if (window.Themer && window.Themer.themes) {
      window.Themer.themes.clear();
    }
    if (window.Themer && window.Themer.listeners) {
      window.Themer.listeners.clear();
    }
  });

  it('should register themes', () => {
    const theme = {
      name: 'test',
      properties: {
        '--primary-color': '#blue',
        '--background': '#white'
      }
    };

    window.Themer.register('test', theme);
    expect(window.Themer.themes.has('test')).toBe(true);
    expect(window.Themer.themes.get('test')).toEqual(theme);
  });

  it('should apply theme and set CSS properties', () => {
    const theme = {
      name: 'test',
      variables: {
        '--primary-color': '#blue',
        '--background': '#white'
      }
    };

    window.Themer.register('test', theme);
    window.Themer.apply('test');

    expect(mockStyle.setProperty).toHaveBeenCalledWith('--primary-color', '#blue');
    expect(mockStyle.setProperty).toHaveBeenCalledWith('--background', '#white');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('themer-current-theme', 'test');
  });

  it('should handle missing theme gracefully', () => {
    window.Themer.apply('nonexistent');
    expect(mockStyle.setProperty).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('themer-current-theme', 'nonexistent');
  });

  it('should get current theme from localStorage', () => {
    // Clear any current theme first
    if (window.Themer && window.Themer.reset) {
      window.Themer.reset();
    }
    localStorageMock.setItem('themer-current-theme', 'saved-theme');
    
    const theme = {
      variables: {
        '--color': '#red'
      }
    };
    
    window.Themer.register('saved-theme', theme);
    const currentTheme = window.Themer.getCurrent();
    
    expect(currentTheme).toBe('saved-theme');
  });

  it('should return default theme when none is set', () => {
    // Clear any existing theme and reset themer state
    localStorageMock.clear();
    if (window.Themer && window.Themer.reset) {
      window.Themer.reset();
    }
    const currentTheme = window.Themer.getCurrent();
    expect(currentTheme).toBe('light');
  });

  it('should toggle between themes', () => {
    const lightTheme = {
      name: 'light',
      variables: { '--bg': 'white' }
    };
    const darkTheme = {
      name: 'dark',
      variables: { '--bg': 'black' }
    };

    window.Themer.register('light', lightTheme);
    window.Themer.register('dark', darkTheme);
    
    // Start with light theme
    window.Themer.apply('light');
    expect(window.Themer.getCurrent()).toBe('light');
    
    // Toggle to dark
    window.Themer.toggle(['light', 'dark']);
    expect(window.Themer.getCurrent()).toBe('dark');
    
    // Toggle back to light
    window.Themer.toggle(['light', 'dark']);
    expect(window.Themer.getCurrent()).toBe('light');
  });

  it('should handle toggle when no themes are registered', () => {
    window.Themer.apply('light');
    window.Themer.toggle();
    expect(window.Themer.getCurrent()).toBe('light');
  });

  it('should persist theme to localStorage', () => {
    const theme = {
      name: 'persistent',
      variables: { '--test': 'value' }
    };

    window.Themer.register('persistent', theme);
    window.Themer.apply('persistent');
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('themer-current-theme', 'persistent');
  });

  it('should load theme from localStorage on init', () => {
    localStorageMock.setItem('themer-current-theme', 'saved');
    
    const theme = {
      name: 'saved',
      variables: { '--loaded': 'true' }
    };
    
    window.Themer.register('saved', theme);
    window.Themer.init();
    
    expect(mockStyle.setProperty).toHaveBeenCalledWith('--loaded', 'true');
  });

  it('should notify listeners on theme change', () => {
    const listener = vi.fn();
    
    window.Themer.subscribe((change) => {
      listener(change);
    });
    
    const theme = {
      variables: {
        '--primary-color': '#blue'
      }
    };
    
    window.Themer.register('test', theme);
    window.Themer.apply('test');
    
    expect(listener).toHaveBeenCalledWith({
      type: 'change',
      from: 'saved',
      to: 'test'
    });
  });

  it('should unsubscribe listeners', () => {
    const listener = vi.fn();
    
    const unsubscribe = window.Themer.subscribe((change) => {
      listener(change);
    });
    unsubscribe();
    
    const theme = {
      variables: { '--test': 'value' }
    };
    
    window.Themer.register('unsubscribed', theme);
    window.Themer.apply('unsubscribed');
    
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    
    window.Themer.subscribe((change) => {
      listener1(change);
    });
    window.Themer.subscribe((change) => {
      listener2(change);
    });
    
    const theme = {
      variables: { '--multi': 'true' }
    };
    
    window.Themer.register('multi', theme);
    window.Themer.apply('multi');
    
    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should handle CSS property errors gracefully', () => {
    // Mock setProperty to throw an error
    mockStyle.setProperty.mockImplementationOnce(() => {
      throw new Error('CSS property error');
    });

    const theme = {
      variables: { '--error': 'value' }
    };

    expect(() => {
      window.Themer.register('error', theme);
      window.Themer.apply('error');
    }).not.toThrow();
  });
});
