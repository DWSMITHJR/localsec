import React, { useEffect, useRef, useState } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';

const LoadingScreen = ({ setIsLoading, setError }) => {
    const timeoutRef = useRef(null);
    const [countdown, setCountdown] = useState(5);
    const [stage, setStage] = useState('Initializing...');

    useEffect(() => {
        // Set a robust timeout to prevent hanging
        timeoutRef.current = setTimeout(() => {
            console.warn('Loading timeout - auto bypassing');
            SecurityUtils.auditLog.log('loading_timeout', { duration: 5000 }, 'warn');
            setIsLoading(false);
            setError('Loading timed out. Please try again.');
        }, 5000);

        // Countdown timer
        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Simulate loading stages
        const stageInterval = setInterval(() => {
            setStage(prev => {
                const stages = [
                    'Initializing...',
                    'Loading vault data...',
                    'Verifying security...',
                    'Preparing interface...'
                ];
                const currentIndex = stages.indexOf(prev);
                return stages[(currentIndex + 1) % stages.length];
            });
        }, 1200);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            clearInterval(countdownInterval);
            clearInterval(stageInterval);
        };
    }, [setIsLoading, setError]);

    const handleBypass = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        SecurityUtils.auditLog.log('loading_manual_bypass', {}, 'info');
        setIsLoading(false);
    };

    const handleClearVault = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        SecurityUtils.auditLog.log('loading_clear_vault', {}, 'warn');
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('vault') || key.includes('session')) {
                localStorage.removeItem(key);
            }
        });
        window.location.reload();
    };

    const handleFullReset = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (confirm('Clear ALL data? This cannot be undone.')) {
            SecurityUtils.auditLog.log('loading_full_reset', {}, 'error');
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="loading-screen">
            <div className="loading-content">
                <h2>🔐 SECURITY VAULT LOADING...</h2>
                <div className="loading-spinner"></div>
                <p>{stage}</p>
                
                {countdown > 0 && (
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                        Auto-bypass in {countdown} seconds
                    </p>
                )}
                
                <div className="emergency-controls" style={{marginTop: '20px'}}>
                    <button 
                        onClick={handleBypass}
                        style={{marginRight: '10px', padding: '5px 10px'}}
                    >
                        Bypass
                    </button>
                    <button 
                        onClick={handleClearVault}
                        style={{marginRight: '10px', padding: '5px 10px'}}
                    >
                        Clear Vault
                    </button>
                    <button 
                        onClick={handleFullReset}
                        style={{padding: '5px 10px'}}
                    >
                        Full Reset
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
