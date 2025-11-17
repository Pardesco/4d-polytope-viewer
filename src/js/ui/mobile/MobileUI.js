/**
 * MobileUI - Mobile/Tablet UI Manager (MVP)
 *
 * Provides mobile-optimized interface with:
 * - FAB (Floating Action Button) for controls access
 * - Bottom sheet with full-screen controls
 * - Minimal overlay (FPS + polytope selector)
 *
 * Design: Simple 2-state toggle (hidden ↔ full)
 * No drag gestures in MVP - just tap to toggle
 */

export class MobileUI {
  constructor(viewer) {
    this.viewer = viewer;
    this.isSheetVisible = false;
    this.isMobile = this.detectMobile();
    this.selector = null; // Will be set after selector initializes
    this.polytopes = []; // Fallback empty list

    if (this.isMobile) {
      console.log('[MobileUI] Initializing mobile interface');
      this.init();
    }
  }

  /**
   * Set selector reference after it's initialized
   * @param {PolytopeSelector} selector - Initialized selector with loaded polytopes
   */
  setSelector(selector) {
    this.selector = selector;
    this.polytopes = selector.polytopes || [];
    console.log(`[MobileUI] Selector connected with ${this.polytopes.length} polytopes`);

    // Update dropdown if already rendered
    if (this.isMobile && this.overlay) {
      const mobileSelector = document.getElementById('mobile-polytope-selector');
      if (mobileSelector) {
        mobileSelector.innerHTML = this.getPolytopeOptions();
      }
    }
  }

  /**
   * Detect if we're on mobile/tablet viewport
   */
  detectMobile() {
    return window.innerWidth < 1024;
  }

  /**
   * Initialize mobile UI components
   */
  init() {
    // Hide desktop panels
    this.hideDesktopPanels();

    // Create mobile components
    this.createOverlay(); // Now includes FAB
    this.createSheet();

    // Setup responsive behavior
    this.setupResponsive();

    console.log('[MobileUI] Mobile UI initialized');
  }

  /**
   * Hide desktop control panels on mobile
   */
  hideDesktopPanels() {
    const desktopPanels = document.querySelectorAll('.info-panel, .control-panel');
    desktopPanels.forEach(panel => {
      panel.style.display = 'none';
    });
  }

