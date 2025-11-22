/**
 * Export Menu UI Component
 *
 * Displays export options with license-based feature gating
 * Shows upgrade prompts for free tier users
 */

import * as THREE from 'three';
import { VideoRecorder } from '../export/VideoRecorder.js';

export class ExportMenu {
    constructor(container, licenseManager, viewer) {
        this.container = container;
        this.licenseManager = licenseManager;
        this.viewer = viewer;
        this.exportPanel = null;
        this.videoRecorder = null;
        this.recordingInterval = null;

        this.init();
    }

    /**
     * Initialize export menu UI
     */
    init() {
        const tier = this.licenseManager.getTier();

        this.exportPanel = document.createElement('div');
        this.exportPanel.className = 'export-panel';
        this.exportPanel.innerHTML = this.generateHTML(tier);

        this.container.appendChild(this.exportPanel);
        this.attachEventListeners();
    }

    /**
     * Generate HTML for export panel
     * @param {string} tier - User tier (free/creator/professional)
     * @returns {string} HTML string
     */
    generateHTML(tier) {
        const isFree = tier === 'free';
        const isCreatorOrPro = tier === 'creator' || tier === 'professional';

        return `
            <div class="export-header">
                <h3>📦 Export</h3>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${isFree ? '<span class="tier-badge free">Free Tier</span>' : ''}
                    ${tier === 'creator' ? '<span class="tier-badge creator">Creator</span>' : ''}
                    ${tier === 'professional' ? '<span class="tier-badge pro">Professional</span>' : ''}
                </div>
            </div>

            <div class="export-buttons">
                <!-- Video Recording (Creator/Pro only) -->
                <button
                    class="export-btn ${isFree ? 'locked' : ''}"
                    id="video-record-btn"
                    data-export-type="video"
                    ${isFree ? 'disabled' : ''}
                >
                    ${isFree ? '🔒' : '🎬'} <span id="video-btn-text">Record Video</span>
                    ${isFree ? '<span class="upgrade-hint">Creator</span>' : ''}
                </button>
                <div id="recording-timer" class="recording-timer" style="display: none;">
                    <span class="recording-dot"></span>
                    <span id="timer-text">00:00</span>
                </div>

                <!-- Mesh Export -->
                <button
                    class="export-btn ${isFree ? 'locked' : ''}"
                    data-export-type="mesh"
                    ${isFree ? 'disabled' : ''}
                >
                    ${isFree ? '🔒' : '📐'} Export Mesh (.obj)
                    ${isFree ? '<span class="upgrade-hint">Creator</span>' : ''}
                </button>

                <!-- Linework Export -->
                <button
                    class="export-btn ${isFree ? 'locked' : ''}"
                    data-export-type="linework"
                    ${isFree ? 'disabled' : ''}
                >
                    ${isFree ? '🔒' : '📏'} Export Linework (.obj)
                    ${isFree ? '<span class="upgrade-hint">Creator</span>' : ''}
                </button>

                <!-- Screenshot Export -->
                <button
                    class="export-btn"
                    data-export-type="screenshot"
                >
                    📸 Export Screenshot
                    ${isFree ? '<span class="watermark-note">(Watermarked)</span>' : '<span class="watermark-note">(Transparent BG)</span>'}
                </button>
            </div>

            ${isFree ? this.generateUpgradePrompt() : ''}

            <div class="export-status" id="export-status"></div>

            ${!isFree ? '<button id="deactivate-license-btn" class="deactivate-license-btn" title="Remove license from this device">Deactivate License</button>' : ''}
        `;
    }

    /**
     * Generate upgrade prompt for free tier users
     * @returns {string} HTML string
     */
    generateUpgradePrompt() {
        return `
            <div class="upgrade-prompt">
                <p>🌟 <strong>Unlock Export Features</strong></p>
                <p>Upgrade to Creator tier for:</p>
                <ul style="text-align: left; font-size: 12px; margin: 8px 0; padding-left: 20px;">
                    <li>🎬 Video recording (30 FPS, .webm)</li>
                    <li>🎨 Transparent background screenshots</li>
                    <li>📐 Mesh & linework .obj exports</li>
                    <li>✨ No watermarks</li>
                </ul>
                <a href="https://pardesco.com/products/4d-viewer-creator" target="_blank" class="upgrade-btn">
                    Upgrade to Creator - $49/year
                </a>
            </div>
        `;
    }

