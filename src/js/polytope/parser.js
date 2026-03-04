/**
 * .OFF file parser for 4D polytopes
 *
 * Parses 4OFF format files containing:
 * - 4D vertices (w, x, y, z coordinates)
 * - Faces (polygons in 3D)
 * - Cells (polyhedra in 4D)
 *
 * Extracts edges from face definitions
 */

/**
 * Parse 4OFF file content
 *
 * @param {string} offData - Raw .off file content
 * @returns {Object|null} - Object with {vertices, edges, metadata} or null if parsing fails
 */
export function parseOffFile(offData) {
  // Handle different line endings (CRLF, LF, CR)
  const lines = offData.split(/\r?\n/);

  // Debug: log first few lines
  console.log('[Parser] First 5 lines:', lines.slice(0, 5).map((l, i) => `${i}: "${l}"`));

  // Find 4OFF marker (very flexible - just needs to contain "4OFF")
  let formatLineIdx = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toUpperCase();
    if (line.includes('4OFF') || line.includes('4 OFF')) {
      formatLineIdx = i;
      console.log(`[Parser] Found 4OFF marker at line ${i}: "${lines[i]}"`);
      break;
    }
  }

  if (formatLineIdx === null) {
    console.error('[Parser] No 4OFF marker found');
    console.error('[Parser] File starts with:', offData.substring(0, 100));
    console.error('[Parser] First non-empty line:', lines.find(l => l.trim().length > 0));
    return null;
  }

  // Find header (contains vertex/face/edge/cell counts)
  let headerIdx = formatLineIdx + 1;
  while (headerIdx < lines.length) {
    const line = lines[headerIdx].trim();
    if (line && !line.startsWith('#')) {
      break;
    }
    headerIdx++;
  }

  const headerParts = lines[headerIdx].trim().split(/\s+/);
  const nVertices = parseInt(headerParts[0]);
  const nFaces = parseInt(headerParts[1]);
  const nEdges = parseInt(headerParts[2]);
  const nCells = parseInt(headerParts[3]);

  console.log(`[Parser] Header: ${nVertices} vertices, ${nFaces} faces, ${nEdges} edges, ${nCells} cells`);

  // Check if file uses # Vertices / # Faces comment markers
  let hasVertexMarker = false;
  let hasFaceMarker = false;
  for (let idx = headerIdx + 1; idx < lines.length; idx++) {
    const trimmed = lines[idx].trim();
    if (trimmed.startsWith('# Vertices')) hasVertexMarker = true;
    if (trimmed === '# Faces') hasFaceMarker = true;
    if (hasVertexMarker && hasFaceMarker) break;
  }

  // Parse vertices
  const vertices = [];
  let i = headerIdx + 1;

  if (hasVertexMarker) {
    // Skip to "# Vertices" comment marker
    while (i < lines.length && !lines[i].trim().startsWith('# Vertices')) {
      i++;
    }
    i++; // Skip "# Vertices" comment line
  } else {
    // No marker — skip any blank/comment lines after header, then read positionally
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) break;
      i++;
    }
  }

  // Read vertices (count-based)
  while (vertices.length < nVertices && i < lines.length) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      const coords = line.split(/\s+/).map(parseFloat);
      if (coords.length >= 4) {
        vertices.push(coords.slice(0, 4));
      }
    }
    i++;
  }

  console.log(`[Parser] Parsed ${vertices.length} vertices (marker: ${hasVertexMarker})`);

  // Parse edges from faces
  const edgesSet = new Set();

  if (hasFaceMarker) {
    // Find "# Faces" comment marker
    for (let idx = 0; idx < lines.length; idx++) {
      if (lines[idx].trim() === '# Faces') {
        i = idx + 1;
        break;
      }
    }
  } else {
    // No marker — faces start right after vertices (skip blank/comment lines)
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) break;
      i++;
    }
  }

  let faceCount = 0;

  // Read faces until we've read nFaces, or hit cells section / end of file
  while (faceCount < nFaces && i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('# Cells')) break;
    if (line && !line.startsWith('#')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        const nFaceVerts = parseInt(parts[0]);
        if (parts.length >= nFaceVerts + 1) {
          const faceVerts = [];
          for (let j = 1; j <= nFaceVerts; j++) {
            faceVerts.push(parseInt(parts[j]));
          }

          // Create edges from face vertices
          for (let j = 0; j < nFaceVerts; j++) {
            const v1 = faceVerts[j];
            const v2 = faceVerts[(j + 1) % nFaceVerts];
            // Store edge in canonical form (smaller index first)
            const edge = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
            edgesSet.add(edge);
          }
          faceCount++;
        }
      }
    }
    i++;
  }

  console.log(`[Parser] Processed ${faceCount} faces (marker: ${hasFaceMarker})`)

  // Convert edges set to array
  const edges = Array.from(edgesSet).map(e => {
    const [v1, v2] = e.split(',').map(Number);
    return [v1, v2];
  });

  console.log(`[Parser] Extracted ${edges.length} unique edges`);

  // Calculate polytope bounds (for visualization scaling)
  const bounds = calculateBounds(vertices);

  return {
    vertices,
    edges,
    metadata: {
      vertexCount: nVertices,
      faceCount: nFaces,
      edgeCount: edges.length,
      cellCount: nCells,
      bounds
    }
  };
}

