# 🎮 4D Polytope Viewer - Manual Rotation Control System

**Project:** `C:\Users\Randall\Documents\polytope-web-app\`  
**Priority:** HIGH - Core missing functionality  
**Estimated Time:** 8-12 hours  
**Expected Outcome:** Intuitive manual control of 4D rotation

---

## 🎯 THE PROBLEM

**Current State:**
- ✅ Auto-rotation works (continuous rotation around planes)
- ❌ No way to manually control 4D rotation
- ❌ Users can't explore specific angles
- ❌ No fine-tuned control over rotation state

**Goal:**
Add manual control that lets users:
1. Interactively rotate the polytope in 4D space using mouse/keyboard
2. Fine-tune rotation angles on all 6 planes
3. Discover interesting configurations through exploration
4. Save/share specific rotation states

---

## 🧠 THE CHALLENGE

**4D Rotation Complexity:**
- 6 rotation planes: XY, XZ, XW, YZ, YW, ZW
- NOT like 3D rotation (which uses 3 axes)
- Rotation happens around PLANES, not axes

**UI/UX Challenges:**
- 6 degrees of freedom = overwhelming with naive approach
- Mouse has only 2 axes (X, Y movement)
- Keyboard shortcuts must be discoverable
- Need to balance simplicity vs power

**Design Constraint:**
Desktop UI is already clean and working. Mobile UI will handle this separately (see MOBILE_UI_TASK.md). This task focuses on DESKTOP implementation.

---

## 💡 RECOMMENDED SOLUTION: Tiered Control System

Implement **progressive complexity** - simple by default, powerful when needed.

### **Tier 1: Mouse Drag = Clifford Rotation** (Simple Mode)
**Default behavior when manual rotation enabled**

**Mapping:**
- Vertical mouse drag → XY plane rotation
- Horizontal mouse drag → ZW plane rotation

**Why this works:**
- XY + ZW = "Clifford torus" rotation (most visually interesting)
- Feels natural (like 3D rotation but IS 4D)
- Single gesture, easy to discover
- Creates beautiful parallel transport effects

**Implementation:**
```javascript
// When user drags mouse on canvas
onMouseDrag(deltaX, deltaY) {
  // Vertical drag rotates XY plane
  rotation4D.xy += deltaY * sensitivity;
  
  // Horizontal drag rotates ZW plane
  rotation4D.zw += deltaX * sensitivity;
}
```

---

### **Tier 2: Modifier Keys = Other Plane Pairs** (Intermediate)
**Hold Shift/Ctrl for different plane combinations**

**Mapping:**
- **No modifier + drag:** XY + ZW (Clifford)
- **Shift + drag:** XZ + YW
- **Ctrl + drag:** XW + YZ

**Why this works:**
- Covers all 6 planes with just 3 gestures
- Modifier keys are discoverable (UI hints)
- Still feels like mouse rotation
- Power users can access advanced rotations

**Implementation:**
```javascript
onMouseDrag(deltaX, deltaY, shiftKey, ctrlKey) {
  if (shiftKey) {
    rotation4D.xz += deltaY * sensitivity;
    rotation4D.yw += deltaX * sensitivity;
  } else if (ctrlKey) {
    rotation4D.xw += deltaY * sensitivity;
    rotation4D.yz += deltaX * sensitivity;
  } else {
    // Default: Clifford rotation
    rotation4D.xy += deltaY * sensitivity;
    rotation4D.zw += deltaX * sensitivity;
  }
}
```

---

### **Tier 3: Keyboard Shortcuts = Individual Planes** (Expert)
**Direct control of each plane via keyboard**

**Recommended Key Mapping:**
```
W/S  - XY plane rotation (+/-)
A/D  - ZW plane rotation (+/-)
Q/E  - XW plane rotation (+/-)
↑/↓  - YZ plane rotation (+/-)
←/→  - XZ plane rotation (+/-)
Z/C  - YW plane rotation (+/-)
```

**Why this layout:**
- WASD familiar (gaming controls)
- Arrow keys for vertical/horizontal planes
- Q/E for "twist" rotation (XW plane)
- Z/C for remaining plane (YW)

**Behavior:**
- Hold key = continuous rotation in that plane
- Multiple keys = compound rotation (e.g., W+D = XY+ZW simultaneously)

**Implementation:**
```javascript
class KeyboardRotationController {
  constructor() {
    this.keysPressed = new Set();
    this.rotationSpeed = 0.02; // radians per frame
  }
  
