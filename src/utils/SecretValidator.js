// src/utils/SecretValidator.js

class SecretValidator {
    static audit() {
        const violations = [];

        // Check for exposed secrets in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
                violations.push(`Potential secret found in localStorage: ${key}`);
            }
        }

        // Check for exposed secrets in sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
                violations.push(`Potential secret found in sessionStorage: ${key}`);
            }
        }

        return {
            isSecure: violations.length === 0,
            violations,
            summary: `${violations.length} potential security violations found.`,
        };
    }
}

export default SecretValidator;
