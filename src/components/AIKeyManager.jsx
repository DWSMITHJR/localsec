// src/components/AIKeyManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';
import CryptoUtils from '../utils/CryptoUtils.js';
import MESSAGES, { getErrorMessage, getSuccessMessage } from '../utils/Messages.js';

const AIKeyManager = ({ masterKey, onSave, onCancel, existingKeys = [] }) => {
    const [keys, setKeys] = useState([]);
    const [editingKey, setEditingKey] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        service: '',
        name: '',
        apiKey: '',
        description: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [messageTimeout, setMessageTimeout] = useState(null);

    const supportedServices = useMemo(() => SecurityUtils.getSupportedAIServices(), []);

    // Load existing keys on mount and when existingKeys changes
    useEffect(() => {
        // Use a stable comparison to prevent unnecessary re-renders
        const keysChanged = JSON.stringify(keys.map(k => k.id).sort()) !== JSON.stringify(existingKeys.map(k => k.id).sort());
        if (keysChanged && existingKeys.length >= 0) {
            setKeys(existingKeys);
        }
    }, [existingKeys, keys]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (messageTimeout) {
                clearTimeout(messageTimeout);
            }
        };
    }, [messageTimeout]);

    // Memoize form validation to prevent unnecessary recalculations
    const validateForm = useCallback(() => {
        const errors = {};

        if (!formData.service) {
            errors.service = getErrorMessage('FIELD_REQUIRED');
        }

        if (!formData.apiKey) {
            errors.apiKey = getErrorMessage('FIELD_REQUIRED');
        } else {
            try {
                const validation = CryptoUtils.validateAIApiKey(formData.service, formData.apiKey);
                if (!validation.valid) {
                    errors.apiKey = validation.error;
                }
            } catch (error) {
                errors.apiKey = getErrorMessage('INVALID_API_KEY');
            }
        }

        if (formData.name && formData.name.length > 100) {
            errors.name = getErrorMessage('FIELD_TOO_LONG', { field: 'Name', maxLength: 100 });
        }

        if (formData.description && formData.description.length > 500) {
            errors.description = getErrorMessage('FIELD_TOO_LONG', { field: 'Description', maxLength: 500 });
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    // Handle form input changes with debouncing
    const handleInputChange = useCallback((field, value) => {
        // Sanitize input based on field type
        const maxLengths = {
            service: 50,
            name: 100,
            apiKey: 200,
            description: 500
        };
        
        const sanitized = SecurityUtils.sanitizeInput(value, maxLengths[field] || 100);
        
        setFormData(prev => ({
            ...prev,
            [field]: sanitized
        }));

        // Clear specific field error when user starts typing (debounced)
        if (formErrors[field]) {
            setTimeout(() => {
                setFormErrors(prev => ({
                    ...prev,
                    [field]: ''
                }));
            }, 500);
        }
    }, [formErrors]);

    // Clear success message with cleanup
    const clearSuccessMessage = useCallback(() => {
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }
        const timeout = setTimeout(() => {
            setSuccessMessage('');
            setMessageTimeout(null);
        }, 3000);
        setMessageTimeout(timeout);
    }, [messageTimeout]);

    // Handle delete key with error handling
    const handleDeleteKey = useCallback(async (keyId) => {
        if (!window.confirm(MESSAGES.CONFIRMATIONS.DELETE_API_KEY)) {
            return;
        }

        try {
            const updatedKeys = keys.filter(k => k.id !== keyId);
            setKeys(updatedKeys);
            await onSave(updatedKeys);
            SecurityUtils.auditLog.log('ai_key_deleted', { key_id: keyId });
            setSuccessMessage(getSuccessMessage('API_KEY_DELETED'));
            clearSuccessMessage();
        } catch (error) {
            console.error('Failed to delete API key:', error);
            setFormErrors({ general: getErrorMessage('SAVE_FAILED') });
            // Clear error after 5 seconds
            setTimeout(() => setFormErrors({}), 5000);
        }
    }, [keys, onSave, clearSuccessMessage]);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setFormErrors({});

        try {
            let updatedKeys;

            if (editingKey) {
                // Update existing key
                const keyIndex = keys.findIndex(k => k.id === editingKey);
                if (keyIndex !== -1) {
                    const updatedKey = {
                        ...keys[keyIndex],
                        service: formData.service,
                        name: formData.name,
                        description: formData.description,
                        updatedAt: new Date().toISOString()
                    };

                    // Only update API key if provided
                    if (formData.apiKey) {
                        updatedKey.apiKey = formData.apiKey;
                    }

                    updatedKeys = [...keys];
                    updatedKeys[keyIndex] = updatedKey;
                } else {
                    throw new Error('Key not found for editing');
                }
                SecurityUtils.auditLog.log('ai_key_updated', { key_id: editingKey });
            } else {
                // Add new key
                const newKey = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    service: formData.service,
                    name: formData.name,
                    apiKey: formData.apiKey,
                    description: formData.description,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                updatedKeys = [...keys, newKey];
                SecurityUtils.auditLog.log('ai_key_added', { service: formData.service });
            }

            // Sanitize the keys before saving
            const sanitizedKeys = updatedKeys.map(key =>
                SecurityUtils.sanitizeAIEntryData(key)
            );

            await onSave(sanitizedKeys);
            setKeys(sanitizedKeys);

            // Reset form
            setFormData({
                service: '',
                name: '',
                apiKey: '',
                description: ''
            });
            setShowAddForm(false);
            setEditingKey(null);
            setSuccessMessage(editingKey ? getSuccessMessage('API_KEY_UPDATED') : getSuccessMessage('API_KEY_ADDED'));
            clearSuccessMessage();

        } catch (error) {
            console.error('Failed to save API key:', error);
            setFormErrors({ general: error.message || getErrorMessage('SAVE_FAILED') });
            // Clear error after 5 seconds
            setTimeout(() => setFormErrors({}), 5000);
        } finally {
            setIsLoading(false);
        }
    }, [formData, editingKey, keys, onSave, validateForm, clearSuccessMessage]);

    // Handle cancel form
    const handleCancel = useCallback(() => {
        setShowAddForm(false);
        setEditingKey(null);
        setFormData({
            service: '',
            name: '',
            apiKey: '',
            description: ''
        });
        setFormErrors({});
    }, []);

    // Memoize service display names to prevent recalculation
    const serviceDisplayNames = useMemo(() => {
        const names = {};
        supportedServices.forEach(service => {
            names[service.id] = service.name;
        });
        return names;
    }, [supportedServices]);

    // Get service display name
    const getServiceDisplayName = useCallback((serviceId) => {
        return serviceDisplayNames[serviceId] || serviceId;
    }, [serviceDisplayNames]);

    // Mask API key for display
    const maskApiKey = useCallback((apiKey) => {
        if (!apiKey || apiKey.length < 8) return apiKey || '';
        return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
    }, []);

    // Memoize keys list to prevent unnecessary re-renders
    const keysList = useMemo(() => {
        return keys.map(key => ({
            ...key,
            displayName: key.name || getServiceDisplayName(key.service),
            maskedApiKey: maskApiKey(key.apiKey),
            createdDate: new Date(key.createdAt).toLocaleDateString(),
            updatedDate: key.updatedAt !== key.createdAt ? new Date(key.updatedAt).toLocaleDateString() : null
        }));
    }, [keys, getServiceDisplayName, maskApiKey]);

    if (!masterKey) {
        return (
            <div className="ai-key-manager">
                <div className="ai-key-header">
                    <h3>AI API Keys</h3>
                    <p className="ai-key-description">
                        Master password required to manage AI API keys.
                    </p>
                </div>
                <div className="no-master-key">
                    <p>Authentication required to access AI API key management.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-key-manager">
            <div className="ai-key-header">
                <h3>AI API Keys</h3>
                <p className="ai-key-description">
                    Manage your AI service API keys securely. All keys are encrypted with your master password and stored locally in your browser.
                </p>
                {successMessage && (
                    <div className="message success" style={{marginBottom: '1rem'}}>
                        {successMessage}
                    </div>
                )}
            </div>

            {/* AI Keys List */}
            <div className="ai-keys-list">
                {keysList.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔑</div>
                        <h4>No AI API Keys</h4>
                        <p>Add your first AI service API key to integrate with AI services like OpenAI, Anthropic, or Google.</p>
                        <button className="button" onClick={() => {
                            setEditingKey(null);
                            setFormData({ service: '', name: '', apiKey: '', description: '' });
                            setFormErrors({});
                            setShowAddForm(true);
                        }}>
                            Add API Key
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="ai-keys-actions">
                            <button className="button" onClick={() => {
                                setEditingKey(null);
                                setFormData({ service: '', name: '', apiKey: '', description: '' });
                                setFormErrors({});
                                setShowAddForm(true);
                            }}>
                                Add API Key
                            </button>
                        </div>

                        <div className="ai-keys-grid">
                            {keysList.map(key => (
                                <div key={`key-${key.id}`} className="ai-key-card">
                                    <div className="ai-key-header">
                                        <div className="ai-key-title">
                                            <h4>{key.displayName}</h4>
                                            <span className="ai-key-service">{getServiceDisplayName(key.service)}</span>
                                        </div>
                                        <div className="ai-key-actions">
                                            <button
                                                className="button-icon"
                                                onClick={() => {
                                                    const originalKey = keys.find(k => k.id === key.id);
                                                    if (originalKey) {
                                                        setEditingKey(key.id);
                                                        setFormData({
                                                            service: originalKey.service,
                                                            name: originalKey.name || '',
                                                            apiKey: '',
                                                            description: originalKey.description || ''
                                                        });
                                                        setFormErrors({});
                                                        setShowAddForm(true);
                                                    }
                                                }}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="button-icon danger"
                                                onClick={() => handleDeleteKey(key.id)}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ai-key-content">
                                        {key.description && (
                                            <p className="ai-key-description">{key.description}</p>
                                        )}

                                        <div className="ai-key-details">
                                            <div className="ai-key-field">
                                                <label>API Key:</label>
                                                <code className="api-key-display">
                                                    {key.maskedApiKey}
                                                </code>
                                            </div>

                                            <div className="ai-key-meta">
                                                <span>Added: {key.createdDate}</span>
                                                {key.updatedDate && (
                                                    <span>Updated: {key.updatedDate}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="ai-key-form-overlay">
                    <div className="ai-key-form-modal">
                        <div className="ai-key-form-header">
                            <h4>{editingKey ? 'Edit API Key' : 'Add API Key'}</h4>
                            <button className="button-icon" onClick={handleCancel}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="ai-key-form">
                            {formErrors.general && (
                                <div className="message error">{formErrors.general}</div>
                            )}

                            <div className="form-group">
                                <label htmlFor="service">AI Service *</label>
                                <select
                                    id="service"
                                    value={formData.service}
                                    onChange={(e) => handleInputChange('service', e.target.value)}
                                    className={formErrors.service ? 'error' : ''}
                                    disabled={isLoading}
                                >
                                    <option value="">Select a service...</option>
                                    {supportedServices.map(service => (
                                        <option key={`service-${service.id}`} value={service.id}>
                                            {service.name} - {service.description}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.service && <span className="error-text">{formErrors.service}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="name">Name (Optional)</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="e.g., Production OpenAI, Personal Claude"
                                    className={formErrors.name ? 'error' : ''}
                                    disabled={isLoading}
                                    maxLength="100"
                                />
                                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="apiKey">API Key *</label>
                                <input
                                    type="password"
                                    id="apiKey"
                                    value={formData.apiKey}
                                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                                    placeholder="Enter your API key"
                                    className={formErrors.apiKey ? 'error' : ''}
                                    disabled={isLoading}
                                    maxLength="200"
                                    autoComplete="new-password"
                                />
                                {formErrors.apiKey && <span className="error-text">{formErrors.apiKey}</span>}
                                <small className="form-help">
                                    Your API key will be encrypted with your master password and stored securely in your browser.
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description (Optional)</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Add notes about this API key (e.g., usage limits, purpose, or account details)"
                                    className={formErrors.description ? 'error' : ''}
                                    disabled={isLoading}
                                    maxLength="500"
                                    rows="3"
                                />
                                {formErrors.description && <span className="error-text">{formErrors.description}</span>}
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="button secondary"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Saving...' : (editingKey ? 'Update' : 'Add')} API Key
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Supported Services Info */}
            <div className="ai-key-info">
                <h4>Supported AI Services</h4>
                <div className="supported-services">
                    {supportedServices.map(service => (
                        <div key={`info-${service.id}`} className="service-info">
                            <strong>{service.name}</strong>
                            <span>{service.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AIKeyManager;
