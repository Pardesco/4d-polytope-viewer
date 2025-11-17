/**
 * SimpleWatermark - Persistent canvas watermark
 *
 * Always-visible brand watermark in corners
 * Appears in ALL screenshots/recordings (OS-level capture)
 * Non-intrusive, subtle opacity
 */

export class SimpleWatermark {
  constructor() {
    this.create();
    this.setupResponsive();
  }

  /**
   * Create watermark overlay
   */
  create() {
    const overlay = document.createElement('div');
    overlay.className = 'simple-watermark';
    overlay.innerHTML = `
      <div class="watermark-corner top-left">4d.pardesco.com</div>
      <div class="watermark-corner bottom-right">pardesco.com</div>
    `;
    document.body.appendChild(overlay);
    console.log('[SimpleWatermark] Persistent watermark created');
  }

  /**
   * Handle responsive adjustments
   */
  setupResponsive() {
    window.addEventListener('resize', () => {
      this.updatePositions();
    });
  }

  /**
   * Update positions on resize (if needed for dynamic adjustments)
   */
  updatePositions() {
    // Currently CSS handles all positioning
    // This method is here for future enhancements if needed
  }
}