  onKeyDown(key) {
    this.keysPressed.add(key);
  }
  
  onKeyUp(key) {
    this.keysPressed.delete(key);
  }
  
  update(rotation4D) {
    // XY plane (W/S)
    if (this.keysPressed.has('w')) rotation4D.xy += this.rotationSpeed;
    if (this.keysPressed.has('s')) rotation4D.xy -= this.rotationSpeed;
    
    // ZW plane (A/D)
    if (this.keysPressed.has('a')) rotation4D.zw -= this.rotationSpeed;
    if (this.keysPressed.has('d')) rotation4D.zw += this.rotationSpeed;
    
    // XW plane (Q/E)
    if (this.keysPressed.has('q')) rotation4D.xw += this.rotationSpeed;
    if (this.keysPressed.has('e')) rotation4D.xw -= this.rotationSpeed;
    
    // YZ plane (Arrow Up/Down)
    if (this.keysPressed.has('ArrowUp')) rotation4D.yz += this.rotationSpeed;
    if (this.keysPressed.has('ArrowDown')) rotation4D.yz -= this.rotationSpeed;
    
    // XZ plane (Arrow Left/Right)
    if (this.keysPressed.has('ArrowLeft')) rotation4D.xz -= this.rotationSpeed;
    if (this.keysPressed.has('ArrowRight')) rotation4D.xz += this.rotationSpeed;
    
    // YW plane (Z/C)
    if (this.keysPressed.has('z')) rotation4D.yw -= this.rotationSpeed;
    if (this.keysPressed.has('c')) rotation4D.yw += this.rotationSpeed;
  }
}
```

---

### **Tier 4: Preset Buttons = Quick Access** (Convenience)
**One-click access to interesting rotation configurations**

**Recommended Presets:**
```javascript
const ROTATION_PRESETS = {
  'identity': {
    name: 'Identity (No Rotation)',
    angles: { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 }
  },
  'clifford45': {
    name: 'Clifford Torus',
    angles: { xy: 45, xz: 0, xw: 0, yz: 0, yw: 0, zw: 45 }
  },
  'hopf': {
    name: 'Hopf Rotation',
    angles: { xy: 0, xz: 30, xw: 0, yz: 0, yw: 30, zw: 0 }
  },
  'doubleRotation': {
    name: 'Double Rotation',
    angles: { xy: 30, xz: 30, xw: 0, yz: 0, yw: 0, zw: 30 }
  },
  'isoclinic': {
    name: 'Isoclinic',
    angles: { xy: 30, xz: 30, xw: 30, yz: 30, yw: 30, zw: 30 }
  }
};
```

**UI Placement:**
```
Rotation Presets:
[Identity] [Clifford] [Hopf] [Double] [Isoclinic] [Random]
```

**Smooth Animation:**
When preset clicked, smoothly animate from current rotation to preset rotation (not instant jump).

---

## 🎨 UI DESIGN SPECIFICATION

### **Control Panel Section - Manual Rotation**

```
┌─────────────────────────────┐
│ 4D Rotation Control         │
├─────────────────────────────┤
│ Mode:                       │
│ ○ Auto Rotate  ● Manual     │
├─────────────────────────────┤
│ Manual Control:             │
│ 🖱️  Mouse: XY + ZW         │
│ ⇧  Shift: XZ + YW          │
│ ^  Ctrl:  XW + YZ          │
│ [?] Keyboard Shortcuts      │
├─────────────────────────────┤
│ Current Angles:             │
│ XY: 45.2°  XZ: 0.0°        │
│ XW: 30.1°  YZ: 0.0°        │
│ YW: 15.3°  ZW: 45.2°       │
│                             │
│ [Reset All] [Copy Angles]  │
├─────────────────────────────┤
│ Presets:                    │
│ [Clifford] [Hopf] [Double] │
│ [Isoclinic] [Random]       │
├─────────────────────────────┤
│ Sensitivity: ████░░░  0.5  │
└─────────────────────────────┘
```

### **Keyboard Shortcuts Overlay (Press '?')**

```
┌────────────────────────────────┐
│   4D ROTATION SHORTCUTS        │
│                                │
│ === MANUAL ROTATION ===        │
│ Mouse Drag    - XY + ZW        │
│ Shift + Drag  - XZ + YW        │
│ Ctrl + Drag   - XW + YZ        │
│                                │
│ === KEYBOARD CONTROL ===       │
│ W / S    - XY plane           │
│ A / D    - ZW plane           │
│ Q / E    - XW plane           │
│ ↑ / ↓    - YZ plane           │
│ ← / →    - XZ plane           │
│ Z / C    - YW plane           │
│                                │
│ === QUICK ACTIONS ===          │
│ R        - Reset rotation     │
│ Space    - Toggle auto/manual │
│ ?        - Show/hide help     │
│                                │
│ Press any key to close         │
└────────────────────────────────┘
```

---

## 📁 FILE STRUCTURE

### **New Files to Create:**

```
src/js/controls/
├── ManualRotationController.js   (NEW) - Main controller class
├── KeyboardRotationController.js (NEW) - Keyboard input handler
├── MouseRotationController.js    (NEW) - Mouse drag handler
└── RotationPresets.js            (NEW) - Preset configurations
```

### **Files to Modify:**

```
src/js/
├── polytope/viewer.js            (MODIFY) - Integration point
├── ui/controls.js                (MODIFY) - UI bindings
└── main.js                       (MODIFY) - Initialize controllers

