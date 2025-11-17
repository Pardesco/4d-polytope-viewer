/**
 * License Manager
 *
 * Main class for handling license validation, storage, and feature gates
 */

import { saveLicense, loadLicense, clearLicense, hasLicense } from './storage.js';
import { validateLicense } from './api.js';

// Debug logging flag - set to false to disable logging in production
const DEBUG = true;

export class LicenseManager {
    constructor() {
        this.license = null;
        this.loadFromStorage();
    }

    /**
     * Load license from localStorage
     * @returns {boolean} True if license was loaded
     */
    loadFromStorage() {
        this.license = loadLicense();
        return this.license !== null;
    }

    /**
     * Save current license to localStorage
     * @returns {boolean} True if saved successfully
     */
    saveToStorage() {
        if (!this.license) {
            return false;
        }
        return saveLicense(this.license);
    }

    /**
     * Clear license from storage
     */
    clearStorage() {
        this.license = null;
        return clearLicense();
    }

    /**
     * Validate license with backend API and save if valid
     * @param {string} licenseKey - License key
     * @param {string} email - User email
     * @returns {Promise<Object>} Validation result
     */
    async validate(licenseKey, email) {
        try {
            const result = await validateLicense(licenseKey, email);

            if (result.success && result.data.valid) {
                // Save license data
                this.license = {
                    key: licenseKey,
                    email: email,
                    tier: result.data.tier,
                    expirationDate: result.data.expirationDate,
                    status: result.data.status,
                    purchaseDate: result.data.purchaseDate,
                    daysRemaining: result.data.daysRemaining,
                    validatedAt: new Date().toISOString()
                };

                this.saveToStorage();

                return {
                    success: true,
                    message: 'License activated successfully',
                    tier: this.license.tier
                };
            } else {
                return {
                    success: false,
                    error: result.data?.error || result.error || 'License validation failed'
                };
            }
        } catch (error) {
            console.error('Validation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get current license tier
     * @returns {string} 'free', 'creator', or 'professional'
     */
    getTier() {
        if (!this.license || this.isExpired()) {
            return 'free';
        }
        return this.license.tier;
    }

    /**
     * Check if license is expired
     * @returns {boolean}
     */
    isExpired() {
        if (!this.license || !this.license.expirationDate) {
            return true;
        }

        const now = new Date();
        const expiration = new Date(this.license.expirationDate);
        return now > expiration;
    }

    /**
     * Check if user can export mesh
     * @returns {boolean}
     */
    canExportMesh() {
        const tier = this.getTier();
        return tier === 'creator' || tier === 'professional';
    }

    /**
     * Check if user can export linework
     * @returns {boolean}
     */
    canExportLinework() {
        const tier = this.getTier();
        return tier === 'creator' || tier === 'professional';
    }

    /**
     * Check if user can export unwatermarked screenshots
     * @returns {boolean}
     */
    canExportScreenshotUnwatermarked() {
        const tier = this.getTier();
        return tier === 'creator' || tier === 'professional';
    }

    /**
     * Check if user can access animation export (Professional only)
     * @returns {boolean}
     */
    canExportAnimation() {
        return this.getTier() === 'professional';
    }

    /**
     * Get days until expiration
     * @returns {number} Days remaining (negative if expired)
     */
    getDaysUntilExpiration() {
        if (!this.license || !this.license.expirationDate) {
            return 0;
        }

        const now = new Date();
        const expiration = new Date(this.license.expirationDate);
        const diffMs = expiration - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Get license key (for API calls)
     * @returns {string|null}
     */
    getLicenseKey() {
        return this.license?.key || null;
    }

    /**
     * Get license email
     * @returns {string|null}
     */
    getEmail() {
        return this.license?.email || null;
    }

    /**
     * Check if user has any license (even expired)
     * @returns {boolean}
     */
    hasLicense() {
        return this.license !== null;
    }

    /**
     * Get license info for display
     * @returns {Object}
     */
    getLicenseInfo() {
        if (!this.license) {
            return {
                tier: 'free',
                hasLicense: false
            };
        }

        return {
            tier: this.getTier(),
            hasLicense: true,
            email: this.license.email,
            expirationDate: this.license.expirationDate,
            daysRemaining: this.getDaysUntilExpiration(),
            isExpired: this.isExpired(),
            status: this.license.status
        };
    }

    /**
     * Logout / deactivate license
     */
    logout() {
        this.clearStorage();
        if (DEBUG) console.log('License deactivated');
    }
}

// Create a singleton instance
export const licenseManager = new LicenseManager();
