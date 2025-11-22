/**
 * UI Controls for PolytopeViewer
 *
 * Handles:
 * - Mouse/touch interaction
 * - Rotation plane controls
 * - Slider controls
 * - Button handlers
 * - Keyboard shortcuts
 */

import { ROTATION_PLANES } from '../polytope/rotation4d.js';
import { ExportMenu } from './ExportMenu.js';
import { licenseManager } from '../license/LicenseManager.js';

export class ViewerControls {
  constructor(viewer) {
    this.viewer = viewer;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0 };

    // Pinch zoom state
    this.initialPinchDistance = 0;
    this.isPinching = false;
  }

  /**
   * Initialize all controls
   */
  init() {
    this.setupMouseControls();
    this.setupRotationControls();
    this.setupViewControls();
    this.setupBloomControls();
    this.setupManualRotationControls();
    this.setupKeyboardShortcuts();
    this.setupExportMenu();
    console.log('[ViewerControls] Initialized');
  }

  /**
   * Setup export menu with license-based feature gating
   */
  setupExportMenu() {
    const exportContainer = document.getElementById('export-container');
    if (exportContainer) {
      this.exportMenu = new ExportMenu(exportContainer, licenseManager, this.viewer);
      console.log('[ViewerControls] Export menu initialized');
    } else {
      console.warn('[ViewerControls] Export container not found');
    }
  }

  /**
   * Setup mouse controls (drag to rotate, scroll to zoom)
   */
  setupMouseControls() {
    const canvas = this.viewer.renderer.domElement;

    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.3;
      const delta = e.deltaY * 0.001;

      // Zoom camera
      this.viewer.camera.position.z += delta * zoomSpeed * this.viewer.camera.position.z;

      // Limit zoom range
      this.viewer.camera.position.z = Math.max(0.5, Math.min(20, this.viewer.camera.position.z));
    }, { passive: false });

    // Mouse drag for rotation
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaMove = {
        x: e.clientX - this.previousMousePosition.x,
        y: e.clientY - this.previousMousePosition.y
      };

      const rotationSpeed = 0.005;

      // Rotate the group based on mouse movement
      this.viewer.group.rotation.y += deltaMove.x * rotationSpeed;
      this.viewer.group.rotation.x += deltaMove.y * rotationSpeed;

      // Store velocity for momentum
      this.rotationVelocity.x = deltaMove.y * rotationSpeed;
      this.rotationVelocity.y = deltaMove.x * rotationSpeed;

      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };

      // Disable auto-rotation when manually dragging
      if (this.viewer.rotating3D) {
        this.viewer.rotating3D = false;
        this.updateRotate3DButton();
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    // Touch controls for mobile (tap+drag to rotate, pinch to zoom)
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Single finger touch - start rotation
        e.preventDefault();
        this.isDragging = true;
        this.isPinching = false;
        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      } else if (e.touches.length === 2) {
        // Two finger touch - start pinch zoom
        e.preventDefault();
        this.isDragging = false;
        this.isPinching = true;
        this.initialPinchDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();

      if (this.isPinching && e.touches.length === 2) {
        // Handle pinch zoom
        const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
        const delta = currentDistance - this.initialPinchDistance;

        // Apply zoom
        const zoomSpeed = 0.01;
        const zoomDelta = delta * zoomSpeed;

        this.viewer.camera.position.z -= zoomDelta;

        // Limit zoom range
        this.viewer.camera.position.z = Math.max(0.5, Math.min(20, this.viewer.camera.position.z));

        this.initialPinchDistance = currentDistance;
      } else if (this.isDragging && e.touches.length === 1) {
        // Handle single finger rotation
        const deltaMove = {
          x: e.touches[0].clientX - this.previousMousePosition.x,
          y: e.touches[0].clientY - this.previousMousePosition.y
        };

        const rotationSpeed = 0.005;

        // Rotate the group based on touch movement
        this.viewer.group.rotation.y += deltaMove.x * rotationSpeed;
        this.viewer.group.rotation.x += deltaMove.y * rotationSpeed;

        // Store velocity for momentum
        this.rotationVelocity.x = deltaMove.y * rotationSpeed;
        this.rotationVelocity.y = deltaMove.x * rotationSpeed;

        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };

        // Disable auto-rotation when manually dragging
        if (this.viewer.rotating3D) {
          this.viewer.rotating3D = false;
          this.updateRotate3DButton();
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isDragging = false;
        this.isPinching = false;
      } else if (e.touches.length === 1) {
        // Switched from pinch to single finger
        this.isPinching = false;
        this.isDragging = true;
        this.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    });

    canvas.addEventListener('touchcancel', () => {
      this.isDragging = false;
      this.isPinching = false;
    });
  }

  /**
   * Calculate distance between two touch points (for pinch zoom)
   */
  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Setup rotation plane controls
   */
  setupRotationControls() {
    // Plane toggle buttons
    Object.values(ROTATION_PLANES).forEach(plane => {
      const button = document.getElementById(`plane-${plane}`);
      if (button) {
        button.addEventListener('click', () => this.togglePlane(plane));
      }
    });

    // Update button states
    this.updatePlaneButtons();
  }

  /**
   * Setup view controls (3D rotation, reset, etc.)
   */
  setupViewControls() {
    // 3D rotation toggle
    const rotate3DBtn = document.getElementById('rotate-3d-btn');
    if (rotate3DBtn) {
      rotate3DBtn.addEventListener('click', () => this.toggle3DRotation());
    }

    // 4D rotation toggle
    const rotate4DBtn = document.getElementById('rotate-4d-btn');
    if (rotate4DBtn) {
      rotate4DBtn.addEventListener('click', () => this.toggle4DRotation());
    }

    // Reset view
    const resetBtn = document.getElementById('reset-view-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetView());
    }

    // Toggle vertices
    const verticesBtn = document.getElementById('toggle-vertices-btn');
    if (verticesBtn) {
      verticesBtn.addEventListener('click', () => this.toggleVertices());
    }

    // Toggle mesh view
    const meshBtn = document.getElementById('toggle-mesh-btn');
    if (meshBtn) {
      meshBtn.addEventListener('click', () => this.toggleMeshView());
    }

    // Projection type toggle switch
    const projectionStereo = document.getElementById('projection-stereo');
    const projectionPerspective = document.getElementById('projection-perspective');

    if (projectionStereo) {
      projectionStereo.addEventListener('click', () => {
        if (this.viewer.projectionType !== 'stereographic') {
          this.viewer.projectionType = 'stereographic';
          this.viewer.updateProjection();
          this.updateProjectionButtons();
        }
      });
    }

    if (projectionPerspective) {
      projectionPerspective.addEventListener('click', () => {
        if (this.viewer.projectionType !== 'perspective') {
          this.viewer.projectionType = 'perspective';
          this.viewer.updateProjection();
          this.updateProjectionButtons();
        }
      });
    }

    // Audio toggle button
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        this.toggleAudio();
      });
    }
  }

  /**
   * Setup bloom effect controls (desktop only)
   */
  setupBloomControls() {
    const bloomControls = document.getElementById('bloom-controls');
    const bloomToggle = document.getElementById('toggle-bloom-btn');

    // Check if bloom is available (desktop only)
    if (this.viewer.bloomEffect && this.viewer.bloomEffect.isAvailable()) {
      // Show bloom controls on desktop
      if (bloomControls) {
        bloomControls.style.display = 'block';
      }

      // Toggle bloom on/off
      if (bloomToggle) {
        bloomToggle.addEventListener('click', () => {
          const isEnabled = this.viewer.bloomEffect.enabled;
          this.viewer.bloomEffect.setEnabled(!isEnabled);

          // Update button text and state
          if (!isEnabled) {
            bloomToggle.textContent = 'Bloom Glow: ON';
            bloomToggle.classList.add('active');
          } else {
            bloomToggle.textContent = 'Bloom Glow: OFF';
            bloomToggle.classList.remove('active');
          }
        });
      }

      console.log('[ViewerControls] Bloom controls initialized (desktop)');
      console.log('[ViewerControls] Iridescent material always used for mesh view on desktop');
    } else {
      console.log('[ViewerControls] Bloom not available (mobile or disabled)');
    }
  }

  /**
   * Setup manual rotation controls (desktop only)
   */
  setupManualRotationControls() {
    // Check if manual rotation is available (desktop only)
    if (!this.viewer.manualRotationController) {
      console.log('[ViewerControls] Manual rotation not available (mobile)');
      return;
    }

    // Show manual rotation section
    const manualSection = document.getElementById('manual-rotation-section');
    if (manualSection) {
      manualSection.style.display = 'block';
    }

    // Mode toggle (auto/manual radio buttons)
    const autoRadio = document.getElementById('rotation-mode-auto');
    const manualRadio = document.getElementById('rotation-mode-manual');

    if (autoRadio) {
      autoRadio.addEventListener('change', () => {
        if (autoRadio.checked) {
          this.viewer.setRotationMode('auto');
          this.hideManualControls();
        }
      });
    }

    if (manualRadio) {
      manualRadio.addEventListener('change', () => {
        if (manualRadio.checked) {
          this.viewer.setRotationMode('manual');
          this.showManualControls();
        }
      });
    }

    // Preset buttons
    const presetButtons = document.querySelectorAll('.rotation-preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetName = btn.dataset.preset;
        if (this.viewer.manualRotationController) {
          this.viewer.manualRotationController.applyPreset(presetName);
        }
      });
    });

    // Reset rotation button
    const resetBtn = document.getElementById('rotation-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.viewer.manualRotationController) {
          this.viewer.manualRotationController.reset();
        }
      });
    }

    // Sensitivity slider
    const sensitivitySlider = document.getElementById('rotation-sensitivity');
    const sensitivityValue = document.getElementById('sensitivity-value');
    if (sensitivitySlider && sensitivityValue) {
      sensitivitySlider.addEventListener('input', () => {
        const value = parseFloat(sensitivitySlider.value);
        if (this.viewer.manualRotationController) {
          this.viewer.manualRotationController.setSensitivity(value);
        }
        sensitivityValue.textContent = value.toFixed(1);
      });
    }

    // Keyboard shortcuts overlay
    const showKeyboardHelp = document.getElementById('show-keyboard-help');
    const closeKeyboardHelp = document.getElementById('close-keyboard-help');
    const keyboardOverlay = document.getElementById('keyboard-shortcuts-overlay');

    if (showKeyboardHelp && keyboardOverlay) {
      showKeyboardHelp.addEventListener('click', () => {
        keyboardOverlay.classList.remove('hidden');
      });
    }

    if (closeKeyboardHelp && keyboardOverlay) {
      closeKeyboardHelp.addEventListener('click', () => {
        keyboardOverlay.classList.add('hidden');
      });
    }

    // Press '?' to show keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && keyboardOverlay) {
        keyboardOverlay.classList.toggle('hidden');
      }
    });

    // Update angle display (real-time)
    this.startAngleDisplayUpdate();

    console.log('[ViewerControls] Manual rotation controls initialized');
  }

  /**
   * Show manual control UI elements
   */
  showManualControls() {
    document.getElementById('manual-instructions')?.classList.remove('hidden');
    document.getElementById('angle-display')?.classList.remove('hidden');
    document.getElementById('rotation-presets')?.classList.remove('hidden');
    document.getElementById('sensitivity-control')?.classList.remove('hidden');
    document.getElementById('reset-rotation-container')?.classList.remove('hidden');
  }

  /**
   * Hide manual control UI elements
   */
  hideManualControls() {
    document.getElementById('manual-instructions')?.classList.add('hidden');
    document.getElementById('angle-display')?.classList.add('hidden');
    document.getElementById('rotation-presets')?.classList.add('hidden');
    document.getElementById('sensitivity-control')?.classList.add('hidden');
    document.getElementById('reset-rotation-container')?.classList.add('hidden');
  }

  /**
   * Start angle display update loop
   */
  startAngleDisplayUpdate() {
    const updateAngles = () => {
      if (this.viewer.rotationMode === 'manual' && this.viewer.manualRotationController) {
        const angles = this.viewer.manualRotationController.getAnglesInDegrees();

        document.getElementById('angle-xy').textContent = angles.xy + '°';
        document.getElementById('angle-xz').textContent = angles.xz + '°';
        document.getElementById('angle-xw').textContent = angles.xw + '°';
        document.getElementById('angle-yz').textContent = angles.yz + '°';
        document.getElementById('angle-yw').textContent = angles.yw + '°';
        document.getElementById('angle-zw').textContent = angles.zw + '°';
      }
      requestAnimationFrame(updateAngles);
    };
    updateAngles();
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ': // Spacebar - toggle 4D rotation
          e.preventDefault();
          this.toggle4DRotation();
          break;
        case 'r': // R - reset view
          this.resetView();
          break;
        case 'm': // M - toggle mesh view
          this.toggleMeshView();
          break;
        case 'v': // V - toggle vertices
          this.toggleVertices();
          break;
        case 'p': // P - toggle projection
          this.toggleProjection();
          break;
        case '3': // 3 - toggle 3D rotation
          this.toggle3DRotation();
          break;
      }
    });
  }

  /**
   * Toggle rotation plane
   */
  togglePlane(plane) {
    this.viewer.rotation4D.togglePlane(plane);
    this.updatePlaneButtons();

    // Enable 4D rotation if a plane is active
    if (this.viewer.rotation4D.hasActivePlanes() && !this.viewer.rotating4D) {
      this.viewer.rotating4D = true;
      this.updateRotate4DButton();
    }
  }

  /**
   * Toggle 3D auto-rotation
   */
  toggle3DRotation() {
    this.viewer.rotating3D = !this.viewer.rotating3D;
    this.updateRotate3DButton();
  }

  /**
   * Toggle 4D rotation
   */
  toggle4DRotation() {
    if (!this.viewer.rotationEnabled) {
      this.showRotationDisabledMessage();
      return;
    }

    // Check if 4D rotation should be blocked (mesh view active on complex polytope)
    if (!this.viewer.rotating4D && this.viewer.should4DRotationBeDisabled()) {
      this.viewer.show4DRotationDisabledMessage();
      return;
    }

    this.viewer.rotating4D = !this.viewer.rotating4D;
    this.updateRotate4DButton();

    // Update performance warning banner
    if (this.viewer.performanceBanner) {
      this.viewer.performanceBanner.update(this.viewer.currentEdgeCount, this.viewer.rotating4D, this.viewer.showMeshView);
    }
  }

  /**
   * Toggle vertices visibility
   */
  toggleVertices() {
    this.viewer.showVertices = !this.viewer.showVertices;
    this.viewer.updateProjection();
    this.updateVerticesButton();
  }

  /**
   * Toggle mesh view
   */
  toggleMeshView() {
    const newState = !this.viewer.showMeshView;
    this.viewer.toggleMeshView(newState);
    this.updateMeshButton();
  }

  /**
   * Toggle projection type
   */
  toggleProjection() {
    this.viewer.projectionType = this.viewer.projectionType === 'stereographic'
      ? 'perspective'
      : 'stereographic';
    this.viewer.updateProjection();
    this.updateProjectionButtons();
  }

  /**
   * Toggle audio on/off
   */
  toggleAudio() {
    // Check if HUDSounds is available (desktop only)
    if (window.hudSounds) {
      const isEnabled = window.hudSounds.enabled;
      window.hudSounds.setEnabled(!isEnabled);
      this.updateAudioButton();
      console.log('[ViewerControls] Audio toggled:', !isEnabled);
    } else {
      console.warn('[ViewerControls] HUDSounds not available');
    }
  }

  /**
   * Reset view to initial state
   */
  resetView() {
    // Reset 3D rotation
    this.viewer.group.rotation.set(0, 0, 0);

    // Reset 4D rotation
    this.viewer.rotation4D.reset();

    // Reset camera
    this.viewer.camera.position.set(0, 0, 5);
    this.viewer.camera.lookAt(0, 0, 0);

    // Update projection
    this.viewer.updateProjection();
  }

  /**
   * Update plane button states
   */
  updatePlaneButtons() {
    const activePlanes = this.viewer.rotation4D.getActivePlanes();

    Object.values(ROTATION_PLANES).forEach(plane => {
      const button = document.getElementById(`plane-${plane}`);
      if (button) {
        if (activePlanes.includes(plane)) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
  }

  /**
   * Update 3D rotation button
   */
  updateRotate3DButton() {
    const button = document.getElementById('rotate-3d-btn');
    if (button) {
      if (this.viewer.rotating3D) {
        button.classList.add('active');
        button.textContent = '3D Rotate: ON';
      } else {
        button.classList.remove('active');
        button.textContent = '3D Rotate: OFF';
      }
    }
  }

  /**
   * Update 4D rotation button
   */
  updateRotate4DButton() {
    const button = document.getElementById('rotate-4d-btn');
    if (button) {
      if (this.viewer.rotating4D) {
        button.classList.add('active');
        button.textContent = '4D Rotate: ON';
      } else {
        button.classList.remove('active');
        button.textContent = '4D Rotate: OFF';
      }
    }
  }

  /**
   * Update vertices button
   */
  updateVerticesButton() {
    const button = document.getElementById('toggle-vertices-btn');
    if (button) {
      if (this.viewer.showVertices) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  /**
   * Update mesh view button
   */
  updateMeshButton() {
    const button = document.getElementById('toggle-mesh-btn');
    if (button) {
      if (this.viewer.showMeshView) {
        button.classList.add('active');
        button.textContent = 'Mesh View: ON';
      } else {
        button.classList.remove('active');
        button.textContent = 'Mesh View: OFF';
      }
    }
  }

  /**
   * Update projection buttons
   */
  updateProjectionButtons() {
    const stereoBtn = document.getElementById('projection-stereo');
    const perspBtn = document.getElementById('projection-perspective');

    if (stereoBtn && perspBtn) {
      if (this.viewer.projectionType === 'stereographic') {
        stereoBtn.classList.add('active');
        perspBtn.classList.remove('active');
      } else {
        stereoBtn.classList.remove('active');
        perspBtn.classList.add('active');
      }
    }
  }

  /**
   * Update audio toggle button
   */
  updateAudioButton() {
    const button = document.getElementById('sound-toggle');
    if (button && window.hudSounds) {
      if (window.hudSounds.enabled) {
        button.classList.add('active');
        button.textContent = 'Audio: ON';
      } else {
        button.classList.remove('active');
        button.textContent = 'Audio: OFF';
      }
    }
  }

  /**
   * Show message when rotation is disabled
   */
  showRotationDisabledMessage() {
    const message = document.createElement('div');
    message.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/20 border border-red-500 text-red-100 px-6 py-3 rounded-lg z-50';
    message.textContent = '4D rotation disabled for this polytope (too complex)';
    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  /**
   * Update FPS display
   */
  updateFPSDisplay() {
    const fpsElement = document.getElementById('fps-display');
    if (fpsElement) {
      const fps = this.viewer.getAverageFPS();
      fpsElement.textContent = `${fps.toFixed(1)} FPS`;

      // Color code based on FPS
      if (fps >= 50) {
        fpsElement.className = 'text-green-400';
      } else if (fps >= 30) {
        fpsElement.className = 'text-yellow-400';
      } else {
        fpsElement.className = 'text-red-400';
      }
    }
  }

  /**
   * Start FPS monitoring
   */
  startFPSMonitoring() {
    setInterval(() => {
      this.updateFPSDisplay();
    }, 500);
  }
}

/**
 * Performance warning modal
 */
export function showPerformanceWarning(warning) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-morphism p-8 rounded-xl max-w-md mx-4">
        <h3 class="text-2xl font-bold mb-4 ${warning.level === 'extreme' ? 'text-red-400' : 'text-yellow-400'}">
          ${warning.title}
        </h3>
        <p class="text-gray-300 mb-4">${warning.message}</p>
        <p class="text-gray-400 text-sm mb-6">${warning.explanation}</p>
        <div class="flex gap-3">
          ${warning.options.map(option => `
            <button
              id="warning-${option.value}"
              class="${option.primary ? 'btn-primary' : 'btn-secondary'} ${option.warning ? 'opacity-75' : ''}"
            >
              ${option.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle button clicks
    warning.options.forEach(option => {
      const button = document.getElementById(`warning-${option.value}`);
      if (button) {
        button.addEventListener('click', () => {
          modal.remove();
          resolve(option.value);
        });
      }
    });
  });
}