src/styles/
└── main.css                      (MODIFY) - UI styling
```

---

## 🛠️ IMPLEMENTATION GUIDE

### **Step 1: Create ManualRotationController**

**File:** `src/js/controls/ManualRotationController.js`

```javascript
import { MouseRotationController } from './MouseRotationController.js';
import { KeyboardRotationController } from './KeyboardRotationController.js';
import { RotationPresets } from './RotationPresets.js';

export class ManualRotationController {
  constructor(viewer) {
    this.viewer = viewer;
    this.enabled = false;
    this.sensitivity = 0.5; // User-adjustable
    
    // Sub-controllers
    this.mouseController = new MouseRotationController(this);
    this.keyboardController = new KeyboardRotationController(this);
    
    // State
    this.rotation = {
      xy: 0, xz: 0, xw: 0,
      yz: 0, yw: 0, zw: 0
    };
    
    // Animation state (for smooth preset transitions)
    this.animatingToTarget = false;
    this.targetRotation = null;
    this.animationProgress = 0;
  }
  
  enable() {
    this.enabled = true;
    this.mouseController.enable();
    this.keyboardController.enable();
    
    // Copy current auto-rotation state to manual
    if (this.viewer.rotation4D) {
      this.rotation = { ...this.viewer.rotation4D };
    }
  }
  
  disable() {
    this.enabled = false;
    this.mouseController.disable();
    this.keyboardController.disable();
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
    
    // Apply rotation to viewer
    this.viewer.rotation4D = { ...this.rotation };
    this.viewer.needsUpdate = true;
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
    
    this.viewer.rotation4D = { ...this.rotation };
    this.viewer.needsUpdate = true;
  }
  
  applyPreset(presetName) {
    const preset = RotationPresets.get(presetName);
    if (!preset) return;
    
    // Start smooth animation to preset
    this.targetRotation = { ...preset.angles };
    this.animatingToTarget = true;
    this.animationProgress = 0;
  }
  
  updatePresetAnimation(deltaTime) {
    // Smooth interpolation (ease-out)
    this.animationProgress += deltaTime * 2; // 0.5 second animation
    
    if (this.animationProgress >= 1) {
      // Animation complete
      this.rotation = { ...this.targetRotation };
      this.animatingToTarget = false;
      this.targetRotation = null;
    } else {
      // Interpolate (ease-out cubic)
      const t = this.animationProgress;
      const eased = 1 - Math.pow(1 - t, 3);
      
      // Interpolate each plane
      for (let plane in this.rotation) {
        const start = this.rotation[plane];
        const end = this.targetRotation[plane];
        this.rotation[plane] = start + (end - start) * eased;
      }
    }
    
    this.viewer.rotation4D = { ...this.rotation };
    this.viewer.needsUpdate = true;
  }
  
