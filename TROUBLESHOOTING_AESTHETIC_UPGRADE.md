# 🔧 Aesthetic Upgrade Troubleshooting Guide

**Last Updated:** 2025-11-22
**Status:** Fixes Applied

## 🚨 Current State & Fixes

### Issue: "UI elements all appear on left size"
**Cause:** The `position: absolute` styling for HUD panels relies on a positioned parent container. The default `div` wrapper might have collapsed or lacked `position: relative`.
**Fix Applied:**
1.  **CSS:** Explicitly defined `.viewer-container` with `position: relative`, `width: 100vw`, and `height: 100vh`.
2.  **CSS:** Inlined `hud-borders.css` content directly into `main.css` to prevent `@import` ordering issues or build failures.

### Issue: "Uncaught SyntaxError: ... does not provide an export named 'hudSounds'"
**Cause:** The inline script in `viewer.html` tried to import `hudSounds` from `main.js`, but `main.js` does not export it (it runs as a side-effect script).
**Fix Applied:**
1.  **JS:** Made `hudSounds` globally accessible via `window.hudSounds` in `main.js`.
2.  **HTML:** Updated `viewer.html` to access `window.hudSounds` instead of importing.

### Issue: "ReferenceError: licenseManager is not defined"
**Cause:** Accidental deletion of import statements in `main.js` during a previous edit.
**Fix Applied:**
1.  **JS:** Restored all missing imports (`PolytopeViewer`, `licenseManager`, etc.) in `src/js/main.js`.

---

## 📂 File Changes Overview

### 1. `src/styles/main.css`
*   **Added:** `.viewer-container` rule (critical for layout).
*   **Modified:** Removed `@import "./components/hud-borders.css"`.
*   **Added:** Inlined all `.hud-panel` styles (gradient borders, scanlines, corner accents).
*   **Verified:** Absolute positioning classes (`.hud-top-right`, etc.) are present in `@layer utilities`.

### 2. `viewer.html`
*   **Structure:**
    ```html
    <div class="viewer-container">
      <canvas id="viewer-canvas"></canvas>
      <div class="hud-overlay">
        <!-- Panels -->
      </div>
    </div>
    ```
*   **Updates:**
    *   Added `<link>` tags for Google Fonts (Orbitron, Rajdhani).
    *   Replaced inline module import with `window.hudSounds`.
    *   Restored control panel HTML structure in `.hud-bottom-right`.

### 3. `src/js/main.js`
*   **Restored:** All top-level imports.
*   **Added:** `window.hudSounds = hudSounds;` for global access.
*   **Added:** Initialization of `AnimatedBorder` and `ParticleField` (desktop only).

---

## 🛠️ Troubleshooting Steps (If issues persist)

1.  **Check Console Errors:**
    *   Open DevTools (F12).
    *   If you see `404` for CSS files, the build might need a restart.
    *   If you see `SyntaxError`, verify `main.js` integrity.

2.  **Verify CSS Loading:**
    *   Inspect the `.viewer-container` element.
    *   It MUST have `position: relative` computed style.
    *   Inspect `.hud-top-right`. It MUST have `position: absolute` and `right: 20px`.

3.  **Force Rebuild:**
    *   If using Vite/Webpack, stop the server and run `npm run dev` (or equivalent) again to ensure CSS changes are picked up.

4.  **Mobile vs. Desktop:**
    *   The new HUD layout is optimized for desktop (`min-width: 1024px`).
    *   On mobile, the existing `MobileUI` class should take over (check `src/styles/mobile.css` for conflicts, though none were introduced).

---

## 📝 Next Steps
If the UI is now correctly positioned but looks "off":
1.  Adjust `z-index` values in `main.css` (currently `10` for HUD).
2.  Tweaking the `linear-gradient` colors in `.hud-panel`.