    /**
     * Attach event listeners to export buttons
     */
    attachEventListeners() {
        const buttons = this.exportPanel.querySelectorAll('.export-btn');

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const exportType = e.currentTarget.dataset.exportType;
                this.handleExport(exportType);
            });
        });

        // Deactivate license button
        const deactivateBtn = document.getElementById('deactivate-license-btn');
        if (deactivateBtn) {
            deactivateBtn.addEventListener('click', () => {
                const confirmed = confirm(
                    'Deactivate your Creator license on this device?\n\n' +
                    'You can reactivate anytime at 4d.pardesco.com/activate\n\n' +
                    'Your license will remain valid on other devices.'
                );

                if (confirmed) {
                    this.licenseManager.logout();
                    this.setStatus('License deactivated. Reloading...', 'info');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            });
        }
    }

    /**
     * Handle export button click
     * @param {string} exportType - 'mesh', 'linework', 'screenshot', or 'video'
     */
    async handleExport(exportType) {
        const tier = this.licenseManager.getTier();
        const isFree = tier === 'free';

        // Check permissions for Creator/Pro features
        if (exportType === 'mesh' || exportType === 'linework' || exportType === 'video') {
            if (isFree) {
                this.showUpgradeModal(exportType);
                return;
            }
        }

        // Handle video recording toggle
        if (exportType === 'video') {
            if (this.videoRecorder && this.videoRecorder.isRecording) {
                await this.stopVideoRecording();
            } else {
                await this.startVideoRecording();
            }
            return;
        }

        this.setStatus('Preparing export...', 'info');

        try {
            switch (exportType) {
                case 'mesh':
                    await this.exportMesh();
                    break;
                case 'linework':
                    await this.exportLinework();
                    break;
                case 'screenshot':
                    await this.exportScreenshot();
                    break;
            }
        } catch (error) {
            console.error('Export error:', error);
            this.setStatus(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Export mesh (Creator/Professional only)
     */
    async exportMesh() {
        this.setStatus('Generating mesh...', 'info');

        const polytopeData = this.viewer.getCurrentPolytopeData();
        const licenseKey = this.licenseManager.getLicenseKey();

        // Use viewer's exportOBJ method to get actual geometry
        const objContent = this.viewer.exportOBJ('mesh');
        this.downloadFile(objContent, `${polytopeData.name}-mesh.obj`, 'text/plain');

        this.setStatus('✓ Mesh exported successfully!', 'success');
    }

    /**
     * Export linework (Creator/Professional only)
     */
    async exportLinework() {
        this.setStatus('Generating linework...', 'info');

        const polytopeData = this.viewer.getCurrentPolytopeData();
        const licenseKey = this.licenseManager.getLicenseKey();

        // Use viewer's exportOBJ method to get actual geometry
        const objContent = this.viewer.exportOBJ('linework');
        this.downloadFile(objContent, `${polytopeData.name}-linework.obj`, 'text/plain');

        this.setStatus('✓ Linework exported successfully!', 'success');
    }

    /**
     * Export screenshot
     */
    async exportScreenshot() {
        const tier = this.licenseManager.getTier();
        const includeWatermark = tier === 'free';
        const transparentBackground = tier !== 'free'; // Transparent for Creator/Pro

        this.setStatus('Capturing screenshot...', 'info');

        // Use existing Screenshot utility
        const polytopeData = this.viewer.getCurrentPolytopeData();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `${polytopeData.name}-${timestamp}.png`;

        // Free tier: watermarked with background
        // Creator/Pro: no watermark, transparent background
        this.viewer.captureScreenshot(filename, !includeWatermark, transparentBackground);

        const message = transparentBackground
            ? '✓ Screenshot saved with transparent background!'
            : '✓ Screenshot saved!';
        this.setStatus(message, 'success');
    }

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show upgrade modal for free tier users
     * @param {string} feature - Feature name
     */
    showUpgradeModal(feature) {
        // TODO: Implement modal UI
        alert(`🔒 ${feature} export requires Creator tier.\n\nUpgrade at: pardesco.com/products/4d-viewer-creator`);
    }

    /**
     * Set status message
     * @param {string} message - Status message
     * @param {string} type - 'info', 'success', or 'error'
     */
    setStatus(message, type) {
        const statusEl = document.getElementById('export-status');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `export-status ${type}`;

        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'export-status';
            }, 3000);
        }
    }

    /**
     * Start video recording
     */
    async startVideoRecording() {
        try {
            // Check browser support
            if (!VideoRecorder.isSupported()) {
                this.setStatus('Video recording is not supported in this browser', 'error');
                alert('Video recording requires a modern browser (Chrome, Edge, Firefox, or Safari 14.1+)');
                return;
            }

            // Get canvas from viewer
            const canvas = this.viewer.renderer.domElement;

            // Create recorder if needed
            if (!this.videoRecorder) {
                this.videoRecorder = new VideoRecorder(canvas, 30);
            }

            // Ensure solid background during recording (transparent background doesn't work well in video)
            const originalBackground = this.viewer.scene.background;
            this.viewer.scene.background = new THREE.Color(0x0a0a1a); // Solid dark background

            // Store original background to restore later
            this._originalBackground = originalBackground;

            // Start recording (60 second max)
            await this.videoRecorder.start(60000);

            // Update UI
            this.updateRecordingUI(true);
            this.setStatus('🔴 Recording... (max 60 seconds)', 'info');

            // Start timer update
            this.recordingInterval = setInterval(() => {
                this.updateRecordingTimer();
            }, 100); // Update every 100ms for smooth timer

        } catch (error) {
            console.error('[ExportMenu] Failed to start recording:', error);
            this.setStatus(`Failed to start recording: ${error.message}`, 'error');
        }
    }

    /**
     * Stop video recording
     */
    async stopVideoRecording() {
        try {
            if (!this.videoRecorder || !this.videoRecorder.isRecording) {
                return;
            }

            // Update UI to show processing
            this.setStatus('Processing video...', 'info');
            const videoBtn = document.getElementById('video-record-btn');
            if (videoBtn) {
                videoBtn.disabled = true;
            }

            // Generate filename
            const polytopeData = this.viewer.getCurrentPolytopeData();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const filename = `${polytopeData.name}-${timestamp}`;

            // Stop recording and download
            await this.videoRecorder.stop(filename);

            // Restore original background
            if (this._originalBackground !== undefined) {
                this.viewer.scene.background = this._originalBackground;
            }

            // Clear timer interval
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }

            // Update UI
            this.updateRecordingUI(false);
            this.setStatus('✓ Video saved successfully!', 'success');

            // Re-enable button
            if (videoBtn) {
                videoBtn.disabled = false;
            }

        } catch (error) {
            console.error('[ExportMenu] Failed to stop recording:', error);
            this.setStatus(`Failed to save video: ${error.message}`, 'error');

            // Clean up on error
            if (this.recordingInterval) {
                clearInterval(this.recordingInterval);
                this.recordingInterval = null;
            }
            this.updateRecordingUI(false);
        }
    }

    /**
     * Update recording UI state
     * @param {boolean} isRecording - True if recording is active
     */
    updateRecordingUI(isRecording) {
        const videoBtn = document.getElementById('video-record-btn');
        const videoBtnText = document.getElementById('video-btn-text');
        const recordingTimer = document.getElementById('recording-timer');

        if (!videoBtn || !videoBtnText || !recordingTimer) return;

        if (isRecording) {
            videoBtn.classList.add('recording');
            videoBtnText.textContent = 'Stop Recording';
            recordingTimer.style.display = 'flex';
        } else {
            videoBtn.classList.remove('recording');
            videoBtnText.textContent = 'Record Video';
            recordingTimer.style.display = 'none';
        }
    }

    /**
     * Update recording timer display
     */
    updateRecordingTimer() {
        if (!this.videoRecorder || !this.videoRecorder.isRecording) return;

        const duration = this.videoRecorder.getDuration();
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const timerText = document.getElementById('timer-text');
        if (timerText) {
            timerText.textContent = timeString;
        }
    }

    /**
     * Update UI when license tier changes
     */
    refresh() {
        // Stop any active recording
        if (this.videoRecorder && this.videoRecorder.isRecording) {
            this.videoRecorder.cancel();
        }

        // Clear recording interval
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }

        const tier = this.licenseManager.getTier();
        this.exportPanel.innerHTML = this.generateHTML(tier);
        this.attachEventListeners();
    }
}
