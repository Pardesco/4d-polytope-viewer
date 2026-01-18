# Claude Code Development Guide - 4D Polytope Viewer

## Project Overview

This is an interactive 4D polytope visualization web application built with Three.js. It renders 4-dimensional geometric objects (polytopes) by projecting them into 3D space using stereographic or perspective projection, with support for true 4D rotation.

**Live Site**: https://4d.pardesco.com
**Stack**: Vite + Three.js + Vanilla JavaScript
**Hosting**: Cloudflare Pages

---

## Architecture Overview

```
src/
├── js/
│   ├── main.js                    # App entry point, initializes viewer
│   ├── polytope/
│   │   ├── viewer.js              # Core PolytopeViewer class (MAIN FILE)
│   │   ├── parser.js              # .off file parser
│   │   ├── stereographic.js       # 4D→3D projection math
│   │   └── rotation4d.js          # 4D rotation matrix math
│   ├── ui/
│   │   ├── controls.js            # ViewerControls (rotation planes, settings)
│   │   ├── ExportMenu.js          # Export panel with license gating
│   │   ├── ProgressNotification.js # HUD-style progress popups
│   │   ├── polytope-selector.js   # Polytope dropdown (tier-based)
│   │   ├── MatrixDisplay.js       # 4D rotation matrix HUD
│   │   └── PerformanceWarningBanner.js
│   ├── effects/
│   │   ├── BloomEffect.js         # Post-processing glow (UnrealBloomPass)
│   │   ├── GlitchEffect.js        # Visual feedback on polytope change
│   │   └── ParticleField.js       # Background particle animation
│   ├── materials/
│   │   └── IridescentMaterial.js  # Animated holographic shader
│   ├── controls/
│   │   └── ManualRotationController.js  # Keyboard 4D rotation
│   ├── export/
│   │   ├── VideoRecorder.js       # Real-time canvas recording
│   │   └── SeamlessLoopRecorder.js # Frame-by-frame 360° loop export
│   ├── utils/
│   │   └── Screenshot.js          # PNG capture with bloom support
│   └── license/
│       └── LicenseManager.js      # Tier-based feature gating
├── styles/
│   ├── main.css                   # Primary styles (HUD, panels, etc.)
│   └── mobile.css                 # Mobile responsive overrides
└── data/
    ├── polytopes/                 # .off geometry files
    └── polytope-lists/            # Tier-specific JSON catalogs
```

---

## Core Concepts

### 4D Mathematics

**4D Vertices**: Each vertex has 4 coordinates `[x, y, z, w]` where `w` is the 4th spatial dimension.

**4D Rotation Planes**: Unlike 3D (which has 3 rotation axes), 4D has 6 rotation planes:
- XY, XZ, XW (rotations involving X)
- YZ, YW (rotations involving Y)
- ZW (rotation in the "extra" dimensions)

**Projection Types**:
1. **Stereographic** (`stereographic.js`): Projects from 4D hypersphere to 3D. Creates curved edges. Math: `project = vertex / (1 - w)`
2. **Perspective** (`stereographic.js`): Simple 4D→3D perspective. Straighter edges. Math: `scale = d / (d - w)`

### Rendering Pipeline

1. Load `.off` file → Parse vertices (4D) and edges
2. Apply 4D rotation matrix to all vertices
3. Project 4D vertices to 3D using selected projection
4. Generate curved edge geometry (CatmullRomCurve3)
5. Render as lines (wireframe) or tubes (mesh view)
6. Apply bloom post-processing

### Mesh View vs Line View

- **Line View**: Fast, uses `THREE.Line` with `LineBasicMaterial`
- **Mesh View**: Uses `THREE.TubeGeometry` with iridescent shader material
  - Per-point varying radius (thicker far from center)
  - More expensive but export-ready for 3D printing/Blender

### License Tiers

```javascript
// Tiers: 'free', 'creator', 'professional'
const tier = licenseManager.getTier();
```

- **Free**: Watermarked screenshots, limited polytope selection
- **Creator**: All exports, no watermark, 4K screenshots, full polytope library
- **Professional**: Same as Creator (reserved for future enterprise features)

---

## Key Files Deep Dive

### `viewer.js` - The Heart of the Application

This is the main class (~2000 lines). Key methods:

