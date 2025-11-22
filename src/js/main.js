import { PolytopeViewer } from './polytope/viewer.js';
import { ViewerControls } from './ui/controls.js';
import { PolytopeSelector } from './ui/polytope-selector.js';
import { MobileUI } from './ui/mobile/MobileUI.js';
import { SimpleWatermark } from './ui/SimpleWatermark.js';
import { licenseManager } from './license/LicenseManager.js';
import { ParticleField } from './effects/ParticleField.js';
import { HUDSounds } from './audio/HUDSounds.js';
import '../styles/main.css';
import '../styles/mobile.css';

// Global viewer instance
let viewer = null;
let controls = null;
let mobileUI = null;
let hudSounds = null; // NEW: Global instance for audio feedback

/**
 * Initialize application
 */
async function init() {
  console.log('[Main] Initializing Polytope Viewer...');

  // Initialize license manager
  console.log('[Main] License Manager initialized');
  const licenseInfo = licenseManager.getLicenseInfo();
  console.log(`[Main] Current tier: ${licenseInfo.tier}`);

  // Update UI based on license tier
  if (licenseInfo.hasLicense) {
    console.log(`[Main] License active until: ${licenseInfo.expirationDate}`);
  }

  // Create persistent watermark (always visible on canvas)
  const watermark = new SimpleWatermark();

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

  // Create mobile UI (automatically detects mobile/tablet)
  mobileUI = new MobileUI(viewer);

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

    // Connect selector to mobile UI (if mobile)
    if (mobileUI && mobileUI.isMobile) {
      mobileUI.setSelector(selector);
    }
  } catch (error) {
    console.error('[Main] Failed to initialize selector:', error);
    showError('Failed to load polytope library. Using fallback list.');
  }

  // Performance warnings removed - 4D rotation allowed for ALL polytopes
  // Only mesh view is limited (>1200 edges) - handled in viewer.js

  // Get polytope from URL parameter or default to tesseract
  const urlParams = new URLSearchParams(window.location.search);
  const polytopeId = urlParams.get('id') || '2-tes';

  // ALL polytopes load from /data/polytopes/{id}.off
  // The tier system just controls which polytopes are AVAILABLE in the selector
  const polytopePath = `/data/polytopes/${polytopeId}.off`;

  // Load default polytope geometry
  try {
    showLoading(`Loading ${polytopeId}...`);

    await viewer.loadPolytope(polytopePath, polytopeId);

    hideLoading();
    updateInfoPanel(polytopeId, viewer.polytopeData);

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

    // Audio feedback for UI interactions
    hudSounds = new HUDSounds();
    document.querySelectorAll('.hud-button, .btn-secondary, .btn-primary').forEach(btn => {
      btn.addEventListener('mouseenter', () => hudSounds.playTick());
      btn.addEventListener('click', () => hudSounds.playChirp());
    });
  }

  // Make viewer globally accessible for debugging
  window.viewer = viewer;
  window.controls = controls;
  window.mobileUI = mobileUI;
  window.licenseManager = licenseManager;
  window.selector = selector;
  window.hudSounds = hudSounds; // Make sounds globally accessible for toggle
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

  // Also update mobile sheet if it exists
  if (mobileUI && mobileUI.isMobile && mobileUI.sheet) {
    const urlParams = new URLSearchParams(window.location.search);
    const polytopeId = urlParams.get('id') || '2-tes';
    mobileUI.updateMobileInfoPanel(polytopeId, data);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
