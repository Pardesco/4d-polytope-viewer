/**
 * VideoRecorder - Client-side video recording using MediaStream API
 *
 * Captures WebGL canvas at 30 FPS and encodes to WebM format
 * Zero-cost solution using native browser APIs
 */

import { licenseManager } from '../license/LicenseManager.js'; // Security: For feature gating

export class VideoRecorder {
    constructor(canvas, fps = 30) {
        this.canvas = canvas;
        this.fps = fps;
        this.chunks = [];
        this.recorder = null;
        this.stream = null;
        this.isRecording = false;
        this.startTime = 0;
        this.maxDuration = 60000; // 60 seconds default
    }

    /**
     * Check if MediaRecorder API is supported
     * @returns {boolean} True if recording is supported
     */
    static isSupported() {
        return !!(window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function');
    }

    /**
     * Get best supported MIME type
     * @returns {string|null} MIME type or null if unsupported
     */
    static getBestMimeType() {
        // Try VP9 first (best quality for web)
        const mimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4' // Safari fallback
        ];

        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }

        return null;
    }

    /**
     * Get file extension for MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} File extension
     */
    static getFileExtension(mimeType) {
        if (mimeType.includes('webm')) {
            return 'webm';
        } else if (mimeType.includes('mp4')) {
            return 'mp4';
        }
        return 'webm'; // Default
    }

    /**
     * Start recording
     * @param {number} maxDuration - Maximum recording duration in milliseconds
     * @returns {Promise<boolean>} True if recording started successfully
     */
    async start(maxDuration = 60000) {
        // SECURITY: License check - Video recording requires Creator tier or higher
        const tier = licenseManager.getTier();
        if (tier === 'free') {
            console.warn('[VideoRecorder] Video recording blocked - requires Creator tier');
            throw new Error('Video recording requires Creator tier. Upgrade at pardesco.com/products/4d-viewer-creator');
        }

        if (this.isRecording) {
            console.warn('[VideoRecorder] Already recording');
            return false;
        }

        // Check browser support
        if (!VideoRecorder.isSupported()) {
            throw new Error('MediaRecorder API is not supported in this browser');
        }

        try {
            // Get best supported MIME type
            const mimeType = VideoRecorder.getBestMimeType();
            if (!mimeType) {
                throw new Error('No supported video format found');
            }

            console.log(`[VideoRecorder] Using MIME type: ${mimeType}`);

            // Capture canvas stream at specified FPS
            this.stream = this.canvas.captureStream(this.fps);

            // Create MediaRecorder with high quality settings
            this.recorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                videoBitsPerSecond: 5000000 // 5 Mbps for high quality
            });

            // Reset chunks
            this.chunks = [];
            this.maxDuration = maxDuration;

            // Handle data available event
            this.recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };

            // Handle errors
            this.recorder.onerror = (e) => {
                console.error('[VideoRecorder] Recording error:', e);
                this.isRecording = false;
            };

            // Start recording
            this.recorder.start();
            this.isRecording = true;
            this.startTime = Date.now();

            console.log(`[VideoRecorder] Recording started (${mimeType}, ${this.fps} FPS, max ${maxDuration}ms)`);

            // Auto-stop after max duration
            setTimeout(() => {
                if (this.isRecording) {
                    console.log('[VideoRecorder] Auto-stopping at max duration');
                    this.stop();
                }
            }, maxDuration);

            return true;
        } catch (error) {
            console.error('[VideoRecorder] Failed to start recording:', error);
            this.isRecording = false;
            throw error;
        }
    }

    /**
     * Stop recording and download video
     * @param {string} filename - Optional filename (without extension)
     * @returns {Promise<void>}
     */
    async stop(filename = null) {
        if (!this.isRecording || !this.recorder) {
            console.warn('[VideoRecorder] Not recording');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                this.recorder.onstop = () => {
                    try {
                        // Calculate recording duration
                        const duration = (Date.now() - this.startTime) / 1000;
                        console.log(`[VideoRecorder] Recording stopped (${duration.toFixed(1)}s)`);

                        // Create blob from chunks
                        const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
                        const url = URL.createObjectURL(blob);

                        // Get file extension
                        const ext = VideoRecorder.getFileExtension(this.recorder.mimeType);

                        // Generate filename if not provided
                        if (!filename) {
                            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
                            filename = `polytope-rotation-${timestamp}`;
                        }

                        // Trigger download
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${filename}.${ext}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        // Clean up
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        this.chunks = [];
                        this.isRecording = false;

                        console.log(`[VideoRecorder] Video saved: ${filename}.${ext} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
                        resolve();
                    } catch (error) {
                        console.error('[VideoRecorder] Error processing video:', error);
                        reject(error);
                    }
                };

                // Stop the recorder
                this.recorder.stop();

                // Stop all tracks in the stream
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }
            } catch (error) {
                console.error('[VideoRecorder] Error stopping recorder:', error);
                reject(error);
            }
        });
    }

    /**
     * Cancel recording without saving
     */
    cancel() {
        if (!this.isRecording || !this.recorder) {
            return;
        }

        console.log('[VideoRecorder] Recording cancelled');

        // Stop recorder
        if (this.recorder.state !== 'inactive') {
            this.recorder.stop();
        }

        // Stop stream tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        // Clean up
        this.chunks = [];
        this.isRecording = false;
    }

    /**
     * Get current recording duration in seconds
     * @returns {number} Duration in seconds
     */
    getDuration() {
        if (!this.isRecording) {
            return 0;
        }
        return (Date.now() - this.startTime) / 1000;
    }

    /**
     * Get recording time remaining in seconds
     * @returns {number} Time remaining in seconds
     */
    getTimeRemaining() {
        if (!this.isRecording) {
            return 0;
        }
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.maxDuration - elapsed);
        return remaining / 1000;
    }
}
