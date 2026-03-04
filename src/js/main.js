console.log('[Main] Module parsing started...');

import { PolytopeViewer } from './polytope/viewer.js';
import { ViewerControls } from './ui/controls.js';
import { PolytopeSelector } from './ui/polytope-selector.js';

import { ParticleField } from './effects/ParticleField.js';

import '../styles/main.css';
import '../styles/mobile.css';

// Global viewer instance
let viewer = null;
let controls = null;

/**
 * Initialize application
 */
async function init() {
  console.warn('[Main] init() called');
  console.warn('[Main] URL search:', window.location.search);

  // Check for embed mode (used in knowledge base article iframes)
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedMode = urlParams.get('embed') === 'true';
  console.warn('[Main] isEmbedMode:', isEmbedMode);

  if (isEmbedMode) {
    document.body.classList.add('embed-mode');
    console.warn('[Main] Added embed-mode class to body');
    console.warn('[Main] Body classes:', document.body.className);
  } else {
    console.warn('[Main] Running in standard mode');
  }

  console.log('[Main] Initializing Polytope Viewer...');

  // Get canvas container
  const container = document.getElementById('viewer-canvas');
  if (!container) {
    console.error('[Main] Canvas container not found!');
    return;
  }

  // Create viewer
  viewer = new PolytopeViewer(container, {
    enableRotation3D: true,
    enableRotation4D: false,
    showVertices: true
  });

  // Initialize viewer
  await viewer.init();

  // Create controls
  controls = new ViewerControls(viewer);
  controls.init();
  controls.startFPSMonitoring();

  // Create polytope selector and load tier-specific list
  const selector = new PolytopeSelector(viewer);

  // Show loading while selector loads tier list
  showLoading('Loading polytope library...');

  try {
    await selector.init();
    console.log('[Main] Polytope selector initialized');

  } catch (error) {
    console.error('[Main] Failed to initialize selector:', error);
    showError('Failed to load polytope library. Using fallback list.');
  }

  // Performance warnings removed - 4D rotation allowed for ALL polytopes
  // Only mesh view is limited (>1200 edges) - handled in viewer.js

  // Get polytope from URL parameter or default to tesseract
  const polytopeId = urlParams.get('id') || '2-tes';

  // ALL polytopes load from /data/polytopes/{id}.off
  // The tier system just controls which polytopes are AVAILABLE in the selector
  const polytopePath = `/data/polytopes/${encodeURIComponent(polytopeId)}.off`;

  // Load default polytope geometry
  try {
    showLoading(`Loading ${polytopeId}...`);

    await viewer.loadPolytope(polytopePath, polytopeId);

    hideLoading();
    updateInfoPanel(polytopeId, viewer.polytopeData);

    // Default visual state based on complexity
    const edgeCount = viewer.polytopeData?.metadata?.edgeCount || 0;
    const isSimple = edgeCount <= 1200;

    if (isEmbedMode || isSimple) {
      // Enable mesh view for simple polytopes (or embed mode)
      viewer.toggleMeshView(true);
      controls.updateMeshButton();
    }

    if (isSimple && !isEmbedMode) {
      // Enable 4D rotation on XY plane for an immediate visual experience
      viewer.rotation4D.togglePlane('xy');
      viewer.rotating4D = true;
      controls.updatePlaneButtons();
      controls.updateRotate4DButton();
    }

    // Start rendering
    viewer.startRendering();

    console.log('[Main] Initialization complete!');
  } catch (error) {
    console.error('[Main] Failed to load polytope:', error);
    hideLoading();
    showError(`Failed to load polytope: ${error.message}`);
  }

  // Initialize desktop-only effects
  if (window.innerWidth >= 1024) {
    // Particle background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    `;
    document.body.insertBefore(bgCanvas, document.body.firstChild);
    new ParticleField(bgCanvas);

  }

  // Mobile optimizations - collapsible panels
  if (window.innerWidth < 1024) {
    setupMobileCollapsiblePanels();
  }

  // Make viewer globally accessible for debugging (dev only)
  if (import.meta.env.DEV) {
    window.viewer = viewer;
    window.controls = controls;
    window.selector = selector;
  }
}

