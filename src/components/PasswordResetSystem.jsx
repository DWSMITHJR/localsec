// src/components/PasswordResetSystem.jsx
import { useState, useEffect } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';
import CryptoUtils from '../utils/CryptoUtils.js';

const PasswordResetSystem = ({ onClose, onSuccess, currentMasterKey, entries }) => {
    const [step, setStep] = useState('choose'); // choose, change, recover, verify
    const [resetMethod, setResetMethod] = useState('');
    
    // Change Password States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    // Recovery States
    const [recoveryKey, setRecoveryKey] = useState('');
    const [securityAnswers, setSecurityAnswers] = useState({});
    
    // UI States
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [passwordStrength, setPasswordStrength] = useState('');
    const [showRecoveryKey, setShowRecoveryKey] = useState(false);
    const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState('');

    // Security Questions
    const securityQuestions = [
        { id: 'q1', question: 'What was the name of your first pet?' },
        { id: 'q2', question: 'In what city were you born?' },
        { id: 'q3', question: 'What is your mother\'s maiden name?' },
        { id: 'q4', question: 'What was the make of your first car?' },
        { id: 'q5', question: 'What is your favorite book?' }
    ];

    useEffect(() => {
        if (newPassword) {
            const strength = SecurityUtils.calculatePasswordStrength(newPassword);
            setPasswordStrength(strength);
        }
    }, [newPassword]);

    // Generate Recovery Key
    const generateRecoveryKey = () => {
        const key = CryptoUtils.generateRecoveryKey();
        setGeneratedRecoveryKey(key);
        return key;
    };

    // Handle Password Change
    const handlePasswordChange = async () => {
        setError('');
        setValidationErrors([]);
        setLoading(true);

        try {
            // Rate limiting
            if (!SecurityUtils.checkRateLimit('password_change', 3, 3600000)) {
                throw new Error('Too many password change attempts. Please wait 1 hour.');
            }

            // Validate current password
            const isValid = await CryptoUtils.verifyMasterPassword(currentPassword, currentMasterKey);
            if (!isValid) {
                SecurityUtils.auditLog.log('password_change_failed', { reason: 'invalid_current_password' }, 'warning');
                throw new Error('Current password is incorrect.');
            }

            // Validate new password
            const validation = await SecurityUtils.validatePasswordWithBreachCheck(newPassword);
            if (!validation.valid) {
                setValidationErrors(validation.errors);
                setLoading(false);
                return;
            }

            // Check password match
            if (newPassword !== confirmNewPassword) {
                throw new Error('New passwords do not match.');
            }

            // Check if new password is different from current
            if (currentPassword === newPassword) {
                throw new Error('New password must be different from current password.');
            }

            // Re-encrypt all entries with new password
            SecurityUtils.auditLog.log('password_change_started', { entry_count: entries.length });
            
            const newMasterKey = await CryptoUtils.deriveMasterKey(newPassword);
            const reEncryptedEntries = await CryptoUtils.reEncryptEntries(entries, currentMasterKey, newMasterKey);

            // Generate new recovery key
            const newRecoveryKey = generateRecoveryKey();
            
            SecurityUtils.auditLog.log('password_change_completed', { 
                entry_count: reEncryptedEntries.length,
                recovery_key_generated: true 
            });

            setSuccess('Password changed successfully! Please save your new recovery key.');
            setShowRecoveryKey(true);
            
            // Call success callback with new data
            setTimeout(() => {
                onSuccess({
                    newMasterKey,
                    reEncryptedEntries,
                    recoveryKey: newRecoveryKey
                });
            }, 3000);

        } catch (err) {
            setError(err.message);
            SecurityUtils.auditLog.log('password_change_error', { error: err.message }, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle Recovery
    const handleRecovery = async () => {
        setError('');
        setLoading(true);

        try {
            // Rate limiting
            if (!SecurityUtils.checkRateLimit('password_recovery', 3, 3600000)) {
                throw new Error('Too many recovery attempts. Please wait 1 hour.');
            }

            // Verify recovery key
            const isValidKey = await CryptoUtils.verifyRecoveryKey(recoveryKey);
            if (!isValidKey) {
                SecurityUtils.auditLog.log('recovery_failed', { reason: 'invalid_recovery_key' }, 'warning');
                throw new Error('Invalid recovery key. Please check and try again.');
            }

            // Validate new password
            const validation = await SecurityUtils.validatePasswordWithBreachCheck(newPassword);
            if (!validation.valid) {
                setValidationErrors(validation.errors);
                setLoading(false);
                return;
            }

            // Check password match
            if (newPassword !== confirmNewPassword) {
                throw new Error('Passwords do not match.');
            }

            SecurityUtils.auditLog.log('password_recovery_started', { method: 'recovery_key' });

            // Create new master key and re-encrypt
            const newMasterKey = await CryptoUtils.deriveMasterKey(newPassword);
            const recoveredMasterKey = await CryptoUtils.recoverMasterKeyFromRecoveryKey(recoveryKey);
            const reEncryptedEntries = await CryptoUtils.reEncryptEntries(entries, recoveredMasterKey, newMasterKey);

            // Generate new recovery key
            const newRecoveryKey = generateRecoveryKey();

            SecurityUtils.auditLog.log('password_recovery_completed', { 
                entry_count: reEncryptedEntries.length,
                new_recovery_key_generated: true 
            });

            setSuccess('Password recovered successfully! Please save your new recovery key.');
            setShowRecoveryKey(true);

            setTimeout(() => {
                onSuccess({
                    newMasterKey,
                    reEncryptedEntries,
                    recoveryKey: newRecoveryKey
                });
            }, 3000);

        } catch (err) {
            setError(err.message);
            SecurityUtils.auditLog.log('password_recovery_error', { error: err.message }, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Copy Recovery Key to Clipboard
    const copyRecoveryKey = () => {
        navigator.clipboard.writeText(generatedRecoveryKey);
        setSuccess('Recovery key copied to clipboard!');
        setTimeout(() => setSuccess(''), 2000);
    };

    // Download Recovery Key
    const downloadRecoveryKey = () => {
        const blob = new Blob([`LocalSec Vault Recovery Key\n\nGenerated: ${new Date().toISOString()}\n\nRecovery Key:\n${generatedRecoveryKey}\n\n⚠️ IMPORTANT: Keep this key safe and secure!\n- Store it in a safe place separate from your vault\n- Do not share it with anyone\n- You will need this key to recover your vault if you forget your master password\n`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `localsec-recovery-key-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess('Recovery key downloaded!');
        setTimeout(() => setSuccess(''), 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content password-reset-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔐 Password Management</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Step 1: Choose Method */}
                    {step === 'choose' && (
                        <div className="reset-options">
                            <h3>What would you like to do?</h3>
                            <p className="info-text">Choose an option to manage your master password securely.</p>

                            <div className="option-cards">
                                <div 
                                    className="option-card"
                                    onClick={() => {
                                        setResetMethod('change');
                                        setStep('change');
                                    }}
                                >
                                    <div className="option-icon">🔄</div>
                                    <h4>Change Password</h4>
                                    <p>Update your master password with a new one</p>
                                    <small>Requires current password</small>
                                </div>

                                <div 
                                    className="option-card"
                                    onClick={() => {
                                        setResetMethod('recover');
                                        setStep('recover');
                                    }}
                                >
                                    <div className="option-icon">🔑</div>
                                    <h4>Recover Password</h4>
                                    <p>Reset your password using recovery key</p>
                                    <small>Requires recovery key</small>
                                </div>

                                <div 
                                    className="option-card"
                                    onClick={() => {
                                        const key = generateRecoveryKey();
                                        setShowRecoveryKey(true);
                                        setStep('verify');
                                    }}
                                >
                                    <div className="option-icon">📋</div>
                                    <h4>View Recovery Key</h4>
                                    <p>Generate or view your recovery key</p>
                                    <small>Save it in a secure location</small>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Change Password */}
                    {step === 'change' && !showRecoveryKey && (
                        <div className="change-password-form">
                            <button className="back-button" onClick={() => setStep('choose')}>← Back</button>
                            
                            <h3>Change Master Password</h3>
                            <p className="info-text">Enter your current password and choose a new strong password.</p>

                            {error && <div className="message error">{error}</div>}
                            {success && <div className="message success">{success}</div>}

                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(SecurityUtils.sanitizeInput(e.target.value, 256))}
                                    placeholder="Enter your current master password"
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={newPassword}
                                    onChange={e => setNewPassword(SecurityUtils.sanitizeInput(e.target.value, 256))}
                                    placeholder="Enter your new master password"
                                    disabled={loading}
                                />
                                {newPassword && (
                                    <small className={`password-strength ${passwordStrength.toLowerCase()}`}>
                                        Strength: {passwordStrength}
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(SecurityUtils.sanitizeInput(e.target.value, 256))}
                                    placeholder="Confirm your new master password"
                                    disabled={loading}
                                />
                            </div>

                            {validationErrors.length > 0 && (
                                <div className="validation-errors">
                                    {validationErrors.map((err, idx) => (
                                        <p key={idx} className="message error">{err}</p>
                                    ))}
                                </div>
                            )}

                            <div className="security-notice">
                                <strong>⚠️ Important:</strong>
                                <ul>
                                    <li>All your vault entries will be re-encrypted with the new password</li>
                                    <li>A new recovery key will be generated</li>
                                    <li>Make sure to save the new recovery key</li>
                                    <li>This process cannot be undone</li>
                                </ul>
                            </div>

                            <button 
                                className="button primary"
                                onClick={handlePasswordChange}
                                disabled={loading || !currentPassword || !newPassword || !confirmNewPassword}
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </div>
                    )}

                    {/* Step 3: Recover Password */}
                    {step === 'recover' && !showRecoveryKey && (
                        <div className="recover-password-form">
                            <button className="back-button" onClick={() => setStep('choose')}>← Back</button>
                            
                            <h3>Recover Master Password</h3>
                            <p className="info-text">Enter your recovery key to reset your master password.</p>

                            {error && <div className="message error">{error}</div>}
                            {success && <div className="message success">{success}</div>}

                            <div className="form-group">
                                <label>Recovery Key</label>
                                <textarea
                                    className="input-field recovery-key-input"
                                    value={recoveryKey}
                                    onChange={e => setRecoveryKey(SecurityUtils.sanitizeInput(e.target.value.trim(), 1024))}
                                    placeholder="Paste your recovery key here..."
                                    rows="4"
                                    disabled={loading}
                                />
                                <small>Enter the recovery key you saved when creating your vault</small>
                            </div>

                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={newPassword}
                                    onChange={e => setNewPassword(SecurityUtils.sanitizeInput(e.target.value, 256))}
                                    placeholder="Enter your new master password"
                                    disabled={loading}
                                />
                                {newPassword && (
                                    <small className={`password-strength ${passwordStrength.toLowerCase()}`}>
                                        Strength: {passwordStrength}
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(SecurityUtils.sanitizeInput(e.target.value, 256))}
                                    placeholder="Confirm your new master password"
                                    disabled={loading}
                                />
                            </div>

                            {validationErrors.length > 0 && (
                                <div className="validation-errors">
                                    {validationErrors.map((err, idx) => (
                                        <p key={idx} className="message error">{err}</p>
                                    ))}
                                </div>
                            )}

                            <div className="security-notice">
                                <strong>🔒 Recovery Process:</strong>
                                <ul>
                                    <li>Your recovery key will decrypt your vault</li>
                                    <li>All entries will be re-encrypted with the new password</li>
                                    <li>A new recovery key will be generated</li>
                                    <li>Save the new recovery key securely</li>
                                </ul>
                            </div>

                            <button 
                                className="button primary"
                                onClick={handleRecovery}
                                disabled={loading || !recoveryKey || !newPassword || !confirmNewPassword}
                            >
                                {loading ? 'Recovering Password...' : 'Recover Password'}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Show Recovery Key */}
                    {showRecoveryKey && (
                        <div className="recovery-key-display">
                            <h3>🔑 Your Recovery Key</h3>
                            <p className="info-text">Save this recovery key in a secure location. You'll need it to recover your vault if you forget your master password.</p>

                            <div className="recovery-key-box">
                                <code>{generatedRecoveryKey}</code>
                            </div>

                            <div className="recovery-key-actions">
                                <button className="button secondary" onClick={copyRecoveryKey}>
                                    📋 Copy to Clipboard
                                </button>
                                <button className="button secondary" onClick={downloadRecoveryKey}>
                                    💾 Download as File
                                </button>
                            </div>

                            <div className="security-warning">
                                <strong>⚠️ CRITICAL SECURITY INFORMATION:</strong>
                                <ul>
                                    <li><strong>Save this key immediately</strong> - You won't see it again</li>
                                    <li><strong>Store it securely</strong> - Keep it separate from your vault</li>
                                    <li><strong>Never share it</strong> - Anyone with this key can access your vault</li>
                                    <li><strong>Keep multiple copies</strong> - Store in different secure locations</li>
                                </ul>
                            </div>

                            {success && <div className="message success">{success}</div>}

                            <button className="button primary" onClick={onClose}>
                                I've Saved My Recovery Key
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PasswordResetSystem;
