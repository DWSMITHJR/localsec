// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';

const LoginScreen = ({ onLogin, onSetup, onReset, onLogout, onPasswordReset, hasSetup, isLoading, error, rememberMe, setRememberMe }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setValidationErrors([]);

        // Enhanced password validation with breach checking
        const passwordValidation = await SecurityUtils.validatePasswordWithBreachCheck(password);
        if (!passwordValidation.valid) {
            setValidationErrors(passwordValidation.errors);
            return;
        }

        if (hasSetup) {
            // Rate limiting for login attempts
            if (!SecurityUtils.checkRateLimit('login_attempts', 5, 300000)) { // 5 attempts per 5 minutes
                setFormError('Too many login attempts. Please wait 5 minutes.');
                return;
            }
            onLogin(password, rememberMe);
        } else {
            // Validate confirm password
            if (password !== confirmPassword) {
                setFormError("Passwords do not match.");
                return;
            }

            // Rate limiting for setup attempts
            if (!SecurityUtils.checkRateLimit('setup_attempts', 3, 300000)) { // 3 attempts per 5 minutes
                setFormError('Too many setup attempts. Please wait 5 minutes.');
                return;
            }

            onSetup(password, rememberMe);
        }
    };

    const handlePasswordChange = (e) => {
        const sanitized = SecurityUtils.sanitizeInput(e.target.value, 128);
        setPassword(sanitized);
        setValidationErrors([]);
    };

    const handleConfirmPasswordChange = (e) => {
        const sanitized = SecurityUtils.sanitizeInput(e.target.value, 128);
        setConfirmPassword(sanitized);
    };

    return (
        <div className="login-screen">
            <h2>{hasSetup ? 'Unlock Vault' : 'Setup Master Password'}</h2>

            {!hasSetup && (
                <p className="message info">
                    Welcome! Create a master password to secure your vault.<br/>
                    Your data will be encrypted and stored locally in your browser.
                </p>
            )}

            {hasSetup && (
                <p className="message info">
                    {rememberMe ? 'Session detected. Enter your master password to continue.' : 'Enter your master password to unlock your secure vault.'}<br/>
                    All your credentials are encrypted and ready to access.
                </p>
            )}

            {error && <p className="message error">{error}</p>}
            {formError && <p className="message error">{formError}</p>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="master-password">Master Password</label>
                    <input
                        type="password"
                        id="master-password"
                        className="input-field"
                        value={password}
                        onChange={handlePasswordChange}
                        autoFocus
                        placeholder={hasSetup ? "Enter your master password" : "Choose a strong master password"}
                    />
                    {!hasSetup && (
                        <small className={`password-strength ${SecurityUtils.calculatePasswordStrength(password).toLowerCase()}`}>
                            Strength: {SecurityUtils.calculatePasswordStrength(password)}
                        </small>
                    )}
                </div>

                {!hasSetup && (
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                            type="password"
                            id="confirm-password"
                            className="input-field"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            placeholder="Confirm your master password"
                        />
                    </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="validation-errors">
                        {validationErrors.map((error, index) => (
                            <p key={index} className="message error">{error}</p>
                        ))}
                    </div>
                )}

                {/* Remember Me Option */}
                {hasSetup && (
                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                            />
                            <span>
                                {rememberMe ? 'Stay logged in (Session active)' : 'Remember me on this device'}
                            </span>
                            <small>
                                {rememberMe
                                    ? 'Your session will remain active until you manually lock the vault'
                                    : 'Stay logged in until you manually lock the vault'
                                }
                            </small>
                        </label>
                    </div>
                )}

                <button type="submit" className="button" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (hasSetup ? 'Unlock Vault' : 'Create Vault')}
                </button>
            </form>

            {hasSetup && (
                <div className="settings-section">
                    <div className="auth-actions">
                        <button onClick={onPasswordReset} className="button secondary">🔐 Manage Password</button>
                        <button onClick={onReset} className="button secondary">Backup Vault</button>
                        <button onClick={onLogout} className="button secondary small">Switch Account</button>
                    </div>
                </div>
            )}

            {/* Browser Compatibility Info */}
            <div className="browser-info">
                <strong>Browser:</strong> {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                    navigator.userAgent.includes('Firefox') ? 'Firefox' :
                    navigator.userAgent.includes('Safari') ? 'Safari' :
                    navigator.userAgent.includes('Edge') ? 'Edge' : 'Unknown'} |
                <strong> Features:</strong> Web Crypto API {window.crypto?.subtle ? '✅' : '❌'}
            </div>
        </div>
    );
};

export default LoginScreen;
