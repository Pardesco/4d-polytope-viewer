/**
 * SeamlessLoopRecorder - Frame-by-frame video export for perfect seamless loops
 *
 * Key features:
 * - Matches real-time rotation speed exactly
 * - Disables user controls during export
 * - Adaptive frame timing for GPU performance
 * - 24fps default (cinema standard)
 */

import { licenseManager } from '../license/LicenseManager.js'; // Security: For feature gating

export class SeamlessLoopRecorder {
    constructor(viewer, options = {}) {
        this.viewer = viewer;
        this.fps = options.fps || 24;
        this.quality = options.quality || 0.95;
        this.isRecording = false;
        this.cancelled = false;
        this.originalState = null;
    }

    static isSupported() {
        return !!(window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function');
    }

    static getBestMimeType() {
        const mimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }
        return null;
    }

    static getFileExtension(mimeType) {
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mp4')) return 'mp4';
        return 'webm';
    }

    /**
     * Calculate frame count to MATCH real-time rotation speed
     *
     * Real-time: rotationSpeed degrees per frame at ~60fps
     * Video: need same visual speed at videoFps
     *
     * Formula: frameCount = (360 × videoFps) / (rotationSpeed × 60)
     */
    calculateFrameCount() {
        const rotationSpeed = this.viewer.rotation4D?.rotationSpeed || 1.0;
        const realTimeFps = 60; // Assumed real-time frame rate

        // Calculate frames needed to match real-time rotation speed
        const frameCount = Math.ceil((360 * this.fps) / (rotationSpeed * realTimeFps));

        return frameCount;
    }

    /**
     * Get the real-time loop duration (how long one 360° rotation takes in the viewer)
     */
    getRealTimeLoopDuration() {
        const rotationSpeed = this.viewer.rotation4D?.rotationSpeed || 1.0;
        const realTimeFps = 60;
        // At 60fps with rotationSpeed degrees per frame:
        // degreesPerSecond = rotationSpeed * 60
        // secondsFor360 = 360 / degreesPerSecond
        return 360 / (rotationSpeed * realTimeFps);
    }

    getExportInfo() {
        const frameCount = this.calculateFrameCount();
        const duration = this.getRealTimeLoopDuration(); // Video duration matches real-time
        const canvas = this.viewer.renderer?.domElement;
        const edgeCount = this.viewer.edgeIndices?.length || 0;

        return {
            frameCount,
            duration: duration.toFixed(2),
            fps: this.fps,
            width: canvas?.width || 1920,
            height: canvas?.height || 1080,
            rotationSpeed: this.viewer.rotation4D?.rotationSpeed || 1.0,
            activePlanes: this.viewer.getActiveRotationPlanes(),
            edgeCount,
            // Rough export time estimate
            estimatedExportTime: Math.ceil(frameCount * 0.05) // ~50ms per frame average
        };
    }

    /**
     * Save viewer state and DISABLE ALL user controls
     */
    saveState() {
        const canvas = this.viewer.renderer?.domElement;

        this.originalState = {
            rotating4D: this.viewer.rotating4D,
            rotating3D: this.viewer.rotating3D,
            rotationEnabled: this.viewer.rotationEnabled,
            currentAngle: this.viewer.rotation4D?.currentAngle || 0,
            groupRotationY: this.viewer.group?.rotation.y || 0,
            groupRotationX: this.viewer.group?.rotation.x || 0,
            isRendering: this.viewer.isRendering,
            // Control states
            orbitControlsEnabled: this.viewer.controls?.enabled,
            manualControllerEnabled: this.viewer.manualRotationController?.enabled,
            // Canvas state
            canvasPointerEvents: canvas?.style.pointerEvents
        };

        // DISABLE ALL user controls during export

        // 1. Disable OrbitControls if exists
        if (this.viewer.controls) {
            this.viewer.controls.enabled = false;
        }

        // 2. Disable ManualRotationController (includes mouse + keyboard)
        if (this.viewer.manualRotationController) {
            this.viewer.manualRotationController.disable();
        }

        // 3. Disable pointer events on canvas (belt-and-suspenders)
        if (canvas) {
            canvas.style.pointerEvents = 'none';
        }

        // 4. Disable any active 3D rotation
        this.viewer.rotating3D = false;

        console.log('[SeamlessLoopRecorder] Controls disabled for export');
    }

    /**
     * Restore viewer state and RE-ENABLE user controls
     */
    restoreState() {
        if (!this.originalState) return;

        const canvas = this.viewer.renderer?.domElement;

        // Restore rotation state
        this.viewer.rotating4D = this.originalState.rotating4D;
        this.viewer.rotating3D = this.originalState.rotating3D;
        this.viewer.rotationEnabled = this.originalState.rotationEnabled;

        if (this.viewer.rotation4D) {
            this.viewer.rotation4D.currentAngle = this.originalState.currentAngle;
        }

        if (this.viewer.group) {
            this.viewer.group.rotation.y = this.originalState.groupRotationY;
            this.viewer.group.rotation.x = this.originalState.groupRotationX;
        }

        // RE-ENABLE user controls

        // 1. Restore OrbitControls
        if (this.viewer.controls && this.originalState.orbitControlsEnabled !== undefined) {
            this.viewer.controls.enabled = this.originalState.orbitControlsEnabled;
        }

        // 2. Restore ManualRotationController
        if (this.viewer.manualRotationController && this.originalState.manualControllerEnabled) {
            this.viewer.manualRotationController.enable();
        }

        // 3. Restore canvas pointer events
        if (canvas && this.originalState.canvasPointerEvents !== undefined) {
            canvas.style.pointerEvents = this.originalState.canvasPointerEvents || '';
        }

        // Restart animation loop if it was running
        if (this.originalState.isRendering && !this.viewer.isRendering) {
            this.viewer.startRendering();
        }

        // Force update to restore visual state
        this.viewer.rotating4D = true;
        this.viewer.rotationEnabled = true;
        this.viewer.updateProjection();
        this.viewer.rotating4D = this.originalState.rotating4D;

        console.log('[SeamlessLoopRecorder] Controls restored after export');

        this.originalState = null;
    }

