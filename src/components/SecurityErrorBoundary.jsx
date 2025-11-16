// src/components/SecurityErrorBoundary.jsx
import React from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';

class SecurityErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            retryCount: 0,
            recoveryTimeout: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            errorId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
    }

    componentDidCatch(error, errorInfo) {
        // Generate unique error ID for tracking
        const errorId = this.state.errorId || Date.now().toString();

        // Log the error for security analysis
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorId: errorId,
            retryCount: this.state.retryCount
        };

        // Log to security audit
        try {
            SecurityUtils.auditLog.log('react_error_boundary_triggered', {
                error_message: error.message,
                error_id: errorId,
                component_stack: errorInfo.componentStack.substring(0, 500), // Truncate for security
                retry_count: this.state.retryCount,
                timestamp: new Date().toISOString()
            }, 'error');
        } catch (auditError) {
            // Fallback logging if SecurityUtils is not available
            console.error('SecurityErrorBoundary - Failed to log to audit:', auditError);
        }

        // Store full error details for debugging (but not in audit log for security)
        console.error('SecurityErrorBoundary caught an error:', errorDetails);

        this.setState({
            error: error,
            errorInfo: errorInfo,
            errorId: errorId
        });

        // Set up automatic recovery with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000); // Max 30 seconds

        const recoveryTimeout = setTimeout(() => {
            if (this.state.retryCount < 3) {
                // Attempt automatic recovery
                this.setState(prevState => ({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                    errorId: null,
                    retryCount: prevState.retryCount + 1
                }));
            }
        }, retryDelay);

        this.setState({ recoveryTimeout });
    }

    componentWillUnmount() {
        // Cleanup timeout on unmount
        if (this.state.recoveryTimeout) {
            clearTimeout(this.state.recoveryTimeout);
        }
    }

    handleRetry = () => {
        // Clear recovery timeout
        if (this.state.recoveryTimeout) {
            clearTimeout(this.state.recoveryTimeout);
        }

        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null,
            retryCount: 0,
            recoveryTimeout: null
        });

        // Log retry attempt
        SecurityUtils.auditLog.log('error_boundary_retry', {
            error_id: this.state.errorId,
            retry_count: this.state.retryCount + 1
        });
    };

    handleReload = () => {
        // Clear recovery timeout
        if (this.state.recoveryTimeout) {
            clearTimeout(this.state.recoveryTimeout);
        }

        SecurityUtils.auditLog.log('error_boundary_reload', {
            error_id: this.state.errorId,
            retry_count: this.state.retryCount
        });

        // Clear sensitive data before reload
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (e) {
            console.warn('Failed to clear storage during error recovery:', e);
        }

        window.location.reload();
    };

    handleReset = () => {
        // Clear recovery timeout
        if (this.state.recoveryTimeout) {
            clearTimeout(this.state.recoveryTimeout);
        }

        SecurityUtils.auditLog.log('error_boundary_reset', {
            error_id: this.state.errorId,
            retry_count: this.state.retryCount
        });

        // More thorough cleanup
        try {
            localStorage.clear();
            sessionStorage.clear();
            // Clear any cached data
            if (window.caches) {
                window.caches.keys().then(names => {
                    names.forEach(name => {
                        window.caches.delete(name);
                    });
                });
            }
        } catch (e) {
            console.warn('Failed to clear storage during reset:', e);
        }

        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            const isDevelopment = process.env.NODE_ENV === 'development';
            const canRetry = this.state.retryCount < 3;
            const timeUntilRetry = this.state.recoveryTimeout ?
                Math.ceil((this.state.recoveryTimeout._idleStart + this.state.recoveryTimeout._idleTimeout - Date.now()) / 1000) : 0;

            return (
                <div className="error-boundary">
                    <div className="error-boundary-content">
                        <div className="error-icon">⚠️</div>
                        <h2>Application Error</h2>
                        <p>
                            Something went wrong. This error has been logged for analysis and the application is attempting to recover.
                        </p>

                        {canRetry && timeUntilRetry > 0 && (
                            <p className="recovery-info">
                                Automatic recovery will attempt in {timeUntilRetry} seconds...
                            </p>
                        )}

                        {isDevelopment && this.state.error && (
                            <details className="error-details">
                                <summary>Error Details (Development Only)</summary>
                                <pre className="error-stack">
                                    {this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="error-actions">
                            {canRetry && (
                                <button className="button" onClick={this.handleRetry}>
                                    Try Again ({3 - this.state.retryCount} attempts left)
                                </button>
                            )}
                            <button className="button secondary" onClick={this.handleReload}>
                                Reload Page
                            </button>
                            <button className="button danger" onClick={this.handleReset}>
                                Reset Application
                            </button>
                        </div>

                        <div className="error-footer">
                            <small>
                                Error ID: {this.state.errorId} • Retry: {this.state.retryCount}/3 •
                                Logged for security analysis
                            </small>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default SecurityErrorBoundary;