/**
 * Calculate bounding box of 4D vertices
 *
 * @param {Array<Array<number>>} vertices - Array of 4D vertices
 * @returns {Object} - Bounds object with min/max for each dimension
 */
function calculateBounds(vertices) {
  if (vertices.length === 0) {
    return {
      w: { min: 0, max: 0 },
      x: { min: 0, max: 0 },
      y: { min: 0, max: 0 },
      z: { min: 0, max: 0 }
    };
  }

  const bounds = {
    w: { min: Infinity, max: -Infinity },
    x: { min: Infinity, max: -Infinity },
    y: { min: Infinity, max: -Infinity },
    z: { min: Infinity, max: -Infinity }
  };

  for (const vertex of vertices) {
    bounds.w.min = Math.min(bounds.w.min, vertex[0]);
    bounds.w.max = Math.max(bounds.w.max, vertex[0]);
    bounds.x.min = Math.min(bounds.x.min, vertex[1]);
    bounds.x.max = Math.max(bounds.x.max, vertex[1]);
    bounds.y.min = Math.min(bounds.y.min, vertex[2]);
    bounds.y.max = Math.max(bounds.y.max, vertex[2]);
    bounds.z.min = Math.min(bounds.z.min, vertex[3]);
    bounds.z.max = Math.max(bounds.z.max, vertex[3]);
  }

  return bounds;
}

/**
 * Load and parse .off file from URL
 *
 * @param {string} url - URL to .off file
 * @returns {Promise<Object>} - Parsed polytope data
 */
export async function loadOffFile(url) {
  try {
    console.log(`[LoadOff] Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    console.log(`[LoadOff] Loaded ${text.length} bytes`);
    console.log(`[LoadOff] Content starts: "${text.substring(0, 50)}"`);

    const result = parseOffFile(text);
    if (!result) {
      throw new Error('Parser returned null - failed to parse file');
    }
    return result;
  } catch (error) {
    console.error(`[LoadOff] Failed to load .off file from ${url}:`, error);
    throw error;
  }
}

/**
 * Get complexity level based on edge count
 * (Used for UI badges and warnings)
 *
 * @param {number} edgeCount - Number of edges
 * @returns {string} - Complexity level ('simple', 'medium', 'complex', 'extreme')
 */
export function getComplexityLevel(edgeCount) {
  if (edgeCount <= 200) return 'simple';
  if (edgeCount <= 400) return 'medium';
  if (edgeCount <= 720) return 'complex';
  return 'extreme';
}

/**
 * Get human-readable polytope statistics
 *
 * @param {Object} polytopeData - Parsed polytope data
 * @returns {Object} - Statistics object
 */
export function getPolytopeStats(polytopeData) {
  const { metadata } = polytopeData;
  return {
    vertices: metadata.vertexCount,
    edges: metadata.edgeCount,
    faces: metadata.faceCount,
    cells: metadata.cellCount,
    complexity: getComplexityLevel(metadata.edgeCount)
  };
}
