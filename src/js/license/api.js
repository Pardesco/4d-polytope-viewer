/**
 * License API Client
 *
 * Handles communication with the backend license API
 */

// Production API (now with CORS enabled for localhost development)
const API_BASE_URL = 'https://4d-license-api.randall-7f7.workers.dev';

/**
 * Validate a license key with the backend
 * @param {string} licenseKey - License key (XXXX-XXXX-XXXX-XXXX)
 * @param {string} email - User email
 * @returns {Promise<Object>} Validation response
 */
export async function validateLicense(licenseKey, email) {
    try {
        const response = await fetch(`${API_BASE_URL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ licenseKey, email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Validation failed');
        }

        return {
            success: true,
            data: data
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
 * Export mesh data (server-side validation)
 * @param {Object} polytopeData - Polytope export data
 * @param {string} licenseKey - License key
 * @returns {Promise<Blob>} .obj file blob
 */
export async function exportMesh(polytopeData, licenseKey) {
    try {
        const response = await fetch(`${API_BASE_URL}/export/mesh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${licenseKey}`
            },
            body: JSON.stringify(polytopeData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Export failed');
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Mesh export error:', error);
        throw error;
    }
}

/**
 * Export linework data (server-side validation)
 * @param {Object} polytopeData - Polytope export data
 * @param {string} licenseKey - License key
 * @returns {Promise<Blob>} .obj file blob
 */
export async function exportLinework(polytopeData, licenseKey) {
    try {
        const response = await fetch(`${API_BASE_URL}/export/linework`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${licenseKey}`
            },
            body: JSON.stringify(polytopeData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Export failed');
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Linework export error:', error);
        throw error;
    }
}

/**
 * Export screenshot (server-side validation)
 * @param {string} imageData - Base64 image data URL
 * @param {string} polytopeName - Name of polytope
 * @param {string} licenseKey - License key
 * @returns {Promise<Blob>} PNG file blob
 */
export async function exportScreenshot(imageData, polytopeName, licenseKey) {
    try {
        const response = await fetch(`${API_BASE_URL}/export/screenshot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${licenseKey}`
            },
            body: JSON.stringify({
                imageData: imageData,
                polytope: polytopeName,
                format: 'png'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Screenshot export failed');
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Screenshot export error:', error);
        throw error;
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
