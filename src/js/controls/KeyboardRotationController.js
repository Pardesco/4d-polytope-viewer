/**
 * KeyboardRotationController - Keyboard-based 4D rotation control
 *
 * Tier 3: Individual plane control via keyboard
 * W/S - XY, A/D - ZW, Q/E - XW, Arrows - YZ/XZ, Z/C - YW
 */

export class KeyboardRotationController {
  constructor(manualController) {
    this.manualController = manualController;
    this.keysPressed = new Set();
    this.rotationSpeed = 0.02; // radians per frame at 60fps

    // Event listeners
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
  }

  enable() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    console.log('[KeyboardRotationController] Enabled');
  }

  disable() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keysPressed.clear();
    console.log('[KeyboardRotationController] Disabled');
  }

  handleKeyDown(e) {
    // Ignore if typing in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Add to pressed keys
    const key = e.key.toLowerCase();
    this.keysPressed.add(key);

    // Prevent default for arrow keys and WASD
    if (e.key.startsWith('Arrow') || ['w', 'a', 's', 'd', 'q', 'e', 'z', 'c'].includes(key)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    this.keysPressed.delete(e.key.toLowerCase());
  }

  update(rotation, deltaTime) {
    if (this.keysPressed.size === 0) return;

    // Calculate speed adjusted for frame time
    const speed = this.rotationSpeed * (deltaTime * 60); // Normalize to 60fps

    // XY plane (W/S)
    if (this.keysPressed.has('w')) rotation.xy += speed;
    if (this.keysPressed.has('s')) rotation.xy -= speed;

    // ZW plane (A/D)
    if (this.keysPressed.has('a')) rotation.zw -= speed;
    if (this.keysPressed.has('d')) rotation.zw += speed;

    // XW plane (Q/E)
    if (this.keysPressed.has('q')) rotation.xw += speed;
    if (this.keysPressed.has('e')) rotation.xw -= speed;

    // YZ plane (Arrow Up/Down)
    if (this.keysPressed.has('arrowup')) rotation.yz += speed;
    if (this.keysPressed.has('arrowdown')) rotation.yz -= speed;

    // XZ plane (Arrow Left/Right)
    if (this.keysPressed.has('arrowleft')) rotation.xz -= speed;
    if (this.keysPressed.has('arrowright')) rotation.xz += speed;

    // YW plane (Z/C)
    if (this.keysPressed.has('z')) rotation.yw -= speed;
    if (this.keysPressed.has('c')) rotation.yw += speed;
  }

  isAnyKeyPressed() {
    return this.keysPressed.size > 0;
  }
}
