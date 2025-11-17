/**
 * Stereographic and perspective projection functions for 4D to 3D
 *
 * Stereographic projection: Projects from 4D sphere to 3D space
 * Creates beautiful curved edges characteristic of 4D polytopes
 *
 * Perspective projection: True 4D perspective from viewing point
 * More dramatic depth effect, similar to Stella4D
 */

/**
 * Stereographic projection from 4D to 3D
 * Projects normalized 4D point onto 3D hyperplane
 *
 * @param {Array<number>} point4D - 4D point [w, x, y, z]
 * @returns {Array<number>} - 3D point [x, y, z]
 */
export function stereographicProject(point4D) {
  // Normalize to unit sphere
  const norm = Math.sqrt(
    point4D[0] * point4D[0] +
    point4D[1] * point4D[1] +
    point4D[2] * point4D[2] +
    point4D[3] * point4D[3]
  );

  const normalized = norm > 0
    ? point4D.map(x => x / norm)
    : point4D;

  const x0 = normalized[0]; // w coordinate
  const x1 = normalized[1]; // x coordinate
  const x2 = normalized[2]; // y coordinate
  const x3 = normalized[3]; // z coordinate

  // Avoid singularity at south pole (w = 1)
  if (Math.abs(1 - x0) < 1e-6) {
    return [x1 * 1000, x2 * 1000, x3 * 1000];
  }

  // Stereographic formula: X_i = x_i / (1 - x_0)
  const denom = 1 - x0;
  return [
    x1 / denom,
    x2 / denom,
    x3 / denom
  ];
}

/**
 * Normalize 4D vertex to unit 3-sphere (radius 1)
 *
 * @param {Array<number>} vertex - 4D point
 * @returns {Array<number>} - Normalized 4D point
 */
export function normalizeVertex4D(vertex) {
  const mag = Math.sqrt(
    vertex[0] * vertex[0] +
    vertex[1] * vertex[1] +
    vertex[2] * vertex[2] +
    vertex[3] * vertex[3]
  );

  if (mag < 1e-10) {
    console.warn('Vertex at origin, cannot normalize');
    return vertex;
  }

  return [
    vertex[0] / mag,
    vertex[1] / mag,
    vertex[2] / mag,
    vertex[3] / mag
  ];
}

/**
 * Calculate adaptive viewing distance for perspective projection
 * Based on W-coordinate range of vertices
 *
 * @param {Array<Array<number>>} vertices4D - Array of 4D vertices
 * @returns {number} - Viewing distance
 */
export function calculateViewingDistance(vertices4D) {
  const wCoords = vertices4D.map(v => v[0]);
  const maxW = Math.max(...wCoords);
  const minW = Math.min(...wCoords);

  // VERY AGGRESSIVE: Camera extremely close for dramatic perspective (Stella4D style)
  const margin = 0.05; // Much smaller margin for closer camera
  const d = maxW + margin;

  // Clamp between 1.05 and 1.15 for EXTREME dramatic depth
  // Closer camera = stronger perspective effect
  const finalDistance = Math.max(1.05, Math.min(d, 1.15));

  console.log(`[Perspective] W range: [${minW.toFixed(3)}, ${maxW.toFixed(3)}]`);
  console.log(`[Perspective] Viewing distance: ${finalDistance.toFixed(3)} (VERY AGGRESSIVE for dramatic depth)`);

  return finalDistance;
}

/**
 * Perspective projection from 4D to 3D
 * True perspective from viewpoint at distance d along W-axis
 *
 * @param {Array<number>} point4D - 4D point [w, x, y, z]
 * @param {number} viewingDistance - Distance of viewpoint along W-axis
 * @returns {Array<number>|null} - 3D point [x, y, z] or null if behind viewing plane
 */
export function perspectiveProject(point4D, viewingDistance = 2.0) {
  const d = viewingDistance;
  const w = point4D[0]; // W coordinate

  // Skip points behind or very close to viewing plane
  // Very lenient threshold for extreme camera positions (1.05-1.15 range)
  if (w >= d * 0.99) {
    return null;
  }

  // Avoid division by zero (points at viewing plane)
  // Very tight tolerance for extreme camera positions
  if (Math.abs(d - w) < 0.002) {
    return null;
  }

  // Perspective scaling: closer objects appear larger
  const scale = d / (d - w);

  return [
    point4D[1] * scale, // x
    point4D[2] * scale, // y
    point4D[3] * scale  // z
  ];
}

/**
 * Calculate appropriate vertex sphere radius based on projection type
 *
 * @param {Array<number>} vertex4D - 4D vertex
 * @param {string} projectionType - 'stereographic' or 'perspective'
 * @param {number} viewingDistance - Viewing distance for perspective projection
 * @returns {number} - Sphere radius
 */
export function getVertexSphereRadius(vertex4D, projectionType, viewingDistance = 2.0) {
  if (projectionType === 'perspective') {
    const w = vertex4D[0];
    const d = viewingDistance;

    if (w >= d * 0.99) {
      return 0.02; // Minimal radius for far vertices
    }

    // Scale radius based on depth
    const scale = d / (d - w);
    const baseRadius = 0.015;
    return baseRadius * scale;
  } else {
    // Stereographic: uniform radius
    return 0.025;
  }
}

/**
 * Generate curve points between two vertices for smooth edge rendering
 * Uses stereographic or perspective projection
 *
 * @param {Array<number>} vertex1 - First 4D vertex
 * @param {Array<number>} vertex2 - Second 4D vertex
 * @param {string} projectionType - 'stereographic' or 'perspective'
 * @param {number} segments - Number of segments for curve
 * @param {number} viewingDistance - Viewing distance for perspective
 * @returns {Array<Array<number>>} - Array of 3D points
 */
export function generateCurvePoints(vertex1, vertex2, projectionType = 'stereographic', segments = 30, viewingDistance = 2.0) {
  const points = [];

  // PERSPECTIVE: Straight lines (just use endpoints)
  if (projectionType === 'perspective') {
    const v1_3d = perspectiveProject(vertex1, viewingDistance);
    const v2_3d = perspectiveProject(vertex2, viewingDistance);

    // Skip edge if either endpoint is behind viewing plane
    if (v1_3d && v2_3d) {
      points.push(v1_3d, v2_3d);
    }
    return points;
  }

  // STEREOGRAPHIC: Curved lines (interpolate along sphere)
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    // Linear interpolation in 4D
    const point4D = [
      vertex1[0] + t * (vertex2[0] - vertex1[0]),
      vertex1[1] + t * (vertex2[1] - vertex1[1]),
      vertex1[2] + t * (vertex2[2] - vertex1[2]),
      vertex1[3] + t * (vertex2[3] - vertex1[3])
    ];

    // Normalize interpolated point to stay on 3-sphere (creates curves)
    const normalized = normalizeVertex4D(point4D);
    const projectedPoint = stereographicProject(normalized);

    if (projectedPoint) {
      points.push(projectedPoint);
    }
  }

  return points;
}
