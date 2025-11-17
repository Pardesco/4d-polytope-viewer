# 📱 4D Polytope Viewer - Mobile & Tablet UI Optimization

**Project:** `C:\Users\Randall\Documents\polytope-web-app\`  
**Priority:** HIGH - App currently unusable on mobile/tablet  
**Estimated Time:** 6-10 hours  
**Expected Outcome:** Beautiful, functional mobile experience

---

## 🎯 THE PROBLEM

**Current State:**
- ✅ Desktop UI works beautifully (glassmorphism panels, spacious controls)
- ❌ Tablet UI: Control panels block 60-80% of screen
- ❌ Mobile UI: Control panels completely block polytope view
- ❌ Users cannot see polytope while adjusting settings
- ❌ Touch targets too small (< 44px)
- ❌ No touch gestures for 4D rotation

**User Experience Issues:**
```
Mobile (375px width):
┌─────────────┐
│█████████████│ ← Control panel (80%)
│█████████████│
│█████████████│
│█████████████│
│   [polytope]│ ← Only 20% visible!
│   [polytope]│
└─────────────┘
```

**Goal:**
Transform mobile experience to maximize polytope visibility while keeping all controls accessible.

---

## 💡 RECOMMENDED SOLUTION: Bottom Sheet + FAB

**Design Pattern:**
- **Floating Action Button (FAB)** - Always visible, opens controls
- **Bottom Sheet** - Slides up from bottom with 3 states (hidden/peek/full)
- **Minimal Overlay** - When sheet hidden, only FPS/name visible

**Benefits:**
- ✅ Polytope gets 100% screen when controls hidden
- ✅ All controls accessible via bottom sheet
- ✅ Touch-friendly (48px+ targets)
- ✅ Native mobile pattern (familiar to users)
- ✅ Works on both phone and tablet

**Visual Reference:**
```
State 1: HIDDEN (default)
┌─────────────────┐
│ [FPS] [Name]    │ ← Minimal overlay
│                 │
│   [POLYTOPE]    │ ← Full screen!
│   [FULL VIEW]   │
│                 │
│            [FAB]│ ← Settings button
└─────────────────┘

State 2: PEEK (30% height)
┌─────────────────┐
│   [POLYTOPE]    │ ← 70% visible
├─────────────────┤
│ [Handle ═══]    │ ← Drag handle
│ Quick Controls: │
│ [Projection]    │ ← Most-used only
│ [Start Rotation]│
└─────────────────┘

State 3: FULL (80% height)
┌─────────────────┐
│ [Small Polytope]│ ← 20% still visible
├─────────────────┤
│ [Handle ═══]    │
│                 │
│ All Controls:   │ ← Scrollable
│ 📊 Statistics   │
│ 🎨 Rendering    │
│ 🔄 Rotation     │
│ (scroll down)   │
└─────────────────┘
```

---

## 🎨 COMPONENT SPECIFICATIONS

### **1. Floating Action Button (FAB)**

**Visual Design:**
- Size: 56x56px (iOS standard, 60x60px Android)
- Position: Fixed bottom-right, 20px from edges
- Background: Purple/pink gradient (brand colors)
- Icon: Settings gear or hamburger menu
- Shadow: Elevated (8px blur, 30% opacity)
- Z-index: 1000

**Behavior:**
- Tap: Toggle bottom sheet (hidden → peek → full → hidden)
- Long press: Jump directly to full sheet
- Visual feedback: Scale down on press, rotate on open
- Badge: Show polytope name (e.g., "2-Tes")

**Implementation:**
```javascript
class FloatingActionButton {
  constructor() {
    this.element = this.create();
    this.state = 'closed'; // 'closed', 'peek', 'full'
  }
  
