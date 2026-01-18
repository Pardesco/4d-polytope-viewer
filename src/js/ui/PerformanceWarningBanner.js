/**
 * Performance Warning Banner
 *
 * Shows a warning banner when 4D rotation is enabled for complex polytopes
 */

export class PerformanceWarningBanner {
  constructor() {
    this.banner = null;
    this.currentEdgeCount = 0;
    this.isVisible = false;
    this.WARNING_THRESHOLD = 1200; // Show warning for polytopes with >1200 edges
    this.autoDismissTimer = null;
  }

  /**
   * Create banner element (called once)
   */
  create() {
    if (this.banner) return;

    this.banner = document.createElement('div');
    this.banner.id = 'performance-warning-banner';
    this.banner.className = 'performance-warning-banner hidden';
    this.banner.innerHTML = `
      <div class="banner-content">
        <div class="banner-text">
          <div class="banner-title">PERFORMANCE NOTICE</div>
          <div class="banner-message">
            THIS POLYTOPE HAS <span id="banner-edge-count">0</span> EDGES.
            4D ROTATION MAY IMPACT PERFORMANCE ON SOME DEVICES.
          </div>
        </div>
        <button class="banner-close" id="close-warning-banner" title="Dismiss">✕</button>
      </div>
    `;

    document.body.appendChild(this.banner);

    // Attach close handler
    const closeBtn = document.getElementById('close-warning-banner');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
  }

  /**
   * Update banner with current polytope info
   * @param {number} edgeCount - Number of edges
   * @param {boolean} rotating4D - Whether 4D rotation is active
   * @param {boolean} showMeshView - Whether mesh view is active (optional)
   */
  update(edgeCount, rotating4D, showMeshView = false) {
    if (!this.banner) {
      this.create();
    }

    this.currentEdgeCount = edgeCount;

    // Show warning if:
    // 1. Edge count > threshold
    // 2. 4D rotation is enabled
    // 3. NOT in mesh view (mesh view blocks 4D rotation for complex polytopes)
    const shouldShow = edgeCount > this.WARNING_THRESHOLD && rotating4D && !showMeshView;

    if (shouldShow && !this.isVisible) {
      this.show(edgeCount);
    } else if (!shouldShow && this.isVisible) {
      this.hide();
    } else if (shouldShow && this.isVisible) {
      // Update edge count if already visible
      this.updateEdgeCount(edgeCount);
    }
  }

  /**
   * Show the banner
   */
  show(edgeCount) {
    if (!this.banner) this.create();

    this.updateEdgeCount(edgeCount);
    this.banner.classList.remove('hidden');
    this.banner.classList.add('visible');
    this.isVisible = true;

    // NO auto-dismiss - user must manually close while rotating high-edge polytope
    console.log(`[PerformanceWarning] Banner shown for ${edgeCount} edges (manual close required)`);
  }

  /**
   * Hide the banner
   */
  hide() {
    if (!this.banner) return;

    // Clear auto-dismiss timer
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }

    this.banner.classList.remove('visible');
    this.banner.classList.add('hidden');
    this.isVisible = false;

    console.log('[PerformanceWarning] Banner hidden');
  }

  /**
   * Update edge count in banner
   */
  updateEdgeCount(edgeCount) {
    const edgeCountElement = document.getElementById('banner-edge-count');
    if (edgeCountElement) {
      edgeCountElement.textContent = edgeCount.toLocaleString();
    }
  }

  /**
   * Check if banner should be visible for given state
   */
  shouldShow(edgeCount, rotating4D) {
    return edgeCount > this.WARNING_THRESHOLD && rotating4D;
  }
}
