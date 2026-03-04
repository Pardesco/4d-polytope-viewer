/**
 * Matrix-5 Shader Material
 *
 * Performs 5D rotation and double stereographic projection
 * entirely on the GPU for real-time performance.
 *
 * Visual Effect: Object phases in/out of existence like an MRI scanner,
 * parts rotate "away" into the 5th dimension, shrinking and vanishing.
 */

import * as THREE from 'three';

/**
 * Vertex shader for Matrix-5 projection
 * - Receives 4D vertex positions as custom attribute
 * - Embeds into 5D (v = 0)
 * - Applies 5D rotations
 * - Projects 5D → 4D → 3D (perspective or stereographic)
 */
const vertexShader = `
  // Original 4D coordinates from geometry
  attribute vec4 aPosition4D;

  // Depth values for fragment shader coloring
  varying float vDepth5D;
  varying float vDepth4D;
  varying float vDistanceFromCenter;

  // Uniforms
  uniform float uTime;
  uniform float uScale4D;          // 4D projection distance (perspective mode)
  uniform float uScale5D;          // 5D projection distance (perspective mode)
  uniform int uProjectionType;     // 0 = perspective, 1 = stereographic

  // 5D rotation angles (for manual control)
  uniform float uAngleXV;
  uniform float uAngleYV;
  uniform float uAngleZV;
  uniform float uAngleWV;

  // 4D rotation angles (can combine with 5D)
  uniform float uAngleXY;
  uniform float uAngleXZ;
  uniform float uAngleXW;
  uniform float uAngleYZ;
  uniform float uAngleYW;
  uniform float uAngleZW;

  // Auto-rotation
  uniform bool uAutoRotate;
  uniform float uAutoRotateSpeed;
  uniform int uAutoRotatePlane;    // 0=XV, 1=YV, 2=ZV, 3=WV

  // 2D rotation helper
  vec2 rotate2D(vec2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
  }

  void main() {
    // 1. START WITH 4D VERTEX, EMBED IN 5D (v = 0)
    float x = aPosition4D.x;
    float y = aPosition4D.y;
    float z = aPosition4D.z;
    float w = aPosition4D.w;
    float v = 0.0;

    // 2. APPLY 4D ROTATIONS FIRST (standard polytope rotation)
    if (abs(uAngleXY) > 0.0001) {
      vec2 rotated = rotate2D(vec2(x, y), uAngleXY);
      x = rotated.x; y = rotated.y;
    }
    if (abs(uAngleXZ) > 0.0001) {
      vec2 rotated = rotate2D(vec2(x, z), uAngleXZ);
      x = rotated.x; z = rotated.y;
    }
    if (abs(uAngleXW) > 0.0001) {
      vec2 rotated = rotate2D(vec2(x, w), uAngleXW);
      x = rotated.x; w = rotated.y;
    }
    if (abs(uAngleYZ) > 0.0001) {
      vec2 rotated = rotate2D(vec2(y, z), uAngleYZ);
      y = rotated.x; z = rotated.y;
    }
    if (abs(uAngleYW) > 0.0001) {
      vec2 rotated = rotate2D(vec2(y, w), uAngleYW);
      y = rotated.x; w = rotated.y;
    }
    if (abs(uAngleZW) > 0.0001) {
      vec2 rotated = rotate2D(vec2(z, w), uAngleZW);
      z = rotated.x; w = rotated.y;
    }

    // 3. APPLY 5D ROTATIONS (the "scanner" effect)

    // Auto-rotate in selected 5D plane
    if (uAutoRotate) {
      float theta = uTime * uAutoRotateSpeed;
      vec2 rotated;

      if (uAutoRotatePlane == 0) {        // XV plane
        rotated = rotate2D(vec2(x, v), theta);
        x = rotated.x; v = rotated.y;
      } else if (uAutoRotatePlane == 1) { // YV plane
        rotated = rotate2D(vec2(y, v), theta);
        y = rotated.x; v = rotated.y;
      } else if (uAutoRotatePlane == 2) { // ZV plane
        rotated = rotate2D(vec2(z, v), theta);
        z = rotated.x; v = rotated.y;
      } else {                             // WV plane (default)
        rotated = rotate2D(vec2(w, v), theta);
        w = rotated.x; v = rotated.y;
      }
    }

    // Manual 5D rotations
    if (abs(uAngleXV) > 0.0001) {
      vec2 rotated = rotate2D(vec2(x, v), uAngleXV);
      x = rotated.x; v = rotated.y;
    }
    if (abs(uAngleYV) > 0.0001) {
      vec2 rotated = rotate2D(vec2(y, v), uAngleYV);
      y = rotated.x; v = rotated.y;
    }
    if (abs(uAngleZV) > 0.0001) {
      vec2 rotated = rotate2D(vec2(z, v), uAngleZV);
      z = rotated.x; v = rotated.y;
    }
    if (abs(uAngleWV) > 0.0001) {
      vec2 rotated = rotate2D(vec2(w, v), uAngleWV);
      w = rotated.x; v = rotated.y;
    }

    // 4. PROJECT 5D → 4D → 3D
    vec3 pos3D;
    float x4, y4, z4, w4;

    if (uProjectionType == 1) {
      // === STEREOGRAPHIC PROJECTION ===
      // Projects from 5-sphere onto 4D hyperplane, then 4-sphere onto 3D
      // Creates curved, spherical "bubble" effect

      // First normalize to unit 5-sphere for proper stereographic projection
      float len5 = sqrt(x*x + y*y + z*z + w*w + v*v);
      if (len5 > 0.0001) {
        x /= len5; y /= len5; z /= len5; w /= len5; v /= len5;
      }

      // Stereographic 5D → 4D: project from pole at v = -1
      // Formula: coord' = coord / (1 + v)  [projecting from south pole]
      // Or:      coord' = coord / (1 - v)  [projecting from north pole]
      float denom5 = 1.0 - v;
      denom5 = max(denom5, 0.001); // Avoid division by zero near pole

      x4 = x / denom5;
      y4 = y / denom5;
      z4 = z / denom5;
      w4 = w / denom5;

      // Now normalize to unit 4-sphere for second stereographic projection
      float len4 = sqrt(x4*x4 + y4*y4 + z4*z4 + w4*w4);
      if (len4 > 0.0001) {
        x4 /= len4; y4 /= len4; z4 /= len4; w4 /= len4;
      }

      // Stereographic 4D → 3D: project from pole at w = -1
      float denom4 = 1.0 - w4;
      denom4 = max(denom4, 0.001);

      pos3D = vec3(
        x4 / denom4,
        y4 / denom4,
        z4 / denom4
      );

      // Scale for better visualization
      pos3D *= 1.5;

    } else {
      // === PERSPECTIVE PROJECTION ===
      // Simple perspective divide - creates "breathing" effect

      // 5D → 4D perspective
      float factor5 = uScale5D / (uScale5D - v);
      factor5 = clamp(factor5, 0.01, 50.0);

      x4 = x * factor5;
      y4 = y * factor5;
      z4 = z * factor5;
      w4 = w * factor5;

      // 4D → 3D perspective
      float factor4 = uScale4D / (uScale4D - w4);
      factor4 = clamp(factor4, 0.01, 50.0);

      pos3D = vec3(
        x4 * factor4,
        y4 * factor4,
        z4 * factor4
      );
    }

    // Pass depth values to fragment shader
    vDepth5D = v;
    vDepth4D = w4;
    vDistanceFromCenter = length(pos3D);

    // Final position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos3D, 1.0);
  }
`;

