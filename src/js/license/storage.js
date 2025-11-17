/**
 * License Storage Manager
 *
 * Handles localStorage operations for license data
 */

const LICENSE_STORAGE_KEY = '4d_viewer_license';

/**
 * Save license data to localStorage
 * @param {Object} licenseData - License information
 * @param {string} licenseData.key - License key
 * @param {string} licenseData.email - User email
 * @param {string} licenseData.tier - Tier (free/creator/professional)
 * @param {string} licenseData.expirationDate - ISO date string
 * @param {string} licenseData.status - License status
 */
export function saveLicense(licenseData) {
    try {
        const dataToSave = {
            ...licenseData,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(dataToSave));
        console.log('License saved to storage');
        return true;
    } catch (error) {
        console.error('Failed to save license:', error);
        return false;
    }
}

/**
 * Load license data from localStorage
 * @returns {Object|null} License data or null if not found
 */
export function loadLicense() {
    try {
        const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (!stored) {
            return null;
        }

        const license = JSON.parse(stored);
        console.log('License loaded from storage:', license.tier);
        return license;
    } catch (error) {
        console.error('Failed to load license:', error);
        return null;
    }
}

/**
 * Clear license data from localStorage
 */
export function clearLicense() {
    try {
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        console.log('License cleared from storage');
        return true;
    } catch (error) {
        console.error('Failed to clear license:', error);
        return false;
    }
}

/**
 * Check if license exists in storage
 * @returns {boolean}
 */
export function hasLicense() {
    return localStorage.getItem(LICENSE_STORAGE_KEY) !== null;
}
