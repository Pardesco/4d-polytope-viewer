/**
 * Export Menu UI Component
 *
 * Displays export options with license-based feature gating
 * Shows upgrade prompts for free tier users
 */

import * as THREE from 'three';
import { VideoRecorder } from '../export/VideoRecorder.js';
import { SeamlessLoopRecorder } from '../export/SeamlessLoopRecorder.js';
import { ProgressNotification } from './ProgressNotification.js';

export class ExportMenu {
    constructor(container, licenseManager, viewer) {
        this.container = container;
        this.licenseManager = licenseManager;
        this.viewer = viewer;
        this.exportPanel = null;
        this.videoRecorder = null;
        this.seamlessLoopRecorder = null;
        this.recordingInterval = null;
        this.screenshotResolution = '4k'; // Default to 4K for Creator tier
        this.animationDuration = 2; // Default to 2 seconds (48 frames)
        this.FRAMES_PER_CHUNK = 48; // Max frames per JSON file to avoid memory issues

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
            <div class="mb-4">
                <details class="bg-dark-lighter rounded-lg">
                    <summary class="text-sm font-bold text-secondary p-2 cursor-pointer hover:bg-dark-accent rounded-lg transition-colors flex items-center justify-between">
                        <span>Export</span>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${isFree ? '<span class="tier-badge-small free">FREE</span>' : ''}
                            ${tier === 'creator' ? '<span class="tier-badge-small creator">CREATOR</span>' : ''}
                            ${tier === 'professional' ? '<span class="tier-badge-small pro">PRO</span>' : ''}
                            <span class="text-xs text-gray-500">▼</span>
                        </div>
                    </summary>
                    <div class="p-2 pt-0 space-y-2 mt-2">

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

                <!-- Animation JSON Export (for Blender) -->
                ${!isFree ? `
                <div class="animation-length-section">
                    <span class="animation-label">Animation Length</span>
                    <div class="animation-toggle">
                        <button id="anim-2s-btn" class="animation-btn active" data-duration="2">2s</button>
                        <button id="anim-5s-btn" class="animation-btn" data-duration="5">5s</button>
                        <button id="anim-7s-btn" class="animation-btn" data-duration="7">7s</button>
                        <button id="anim-10s-btn" class="animation-btn" data-duration="10">10s</button>
                    </div>
                    <span id="animation-info" class="animation-info">48 frames (1 file)</span>
                </div>
                ` : ''}
                <button
                    class="export-btn ${isFree ? 'locked' : ''}"
                    data-export-type="animation-json"
                    ${isFree ? 'disabled' : ''}
                >
                    ${isFree ? '🔒' : '🎬'} Export Animation JSON
                    ${isFree ? '<span class="upgrade-hint">Creator</span>' : '<span class="watermark-note">(Blender)</span>'}
                </button>
                <div id="animation-export-progress" class="animation-export-progress" style="display: none;">
                    <div class="progress-bar-container">
                        <div id="animation-progress-fill" class="progress-bar-fill"></div>
                    </div>
                    <span id="animation-progress-text" class="progress-text">Generating frames...</span>
                </div>

                <!-- Seamless Loop Video Export -->
                <button
                    class="export-btn ${isFree ? 'locked' : ''}"
                    data-export-type="seamless-loop"
                    ${isFree ? 'disabled' : ''}
                >
                    ${isFree ? '🔒' : '🔄'} Export Video (Seamless Loop)
                    ${isFree ? '<span class="upgrade-hint">Creator</span>' : '<span class="watermark-note">(360° cycle)</span>'}
                </button>
                <div id="seamless-loop-progress" class="animation-export-progress" style="display: none;">
                    <div class="progress-bar-container">
                        <div id="seamless-progress-fill" class="progress-bar-fill"></div>
                    </div>
                    <span id="seamless-progress-text" class="progress-text">Rendering frames...</span>
                </div>

                <!-- Screenshot Export -->
                ${isCreatorOrPro ? `
                <div class="screenshot-resolution-section">
                    <span class="resolution-label">Screenshot Resolution</span>
                    <div class="resolution-toggle">
                        <button id="res-current-btn" class="resolution-btn" data-resolution="current">Current</button>
                        <button id="res-1080p-btn" class="resolution-btn" data-resolution="1080p">1080p</button>
                        <button id="res-4k-btn" class="resolution-btn active" data-resolution="4k">4K</button>
                    </div>
                </div>
                ` : ''}
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

                    </div>
                </details>
            </div>
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
                <!-- TODO: Replace with your actual LemonSqueezy checkout URL -->
                <a href="https://pardesco.lemonsqueezy.com/checkout/buy/9ad7313d-9bc5-42da-b955-a86fc201518c?logo=0" target="_blank" class="upgrade-btn">
                    Upgrade to Creator
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

        // Screenshot resolution toggle buttons
        const resolutionBtns = this.exportPanel.querySelectorAll('.resolution-btn');
        resolutionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resolution = e.currentTarget.dataset.resolution;
                this.handleResolutionChange(resolution);
            });
        });

        // Animation duration toggle buttons
        const animBtns = this.exportPanel.querySelectorAll('.animation-btn');
        animBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const duration = parseInt(e.currentTarget.dataset.duration, 10);
                this.handleAnimationDurationChange(duration);
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
     * Handle screenshot resolution toggle change
     * @param {'current' | '1080p' | '4k'} resolution - Selected resolution
     */
    handleResolutionChange(resolution) {
        // Update button states
        const resolutionBtns = this.exportPanel.querySelectorAll('.resolution-btn');
        resolutionBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.resolution === resolution);
        });

        // Store selected resolution
        this.screenshotResolution = resolution;

        // Show resolution info
        const resolutionLabels = {
            'current': 'Current canvas size',
            '1080p': '1920 × 1080',
            '4k': '3840 × 2160'
        };
        this.setStatus(`Screenshot: ${resolutionLabels[resolution]}`, 'info');
    }

    /**
     * Handle animation duration toggle change
     * @param {number} duration - Selected duration in seconds
     */
    handleAnimationDurationChange(duration) {
        // Update button states
        const animBtns = this.exportPanel.querySelectorAll('.animation-btn');
        animBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.duration, 10) === duration);
        });

        // Store selected duration
        this.animationDuration = duration;

        // Calculate frames and chunks (adaptive based on edge count)
        const fps = 24;
        const totalFrames = duration * fps;
        const framesPerChunk = this.getAdaptiveChunkSize();
        const numChunks = Math.ceil(totalFrames / framesPerChunk);

        // Update info display
        const infoEl = document.getElementById('animation-info');
        if (infoEl) {
            if (numChunks > 1) {
                infoEl.textContent = `${totalFrames} frames (${numChunks} files)`;
            } else {
                infoEl.textContent = `${totalFrames} frames (1 file)`;
            }
        }

        // Show chunk info for multi-file exports
        if (numChunks > 1) {
            this.setStatus(`Will export ${numChunks} JSON files to combine later`, 'info');
        } else {
            this.setStatus('', 'info');
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
        if (exportType === 'mesh' || exportType === 'linework' || exportType === 'video' || exportType === 'animation-json' || exportType === 'seamless-loop') {
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
                case 'animation-json':
                    await this.exportAnimationJSON();
                    break;
                case 'seamless-loop':
                    await this.exportSeamlessLoop();
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
     * Free tier: Current resolution with watermark
     * Creator/Pro: Selected resolution, no watermark
     *
     * BLOOM HANDLING:
     * - If bloom is enabled: Uses black background (bloom requires opaque background to glow)
     * - If bloom is disabled: Uses transparent background
     */
    async exportScreenshot() {
        const tier = this.licenseManager.getTier();
        const isFree = tier === 'free';
        const includeWatermark = isFree;
        const resolution = isFree ? 'current' : this.screenshotResolution;

        // Check if bloom is enabled
        const bloomEnabled = this.viewer.bloomEffect && this.viewer.bloomEffect.enabled;

        // Transparent background only if bloom is OFF (bloom requires black background)
        // When bloom is enabled, we use black background so the glow effect renders properly
        const transparentBackground = !isFree && !bloomEnabled;

        // Status message based on resolution and bloom state
        const resolutionLabels = {
            'current': '',
            '1080p': '1080p ',
            '4k': '4K '
        };
        const resLabel = resolutionLabels[resolution] || '';

        if (isFree) {
            this.setStatus('Capturing screenshot...', 'info');
        } else if (bloomEnabled) {
            this.setStatus(`Capturing ${resLabel}screenshot with bloom...`, 'info');
        } else {
            this.setStatus(`Capturing ${resLabel}screenshot...`, 'info');
        }

        // Generate filename with resolution suffix
        const polytopeData = this.viewer.getCurrentPolytopeData();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const resSuffix = !isFree && resolution !== 'current' ? `-${resolution}` : '';
        const bloomSuffix = bloomEnabled && !isFree ? '-bloom' : '';
        const filename = `${polytopeData.name}${resSuffix}${bloomSuffix}-${timestamp}.png`;

        // Capture screenshot
        // Free tier: watermarked, current resolution
        // Creator/Pro with bloom: no watermark, selected resolution, BLACK background (for bloom glow)
        // Creator/Pro without bloom: no watermark, selected resolution, transparent background
        this.viewer.captureScreenshot(filename, !includeWatermark, transparentBackground, resolution);

        // Success message
        let message;
        if (isFree) {
            message = 'Screenshot saved!';
        } else if (bloomEnabled) {
            message = `${resLabel}screenshot saved with bloom effect!`;
        } else {
            message = `${resLabel}screenshot saved with transparent background!`;
        }
        this.setStatus(message, 'success');
    }

    /**
     * Calculate appropriate chunk size based on edge count.
     * High edge count polytopes need smaller chunks to avoid JSON string size limits.
     * @returns {number} Frames per chunk
     */
    getAdaptiveChunkSize() {
        const edgeCount = this.viewer.edgeIndices?.length || 0;

        // Base chunk size on edge count to stay under ~500MB JSON string limit
        // Each edge has ~51 control points × 4 values (x,y,z,thickness) × ~10 chars per number
        // Rough formula: edgeCount × 51 × 40 × frames < 500MB
        if (edgeCount > 2000) {
            return 6;   // ~6 frames for very complex polytopes (600-cell, etc.)
        } else if (edgeCount > 1000) {
            return 12;  // ~12 frames for complex polytopes
        } else if (edgeCount > 500) {
            return 24;  // ~24 frames for medium polytopes
        } else {
            return 48;  // Default 48 frames for simple polytopes
        }
    }

    /**
     * Export animation JSON for Blender USD conversion
     * Supports chunked export for longer animations (5s, 7s, 10s)
     * Automatically adjusts chunk size based on polytope complexity
     * Creator/Pro tier only
     */
    async exportAnimationJSON() {
        const polytopeData = this.viewer.getCurrentPolytopeData();

        // Calculate frames based on selected duration
        const fps = 24;
        const totalFrames = this.animationDuration * fps;

        // Get adaptive chunk size based on edge count
        const framesPerChunk = this.getAdaptiveChunkSize();
        const numChunks = Math.ceil(totalFrames / framesPerChunk);

        const edgeCount = this.viewer.edgeIndices?.length || 0;
        console.log(`[ExportMenu] Animation export: ${totalFrames} frames, ${numChunks} chunk(s), ${framesPerChunk} frames/chunk (${edgeCount} edges)`);

        // Create HUD progress notification
        const notification = new ProgressNotification({
            type: 'json',
            totalFrames: totalFrames,
            showCancel: true,
            onCancel: () => { this.animationExportCancelled = true; }
        });

        notification.show();
        this.animationExportCancelled = false;

        // Also show inline progress UI (for visibility in export panel)
        const progressDiv = document.getElementById('animation-export-progress');
        const progressFill = document.getElementById('animation-progress-fill');
        const progressText = document.getElementById('animation-progress-text');

        if (progressDiv) {
            progressDiv.style.display = 'block';
            progressFill.style.width = '0%';
        }

        // Disable export buttons during export
        const exportBtns = this.exportPanel.querySelectorAll('.export-btn');
        exportBtns.forEach(btn => btn.disabled = true);

        let totalFileSizeMB = 0;
        const exportedFiles = [];

        try {
            // Export each chunk
            for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
                // Check for cancellation
                if (this.animationExportCancelled) {
                    throw new Error('Export cancelled');
                }

                // Calculate frame range for this chunk
                const startFrame = chunkIdx * framesPerChunk;
                const endFrame = Math.min((chunkIdx + 1) * framesPerChunk, totalFrames);
                const chunkFrameCount = endFrame - startFrame;

                const chunkLabel = numChunks > 1 ? ` (Chunk ${chunkIdx + 1}/${numChunks})` : '';
                this.setStatus(`Generating animation data${chunkLabel}...`, 'info');

                // Progress callback for this chunk
                const progressCallback = (chunkProgress, status) => {
                    // Check for cancellation
                    if (this.animationExportCancelled) {
                        throw new Error('Export cancelled');
                    }

                    // Calculate overall progress
                    const overallProgress = (chunkIdx + chunkProgress) / numChunks;
                    const overallFrame = startFrame + Math.floor(chunkProgress * chunkFrameCount);

                    // Update HUD notification
                    const statusText = numChunks > 1
                        ? `CHUNK ${chunkIdx + 1}/${numChunks}`
                        : 'RENDERING ANIMATION DATA';
                    notification.update(overallProgress, statusText, overallFrame, totalFrames);

                    // Update inline progress
                    if (progressFill) {
                        progressFill.style.width = `${overallProgress * 100}%`;
                    }
                    if (progressText) {
                        progressText.textContent = numChunks > 1
                            ? `Chunk ${chunkIdx + 1}/${numChunks}: ${status}`
                            : status;
                    }
                };

                // Generate animation data for this chunk
                const animationData = await this.viewer.exportAnimationJSONChunk(
                    startFrame,
                    endFrame,
                    totalFrames,
                    fps,
                    progressCallback
                );

                // Add chunk metadata
                animationData.chunk_info = {
                    chunk_index: chunkIdx,
                    total_chunks: numChunks,
                    start_frame: startFrame,
                    end_frame: endFrame,
                    total_animation_frames: totalFrames,
                    duration_seconds: this.animationDuration
                };

                // Convert to JSON string
                notification.update((chunkIdx + 0.95) / numChunks, 'PREPARING DOWNLOAD', endFrame, totalFrames);
                const jsonString = JSON.stringify(animationData, null, 2);

                // Calculate file size
                const fileSizeMB = (new Blob([jsonString]).size / (1024 * 1024)).toFixed(2);
                totalFileSizeMB += parseFloat(fileSizeMB);

                // Generate filename with chunk suffix for multi-chunk exports
                let filename;
                if (numChunks > 1) {
                    // Format: polytope-animation-240f-chunk1of5-f000-f047.json
                    const startStr = String(startFrame).padStart(3, '0');
                    const endStr = String(endFrame - 1).padStart(3, '0');
                    filename = `${polytopeData.name}-animation-${totalFrames}f-chunk${chunkIdx + 1}of${numChunks}-f${startStr}-f${endStr}.json`;
                } else {
                    filename = `${polytopeData.name}-animation-${totalFrames}f.json`;
                }

                // Download file
                this.downloadFile(jsonString, filename, 'application/json');
                exportedFiles.push(filename);

                console.log(`[ExportMenu] Exported chunk ${chunkIdx + 1}/${numChunks}: ${filename} (${fileSizeMB} MB)`);

                // Small delay between chunks to let browser handle downloads
                if (chunkIdx < numChunks - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Show completion in HUD notification
            const completionMsg = numChunks > 1
                ? `Exported ${numChunks} files (${totalFileSizeMB.toFixed(2)} MB total)`
                : `Exported ${totalFrames} frames (${totalFileSizeMB.toFixed(2)} MB)`;
            notification.complete(completionMsg);

            // Update inline progress to complete
            if (progressText) {
                progressText.textContent = 'Export complete!';
            }

            // Show instructions for multi-chunk exports
            if (numChunks > 1) {
                this.setStatus(`${numChunks} JSON files exported! Run combine_chunks_to_usd.py to merge.`, 'success');

                // Show helpful instructions after a delay
                setTimeout(() => {
                    alert(
                        `Chunked Export Complete!\n\n` +
                        `Exported ${numChunks} JSON files (${totalFileSizeMB.toFixed(2)} MB total)\n\n` +
                        `To create the USD file:\n` +
                        `1. Place all ${numChunks} JSON files in the same folder\n` +
                        `2. Run: python combine_chunks_to_usd.py <folder>\n\n` +
                        `The script will merge chunks and generate the USD file with thickness data.`
                    );
                }, 500);
            } else {
                this.setStatus(`Animation exported! (${totalFileSizeMB.toFixed(2)} MB, ${totalFrames} frames)`, 'success');
            }

            console.log(`[ExportMenu] Animation export complete: ${exportedFiles.length} file(s), ${totalFileSizeMB.toFixed(2)} MB total`);

        } catch (error) {
            if (error.message === 'Export cancelled') {
                this.setStatus('Export cancelled', 'info');
                notification.hide();
            } else {
                console.error('[ExportMenu] Animation export failed:', error);
                notification.error(`Export failed: ${error.message}`);
                this.setStatus(`Export failed: ${error.message}`, 'error');
            }
        } finally {
            // Hide inline progress and re-enable buttons
            if (progressDiv) {
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                }, 2000);
            }
            exportBtns.forEach(btn => btn.disabled = false);
        }
    }

    /**
     * Export seamless loop video (one complete 360° rotation cycle)
     * Creator/Pro tier only
     */
    async exportSeamlessLoop() {
        // Check browser support
        if (!SeamlessLoopRecorder.isSupported()) {
            this.setStatus('Video export is not supported in this browser', 'error');
            alert('Video export requires a modern browser (Chrome, Edge, Firefox)');
            return;
        }

        const polytopeData = this.viewer.getCurrentPolytopeData();

        // Create recorder if needed (24fps default - cinema standard)
        if (!this.seamlessLoopRecorder) {
            this.seamlessLoopRecorder = new SeamlessLoopRecorder(this.viewer, {
                fps: 24,
                quality: 0.95
            });
        }

        // Get export info with timing estimates
        const info = this.seamlessLoopRecorder.getExportInfo();

        // Build info message with complexity warning
        let message = `Export Seamless Loop Video\n\n` +
            `Frames: ${info.frameCount}\n` +
            `Video Duration: ${info.duration}s @ ${info.fps}fps\n` +
            `Resolution: ${info.width} × ${info.height}\n` +
            `Rotation: 360° in ${info.activePlanes.join(' + ')} plane(s)\n` +
            `Edges: ${info.edgeCount}\n`;

        // Add complexity warning for large polytopes
        if (info.edgeCount > 500) {
            message += `\n\u26A0\uFE0F Complex polytope (${info.edgeCount} edges)\n`;
            message += `Estimated export time: ~${info.estimatedExportTime}s\n`;
            message += `Expected output: ~${info.achievableFps}fps\n`;
        }

        message += `\nContinue with export?`;

        const proceed = confirm(message);

        if (!proceed) {
            this.setStatus('Export cancelled', 'info');
            return;
        }

        // Create HUD progress notification
        const notification = new ProgressNotification({
            type: 'video',
            totalFrames: info.frameCount,
            showCancel: true,
            onCancel: () => { this.seamlessLoopRecorder.cancel(); }
        });

        notification.show();

        // Also show inline progress UI (for visibility in export panel)
        const progressDiv = document.getElementById('seamless-loop-progress');
        const progressFill = document.getElementById('seamless-progress-fill');
        const progressText = document.getElementById('seamless-progress-text');

        if (progressDiv) {
            progressDiv.style.display = 'block';
            progressFill.style.width = '0%';
        }

        // Disable export buttons during export
        const exportBtns = this.exportPanel.querySelectorAll('.export-btn');
        exportBtns.forEach(btn => btn.disabled = true);

        try {
            this.setStatus('Rendering seamless loop...', 'info');

            // Progress callback
            const progressCallback = (progress, status) => {
                // Extract frame number from status (e.g., "Frame 120/360 (~24fps)")
                let currentFrame = null;
                const frameMatch = status.match(/Frame\s*(\d+)\s*\/\s*(\d+)/i);
                if (frameMatch) {
                    currentFrame = parseInt(frameMatch[1], 10);
                }

                // Determine status text
                let statusText = 'RECORDING SEAMLESS LOOP';
                if (status.toLowerCase().includes('finaliz')) {
                    statusText = 'ENCODING VIDEO';
                }

                // Update HUD notification with frame info
                notification.update(progress, statusText, currentFrame, info.frameCount);

                // Update inline progress
                if (progressFill) {
                    progressFill.style.width = `${progress * 100}%`;
                }
                if (progressText) {
                    progressText.textContent = status;
                }
            };

            // Generate filename
            const filename = polytopeData.name || 'polytope';

            // Export and download
            await this.seamlessLoopRecorder.exportAndDownload(filename, progressCallback);

            // Show completion in HUD notification
            notification.complete('VIDEO EXPORT COMPLETE');

            // Update inline progress to complete
            if (progressText) {
                progressText.textContent = 'Export complete!';
            }

            this.setStatus(`Seamless loop video exported! (${info.frameCount} frames, ${info.duration}s)`, 'success');
            console.log(`[ExportMenu] Seamless loop video exported: ${filename}-loop.webm`);

        } catch (error) {
            if (error.message === 'Export cancelled') {
                notification.hide();
                this.setStatus('Export cancelled', 'info');
            } else {
                console.error('[ExportMenu] Seamless loop export failed:', error);
                notification.error(`Export failed: ${error.message}`);
                this.setStatus(`Export failed: ${error.message}`, 'error');
            }
        } finally {
            // Hide inline progress and re-enable buttons
            if (progressDiv) {
                setTimeout(() => {
                    progressDiv.style.display = 'none';
                }, 2000);
            }
            exportBtns.forEach(btn => btn.disabled = false);
        }
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
        // TODO: Replace URL with your actual LemonSqueezy checkout URL
        alert(`${feature} export requires Creator tier.\n\nUpgrade at: https://pardesco.lemonsqueezy.com/checkout/buy/9ad7313d-9bc5-42da-b955-a86fc201518c?logo=0`);
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
