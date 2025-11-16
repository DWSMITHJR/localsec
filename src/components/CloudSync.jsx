// src/components/CloudSync.jsx
import React, { useState, useEffect } from 'react';
import CloudServices from '../services/CloudServices.js';

const CloudSync = ({ entries, saveEntries, setError }) => {
    const [cloudCredentials, setCloudCredentials] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [syncResults, setSyncResults] = useState(null);

    // Load cloud credentials on mount
    useEffect(() => {
        const loadCloudCredentials = async () => {
            try {
                const stored = localStorage.getItem('vaultCloudCredentials');
                if (stored) {
                    // Decrypt the stored credentials
                    const decrypted = await CryptoUtils.decryptData(masterKey, stored);
                    const credentials = JSON.parse(decrypted);
                    setCloudCredentials(credentials);
                }
            } catch (e) {
                console.warn('Failed to load cloud credentials:', e);
                // Clear corrupted data
                localStorage.removeItem('vaultCloudCredentials');
            }
        };

        if (masterKey) {
            loadCloudCredentials();
        }
    }, [masterKey]);

    // Save cloud credentials
    const saveCloudCredentials = async (credentials) => {
        try {
            // Encrypt the credentials before storing
            const encrypted = await CryptoUtils.encryptData(masterKey, JSON.stringify(credentials));
            localStorage.setItem('vaultCloudCredentials', encrypted);
            setCloudCredentials(credentials);
        } catch (e) {
            console.error('Failed to save cloud credentials:', e);
            setError('Failed to save cloud service credentials');
        }
    };

    // Authenticate with cloud service
    const handleAuthenticate = async (provider) => {
        try {
            setError('');
            let credential;

            if (provider === 'google') {
                credential = await CloudServices.googleDrive.authenticate();
            } else if (provider === 'onenote') {
                credential = await CloudServices.oneNote.authenticate();
            }

            if (credential) {
                const updatedCredentials = [...cloudCredentials, credential];
                await saveCloudCredentials(updatedCredentials);
            }
        } catch (e) {
            console.error(`${provider} authentication failed:`, e);
            setError(`${provider} authentication failed: ${e.message}`);
        }
    };

    // Remove cloud service credential
    const handleRemoveCredential = async (provider) => {
        if (window.confirm(`Remove ${provider} connection? This will revoke access.`)) {
            try {
                const updatedCredentials = cloudCredentials.filter(cred => cred.provider !== provider);
                await saveCloudCredentials(updatedCredentials);
            } catch (e) {
                setError('Failed to remove cloud service connection');
            }
        }
    };

    // Sync files between services
    const handleSyncFiles = async () => {
        if (cloudCredentials.length < 2) {
            setError('Need at least 2 cloud services connected to sync files');
            return;
        }

        setSyncing(true);
        setSyncResults(null);

        try {
            const fileName = prompt('Enter file name to sync:');
            if (!fileName) {
                setSyncing(false);
                return;
            }

            const content = prompt('Enter file content to sync:');
            if (!content) {
                setSyncing(false);
                return;
            }

            // Find source and target credentials
            const sourceCred = cloudCredentials[0];
            const targetCred = cloudCredentials[1];

            const results = await CloudServices.syncFileBetweenServices(sourceCred, targetCred, fileName, content);
            setSyncResults(results);

        } catch (e) {
            console.error('Sync failed:', e);
            setError('File synchronization failed: ' + e.message);
        }
        setSyncing(false);
    };

    // Sync vault entries to cloud services
    const handleSyncVaultEntries = async () => {
        if (cloudCredentials.length === 0) {
            setError('Connect at least one cloud service first');
            return;
        }

        if (entries.length === 0) {
            setError('No vault entries to sync');
            return;
        }

        setSyncing(true);
        setSyncResults(null);

        try {
            const results = { success: false, errors: [], syncedServices: [] };

            for (const credential of cloudCredentials) {
                try {
                    const fileName = `vault-sync-${new Date().toISOString().split('T')[0]}.json`;
                    const content = JSON.stringify(entries, null, 2);

                    if (credential.provider === 'google') {
                        await CloudServices.googleDrive.uploadFile(credential.accessToken, fileName, content);
                    } else if (credential.provider === 'onenote') {
                        // For OneNote, create a page with vault data
                        const notebooks = await CloudServices.oneNote.listNotebooks(credential.accessToken);
                        if (notebooks.value && notebooks.value.length > 0) {
                            const sections = await CloudServices.oneNote.getSections(credential.accessToken, notebooks.value[0].id);
                            if (sections.value && sections.value.length > 0) {
                                await CloudServices.oneNote.createPage(
                                    credential.accessToken,
                                    notebooks.value[0].id,
                                    sections.value[0].id,
                                    fileName,
                                    `<pre>${content}</pre>`
                                );
                            }
                        }
                    }

                    results.syncedServices.push(credential.provider);
                } catch (e) {
                    results.errors.push(`${credential.provider}: ${e.message}`);
                }
            }

            results.success = results.errors.length === 0;
            setSyncResults(results);

        } catch (e) {
            console.error('Vault sync failed:', e);
            setError('Vault synchronization failed: ' + e.message);
        }
        setSyncing(false);
    };

    return (
        <div className="cloud-sync">
            <div className="sync-header">
                <h3>🌐 Cloud Service Integration</h3>
                <p className="message info">
                    Connect your cloud services to sync files and vault data securely between OneNote and Google Drive.
                </p>
            </div>

            {/* Connected Services */}
            <div className="connected-services">
                <h4>Connected Services</h4>
                {cloudCredentials.length === 0 ? (
                    <p className="empty-state">No cloud services connected. Add credentials below.</p>
                ) : (
                    <div className="service-list">
                        {cloudCredentials.map((cred, index) => (
                            <div key={index} className="service-item">
                                <div className="service-info">
                                    <strong>{cred.provider === 'google' ? 'Google Drive' : 'OneNote'}</strong>
                                    <small>{cred.userInfo?.name || cred.userInfo?.email || 'Unknown User'}</small>
                                    <small>Expires: {new Date(cred.expiresAt).toLocaleString()}</small>
                                </div>
                                <button
                                    className="button secondary small"
                                    onClick={() => handleRemoveCredential(cred.provider)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Authentication Section */}
            <div className="auth-section">
                <h4>Add Cloud Service</h4>
                <div className="auth-buttons">
                    <button
                        className="button"
                        onClick={() => handleAuthenticate('google')}
                        disabled={cloudCredentials.some(cred => cred.provider === 'google')}
                    >
                        🔗 Connect Google Drive
                    </button>
                    <button
                        className="button"
                        onClick={() => handleAuthenticate('onenote')}
                        disabled={cloudCredentials.some(cred => cred.provider === 'onenote')}
                    >
                        🔗 Connect OneNote
                    </button>
                </div>
                <small>OAuth authentication is required for secure API access</small>
            </div>

            {/* Sync Operations */}
            <div className="sync-section">
                <h4>File Synchronization</h4>
                <div className="sync-buttons">
                    <button
                        className="button success"
                        onClick={handleSyncFiles}
                        disabled={cloudCredentials.length < 2 || syncing}
                    >
                        {syncing ? 'Syncing...' : '🔄 Sync Files Between Services'}
                    </button>
                    <button
                        className="button secondary"
                        onClick={handleSyncVaultEntries}
                        disabled={cloudCredentials.length === 0 || syncing}
                    >
                        {syncing ? 'Syncing...' : '📤 Sync Vault to Cloud'}
                    </button>
                </div>
                <small>Sync individual files or backup your entire vault to connected cloud services</small>
            </div>

            {/* Sync Results */}
            {syncResults && (
                <div className="sync-results">
                    <h4>Sync Results</h4>
                    <div className={`sync-status ${syncResults.success ? 'success' : 'error'}`}>
                        {syncResults.success ? '✅ Sync completed successfully!' : '❌ Sync completed with errors'}

                        {syncResults.syncedServices && syncResults.syncedServices.length > 0 && (
                            <div className="synced-services">
                                <strong>Synced to:</strong> {syncResults.syncedServices.join(', ')}
                            </div>
                        )}

                        {syncResults.errors && syncResults.errors.length > 0 && (
                            <div className="sync-errors">
                                <strong>Errors:</strong>
                                <ul>
                                    {syncResults.errors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Help Section */}
            <div className="help-section">
                <h4>💡 How to Use</h4>
                <ol>
                    <li>Connect your Google Drive and/or OneNote accounts using OAuth</li>
                    <li>Store your OneNote and Google credentials in the vault for reference</li>
                    <li>Use sync features to transfer files between services</li>
                    <li>Backup your vault data to connected cloud services</li>
                </ol>
                <p><strong>Note:</strong> All operations use secure OAuth tokens that are encrypted and stored locally.</p>
            </div>
        </div>
    );
};

export default CloudSync;