  create() {
    const fab = document.createElement('button');
    fab.className = 'mobile-fab';
    fab.innerHTML = `
      <svg class="fab-icon" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <span class="fab-badge">2-Tes</span>
    `;
    
    fab.addEventListener('click', () => this.onClick());
    fab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.onLongPress();
    });
    
    document.body.appendChild(fab);
    return fab;
  }
  
  onClick() {
    // Cycle through states
    const states = ['closed', 'peek', 'full'];
    const currentIndex = states.indexOf(this.state);
    const nextIndex = (currentIndex + 1) % states.length;
    this.setState(states[nextIndex]);
  }
  
  onLongPress() {
    // Jump to full
    this.setState('full');
  }
  
  setState(newState) {
    this.state = newState;
    
    // Rotate icon
    const rotation = {
      'closed': 0,
      'peek': 180,
      'full': 360
    };
    this.element.style.transform = `rotate(${rotation[newState]}deg)`;
    
    // Emit event for bottom sheet
    document.dispatchEvent(new CustomEvent('fab-state-change', {
      detail: { state: newState }
    }));
  }
  
  updateBadge(polytopeName) {
    const badge = this.element.querySelector('.fab-badge');
    badge.textContent = polytopeName;
  }
}
```

**CSS:**
```css
.mobile-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  border: none;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
  z-index: 1000;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: none; /* Hidden on desktop */
}

.mobile-fab:active {
  transform: scale(0.9);
}

.fab-icon {
  width: 24px;
  height: 24px;
  fill: white;
}

.fab-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: rgba(15, 23, 42, 0.9);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
}

/* Show only on mobile/tablet */
@media (max-width: 1023px) {
  .mobile-fab {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

---

### **2. Bottom Sheet Panel**

**Visual Design:**
- Width: 100vw (full width)
- Heights:
  - Hidden: `translateY(100%)`
  - Peek: 30vh (30% of viewport)
  - Full: 80vh (80% of viewport)
- Background: `rgba(15, 23, 42, 0.95)` + backdrop blur
- Border radius: 16px top corners only
- Z-index: 1001 (above FAB)
- Transition: 0.3s cubic-bezier ease

**Structure:**
```html
<div class="bottom-sheet" data-state="hidden">
  <!-- Drag Handle -->
  <div class="bottom-sheet-handle"></div>
  
  <!-- Peek View Content -->
  <div class="bottom-sheet-peek">
    <h3>Quick Controls</h3>
    <button class="control-btn">Toggle Projection</button>
    <button class="control-btn">Start/Stop Rotation</button>
    <select class="control-select">
      <option>XY Plane</option>
      <option>ZW Plane</option>
      <!-- ... -->
    </select>
    <p class="hint">Swipe up for more controls ↑</p>
  </div>
  
  <!-- Full View Content (scrollable) -->
  <div class="bottom-sheet-full">
    <div class="bottom-sheet-scroll">
      <!-- Accordion sections -->
      <section class="control-section">
        <h3 class="section-header">📊 Statistics</h3>
        <div class="section-content">
          <!-- Stats here -->
        </div>
      </section>
      
      <section class="control-section">
        <h3 class="section-header">🎨 Rendering</h3>
        <div class="section-content">
          <!-- Rendering controls -->
        </div>
      </section>
      
      <section class="control-section">
        <h3 class="section-header">🔄 Rotation</h3>
        <div class="section-content">
          <!-- Rotation controls -->
        </div>
      </section>
      
      <section class="control-section">
        <h3 class="section-header">⚙️ Settings</h3>
        <div class="section-content">
          <!-- Settings -->
        </div>
      </section>
    </div>
  </div>
</div>
```

**Implementation:**
```javascript
class BottomSheet {
  constructor() {
    this.element = document.querySelector('.bottom-sheet');
    this.state = 'hidden';
    this.isDragging = false;
    this.startY = 0;
    this.currentY = 0;
    
    this.setupGestures();
    this.setupFABListener();
  }
  
  setupGestures() {
    const handle = this.element.querySelector('.bottom-sheet-handle');
    
    // Touch events for dragging
    handle.addEventListener('touchstart', (e) => this.onDragStart(e));
    handle.addEventListener('touchmove', (e) => this.onDragMove(e));
    handle.addEventListener('touchend', (e) => this.onDragEnd(e));
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.state !== 'hidden' && !this.element.contains(e.target) && 
          !e.target.classList.contains('mobile-fab')) {
        this.setState('hidden');
      }
    });
  }
  
  setupFABListener() {
    document.addEventListener('fab-state-change', (e) => {
      this.setState(e.detail.state);
    });
  }
  
  onDragStart(e) {
    this.isDragging = true;
    this.startY = e.touches[0].clientY;
    this.currentY = this.startY;
  }
  
  onDragMove(e) {
    if (!this.isDragging) return;
    
    this.currentY = e.touches[0].clientY;
    const deltaY = this.currentY - this.startY;
    
    // Apply transform to follow finger
    if (deltaY > 0) { // Only allow dragging down
      this.element.style.transform = `translateY(${deltaY}px)`;
    }
  }
  
  onDragEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    const deltaY = this.currentY - this.startY;
    const threshold = 50; // pixels
    
    // Determine new state based on swipe
    if (deltaY > threshold) {
      // Swiped down
      if (this.state === 'full') {
        this.setState('peek');
      } else if (this.state === 'peek') {
        this.setState('hidden');
      }
    } else if (deltaY < -threshold) {
      // Swiped up
      if (this.state === 'hidden') {
        this.setState('peek');
      } else if (this.state === 'peek') {
        this.setState('full');
      }
    }
    
    // Reset transform (let CSS transition handle it)
    this.element.style.transform = '';
  }
  
  setState(newState) {
    this.state = newState;
    this.element.setAttribute('data-state', newState);
    
    // Show/hide content based on state
    const peekContent = this.element.querySelector('.bottom-sheet-peek');
    const fullContent = this.element.querySelector('.bottom-sheet-full');
    
    if (newState === 'peek') {
      peekContent.style.display = 'block';
      fullContent.style.display = 'none';
    } else if (newState === 'full') {
      peekContent.style.display = 'none';
      fullContent.style.display = 'block';
    }
  }
}
```

**CSS:**
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px 16px 0 0;
  z-index: 1001;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: none; /* Hidden on desktop */
}

.bottom-sheet[data-state="hidden"] {
  transform: translateY(100%);
}

.bottom-sheet[data-state="peek"] {
  transform: translateY(calc(100% - 30vh));
}

.bottom-sheet[data-state="full"] {
  transform: translateY(calc(100% - 80vh));
}

/* Drag Handle */
.bottom-sheet-handle {
  width: 40px;
  height: 4px;
  background: rgba(139, 92, 246, 0.5);
  border-radius: 2px;
  margin: 8px auto;
  cursor: grab;
}

.bottom-sheet-handle:active {
  cursor: grabbing;
}

/* Peek Content */
.bottom-sheet-peek {
  padding: 16px 20px;
  max-height: calc(30vh - 24px);
  overflow-y: auto;
}

/* Full Content */
.bottom-sheet-full {
  height: calc(80vh - 24px);
  display: none;
}

.bottom-sheet-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 16px 20px;
}

