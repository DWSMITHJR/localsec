// src/utils/Messages.js
export const MESSAGES = {
    // Loading messages
    LOADING: {
        INITIALIZING: 'Initializing security systems...',
        VERIFYING_CREDENTIALS: 'Verifying credentials...',
        LOADING_VAULT: 'Loading vault...',
        DECRYPTING_DATA: 'Decrypting your data...',
        SAVING_DATA: 'Saving data...',
        PROCESSING: 'Processing...',
        VALIDATING: 'Validating...',
        ENCRYPTING: 'Encrypting...',
        DECRYPTING: 'Decrypting...'
    },

    // Error messages
    ERRORS: {
        // Authentication errors
        VAULT_NOT_SETUP: 'Vault has not been set up yet. Please create a master password to get started.',
        INCORRECT_PASSWORD: 'The master password you entered is incorrect. Please try again.',
        LOGIN_TIMEOUT: 'Login process timed out. This may be due to slow encryption. Please try again.',
        SETUP_TIMEOUT: 'Vault setup timed out. Please check your password strength and try again.',
        TOO_MANY_ATTEMPTS: 'Too many login attempts. Please wait 5 minutes before trying again.',

        // Data errors
        DATA_CORRUPTED: 'Your vault data appears to be corrupted. This may require restoring from a backup.',
        DECRYPTION_FAILED: 'Failed to decrypt vault data. Please check your master password.',
        ENCRYPTION_FAILED: 'Failed to encrypt data. Please try again.',
        SAVE_FAILED: 'Failed to save changes. Please check your connection and try again.',

        // Validation errors
        PASSWORD_TOO_WEAK: 'Your password is too weak. Please use at least 8 characters with uppercase, lowercase, numbers, and special characters.',
        PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
        INVALID_API_KEY: 'The API key format is invalid for this service. Please check the key and try again.',
        FIELD_REQUIRED: 'This field is required.',
        FIELD_TOO_LONG: (field, max) => `${field} is too long (maximum ${max} characters).`,
        INVALID_FORMAT: (field) => `Invalid ${field} format. Please check your input.`,

        // Network/Storage errors
        STORAGE_FULL: 'Storage is full. Please free up space or reduce the amount of data stored.',
        NETWORK_ERROR: 'Network error occurred. Please check your connection.',
        PERMISSION_DENIED: 'Permission denied. Please check your browser settings.',

        // Generic errors
        UNKNOWN_ERROR: 'An unexpected error occurred. Please try again or reload the page.',
        OPERATION_CANCELLED: 'Operation was cancelled.',
        TIMEOUT_ERROR: 'Operation timed out. Please try again.'
    },

    // Success messages
    SUCCESS: {
        VAULT_CREATED: 'Vault created successfully! Your data is now encrypted and secure.',
        VAULT_UNLOCKED: 'Vault unlocked successfully.',
        ENTRY_SAVED: 'Entry saved successfully.',
        ENTRY_UPDATED: 'Entry updated successfully.',
        ENTRY_DELETED: 'Entry deleted successfully.',
        DATA_EXPORTED: 'Data exported successfully. File has been downloaded.',
        DATA_IMPORTED: 'Data imported successfully.',
        SETTINGS_SAVED: 'Settings saved successfully.',
        API_KEY_ADDED: 'API key added successfully.',
        API_KEY_UPDATED: 'API key updated successfully.',
        API_KEY_DELETED: 'API key deleted successfully.',
        COPIED_TO_CLIPBOARD: 'Copied to clipboard!',
        VAULT_LOCKED: 'Vault locked successfully.',
        VAULT_BACKED_UP: 'Vault backed up successfully.'
    },

    // Confirmation messages
    CONFIRMATIONS: {
        DELETE_ENTRY: 'Are you sure you want to delete this entry? This action cannot be undone and will permanently remove all associated data.',
        DELETE_API_KEY: 'Are you sure you want to delete this API key? This action cannot be undone and will remove access to the associated AI service.',
        RESET_VAULT: 'Are you sure you want to reset your vault? This will delete all your data permanently and cannot be undone.',
        LOGOUT: 'Are you sure you want to log out? You will need to enter your master password to access your data again.',
        CLEAR_DATA: 'Are you sure you want to clear all data? This action cannot be undone.',
        OVERWRITE_DATA: 'This will overwrite your existing data. Are you sure you want to continue?',
        CREATE_BACKUP: 'Create a backup of your vault? This will download a secure backup file of all your data.'
    },

    // Session messages
    SESSION: {
        EXPIRED: 'Your session has expired. Please log in again to continue.',
        INVALID: 'Your session is invalid. Please log in again.',
        EXTENDED: 'Session extended successfully.',
        AUTO_LOGIN_SUCCESS: 'Automatically logged in successfully.',
        AUTO_LOGIN_FAILED: 'Auto-login failed. Please log in manually.'
    },

    // Progress messages
    PROGRESS: {
        EXPORTING: 'Exporting data...',
        IMPORTING: 'Importing data...',
        VALIDATING: 'Validating data...',
        ENCRYPTING: 'Encrypting data...',
        DECRYPTING: 'Decrypting data...',
        SAVING: 'Saving changes...'
    }
};

// Helper functions for consistent messaging
export const getErrorMessage = (errorType, context = {}) => {
    const message = MESSAGES.ERRORS[errorType];
    if (typeof message === 'function') {
        return message(context.field, context.maxLength, context.value);
    }
    return message || MESSAGES.ERRORS.UNKNOWN_ERROR;
};

export const getSuccessMessage = (successType, context = {}) => {
    return MESSAGES.SUCCESS[successType] || 'Operation completed successfully.';
};

export const getLoadingMessage = (loadingType, context = {}) => {
    return MESSAGES.LOADING[loadingType] || MESSAGES.LOADING.PROCESSING;
};

export const getConfirmationMessage = (confirmType, context = {}) => {
    return MESSAGES.CONFIRMATIONS[confirmType] || 'Are you sure you want to continue?';
};

export const getInfoMessage = (infoType, context = {}) => {
    return MESSAGES.INFO[infoType] || '';
};

export const getSessionMessage = (sessionType, context = {}) => {
    return MESSAGES.SESSION[sessionType] || '';
};

export const getProgressMessage = (progressType, context = {}) => {
    return MESSAGES.PROGRESS[progressType] || 'Processing...';
};

export default MESSAGES;