  reset() {
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
  }
}
```

---

### **Step 2: Create MouseRotationController**

**File:** `src/js/controls/MouseRotationController.js`

```javascript
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
  }
  
  disable() {
    const canvas = this.manualController.viewer.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.isDragging = false;
  }
  
  handleMouseDown(e) {
    // Only respond to left mouse button
    if (e.button !== 0) return;
    
    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    
    // Prevent orbit controls from interfering
    if (this.manualController.viewer.orbitControls) {
      this.manualController.viewer.orbitControls.enabled = false;
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
    
    // Re-enable orbit controls
    if (this.manualController.viewer.orbitControls) {
      this.manualController.viewer.orbitControls.enabled = true;
    }
  }
}
```

---

### **Step 3: Create KeyboardRotationController**

**File:** `src/js/controls/KeyboardRotationController.js`

```javascript
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
  }
  
  disable() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keysPressed.clear();
  }
  
  handleKeyDown(e) {
    // Ignore if typing in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Add to pressed keys
    this.keysPressed.add(e.key.toLowerCase());
    
    // Prevent default for arrow keys
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
    }
  }
  
  handleKeyUp(e) {
    this.keysPressed.delete(e.key.toLowerCase());
  }
  
  update(rotation, deltaTime) {
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
```

---

### **Step 4: Create RotationPresets**

**File:** `src/js/controls/RotationPresets.js`

```javascript
export class RotationPresets {
  static presets = {
    identity: {
      name: 'Identity',
      description: 'No rotation (default view)',
      angles: { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 }
    },
    
    clifford45: {
      name: 'Clifford Torus',
      description: 'Classic Clifford parallel transport',
      angles: { xy: 45, xz: 0, xw: 0, yz: 0, yw: 0, zw: 45 }
    },
    
    hopf: {
      name: 'Hopf Rotation',
      description: 'Hopf fibration-inspired rotation',
      angles: { xy: 0, xz: 30, xw: 0, yz: 0, yw: 30, zw: 0 }
    },
    
    doubleRotation: {
      name: 'Double Rotation',
      description: 'Three simultaneous plane rotations',
      angles: { xy: 30, xz: 30, xw: 0, yz: 0, yw: 0, zw: 30 }
    },
    
    isoclinic: {
      name: 'Isoclinic',
      description: 'Equal rotation on all planes',
      angles: { xy: 30, xz: 30, xw: 30, yz: 30, yw: 30, zw: 30 }
    }
  };
  
  static get(name) {
    return this.presets[name] || null;
  }
  
  static getAll() {
    return Object.keys(this.presets).map(key => ({
      key,
      ...this.presets[key]
    }));
  }
  
  static getRandom() {
    const random = () => Math.random() * 90 - 45; // -45 to 45 degrees
    return {
      name: 'Random',
      description: 'Random rotation configuration',
      angles: {
        xy: random(),
        xz: random(),
        xw: random(),
        yz: random(),
        yw: random(),
        zw: random()
      }
    };
  }
}
```

---

### **Step 5: Integration with Viewer**

**Modify:** `src/js/polytope/viewer.js`

```javascript
import { ManualRotationController } from '../controls/ManualRotationController.js';

export class PolytopeViewer {
  constructor(container) {
    // ... existing initialization ...
    
    // Add manual rotation controller
    this.manualRotationController = new ManualRotationController(this);
    this.rotationMode = 'auto'; // 'auto' or 'manual'
    
    // ... rest of initialization ...
  }
  
  setRotationMode(mode) {
    this.rotationMode = mode;
    
    if (mode === 'manual') {
      this.autoRotationEnabled = false;
      this.manualRotationController.enable();
    } else {
      this.manualRotationController.disable();
      this.autoRotationEnabled = true;
    }
  }
  
  update(deltaTime) {
    // ... existing code ...
    
    if (this.rotationMode === 'manual') {
      this.manualRotationController.update(deltaTime);
    }
    
    // ... rest of update logic ...
  }
}
```

---

### **Step 6: UI Controls**

**Modify:** `src/js/ui/controls.js`

Add UI elements and event handlers:

```javascript
export function initializeRotationControls(viewer) {
  // Radio buttons for mode selection
  const autoRadio = document.getElementById('rotation-mode-auto');
  const manualRadio = document.getElementById('rotation-mode-manual');
  
  autoRadio.addEventListener('change', () => {
    if (autoRadio.checked) {
      viewer.setRotationMode('auto');
    }
  });
  
  manualRadio.addEventListener('change', () => {
    if (manualRadio.checked) {
      viewer.setRotationMode('manual');
    }
  });
  
  // Preset buttons
  const presetButtons = document.querySelectorAll('.rotation-preset-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      viewer.manualRotationController.applyPreset(presetName);
    });
  });
  
  // Reset button
  const resetBtn = document.getElementById('rotation-reset');
  resetBtn.addEventListener('click', () => {
    viewer.manualRotationController.reset();
  });
  
  // Sensitivity slider
  const sensitivitySlider = document.getElementById('rotation-sensitivity');
  sensitivitySlider.addEventListener('input', () => {
    const value = parseFloat(sensitivitySlider.value);
    viewer.manualRotationController.setSensitivity(value);
  });
  
  // Update angle display (every frame)
  function updateAngleDisplay() {
    if (viewer.rotationMode === 'manual') {
      const angles = viewer.manualRotationController.getAnglesInDegrees();
      document.getElementById('angle-xy').textContent = angles.xy + '°';
      document.getElementById('angle-xz').textContent = angles.xz + '°';
      document.getElementById('angle-xw').textContent = angles.xw + '°';
      document.getElementById('angle-yz').textContent = angles.yz + '°';
      document.getElementById('angle-yw').textContent = angles.yw + '°';
      document.getElementById('angle-zw').textContent = angles.zw + '°';
    }
    requestAnimationFrame(updateAngleDisplay);
  }
  updateAngleDisplay();
  
  // Keyboard shortcuts help (press '?')
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      toggleKeyboardShortcutsOverlay();
    }
  });
}

