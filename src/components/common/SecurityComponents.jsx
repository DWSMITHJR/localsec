// src/components/common/SecurityComponents.jsx
import React, { useState, useEffect } from 'react';

export const PasswordStrengthIndicator = ({ password, className = '' }) => {
  const [strength, setStrength] = useState({ score: 0, feedback: [] });

  useEffect(() => {
    const calculateStrength = () => {
      let score = 0;
      const feedback = [];

      if (password.length >= 8) score += 1;
      else feedback.push('At least 8 characters');

      if (/[a-z]/.test(password)) score += 1;
      else feedback.push('Lowercase letter');

      if (/[A-Z]/.test(password)) score += 1;
      else feedback.push('Uppercase letter');

      if (/[0-9]/.test(password)) score += 1;
      else feedback.push('Number');

      if (/[^a-zA-Z0-9]/.test(password)) score += 1;
      else feedback.push('Special character');

      setStrength({ score, feedback });
    };

    if (password) calculateStrength();
    else setStrength({ score: 0, feedback: [] });
  }, [password]);

  const getStrengthLabel = () => {
    if (strength.score <= 2) return 'Weak';
    if (strength.score <= 3) return 'Medium';
    if (strength.score <= 4) return 'Strong';
    return 'Very Strong';
  };

  const getStrengthColor = () => {
    if (strength.score <= 2) return 'weak';
    if (strength.score <= 3) return 'medium';
    if (strength.score <= 4) return 'strong';
    return 'very-strong';
  };

  return (
    <div className={`password-strength ${className}`}>
      <div className={`strength-bar ${getStrengthColor()}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
      <span className={`strength-label ${getStrengthColor()}`}>{getStrengthLabel()}</span>
      {strength.feedback.length > 0 && (
        <ul className="strength-feedback">
          {strength.feedback.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const SecurityBadge = ({ level, verified = false, className = '' }) => {
  const getLevelConfig = () => {
    switch (level) {
      case 'high': return { color: 'success', icon: 'shield-check', label: 'High Security' };
      case 'medium': return { color: 'warning', icon: 'shield', label: 'Medium Security' };
      case 'low': return { color: 'danger', icon: 'shield-x', label: 'Low Security' };
      default: return { color: 'info', icon: 'info', label: 'Unknown' };
    }
  };

  const config = getLevelConfig();

  return (
    <div className={`security-badge security-${config.color} ${className}`}>
      <Icon name={config.icon} />
      <span>{config.label}</span>
      {verified && <Icon name="check-circle" className="verified-badge" />}
    </div>
  );
};

export const EncryptionStatus = ({ encrypted = true, algorithm = 'AES-256', className = '' }) => (
  <div className={`encryption-status ${encrypted ? 'encrypted' : 'decrypted'} ${className}`}>
    <Icon name={encrypted ? 'lock' : 'unlock'} />
    <span>{encrypted ? 'Encrypted' : 'Decrypted'}</span>
    {encrypted && <small>{algorithm}</small>}
  </div>
);

export const SessionTimer = ({ expiryTime, onExpire, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = expiryTime - Date.now();
      setTimeLeft(Math.max(0, difference));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryTime]);

  useEffect(() => {
    if (timeLeft === 0 && onExpire) onExpire();
  }, [timeLeft, onExpire]);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`session-timer ${timeLeft < 60000 ? 'warning' : ''} ${className}`}>
      <Icon name="clock" />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export const AuditLogEntry = ({ entry, className = '' }) => {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return 'x-circle';
      case 'warning': return 'alert-triangle';
      case 'info': return 'info';
      default: return 'check-circle';
    }
  };

  return (
    <div className={`audit-log-entry audit-${entry.severity} ${className}`}>
      <div className="audit-header">
        <Icon name={getSeverityIcon(entry.severity)} />
        <span className="audit-action">{entry.action}</span>
        <span className="audit-timestamp">{new Date(entry.timestamp).toLocaleString()}</span>
      </div>
      {entry.details && <div className="audit-details">{entry.details}</div>}
    </div>
  );
};

export const BiometricAuth = ({ onAuthenticate, supported = true, className = '' }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      await onAuthenticate();
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!supported) return null;

  return (
    <div className={`biometric-auth ${className}`}>
      <Button
        onClick={handleAuthenticate}
        disabled={isAuthenticating}
        loading={isAuthenticating}
        variant="outline"
      >
        <Icon name="fingerprint" />
        {isAuthenticating ? 'Authenticating...' : 'Use Biometric Authentication'}
      </Button>
    </div>
  );
};

export const TwoFactorAuth = ({ onVerify, className = '' }) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerify(code);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`two-factor-auth ${className}`}>
      <FormField
        label="Authentication Code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        maxLength={6}
      />
      <Button onClick={handleVerify} disabled={code.length !== 6} loading={isVerifying}>
        Verify Code
      </Button>
    </div>
  );
};
