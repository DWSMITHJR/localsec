import React from 'react';
import SecurityErrorBoundary from './SecurityErrorBoundary';

const ErrorBoundaryWrapper = ({ children }) => {
  return (
    <SecurityErrorBoundary>
      {children}
    </SecurityErrorBoundary>
  );
};

export default ErrorBoundaryWrapper;