function toggleKeyboardShortcutsOverlay() {
  const overlay = document.getElementById('keyboard-shortcuts-overlay');
  overlay.classList.toggle('hidden');
}
```

---

## 🎨 HTML ADDITIONS

Add to `viewer.html`:

```html
<!-- Rotation Control Panel Section -->
<div class="control-section" id="rotation-controls">
  <h3>4D Rotation Control</h3>
  
  <!-- Mode Selection -->
  <div class="rotation-mode">
    <label>
      <input type="radio" name="rotation-mode" id="rotation-mode-auto" value="auto" checked>
      Auto Rotate
    </label>
    <label>
      <input type="radio" name="rotation-mode" id="rotation-mode-manual" value="manual">
      Manual
    </label>
  </div>
  
  <!-- Manual Control Instructions -->
  <div id="manual-instructions" class="hidden">
    <p class="control-hint">
      <span class="icon">🖱️</span> Mouse: XY + ZW<br>
      <span class="icon">⇧</span> Shift: XZ + YW<br>
      <span class="icon">^</span> Ctrl: XW + YZ<br>
      <button class="link-button" onclick="toggleKeyboardShortcutsOverlay()">
        [?] Keyboard Shortcuts
      </button>
    </p>
  </div>
  
  <!-- Current Angles Display -->
  <div class="angle-display">
    <h4>Current Angles:</h4>
    <div class="angle-grid">
      <span>XY: <strong id="angle-xy">0.0°</strong></span>
      <span>XZ: <strong id="angle-xz">0.0°</strong></span>
      <span>XW: <strong id="angle-xw">0.0°</strong></span>
      <span>YZ: <strong id="angle-yz">0.0°</strong></span>
      <span>YW: <strong id="angle-yw">0.0°</strong></span>
      <span>ZW: <strong id="angle-zw">0.0°</strong></span>
    </div>
  </div>
  
  <!-- Quick Actions -->
  <div class="rotation-actions">
    <button id="rotation-reset" class="btn btn-secondary">Reset All</button>
  </div>
  
  <!-- Presets -->
  <div class="rotation-presets">
    <h4>Presets:</h4>
    <div class="preset-buttons">
      <button class="btn btn-preset rotation-preset-btn" data-preset="clifford45">Clifford</button>
      <button class="btn btn-preset rotation-preset-btn" data-preset="hopf">Hopf</button>
      <button class="btn btn-preset rotation-preset-btn" data-preset="doubleRotation">Double</button>
      <button class="btn btn-preset rotation-preset-btn" data-preset="isoclinic">Isoclinic</button>
    </div>
  </div>
  
  <!-- Sensitivity Slider -->
  <div class="sensitivity-control">
    <label for="rotation-sensitivity">Sensitivity:</label>
    <input type="range" id="rotation-sensitivity" min="0.1" max="2.0" step="0.1" value="0.5">
    <span id="sensitivity-value">0.5</span>
  </div>
