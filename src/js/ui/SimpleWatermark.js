/**
 * SimpleWatermark - Terminal-style persistent watermark
 *
 * Prominent brand watermark with flashing cursor
 * Appears in ALL screenshots/recordings (OS-level capture)
 * Terminal/HUD aesthetic matching the UI theme
 */

export class SimpleWatermark {
  constructor() {
    this.create();
    this.setupResponsive();
  }

  /**
   * Create terminal-style watermark overlay
   */
  create() {
    const overlay = document.createElement('div');
    overlay.className = 'simple-watermark';
    overlay.innerHTML = `
      <div class="watermark watermark-top-center">
        <span class="watermark-text">4D.PARDESCO.COM</span>
        <span class="watermark-cursor">█</span>
      </div>
    `;
    document.body.appendChild(overlay);
    console.log('[SimpleWatermark] Terminal-style watermark created');
  }

  /**
   * Handle responsive adjustments
   */
  setupResponsive() {
    this._boundUpdatePositions = () => this.updatePositions();
    window.addEventListener('resize', this._boundUpdatePositions);
  }

  dispose() {
    if (this._boundUpdatePositions) {
      window.removeEventListener('resize', this._boundUpdatePositions);
    }
  }

  /**
   * Update positions on resize (if needed for dynamic adjustments)
   */
  updatePositions() {
    // Currently CSS handles all positioning
    // This method is here for future enhancements if needed
  }
}
