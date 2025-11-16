// src/components/AppCore.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecurityState, useSessionTimeout, useAuditLog } from './hooks/useSecurity.js';
import { SecurityErrorBoundary } from './SecurityErrorBoundary.jsx';
import { LoginScreen } from './LoginScreen.jsx';
import { VaultScreen } from './VaultScreen.jsx';
import { Alert, LoadingSpinner } from './common/FormField.jsx';

const AppCore = () => {
  const [appState, setAppState] = useState('loading');
  const [masterKey, setMasterKey] = useState(null);
  const [error, setError] = useState(null);
  
  const { securityLevel, threats, isSecure } = useSecurityState();
  const { expiryTime, isExpired, extendSession } = useSessionTimeout();
  const { logEvent } = useAuditLog();

  const initializeApp = useCallback(async () => {
    try {
      setAppState('loading');
      
      // Check for existing session
      const sessionToken = localStorage.getItem('vaultSessionToken');
      if (sessionToken) {
        // Validate session
        setAppState('authenticated');
      } else {
        setAppState('login');
      }
    } catch (err) {
      setError('Failed to initialize application');
      logEvent('app_initialization_failed', { error: err.message }, 'error');
      setAppState('error');
    }
  }, [logEvent]);

  const handleLogin = useCallback((key) => {
    setMasterKey(key);
    setAppState('authenticated');
    extendSession();
    logEvent('user_login', { timestamp: Date.now() }, 'info');
  }, [extendSession, logEvent]);

  const handleLogout = useCallback(() => {
    setMasterKey(null);
    setAppState('login');
    localStorage.removeItem('vaultSessionToken');
    logEvent('user_logout', { timestamp: Date.now() }, 'info');
  }, [logEvent]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    if (isExpired && appState === 'authenticated') {
      handleLogout();
    }
  }, [isExpired, appState, handleLogout]);

  if (appState === 'loading') {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" />
        <p>Initializing secure vault...</p>
      </div>
    );
  }

  if (appState === 'error') {
    return (
      <div className="app-error">
        <Alert type="danger" message={error} />
        <button onClick={initializeApp}>Retry</button>
      </div>
    );
  }

  if (appState === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (appState === 'authenticated') {
    return (
      <SecurityErrorBoundary>
        <VaultScreen
          masterKey={masterKey}
          onLogout={handleLogout}
          securityLevel={securityLevel}
          threats={threats}
          sessionExpiry={expiryTime}
          extendSession={extendSession}
        />
      </SecurityErrorBoundary>
    );
  }

  return null;
};

export default AppCore;
