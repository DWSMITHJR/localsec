// src/components/EntryForm.jsx
import React, { useState, useEffect } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';
import CryptoUtils from '../utils/CryptoUtils.js';

const EntryForm = ({ entryType, existingEntry, onSubmit, onCancel, onCopy }) => {
    const [formData, setFormData] = useState({
        title: '', username: '', password: '', url: '', notes: '', privateKey: '', publicKey: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [generatingRsa, setGeneratingRsa] = useState(false);
    const [formError, setFormError] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        if (existingEntry) {
            const sanitized = SecurityUtils.sanitizeEntryData(existingEntry);
            setFormData(sanitized);
        }
    }, [existingEntry]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const sanitized = SecurityUtils.sanitizeInput(value, SecurityUtils.getMaxLength(name));
        setFormData(prev => ({ ...prev, [name]: sanitized }));
        setValidationErrors([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        setValidationErrors([]);

        // Validate the entry data
        const validation = SecurityUtils.validateEntryData(formData);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            return;
        }

        // Additional URL validation
        if (formData.url && !SecurityUtils.isValidUrl(formData.url)) {
            setValidationErrors(['Please enter a valid URL (http:// or https://)']);
            return;
        }

        onSubmit(formData);
        // Clear form
        setFormData({ title: '', username: '', password: '', url: '', notes: '', privateKey: '', publicKey: '' });
    };

    // Random Password Generator
    const handleGeneratePassword = () => {
        const newPassword = CryptoUtils.generatePassword();
        setFormData(prev => ({ ...prev, password: newPassword }));
        onCopy(newPassword); // Auto-copy generated password
    };

    // RSA Key Pair Generation
    const handleGenerateKeys = async () => {
        setGeneratingRsa(true);
        try {
            const { privateKey, publicKey } = await CryptoUtils.generateRsaKeyPair();
            setFormData(prev => ({ ...prev, privateKey, publicKey }));
        } catch (e) {
            setFormError("Failed to generate RSA keys.");
        }
        setGeneratingRsa(false);
    };

    const renderFields = () => {
        switch (entryType) {
            case 'passwords':
                return (
                    <>
                        <div className="form-group">
                            <label>Username/Email</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-group">
                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="input-field" autoComplete="new-password" />
                                <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</span>
                                <button type="button" className="button secondary" onClick={handleGeneratePassword}>Generate</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>URL</label>
                            <input type="text" name="url" value={formData.url} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className="input-field"></textarea>
                        </div>
                    </>
                );
            case 'credentials':
                return (
                    <>
                        <div className="form-group">
                            <label>Username/Email</label>
                            <input type="text" name="username" value={formData.username} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="form-group">
                            <label>Password/Token</label>
                            <div className="input-group">
                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="input-field" autoComplete="new-password" />
                                <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className="input-field"></textarea>
                        </div>
                    </>
                );
            case 'keypairs':
                return (
                    <>
                        <div className="form-group">
                            <button type="button" className="button" onClick={handleGenerateKeys} disabled={generatingRsa}>
                                {generatingRsa ? 'Generating...' : 'Generate RSA-2048 Key Pair'}
                            </button>
                        </div>
                        <div className="form-group">
                            <label>Private Key</label>
                            <textarea name="privateKey" value={formData.privateKey} onChange={handleChange} className="input-field"></textarea>
                        </div>
                        <div className="form-group">
                            <label>Public Key</label>
                            <textarea name="publicKey" value={formData.publicKey} onChange={handleChange} className="input-field"></textarea>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className="input-field"></textarea>
                        </div>
                    </>
                );
            case 'analysis':
                return (
                    <div className="form-group">
                        <p className="message info">
                            Security analysis automatically evaluates your stored credentials for potential security issues including password strength, duplicates, and missing information.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {formError && <p className="message error">{formError}</p>}
            {validationErrors.length > 0 && (
                <div className="validation-errors">
                    {validationErrors.map((error, index) => (
                        <p key={index} className="message error">{error}</p>
                    ))}
                </div>
            )}
            {entryType === 'analysis' ? (
                <div>
                    {renderFields()}
                </div>
            ) : (
                <div>
                    <div className="form-group">
                        <label>Title (Required)</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} className="input-field" required />
                    </div>
                    {renderFields()}
                    <div className="button-group">
                        <button type="submit" className="button success">{existingEntry ? 'Update Entry' : 'Save Entry'}</button>
                        {existingEntry && <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>}
                    </div>
                </div>
            )}
        </form>
    );
};

export default EntryForm;
