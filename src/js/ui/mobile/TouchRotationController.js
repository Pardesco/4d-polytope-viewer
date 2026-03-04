/**
 * TouchRotationController - Handles touch gestures for 3D and 4D rotation
 *
 * Mapping:
 * - 1 finger: 3D camera orbit (handled by OrbitControls)
 * - 2 fingers drag: 4D rotation (XY + ZW planes)
 * - 2 fingers pinch: Zoom (handled by OrbitControls)
 */

export class TouchRotationController {
  constructor(viewer) {
    this.viewer = viewer;
    this.lastTouchCenter = null;
    this.isRotating4D = false;

    // We don't use this.touches Map here to keep it simple for MVP
    this.setupTouchListeners();
  }

  setupTouchListeners() {
    const canvas = this.viewer.renderer.domElement;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
  }

  onTouchStart(e) {
    if (e.touches.length === 2) {
      // Initialize 2-finger gesture tracking for 4D rotation
      this.isRotating4D = true;
      this.lastTouchCenter = this.getTouchCenter(e.touches);

      // We might want to disable OrbitControls here if we want exclusive 4D rotation
      // but OrbitControls usually handles 2-finger pinch for zoom.
      // If we want both, we need to be careful.
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 2 && this.isRotating4D) {
      // Prevent default to stop scrolling
      e.preventDefault();

      const currentCenter = this.getTouchCenter(e.touches);
      const deltaX = currentCenter.x - this.lastTouchCenter.x;
      const deltaY = currentCenter.y - this.lastTouchCenter.y;

      // Apply 4D rotation via manual controller if available
      if (this.viewer.manualRotationController) {
        // Sensitivity factor for touch
        const sensitivity = 0.5;
        this.viewer.manualRotationController.applyMouseDelta(
          deltaX * sensitivity,
          deltaY * sensitivity,
          { shiftKey: false, ctrlKey: false }
        );

        // Force update projection since we're in manual mode usually during touch
        this.viewer.updateProjection();
      }

      this.lastTouchCenter = currentCenter;
    }
  }

  onTouchEnd(e) {
    if (e.touches.length < 2) {
      this.isRotating4D = false;
      this.lastTouchCenter = null;
    }
  }

  getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }
}