```javascript
class PolytopeViewer {
  // Initialization
  async init()                    // Setup Three.js scene, camera, renderer
  async loadPolytope(url, name)   // Load .off file, setup geometry

  // Rendering
  initializeGeometry()            // First-time geometry creation
  updateAllGeometry()             // In-place geometry updates (fast path)
  updateProjection()              // Apply 4D rotation and project
  animate()                       // Main render loop

  // Geometry
  createCustomTubeGeometry()      // Export-ready tube with varying radius
  updateCustomTubePositions()     // In-place tube vertex updates

  // Export (with license checks)
  captureScreenshot()             // PNG with bloom support
  exportOBJ()                     // Mesh or linework export
  exportAnimationJSON()           // Blender animation data

  // View modes
  toggleMeshView(enabled)         // Switch line/mesh rendering
  setMeshQuality(quality)         // 'standard' or 'high'
}
```

### `BloomEffect.js` - Post-Processing

Uses Three.js EffectComposer with UnrealBloomPass:

```javascript
class BloomEffect {
  constructor(renderer, scene, camera)
  setEnabled(enabled)             // Toggle bloom on/off
  render()                        // Render through composer (use this for screenshots!)
  updateSize(width, height)       // Resize for high-res capture
}
```

**Important**: Screenshots must call `bloomEffect.render()` not `renderer.render()` to capture bloom.

### `rotation4d.js` - 4D Rotation Math

```javascript
class Rotation4D {
  // Rotation state
  planeWeights = { xy: 1, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 }
  rotationSpeed = 0.5  // degrees per frame

  // Methods
  applyTo(vertices4D)             // Apply rotation to vertex array
  getRotationMatrix(angle)        // Get 4x4 rotation matrix
  setPlaneWeight(plane, weight)   // Enable/disable rotation planes
}
```

### `ExportMenu.js` - Feature Gating

All export buttons check license tier:

```javascript
handleExport(exportType) {
  const tier = this.licenseManager.getTier();
  if (tier === 'free') {
    this.showUpgradeModal(exportType);
    return;  // Block free tier
  }
  // Proceed with export...
}
```

---

## Common Development Tasks

### Adding a New Export Format

1. Add button in `ExportMenu.generateHTML()`
2. Add case in `handleExport()` switch statement
3. Implement export method (add license check!)
4. If needed, add viewer method with internal license check

### Adding a New UI Panel

1. Add HTML structure in `viewer.html` inside `.hud-overlay`
2. Add CSS in `main.css` (use existing `.hud-panel` classes)
3. Initialize in `main.js` or relevant control file

### Modifying Projection Math

Edit `src/js/polytope/stereographic.js`:
- `stereographicProject()` - Main projection function
- `generateCurvePoints()` - Interpolates along edges with projection

### Adding a New Material

1. Create file in `src/js/materials/`
2. Export material class with `getMaterial()` method
3. Import in `viewer.js` and use in `createAllTubeMeshes()`

---

## Performance Considerations

### High-Edge-Count Polytopes

- **>1200 edges**: 4D rotation disabled in mesh view (too slow)
- **Frenet frame caching**: Tube normals cached, invalidated every 10 frames
- **LOD for tubes**: Radial segments reduce with distance

### Mesh Quality Settings

```javascript
getMeshSettings() {
  if (this.meshQuality === 'high') {
    // Export quality: 64 tubular × 16 radial segments
    return { tubularSegments: 64, radialSegments: 16, curvePoints: 50 };
  } else {
    // Real-time: 6 tubular × LOD-based radial segments
    return { tubularSegments: 6, radialSegments: null, curvePoints: 20 };
  }
}
```

---

## Deployment

### Build & Deploy

```bash
# Development
npm run dev

# Production build
npm run build

# Deploy to Cloudflare Pages (PRODUCTION)
npx wrangler pages deployment create --project-name=polytope-4d --branch=main dist
```

**Important**: Use `deployment create` with `--branch=main` for production. Plain `pages deploy` creates preview only.

### Verify Deployment

```bash
npx wrangler pages deployment list --project-name=polytope-4d
```

Look for `Environment: Production` and `Branch: main`.

---

## Future Development Ideas

### VR Integration

**Recommended Approach**: Three.js WebXR