/**
 * Setup collapsible panels for mobile - both start collapsed,
 * tap pill to expand, auto-collapse on selection or outside tap
 */
function setupMobileCollapsiblePanels() {
  const selectorPanel = document.querySelector('.hud-top-right');
  const controlsPanel = document.querySelector('.hud-bottom-center');

  // --- Collapsible Polytope Selector (top) ---
  if (selectorPanel) {
    const trigger = document.createElement('div');
    trigger.className = 'mobile-selector-trigger';
    trigger.innerHTML = `
      <span class="mobile-selector-icon">&#x2B21;</span>
      <span class="mobile-selector-name">Select Polytope</span>
      <svg class="mobile-selector-chevron" width="10" height="10" viewBox="0 0 10 10">
        <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    selectorPanel.prepend(trigger);
    selectorPanel.classList.add('mobile-collapsible');

    // Read current polytope name from the select dropdown
    const updateName = () => {
      const sel = selectorPanel.querySelector('#polytope-select');
      if (sel && sel.selectedIndex >= 0) {
        const text = sel.options[sel.selectedIndex].text;
        const name = text.split('(')[0].trim();
        trigger.querySelector('.mobile-selector-name').textContent = name || 'Select Polytope';
      }
    };
    updateName();

    // Toggle expanded
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanding = !selectorPanel.classList.contains('mobile-expanded');
      selectorPanel.classList.toggle('mobile-expanded');
      if (expanding) controlsPanel?.classList.remove('mobile-expanded');
    });

    // Auto-collapse and update name on polytope change (event delegation)
    selectorPanel.addEventListener('change', (e) => {
      if (e.target.id === 'polytope-select') {
        updateName();
        setTimeout(() => selectorPanel.classList.remove('mobile-expanded'), 150);
      }
    });
  }

  // --- Collapsible Quick Controls (bottom) ---
  if (controlsPanel) {
    const trigger = document.createElement('div');
    trigger.className = 'mobile-controls-trigger';
    trigger.innerHTML = `
      <span>Controls</span>
      <svg class="mobile-controls-chevron" width="10" height="10" viewBox="0 0 10 10">
        <path d="M2 6l3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    controlsPanel.appendChild(trigger);
    controlsPanel.classList.add('mobile-collapsible');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanding = !controlsPanel.classList.contains('mobile-expanded');
      controlsPanel.classList.toggle('mobile-expanded');
      if (expanding) selectorPanel?.classList.remove('mobile-expanded');
    });
  }

  // Close either panel on outside tap
  document.addEventListener('click', (e) => {
    if (selectorPanel && !selectorPanel.contains(e.target)) {
      selectorPanel.classList.remove('mobile-expanded');
    }
    if (controlsPanel && !controlsPanel.contains(e.target)) {
      controlsPanel.classList.remove('mobile-expanded');
    }
  });
}

/**
 * Show loading message
 */
function showLoading(message = 'Loading...') {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.textContent = message;
    loadingElement.classList.remove('hidden');
  }
}

/**
 * Hide loading message
 */
function hideLoading() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.classList.add('hidden');
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/20 border border-red-500 text-red-100 px-6 py-4 rounded-lg z-50 max-w-md';
  errorElement.innerHTML = `
    <h4 class="font-bold mb-2">Error</h4>
    <p>${message}</p>
  `;
  document.body.appendChild(errorElement);

  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}

/**
 * Update info panel with polytope data
 */
function updateInfoPanel(name, data) {
  // Update desktop info panel
  const nameElement = document.getElementById('polytope-name');
  if (nameElement) {
    nameElement.textContent = name;
  }

  const verticesElement = document.getElementById('polytope-vertices');
  if (verticesElement && data) {
    verticesElement.textContent = data.metadata.vertexCount;
  }

  const edgesElement = document.getElementById('polytope-edges');
  if (edgesElement && data) {
    edgesElement.textContent = `${data.metadata.edgeCount} / ${data.metadata.edgeCount}`;
  }

  const facesElement = document.getElementById('polytope-faces');
  if (facesElement && data) {
    facesElement.textContent = data.metadata.faceCount;
  }

  const cellsElement = document.getElementById('polytope-cells');
  if (cellsElement && data) {
    cellsElement.textContent = data.metadata.cellCount;
  }

}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
