/**
 * 5D Projection Mathematics
 *
 * Handles embedding 4D polytopes into 5D space and
 * performing rotations in the 5th dimension.
 *
 * This creates the "Matrix-5" visualization mode where
 * the polytope appears to phase in/out of existence like
 * an MRI scanner slicing through the object.
 */

/**
 * Embed a 4D vertex into 5D space
 * @param {Array} vertex4D - [x, y, z, w]
 * @returns {Array} [x, y, z, w, v] where v = 0
 */
export function embedIn5D(vertex4D) {
  return [...vertex4D, 0];
}

/**
 * Embed all 4D vertices into 5D space
 * @param {Array} vertices4D - Array of [x, y, z, w] vertices
 * @returns {Array} Array of [x, y, z, w, v] vertices
 */
export function embedAllIn5D(vertices4D) {
  return vertices4D.map(v => embedIn5D(v));
}

/**
 * 5D rotation plane definitions
 */
export const ROTATION_PLANES_5D = {
  // Original 4D planes
  XY: 'xy',
  XZ: 'xz',
  XW: 'xw',
  YZ: 'yz',
  YW: 'yw',
  ZW: 'zw',
  // New 5D planes (involving V dimension)
  XV: 'xv',
  YV: 'yv',
  ZV: 'zv',
  WV: 'wv'
};

/**
 * Generate a 5x5 rotation matrix for a given plane
 * @param {string} plane - One of: 'xv', 'yv', 'zv', 'wv', or any 4D plane
 * @param {number} angle - Rotation angle in radians
 * @returns {Float32Array} 5x5 rotation matrix (flattened, column-major for WebGL)
 */
export function getRotationMatrix5D(plane, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  // Identity matrix (column-major order for WebGL compatibility)
  const m = new Float32Array([
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1
  ]);

  // Rotation plane indices: x=0, y=1, z=2, w=3, v=4
  const planeMap = {
    'xy': [0, 1], 'xz': [0, 2], 'xw': [0, 3], 'xv': [0, 4],
    'yz': [1, 2], 'yw': [1, 3], 'yv': [1, 4],
    'zw': [2, 3], 'zv': [2, 4],
    'wv': [3, 4]
  };

  const indices = planeMap[plane.toLowerCase()];
  if (!indices) {
    console.warn(`[Projection5D] Unknown rotation plane: ${plane}`);
    return m;
  }

  const [i, j] = indices;

  // Apply rotation to the matrix (column-major)
  // For column-major: m[col * 5 + row]
  m[i * 5 + i] = c;
  m[j * 5 + i] = s;
  m[i * 5 + j] = -s;
  m[j * 5 + j] = c;

  return m;
}

/**
 * Multiply two 5x5 matrices (column-major order)
 * @param {Float32Array} a - First 5x5 matrix
 * @param {Float32Array} b - Second 5x5 matrix
 * @returns {Float32Array} Result matrix a * b
 */
export function multiplyMatrices5D(a, b) {
  const result = new Float32Array(25);

  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      let sum = 0;
      for (let k = 0; k < 5; k++) {
        sum += a[k * 5 + row] * b[col * 5 + k];
      }
      result[col * 5 + row] = sum;
    }
  }

  return result;
}

/**
 * Apply 5x5 rotation matrix to a 5D vertex
 * @param {Array} vertex5D - [x, y, z, w, v]
 * @param {Float32Array} matrix - 5x5 rotation matrix (column-major)
 * @returns {Array} Rotated [x, y, z, w, v]
 */
export function rotateVertex5D(vertex5D, matrix) {
  const [x, y, z, w, v] = vertex5D;
  return [
    matrix[0] * x + matrix[5] * y + matrix[10] * z + matrix[15] * w + matrix[20] * v,
    matrix[1] * x + matrix[6] * y + matrix[11] * z + matrix[16] * w + matrix[21] * v,
    matrix[2] * x + matrix[7] * y + matrix[12] * z + matrix[17] * w + matrix[22] * v,
    matrix[3] * x + matrix[8] * y + matrix[13] * z + matrix[18] * w + matrix[23] * v,
    matrix[4] * x + matrix[9] * y + matrix[14] * z + matrix[19] * w + matrix[24] * v
  ];
}

/**
 * Apply rotation matrix to all 5D vertices
 * @param {Array} vertices5D - Array of [x, y, z, w, v] vertices
 * @param {Float32Array} matrix - 5x5 rotation matrix
 * @returns {Array} Array of rotated vertices
 */
export function rotateAllVertices5D(vertices5D, matrix) {
  return vertices5D.map(v => rotateVertex5D(v, matrix));
}

/**
 * Stereographic projection 5D → 4D
 * Projects from the 5D hypersphere onto 4D hyperplane
 * @param {Array} vertex5D - [x, y, z, w, v]
 * @param {number} projectionDistance - Distance from projection point (default 2.5)
 * @returns {Array} [x, y, z, w] in 4D
 */
