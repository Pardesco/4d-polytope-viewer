# Creator Tier Features - Frontend Documentation

**Status:** ✅ Production-ready
**Last Updated:** November 16, 2025

---

## 🎨 Overview

The frontend implements feature gating for Creator tier, allowing:
- Transparent background screenshots
- Mesh exports (.obj)
- Linework exports (.obj with stereographic projection)
- Exports of current 4D rotation state

---

## 📁 Key Files

### License Management
- **`src/js/license/LicenseManager.js`** - Singleton class for license validation and storage
- **`src/js/license/api.js`** - API client for backend communication
- **`src/js/license/storage.js`** - localStorage wrapper

### Export Features
- **`src/js/ui/ExportMenu.js`** - Export panel UI with tier-based locks
- **`src/js/utils/Screenshot.js`** - Screenshot capture with conditional watermarks
- **`src/js/polytope/viewer.js`** - Export methods (mesh, linework, screenshot)

### UI
- **`activate.html`** - Customer activation page
- **`src/styles/main.css`** - Export UI styles (lines 249-541)

---

## 🔑 License Manager API

### Initialization
```javascript
import { licenseManager } from './license/LicenseManager.js';

// Check current tier
const tier = licenseManager.getTier(); // 'free', 'creator', 'professional'

// Check if has license
const hasLicense = licenseManager.hasLicense(); // true/false
```

### Validation
```javascript
// Validate with backend API
const result = await licenseManager.validate(licenseKey, email);

if (result.success) {
  console.log(`Activated: ${result.tier} tier`);
  // License is now stored in localStorage
} else {
  console.error(`Failed: ${result.error}`);
}
```

### Permission Checks
```javascript
// Check feature permissions
const canExportMesh = licenseManager.canExportMesh(); // true/false
const canExportLinework = licenseManager.canExportLinework(); // true/false
const canRemoveWatermark = licenseManager.canExportScreenshotUnwatermarked(); // true/false
```

### License Info
```javascript
const info = licenseManager.getLicenseInfo();
// Returns:
{
  hasLicense: true,
  tier: 'creator',
  email: 'user@example.com',
  expirationDate: '2026-11-16',
  status: 'active',
  validatedAt: '2025-11-16T18:00:00.000Z'
}
```

---

## 📦 Export Features

### Screenshot Export

**Free Tier:**
- Watermarked with "4d.pardesco.com"
- Opaque background

**Creator Tier:**
- No watermark
- Transparent background
- Bloom effect disabled for transparency

**Implementation:**
```javascript
// In viewer.js
captureScreenshot(filename, removeWatermark = false, transparentBackground = false) {
  const tier = licenseManager.getTier();
  const noWatermark = tier !== 'free';
  const transparent = tier !== 'free';

  this.screenshot.captureWithBloom(
    this.bloomEffect,
    filename,
    noWatermark,
    transparent
  );
}
```

### Mesh Export

**Requirements:** Creator or Professional tier

**Features:**
- Exports current 3D mesh as .obj
- Includes vertices, normals, and faces
- Captures current 4D rotation state
- Temporarily enables mesh view if needed

**Implementation:**
```javascript
// In viewer.js
exportOBJ('mesh') {
  const wasMeshView = this.showMeshView;
  if (!this.showMeshView) {
    this.showMeshView = true;
    this.updateProjection(); // Generate mesh from current rotation
  }

  // Extract geometry from tubeMeshes...
  // Format as .obj...

  if (!wasMeshView) {
    this.showMeshView = false;
    this.updateProjection(); // Restore original view
  }
}
```

### Linework Export

**Requirements:** Creator or Professional tier

**Features:**
- Exports edges as curves
- Stereographic projection: curved edges (30 segments)
- Perspective projection: straight edges (2 segments)
- Captures current 4D rotation state

**Implementation:**
```javascript
// In viewer.js
exportOBJ('linework') {
  this.edgeIndices.forEach((edge, edgeIdx) => {
    const [v1Idx, v2Idx] = edge;
    const curvePoints = generateCurvePoints(
      this.vertices4DCurrent[v1Idx], // Current rotated state
      this.vertices4DCurrent[v2Idx],
      this.projectionType, // 'stereographic' or 'perspective'
      30, // segments
      this.perspectiveDistance
    );

    // Export as polyline with all curve points...
  });
}
```

---

## 🎨 Export Menu UI

### Tier Badges
```javascript
// Free tier
<span class="tier-badge free">Free Tier</span>

// Creator tier
<span class="tier-badge creator">Creator</span>

// Professional tier
<span class="tier-badge pro">Professional</span>
```

### Button States

**Locked (Free Tier):**
```html
<button class="export-btn locked" disabled>
  🔒 Export Mesh (.obj)
  <span class="upgrade-hint">Creator</span>
</button>
```

**Unlocked (Creator Tier):**
```html
<button class="export-btn" data-export-type="mesh">
  📐 Export Mesh (.obj)
</button>
```