  /**
   * Create minimal overlay (FPS + polytope selector + FAB)
   */
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    overlay.innerHTML = `
      <span class="mobile-fps" id="mobile-fps">60 FPS</span>
      <select class="mobile-polytope-selector" id="mobile-polytope-selector">
        ${this.getPolytopeOptions()}
      </select>
      <button class="mobile-fab" aria-label="Toggle controls">
        <svg class="fab-icon" viewBox="0 0 24 24" fill="white">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Update FPS periodically
    this.startFPSUpdates();

    // Setup selector listener
    this.setupPolytopeSelector();

    // Setup FAB listener
    this.setupFAB();
  }

  /**
   * Generate polytope selector options
   */
  getPolytopeOptions() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentId = urlParams.get('id') || '2-tes';

    // If no polytopes loaded yet, show loading option
    if (this.polytopes.length === 0) {
      return '<option disabled>Loading polytopes...</option>';
    }

    // Sort polytopes numerically by ID (1-pen, 2-tes, ... 10-sishi, 11-gaghi)
    const sortedPolytopes = [...this.polytopes].sort((a, b) => {
      // Extract leading number from ID (e.g., "2-tes" -> 2, "10-sishi" -> 10)
      const numA = parseInt(a.id.match(/^(\d+)/)?.[1] || '999999');
      const numB = parseInt(b.id.match(/^(\d+)/)?.[1] || '999999');
      return numA - numB;
    });

    return sortedPolytopes.map(polytope => {
      const selected = polytope.id === currentId ? 'selected' : '';
      const sizeKB = polytope.file_size_kb || 0;
      const sizeDisplay = sizeKB < 100
        ? `${sizeKB.toFixed(1)} KB`
        : sizeKB < 1024
        ? `${sizeKB.toFixed(0)} KB`
        : `${(sizeKB / 1024).toFixed(1)} MB`;
      return `<option value="${polytope.id}" ${selected}>${polytope.name} (${sizeDisplay})</option>`;
    }).join('');
  }

  /**
   * Setup polytope selector change handler
   */
  setupPolytopeSelector() {
    const selector = document.getElementById('mobile-polytope-selector');
    if (!selector) return;

    selector.addEventListener('change', async (e) => {
      const polytopeId = e.target.value;
      await this.loadPolytope(polytopeId);
    });
  }

  /**
   * Load a new polytope
   */
  async loadPolytope(polytopeId) {
    try {
      // Show loading in FPS area
      const fpsElement = document.getElementById('mobile-fps');
      if (fpsElement) {
        fpsElement.textContent = 'Loading...';
      }

      // Find polytope in loaded list
      const polytopeInfo = this.polytopes.find(p => p.id === polytopeId);
      if (!polytopeInfo) {
        throw new Error(`Polytope ${polytopeId} not found`);
      }

      // ALL polytopes load from /data/polytopes/{id}.off
      const polytopePath = `/data/polytopes/${polytopeId}.off`;

      const data = await this.viewer.loadPolytope(polytopePath, polytopeInfo.name);

      // Update mobile sheet info panel with polytope data
      this.updateMobileInfoPanel(polytopeId, data);

      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('id', polytopeId);
      window.history.pushState({}, '', url);

      console.log(`[MobileUI] Loaded polytope: ${polytopeId}`);
    } catch (error) {
      console.error('[MobileUI] Failed to load polytope:', error);
      alert(`Failed to load polytope: ${error.message}`);
    }
  }

  /**
   * Update mobile sheet info panel with polytope data
   */
  updateMobileInfoPanel(polytopeId, data) {
    const polytope = this.polytopes.find(p => p.id === polytopeId);
    if (!polytope) return;

    // Update name in mobile sheet
    const nameElement = this.sheet.querySelector('#polytope-name');
    if (nameElement) {
      nameElement.textContent = polytope.name;
    }

    // Update statistics from loaded data
    if (data && data.metadata) {
      const verticesElement = this.sheet.querySelector('#polytope-vertices');
      if (verticesElement) {
        verticesElement.textContent = data.metadata.vertexCount;
      }

      const edgesElement = this.sheet.querySelector('#polytope-edges');
      if (edgesElement) {
        edgesElement.textContent = `${data.metadata.edgeCount} / ${data.metadata.edgeCount}`;
      }

      const facesElement = this.sheet.querySelector('#polytope-faces');
      if (facesElement) {
        facesElement.textContent = data.metadata.faceCount;
      }

      const cellsElement = this.sheet.querySelector('#polytope-cells');
      if (cellsElement) {
        cellsElement.textContent = data.metadata.cellCount;
      }
    }
  }

  /**
   * Setup FAB click listener
   */
  setupFAB() {
    const fab = document.querySelector('.mobile-fab');
    if (!fab) return;

    fab.addEventListener('click', () => this.toggleSheet());
    this.fab = fab;
  }

  /**
   * Create bottom sheet with controls
   */
  createSheet() {
    const sheet = document.createElement('div');
    sheet.className = 'mobile-sheet';

    // Build sheet content
    sheet.innerHTML = `
      <div class="sheet-header">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">Controls</h2>
      </div>
      <div class="sheet-content">
        ${this.getControlsHTML()}
      </div>
    `;

    document.body.appendChild(sheet);
    this.sheet = sheet;

    // Setup close on tap outside
    this.setupOutsideClickClose();
  }

  /**
   * Get controls HTML by reusing desktop controls
   */
  getControlsHTML() {
    // Try to clone existing desktop controls
    const infoPanel = document.querySelector('.info-panel');
    const controlPanel = document.querySelector('.control-panel');

    let html = '';

    // Add info section
    if (infoPanel) {
      const infoClone = infoPanel.cloneNode(true);
      infoClone.style.display = 'block';
      html += `<div class="mobile-section">${infoClone.innerHTML}</div>`;
    }

    // Add controls section
    if (controlPanel) {
      const controlClone = controlPanel.cloneNode(true);
      controlClone.style.display = 'block';
      html += `<div class="mobile-section">${controlClone.innerHTML}</div>`;
    }

    // Fallback if panels not found
    if (!html) {
      html = `
        <div class="mobile-section">
          <h3>Controls</h3>
          <p>Desktop controls not found. Please reload.</p>
        </div>
      `;
    }

    return html;
  }

  /**
   * Toggle bottom sheet visibility
   */
  toggleSheet() {
    this.isSheetVisible = !this.isSheetVisible;

    if (this.isSheetVisible) {
      this.sheet.classList.add('visible');
      this.fab.classList.add('active');
    } else {
      this.sheet.classList.remove('visible');
      this.fab.classList.remove('active');
    }
  }

  /**
   * Setup click outside to close sheet
   */
  setupOutsideClickClose() {
    document.addEventListener('click', (e) => {
      // Only if sheet is visible
      if (!this.isSheetVisible) return;

      // Don't close if clicking inside sheet or FAB
      if (this.sheet.contains(e.target) || this.fab.contains(e.target)) {
        return;
      }

      // Close sheet
      this.toggleSheet();
    });
  }

  /**
   * Start FPS updates
   */
  startFPSUpdates() {
    setInterval(() => {
      if (this.viewer && this.viewer.getAverageFPS) {
        const fps = this.viewer.getAverageFPS();
        const fpsElement = document.getElementById('mobile-fps');
        if (fpsElement) {
          fpsElement.textContent = `${Math.round(fps)} FPS`;
        }
      }
    }, 500);
  }


  /**
   * Setup responsive behavior (handle window resize)
   */
  setupResponsive() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const nowMobile = this.detectMobile();

        // If viewport changed between mobile/desktop
        if (nowMobile !== this.isMobile) {
          console.log('[MobileUI] Viewport changed, reloading...');
          window.location.reload();
        }
      }, 250);
    });
  }
}