export function project5Dto4D(vertex5D, projectionDistance = 2.5) {
  const [x, y, z, w, v] = vertex5D;
  const factor = projectionDistance / (projectionDistance - v);

  // Clamp factor to avoid extreme distortion
  const clampedFactor = Math.min(Math.max(factor, 0.01), 100);

  return [
    x * clampedFactor,
    y * clampedFactor,
    z * clampedFactor,
    w * clampedFactor
  ];
}

/**
 * Stereographic projection 4D → 3D
 * @param {Array} vertex4D - [x, y, z, w]
 * @param {number} projectionDistance - Distance from projection point (default 2.0)
 * @returns {Array} [x, y, z] in 3D
 */
export function project4Dto3D(vertex4D, projectionDistance = 2.0) {
  const [x, y, z, w] = vertex4D;
  const factor = projectionDistance / (projectionDistance - w);

  // Clamp factor to avoid extreme distortion
  const clampedFactor = Math.min(Math.max(factor, 0.01), 100);

  return [
    x * clampedFactor,
    y * clampedFactor,
    z * clampedFactor
  ];
}

/**
 * Full projection pipeline: 5D → 4D → 3D (Perspective)
 * @param {Array} vertex5D - [x, y, z, w, v]
 * @param {number} scale5D - 5D projection distance
 * @param {number} scale4D - 4D projection distance
 * @returns {Array} [x, y, z] in 3D
 */
export function projectVertex5Dto3D(vertex5D, scale5D = 2.5, scale4D = 2.0) {
  const vertex4D = project5Dto4D(vertex5D, scale5D);
  return project4Dto3D(vertex4D, scale4D);
}

/**
 * Project all vertices through the full pipeline
 * @param {Array} vertices5D - Array of 5D vertices
 * @param {number} scale5D - 5D projection distance
 * @param {number} scale4D - 4D projection distance
 * @returns {Array} Array of 3D vertices
 */
export function projectAllVertices5Dto3D(vertices5D, scale5D = 2.5, scale4D = 2.0) {
  return vertices5D.map(v => projectVertex5Dto3D(v, scale5D, scale4D));
}

/**
 * Stereographic projection 5D → 4D
 * Projects from 5-sphere onto 4D hyperplane
 * @param {Array} vertex5D - [x, y, z, w, v] (should be normalized to unit 5-sphere)
 * @returns {Array} [x, y, z, w] in 4D
 */
export function stereographicProject5Dto4D(vertex5D) {
  let [x, y, z, w, v] = vertex5D;

  // Normalize to unit 5-sphere
  const len = Math.sqrt(x*x + y*y + z*z + w*w + v*v);
  if (len > 0.0001) {
    x /= len; y /= len; z /= len; w /= len; v /= len;
  }

  // Stereographic from north pole (v = 1)
  const denom = Math.max(1 - v, 0.001);

  return [
    x / denom,
    y / denom,
    z / denom,
    w / denom
  ];
}

/**
 * Stereographic projection 4D → 3D
 * Projects from 4-sphere onto 3D hyperplane
 * @param {Array} vertex4D - [x, y, z, w] (should be normalized to unit 4-sphere)
 * @returns {Array} [x, y, z] in 3D
 */
export function stereographicProject4Dto3D(vertex4D) {
  let [x, y, z, w] = vertex4D;

  // Normalize to unit 4-sphere
  const len = Math.sqrt(x*x + y*y + z*z + w*w);
  if (len > 0.0001) {
    x /= len; y /= len; z /= len; w /= len;
  }

  // Stereographic from north pole (w = 1)
  const denom = Math.max(1 - w, 0.001);

  return [
    x / denom * 1.5,  // Scale for better visualization
    y / denom * 1.5,
    z / denom * 1.5
  ];
}

/**
 * Full stereographic projection pipeline: 5D → 4D → 3D
 * @param {Array} vertex5D - [x, y, z, w, v]
 * @returns {Array} [x, y, z] in 3D
 */
export function stereographicProjectVertex5Dto3D(vertex5D) {
  const vertex4D = stereographicProject5Dto4D(vertex5D);
  return stereographicProject4Dto3D(vertex4D);
}

/**
 * Generate curve points along an edge with 5D projection
 * Interpolates in 5D, then projects each point to 3D
 *
 * @param {Array} v1_5d - First vertex [x, y, z, w, v]
 * @param {Array} v2_5d - Second vertex [x, y, z, w, v]
 * @param {string} projectionType - 'perspective' or 'stereographic'
 * @param {number} numPoints - Number of interpolation points
 * @param {number} scale5D - 5D projection distance (for perspective)
 * @param {number} scale4D - 4D projection distance (for perspective)
 * @returns {Array} Array of [x, y, z] points
 */
