/**
 * ProgressNotification - HUD-style progress notification for exports
 *
 * Matches the cyberpunk terminal aesthetic of the existing UI
 * Centered on screen with scanline overlay effect
 */

export class ProgressNotification {
  constructor(options = {}) {
    this.title = options.title || 'EXPORTING';
    this.type = options.type || 'default'; // 'json', 'video', 'default'
    this.totalFrames = options.totalFrames || null;
    this.showPercent = options.showPercent !== false;
    this.showCancel = options.showCancel || false;
    this.onCancel = options.onCancel || null;

    this.overlay = null;
    this.element = null;
    this.progressBar = null;
    this.progressText = null;
    this.statusText = null;
    this.frameCounter = null;
    this.cancelled = false;
  }

  /**
   * Show the notification
   */
  show() {
    // Create overlay (for centering and dim background)
    this.overlay = document.createElement('div');
    this.overlay.className = 'export-progress-overlay';

    // Create notification element
    this.element = document.createElement('div');
    this.element.className = 'hud-notification export-progress';

    // Determine title based on export type
    let displayTitle = this.title;
    if (this.type === 'video') {
      displayTitle = 'EXPORTING VIDEO';
    } else if (this.type === 'json') {
      displayTitle = 'EXPORTING JSON';
    }

    // Build HTML structure
    this.element.innerHTML = `
      <div class="notification-header">
        <span class="notification-title">${displayTitle}</span>
        <button class="close-btn" title="Cancel">\u2715</button>
      </div>
      <div class="notification-content">
        <div class="progress-status">INITIALIZING...</div>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <span class="progress-text">0%</span>
        </div>
        <div class="frame-counter">${this.totalFrames ? `FRAME 0 OF ${this.totalFrames}` : ''}</div>
        ${this.showCancel ? '<button class="notification-cancel-btn">CANCEL EXPORT</button>' : ''}
      </div>
    `;

    // Get references
    this.progressBar = this.element.querySelector('.progress-fill');
    this.progressText = this.element.querySelector('.progress-text');
    this.statusText = this.element.querySelector('.progress-status');
    this.frameCounter = this.element.querySelector('.frame-counter');

    // Close button handler (X in header)
    const closeBtn = this.element.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.cancelled = true;
        if (this.onCancel) this.onCancel();
        this.hide();
      });
    }

    // Cancel button handler (bottom button)
    const cancelBtn = this.element.querySelector('.notification-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelled = true;
        if (this.onCancel) this.onCancel();
        this.hide();
      });
    }

    // Add to DOM
    this.overlay.appendChild(this.element);
    document.body.appendChild(this.overlay);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });

    console.log(`[ProgressNotification] Shown: ${displayTitle}`);
  }

  /**
   * Update progress
   * @param {number} progress - Progress value from 0.0 to 1.0
   * @param {string} status - Optional status message
   * @param {number} currentFrame - Optional current frame number
   * @param {number} totalFrames - Optional total frame count
   */
  update(progress, status = null, currentFrame = null, totalFrames = null) {
    const percent = Math.round(progress * 100);

    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }

    if (this.progressText && this.showPercent) {
      this.progressText.textContent = `${percent}%`;
    }

    if (this.statusText && status) {
      this.statusText.textContent = status.toUpperCase();
    }

    if (this.frameCounter && currentFrame !== null && totalFrames !== null) {
      this.frameCounter.textContent = `FRAME ${currentFrame} OF ${totalFrames}`;
    }
  }

  /**
   * Mark as complete and auto-hide
   * @param {string} message - Completion message
   * @param {number} autoHideDelay - Delay before auto-hide (ms), 0 to disable
   */
  complete(message = 'EXPORT COMPLETE', autoHideDelay = 2500) {
    this.update(1.0, message);

    // Add complete class for styling
    if (this.element) {
      this.element.classList.add('complete');
    }

    // Update frame counter to show download status
    if (this.frameCounter) {
      this.frameCounter.textContent = 'DOWNLOAD STARTING...';
    }

    // Hide cancel button if present
    const cancelBtn = this.element?.querySelector('.notification-cancel-btn');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }

    console.log(`[ProgressNotification] Complete: ${message}`);

    // Auto-hide after delay
    if (autoHideDelay > 0) {
      setTimeout(() => this.hide(), autoHideDelay);
    }
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  error(message = 'EXPORT FAILED') {
    this.update(0, message);

    // Add error class
    if (this.element) {
      this.element.classList.add('error');
    }

    // Update frame counter
    if (this.frameCounter) {
      this.frameCounter.textContent = '';
    }

    // Hide cancel button if present
    const cancelBtn = this.element?.querySelector('.notification-cancel-btn');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }

    console.log(`[ProgressNotification] Error: ${message}`);

    // Auto-hide after longer delay
    setTimeout(() => this.hide(), 4000);
  }

  /**
   * Hide and remove the notification
   */
  hide() {
    if (!this.overlay) return;

    this.overlay.classList.remove('visible');

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.element = null;
      this.progressBar = null;
      this.progressText = null;
      this.statusText = null;
      this.frameCounter = null;
    }, 300);

    console.log('[ProgressNotification] Hidden');
  }

  /**
   * Check if export was cancelled
   * @returns {boolean}
   */
  isCancelled() {
    return this.cancelled;
  }
}