/**
 * Fragment shader for Matrix-5
 * Colors based on 5D depth with fade effect
 */
const fragmentShader = `
  varying float vDepth5D;
  varying float vDepth4D;
  varying float vDistanceFromCenter;

  uniform vec3 uColorNear;    // Color when v ≈ 0 (in our dimension)
  uniform vec3 uColorFar;     // Color when |v| is large (far in 5D)
  uniform float uFadeStart;   // When to start fading
  uniform float uFadeEnd;     // When fully faded

  void main() {
    // Color based on 5D depth
    // Map v from [-1, 1] to [0, 1] for color interpolation
    float depthNormalized = vDepth5D * 0.5 + 0.5;
    vec3 color = mix(uColorNear, uColorFar, depthNormalized);

    // Add some 4D depth influence
    float depth4Normalized = clamp(vDepth4D * 0.3 + 0.5, 0.0, 1.0);
    color = mix(color, color * 0.7, depth4Normalized * 0.3);

    // Fade out as parts move deep into 5D
    float opacity = 1.0 - smoothstep(uFadeStart, uFadeEnd, abs(vDepth5D));

    // Also fade based on extreme projection (avoids visual artifacts)
    opacity *= 1.0 - smoothstep(3.0, 5.0, vDistanceFromCenter);

    // Minimum opacity for visibility
    opacity = max(opacity, 0.05);

    gl_FragColor = vec4(color, opacity);
  }
`;

