/**
 * 4D rotation matrices and operations
 *
 * Supports rotation in 6 fundamental planes:
 * - XY, XZ, XW (rotations involving X axis)
 * - YZ, YW (rotations involving Y axis)
 * - ZW (rotation in Z-W plane)
 *
 * Each rotation is a 4x4 matrix operating on [w, x, y, z] coordinates
 */

/**
 * 4D rotation planes
 */
export const ROTATION_PLANES = {
  XY: 'xy',
  XZ: 'xz',
  XW: 'xw',
  YZ: 'yz',
  YW: 'yw',
  ZW: 'zw'
};

/**
 * Generate 4x4 identity matrix
 *
 * @returns {Array<Array<number>>} - 4x4 identity matrix
 */
export function identity4D() {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Get rotation matrix for a specific plane
 *
 * @param {string} plane - Rotation plane ('xy', 'xz', 'xw', 'yz', 'yw', 'zw')
 * @param {number} angleRad - Rotation angle in radians
 * @returns {Array<Array<number>>} - 4x4 rotation matrix
 */
export function get4DRotationMatrix(plane, angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);

  const matrices = {
    'xy': [
      [c, -s, 0, 0],
      [s, c, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ],
    'xz': [
      [c, 0, -s, 0],
      [0, 1, 0, 0],
      [s, 0, c, 0],
      [0, 0, 0, 1]
    ],
    'xw': [
      [c, 0, 0, -s],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [s, 0, 0, c]
    ],
    'yz': [
      [1, 0, 0, 0],
      [0, c, -s, 0],
      [0, s, c, 0],
      [0, 0, 0, 1]
    ],
    'yw': [
      [1, 0, 0, 0],
      [0, c, 0, -s],
      [0, 0, 1, 0],
      [0, s, 0, c]
    ],
    'zw': [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, c, -s],
      [0, 0, s, c]
    ]
  };

  return matrices[plane] || identity4D();
}

/**
 * Multiply two 4x4 matrices
 *
 * @param {Array<Array<number>>} a - First matrix
 * @param {Array<Array<number>>} b - Second matrix
 * @returns {Array<Array<number>>} - Product matrix
 */
export function matmul4D(a, b) {
  const result = [];
  for (let i = 0; i < 4; i++) {
    result[i] = [];
    for (let j = 0; j < 4; j++) {
      result[i][j] = 0;
      for (let k = 0; k < 4; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

/**
 * Apply 4x4 matrix to 4D vector
 *
 * @param {Array<Array<number>>} matrix - 4x4 matrix
 * @param {Array<number>} vector - 4D vector [w, x, y, z]
 * @returns {Array<number>} - Transformed vector
 */
export function applyMatrix4D(matrix, vector) {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2] + matrix[0][3] * vector[3],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2] + matrix[1][3] * vector[3],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2] + matrix[2][3] * vector[3],
    matrix[3][0] * vector[0] + matrix[3][1] * vector[1] + matrix[3][2] * vector[2] + matrix[3][3] * vector[3]
  ];
}

/**
 * Create combined rotation matrix from multiple active planes
 *
 * @param {Object} activePlanes - Object with plane names as keys and boolean values
 * @param {number} angleDegrees - Rotation angle in degrees
 * @returns {Array<Array<number>>} - Combined rotation matrix
 */
export function create4DRotationMatrix(activePlanes, angleDegrees) {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const matrices = {};
  const planes = Object.keys(activePlanes).filter(p => activePlanes[p]);

  // Generate matrix for each active plane
  for (let plane of planes) {
    matrices[plane] = get4DRotationMatrix(plane, angleRad);
  }

  // Combine matrices in canonical order
  let combined = identity4D();
  const order = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw'];

  for (let plane of order) {
    if (matrices[plane]) {
      combined = matmul4D(matrices[plane], combined);
    }
  }

  return combined;
}