### Upgrade Prompt
```javascript
generateUpgradePrompt() {
  return `
    <div class="upgrade-prompt">
      <p>🌟 <strong>Unlock Export Features</strong></p>
      <p>Upgrade to Creator tier for:</p>
      <ul>
        <li>🎨 Transparent background screenshots</li>
        <li>📐 Mesh & linework .obj exports</li>
        <li>✨ No watermarks</li>
      </ul>
      <a href="https://pardesco.com/products/4d-viewer-creator" class="upgrade-btn">
        Upgrade to Creator - $49/year
      </a>
    </div>
  `;
}
```

---

## 🔄 Activation Flow

### 1. Customer Visits Activation Page

**URL:** https://4d.pardesco.com/activate.html

**Pre-filled from email link:**
```
https://4d.pardesco.com/activate.html?key=XXXX-XXXX-XXXX-XXXX&email=user@example.com
```

### 2. License Validation

```javascript
// In activate.html
const result = await licenseManager.validate(licenseKey, email);

if (result.success) {
  showMessage(`Success! Your ${result.tier} tier has been activated.`, 'success');
  setTimeout(() => {
    window.location.href = '/'; // Redirect to viewer
  }, 2000);
}
```

### 3. localStorage Storage

```javascript
// Stored automatically by LicenseManager
{
  key: 'XXXX-XXXX-XXXX-XXXX',
  email: 'user@example.com',
  tier: 'creator',
  expirationDate: '2026-11-16T00:00:00.000Z',
  status: 'active',
  validatedAt: '2025-11-16T18:00:00.000Z'
}
```

**Storage Key:** `4d_viewer_license`

### 4. Features Unlock

- Export buttons become enabled
- Tier badge displays "Creator"
- Screenshots export with transparent background
- Mesh/linework exports available

---

## 🎯 File Export Naming

**Format:** `{polytope-name}-{type}.{ext}`

**Examples:**
- `tesseract-mesh.obj`
- `120-cell-linework.obj`
- `5-cell-2025-11-16T18-00-00.png`

**Implementation:**
```javascript
// Get polytope name
const polytopeData = this.viewer.getCurrentPolytopeData();
// Returns: { name: '2-tes', ... }

// Generate filename
const filename = `${polytopeData.name}-mesh.obj`;
```

---

## 🔐 License Deactivation

**UI Location:** Bottom of export panel (Creator tier only)

**Button:**
```html
<button id="deactivate-license-btn" class="deactivate-license-btn">
  Deactivate License
</button>
```

**Confirmation:**
```javascript
const confirmed = confirm(
  'Deactivate your Creator license on this device?\n\n' +
  'You can reactivate anytime at 4d.pardesco.com/activate\n\n' +
  'Your license will remain valid on other devices.'
);

if (confirmed) {
  licenseManager.logout();
  window.location.reload();
}
```

---

## 🎨 CSS Classes

### Tier Badges
```css
.tier-badge { /* Base badge styles */ }
.tier-badge.free { /* Gray badge */ }
.tier-badge.creator { /* Purple badge */ }
.tier-badge.pro { /* Pink badge */ }
```

### Export Buttons
```css
.export-btn { /* Base button */ }
.export-btn.locked { /* Grayed out, disabled */ }
.export-btn:hover:not(:disabled) { /* Hover effect */ }
```

### Status Messages
```css
.export-status.info { /* Blue info message */ }
.export-status.success { /* Green success message */ }
.export-status.error { /* Red error message */ }
```

---

## 🐛 Troubleshooting

### Features not unlocking
1. Check localStorage: `localStorage.getItem('4d_viewer_license')`
2. Verify tier: `licenseManager.getTier()`
3. Check expiration: License data in localStorage
4. Hard refresh: Ctrl+Shift+R

### Export buttons disabled
1. Verify tier is 'creator' or 'professional'
2. Check `licenseManager.canExportMesh()`
3. Check browser console for errors
4. Verify ExportMenu initialized: `window.controls.exportMenu`

### CORS errors on activation
1. Check API is deployed: `curl https://4d-license-api.randall-7f7.workers.dev/`
2. Verify CORS headers in backend
3. Check browser console for specific error

---

## 🔄 Future Enhancements

### Planned Features
- [ ] Offline export (cached license validation)
- [ ] Export presets (quality settings)
- [ ] Batch export (multiple polytopes)
- [ ] Custom export formats (STL, GLTF)
- [ ] Export history/library

### Professional Tier Features (TBD)
- [ ] Advanced export formats
- [ ] Batch operations
- [ ] API access
- [ ] White-label option

---

## 📚 Related Documentation

- **LICENSE_SYSTEM.md** (4d-api-worker) - Backend system overview
- **SECRETS.md** (4d-api-worker) - Secret management
- **QUICK_REFERENCE.md** (root) - Common commands

---

**For developers:** All export features respect the current 4D rotation state, ensuring exports match exactly what's visible in the viewer.
