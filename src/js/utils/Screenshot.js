/**
 * Screenshot - Capture viewer with watermark
 *
 * Captures current 3D view as PNG
 * Supports high-resolution (4K) capture for Creator/Pro tier
 * Adds "4d.pardesco.com" watermark in bottom right (free tier)
 * Auto-downloads to user's device
 */

import * as THREE from 'three';

// Debug logging flag - set to false to disable logging in production
const DEBUG = true;

// Resolution presets
const RESOLUTIONS = {
  'current': null, // Use canvas size
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 }
};

export class Screenshot {
  constructor(renderer, camera, scene) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.watermarkText = '4d.pardesco.com';
  }

  /**
   * Capture current view and download as PNG
   * @param {string} filename - Optional custom filename (default: polytope-view.png)
   * @param {boolean} removeWatermark - If true, skip watermark (Creator/Pro tier)
   * @param {boolean} transparentBackground - If true, remove background (Creator/Pro tier)
   */
  capture(filename = 'polytope-view.png', removeWatermark = false, transparentBackground = false) {
    // Save original background state
    const originalBackground = this.scene.background;
    const originalClearAlpha = this.renderer.getClearAlpha();

    // Set transparent background for Creator tier
    if (transparentBackground) {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0); // Alpha = 0 (transparent)
    }

    // Render current frame
    this.renderer.render(this.scene, this.camera);

    // Get canvas
    const canvas = this.renderer.domElement;

    // Decide whether to add watermark based on license tier
    let finalCanvas;
    if (removeWatermark) {
      // No watermark for Creator/Professional tier
      finalCanvas = canvas;
    } else {
      // Add watermark for free tier
      finalCanvas = this.addWatermark(canvas);
    }

    // Restore original background state
    if (transparentBackground) {
      this.scene.background = originalBackground;
      this.renderer.setClearColor(0x0d1117, originalClearAlpha); // Restore original
    }

    // Convert to blob and download
    finalCanvas.toBlob((blob) => {
      this.downloadBlob(blob, filename);
    }, 'image/png');

    if (DEBUG) console.log(`[Screenshot] Captured: ${filename} (watermark: ${!removeWatermark}, transparent: ${transparentBackground})`);
  }

  /**
   * Add watermark to canvas
   * @param {HTMLCanvasElement} sourceCanvas - Original canvas
   * @returns {HTMLCanvasElement} - Canvas with watermark
   */
  addWatermark(sourceCanvas) {
    // Create new canvas with same dimensions
    const watermarkCanvas = document.createElement('canvas');
    watermarkCanvas.width = sourceCanvas.width;
    watermarkCanvas.height = sourceCanvas.height;

    const ctx = watermarkCanvas.getContext('2d');

    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);

    // Configure watermark text styling
    const fontSize = Math.max(16, Math.floor(sourceCanvas.height * 0.025)); // Scale with canvas
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent white
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Add subtle shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Position in bottom right with padding
    const padding = Math.max(15, Math.floor(sourceCanvas.width * 0.015));
    const x = watermarkCanvas.width - padding;
    const y = watermarkCanvas.height - padding;

    // Draw watermark
    ctx.fillText(this.watermarkText, x, y);

    return watermarkCanvas;
  }

  /**
   * Download blob as file
   * @param {Blob} blob - Image blob
   * @param {string} filename - Filename
   */
  downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL after download
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 100);
  }

  /**
   * Capture with bloom effect (if enabled)
   *
   * BLOOM BEHAVIOR:
   * - If bloom is enabled AND transparent is false: Capture WITH bloom (black background)
   * - If bloom is enabled AND transparent is true: Disable bloom, capture transparent
   * - If bloom is disabled: Capture normally
   *
   * @param {BloomEffect} bloomEffect - Bloom effect instance
   * @param {string} filename - Optional filename
   * @param {boolean} removeWatermark - If true, skip watermark (Creator/Pro tier)
   * @param {boolean} transparentBackground - If true, remove background (disables bloom)
   */
  captureWithBloom(bloomEffect, filename = 'polytope-view.png', removeWatermark = false, transparentBackground = false) {
    // Save original background state
    const originalBackground = this.scene.background;
    const originalClearAlpha = this.renderer.getClearAlpha();

    // Determine if we should render with bloom
    const bloomWasEnabled = bloomEffect && bloomEffect.enabled;
    const renderWithBloom = bloomWasEnabled && !transparentBackground;

    // If transparent requested but bloom is on, we must disable bloom
    // (bloom doesn't preserve alpha channel)
    if (transparentBackground && bloomWasEnabled) {
      if (DEBUG) console.log('[Screenshot] Disabling bloom for transparent capture');
      bloomEffect.setEnabled(false);
    }

    // Set background based on mode
    if (transparentBackground) {
      // Transparent mode: no background, alpha = 0
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    } else if (renderWithBloom) {
      // Bloom mode: black background (bloom needs opaque background to glow against)
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 1); // Alpha = 1 (opaque black)
      if (DEBUG) console.log('[Screenshot] Using black background for bloom capture');
    }

    // Render the frame
    if (renderWithBloom) {
      // Render through bloom composer (includes post-processing glow)
      bloomEffect.render();
      if (DEBUG) console.log('[Screenshot] Rendered with bloom effect');
    } else {
      // Normal render (no bloom)
      this.renderer.render(this.scene, this.camera);
    }

    // Get canvas
    const canvas = this.renderer.domElement;

    // Decide whether to add watermark based on license tier
    let finalCanvas;
    if (removeWatermark) {
      // No watermark for Creator/Professional tier
      finalCanvas = canvas;
    } else {
      // Add watermark for free tier
      finalCanvas = this.addWatermark(canvas);
    }

    // Restore original background state
    this.scene.background = originalBackground;
    this.renderer.setClearColor(0x0d1117, originalClearAlpha);

    // Restore bloom if we disabled it
    if (transparentBackground && bloomWasEnabled) {
      if (DEBUG) console.log('[Screenshot] Re-enabling bloom');
      bloomEffect.setEnabled(true);
    }

    // Convert to blob and download
    finalCanvas.toBlob((blob) => {
      this.downloadBlob(blob, filename);
    }, 'image/png');

    if (DEBUG) console.log(`[Screenshot] Captured: ${filename} (watermark: ${!removeWatermark}, transparent: ${transparentBackground}, bloom: ${renderWithBloom})`);
  }

  /**
   * Capture at high resolution (4K) by temporarily resizing the renderer
   *
   * This approach is more reliable than render targets as it handles
   * viewport, camera, and all WebGL state correctly.
   *
   * BLOOM BEHAVIOR:
   * - If bloom is enabled AND transparent is false: Capture WITH bloom (black background)
   * - If bloom is enabled AND transparent is true: Disable bloom, capture transparent
   * - If bloom is disabled: Capture normally (transparent or black based on setting)
   *
   * @param {BloomEffect} bloomEffect - Bloom effect instance
   * @param {string} filename - Output filename
   * @param {boolean} transparentBackground - If true, use transparent background (disables bloom)
   * @param {string} resolution - Resolution preset: 'current', '1080p', or '4k'
   */
  captureHighRes(bloomEffect, filename = 'polytope-4k.png', transparentBackground = false, resolution = '4k') {
    const targetRes = RESOLUTIONS[resolution];

    // If 'current' resolution, use existing method
    if (!targetRes) {
      this.captureWithBloom(bloomEffect, filename, true, transparentBackground);
      return;
    }

    const { width, height } = targetRes;

    // Determine if we should render with bloom
    const bloomWasEnabled = bloomEffect && bloomEffect.enabled;
    const renderWithBloom = bloomWasEnabled && !transparentBackground;

    if (DEBUG) {
      console.log(`[Screenshot] Starting ${resolution} capture (${width}×${height})`);
      console.log(`[Screenshot] Bloom: ${bloomWasEnabled ? 'enabled' : 'disabled'}, Transparent: ${transparentBackground}, Will render with bloom: ${renderWithBloom}`);
    }

    // Store ALL original state
    const canvas = this.renderer.domElement;
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const originalStyleWidth = canvas.style.width;
    const originalStyleHeight = canvas.style.height;
    const originalPixelRatio = this.renderer.getPixelRatio();
    const originalAspect = this.camera.aspect;
    const originalBackground = this.scene.background;
    const originalClearAlpha = this.renderer.getClearAlpha();

    // If transparent requested but bloom is on, we must disable bloom
    // (bloom doesn't preserve alpha channel)
    if (transparentBackground && bloomWasEnabled) {
      if (DEBUG) console.log('[Screenshot] Disabling bloom for transparent capture');
      bloomEffect.setEnabled(false);
    }

    try {
      // Set background based on mode
      if (transparentBackground) {
        // Transparent mode: no background, alpha = 0
        this.scene.background = null;
        this.renderer.setClearColor(0x000000, 0);
      } else if (renderWithBloom) {
        // Bloom mode: black background (bloom needs opaque background to glow against)
        this.scene.background = null;
        this.renderer.setClearColor(0x000000, 1); // Alpha = 1 (opaque black)
        if (DEBUG) console.log('[Screenshot] Using black background for bloom capture');
      }

      // Resize renderer to target resolution
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false); // false = don't update CSS style

      // CRITICAL: Update camera aspect ratio for new dimensions
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      // CRITICAL: Update bloom composer size for high-res render
      if (renderWithBloom && bloomEffect.composer) {
        bloomEffect.updateSize(width, height);
        if (DEBUG) console.log(`[Screenshot] Resized bloom composer to ${width}×${height}`);
      }

      if (DEBUG) console.log(`[Screenshot] Camera aspect: ${this.camera.aspect.toFixed(3)}, Canvas: ${canvas.width}×${canvas.height}`);

      // Clear and render at high resolution
      this.renderer.clear();

      if (renderWithBloom) {
        // Render through bloom composer (includes post-processing glow)
        bloomEffect.render();
        if (DEBUG) console.log('[Screenshot] Rendered with bloom effect');
      } else {
        // Normal render (no bloom)
        this.renderer.render(this.scene, this.camera);
      }

      // Capture the canvas directly
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // Convert dataURL to blob for download
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          if (DEBUG) console.log(`[Screenshot] ${resolution} capture complete: ${width}×${height}, ${sizeMB}MB, bloom: ${renderWithBloom}`);
          this.downloadBlob(blob, filename);
        });

    } finally {
      // ALWAYS restore original state
      this.renderer.setPixelRatio(originalPixelRatio);
      this.renderer.setSize(originalWidth, originalHeight, false);

      // Restore CSS style dimensions
      canvas.style.width = originalStyleWidth;
      canvas.style.height = originalStyleHeight;

      // Restore camera
      this.camera.aspect = originalAspect;
      this.camera.updateProjectionMatrix();

      // Restore bloom composer size
      if (bloomEffect && bloomEffect.composer) {
        bloomEffect.updateSize(originalWidth, originalHeight);
      }

      // Restore background
      this.scene.background = originalBackground;
      this.renderer.setClearColor(0x0d1117, originalClearAlpha);

      // Restore bloom state if we disabled it
      if (transparentBackground && bloomWasEnabled) {
        bloomEffect.setEnabled(true);
      }

      // Re-render at original size to restore viewport
      this.renderer.clear();
      if (bloomWasEnabled) {
        bloomEffect.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (DEBUG) console.log(`[Screenshot] Restored to ${originalWidth}×${originalHeight}`);
    }
  }

  /**
   * Generate timestamped filename
   * @param {string} polytopeType - e.g., "tesseract", "120-cell"
   * @returns {string} - Filename with timestamp
   */
  generateFilename(polytopeType = 'polytope') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${polytopeType}-${timestamp}.png`;
  }
}