    /**
     * Wait for GPU to complete rendering
     */
    waitForGPU() {
        return new Promise(resolve => {
            const gl = this.viewer.renderer.getContext();
            gl.finish();
            requestAnimationFrame(() => resolve());
        });
    }

    /**
     * Render a single frame at exact angle
     */
    renderFrameAtAngle(angleDegrees) {
        this.viewer.rotation4D.currentAngle = angleDegrees;
        this.viewer.rotating4D = true;
        this.viewer.rotationEnabled = true;
        this.viewer.updateProjection();

        if (this.viewer.bloomEffect && this.viewer.bloomEffect.enabled) {
            this.viewer.bloomEffect.render();
        } else {
            this.viewer.renderer.render(this.viewer.scene, this.viewer.camera);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Export seamless loop video
     * - Matches real-time rotation speed
     * - Disables controls during export
     * - Adaptive timing for performance
     */
    async exportLoop(onProgress = null) {
        // SECURITY: License check - Video export requires Creator tier or higher
        const tier = licenseManager.getTier();
        if (tier === 'free') {
            console.warn('[SeamlessLoopRecorder] Video export blocked - requires Creator tier');
            throw new Error('Video export requires Creator tier. Upgrade at pardesco.com/products/4d-viewer-creator');
        }

        if (!SeamlessLoopRecorder.isSupported()) {
            throw new Error('Video recording is not supported in this browser');
        }

        if (this.isRecording) {
            throw new Error('Already recording');
        }

        const mimeType = SeamlessLoopRecorder.getBestMimeType();
        if (!mimeType) {
            throw new Error('No supported video format found');
        }

        this.isRecording = true;
        this.cancelled = false;

        // Save state and disable controls
        this.saveState();

        // Stop animation loop - we control rendering
        this.viewer.stopRendering();

        const frameCount = this.calculateFrameCount();
        const canvas = this.viewer.renderer.domElement;
        const angleStep = 360.0 / frameCount;
        const targetFrameMs = 1000 / this.fps;
        const realTimeDuration = this.getRealTimeLoopDuration();

        console.log(`[SeamlessLoopRecorder] Export config:`);
        console.log(`  Frames: ${frameCount} @ ${this.fps}fps`);
        console.log(`  Video duration: ${realTimeDuration.toFixed(2)}s (matches real-time)`);
        console.log(`  Angle per frame: ${angleStep.toFixed(4)}°`);

        // Manual frame capture mode
        const stream = canvas.captureStream(0);
        const videoTrack = stream.getVideoTracks()[0];

        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 8000000
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.start();
        await this.delay(50);

        // Performance tracking
        let totalRenderTime = 0;

        try {
            for (let i = 0; i < frameCount; i++) {
                if (this.cancelled) {
                    throw new Error('Export cancelled');
                }

                const frameStart = performance.now();

                // EXACT angle (absolute, no cumulative drift)
                const angle = i * angleStep;

                // Render frame
                this.renderFrameAtAngle(angle);

                // Wait for GPU
                await this.waitForGPU();

                // Capture frame
                if (videoTrack.requestFrame) {
                    videoTrack.requestFrame();
                }

                const renderTime = performance.now() - frameStart;
                totalRenderTime += renderTime;

                // Adaptive timing: only wait if faster than target
                const remainingTime = targetFrameMs - renderTime;
                if (remainingTime > 2) {
                    await this.delay(remainingTime);
                }

                // Progress update
                if (onProgress) {
                    const progress = (i + 1) / frameCount;
                    const avgMs = totalRenderTime / (i + 1);
                    const actualFps = Math.round(1000 / Math.max(avgMs, targetFrameMs));
                    onProgress(progress, `Frame ${i + 1}/${frameCount} (~${actualFps}fps)`);
                }
            }

            // Final stats
            const avgFrameTime = totalRenderTime / frameCount;
            console.log(`[SeamlessLoopRecorder] Complete:`);
            console.log(`  Avg render time: ${avgFrameTime.toFixed(1)}ms`);
            console.log(`  Output: ${frameCount} frames, ${realTimeDuration.toFixed(2)}s`);

            if (onProgress) {
                onProgress(1.0, 'Finalizing video...');
            }

            // Finalize recording
            const videoBlob = await new Promise((resolve, reject) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    console.log(`  File size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                    resolve(blob);
                };
                recorder.onerror = () => reject(new Error('Recording failed'));
                setTimeout(() => recorder.stop(), 50);
            });

            return videoBlob;

        } finally {
            // ALWAYS restore state and re-enable controls
            this.restoreState();
            this.isRecording = false;
            stream.getTracks().forEach(track => track.stop());
        }
    }

    async exportAndDownload(filename, onProgress = null) {
        const blob = await this.exportLoop(onProgress);
        const ext = SeamlessLoopRecorder.getFileExtension(SeamlessLoopRecorder.getBestMimeType());

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-loop.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    cancel() {
        if (this.isRecording) {
            this.cancelled = true;
        }
    }
}
