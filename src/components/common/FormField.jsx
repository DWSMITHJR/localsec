// src/components/common/FormField.jsx
import React from 'react';

export const FormField = ({ label, type = 'text', value, onChange, error, placeholder, required = false, disabled = false, className = '' }) => (
  <div className={`form-field ${className}`}>
    {label && <label className="form-label">{label}{required && ' *'}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`form-input ${error ? 'error' : ''}`}
    />
    {error && <span className="form-error">{error}</span>}
  </div>
);

export const TextArea = ({ label, value, onChange, error, placeholder, rows = 3, className = '' }) => (
  <div className={`form-field ${className}`}>
    {label && <label className="form-label">{label}</label>}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`form-textarea ${error ? 'error' : ''}`}
    />
    {error && <span className="form-error">{error}</span>}
  </div>
);

export const Select = ({ label, value, onChange, options, error, placeholder, className = '' }) => (
  <div className={`form-field ${className}`}>
    {label && <label className="form-label">{label}</label>}
    <select value={value} onChange={onChange} className={`form-select ${error ? 'error' : ''}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    {error && <span className="form-error">{error}</span>}
  </div>
);

export const Checkbox = ({ label, checked, onChange, disabled = false, className = '' }) => (
  <div className={`form-field checkbox ${className}`}>
    <label className="checkbox-label">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span>{label}</span>
    </label>
  </div>
);

export const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, loading = false, className = '' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`btn btn-${variant} ${loading ? 'loading' : ''} ${className}`}
  >
    {loading ? <span className="spinner" /> : children}
  </button>
);

export const Modal = ({ isOpen, onClose, title, children, className = '' }) => (
  isOpen && (
    <div className={`modal-overlay ${className}`}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
);

export const Alert = ({ type = 'info', message, onClose, className = '' }) => (
  <div className={`alert alert-${type} ${className}`}>
    <span>{message}</span>
    {onClose && <button className="alert-close" onClick={onClose}>×</button>}
  </div>
);

export const LoadingSpinner = ({ size = 'medium', className = '' }) => (
  <div className={`loading-spinner loading-${size} ${className}`} />
);

export const Icon = ({ name, className = '' }) => (
  <span className={`icon icon-${name} ${className}`} />
);

export const Badge = ({ text, variant = 'default', className = '' }) => (
  <span className={`badge badge-${variant} ${className}`}>{text}</span>
);

export const Card = ({ title, children, className = '' }) => (
  <div className={`card ${className}`}>
    {title && <div className="card-header"><h4>{title}</h4></div>}
    <div className="card-body">{children}</div>
  </div>
);

export const Tabs = ({ tabs, activeTab, onChange, className = '' }) => (
  <div className={`tabs ${className}`}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`search-input ${className}`}>
    <Icon name="search" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="search-field"
    />
  </div>
);

export const Dropdown = ({ trigger, children, className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className={`dropdown ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="dropdown-menu">
          {children}
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
};
