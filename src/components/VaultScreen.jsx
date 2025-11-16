// src/components/VaultScreen.jsx
import React, { useState } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';
import EntryForm from './EntryForm.jsx';
import EntryList from './EntryList.jsx';
import SecurityAnalysis from './SecurityAnalysis.jsx';
import CloudSync from './CloudSync.jsx';
import TabBar from './TabBar.jsx';
import SettingsSection from './SettingsSection.jsx';

const VaultScreen = ({
    entries,
    onLock,
    onReset,
    onLogout,
    onAddEntry,
    onUpdateEntry,
    onDeleteEntry,
    onCopy,
    saveEntries,
    setError,
    error,
    rememberMe,
    aiKeys,
    onSaveAIKeys,
    masterKey
}) => {
    const [activeTab, setActiveTab] = useState('passwords');
    const [editingEntry, setEditingEntry] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    const filteredEntries = entries.filter(entry => entry.type === activeTab);

    const handleEdit = (entry) => {
        setEditingEntry(entry);
    };

    const handleAdd = () => {
        setEditingEntry(null);
    };

    const handleSave = (formData) => {
        if (editingEntry) {
            onUpdateEntry({ ...editingEntry, ...formData });
        } else {
            onAddEntry({ ...formData, type: activeTab });
        }
        setEditingEntry(null);
    };

    const handleCancel = () => {
        setEditingEntry(null);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setEditingEntry(null); // Clear editing when switching tabs
    };

    if (editingEntry !== null || activeTab === 'analysis' || activeTab === 'cloudsync') {
        return (
            <div className="vault-layout">
                <div className="vault-header">
                    <h2>
                        {editingEntry ? 'Edit Entry' : activeTab === 'analysis' ? 'Security Analysis' :
                         activeTab === 'cloudsync' ? 'Cloud Sync' :
                         activeTab === 'passwords' ? 'Password Manager' :
                         activeTab === 'credentials' ? 'Credentials' :
                         activeTab === 'keypairs' ? 'Key Pairs' : 'Vault'}
                    </h2>
                    <div className="vault-actions">
                        <button className="button secondary" onClick={() => setEditingEntry(null)}>Back</button>
                        <button className="button" onClick={onLock}>Lock Vault</button>
                        <button className="button secondary" onClick={onLogout}>Switch Account</button>
                    </div>
                </div>

                {activeTab === 'analysis' ? (
                    <SecurityAnalysis entries={entries} onCopy={onCopy} />
                ) : activeTab === 'cloudsync' ? (
                    <CloudSync entries={entries} saveEntries={saveEntries} setError={setError} />
                ) : (
                    <EntryForm
                        entryType={activeTab}
                        existingEntry={editingEntry}
                        onSubmit={handleSave}
                        onCancel={handleCancel}
                        onCopy={onCopy}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="vault-layout">
            <div className="vault-header">
                <h2>
                    {activeTab === 'passwords' ? 'Password Manager' :
                     activeTab === 'credentials' ? 'Credentials' :
                     activeTab === 'keypairs' ? 'Key Pairs' :
                     activeTab === 'analysis' ? 'Security Analysis' :
                     activeTab === 'cloudsync' ? 'Cloud Sync' : 'Vault'}
                </h2>
                <div className="vault-actions">
                    <button className="button success" onClick={handleAdd}>Add Entry</button>
                    <button className="button" onClick={onLock}>Lock Vault</button>
                    <button className="button secondary" onClick={onLogout}>Switch Account</button>
                </div>
            </div>

            <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

            {error && <p className="message error">{error}</p>}

            {activeTab === 'analysis' ? (
                <SecurityAnalysis entries={entries} onCopy={onCopy} />
            ) : activeTab === 'cloudsync' ? (
                <CloudSync entries={entries} saveEntries={saveEntries} setError={setError} />
            ) : (
                <div className="entries-section">
                    <EntryList
                        entries={filteredEntries}
                        onEdit={handleEdit}
                        onDelete={onDeleteEntry}
                        onCopy={onCopy}
                    />

                    {filteredEntries.length === 0 && (
                        <div className="empty-state">
                            <p>No {activeTab} entries found.</p>
                            <p>Click "Add Entry" to get started!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Section */}
            <div className="vault-footer">
                <SettingsSection
                    onReset={onReset}
                    saveEntries={saveEntries}
                    entries={entries}
                    setError={setError}
                    aiKeys={aiKeys}
                    onSaveAIKeys={onSaveAIKeys}
                    masterKey={masterKey}
                />
            </div>
        </div>
    );
};

export default VaultScreen;