export function generateCurvePoints5D(v1_5d, v2_5d, projectionType = 'perspective', numPoints = 20, scale5D = 2.5, scale4D = 2.0) {
  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Interpolate in 5D
    const point5D = [
      v1_5d[0] + t * (v2_5d[0] - v1_5d[0]),
      v1_5d[1] + t * (v2_5d[1] - v1_5d[1]),
      v1_5d[2] + t * (v2_5d[2] - v1_5d[2]),
      v1_5d[3] + t * (v2_5d[3] - v1_5d[3]),
      v1_5d[4] + t * (v2_5d[4] - v1_5d[4])
    ];

    // Project to 3D based on projection type
    let point3D;
    if (projectionType === 'stereographic') {
      point3D = stereographicProjectVertex5Dto3D(point5D);
    } else {
      point3D = projectVertex5Dto3D(point5D, scale5D, scale4D);
    }

    // Skip invalid points
    if (point3D && isFinite(point3D[0]) && isFinite(point3D[1]) && isFinite(point3D[2])) {
      // Clamp extreme values
      const maxVal = 10;
      if (Math.abs(point3D[0]) < maxVal && Math.abs(point3D[1]) < maxVal && Math.abs(point3D[2]) < maxVal) {
        points.push(point3D);
      }
    }
  }

  return points;
}

/**
 * Rotation5D class - manages 5D rotation state
 * Similar to Rotation4D but with additional planes
 */
export class Rotation5D {
  constructor() {
    // Rotation angles for each plane (in radians)
    this.angles = {
      xy: 0, xz: 0, xw: 0, xv: 0,
      yz: 0, yw: 0, yv: 0,
      zw: 0, zv: 0,
      wv: 0
    };

    // Which planes are active for auto-rotation
    this.activePlanes = {
      xy: false, xz: false, xw: false, xv: false,
      yz: false, yw: false, yv: false,
      zw: false, zv: false,
      wv: true  // Default: rotate in WV plane for "scanner" effect
    };

    // Rotation speeds (radians per update)
    this.speeds = {
      xy: 0.01, xz: 0.01, xw: 0.01, xv: 0.01,
      yz: 0.01, yw: 0.01, yv: 0.01,
      zw: 0.01, zv: 0.01,
      wv: 0.01
    };

    // Cached combined rotation matrix
    this._cachedMatrix = null;
    this._matrixDirty = true;
  }

  /**
   * Set rotation angle for a plane
   * @param {string} plane - Rotation plane name
   * @param {number} angle - Angle in radians
   */
  setAngle(plane, angle) {
    if (this.angles.hasOwnProperty(plane)) {
      this.angles[plane] = angle;
      this._matrixDirty = true;
    }
  }

  /**
   * Toggle a rotation plane active/inactive
   * @param {string} plane - Rotation plane name
   */
  togglePlane(plane) {
    if (this.activePlanes.hasOwnProperty(plane)) {
      this.activePlanes[plane] = !this.activePlanes[plane];
    }
  }

  /**
   * Set plane active state
   * @param {string} plane - Rotation plane name
   * @param {boolean} active - Whether plane is active
   */
  setPlaneActive(plane, active) {
    if (this.activePlanes.hasOwnProperty(plane)) {
      this.activePlanes[plane] = active;
    }
  }

  /**
   * Update rotation angles based on active planes
   * Call this each frame for auto-rotation
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime = 16.67) {
    const timeScale = deltaTime / 16.67; // Normalize to ~60fps
    let changed = false;

    for (const plane in this.activePlanes) {
      if (this.activePlanes[plane]) {
        this.angles[plane] += this.speeds[plane] * timeScale;
        changed = true;
      }
    }

    if (changed) {
      this._matrixDirty = true;
    }
  }

  /**
   * Get the combined rotation matrix for all planes
   * @returns {Float32Array} 5x5 rotation matrix
   */
  getMatrix() {
    if (!this._matrixDirty && this._cachedMatrix) {
      return this._cachedMatrix;
    }

    // Start with identity
    let result = new Float32Array([
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
      0, 0, 0, 0, 1
    ]);

    // Apply rotations in order
    const planeOrder = ['xy', 'xz', 'xw', 'xv', 'yz', 'yw', 'yv', 'zw', 'zv', 'wv'];

    for (const plane of planeOrder) {
      if (Math.abs(this.angles[plane]) > 0.0001) {
        const planeMatrix = getRotationMatrix5D(plane, this.angles[plane]);
        result = multiplyMatrices5D(result, planeMatrix);
      }
    }

    this._cachedMatrix = result;
    this._matrixDirty = false;

    return result;
  }

  /**
   * Apply rotation to a set of 5D vertices
   * @param {Array} vertices5D - Array of 5D vertices
   * @returns {Array} Rotated vertices
   */
  applyTo(vertices5D) {
    const matrix = this.getMatrix();
    return rotateAllVertices5D(vertices5D, matrix);
  }

  /**
   * Reset all rotations to zero
   */
  reset() {
    for (const plane in this.angles) {
      this.angles[plane] = 0;
    }
    this._matrixDirty = true;
  }

  /**
   * Get active 5D planes (XV, YV, ZV, WV only)
   * @returns {Array} Array of active 5D plane names
   */
  getActive5DPlanes() {
    return ['xv', 'yv', 'zv', 'wv'].filter(p => this.activePlanes[p]);
  }

  /**
   * Check if any 5D plane is active
   * @returns {boolean}
   */
  has5DRotation() {
    return ['xv', 'yv', 'zv', 'wv'].some(p => this.activePlanes[p]);
  }
}

export default Rotation5D;
