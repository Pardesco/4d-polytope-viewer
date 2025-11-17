/**
 * BloomEffect - Post-processing bloom/glow effect
 *
 * Desktop only (performance intensive)
 * Creates ethereal glow around curves and edges
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class BloomEffect {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = false;
    this.composer = null;
    this.bloomPass = null;

    // Default bloom parameters (optimized settings)
    this.params = {
      strength: 1.0,  // Glow intensity (0.0 - 3.0)
      radius: 0.05,   // Glow spread (0.0 - 1.0)
      threshold: 0.05 // What glows (0.0 - 1.0)
    };

    // Only create on desktop
    if (this.isDesktop()) {
      this.createComposer();
      console.log('[BloomEffect] Initialized (desktop)');
    } else {
      console.log('[BloomEffect] Disabled on mobile for performance');
    }
  }

  /**
   * Detect if we're on desktop (>=1024px width)
   */
  isDesktop() {
    return window.innerWidth >= 1024;
  }

  /**
   * Create effect composer with bloom pass
   */
  createComposer() {
    // Create effect composer
    this.composer = new EffectComposer(this.renderer);

    // Render pass (renders scene normally)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass (adds glow effect)
    const size = new THREE.Vector2();
    this.renderer.getSize(size);

    this.bloomPass = new UnrealBloomPass(
      size,
      this.params.strength,
      this.params.radius,
      this.params.threshold
    );

    this.composer.addPass(this.bloomPass);

    // Make bloom pass output to screen
    this.bloomPass.renderToScreen = true;
  }

  /**
   * Render scene with or without bloom
   */
  render() {
    if (this.enabled && this.composer) {
      // Render with bloom post-processing
      this.composer.render();
    } else {
      // Normal render (fallback)
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Enable or disable bloom effect
   */
  setEnabled(enabled) {
    if (!this.isDesktop()) {
      this.enabled = false;
      return;
    }

    this.enabled = enabled;
    console.log(`[BloomEffect] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Update composer size on window resize
   */
  updateSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }

    if (this.bloomPass) {
      this.bloomPass.setSize(width, height);
    }
  }

  /**
   * Set bloom strength (glow intensity)
   * @param {number} value - 0.0 to 3.0
   */
  setStrength(value) {
    if (this.bloomPass) {
      this.params.strength = value;
      this.bloomPass.strength = value;
    }
  }

  /**
   * Set bloom radius (glow spread)
   * @param {number} value - 0.0 to 1.0
   */
  setRadius(value) {
    if (this.bloomPass) {
      this.params.radius = value;
      this.bloomPass.radius = value;
    }
  }

  /**
   * Set bloom threshold (what glows)
   * @param {number} value - 0.0 to 1.0
   */
  setThreshold(value) {
    if (this.bloomPass) {
      this.params.threshold = value;
      this.bloomPass.threshold = value;
    }
  }

  /**
   * Get current bloom parameters
   */
  getParams() {
    return { ...this.params };
  }

  /**
   * Check if bloom is available (desktop only)
   */
  isAvailable() {
    return this.composer !== null;
  }
}