/* Control Buttons (touch-friendly) */
.control-btn {
  width: 100%;
  min-height: 48px; /* iOS/Android minimum */
  margin: 8px 0;
  padding: 12px 16px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.control-btn:active {
  background: rgba(139, 92, 246, 0.4);
}

/* Accordion Sections */
.control-section {
  margin-bottom: 16px;
}

.section-header {
  padding: 12px 16px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  margin: 0 0 8px 0;
}

.section-content {
  padding: 8px 16px;
  display: none;
}

.control-section.expanded .section-content {
  display: block;
}

/* Show only on mobile/tablet */
@media (max-width: 1023px) {
  .bottom-sheet {
    display: block;
  }
}
```

---

### **3. Minimal Overlay (When Sheet Hidden)**

**Components:**
- FPS counter (top-left)
- Polytope name (top-center)
- Warning icon if needed (top-right)

**Behavior:**
- Always visible when sheet hidden
- Auto-hides after 3 seconds of no interaction
- Reappears on touch/move

**Implementation:**
```javascript
class MinimalOverlay {
  constructor() {
    this.element = this.create();
    this.autoHideTimer = null;
    this.visible = true;
    
    this.setupAutoHide();
  }
  
  create() {
    const overlay = document.createElement('div');
    overlay.className = 'minimal-overlay';
    overlay.innerHTML = `
      <div class="overlay-left">
        <span class="fps-counter">60 FPS</span>
      </div>
      <div class="overlay-center">
        <span class="polytope-name">2-Tesseract</span>
      </div>
      <div class="overlay-right">
        <span class="warning-icon hidden">⚠️</span>
      </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  }
  
  setupAutoHide() {
    // Show on any interaction
    document.addEventListener('touchstart', () => this.show());
    document.addEventListener('touchmove', () => this.show());
    
    // Initial auto-hide
    this.resetAutoHide();
  }
  
  show() {
    this.visible = true;
    this.element.classList.remove('hidden');
    this.resetAutoHide();
  }
  
  hide() {
    this.visible = false;
    this.element.classList.add('hidden');
  }
  
  resetAutoHide() {
    clearTimeout(this.autoHideTimer);
    this.autoHideTimer = setTimeout(() => this.hide(), 3000);
  }
  
  updateFPS(fps) {
    const counter = this.element.querySelector('.fps-counter');
    counter.textContent = `${Math.round(fps)} FPS`;
  }
  
  updatePolytope(name) {
    const nameElement = this.element.querySelector('.polytope-name');
    nameElement.textContent = name;
  }
  
  showWarning(show) {
    const warning = this.element.querySelector('.warning-icon');
    warning.classList.toggle('hidden', !show);
  }
}
```

**CSS:**
```css
.minimal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 48px;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  z-index: 999;
  transition: opacity 0.3s;
  display: none; /* Hidden on desktop */
}

.minimal-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

.fps-counter,
.polytope-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.warning-icon {
  font-size: 18px;
}

/* Show only on mobile/tablet */
@media (max-width: 1023px) {
  .minimal-overlay {
    display: flex;
  }
}
```

---

### **4. Touch Gestures for 4D Rotation**

**Gesture Mapping:**
- **1 finger drag:** 3D camera orbit (unchanged)
- **2 finger drag:** 4D rotation (XY + ZW Clifford)
- **2 finger twist:** Additional ZW rotation
- **Pinch zoom:** Camera zoom in/out

**Implementation:**
```javascript
class TouchRotationController {
  constructor(viewer) {
    this.viewer = viewer;
    this.touches = new Map();
    this.lastTouchCenter = null;
    this.lastTouchAngle = 0;
    this.lastPinchDistance = 0;
    
    this.setupTouchListeners();
  }
  
  setupTouchListeners() {
    const canvas = this.viewer.renderer.domElement;
    
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }
  
  onTouchStart(e) {
    // Store all touch points
    for (let touch of e.touches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY
      });
    }
    
    if (e.touches.length === 2) {
      // Initialize 2-finger gesture tracking
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      this.lastTouchCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      this.lastTouchAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      );
      
      this.lastPinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      // Disable orbit controls for 4D rotation
      this.viewer.orbitControls.enabled = false;
    }
  }
  
  onTouchMove(e) {
    e.preventDefault(); // Prevent scrolling
    
    if (e.touches.length === 1) {
      // Single finger: 3D camera orbit (handled by OrbitControls)
      this.viewer.orbitControls.enabled = true;
    } 
    else if (e.touches.length === 2) {
      // Two fingers: 4D rotation + pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate current center
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      // Calculate center movement (for XY/ZW rotation)
      const deltaX = currentCenter.x - this.lastTouchCenter.x;
      const deltaY = currentCenter.y - this.lastTouchCenter.y;
      
      // Apply 4D rotation (Clifford)
      if (this.viewer.manualRotationController) {
        this.viewer.manualRotationController.applyMouseDelta(
          deltaX, 
          deltaY, 
          { shiftKey: false, ctrlKey: false }
        );
      }
      
      // Calculate rotation angle (for twist gesture)
      const currentAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      );
      const angleDelta = currentAngle - this.lastTouchAngle;
      
      // Apply twist as additional ZW rotation
      if (Math.abs(angleDelta) > 0.01) {
        this.viewer.rotation4D.zw += angleDelta * 0.5;
      }
      
      // Calculate pinch distance (for zoom)
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const distanceDelta = currentDistance - this.lastPinchDistance;
      
      // Apply zoom
      const zoomSpeed = 0.01;
      this.viewer.camera.position.z -= distanceDelta * zoomSpeed;
      
      // Update tracking values
      this.lastTouchCenter = currentCenter;
      this.lastTouchAngle = currentAngle;
      this.lastPinchDistance = currentDistance;
    }
  }
  
  onTouchEnd(e) {
    // Remove ended touches
    for (let touch of e.changedTouches) {
      this.touches.delete(touch.identifier);
    }
    
    // Re-enable orbit controls if no touches left
    if (e.touches.length === 0) {
      this.viewer.orbitControls.enabled = true;
    }
  }
}
```

---

## 📁 FILE STRUCTURE

### **New Files to Create:**

```
src/js/ui/mobile/
├── BottomSheet.js              (NEW) - Bottom sheet component
├── FloatingActionButton.js     (NEW) - FAB component
├── MinimalOverlay.js           (NEW) - Top overlay
├── TouchRotationController.js  (NEW) - Touch gestures
└── MobileUIManager.js          (NEW) - Coordinates all mobile UI

src/styles/mobile/
└── mobile-ui.css               (NEW) - Mobile-specific styles
```

### **Files to Modify:**

```
src/js/
├── main.js                     (MODIFY) - Initialize mobile UI
└── polytope/viewer.js          (MODIFY) - Add touch controller

src/styles/
└── main.css                    (MODIFY) - Import mobile styles

viewer.html                     (MODIFY) - Add mobile markup
```

---

## 🛠️ IMPLEMENTATION STEPS

### **Step 1: Create Media Query Detection**

**File:** `src/js/ui/mobile/MobileUIManager.js`

```javascript
export class MobileUIManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.isMobile = this.detectMobile();
    this.isTablet = this.detectTablet();
    
    if (this.isMobile || this.isTablet) {
      this.initializeMobileUI();
    }
  }
  
  detectMobile() {
    return window.innerWidth < 768;
  }
  
  detectTablet() {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }
  
  initializeMobileUI() {
    // Hide desktop panels
    this.hideDesktopPanels();
    
    // Create mobile components
    this.fab = new FloatingActionButton();
    this.bottomSheet = new BottomSheet();
    this.overlay = new MinimalOverlay();
    this.touchController = new TouchRotationController(this.viewer);
    
    // Start with sheet hidden
    this.bottomSheet.setState('hidden');
  }
  
  hideDesktopPanels() {
    const desktopPanels = document.querySelectorAll('.desktop-panel');
    desktopPanels.forEach(panel => {
      panel.style.display = 'none';
    });
  }
}
```

---

### **Step 2: Responsive CSS Setup**

**File:** `src/styles/mobile/mobile-ui.css`

```css
/* Mobile & Tablet breakpoints */
@media (max-width: 1023px) {
  /* Hide desktop UI */
  .desktop-panel,
  .desktop-controls {
    display: none !important;
  }
  
  /* Show mobile UI */
  .mobile-fab,
  .bottom-sheet,
  .minimal-overlay {
    display: block;
  }
  
  /* Full-screen canvas */
  canvas {
    width: 100vw !important;
    height: 100vh !important;
  }
  
  /* Prevent zoom on input focus (iOS) */
  input,
  select,
  textarea {
    font-size: 16px !important;
  }
  
  /* Touch-friendly sizing */
  button,
  .touchable {
    min-height: 48px;
    min-width: 48px;
  }
}

/* Phone-specific (< 768px) */
@media (max-width: 767px) {
  .bottom-sheet[data-state="full"] {
    transform: translateY(calc(100% - 85vh)); /* Slightly more on phone */
  }
  
  .fab-badge {
    display: none; /* Too small on phone */
  }
}

/* Tablet-specific (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .bottom-sheet[data-state="peek"] {
    transform: translateY(calc(100% - 35vh)); /* Slightly taller peek */
  }
  
  .mobile-fab {
    width: 72px;
    height: 72px; /* Slightly larger on tablet */
  }
}
```

---

### **Step 3: Integration**

**Modify:** `src/js/main.js`

```javascript
import { MobileUIManager } from './ui/mobile/MobileUIManager.js';

// After viewer initialization
const viewer = new PolytopeViewer(container);

// Initialize mobile UI if on mobile/tablet
const mobileUI = new MobileUIManager(viewer);

// Update FPS in overlay
function animate() {
  // ... existing animation code ...
  
  if (mobileUI.overlay) {
    mobileUI.overlay.updateFPS(currentFPS);
  }
  
  requestAnimationFrame(animate);
}
```

---

## 🧪 TESTING CHECKLIST

**Device Testing:**
- [ ] iPhone SE (375px) - smallest phone
- [ ] iPhone 12/13/14 (390px) - standard phone
- [ ] iPhone Pro Max (430px) - large phone
- [ ] iPad Mini (768px) - small tablet
- [ ] iPad (820px) - standard tablet
- [ ] iPad Pro (1024px) - should use DESKTOP UI

**FAB Testing:**
- [ ] FAB visible in bottom-right corner
- [ ] FAB doesn't overlap polytope
- [ ] Tap cycles through states correctly
- [ ] Badge shows polytope name (tablet only)
- [ ] Rotation animation smooth

**Bottom Sheet Testing:**
- [ ] Sheet slides smoothly (no jank)
- [ ] Drag handle is draggable
- [ ] Swipe up/down gestures work
- [ ] Tap outside closes sheet
- [ ] All controls accessible in full mode
- [ ] Peek mode shows most important controls
- [ ] Scrolling works in full mode

**Touch Gestures:**
- [ ] 1 finger drag = 3D camera orbit
- [ ] 2 finger drag = 4D rotation (XY+ZW)
- [ ] 2 finger twist = Additional ZW rotation
- [ ] Pinch = Zoom in/out
- [ ] No gesture conflicts

**Overlay Testing:**
- [ ] FPS counter updates in real-time
- [ ] Polytope name displays correctly
- [ ] Auto-hides after 3 seconds
- [ ] Reappears on touch
- [ ] Warning icon shows when needed

**Performance:**
- [ ] 50-60 FPS maintained on all devices
- [ ] No lag during sheet animation
- [ ] Touch gestures responsive
- [ ] No memory leaks

**Edge Cases:**
- [ ] Rotating device (portrait/landscape)
- [ ] Virtual keyboard appearance
- [ ] Multiple rapid sheet toggles
- [ ] Sheet open + polytope rotation
- [ ] Low-end device testing (if possible)

---

## 🎯 SUCCESS CRITERIA

**Mobile UI is complete when:**
- ✅ Polytope fully visible when controls hidden
- ✅ All controls accessible via bottom sheet
- ✅ Touch gestures work for 4D rotation
- ✅ Performance 50+ FPS on test devices
- ✅ No blocking/overlapping UI elements
- ✅ Touch targets meet 48px minimum
- ✅ Works on phones (375px+) and tablets (768px-1023px)
- ✅ Desktop UI unchanged (1024px+)

---

## 📱 PLATFORM-SPECIFIC NOTES

### **iOS Considerations:**
- Safe area insets (notch on newer iPhones)
- Disable bounce scrolling where appropriate
- Input zoom prevention (16px minimum font size)
- Touch callout disable on long press

```css
/* iOS safe areas */
.bottom-sheet {
  padding-bottom: env(safe-area-inset-bottom);
}

.mobile-fab {
  bottom: calc(20px + env(safe-area-inset-bottom));
}

/* Disable bounce */
body {
  overscroll-behavior-y: none;
}

/* Disable touch callout */
* {
  -webkit-touch-callout: none;
}
```

### **Android Considerations:**
- Navigation bar height varies
- Some devices have physical buttons
- Test on Chrome and Samsung Internet

---

## 🚀 NEXT STEPS

After mobile UI is working:
1. User testing on real devices
2. Gather feedback on gesture mappings
3. Consider adding haptic feedback (vibration on gesture)
4. Add tutorial overlay for first-time mobile users
5. Optimize performance for older devices

---

**Ready to implement. Good luck! 📱**
