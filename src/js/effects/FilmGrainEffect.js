/**
 * FilmGrainEffect - Photographic film grain post-processing
 *
 * Features:
 * - Multi-octave film grain (simulates various ISO levels)
 * - RGB chromatic aberration
 * - Content-aware grain masking
 * - Vignette effect
 * - Film-like response curve
 */

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Film grain shader with chromatic aberration
 */
const RGBShiftNoiseShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'uShiftAmount': { value: 0.002 },
    'uAngle': { value: 0.0 },
    'uSplitMode': { value: 0 }, // 0 = 3-Color (RGB), 1 = 2-Color (Red/Cyan)
    'uNoiseAmount': { value: 0.15 },
    'uTime': { value: 0.0 },
    'uResolution': { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    'uAnimateNoise': { value: true },
    'uVignetteAmount': { value: 0.2 }
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uShiftAmount;
    uniform float uAngle;
    uniform int uSplitMode;
    uniform float uNoiseAmount;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform bool uAnimateNoise;
    uniform float uVignetteAmount;

    varying vec2 vUv;

    // High-quality hash for organic randomness
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // 2D hash for vector noise
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)),
               dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    // Smooth noise for low-frequency variations
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Voronoi-based noise for organic grain clumping
    float voronoi(vec2 uv, float scale) {
      vec2 i = floor(uv * scale);
      vec2 f = fract(uv * scale);

      float minDist = 1.0;

      for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point = hash2(i + neighbor);
          point = 0.5 + 0.5 * sin(6.2831 * point);
          vec2 diff = neighbor + point - f;
          float dist = length(diff);
          minDist = min(minDist, dist);
        }
      }

      return minDist;
    }

    // Photographic film grain
    float filmGrain(vec2 uv, float time) {
      vec2 uvRandom = uv;

      if (uAnimateNoise) {
        float t1 = time * 0.173 + sin(time * 0.0371) * 10.0;
        float t2 = time * 0.219 + cos(time * 0.0417) * 10.0;
        uvRandom += vec2(t1, t2);
      }

      // Multiple grain sizes (different ISO levels)
      float baseGrain = 0.0;

      // Fine grain (ISO 400)
      baseGrain += hash(uvRandom * uResolution * 1.3) * 0.4;

      // Medium-fine grain (ISO 800)
      baseGrain += hash(uvRandom * uResolution * 2.7 + vec2(123.45, 678.90)) * 0.3;

      // Medium grain (ISO 1600)
      baseGrain += hash(uvRandom * uResolution * 5.3 + vec2(234.56, 789.01)) * 0.2;

      // Coarse grain (ISO 3200)
      baseGrain += hash(uvRandom * uResolution * 11.7 + vec2(345.67, 890.12)) * 0.1;

      // Organic clumping
      float clumping = voronoi(uvRandom, 0.5) * 0.15;
      baseGrain += clumping;

      // Film density variations
      float densityVariation = noise(uvRandom * 0.3) * 0.05;
      baseGrain += densityVariation;

      // Normalize and apply film-like response
      baseGrain /= 1.2;
      baseGrain = pow(baseGrain, 0.9);

      return baseGrain;
    }

    // Chromatic film grain with subtle color shifts
    vec3 chromaticFilmGrain(vec2 uv, float time, float intensity) {
      vec2 uvR = uv;
      vec2 uvG = uv;
      vec2 uvB = uv;

      if (uAnimateNoise) {
        float t = time * 0.173;
        uvR += vec2(sin(t * 1.1) * 0.001, cos(t * 0.9) * 0.001);
        uvG += vec2(sin(t * 1.3) * 0.001, cos(t * 1.1) * 0.001);
        uvB += vec2(sin(t * 0.9) * 0.001, cos(t * 1.3) * 0.001);
      }

      // Each channel gets slightly different grain
      float grainR = filmGrain(uvR, time);
      float grainG = filmGrain(uvG + vec2(0.1, 0.2), time);
      float grainB = filmGrain(uvB + vec2(0.2, 0.1), time);

      vec3 colorGrain = vec3(grainR, grainG, grainB);

      // Mix with monochrome (mostly mono, slight color)
      float monoGrain = (grainR + grainG + grainB) / 3.0;
      colorGrain = mix(vec3(monoGrain), colorGrain, 0.15);

      return (colorGrain - 0.5) * intensity;
    }

    // Vignette effect
    float vignette(vec2 uv, float intensity) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      return 1.0 - smoothstep(0.3, 0.8, dist) * intensity;
    }

    void main() {
      vec2 uv = vUv;

      // RGB shift (chromatic aberration)
      vec2 direction = vec2(cos(uAngle), sin(uAngle));
      vec2 offset = direction * uShiftAmount;

      vec3 color;

      if (uSplitMode == 1) {
        // 2-Color Mode (Red vs Cyan)
        float r = texture2D(tDiffuse, uv + offset).r;
        vec2 gb = texture2D(tDiffuse, uv - offset).gb;
        color = vec3(r, gb.x, gb.y);
      } else {
        // 3-Color Mode (Standard RGB)
        float r = texture2D(tDiffuse, uv + offset).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - offset).b;
        color = vec3(r, g, b);
      }

      // Calculate luminance
      float lum = dot(color, vec3(0.299, 0.587, 0.114));

      // Apply photographic film grain uniformly across entire viewport
      vec3 colorGrain = chromaticFilmGrain(uv, uTime, uNoiseAmount);

      // Apply grain uniformly (full viewport coverage for CRT effect)
      color += colorGrain;

      // Film-like response curve (subtle S-curve)
      color = color / (color + vec3(0.3));
      color = pow(color, vec3(0.95));

      // Subtle halation (film light bloom) on bright areas
      float halation = smoothstep(0.6, 1.0, lum) * 0.03;
      color += vec3(halation);

      // Apply vignette
      float vig = vignette(uv, uVignetteAmount);
      color *= vig;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export class FilmGrainEffect {
  constructor() {
    this.enabled = false;
    this.pass = null;

    // Default parameters
    this.params = {
      grainAmount: 0.15,      // 0-1
      chromaticAberration: 0.002, // 0-0.01
      vignette: 0.2,          // 0-1
      animateGrain: true
    };

    console.log('[FilmGrainEffect] Initialized');
  }

  /**
   * Create shader pass and add to composer
   * @param {EffectComposer} composer - The effect composer to add to
   */
  addToComposer(composer) {
    if (!composer) {
      console.warn('[FilmGrainEffect] No composer provided');
      return;
    }

    // Create the shader pass
    this.pass = new ShaderPass(RGBShiftNoiseShader);
    this.pass.enabled = this.enabled;

    // Add to composer (after bloom)
    composer.addPass(this.pass);

    // Update the last pass to render to screen
    this.pass.renderToScreen = true;

    // Find bloom pass and disable its renderToScreen
    composer.passes.forEach(pass => {
      if (pass !== this.pass) {
        pass.renderToScreen = false;
      }
    });

    console.log('[FilmGrainEffect] Added to composer');
  }

  /**
   * Update time uniform (call in animation loop)
   */
  update() {
    if (this.pass && this.pass.uniforms) {
      this.pass.uniforms.uTime.value = performance.now() * 0.001;
    }
  }

  /**
   * Enable or disable the effect
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.pass) {
      this.pass.enabled = enabled;
    }
    console.log(`[FilmGrainEffect] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Set grain intensity
   * @param {number} value - 0 to 1
   */
  setGrainAmount(value) {
    this.params.grainAmount = value;
    if (this.pass && this.pass.uniforms) {
      this.pass.uniforms.uNoiseAmount.value = value;
    }
  }

  /**
   * Set chromatic aberration amount
   * @param {number} value - 0 to 0.01
   */
  setChromaticAberration(value) {
    this.params.chromaticAberration = value;
    if (this.pass && this.pass.uniforms) {
      this.pass.uniforms.uShiftAmount.value = value;
    }
  }

  /**
   * Set vignette intensity
   * @param {number} value - 0 to 1
   */
  setVignette(value) {
    this.params.vignette = value;
    if (this.pass && this.pass.uniforms) {
      this.pass.uniforms.uVignetteAmount.value = value;
    }
  }

  /**
   * Set whether grain animates
   * @param {boolean} animate
   */
  setAnimateGrain(animate) {
    this.params.animateGrain = animate;
    if (this.pass && this.pass.uniforms) {
      this.pass.uniforms.uAnimateNoise.value = animate;
    }
  }

  /**
   * Update resolution (call on window resize)
   */
  updateResolution(width, height) {
    if (this.pass && this.pass.uniforms) {
      this.pass.uniforms.uResolution.value.set(width, height);
    }
  }

  /**
   * Get current parameters
   */
  getParams() {
    return { ...this.params };
  }
}