/**
 * Default uniforms for Matrix-5 shader
 */
export const Matrix5Uniforms = {
  uTime: { value: 0 },
  uScale4D: { value: 2.0 },
  uScale5D: { value: 2.5 },
  uProjectionType: { value: 0 },  // 0 = perspective, 1 = stereographic

  // 5D rotation angles
  uAngleXV: { value: 0 },
  uAngleYV: { value: 0 },
  uAngleZV: { value: 0 },
  uAngleWV: { value: 0 },

  // 4D rotation angles
  uAngleXY: { value: 0 },
  uAngleXZ: { value: 0 },
  uAngleXW: { value: 0 },
  uAngleYZ: { value: 0 },
  uAngleYW: { value: 0 },
  uAngleZW: { value: 0 },

  // Auto-rotation
  uAutoRotate: { value: true },
  uAutoRotateSpeed: { value: 0.5 },
  uAutoRotatePlane: { value: 3 },  // WV by default

  // Colors (cyan to magenta gradient)
  uColorNear: { value: new THREE.Color(0x00ffff) },
  uColorFar: { value: new THREE.Color(0xff00ff) },

  // Fade settings
  uFadeStart: { value: 0.8 },
  uFadeEnd: { value: 2.0 }
};

/**
 * Create a Matrix-5 shader material for line rendering
 * @param {Object} options - Override default uniforms
 * @returns {THREE.ShaderMaterial}
 */
export function createMatrix5LineMaterial(options = {}) {
  const uniforms = THREE.UniformsUtils.clone(Matrix5Uniforms);

  // Apply any overrides
  for (const key in options) {
    if (uniforms[key]) {
      uniforms[key].value = options[key];
    }
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    linewidth: 1  // Note: linewidth only works in some contexts
  });
}

/**
 * Create a Matrix-5 shader material for point rendering
 * @param {Object} options - Override default uniforms
 * @returns {THREE.ShaderMaterial}
 */
