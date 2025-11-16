// src/components/AuditLogViewer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';

const AuditLogViewer = ({ masterKey }) => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    // Load logs when component mounts
    useEffect(() => {
        if (masterKey) {
            const auditLogs = SecurityUtils.auditLog.getLogs();
            setLogs(auditLogs);
            setFilteredLogs(auditLogs);
        }
    }, [masterKey]);

    // Filter and search logs
    useEffect(() => {
        let filtered = logs;

        // Apply level filter
        if (filter !== 'all') {
            filtered = filtered.filter(log => log.level === filter);
        }

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(log =>
                log.event.toLowerCase().includes(term) ||
                JSON.stringify(log.data).toLowerCase().includes(term) ||
                log.level.toLowerCase().includes(term)
            );
        }

        // Sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setFilteredLogs(filtered);
    }, [logs, filter, searchTerm]);

    // Get severity color
    const getSeverityColor = (level) => {
        switch (level) {
            case 'error': return '#e74c3c';
            case 'warn': return '#f39c12';
            case 'info': return '#3498db';
            default: return '#95a5a6';
        }
    };

    // Get severity icon
    const getSeverityIcon = (level) => {
        switch (level) {
            case 'error': return '🚨';
            case 'warn': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📝';
        }
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    // Get event description
    const getEventDescription = (event) => {
        const descriptions = {
            // Authentication events
            'vault_setup_started': 'Vault setup initiated',
            'vault_setup_completed': 'Vault setup completed successfully',
            'vault_setup_failed': 'Vault setup failed',
            'vault_login_success': 'Successfully logged into vault',
            'vault_login_failed': 'Failed login attempt',
            'vault_login_error': 'Login error occurred',
            'vault_locked': 'Vault locked',
            'vault_logout': 'Logged out of vault',
            'session_valid': 'Valid session detected',

            // Data events
            'entry_created': 'New entry created',
            'entry_updated': 'Entry updated',
            'entry_deleted': 'Entry deleted',
            'entry_creation_failed': 'Failed to create entry',
            'entry_update_failed': 'Failed to update entry',

            // AI Key events
            'ai_key_added': 'AI API key added',
            'ai_key_updated': 'AI API key updated',
            'ai_key_deleted': 'AI API key deleted',
            'ai_import_started': 'AI keys import started',
            'ai_import_completed': 'AI keys import completed',
            'ai_import_failed': 'AI keys import failed',
            'ai_export_started': 'AI keys export started',
            'ai_export_completed': 'AI keys export completed',
            'ai_export_failed': 'AI keys export failed',

            // Security events
            'clipboard_copy': 'Data copied to clipboard',
            'clipboard_copy_failed': 'Failed to copy to clipboard',
            'storage_mode_changed': 'Storage mode changed',
            'vault_export_started': 'Vault export started',
            'vault_export_completed': 'Vault export completed',
            'vault_export_failed': 'Vault export failed',
            'vault_import_started': 'Vault import started',
            'vault_import_completed': 'Vault import completed',
            'vault_import_failed': 'Vault import failed',

            // Error events
            'react_error_boundary_triggered': 'Application error occurred',
            'error_boundary_retry': 'Error recovery attempted',
            'error_boundary_reload': 'Page reloaded due to error',
            'error_boundary_reset': 'Application reset due to error',

            // System events
            'app_initialized': 'Application started',
            'app_start': 'Application startup',
            'compatibility_check_passed': 'System compatibility verified',
            'compatibility_check_failed': 'System compatibility check failed',
            'browser_compatibility_check_failed': 'Browser compatibility issues detected'
        };

        return descriptions[event] || event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (!masterKey) {
        return (
            <div className="audit-log-viewer">
                <div className="log-header">
                    <h4>Security Audit Logs</h4>
                    <p>Master password required to view audit logs.</p>
                </div>
                <div className="no-access">
                    <p>Authentication required to access security audit logs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="audit-log-viewer">
            <div className="log-header">
                <h4>Security Audit Logs</h4>
                <p className="log-description">
                    Monitor all security events and activities in your vault. All entries are encrypted and stored locally.
                </p>

                {/* Filters and Search */}
                <div className="log-controls">
                    <div className="log-filters">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="log-filter"
                        >
                            <option value="all">All Events</option>
                            <option value="error">Errors Only</option>
                            <option value="warn">Warnings Only</option>
                            <option value="info">Info Only</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="log-search"
                        />

                        <button
                            className="button secondary"
                            onClick={() => SecurityUtils.auditLog.clearLogs()}
                            title="Clear all logs"
                        >
                            🗑️ Clear Logs
                        </button>
                    </div>

                    <div className="log-summary">
                        <span>Total Events: {logs.length}</span>
                        <span>Filtered: {filteredLogs.length}</span>
                        <span>Errors: {logs.filter(l => l.level === 'error').length}</span>
                    </div>
                </div>
            </div>

            {/* Log Entries */}
            <div className="log-entries">
                {filteredLogs.length === 0 ? (
                    <div className="no-logs">
                        <div className="no-logs-icon">📋</div>
                        <h5>No Audit Events</h5>
                        <p>No security events match your current filters.</p>
                    </div>
                ) : (
                    <div className="log-list">
                        {filteredLogs.map((log, index) => (
                            <div
                                key={`${log.timestamp}-${index}`}
                                className={`log-entry ${log.level} ${selectedLog === index ? 'expanded' : ''}`}
                                onClick={() => setSelectedLog(selectedLog === index ? null : index)}
                            >
                                <div className="log-entry-header">
                                    <div className="log-entry-meta">
                                        <span
                                            className="log-level"
                                            style={{ color: getSeverityColor(log.level) }}
                                        >
                                            {getSeverityIcon(log.level)} {log.level.toUpperCase()}
                                        </span>
                                        <span className="log-timestamp">
                                            {formatTimestamp(log.timestamp)}
                                        </span>
                                    </div>
                                    <div className="log-event">
                                        <strong>{getEventDescription(log.event)}</strong>
                                    </div>
                                </div>

                                {selectedLog === index && (
                                    <div className="log-entry-details">
                                        <div className="log-data">
                                            <h6>Event Details:</h6>
                                            <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                        </div>

                                        {log.userAgent && (
                                            <div className="log-meta">
                                                <small>
                                                    Browser: {log.userAgent.split(' ')[0]}
                                                    {log.url && ` | Page: ${log.url}`}
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Log Statistics */}
            <div className="log-footer">
                <div className="log-stats">
                    <h5>Security Summary</h5>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Total Events</span>
                            <span className="stat-value">{logs.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Errors</span>
                            <span className="stat-value error">{logs.filter(l => l.level === 'error').length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Warnings</span>
                            <span className="stat-value warning">{logs.filter(l => l.level === 'warn').length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Info</span>
                            <span className="stat-value info">{logs.filter(l => l.level === 'info').length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogViewer;
