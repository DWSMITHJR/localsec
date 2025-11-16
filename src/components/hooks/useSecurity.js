// src/components/hooks/useSecurity.js
import { useState, useEffect, useCallback } from 'react';

export const useSecurityState = () => {
  const [securityLevel, setSecurityLevel] = useState('medium');
  const [threats, setThreats] = useState([]);
  const [isSecure, setIsSecure] = useState(true);

  const analyzeSecurity = useCallback(() => {
    // Security analysis logic
    const detectedThreats = [];
    let level = 'high';

    // Check for common security issues
    if (!window.isSecureContext) {
      detectedThreats.push('Insecure context');
      level = 'low';
    }

    if (navigator.userAgent.includes('Chrome') && !window.chrome) {
      detectedThreats.push('Browser integrity check failed');
      level = 'medium';
    }

    setThreats(detectedThreats);
    setSecurityLevel(level);
    setIsSecure(detectedThreats.length === 0);
  }, []);

  useEffect(() => {
    analyzeSecurity();
    const interval = setInterval(analyzeSecurity, 30000);
    return () => clearInterval(interval);
  }, [analyzeSecurity]);

  return { securityLevel, threats, isSecure, analyzeSecurity };
};

export const useEncryption = (key) => {
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionAlgorithm] = useState('AES-256-GCM');

  const encrypt = useCallback(async (data) => {
    try {
      const encrypted = await window.crypto.subtle.encrypt(
        { name: encryptionAlgorithm, iv: crypto.getRandomValues(new Uint8Array(12)) },
        key,
        new TextEncoder().encode(JSON.stringify(data))
      );
      setIsEncrypted(true);
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      setIsEncrypted(false);
      return null;
    }
  }, [key, encryptionAlgorithm]);

  const decrypt = useCallback(async (encryptedData) => {
    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: encryptionAlgorithm, iv: encryptedData.slice(0, 12) },
        key,
        encryptedData.slice(12)
      );
      setIsEncrypted(false);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }, [key, encryptionAlgorithm]);

  return { encrypt, decrypt, isEncrypted, algorithm: encryptionAlgorithm };
};

export const useSessionTimeout = (timeout = 30 * 60 * 1000) => {
  const [expiryTime, setExpiryTime] = useState(Date.now() + timeout);
  const [isExpired, setIsExpired] = useState(false);

  const extendSession = useCallback(() => {
    setExpiryTime(Date.now() + timeout);
    setIsExpired(false);
  }, [timeout]);

  useEffect(() => {
    const checkExpiry = () => {
      if (Date.now() >= expiryTime) {
        setIsExpired(true);
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  return { expiryTime, isExpired, extendSession };
};

export const useAuditLog = () => {
  const [logs, setLogs] = useState([]);

  const logEvent = useCallback((action, details = {}, severity = 'info') => {
    const entry = {
      id: Date.now(),
      action,
      details,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ip: null // Would need backend for real IP
    };

    setLogs(prev => [entry, ...prev].slice(0, 1000)); // Keep last 1000 entries
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getLogsBySeverity = useCallback((severity) => {
    return logs.filter(log => log.severity === severity);
  }, [logs]);

  return { logs, logEvent, clearLogs, getLogsBySeverity };
};

export const useBiometricAuth = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsSupported(!!window.PublicKeyCredential && !!navigator.credentials);
  }, []);

  const authenticate = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [],
          userVerification: 'required'
        }
      });
      
      setIsAuthenticated(!!credential);
      return !!credential;
    } catch (error) {
      console.error('Biometric auth failed:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, [isSupported]);

  return { isSupported, isAuthenticated, authenticate };
};

export const usePasswordStrength = () => {
  const calculateStrength = useCallback((password) => {
    let score = 0;
    const feedback = [];

    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    return { score: Math.min(score, 5), feedback };
  }, []);

  return { calculateStrength };
};
