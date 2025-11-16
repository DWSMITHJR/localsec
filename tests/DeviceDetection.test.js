import { describe, it, expect, beforeEach, vi } from 'vitest';
import DeviceDetection from '../src/utils/DeviceDetection.js';

describe('DeviceDetection', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent: '',
      platform: '',
    });
  });

  it('should detect desktop device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Win32',
    });
    
    const result = DeviceDetection.detectDevice();
    
    expect(result.isDesktop).toBe(true);
    expect(result.isMobile).toBe(false);
    expect(result.isTablet).toBe(false);
    expect(result.isTV).toBe(false);
    expect(result.isAndroid).toBe(false);
    expect(result.isIOS).toBe(false);
    expect(result.isIPad).toBe(false);
    expect(result.isFireTV).toBe(false);
  });

  it('should detect mobile device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile/15E148',
      platform: 'iPhone',
    });
    
    const result = DeviceDetection.detectDevice();
    
    expect(result.isMobile).toBe(true);
    expect(result.isDesktop).toBe(false);
    expect(result.isTablet).toBe(false);
    expect(result.isIOS).toBe(true);
    expect(result.isIPad).toBe(false);
  });

  it('should detect Android device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) Mobile Safari/537.36',
      platform: 'Linux armv8l',
    });
    
    const result = DeviceDetection.detectDevice();
    
    expect(result.isMobile).toBe(true);
    expect(result.isAndroid).toBe(true);
    expect(result.isIOS).toBe(false);
    expect(result.isDesktop).toBe(false);
  });

  it('should detect tablet device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      platform: 'iPad',
    });
    
    const result = DeviceDetection.detectDevice();
    
    expect(result.isTablet).toBe(true);
    expect(result.isMobile).toBe(false);
    expect(result.isDesktop).toBe(false);
    expect(result.isIPad).toBe(true);
    expect(result.isIOS).toBe(true);
  });

  it('should detect TV device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36',
      platform: 'Linux SmartTV',
    });
    
    const result = DeviceDetection.detectDevice();
    
    expect(result.isTV).toBe(true);
    expect(result.isMobile).toBe(false);
    expect(result.isDesktop).toBe(false);
    expect(result.isTablet).toBe(false);
  });

  it('should detect Fire TV device', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 5.1; FireTV Build/LMY47O) AppleWebKit/537.36',
      platform: 'Linux',
    });
    
    const result = DeviceDetection.detectDevice();
    
    expect(result.isFireTV).toBe(true);
    expect(result.isTV).toBe(true);
    expect(result.isAndroid).toBe(true);
  });

  it('should return all device properties', () => {
    const mockNavigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Win32',
    };
    vi.stubGlobal('navigator', mockNavigator);
    
    const result = DeviceDetection.detectDevice();
    
    expect(result).toHaveProperty('userAgent');
    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('isMobile');
    expect(result).toHaveProperty('isTablet');
    expect(result).toHaveProperty('isTV');
    expect(result).toHaveProperty('isFireTV');
    expect(result).toHaveProperty('isAndroid');
    expect(result).toHaveProperty('isIPad');
    expect(result).toHaveProperty('isIOS');
    expect(result).toHaveProperty('isDesktop');
    
    expect(result.userAgent).toBe(mockNavigator.userAgent);
    expect(result.platform).toBe(mockNavigator.platform);
  });
});