export function createMatrix5PointMaterial(options = {}) {
  const uniforms = THREE.UniformsUtils.clone(Matrix5Uniforms);
  uniforms.uPointSize = { value: options.pointSize || 3.0 };

  // Modify vertex shader for points
  const pointVertexShader = vertexShader.replace(
    'gl_Position = projectionMatrix * modelViewMatrix * vec4(pos3D, 1.0);',
    `gl_Position = projectionMatrix * modelViewMatrix * vec4(pos3D, 1.0);
     gl_PointSize = uPointSize * (1.0 - smoothstep(0.5, 2.0, abs(vDepth5D)));`
  );

  for (const key in options) {
    if (uniforms[key]) {
      uniforms[key].value = options[key];
    }
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: pointVertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

/**
 * Matrix5Controller - manages shader uniforms and animation
 */
export class Matrix5Controller {
  constructor(material) {
    this.material = material;
    this.uniforms = material.uniforms;
    this.isAnimating = true;
  }

  /**
   * Update time uniform (call each frame)
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    if (this.isAnimating) {
      this.uniforms.uTime.value += deltaTime * 0.001;
    }
  }

  /**
   * Set 5D rotation plane for auto-rotation
   * @param {string} plane - 'xv', 'yv', 'zv', or 'wv'
   */
  setAutoRotatePlane(plane) {
    const planeMap = { 'xv': 0, 'yv': 1, 'zv': 2, 'wv': 3 };
    if (planeMap.hasOwnProperty(plane)) {
      this.uniforms.uAutoRotatePlane.value = planeMap[plane];
    }
  }

  /**
   * Set auto-rotation speed
   * @param {number} speed - Rotation speed (radians per second)
   */
  setAutoRotateSpeed(speed) {
    this.uniforms.uAutoRotateSpeed.value = speed;
  }

  /**
   * Enable/disable auto-rotation
   * @param {boolean} enabled
   */
  setAutoRotate(enabled) {
    this.uniforms.uAutoRotate.value = enabled;
  }

  /**
   * Set manual 5D rotation angle
   * @param {string} plane - 'xv', 'yv', 'zv', or 'wv'
   * @param {number} angle - Angle in radians
   */
  set5DAngle(plane, angle) {
    const uniformMap = {
      'xv': 'uAngleXV',
      'yv': 'uAngleYV',
      'zv': 'uAngleZV',
      'wv': 'uAngleWV'
    };
    if (uniformMap[plane]) {
      this.uniforms[uniformMap[plane]].value = angle;
    }
  }

  /**
   * Set 4D rotation angle
   * @param {string} plane - 'xy', 'xz', 'xw', 'yz', 'yw', or 'zw'
   * @param {number} angle - Angle in radians
   */
  set4DAngle(plane, angle) {
    const uniformMap = {
      'xy': 'uAngleXY',
      'xz': 'uAngleXZ',
      'xw': 'uAngleXW',
      'yz': 'uAngleYZ',
      'yw': 'uAngleYW',
      'zw': 'uAngleZW'
    };
    if (uniformMap[plane]) {
      this.uniforms[uniformMap[plane]].value = angle;
    }
  }

  /**
   * Set projection distances
   * @param {number} scale4D - 4D projection distance
   * @param {number} scale5D - 5D projection distance
   */
  setProjectionScales(scale4D, scale5D) {
    this.uniforms.uScale4D.value = scale4D;
    this.uniforms.uScale5D.value = scale5D;
  }

  /**
   * Set projection type
   * @param {'perspective' | 'stereographic'} type - Projection type
   */
  setProjectionType(type) {
    this.uniforms.uProjectionType.value = type === 'stereographic' ? 1 : 0;
  }

  /**
   * Get current projection type
   * @returns {'perspective' | 'stereographic'}
   */
  getProjectionType() {
    return this.uniforms.uProjectionType.value === 1 ? 'stereographic' : 'perspective';
  }

  /**
   * Set color scheme
   * @param {THREE.Color|number} nearColor - Color when in our dimension
   * @param {THREE.Color|number} farColor - Color when far in 5D
   */
  setColors(nearColor, farColor) {
    this.uniforms.uColorNear.value = nearColor instanceof THREE.Color
      ? nearColor
      : new THREE.Color(nearColor);
    this.uniforms.uColorFar.value = farColor instanceof THREE.Color
      ? farColor
      : new THREE.Color(farColor);
  }

  /**
   * Reset all rotations to zero
   */
  reset() {
    this.uniforms.uTime.value = 0;
    this.uniforms.uAngleXV.value = 0;
    this.uniforms.uAngleYV.value = 0;
    this.uniforms.uAngleZV.value = 0;
    this.uniforms.uAngleWV.value = 0;
    this.uniforms.uAngleXY.value = 0;
    this.uniforms.uAngleXZ.value = 0;
    this.uniforms.uAngleXW.value = 0;
    this.uniforms.uAngleYZ.value = 0;
    this.uniforms.uAngleYW.value = 0;
    this.uniforms.uAngleZW.value = 0;
  }

  /**
   * Pause/resume animation
   * @param {boolean} paused
   */
  setPaused(paused) {
    this.isAnimating = !paused;
  }
}

export default {
  createMatrix5LineMaterial,
  createMatrix5PointMaterial,
  Matrix5Controller,
  Matrix5Uniforms
};
