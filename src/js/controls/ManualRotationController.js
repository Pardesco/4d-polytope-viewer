/**
 * ManualRotationController - Main controller for manual 4D rotation
 *
 * Orchestrates mouse, keyboard, and preset controls
 * Provides smooth interpolation and state management
 */

import { MouseRotationController } from './MouseRotationController.js';
import { KeyboardRotationController } from './KeyboardRotationController.js';
import { RotationPresets } from './RotationPresets.js';

export class ManualRotationController {
  constructor(viewer) {
    this.viewer = viewer;
    this.enabled = false;
    this.sensitivity = 0.5; // User-adjustable (0.1 - 2.0)

    // Sub-controllers
    this.mouseController = new MouseRotationController(this);
    this.keyboardController = new KeyboardRotationController(this);

    // State - rotation angles for all 6 planes (in radians)
    this.rotation = {
      xy: 0, xz: 0, xw: 0,
      yz: 0, yw: 0, zw: 0
    };

    // Animation state (for smooth preset transitions)
    this.animatingToTarget = false;
    this.targetRotation = null;
    this.startRotation = null;
    this.animationProgress = 0;
    this.animationDuration = 0.5; // seconds
  }

  enable() {
    this.enabled = true;
    this.mouseController.enable();
    this.keyboardController.enable();

    // Copy current rotation state from viewer
    if (this.viewer.rotation4D) {
      const current = this.viewer.rotation4D.getRotationState();
      this.rotation = { ...current };
    }

    console.log('[ManualRotationController] Enabled');
  }

  disable() {
    this.enabled = false;
    this.mouseController.disable();
    this.keyboardController.disable();
    console.log('[ManualRotationController] Disabled');
  }

  update(deltaTime) {
    if (!this.enabled) return;

    // Handle smooth preset animation
    if (this.animatingToTarget) {
      this.updatePresetAnimation(deltaTime);
      return;
    }

    // Update from keyboard input
    this.keyboardController.update(this.rotation, deltaTime);

    // Apply rotation to viewer's 4D rotation system
    this.applyToViewer();
  }

  applyMouseDelta(deltaX, deltaY, modifiers) {
    const { shiftKey, ctrlKey } = modifiers;
    const sensitivity = this.sensitivity * 0.01;

    if (shiftKey) {
      // Shift + drag: XZ + YW
      this.rotation.xz += deltaY * sensitivity;
      this.rotation.yw += deltaX * sensitivity;
    } else if (ctrlKey) {
      // Ctrl + drag: XW + YZ
      this.rotation.xw += deltaY * sensitivity;
      this.rotation.yz += deltaX * sensitivity;
    } else {
      // Default: XY + ZW (Clifford)
      this.rotation.xy += deltaY * sensitivity;
      this.rotation.zw += deltaX * sensitivity;
    }

    this.applyToViewer();
  }

  applyToViewer() {
    // Set rotation state on viewer's Rotation4D system
    if (this.viewer.rotation4D) {
      this.viewer.rotation4D.setRotationState(this.rotation);
    }
  }

  applyPreset(presetName) {
    const preset = RotationPresets.get(presetName);
    if (!preset) {
      console.warn(`[ManualRotationController] Preset not found: ${presetName}`);
      return;
    }

    console.log(`[ManualRotationController] Applying preset: ${preset.name}`);

    // Start smooth animation to preset
    this.targetRotation = { ...preset.angles };
    this.startRotation = { ...this.rotation };
    this.animatingToTarget = true;
    this.animationProgress = 0;
  }

  updatePresetAnimation(deltaTime) {
    // Smooth interpolation (ease-out cubic)
    this.animationProgress += deltaTime / this.animationDuration;

    if (this.animationProgress >= 1) {
      // Animation complete
      this.rotation = { ...this.targetRotation };
      this.animatingToTarget = false;
      this.targetRotation = null;
      this.startRotation = null;
      this.animationProgress = 0;
    } else {
      // Interpolate (ease-out cubic)
      const t = this.animationProgress;
      const eased = 1 - Math.pow(1 - t, 3);

      // Interpolate each plane
      for (let plane in this.rotation) {
        const start = this.startRotation[plane];
        const end = this.targetRotation[plane];
        this.rotation[plane] = start + (end - start) * eased;
      }
    }

    this.applyToViewer();
  }

  reset() {
    console.log('[ManualRotationController] Resetting rotation');
    this.applyPreset('identity');
  }

  getAnglesInDegrees() {
    const toDeg = (rad) => (rad * 180 / Math.PI).toFixed(1);
    return {
      xy: toDeg(this.rotation.xy),
      xz: toDeg(this.rotation.xz),
      xw: toDeg(this.rotation.xw),
      yz: toDeg(this.rotation.yz),
      yw: toDeg(this.rotation.yw),
      zw: toDeg(this.rotation.zw)
    };
  }

  setSensitivity(value) {
    this.sensitivity = Math.max(0.1, Math.min(2.0, value));
    console.log(`[ManualRotationController] Sensitivity set to ${this.sensitivity}`);
  }

  getSensitivity() {
    return this.sensitivity;
  }

  isEnabled() {
    return this.enabled;
  }
}