</div>

<!-- Keyboard Shortcuts Overlay -->
<div id="keyboard-shortcuts-overlay" class="overlay hidden">
  <div class="overlay-content">
    <h2>4D Rotation Shortcuts</h2>
    
    <section>
      <h3>Manual Rotation</h3>
      <p>Mouse Drag - XY + ZW</p>
      <p>Shift + Drag - XZ + YW</p>
      <p>Ctrl + Drag - XW + YZ</p>
    </section>
    
    <section>
      <h3>Keyboard Control</h3>
      <p>W / S - XY plane</p>
      <p>A / D - ZW plane</p>
      <p>Q / E - XW plane</p>
      <p>↑ / ↓ - YZ plane</p>
      <p>← / → - XZ plane</p>
      <p>Z / C - YW plane</p>
    </section>
    
    <section>
      <h3>Quick Actions</h3>
      <p>R - Reset rotation</p>
      <p>Space - Toggle auto/manual</p>
      <p>? - Show/hide this help</p>
    </section>
    
    <button class="btn btn-primary" onclick="toggleKeyboardShortcutsOverlay()">Close</button>
  </div>
</div>
```

---

## 🧪 TESTING CHECKLIST

**Tier 1 (Mouse) Testing:**
- [ ] Dragging mouse vertically rotates XY plane
- [ ] Dragging mouse horizontally rotates ZW plane
- [ ] Rotation is smooth and responsive
- [ ] Sensitivity slider affects rotation speed
- [ ] 3D orbit controls disabled during 4D rotation drag

**Tier 2 (Modifiers) Testing:**
- [ ] Shift + drag rotates XZ and YW planes
- [ ] Ctrl + drag rotates XW and YZ planes
- [ ] Modifier hints visible in UI
- [ ] Combinations work correctly

**Tier 3 (Keyboard) Testing:**
- [ ] All 12 keys (W/S, A/D, Q/E, arrows, Z/C) rotate correct planes
- [ ] Holding multiple keys creates compound rotation
- [ ] Key release stops rotation immediately
- [ ] No conflict with other keyboard shortcuts
- [ ] Keyboard doesn't trigger when typing in inputs

**Tier 4 (Presets) Testing:**
- [ ] All preset buttons apply correct angles
- [ ] Smooth animation from current to preset (not instant)
- [ ] Animation takes ~0.5 seconds
- [ ] Reset button returns to identity (0,0,0,0,0,0)

**UI Testing:**
- [ ] Mode toggle (auto/manual) works
- [ ] Angle display updates in real-time
- [ ] Keyboard shortcuts overlay shows/hides with '?'
- [ ] Sensitivity slider updates rotation speed
- [ ] Manual instructions visible only when manual mode active

**Edge Cases:**
- [ ] Switching from manual to auto preserves rotation state
- [ ] Switching from auto to manual preserves rotation state
- [ ] Multiple rapid preset clicks don't break animation
- [ ] Dragging while keyboard keys held combines correctly

---

## 🎯 SUCCESS CRITERIA

**The manual rotation system is complete when:**
- ✅ Users can rotate polytope manually with mouse (Tier 1)
- ✅ Modifier keys enable access to all 6 planes (Tier 2)
- ✅ Keyboard shortcuts work for all planes (Tier 3)
- ✅ Presets apply with smooth animation (Tier 4)
- ✅ UI clearly shows current rotation state
- ✅ Mode switching (auto/manual) is seamless
- ✅ No conflicts with existing 3D camera controls
- ✅ Performance remains 50-60 FPS during manual rotation

---

## 🚀 NEXT STEPS

After manual rotation is working:
1. Test with different polytopes (simple and complex)
2. Gather user feedback on control scheme
3. Consider adding URL state persistence (share rotation angles)
4. Move to Mobile UI implementation (touch gestures for 4D rotation)

---

**Ready to implement. Good luck! 🎮**
