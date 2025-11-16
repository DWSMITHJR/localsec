// src/components/SecurityAnalysis.jsx
import React, { useMemo } from 'react';
import SecurityUtils from '../utils/SecurityUtils.js';

const SecurityAnalysis = ({ entries, onCopy }) => {
    // Password strength evaluation
    const evaluatePasswordStrength = (password) => {
        if (!password) return { score: 0, level: 'None', issues: ['No password'] };

        let score = 0;
        let issues = [];

        // Length check
        if (password.length < 8) {
            issues.push('Too short (minimum 8 characters)');
        } else if (password.length >= 12) {
            score += 2;
        } else {
            score += 1;
        }

        // Character variety
        if (!/[a-z]/.test(password)) issues.push('Missing lowercase letters');
        else score += 1;

        if (!/[A-Z]/.test(password)) issues.push('Missing uppercase letters');
        else score += 1;

        if (!/[0-9]/.test(password)) issues.push('Missing numbers');
        else score += 1;

        if (!/[^a-zA-Z0-9]/.test(password)) issues.push('Missing special characters');
        else score += 1;

        // Common patterns
        if (/(.)\1{2,}/.test(password)) {
            issues.push('Repeated characters');
            score -= 1;
        }

        // Dictionary words (basic check)
        const commonWords = ['password', 'admin', 'user', 'login', 'welcome', '123456', 'qwerty'];
        if (commonWords.some(word => password.toLowerCase().includes(word))) {
            issues.push('Contains common words');
            score -= 1;
        }

        let level = 'Weak';
        if (score >= 5) level = 'Strong';
        else if (score >= 3) level = 'Medium';

        return { score, level, issues };
    };

    // Analyze all entries
    const analysis = useMemo(() => {
        const results = {
            totalEntries: entries.length,
            weakPasswords: [],
            duplicateCredentials: [],
            oldEntries: [],
            missingInfo: [],
            strongPasswords: 0,
            overallScore: 0
        };

        const passwords = new Map();
        const usernames = new Map();

        entries.forEach(entry => {
            // Password strength analysis
            if (entry.password) {
                const strength = evaluatePasswordStrength(entry.password);
                if (strength.level === 'Weak') {
                    results.weakPasswords.push({
                        title: entry.title,
                        issues: strength.issues,
                        score: strength.score
                    });
                } else if (strength.level === 'Strong') {
                    results.strongPasswords++;
                }
            }

            // Duplicate detection
            if (entry.username) {
                const key = `${entry.username}@${entry.url || 'no-url'}`;
                if (usernames.has(key)) {
                    results.duplicateCredentials.push({
                        title: entry.title,
                        duplicateOf: usernames.get(key)
                    });
                } else {
                    usernames.set(key, entry.title);
                }
            }

            // Old entries (older than 1 year)
            if (entry.updatedAt) {
                const updateDate = new Date(entry.updatedAt);
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                if (updateDate < oneYearAgo) {
                    results.oldEntries.push({
                        title: entry.title,
                        lastUpdated: entry.updatedAt
                    });
                }
            }

            // Missing information
            const missing = [];
            if (!entry.username) missing.push('username');
            if (!entry.password) missing.push('password');
            if (!entry.url && entry.type === 'passwords') missing.push('URL');

            if (missing.length > 0) {
                results.missingInfo.push({
                    title: entry.title,
                    missing: missing
                });
            }
        });

        // Calculate overall score (0-100)
        const maxIssues = results.totalEntries * 3; // Max issues per entry
        const totalIssues = results.weakPasswords.length + results.duplicateCredentials.length + results.oldEntries.length + results.missingInfo.length;
        results.overallScore = maxIssues > 0 ? Math.max(0, 100 - (totalIssues / maxIssues) * 100) : 100;

        return results;
    }, [entries]);

    const getScoreColor = (score) => {
        if (score >= 80) return '#4caf50'; // Green
        if (score >= 60) return '#ff9800'; // Orange
        return '#f44336'; // Red
    };

    const getScoreText = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    };

    return (
        <div className="security-analysis">
            {/* Overall Score */}
            <div className="analysis-summary">
                <h3>Security Score</h3>
                <div className="score-display">
                    <div
                        className="score-circle"
                        style={{
                            backgroundColor: getScoreColor(analysis.overallScore),
                            color: 'white',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            margin: '0 auto 10px'
                        }}
                    >
                        {Math.round(analysis.overallScore)}
                    </div>
                    <p style={{textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: getScoreColor(analysis.overallScore)}}>
                        {getScoreText(analysis.overallScore)}
                    </p>
                </div>
            </div>

            {/* Issue Breakdown */}
            <div className="issues-breakdown">
                <div className="issue-item">
                    <strong>Total Entries:</strong> {analysis.totalEntries}
                </div>
                <div className="issue-item">
                    <strong>Strong Passwords:</strong> {analysis.strongPasswords}
                </div>
                <div className="issue-item">
                    <strong>Weak Passwords:</strong> {analysis.weakPasswords.length}
                </div>
                <div className="issue-item">
                    <strong>Duplicate Credentials:</strong> {analysis.duplicateCredentials.length}
                </div>
                <div className="issue-item">
                    <strong>Old Entries (1+ year):</strong> {analysis.oldEntries.length}
                </div>
                <div className="issue-item">
                    <strong>Missing Information:</strong> {analysis.missingInfo.length}
                </div>
            </div>

            {/* Detailed Issues */}
            {analysis.weakPasswords.length > 0 && (
                <div className="issue-section">
                    <h4>⚠️ Weak Passwords</h4>
                    {analysis.weakPasswords.map((item, index) => (
                        <div key={index} className="issue-detail">
                            <strong>{item.title}</strong>
                            <ul>
                                {item.issues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {analysis.duplicateCredentials.length > 0 && (
                <div className="issue-section">
                    <h4>🔄 Duplicate Credentials</h4>
                    {analysis.duplicateCredentials.map((item, index) => (
                        <div key={index} className="issue-detail">
                            <strong>{item.title}</strong> appears to duplicate <em>{item.duplicateOf}</em>
                        </div>
                    ))}
                </div>
            )}

            {analysis.oldEntries.length > 0 && (
                <div className="issue-section">
                    <h4>📅 Old Entries</h4>
                    {analysis.oldEntries.map((item, index) => (
                        <div key={index} className="issue-detail">
                            <strong>{item.title}</strong> - Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                        </div>
                    ))}
                </div>
            )}

            {analysis.missingInfo.length > 0 && (
                <div className="issue-section">
                    <h4>📝 Missing Information</h4>
                    {analysis.missingInfo.map((item, index) => (
                        <div key={index} className="issue-detail">
                            <strong>{item.title}</strong> - Missing: {item.missing.join(', ')}
                        </div>
                    ))}
                </div>
            )}

            {/* Recommendations */}
            <div className="recommendations">
                <h4>💡 Recommendations</h4>
                <ul>
                    {analysis.weakPasswords.length > 0 && (
                        <li>Use strong, unique passwords for each account</li>
                    )}
                    {analysis.duplicateCredentials.length > 0 && (
                        <li>Review and consolidate duplicate credentials</li>
                    )}
                    {analysis.oldEntries.length > 0 && (
                        <li>Update old credentials regularly</li>
                    )}
                    {analysis.missingInfo.length > 0 && (
                        <li>Complete missing information for better security</li>
                    )}
                    <li>Enable two-factor authentication where available</li>
                    <li>Regularly backup your vault</li>
                </ul>
            </div>
        </div>
    );
};

export default SecurityAnalysis;