```javascript
// Basic WebXR setup
import { VRButton } from 'three/addons/webxr/VRButton.js';

// In viewer.init():
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Modify animate loop:
renderer.setAnimationLoop(() => {
  // VR-compatible render loop
  this.updateProjection();
  renderer.render(scene, camera);
});
```

**Considerations**:
- Replace OrbitControls with XR controller input
- Add hand tracking for 4D rotation gestures
- Scale polytope appropriately for room-scale VR
- Consider teleport locomotion for exploring large polytopes

**Relevant Files to Modify**:
- `viewer.js`: Add XR setup in `init()`, modify `animate()`
- `controls.js`: Add VR controller bindings
- New file: `src/js/vr/VRControls.js`

### 3D Orbit Gizmo (Blender-style)

**Concept**: Visual widget showing current 3D orientation, clickable to snap to standard views.

**Implementation Approach**:

```javascript
// New file: src/js/ui/OrbitGizmo.js
class OrbitGizmo {
  constructor(camera, container) {
    this.camera = camera;
    this.gizmoScene = new THREE.Scene();
    this.gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    this.gizmoRenderer = new THREE.WebGLRenderer({ alpha: true });

    // Create axis indicators (colored cones/arrows)
    this.createAxes();

    // Position in corner
    this.gizmoRenderer.setSize(100, 100);
    container.appendChild(this.gizmoRenderer.domElement);
  }

  update() {
    // Mirror main camera rotation
    this.gizmoCamera.rotation.copy(this.camera.rotation);
    this.gizmoRenderer.render(this.gizmoScene, this.gizmoCamera);
  }

  onAxisClick(axis) {
    // Animate camera to standard view
    // e.g., 'x' → front view, 'y' → top view, 'z' → right view
  }
}
```

**Integration Points**:
- Add to `viewer.html`: `<div id="orbit-gizmo"></div>` (bottom-left corner)
- Initialize in `main.js` after viewer creation
- Call `gizmo.update()` in `animate()` loop

### Other Ideas

1. **4D Orbit Gizmo**: Extend to show 4D rotation state (6 planes as colored arcs)
2. **Animation Timeline**: Keyframe editor for 4D rotation sequences
3. **Polytope Morphing**: Interpolate between different polytopes
4. **Audio Reactivity**: Map audio frequencies to rotation speeds/planes
5. **Collaborative Viewing**: WebRTC for shared exploration sessions

---

## Debugging Tips

### Global Objects (Development Only)

```javascript
// Available in browser console:
window.viewer          // PolytopeViewer instance
window.controls        // ViewerControls instance
window.licenseManager  // License tier management
window.selector        // Polytope selector
```

### Common Issues

**Bloom not appearing in screenshots**:
- Ensure `bloomEffect.render()` is called, not `renderer.render()`
- Check `bloomEffect.enabled` is true

**Mesh quality not persisting**:
- `initializeGeometry()` must call `getMeshSettings()` (fixed in recent update)

**4D rotation not working**:
- Check `rotating4D` is true
- Check `rotationEnabled` is true
- For mesh view with >1200 edges, 4D rotation is auto-disabled

**Export blocked unexpectedly**:
- Check browser console for license tier
- Verify `licenseManager.getTier()` returns expected value

---

## Code Style Conventions

- **Comments**: JSDoc style for public methods
- **Logging**: `[ClassName]` prefix, e.g., `console.log('[PolytopeViewer] ...')`
- **CSS**: Cyberpunk/terminal aesthetic, cyan (#00d9ff) accent color
- **Naming**: camelCase for JS, kebab-case for CSS classes

---

## Testing Checklist

Before deployment, verify:

- [ ] Polytope loads and renders correctly
- [ ] 3D rotation works (mouse drag)
- [ ] 4D rotation works (toggle button)
- [ ] Mesh view toggle works
- [ ] High mesh quality persists on polytope change
- [ ] Screenshots capture bloom effect
- [ ] Export progress notifications appear
- [ ] Free tier sees watermark on screenshots
- [ ] Free tier blocked from premium exports
- [ ] Creator tier can access all exports

---

## Contact & Resources

- **Polytope Data**: .off files from various mathematical sources
- **Three.js Docs**: https://threejs.org/docs/
- **WebXR Docs**: https://immersive-web.github.io/webxr/
- **Cloudflare Pages**: https://developers.cloudflare.com/pages/

---

*Last updated: November 2024*
