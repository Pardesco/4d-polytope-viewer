/**
 * MouseRotationController - Mouse-based 4D rotation control
 *
 * Tier 1: Mouse drag = Clifford rotation (XY + ZW)
 * Tier 2: Modifier keys for other plane pairs
 * - Shift + drag: XZ + YW
 * - Ctrl + drag: XW + YZ
 */

export class MouseRotationController {
  constructor(manualController) {
    this.manualController = manualController;
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    // Event listeners
    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
  }

  enable() {
    const canvas = this.manualController.viewer.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    console.log('[MouseRotationController] Enabled');
  }

  disable() {
    const canvas = this.manualController.viewer.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.isDragging = false;
    console.log('[MouseRotationController] Disabled');
  }

  handleMouseDown(e) {
    // Only respond to left mouse button
    if (e.button !== 0) return;

    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };

    // Disable 3D rotation when doing 4D manual rotation
    if (this.manualController.viewer.rotating3D) {
      this.manualController.viewer.rotating3D = false;
      console.log('[MouseRotationController] Disabled 3D auto-rotation during manual control');
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouse.x;
    const deltaY = e.clientY - this.lastMouse.y;

    this.manualController.applyMouseDelta(deltaX, deltaY, {
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey
    });

    this.lastMouse = { x: e.clientX, y: e.clientY };
  }

  handleMouseUp(e) {
    if (e.button !== 0) return;

    this.isDragging = false;
  }
}
