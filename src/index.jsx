// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundaryWrapper from './components/ErrorBoundaryWrapper.jsx';
import './styles.css';

// Global Security Utils for backward compatibility
import SecurityUtils from './utils/SecurityUtils.js';
window.SecurityUtils = SecurityUtils;

// Global Crypto Utils for backward compatibility
import CryptoUtils from './utils/CryptoUtils.js';
window.CryptoUtils = CryptoUtils;

// Global Cloud Services for backward compatibility
import CloudServices from './services/CloudServices.js';
window.CloudServices = CloudServices;

// --- OAuth Redirect Handler ---
// Handle OAuth redirect for popup authentication
if (window.location.search.includes('code=')) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
        const sanitizedError = SecurityUtils.sanitizeInput(error, 500);
        window.parent.postMessage({ type: 'auth_error', error: sanitizedError }, window.location.origin);
    } else if (code) {
        const sanitizedCode = SecurityUtils.sanitizeInput(code, 1000);
        const sanitizedState = SecurityUtils.sanitizeInput(state, 100);
        window.parent.postMessage({ 
            type: 'auth_success', 
            credentials: { code: sanitizedCode, state: sanitizedState } 
        }, window.location.origin);
    }

    // Close the popup window
    window.close();
}

// Initialize security logging
SecurityUtils.auditLog.log('app_start', {
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    version: '2.1.0'
});

// --- Render the App ---
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <ErrorBoundaryWrapper>
            <App />
        </ErrorBoundaryWrapper>
    </React.StrictMode>
);
