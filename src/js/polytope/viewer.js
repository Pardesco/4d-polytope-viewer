/**
 * PolytopeViewer - Main class for rendering and interacting with 4D polytopes
 *
 * Integrates:
 * - Three.js rendering
 * - 4D rotation and projection
 * - Performance management
 * - User interaction
 */

import * as THREE from 'three';
import { loadOffFile } from './parser.js';
import {
  stereographicProject,
  perspectiveProject,
  generateCurvePoints,
  calculateViewingDistance,
  getVertexSphereRadius,
  normalizeVertex4D
} from './stereographic.js';
import { Rotation4D, rotateVertices4D } from './rotation4d.js';
import { PerformanceManager } from '../performance/manager.js';
import { BloomEffect } from '../effects/BloomEffect.js';
import { IridescentMaterial } from '../materials/IridescentMaterial.js';
import { Screenshot } from '../utils/Screenshot.js';
import { ManualRotationController } from '../controls/ManualRotationController.js';
import { PerformanceWarningBanner } from '../ui/PerformanceWarningBanner.js';

export class PolytopeViewer {
  constructor(canvasContainer, options = {}) {
    // Container element
    this.container = canvasContainer;

    // Options
    this.options = {
      width: options.width || window.innerWidth,
      height: options.height || window.innerHeight,
      projectionType: options.projectionType || 'stereographic',
      enableRotation3D: options.enableRotation3D !== undefined ? options.enableRotation3D : true,
      enableRotation4D: options.enableRotation4D || false,
      showVertices: options.showVertices !== undefined ? options.showVertices : true,
      backgroundColor: options.backgroundColor || 0x0a0a1a,
      ...options
    };

    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.group = null;
    this.bloomEffect = null;

    // Polytope data
    this.polytopeData = null;
    this.vertices4DOriginal = [];
    this.vertices4DCurrent = [];
    this.edgeIndices = [];
    this.polytopeName = '';

    // Rendering objects
    this.edgeLines = [];
    this.tubeMeshes = [];
    this.vertexMeshes = [];

    // Performance optimization: Reusable buffers
    this.vertex3DBuffer = [];  // Projected 3D positions
    this.vertex4DBuffer = [];  // Rotated 4D positions
    this._tempVec3 = new THREE.Vector3();  // Temp vector for calculations
    this._tempVec4 = { x: 0, y: 0, z: 0, w: 0 };  // Temp 4D vector
    this.geometryInitialized = false;  // Track if geometry is set up

    // Tube metadata for custom geometry (track segment counts per tube)
    this.tubeMetadata = [];  // Stores {tubularSegments, radialSegments} per tube

    // Frenet frame cache for performance (avoid expensive recalculation)
    this.frenetFrameCache = [];  // Stores {tangents, normals, binormals} per tube
    this.frenetCacheValid = [];  // Track if cache is valid per tube

    // Rotation management
    this.rotation4D = new Rotation4D();
    this.rotating3D = this.options.enableRotation3D;
    this.rotating4D = this.options.enableRotation4D;
    this.rotationMode = 'auto'; // 'auto' or 'manual'
    this.manualRotationController = null; // Initialized after init()

    // Performance management
    this.perfManager = new PerformanceManager();
    this.rotationEnabled = true;

    // View settings
    this.projectionType = this.options.projectionType;
    this.perspectiveDistance = 2.0;
    this.showVertices = this.options.showVertices;
    this.showMeshView = false;
    // Note: Iridescent is always used on desktop when mesh view is enabled

    // Edge count tracking (used for 4D rotation limits, not mesh view)
    this.currentEdgeCount = 0;
    this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH = 1200; // 4D rotation disabled in mesh view above this

    // Mesh settings
    this.minThickness = 0.01;
    this.maxThickness = 0.1;
    this.thicknessCurve = 3.0;
    this.edgeLimit = Infinity; // Render ALL edges (no limit)

    // Performance settings
    this.NUM_CURVE_POINTS = 20;  // Reduced from 50 for performance
    this.TUBE_SEGMENTS = 6;      // Tubular segments (reduced from 10 for performance)
    this.LINE_SUBDIVISIONS = 20; // Line subdivisions
    this.TUBE_UPDATE_INTERVAL = 4; // Update tubes every N frames (Frenet frames are expensive)
    this._tubeUpdateCounter = 0;  // Frame counter for tube updates

    // Animation
    this.animationFrameId = null;
    this.isRendering = false;

    // FPS tracking
    this.lastFrameTime = performance.now();
    this.fpsHistory = [];
    this.currentFPS = 60;

    // Performance warning banner
    this.performanceBanner = new PerformanceWarningBanner();
  }

