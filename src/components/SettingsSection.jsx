// src/components/SettingsSection.jsx
import React, { useState, useEffect } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';
import CryptoUtils from '../utils/CryptoUtils.js';
import AIKeyManager from './AIKeyManager.jsx';
import AuditLogViewer from './AuditLogViewer.jsx';

const SettingsSection = ({ onReset, saveEntries, entries, setError, aiKeys = [], onSaveAIKeys, masterKey }) => {
    const [importing, setImporting] = useState(false);
    const [aiImporting, setAiImporting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [storageMode, setStorageMode] = useState('browser');
    const [activeTab, setActiveTab] = useState('vault');

    // Vault Export
    const handleExport = async () => {
        const password = prompt("Please enter your master password to encrypt the backup:");
        if (!password) return;

        try {
            const base64Data = await CryptoUtils.exportVault(password, entries);
            const blob = new Blob([base64Data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `vault-backup-${date}.vault`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError("Export failed. Check console for details.");
        }
    };

    // Vault Import
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type and size
        if (!SecurityUtils.validateFileType(file, ['vault'])) {
            SecurityUtils.auditLog.log('vault_import_failed', { reason: 'invalid_file_type', file_name: file.name }, 'warn');
            setError('Invalid file type. Please select a .vault file.');
            e.target.value = null;
            return;
        }

        if (!SecurityUtils.validateFileSize(file, 10 * 1024 * 1024)) {
            SecurityUtils.auditLog.log('vault_import_failed', { reason: 'file_too_large', file_name: file.name, file_size: file.size }, 'warn');
            setError('File is too large. Maximum size is 10MB.');
            e.target.value = null;
            return;
        }

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64Data = event.target.result;
                const password = prompt("Please enter the master password for this backup:");
                if (!password) {
                    setImporting(false);
                    e.target.value = null;
                    return;
                }

                const importedEntries = await CryptoUtils.importVault(password, base64Data);

                // Sanitize all imported entries
                const sanitizedEntries = importedEntries.map(entry =>
                    SecurityUtils.sanitizeEntryData(entry)
                );

                // Merge with existing entries, preventing duplicates by ID
                const existingIds = new Set(entries.map(e => e.id));
                const newEntries = sanitizedEntries.filter(e => !existingIds.has(e.id));

                if (newEntries.length > 0) {
                    await saveEntries([...entries, ...newEntries]);
                    SecurityUtils.auditLog.log('vault_import_completed', {
                        imported_count: newEntries.length,
                        total_entries: entries.length + newEntries.length,
                        file_size: file.size
                    });
                    setSuccessMessage(`Import successful! ${newEntries.length} new entries added.`);
                } else {
                    SecurityUtils.auditLog.log('vault_import_completed', {
                        imported_count: 0,
                        reason: 'duplicates',
                        file_size: file.size
                    });
                    setSuccessMessage("Import complete. No new entries were added (duplicates skipped).");
                }
            } catch (e) {
                console.error('Import failed:', e);
                SecurityUtils.auditLog.log('vault_import_failed', { error: e.message, file_size: file.size }, 'error');
                setError(e.message || 'Import failed. Please check your password and file.');
            }
            setImporting(false);
            e.target.value = null; // Reset file input
        };
        reader.readAsText(file);
    };

    // AI Keys Export
    const handleAIExport = async () => {
        if (aiKeys.length === 0) {
            setError('No AI API keys to export');
            return;
        }

        const password = prompt("Please enter your master password to encrypt the backup:");
        if (!password) return;

        try {
            const base64Data = await CryptoUtils.exportAIApiKeys(password, aiKeys);
            const blob = new Blob([base64Data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `ai-keys-backup-${date}.vault`;
            a.click();
            URL.revokeObjectURL(url);
            setSuccessMessage('AI API keys exported successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e) {
            setError("AI export failed. Check console for details.");
        }
    };

    // AI Keys Import
    const handleAIImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type and size
        if (!SecurityUtils.validateFileType(file, ['vault'])) {
            SecurityUtils.auditLog.log('ai_import_failed', { reason: 'invalid_file_type', file_name: file.name }, 'warn');
            setError('Invalid file type. Please select a .vault file.');
            e.target.value = null;
            return;
        }

        if (!SecurityUtils.validateFileSize(file, 5 * 1024 * 1024)) {
            SecurityUtils.auditLog.log('ai_import_failed', { reason: 'file_too_large', file_name: file.name, file_size: file.size }, 'warn');
            setError('File is too large. Maximum size is 5MB.');
            e.target.value = null;
            return;
        }

        setAiImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64Data = event.target.result;
                const password = prompt("Please enter the master password for this backup:");
                if (!password) {
                    setAiImporting(false);
                    e.target.value = null;
                    return;
                }

                const importedKeys = await CryptoUtils.importAIApiKeys(password, base64Data);

                if (importedKeys.length > 0) {
                    // Sanitize all imported keys
                    const sanitizedKeys = importedKeys.map(key =>
                        SecurityUtils.sanitizeAIEntryData(key)
                    );

                    // Merge with existing keys, preventing duplicates by ID
                    const existingIds = new Set(aiKeys.map(k => k.id));
                    const newKeys = sanitizedKeys.filter(k => !existingIds.has(k.id));

                    if (newKeys.length > 0) {
                        await onSaveAIKeys([...aiKeys, ...newKeys]);
                        SecurityUtils.auditLog.log('ai_import_completed', {
                            imported_count: newKeys.length,
                            total_keys: aiKeys.length + newKeys.length,
                            file_size: file.size
                        });
                        setSuccessMessage(`AI import successful! ${newKeys.length} new keys added.`);
                    } else {
                        SecurityUtils.auditLog.log('ai_import_completed', {
                            imported_count: 0,
                            reason: 'duplicates',
                            file_size: file.size
                        });
                        setSuccessMessage("AI import complete. No new keys were added (duplicates skipped).");
                    }
                }
            } catch (e) {
                console.error('AI import failed:', e);
                SecurityUtils.auditLog.log('ai_import_failed', { error: e.message, file_size: file.size }, 'error');
                setError(e.message || 'AI import failed. Please check your password and file.');
            }
            setAiImporting(false);
            e.target.value = null; // Reset file input
        };
        reader.readAsText(file);
    };

    const handleStorageModeChange = (mode) => {
        const sanitizedMode = SecurityUtils.sanitizeInput(mode, 20);
        let message = ''; // Declare message here
        if (['browser', 'file', 'unc'].includes(sanitizedMode)) {
            setStorageMode(sanitizedMode);
            localStorage.setItem('vaultStorageMode', sanitizedMode);
            switch (sanitizedMode) {
                case 'browser':
                    message = 'Using browser storage (local only)';
                    break;
                case 'file':
                    message = 'Using file storage (shareable)';
                    break;
                case 'unc':
                    message = 'Using network storage (advanced)';
                    break;
            }
        }
        SecurityUtils.auditLog.log('storage_mode_changed', { from: storageMode, to: sanitizedMode });

        if (message) {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    // Load storage mode preference
    useEffect(() => {
        const savedMode = localStorage.getItem('vaultStorageMode');
        if (savedMode && ['browser', 'file', 'unc'].includes(savedMode)) {
            setStorageMode(savedMode);
        }
    }, []);

    return (
        <div className="form-container settings-section">
            <h3>Settings</h3>
            {successMessage && <p className="message success">{successMessage}</p>}

            {/* Tab Navigation */}
            <div className="settings-tabs">
                <button
                    className={`tab-button ${activeTab === 'vault' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vault')}
                >
                    Vault Management
                </button>
                <button
                    className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                >
                    AI API Keys
                </button>
                <button
                    className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    Security Logs
                </button>
            </div>

            {/* Vault Management Tab */}
            {activeTab === 'vault' && (
                <>
                    {/* Storage Configuration */}
                    <div className="storage-config">
                        <h4>Storage Settings</h4>
                        <div className="storage-options">
                            <label className="storage-option">
                                <input
                                    type="radio"
                                    name="storageMode"
                                    value="browser"
                                    checked={storageMode === 'browser'}
                                    onChange={(e) => handleStorageModeChange(e.target.value)}
                                />
                                <span className="storage-label">
                                    <strong>Browser Storage</strong>
                                    <small>Store locally in your browser</small>
                                </span>
                            </label>
                            <label className="storage-option">
                                <input
                                    type="radio"
                                    name="storageMode"
                                    value="file"
                                    checked={storageMode === 'file'}
                                    onChange={(e) => handleStorageModeChange(e.target.value)}
                                />
                                <span className="storage-label">
                                    <strong>File Storage</strong>
                                    <small>Save to encrypted file</small>
                                </span>
                            </label>
                            <label className="storage-option">
                                <input
                                    type="radio"
                                    name="storageMode"
                                    value="unc"
                                    checked={storageMode === 'unc'}
                                    onChange={(e) => handleStorageModeChange(e.target.value)}
                                />
                                <span className="storage-label">
                                    <strong>Network Storage</strong>
                                    <small>Store on network path</small>
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Vault Export/Import */}
                    <div className="vault-management">
                        <h4>Vault Backup</h4>
                        <div className="backup-controls">
                            <button onClick={handleExport} className="button secondary">
                                Export Vault
                            </button>
                            <label className="button secondary">
                                Import Vault
                                <input
                                    type="file"
                                    accept=".vault"
                                    onChange={handleImport}
                                    disabled={importing}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            {importing && <span className="loading">Importing...</span>}
                        </div>
                    </div>

                    {/* Reset Button */}
                    <div className="reset-section">
                        <h4>Reset Vault</h4>
                        <p className="warning">
                            <strong>Warning:</strong> This will permanently delete all entries and cannot be undone.
                        </p>
                        <button onClick={onReset} className="button danger">
                            Reset Vault
                        </button>
                    </div>
                </>
            )}

            {/* AI API Keys Tab */}
            {activeTab === 'ai' && (
                <div className="ai-keys-section">
                    <div className="ai-keys-header">
                        <h4>AI API Keys Management</h4>
                        <p>Manage your AI service API keys for encrypted storage and access.</p>
                    </div>

                    {/* AI Keys Export/Import */}
                    <div className="ai-keys-management">
                        <div className="ai-keys-controls">
                            <button onClick={handleAIExport} className="button secondary">
                                Export AI Keys
                            </button>
                            <label className="button secondary">
                                Import AI Keys
                                <input
                                    type="file"
                                    accept=".vault"
                                    onChange={handleAIImport}
                                    disabled={aiImporting}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            {aiImporting && <span className="loading">Importing...</span>}
                        </div>
                    </div>

                    {/* AI Keys Manager Component */}
                    <AIKeyManager
                        aiKeys={aiKeys}
                        onSaveAIKeys={onSaveAIKeys}
                        setError={setError}
                    />
                </div>
            )}

            {/* Security Logs Tab */}
            {activeTab === 'logs' && (
                <div className="logs-settings-section">
                    <div className="logs-header">
                        <h4>Security Audit Logs</h4>
                        <p>Monitor all security events and activities in your vault.</p>
                    </div>

                    {masterKey ? (
                        <AuditLogViewer masterKey={masterKey} />
                    ) : (
                        <div className="no-master-key">
                            <p>Master password required to view security audit logs.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsSection;
