/**
 * License API Client
 *
 * Handles license validation via LemonSqueezy's license API
 */

// LemonSqueezy license validation endpoint
const LEMONSQUEEZY_VALIDATE = 'https://api.lemonsqueezy.com/v1/licenses/validate';

/**
 * Validate a license key with LemonSqueezy
 * @param {string} licenseKey - License key from LemonSqueezy
 * @returns {Promise<Object>} Validation response
 */
export async function validateLicense(licenseKey) {
    try {
        const response = await fetch(LEMONSQUEEZY_VALIDATE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ license_key: licenseKey })
        });

        const data = await response.json();

        if (!data.valid) {
            return {
                success: false,
                error: data.error || 'Invalid license key'
            };
        }

        return {
            success: true,
            data: {
                valid: true,
                key: licenseKey,
                tier: 'creator', // All LemonSqueezy keys = creator tier
                status: data.license_key.status,
                expirationDate: data.license_key.expires_at,
                purchaseDate: data.license_key.created_at,
                customerName: data.meta?.customer_name || '',
                productName: data.meta?.product_name || ''
            }
        };
    } catch (error) {
        console.error('License validation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Download a blob as a file
 * @param {Blob} blob - File blob
 * @param {string} filename - Filename
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