  /**
   * Initialize Three.js scene
   */
  async init() {
    console.log('[PolytopeViewer] Initializing...');

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.backgroundColor);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.options.width / this.options.height,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Create renderer with alpha support for transparent screenshots
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // Required for screenshots
    });
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Create bloom effect (desktop only, enabled by default)
    this.bloomEffect = new BloomEffect(this.renderer, this.scene, this.camera);
    this.bloomEffect.setEnabled(true); // ON by default with optimized settings

    // Create iridescent material (desktop only, off by default)
    if (window.innerWidth >= 1024) {
      this.iridescentMaterial = new IridescentMaterial();
      console.log('[PolytopeViewer] Iridescent material available (desktop)');
    } else {
      this.iridescentMaterial = null;
      console.log('[PolytopeViewer] Iridescent material disabled (mobile)');
    }

    // Create group for 3D rotation
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Add lighting for mesh rendering
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight1.position.set(1, 1, 1);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-1, -1, -1);
    this.scene.add(directionalLight2);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Create manual rotation controller (desktop only)
    if (window.innerWidth >= 1024) {
      this.manualRotationController = new ManualRotationController(this);
      console.log('[PolytopeViewer] Manual rotation controller available (desktop)');
    } else {
      console.log('[PolytopeViewer] Manual rotation disabled (mobile)');
    }

    console.log('[PolytopeViewer] Initialized successfully');
  }

  /**
   * Load polytope from .off file
   */
  async loadPolytope(url, name = '') {
    console.log(`[PolytopeViewer] Loading polytope from ${url}`);

    try {
      // Load and parse .off file
      this.polytopeData = await loadOffFile(url);
      this.polytopeName = name || url.split('/').pop().replace('.off', '');

      // Store vertices and edges
      // IMPORTANT: Normalize ALL vertices to unit 3-sphere for correct projection
      // This is essential for both stereographic and perspective projection
      this.vertices4DOriginal = this.polytopeData.vertices.map(v => normalizeVertex4D(v));
      this.vertices4DCurrent = [...this.vertices4DOriginal];
      this.edgeIndices = this.polytopeData.edges;

      console.log(`[PolytopeViewer] Loaded ${this.polytopeName}:`, {
        vertices: this.vertices4DOriginal.length,
        edges: this.edgeIndices.length
      });

      // Count edges (used for 4D rotation limits)
      const edgeCount = this.edgeIndices.length;
      this.currentEdgeCount = edgeCount;

      // Log edge count
      console.log(`[PolytopeViewer] Edge count: ${edgeCount}`);
      if (edgeCount > this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH) {
        console.log(`[PolytopeViewer] 4D rotation will be disabled in mesh view (>${this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH} edges)`);
      }

      // Performance constraints removed - allow 4D rotation for ALL polytopes
      // Mesh view available for ALL polytopes - 4D rotation disabled in mesh view for >1200 edges
      // Note: rotationEnabled always stays true, no blocking

      // Set edge limit (always returns full count now)
      this.edgeLimit = this.perfManager.getEdgeLimit(edgeCount);

      // Log performance metrics
      this.perfManager.logMetrics(edgeCount, this.polytopeName);

      // ALWAYS calculate adaptive perspective distance for new polytope
      // This ensures correct distance regardless of current projection mode
      this.perspectiveDistance = calculateViewingDistance(this.vertices4DOriginal);
      console.log(`[PolytopeViewer] Calculated perspective distance: ${this.perspectiveDistance.toFixed(3)}`);

      // Reset rotation
      this.rotation4D.reset();

      // Mark geometry as needing re-initialization
      this.geometryInitialized = false;

      // Initial render
      this.updateProjection();

      // Update performance warning banner
      this.performanceBanner.update(this.currentEdgeCount, this.rotating4D, this.showMeshView);

      return this.polytopeData;
    } catch (error) {
      console.error('[PolytopeViewer] Failed to load polytope:', error);
      throw error;
    }
  }

  /**
   * Update projection and render polytope (OPTIMIZED)
   */
  updateProjection() {
    // Apply 4D rotation based on mode
    if (this.rotationMode === 'manual' && this.rotation4D.manualMode) {
      // Manual mode: always apply rotation
      this.vertices4DCurrent = this.rotation4D.applyManualRotation(this.vertices4DOriginal);
    } else if (this.rotating4D && this.rotationEnabled) {
      // Auto mode: apply if auto-rotation enabled
      this.vertices4DCurrent = this.rotation4D.applyTo(this.vertices4DOriginal);
    } else {
      this.vertices4DCurrent = [...this.vertices4DOriginal];
    }

    // Initialize geometry once, or update in-place
    if (!this.geometryInitialized) {
      // First time: create all geometry
      this.initializeGeometry();
    } else {
      // Subsequent updates: update geometry in-place (FAST!)
      this.updateAllGeometry();
    }
  }

  /**
   * Render edges as curves or meshes
   */
  renderEdges(vertices3D) {
    const edgesToRender = Math.min(this.edgeIndices.length, this.edgeLimit);

    for (let i = 0; i < edgesToRender; i++) {
      const [v1Idx, v2Idx] = this.edgeIndices[i];
      const v1_4d = this.vertices4DCurrent[v1Idx];
      const v2_4d = this.vertices4DCurrent[v2Idx];

      // Generate curve points
      const curvePoints = generateCurvePoints(
        v1_4d,
        v2_4d,
        this.projectionType,
        30,
        this.perspectiveDistance
      );

      if (curvePoints.length < 2) continue;

      // Convert to Three.js vectors
      const threePoints = curvePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

      if (this.showMeshView) {
        // Render as tube mesh
        this.renderEdgeTube(threePoints, i);
      } else {
        // Render as line
        this.renderEdgeLine(threePoints);
      }
    }
  }

  /**
   * Render edge as line
   */
  renderEdgeLine(points) {
    const curve = new THREE.CatmullRomCurve3(points);
    const curveGeometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(50)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00d9ff,
      linewidth: 2
    });

    const line = new THREE.Line(curveGeometry, lineMaterial);
    this.group.add(line);
    this.edgeLines.push(line);
  }

  /**
   * Render edge as tube mesh (for mesh view)
   */
  renderEdgeTube(points, edgeIndex) {
    const curve = new THREE.CatmullRomCurve3(points);

    // Calculate thickness based on distance from center
    const avgPosition = points.reduce(
      (acc, p) => acc.add(p),
      new THREE.Vector3()
    ).divideScalar(points.length);

    const distance = avgPosition.length();
    const maxDistance = 3.0;
    const normalizedDist = Math.min(distance / maxDistance, 1.0);

    // Thickness varies with distance (thicker = farther from center)
    const thickness = this.minThickness +
      (this.maxThickness - this.minThickness) *
      Math.pow(normalizedDist, this.thicknessCurve);

    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      32,              // segments
      thickness,       // radius
      8,               // radial segments
      false            // closed
    );

    const tubeMaterial = new THREE.MeshPhongMaterial({
      color: 0x667eea,
      shininess: 100,
      specular: 0x444444
    });

    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.group.add(tubeMesh);
    this.tubeMeshes.push(tubeMesh);
  }

  /**
   * Render vertex spheres
   */
  renderVertices(vertices3D) {
    for (let i = 0; i < vertices3D.length; i++) {
      const v3d = vertices3D[i];
      if (!v3d) continue;

      const radius = getVertexSphereRadius(
        this.vertices4DCurrent[i],
        this.projectionType,
        this.perspectiveDistance
      );

      const sphereGeometry = new THREE.SphereGeometry(radius, 8, 8);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b9d,
        transparent: true,
        opacity: 0.8
      });

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(v3d[0], v3d[1], v3d[2]);

      this.group.add(sphere);
      this.vertexMeshes.push(sphere);
    }
  }

  /**
   * Initialize geometry once (for performance optimization)
   * Creates all line/tube geometries and adds them to scene
   */
  initializeGeometry() {
    console.log('[PolytopeViewer] Initializing geometry (one-time setup)');

    // Clear any existing geometry
    this.clearGeometry();

    // Initialize vertex buffers
    this.vertex3DBuffer = new Array(this.vertices4DCurrent.length);
    this.vertex4DBuffer = new Array(this.vertices4DCurrent.length);

    // Project vertices to 3D initially
    for (let i = 0; i < this.vertices4DCurrent.length; i++) {
      const v4d = this.vertices4DCurrent[i];
      if (this.projectionType === 'stereographic') {
        this.vertex3DBuffer[i] = stereographicProject(v4d);
      } else {
        this.vertex3DBuffer[i] = perspectiveProject(v4d, this.perspectiveDistance);
      }
      this.vertex4DBuffer[i] = { ...v4d };
    }

    const edgesToRender = Math.min(this.edgeIndices.length, this.edgeLimit);

    // Create geometry for each edge
    for (let i = 0; i < edgesToRender; i++) {
      const [v1Idx, v2Idx] = this.edgeIndices[i];
      const v1_4d = this.vertices4DCurrent[v1Idx];
      const v2_4d = this.vertices4DCurrent[v2Idx];

      // Generate initial curve points
      const curvePoints = generateCurvePoints(
        v1_4d,
        v2_4d,
        this.projectionType,
        this.NUM_CURVE_POINTS,
        this.perspectiveDistance
      );

      if (curvePoints.length < 2) continue;

      // Convert to Three.js vectors
      const threePoints = curvePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

      // Create line geometry with updateable position buffer
      const curve = new THREE.CatmullRomCurve3(threePoints);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(this.LINE_SUBDIVISIONS)
      );

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00d9ff,
        linewidth: 2
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.visible = !this.showMeshView;  // Hide lines if mesh view is enabled
      this.group.add(line);
      this.edgeLines.push(line);

      // Create tube geometry if in mesh view (using custom BufferGeometry)
      if (this.showMeshView) {
        const avgPosition = threePoints.reduce(
          (acc, p) => acc.add(p.clone()),
          new THREE.Vector3()
        ).divideScalar(threePoints.length);

        const distance = avgPosition.length();
        const maxDistance = 3.0;
        const normalizedDist = Math.min(distance / maxDistance, 1.0);

        const thickness = this.minThickness +
          (this.maxThickness - this.minThickness) *
          Math.pow(normalizedDist, this.thicknessCurve);

        const radialSegments = this.getTubeRadialSegments(distance);

        // Create custom tube geometry (export-ready, updateable)
        const tubeGeometry = this.createCustomTubeGeometry(
          curve,
          this.TUBE_SEGMENTS,
          thickness,
          radialSegments
        );

        const tubeMaterial = new THREE.MeshPhongMaterial({
          color: 0x667eea,
          shininess: 100,
          specular: 0x444444
        });

        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.group.add(tubeMesh);
        this.tubeMeshes.push(tubeMesh);

        // Store metadata for this tube
        this.tubeMetadata.push({
          tubularSegments: this.TUBE_SEGMENTS,
          radialSegments: radialSegments
        });

        // Initialize Frenet frame cache
        this.frenetFrameCache.push(null);
        this.frenetCacheValid.push(false);
      }
    }

    // Always create vertex meshes (control visibility later)
    // This ensures vertices can be toggled on/off without recreating geometry
    for (let i = 0; i < this.vertex3DBuffer.length; i++) {
      const v3d = this.vertex3DBuffer[i];
      if (!v3d) continue;

      const radius = getVertexSphereRadius(
        this.vertices4DCurrent[i],
        this.projectionType,
        this.perspectiveDistance
      );

      const sphereGeometry = new THREE.SphereGeometry(radius, 8, 8);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6b9d,
        transparent: true,
        opacity: 0.8
      });

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(v3d[0], v3d[1], v3d[2]);
      sphere.visible = this.showVertices; // Set initial visibility

      this.group.add(sphere);
      this.vertexMeshes.push(sphere);
    }

    this.geometryInitialized = true;
    console.log(`[PolytopeViewer] Geometry initialized: ${this.edgeLines.length} edges`);
  }

  /**
   * Get adaptive tube radial segments based on distance
   */
  getTubeRadialSegments(distance) {
    if (distance < 20) {
      return 6;  // Close: medium detail
    } else if (distance < 50) {
      return 5;  // Medium distance: low-medium detail
    } else {
      return 4;  // Far: low detail (minimum for roundness)
    }
  }

  /**
   * Create custom tube BufferGeometry with updateable attributes
   *
   * This creates a tube geometry from scratch with all attributes needed for:
   * - Real-time rendering (position, normal updates)
   * - OBJ/GLB/STL export (proper topology, normals, UVs)
   *
   * @param {THREE.Curve} curve - The curve path to follow
   * @param {number} tubularSegments - Number of segments along the curve (more = smoother curve)
   * @param {number} radius - Tube radius/thickness
   * @param {number} radialSegments - Number of segments around the tube (more = rounder)
   * @returns {THREE.BufferGeometry} Export-ready tube geometry
   */
  createCustomTubeGeometry(curve, tubularSegments, radius, radialSegments) {
    // Calculate Frenet frames for proper tube orientation along curve
    // Frenet frames provide tangent, normal, and binormal vectors at each point
    const frames = curve.computeFrenetFrames(tubularSegments, false);

    // Pre-allocate arrays for geometry attributes
    // Each vertex needs: position (x,y,z), normal (x,y,z), UV (u,v)
    const vertexCount = (tubularSegments + 1) * (radialSegments + 1);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];

    let vertexIndex = 0;

    // Build vertices along the curve
    for (let i = 0; i <= tubularSegments; i++) {
      // Get position along curve (0.0 to 1.0)
      const t = i / tubularSegments;
      const p = curve.getPointAt(t);

      // Get orientation at this point (from Frenet frames)
      const T = frames.tangents[i];   // Direction along curve
      const N = frames.normals[i];    // Normal direction
      const B = frames.binormals[i];  // Binormal direction

      // Create circular cross-section at this point
      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);

        // Calculate vertex position on circle
        // Formula: center + radius * (cos * normal + sin * binormal)
        const x = p.x + radius * (cos * N.x + sin * B.x);
        const y = p.y + radius * (cos * N.y + sin * B.y);
        const z = p.z + radius * (cos * N.z + sin * B.z);

        // Store position
        positions[vertexIndex * 3 + 0] = x;
        positions[vertexIndex * 3 + 1] = y;
        positions[vertexIndex * 3 + 2] = z;

        // Calculate surface normal (points outward from tube center)
        const normalX = cos * N.x + sin * B.x;
        const normalY = cos * N.y + sin * B.y;
        const normalZ = cos * N.z + sin * B.z;

        // Store normal
        normals[vertexIndex * 3 + 0] = normalX;
        normals[vertexIndex * 3 + 1] = normalY;
        normals[vertexIndex * 3 + 2] = normalZ;

        // Store UV coordinates (for texturing/export)
        // U: wraps around tube (0-1)
        // V: runs along tube length (0-1)
        uvs[vertexIndex * 2 + 0] = j / radialSegments;
        uvs[vertexIndex * 2 + 1] = i / tubularSegments;

        vertexIndex++;
      }
    }

    // Build triangle indices (two triangles per quad)
    // This creates the mesh topology for rendering and export
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        // Vertex indices for current quad
        const a = i * (radialSegments + 1) + j;
        const b = a + radialSegments + 1;
        const c = a + radialSegments + 2;
        const d = a + 1;

        // Two triangles: (a,b,d) and (b,c,d)
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Create BufferGeometry and assign attributes
    const geometry = new THREE.BufferGeometry();

    // Position attribute (required for rendering and export)
    geometry.setAttribute('position',
      new THREE.BufferAttribute(positions, 3)
    );

    // Normal attribute (required for lighting and export)
    geometry.setAttribute('normal',
      new THREE.BufferAttribute(normals, 3)
    );

    // UV attribute (optional but professional for export)
    geometry.setAttribute('uv',
      new THREE.BufferAttribute(uvs, 2)
    );

    // Index attribute (defines triangle faces)
    geometry.setIndex(indices);

    // Compute bounding sphere for frustum culling
    geometry.computeBoundingSphere();

    return geometry;
  }

  /**
   * Update tube geometry positions and normals in-place (PERFORMANCE CRITICAL)
   *
   * This updates an existing tube geometry without recreating it.
   * Uses cached Frenet frames to avoid expensive recalculation every frame.
   *
   * @param {THREE.BufferGeometry} geometry - Existing tube geometry to update
   * @param {THREE.Curve} curve - New curve path
   * @param {number} radius - New tube radius
   * @param {number} tubularSegments - Must match geometry's segment count
   * @param {number} radialSegments - Must match geometry's segment count
   * @param {number} tubeIndex - Index for Frenet frame cache lookup
   */
  updateCustomTubePositions(geometry, curve, radius, tubularSegments, radialSegments, tubeIndex) {
    // Get references to existing attribute arrays
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;

    // Use cached Frenet frames or compute new ones
    let frames;
    if (this.frenetCacheValid[tubeIndex]) {
      frames = this.frenetFrameCache[tubeIndex];
    } else {
      // Cache miss - compute and store Frenet frames
      frames = curve.computeFrenetFrames(tubularSegments, false);
      this.frenetFrameCache[tubeIndex] = frames;
      this.frenetCacheValid[tubeIndex] = true;
    }

    let vertexIndex = 0;

    // Update all vertices
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const p = curve.getPointAt(t);

      const T = frames.tangents[i];
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);

        // Calculate new vertex position
        const x = p.x + radius * (cos * N.x + sin * B.x);
        const y = p.y + radius * (cos * N.y + sin * B.y);
        const z = p.z + radius * (cos * N.z + sin * B.z);

        // Update position in-place (no new allocation!)
        positions.setXYZ(vertexIndex, x, y, z);

        // Calculate new normal
        const normalX = cos * N.x + sin * B.x;
        const normalY = cos * N.y + sin * B.y;
        const normalZ = cos * N.z + sin * B.z;

        // Update normal in-place
        normals.setXYZ(vertexIndex, normalX, normalY, normalZ);

        vertexIndex++;
      }
    }

    // Mark attributes as needing GPU upload
    positions.needsUpdate = true;
    normals.needsUpdate = true;

    // Update bounding sphere for frustum culling
    geometry.computeBoundingSphere();
  }

  /**
   * Update all geometry in-place (PERFORMANCE OPTIMIZED)
   * Called during 4D rotation - updates positions without recreating meshes
   */
  updateAllGeometry() {
    // Update vertex buffers
    this.updateVertexBuffers();

    // Handle mesh view toggle
    if (this.showMeshView && this.tubeMeshes.length === 0) {
      // Mesh view was just enabled - create tubes and hide lines
      this.createAllTubeMeshes();
      this.edgeLines.forEach(line => { line.visible = false; });
    } else if (!this.showMeshView && this.tubeMeshes.length > 0) {
      // Mesh view was just disabled - remove tubes and show lines
      this.removeAllTubeMeshes();
      this.edgeLines.forEach(line => { line.visible = true; });
    }

    // Invalidate Frenet cache every 10 frames to prevent drift
    this._tubeUpdateCounter++;
    if (this._tubeUpdateCounter % 10 === 0) {
      this.frenetCacheValid.fill(false);
    }

    // Update all edge curves (smooth updates every frame with Frenet caching)
    const edgesToRender = Math.min(this.edgeIndices.length, this.edgeLimit);
    for (let i = 0; i < edgesToRender; i++) {
      this.updateSingleCurve(i);
    }

    // Update vertex positions and visibility
    if (this.showVertices) {
      this.updateVertexPositions();
      // Ensure vertices are visible
      this.vertexMeshes.forEach(mesh => {
        mesh.visible = true;
      });
    } else {
      // Hide vertices when toggled off
      this.vertexMeshes.forEach(mesh => {
        mesh.visible = false;
      });
    }
  }

  /**
   * Update vertex buffers after 4D rotation
   */
  updateVertexBuffers() {
    // Project all vertices to 3D
    for (let i = 0; i < this.vertices4DCurrent.length; i++) {
      const v4d = this.vertices4DCurrent[i];
      if (this.projectionType === 'stereographic') {
        this.vertex3DBuffer[i] = stereographicProject(v4d);
      } else {
        this.vertex3DBuffer[i] = perspectiveProject(v4d, this.perspectiveDistance);
      }
    }
  }

  /**
   * Update a single curve's geometry in-place
   */
  updateSingleCurve(edgeIndex) {
    if (edgeIndex >= this.edgeLines.length) return;

    const [v1Idx, v2Idx] = this.edgeIndices[edgeIndex];
    const v1_4d = this.vertices4DCurrent[v1Idx];
    const v2_4d = this.vertices4DCurrent[v2Idx];

    // Generate updated curve points
    const curvePoints = generateCurvePoints(
      v1_4d,
      v2_4d,
      this.projectionType,
      this.NUM_CURVE_POINTS,
      this.perspectiveDistance
    );

    if (curvePoints.length < 2) return;

    // Convert to Three.js vectors
    const threePoints = curvePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

    // Update line geometry (always update - cheap operation)
    const line = this.edgeLines[edgeIndex];
    const curve = new THREE.CatmullRomCurve3(threePoints);
    const newPoints = curve.getPoints(this.LINE_SUBDIVISIONS);

    // Update position buffer in-place
    const positions = line.geometry.attributes.position;
    for (let i = 0; i < newPoints.length; i++) {
      positions.setXYZ(i, newPoints[i].x, newPoints[i].y, newPoints[i].z);
    }
    positions.needsUpdate = true;

    // Update tube geometry if in mesh view (smooth updates with Frenet caching)
    if (this.showMeshView && edgeIndex < this.tubeMeshes.length) {
      this.updateTubeGeometry(edgeIndex, curve, threePoints);
    }
  }

  /**
   * Update tube geometry in-place using custom BufferGeometry (PERFORMANCE CRITICAL)
   *
   * This is the key optimization: instead of dispose + recreate,
   * we update the existing geometry's position and normal attributes.
   */
  updateTubeGeometry(edgeIndex, curve, threePoints) {
    const tubeMesh = this.tubeMeshes[edgeIndex];
    if (!tubeMesh) return;

    // Calculate thickness (radial gradient based on distance from center)
    const avgPosition = threePoints.reduce(
      (acc, p) => acc.add(p.clone()),
      new THREE.Vector3()
    ).divideScalar(threePoints.length);

    const distance = avgPosition.length();
    const maxDistance = 3.0;
    const normalizedDist = Math.min(distance / maxDistance, 1.0);

    const thickness = this.minThickness +
      (this.maxThickness - this.minThickness) *
      Math.pow(normalizedDist, this.thicknessCurve);

    // Get LOD settings
    const radialSegments = this.getTubeRadialSegments(distance);
    const metadata = this.tubeMetadata[edgeIndex];

    // Check if segment counts changed (rare - only happens with LOD transitions)
    if (metadata && (metadata.radialSegments !== radialSegments)) {
      // Segments changed - need to recreate geometry (fallback case)
      console.log(`[Performance] Tube ${edgeIndex} LOD changed: ${metadata.radialSegments} → ${radialSegments}`);

      if (tubeMesh.geometry) {
        tubeMesh.geometry.dispose();
      }

      tubeMesh.geometry = this.createCustomTubeGeometry(
        curve,
        this.TUBE_SEGMENTS,
        thickness,
        radialSegments
      );

      // Update metadata
      metadata.radialSegments = radialSegments;
    } else {
      // Segments unchanged - update in-place (fast path - 99% of cases)
      this.updateCustomTubePositions(
        tubeMesh.geometry,
        curve,
        thickness,
        this.TUBE_SEGMENTS,
        radialSegments,
        edgeIndex  // Pass index for Frenet cache lookup
      );
    }
  }

  /**
   * Update vertex sphere positions
   */
  updateVertexPositions() {
    for (let i = 0; i < this.vertexMeshes.length && i < this.vertex3DBuffer.length; i++) {
      const v3d = this.vertex3DBuffer[i];
      if (!v3d) continue;

      const sphere = this.vertexMeshes[i];
      if (sphere) {
        sphere.position.set(v3d[0], v3d[1], v3d[2]);
      }
    }
  }

  /**
   * Create all tube meshes when mesh view is enabled (uses custom BufferGeometry)
   */
  createAllTubeMeshes() {
    if (this.tubeMeshes.length > 0) return; // Already created

    console.log('[PolytopeViewer] Creating tube meshes for mesh view');

    const edgesToRender = Math.min(this.edgeIndices.length, this.edgeLimit);

    for (let i = 0; i < edgesToRender; i++) {
      const [v1Idx, v2Idx] = this.edgeIndices[i];
      const v1_4d = this.vertices4DCurrent[v1Idx];
      const v2_4d = this.vertices4DCurrent[v2Idx];

      // Generate curve points
      const curvePoints = generateCurvePoints(
        v1_4d,
        v2_4d,
        this.projectionType,
        this.NUM_CURVE_POINTS,
        this.perspectiveDistance
      );

      if (curvePoints.length < 2) continue;

      // Convert to Three.js vectors
      const threePoints = curvePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

      // Calculate thickness
      const avgPosition = threePoints.reduce(
        (acc, p) => acc.add(p.clone()),
        new THREE.Vector3()
      ).divideScalar(threePoints.length);

      const distance = avgPosition.length();
      const maxDistance = 3.0;
      const normalizedDist = Math.min(distance / maxDistance, 1.0);

      const thickness = this.minThickness +
        (this.maxThickness - this.minThickness) *
        Math.pow(normalizedDist, this.thicknessCurve);

      const radialSegments = this.getTubeRadialSegments(distance);

      // Create custom tube geometry (export-ready, updateable)
      const curve = new THREE.CatmullRomCurve3(threePoints);
      const tubeGeometry = this.createCustomTubeGeometry(
        curve,
        this.TUBE_SEGMENTS,
        thickness,
        radialSegments
      );

      // Use iridescent material on desktop, standard Phong on mobile
      let tubeMaterial;
      if (this.iridescentMaterial) {
        // Desktop: always use iridescent for mesh view
        tubeMaterial = this.iridescentMaterial.getMaterial();
      } else {
        // Mobile: use standard Phong material
        tubeMaterial = new THREE.MeshPhongMaterial({
          color: 0x667eea,
          shininess: 100,
          specular: 0x444444
        });
      }

      const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
      this.group.add(tubeMesh);
      this.tubeMeshes.push(tubeMesh);

      // Store metadata for this tube
      this.tubeMetadata.push({
        tubularSegments: this.TUBE_SEGMENTS,
        radialSegments: radialSegments
      });

      // Initialize Frenet frame cache
      this.frenetFrameCache.push(null);
      this.frenetCacheValid.push(false);
    }

    console.log(`[PolytopeViewer] Created ${this.tubeMeshes.length} tube meshes`);
  }

  /**
   * Remove all tube meshes when mesh view is disabled
   */
  removeAllTubeMeshes() {
    if (this.tubeMeshes.length === 0) return;

    console.log('[PolytopeViewer] Removing tube meshes');

    this.tubeMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
      this.group.remove(mesh);
    });
    this.tubeMeshes = [];
    this.tubeMetadata = [];
    this.frenetFrameCache = [];
    this.frenetCacheValid = [];
  }

  /**
   * Clear all geometry from scene
   */
  clearGeometry() {
    // Dispose edge lines
    this.edgeLines.forEach(line => {
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
      this.group.remove(line);
    });
    this.edgeLines = [];

    // Dispose tube meshes
    this.tubeMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
      this.group.remove(mesh);
    });
    this.tubeMeshes = [];
    this.tubeMetadata = [];
    this.frenetFrameCache = [];
    this.frenetCacheValid = [];

    // Dispose vertex spheres
    this.vertexMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
      this.group.remove(mesh);
    });
    this.vertexMeshes = [];

    // Mark as needing re-initialization
    this.geometryInitialized = false;
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isRendering) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update FPS
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.currentFPS = 1000 / delta;
    this.fpsHistory.push(this.currentFPS);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    // 3D rotation
    if (this.rotating3D) {
      this.group.rotation.y += 0.005;
      this.group.rotation.x += 0.002;
    }

    // 4D rotation (auto or manual mode)
    if (this.rotationMode === 'manual' && this.manualRotationController) {
      // Manual mode: update from manual controller
      // Note: 3D rotation is disabled in manual mode for precise 4D control
      const deltaTime = delta / 1000; // Convert ms to seconds
      this.manualRotationController.update(deltaTime);
      this.updateProjection();
    } else if (this.rotating4D && this.rotationEnabled) {
      // Auto mode: continuous rotation
      this.rotation4D.update();
      this.updateProjection();
    }

    // Update iridescent material animation (desktop only, when mesh view is active)
    if (this.iridescentMaterial && this.showMeshView) {
      const deltaTime = delta / 1000; // Convert ms to seconds
      this.iridescentMaterial.update(deltaTime);
    }

    // Render (with bloom if enabled)
    this.bloomEffect.render();
  }

  /**
   * Start rendering
   */
  startRendering() {
    if (this.isRendering) return;
    this.isRendering = true;
    this.animate();
    console.log('[PolytopeViewer] Rendering started');
  }

  /**
   * Stop rendering
   */
  stopRendering() {
    this.isRendering = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('[PolytopeViewer] Rendering stopped');
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Update bloom effect size
    if (this.bloomEffect) {
      this.bloomEffect.updateSize(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Get average FPS
   */
  getAverageFPS() {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }

  /**
   * Set rotation mode (auto or manual)
   * @param {string} mode - 'auto' or 'manual'
   */
  setRotationMode(mode) {
    if (!this.manualRotationController) {
      console.warn('[PolytopeViewer] Manual rotation not available (mobile device)');
      return;
    }

    this.rotationMode = mode;

    if (mode === 'manual') {
      // Enable manual mode
      this.rotation4D.enableManualMode();
      this.manualRotationController.enable();
      console.log('[PolytopeViewer] Switched to MANUAL rotation mode');
    } else {
      // Enable auto mode
      this.rotation4D.disableManualMode();
      this.manualRotationController.disable();
      console.log('[PolytopeViewer] Switched to AUTO rotation mode');
    }

    // Update projection to reflect mode change
    this.updateProjection();
  }

  /**
   * Check if 4D rotation should be disabled
   * Returns true if: mesh view is on AND edges > 1200
   */
  should4DRotationBeDisabled() {
    return this.showMeshView && this.currentEdgeCount > this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH;
  }

  /**
   * Show notification that 4D rotation is unavailable in mesh view
   */
  show4DRotationDisabledMessage() {
    // Check if notification already exists
    if (document.querySelector('.rotation-4d-disabled-notice')) {
      return;
    }

    // Create temporary notification
    const message = document.createElement('div');
    message.className = 'rotation-4d-disabled-notice mesh-unavailable-notice';
    message.innerHTML = `
      <div class="notice-content">
        <strong>4D Rotation Disabled</strong>
        <p>This polytope has ${this.currentEdgeCount.toLocaleString()} edges.</p>
        <p>4D rotation is disabled in mesh view for polytopes with >${this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH.toLocaleString()} edges.</p>
        <p>Switch to line view to enable 4D rotation!</p>
      </div>
    `;

    document.body.appendChild(message);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      message.classList.add('fade-out');
      setTimeout(() => message.remove(), 500);
    }, 5000);
  }

  /**
   * Toggle mesh view
   * @param {boolean} enabled - True to enable mesh view
   */
  toggleMeshView(enabled) {
    // If enabling mesh view on complex polytope, disable 4D rotation
    if (enabled && this.currentEdgeCount > this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH && this.rotating4D) {
      console.log(`[PolytopeViewer] Auto-disabling 4D rotation for mesh view (${this.currentEdgeCount} edges)`);
      this.rotating4D = false;

      // Update 4D rotation button state
      const rotate4DBtn = document.getElementById('rotate-4d-btn');
      if (rotate4DBtn) {
        rotate4DBtn.classList.remove('active');
        rotate4DBtn.textContent = '4D Rotate: OFF';
      }
    }

    // Apply mesh view setting
    this.showMeshView = enabled;
    console.log(`[PolytopeViewer] Mesh view: ${enabled ? 'enabled' : 'disabled'}`);

    // Update geometry
    if (this.geometryInitialized) {
      this.updateAllGeometry();
    }

    // Update performance banner
    if (this.performanceBanner) {
      this.performanceBanner.update(this.currentEdgeCount, this.rotating4D, this.showMeshView);
    }
  }

  /**
   * Dispose viewer and clean up resources
   */
  /**
   * Capture screenshot with optional watermark removal and transparent background
   * @param {string} filename - Filename for download
   * @param {boolean} removeWatermark - True to remove watermark (Creator/Pro tier)
   * @param {boolean} transparentBackground - True for transparent background (Creator/Pro tier)
   */
  captureScreenshot(filename, removeWatermark = false, transparentBackground = false) {
    if (!this.screenshot) {
      this.screenshot = new Screenshot(this.renderer, this.camera, this.scene);
    }

    // Generate filename if not provided
    if (!filename) {
      const polytopeName = this.currentPolytope?.name || 'polytope';
      filename = this.screenshot.generateFilename(polytopeName);
    }

    // Capture with or without watermark and with/without transparent background based on license tier
    this.screenshot.captureWithBloom(this.bloomEffect, filename, removeWatermark, transparentBackground);
    console.log(`[PolytopeViewer] Screenshot captured: ${filename} (watermark: ${!removeWatermark}, transparent: ${transparentBackground})`);
  }

  /**
   * Get current polytope data for export
   * @returns {Object} Polytope data
   */
  getCurrentPolytopeData() {
    // Get rotation angles if available
    let rotation4DAngles = null;
    try {
      if (this.rotation4D && typeof this.rotation4D.getCurrentAngles === 'function') {
        rotation4DAngles = this.rotation4D.getCurrentAngles();
      }
    } catch (e) {
      console.warn('[PolytopeViewer] Could not get rotation angles:', e);
    }

    return {
      name: this.polytopeName || 'polytope',
      projectionMode: this.options.projectionType,
      vertices: this.vertices4D,
      edges: this.edges,
      rotation4D: rotation4DAngles,
      viewDistance: this.viewDistance
    };
  }

  /**
   * Export current geometry as OBJ
   * @param {string} type - 'mesh' or 'linework'
   * @returns {string} OBJ file content
   */
  exportOBJ(type = 'mesh') {
    console.log('[PolytopeViewer] exportOBJ called with type:', type);
    console.log('[PolytopeViewer] Current projection mode:', this.projectionType);
    console.log('[PolytopeViewer] tubeMeshes:', this.tubeMeshes?.length);
    console.log('[PolytopeViewer] vertexMeshes:', this.vertexMeshes?.length);
    console.log('[PolytopeViewer] vertices4DCurrent:', this.vertices4DCurrent?.length);
    console.log('[PolytopeViewer] edgeIndices:', this.edgeIndices?.length);
    console.log('[PolytopeViewer] showMeshView:', this.showMeshView);

    // Check if mesh export is available for this polytope
    if (type === 'mesh' && this.currentEdgeCount > this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH) {
      console.warn(`[PolytopeViewer] Mesh export not available (${this.currentEdgeCount} edges > ${this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH})`);
      alert(`Mesh export is not available for this polytope.\n\nThis polytope has ${this.currentEdgeCount.toLocaleString()} edges.\nMesh export is limited to polytopes with ≤${this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH.toLocaleString()} edges for performance.\n\nYou can still export the linework (edges) instead!`);
      return null;
    }

    // For mesh export, temporarily enable mesh view if needed
    const wasMeshView = this.showMeshView;
    if (type === 'mesh' && !this.showMeshView) {
      console.log('[PolytopeViewer] Temporarily enabling mesh view for export...');
      this.showMeshView = true;
      this.updateProjection(); // Regenerate with mesh
    }

    const data = this.getCurrentPolytopeData();

    let obj = `# 4D Polytope Viewer Export\n`;
    obj += `# Polytope: ${data.name}\n`;
    obj += `# Projection: ${this.projectionType}\n`;
    obj += `# Export Type: ${type}\n`;
    obj += `# Generated: ${new Date().toISOString()}\n\n`;

    if (type === 'linework') {
      // Export edges as curves with proper interpolation
      if (this.edgeIndices && this.edgeIndices.length > 0 && this.vertices4DCurrent) {
        obj += `# Edges: ${this.edgeIndices.length}\n`;
        obj += `# Projection: ${this.projectionType}\n`;
        obj += `# Curve segments per edge: ${this.projectionType === 'stereographic' ? 30 : 2}\n\n`;

        let vertexIndex = 1; // OBJ indices start at 1

        // Export each edge as a polyline with curve points
        this.edgeIndices.forEach((edge, edgeIdx) => {
          const [v1Idx, v2Idx] = edge;
          const v1_4d = this.vertices4DCurrent[v1Idx];
          const v2_4d = this.vertices4DCurrent[v2Idx];

          // Generate curve points (uses stereographic or perspective based on current mode)
          const curvePoints = generateCurvePoints(
            v1_4d,
            v2_4d,
            this.projectionType,
            30,
            this.perspectiveDistance
          );

          if (curvePoints.length < 2) {
            console.warn(`[Export] Edge ${edgeIdx} has insufficient points, skipping`);
            return;
          }

          obj += `# Edge ${edgeIdx + 1}: vertex ${v1Idx} -> ${v2Idx}\n`;

          // Write vertices for this curve
          const startVertexIndex = vertexIndex;
          curvePoints.forEach(point => {
            obj += `v ${point[0].toFixed(6)} ${point[1].toFixed(6)} ${point[2].toFixed(6)}\n`;
          });

          // Write polyline connecting all curve points
          obj += `l`;
          for (let i = 0; i < curvePoints.length; i++) {
            obj += ` ${startVertexIndex + i}`;
          }
          obj += `\n\n`;

          vertexIndex += curvePoints.length;
        });
      }
    } else {
      // Export mesh geometry from tube meshes
      if (!this.tubeMeshes || this.tubeMeshes.length === 0) {
        obj += `# No mesh data available - please enable mesh view first\n`;
        obj += `# Falling back to linework export\n\n`;

        // Fallback to linework using vertex spheres
        if (this.vertexMeshes && this.vertexMeshes.length > 0) {
          this.vertexMeshes.forEach(sphere => {
            const pos = sphere.position;
            obj += `v ${pos.x.toFixed(6)} ${pos.y.toFixed(6)} ${pos.z.toFixed(6)}\n`;
          });
          obj += `\n`;
        }
        if (this.edgeIndices && this.edgeIndices.length > 0) {
          this.edgeIndices.forEach(edge => {
            obj += `l ${edge[0] + 1} ${edge[1] + 1}\n`;
          });
        }
        return obj;
      }

      obj += `# Tube meshes: ${this.tubeMeshes.length}\n`;
      obj += `# Vertex spheres: ${this.vertexMeshes.length}\n\n`;

      let vertexOffset = 1;

      // Export tube meshes
      this.tubeMeshes.forEach((mesh, tubeIdx) => {
        obj += `o Tube_${tubeIdx + 1}\n`;

        const geometry = mesh.geometry;
        const positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal ? geometry.attributes.normal.array : null;
        const indices = geometry.index ? geometry.index.array : null;

        // Write vertices
        for (let i = 0; i < positions.length; i += 3) {
          obj += `v ${positions[i].toFixed(6)} ${positions[i+1].toFixed(6)} ${positions[i+2].toFixed(6)}\n`;
        }

        // Write normals
        if (normals) {
          for (let i = 0; i < normals.length; i += 3) {
            obj += `vn ${normals[i].toFixed(6)} ${normals[i+1].toFixed(6)} ${normals[i+2].toFixed(6)}\n`;
          }
        }

        // Write faces
        if (indices) {
          for (let i = 0; i < indices.length; i += 3) {
            const v1 = indices[i] + vertexOffset;
            const v2 = indices[i+1] + vertexOffset;
            const v3 = indices[i+2] + vertexOffset;
            if (normals) {
              obj += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
            } else {
              obj += `f ${v1} ${v2} ${v3}\n`;
            }
          }
        }

        vertexOffset += positions.length / 3;
        obj += '\n';
      });

      // Export vertex spheres
      this.vertexMeshes.forEach((sphere, sphereIdx) => {
        obj += `o VertexSphere_${sphereIdx + 1}\n`;

        const geometry = sphere.geometry;
        const positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal ? geometry.attributes.normal.array : null;
        const indices = geometry.index ? geometry.index.array : null;

        // Apply sphere position offset
        const pos = sphere.position;

        for (let i = 0; i < positions.length; i += 3) {
          obj += `v ${(positions[i] + pos.x).toFixed(6)} ${(positions[i+1] + pos.y).toFixed(6)} ${(positions[i+2] + pos.z).toFixed(6)}\n`;
        }

        if (normals) {
          for (let i = 0; i < normals.length; i += 3) {
            obj += `vn ${normals[i].toFixed(6)} ${normals[i+1].toFixed(6)} ${normals[i+2].toFixed(6)}\n`;
          }
        }

        if (indices) {
          for (let i = 0; i < indices.length; i += 3) {
            const v1 = indices[i] + vertexOffset;
            const v2 = indices[i+1] + vertexOffset;
            const v3 = indices[i+2] + vertexOffset;
            if (normals) {
              obj += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
            } else {
              obj += `f ${v1} ${v2} ${v3}\n`;
            }
          }
        }

        vertexOffset += positions.length / 3;
        obj += '\n';
      });
    }

    console.log('[PolytopeViewer] Generated OBJ size:', obj.length, 'characters');
    console.log('[PolytopeViewer] First 500 chars:', obj.substring(0, 500));

    // Restore original mesh view state if we temporarily changed it
    if (type === 'mesh' && !wasMeshView && this.showMeshView) {
      console.log('[PolytopeViewer] Restoring original mesh view state...');
      this.showMeshView = false;
      this.updateProjection(); // Restore to line view
    }

    return obj;
  }
  dispose() {
    this.stopRendering();
    this.clearGeometry();

    // Disable manual rotation controller
    if (this.manualRotationController) {
      this.manualRotationController.disable();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    console.log('[PolytopeViewer] Disposed');
  }
}
