/**
 * Screenshot - Capture viewer with watermark
 *
 * Captures current 3D view as PNG
 * Adds "4d.pardesco.com" watermark in bottom right
 * Auto-downloads to user's device
 */

// Debug logging flag - set to false to disable logging in production
const DEBUG = true;

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
   * @param {BloomEffect} bloomEffect - Bloom effect instance
   * @param {string} filename - Optional filename
   * @param {boolean} removeWatermark - If true, skip watermark (Creator/Pro tier)
   * @param {boolean} transparentBackground - If true, remove background (Creator/Pro tier)
   */
  captureWithBloom(bloomEffect, filename = 'polytope-view.png', removeWatermark = false, transparentBackground = false) {
    // Save original background state
    const originalBackground = this.scene.background;
    const originalClearAlpha = this.renderer.getClearAlpha();

    // Save bloom state and temporarily disable if we need transparency
    // Bloom composer doesn't preserve alpha channel, so we render without it
    const bloomWasEnabled = bloomEffect && bloomEffect.enabled;
    if (transparentBackground && bloomWasEnabled) {
      if (DEBUG) console.log('[Screenshot] Temporarily disabling bloom for transparent background');
      bloomEffect.setEnabled(false);
    }

    // Set transparent background for Creator tier
    if (transparentBackground) {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0); // Alpha = 0 (transparent)
    }

    // Render directly (bloom disabled for transparent screenshots)
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
      this.renderer.setClearColor(0x0d1117, originalClearAlpha);

      // Restore bloom if it was enabled
      if (bloomWasEnabled) {
        if (DEBUG) console.log('[Screenshot] Re-enabling bloom');
        bloomEffect.setEnabled(true);
      }
    }

    // Convert to blob and download
    finalCanvas.toBlob((blob) => {
      this.downloadBlob(blob, filename);
    }, 'image/png');

    if (DEBUG) console.log(`[Screenshot] Captured: ${filename} (watermark: ${!removeWatermark}, transparent: ${transparentBackground}, bloom: ${!transparentBackground && bloomWasEnabled})`);
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
