import DeviceDetection from '../src/utils/DeviceDetection.js';

class PlatformTests {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runAll() {
    console.log('Starting platform compatibility tests...');
    
    // Test Device Detection
    await this.testDeviceDetection();
    
    // Test Browser APIs
    await this.testBrowserAPIs();
    
    // Test Storage
    await this.testStorage();
    
    // Test Crypto
    await this.testCrypto();
    
    // Test Performance
    await this.testPerformance();
    
    this.endTime = Date.now();
    console.log(`All tests completed in ${this.endTime - this.startTime}ms`);
  }

  async testDeviceDetection() {
    const suite = 'Device Detection';
    
    this.addResult(suite, 'Device detection initialized', 
      typeof DeviceDetection !== 'undefined', 'passed');
    
    try {
      const device = DeviceDetection.detectDevice();
      
      this.addResult(suite, 'Platform detected', 
        !!device.platform, 'passed');
      
      this.addResult(suite, 'Browser detected', 
        !!device.browser, 'passed');
      
      this.addResult(suite, 'Screen size detected', 
        device.screen && device.screen.width > 0 && device.screen.height > 0, 'passed');
      
      this.addResult(suite, 'Memory detection', 
        typeof device.memory !== 'undefined', 'passed');
      
    } catch (error) {
      this.addResult(suite, 'Device detection error', false, 'failed', error.message);
    }
  }

  async testBrowserAPIs() {
    const suite = 'Browser APIs';
    
    // Test fetch
    try {
      const response = await fetch('data:text/plain,test');
      this.addResult(suite, 'Fetch API available', response.ok, 'passed');
    } catch (error) {
      this.addResult(suite, 'Fetch API available', false, 'failed', error.message);
    }
    
    // Test Web Workers
    this.addResult(suite, 'Web Workers available', 
      typeof Worker !== 'undefined', 'passed');
    
    // Test Service Workers
    this.addResult(suite, 'Service Workers available', 
      'serviceWorker' in navigator, 'passed');
    
    // Test Notifications
    this.addResult(suite, 'Notifications API available', 
      'Notification' in window, 'passed');
    
    // Test Geolocation
    this.addResult(suite, 'Geolocation API available', 
      'geolocation' in navigator, 'passed');
  }

  async testStorage() {
    const suite = 'Storage';
    
    // Test LocalStorage
    try {
      const testKey = 'test_' + Date.now();
      const testValue = 'test_value';
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      this.addResult(suite, 'LocalStorage functional', 
        retrieved === testValue, 'passed');
    } catch (error) {
      this.addResult(suite, 'LocalStorage functional', false, 'failed', error.message);
    }
    
    // Test SessionStorage
    try {
      const testKey = 'test_' + Date.now();
      const testValue = 'test_value';
      sessionStorage.setItem(testKey, testValue);
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      this.addResult(suite, 'SessionStorage functional', 
        retrieved === testValue, 'passed');
    } catch (error) {
      this.addResult(suite, 'SessionStorage functional', false, 'failed', error.message);
    }
    
    // Test IndexedDB
    try {
      const request = indexedDB.open('test_db', 1);
      
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          indexedDB.deleteDatabase('test_db');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      
      this.addResult(suite, 'IndexedDB functional', true, 'passed');
    } catch (error) {
      this.addResult(suite, 'IndexedDB functional', false, 'failed', error.message);
    }
  }

  async testCrypto() {
    const suite = 'Cryptography';
    
    // Test Web Crypto API
    this.addResult(suite, 'Web Crypto API available', 
      'crypto' in window && 'subtle' in window.crypto, 'passed');
    
    if (window.crypto && window.crypto.subtle) {
      try {
        // Test random values
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        this.addResult(suite, 'Random values generation', 
          array.length === 16, 'passed');
        
        // Test digest
        const data = new TextEncoder().encode('test');
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        this.addResult(suite, 'SHA-256 digest', 
          hash.byteLength === 32, 'passed');
        
        // Test key generation
        const key = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        this.addResult(suite, 'AES-256 key generation', 
          !!key, 'passed');
        
      } catch (error) {
        this.addResult(suite, 'Web Crypto operations', false, 'failed', error.message);
      }
    }
  }

  async testPerformance() {
    const suite = 'Performance';
    
    // Test Performance API
    this.addResult(suite, 'Performance API available', 
      'performance' in window, 'passed');
    
    if (window.performance) {
      // Test navigation timing
      const nav = performance.getEntriesByType('navigation')[0];
      this.addResult(suite, 'Navigation timing available', 
        !!nav && nav.loadEventEnd > 0, 'passed');
      
      // Test resource timing
      const resources = performance.getEntriesByType('resource');
      this.addResult(suite, 'Resource timing available', 
        Array.isArray(resources), 'passed');
      
      // Test mark and measure
      try {
        performance.mark('test-start');
        performance.mark('test-end');
        performance.measure('test', 'test-start', 'test-end');
        this.addResult(suite, 'Performance marks/measures', true, 'passed');
      } catch (error) {
        this.addResult(suite, 'Performance marks/measures', false, 'failed', error.message);
      }
    }
    
    // Test performance.now()
    try {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      const end = performance.now();
      this.addResult(suite, 'High resolution timing', 
        end - start >= 5, 'passed');
    } catch (error) {
      this.addResult(suite, 'High resolution timing', false, 'failed', error.message);
    }
  }

  addResult(suite, message, passed, status, error = null) {
    this.results.push({
      suite,
      message,
      passed,
      status,
      error,
      timestamp: Date.now()
    });
    
    const statusIcon = passed ? '✅' : '❌';
    console.log(`${statusIcon} [${suite}] ${message}${error ? ' - ' + error : ''}`);
  }

  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const duration = this.endTime - this.startTime;
    
    const suites = {};
    this.results.forEach(result => {
      if (!suites[result.suite]) {
        suites[result.suite] = { total: 0, passed: 0, failed: 0 };
      }
      suites[result.suite].total++;
      if (result.passed) {
        suites[result.suite].passed++;
      } else {
        suites[result.suite].failed++;
      }
    });
    
    return {
      summary: {
        total,
        passed,
        failed,
        duration,
        successRate: Math.round((passed / total) * 100)
      },
      suites,
      results: this.results
    };
  }
}

export default PlatformTests;
