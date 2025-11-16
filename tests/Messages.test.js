// tests/Messages.test.js
import { describe, it, expect } from 'vitest';
import MESSAGES, {
  getErrorMessage,
  getSuccessMessage,
  getLoadingMessage,
  getConfirmationMessage,
  getInfoMessage,
  getSessionMessage,
  getProgressMessage
} from '../src/utils/Messages.js';

describe('MESSAGES', () => {
  it('should have all required message categories', () => {
    expect(MESSAGES).toHaveProperty('LOADING');
    expect(MESSAGES).toHaveProperty('ERRORS');
    expect(MESSAGES).toHaveProperty('SUCCESS');
    expect(MESSAGES).toHaveProperty('CONFIRMATIONS');
    expect(MESSAGES).toHaveProperty('SESSION');
    expect(MESSAGES).toHaveProperty('PROGRESS');
  });

  describe('LOADING messages', () => {
    it('should have all loading message types', () => {
      expect(MESSAGES.LOADING).toHaveProperty('INITIALIZING');
      expect(MESSAGES.LOADING).toHaveProperty('VERIFYING_CREDENTIALS');
      expect(MESSAGES.LOADING).toHaveProperty('LOADING_VAULT');
      expect(MESSAGES.LOADING).toHaveProperty('DECRYPTING_DATA');
      expect(MESSAGES.LOADING).toHaveProperty('SAVING_DATA');
      expect(MESSAGES.LOADING).toHaveProperty('PROCESSING');
      expect(MESSAGES.LOADING).toHaveProperty('VALIDATING');
      expect(MESSAGES.LOADING).toHaveProperty('ENCRYPTING');
      expect(MESSAGES.LOADING).toHaveProperty('DECRYPTING');
    });

    it('should return loading messages', () => {
      expect(getLoadingMessage('INITIALIZING')).toBe('Initializing security systems...');
      expect(getLoadingMessage('VERIFYING_CREDENTIALS')).toBe('Verifying credentials...');
      expect(getLoadingMessage('LOADING_VAULT')).toBe('Loading vault...');
    });

    it('should return default loading message for unknown type', () => {
      expect(getLoadingMessage('UNKNOWN')).toBe('Processing...');
    });
  });

  describe('ERROR messages', () => {
    it('should have all error message types', () => {
      expect(MESSAGES.ERRORS).toHaveProperty('VAULT_NOT_SETUP');
      expect(MESSAGES.ERRORS).toHaveProperty('INCORRECT_PASSWORD');
      expect(MESSAGES.ERRORS).toHaveProperty('LOGIN_TIMEOUT');
      expect(MESSAGES.ERRORS).toHaveProperty('SETUP_TIMEOUT');
      expect(MESSAGES.ERRORS).toHaveProperty('TOO_MANY_ATTEMPTS');
      expect(MESSAGES.ERRORS).toHaveProperty('DATA_CORRUPTED');
      expect(MESSAGES.ERRORS).toHaveProperty('DECRYPTION_FAILED');
      expect(MESSAGES.ERRORS).toHaveProperty('ENCRYPTION_FAILED');
      expect(MESSAGES.ERRORS).toHaveProperty('SAVE_FAILED');
      expect(MESSAGES.ERRORS).toHaveProperty('PASSWORD_TOO_WEAK');
      expect(MESSAGES.ERRORS).toHaveProperty('PASSWORD_TOO_SHORT');
      expect(MESSAGES.ERRORS).toHaveProperty('INVALID_API_KEY');
      expect(MESSAGES.ERRORS).toHaveProperty('FIELD_REQUIRED');
      expect(MESSAGES.ERRORS).toHaveProperty('STORAGE_FULL');
      expect(MESSAGES.ERRORS).toHaveProperty('NETWORK_ERROR');
      expect(MESSAGES.ERRORS).toHaveProperty('PERMISSION_DENIED');
      expect(MESSAGES.ERRORS).toHaveProperty('UNKNOWN_ERROR');
      expect(MESSAGES.ERRORS).toHaveProperty('OPERATION_CANCELLED');
      expect(MESSAGES.ERRORS).toHaveProperty('TIMEOUT_ERROR');
    });

    it('should return error messages', () => {
      expect(getErrorMessage('VAULT_NOT_SETUP')).toBe('Vault has not been set up yet. Please create a master password to get started.');
      expect(getErrorMessage('INCORRECT_PASSWORD')).toBe('The master password you entered is incorrect. Please try again.');
      expect(getErrorMessage('FIELD_REQUIRED')).toBe('This field is required.');
    });

    it('should handle function-based error messages', () => {
      expect(MESSAGES.ERRORS.FIELD_TOO_LONG).toBeTypeOf('function');
      expect(MESSAGES.ERRORS.INVALID_FORMAT).toBeTypeOf('function');
      
      const fieldTooLong = getErrorMessage('FIELD_TOO_LONG', { field: 'Username', maxLength: 20 });
      expect(fieldTooLong).toBe('Username is too long (maximum 20 characters).');
      
      const invalidFormat = getErrorMessage('INVALID_FORMAT', { field: 'Email' });
      expect(invalidFormat).toBe('Invalid Email format. Please check your input.');
    });

    it('should return default error message for unknown type', () => {
      expect(getErrorMessage('UNKNOWN')).toBe('An unexpected error occurred. Please try again or reload the page.');
    });
  });

  describe('SUCCESS messages', () => {
    it('should have all success message types', () => {
      expect(MESSAGES.SUCCESS).toHaveProperty('VAULT_CREATED');
      expect(MESSAGES.SUCCESS).toHaveProperty('VAULT_UNLOCKED');
      expect(MESSAGES.SUCCESS).toHaveProperty('ENTRY_SAVED');
      expect(MESSAGES.SUCCESS).toHaveProperty('ENTRY_UPDATED');
      expect(MESSAGES.SUCCESS).toHaveProperty('ENTRY_DELETED');
      expect(MESSAGES.SUCCESS).toHaveProperty('DATA_EXPORTED');
      expect(MESSAGES.SUCCESS).toHaveProperty('DATA_IMPORTED');
      expect(MESSAGES.SUCCESS).toHaveProperty('SETTINGS_SAVED');
      expect(MESSAGES.SUCCESS).toHaveProperty('API_KEY_ADDED');
      expect(MESSAGES.SUCCESS).toHaveProperty('API_KEY_UPDATED');
      expect(MESSAGES.SUCCESS).toHaveProperty('API_KEY_DELETED');
      expect(MESSAGES.SUCCESS).toHaveProperty('COPIED_TO_CLIPBOARD');
      expect(MESSAGES.SUCCESS).toHaveProperty('VAULT_LOCKED');
      expect(MESSAGES.SUCCESS).toHaveProperty('VAULT_BACKED_UP');
    });

    it('should return success messages', () => {
      expect(getSuccessMessage('VAULT_CREATED')).toBe('Vault created successfully! Your data is now encrypted and secure.');
      expect(getSuccessMessage('ENTRY_SAVED')).toBe('Entry saved successfully.');
      expect(getSuccessMessage('COPIED_TO_CLIPBOARD')).toBe('Copied to clipboard!');
    });

    it('should return default success message for unknown type', () => {
      expect(getSuccessMessage('UNKNOWN')).toBe('Operation completed successfully.');
    });
  });

  describe('CONFIRMATION messages', () => {
    it('should have all confirmation message types', () => {
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('DELETE_ENTRY');
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('DELETE_API_KEY');
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('RESET_VAULT');
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('LOGOUT');
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('CLEAR_DATA');
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('OVERWRITE_DATA');
      expect(MESSAGES.CONFIRMATIONS).toHaveProperty('CREATE_BACKUP');
    });

    it('should return confirmation messages', () => {
      expect(getConfirmationMessage('DELETE_ENTRY')).toContain('Are you sure you want to delete this entry?');
      expect(getConfirmationMessage('LOGOUT')).toContain('Are you sure you want to log out?');
    });

    it('should return default confirmation message for unknown type', () => {
      expect(getConfirmationMessage('UNKNOWN')).toBe('Are you sure you want to continue?');
    });
  });

  describe('SESSION messages', () => {
    it('should have all session message types', () => {
      expect(MESSAGES.SESSION).toHaveProperty('EXPIRED');
      expect(MESSAGES.SESSION).toHaveProperty('INVALID');
      expect(MESSAGES.SESSION).toHaveProperty('EXTENDED');
      expect(MESSAGES.SESSION).toHaveProperty('AUTO_LOGIN_SUCCESS');
      expect(MESSAGES.SESSION).toHaveProperty('AUTO_LOGIN_FAILED');
    });

    it('should return session messages', () => {
      expect(getSessionMessage('EXPIRED')).toBe('Your session has expired. Please log in again to continue.');
      expect(getSessionMessage('AUTO_LOGIN_SUCCESS')).toBe('Automatically logged in successfully.');
    });

    it('should return empty string for unknown session type', () => {
      expect(getSessionMessage('UNKNOWN')).toBe('');
    });
  });

  describe('PROGRESS messages', () => {
    it('should have all progress message types', () => {
      expect(MESSAGES.PROGRESS).toHaveProperty('EXPORTING');
      expect(MESSAGES.PROGRESS).toHaveProperty('IMPORTING');
      expect(MESSAGES.PROGRESS).toHaveProperty('VALIDATING');
      expect(MESSAGES.PROGRESS).toHaveProperty('ENCRYPTING');
      expect(MESSAGES.PROGRESS).toHaveProperty('DECRYPTING');
      expect(MESSAGES.PROGRESS).toHaveProperty('SAVING');
    });

    it('should return progress messages', () => {
      expect(getProgressMessage('EXPORTING')).toBe('Exporting data...');
      expect(getProgressMessage('SAVING')).toBe('Saving changes...');
    });

    it('should return default progress message for unknown type', () => {
      expect(getProgressMessage('UNKNOWN')).toBe('Processing...');
    });
  });

  describe('Helper functions', () => {
    it('should handle empty context', () => {
      expect(getErrorMessage('FIELD_REQUIRED', {})).toBe('This field is required.');
      expect(getSuccessMessage('VAULT_CREATED', {})).toBe('Vault created successfully! Your data is now encrypted and secure.');
      expect(getLoadingMessage('INITIALIZING', {})).toBe('Initializing security systems...');
    });

    it('should return empty string for unknown info type', () => {
      expect(getInfoMessage('UNKNOWN')).toBe('');
    });
  });
});