/**
 * Rotate array of 4D vertices
 *
 * @param {Array<Array<number>>} vertices - Array of 4D vertices
 * @param {Object} activePlanes - Active rotation planes
 * @param {number} angleDegrees - Rotation angle in degrees
 * @returns {Array<Array<number>>} - Rotated vertices
 */
export function rotateVertices4D(vertices, activePlanes, angleDegrees) {
  const rotationMatrix = create4DRotationMatrix(activePlanes, angleDegrees);
  return vertices.map(vertex => applyMatrix4D(rotationMatrix, vertex));
}

/**
 * Rotation4D class for managing incremental rotations
 */
export class Rotation4D {
  constructor() {
    this.activePlanes = { xy: true }; // Default to XY rotation
    this.currentAngle = 0;
    this.rotationSpeed = 1.0; // degrees per frame

    // Manual rotation: individual angles for each plane (radians)
    this.manualAngles = {
      xy: 0, xz: 0, xw: 0,
      yz: 0, yw: 0, zw: 0
    };
    this.manualMode = false; // When true, use manualAngles instead of currentAngle
  }

  /**
   * Set active rotation planes
   */
  setActivePlanes(planes) {
    this.activePlanes = { ...planes };
  }

  /**
   * Toggle a specific plane
   */
  togglePlane(plane) {
    this.activePlanes[plane] = !this.activePlanes[plane];
  }

  /**
   * Enable a single plane (disable all others)
   */
  enablePlane(plane) {
    this.activePlanes = {};
    this.activePlanes[plane] = true;
  }

  /**
   * Get list of active planes
   */
  getActivePlanes() {
    return Object.keys(this.activePlanes).filter(p => this.activePlanes[p]);
  }

  /**
   * Check if any planes are active
   */
  hasActivePlanes() {
    return this.getActivePlanes().length > 0;
  }

  /**
   * Reset rotation angle
   */
  reset() {
    this.currentAngle = 0;
  }

  /**
   * Update rotation (increment angle)
   */
  update() {
    if (this.hasActivePlanes()) {
      this.currentAngle += this.rotationSpeed;
      if (this.currentAngle >= 360) {
        this.currentAngle -= 360;
      }
    }
  }

  /**
   * Apply rotation to vertices
   */
  applyTo(vertices) {
    return rotateVertices4D(vertices, this.activePlanes, this.currentAngle);
  }

  /**
   * Set rotation speed
   */
  setSpeed(speed) {
    this.rotationSpeed = speed;
  }

  /**
   * Enable manual rotation mode
   */
  enableManualMode() {
    this.manualMode = true;
  }

  /**
   * Disable manual rotation mode (return to auto mode)
   */
  disableManualMode() {
    this.manualMode = false;
  }

  /**
   * Get current rotation state (for manual control)
   */
  getRotationState() {
    return { ...this.manualAngles };
  }

  /**
   * Set rotation state (for manual control)
   */
  setRotationState(angles) {
    this.manualAngles = { ...angles };
  }

  /**
   * Apply rotation to vertices (supports both auto and manual modes)
   */
  applyToManual(vertices) {
    if (this.manualMode) {
      // Manual mode: apply individual plane rotations
      return this.applyManualRotation(vertices);
    } else {
      // Auto mode: use existing applyTo method
      return this.applyTo(vertices);
    }
  }

  /**
   * Apply manual rotation with individual plane angles
   */
  applyManualRotation(vertices) {
    // Build combined rotation matrix from individual plane angles
    let combined = identity4D();

    // Apply rotations in canonical order
    const order = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw'];
    for (let plane of order) {
      if (this.manualAngles[plane] !== 0) {
        const matrix = get4DRotationMatrix(plane, this.manualAngles[plane]);
        combined = matmul4D(matrix, combined);
      }
    }

    // Apply combined matrix to all vertices
    return vertices.map(vertex => applyMatrix4D(combined, vertex));
  }
}
