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
import { MatrixDisplay } from '../ui/MatrixDisplay.js'; // NEW: For displaying 4D rotation matrix
import { GlitchEffect } from '../effects/GlitchEffect.js'; // NEW: For visual feedback on polytope changes
import { licenseManager } from '../license/LicenseManager.js'; // Security: For feature gating
import { FilmGrainEffect } from '../effects/FilmGrainEffect.js'; // Film grain post-processing
import { createMatrix5LineMaterial, createMatrix5PointMaterial, Matrix5Controller } from '../shaders/Matrix5Shader.js'; // Matrix-5 (5D) projection
import { Rotation5D, embedAllIn5D, generateCurvePoints5D, rotateVertex5D, getRotationMatrix5D, projectVertex5Dto3D, stereographicProjectVertex5Dto3D } from './projection5d.js'; // 5D math utilities

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

    // Mesh quality (always high - line view serves as the optimized mode)
    this.meshQuality = 'high';

    // Matrix-5 (5D projection) mode - experimental
    this.projectionMode = 'matrix4'; // 'matrix4' (standard) or 'matrix5' (5D scanner effect)
    this.matrix5Enabled = false;     // Feature flag (enabled via URL param ?mode=matrix5)
    this.matrix5Material = null;     // Shader material for Matrix-5
    this.matrix5Lines = null;        // Line segments for Matrix-5 rendering
    this.matrix5Points = null;       // Point cloud for vertices in Matrix-5
    this.matrix5Controller = null;   // Controller for shader uniforms
    this.rotation5D = null;          // 5D rotation state (for CPU path)
    this.vertices5D = [];            // 4D vertices embedded in 5D (original)
    this.vertices5DRotated = [];     // 5D vertices after rotation (for CPU path)
    this.matrix5ProjectionType = null; // Will inherit from projectionType when Matrix-5 activates
    this.matrix5Time = 0;            // Animation time for CPU-based 5D rotation
    this.matrix5RotationPlane = 'wv'; // Active 5D rotation plane
    this.matrix5RotationSpeed = 0.5; // 5D rotation speed

    // Animation
    this.animationFrameId = null;
    this.isRendering = false;

    // FPS tracking
    this.lastFrameTime = performance.now();
    this.fpsHistory = [];
    this.currentFPS = 60;

    // Performance warning banner
    this.performanceBanner = new PerformanceWarningBanner();

    // Matrix display for 4D rotation (desktop only)
    if (window.innerWidth >= 1024) {
      this.matrixDisplay = new MatrixDisplay('matrix-display');
    } else {
      this.matrixDisplay = null;
    }
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
    // If container is a canvas element, use it directly; otherwise append new canvas
    const canvas = this.container.tagName === 'CANVAS' ? this.container : null;
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // Required for screenshots
    });
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Only append if we created a new canvas (i.e., container wasn't a canvas)
    if (!canvas) {
      this.container.appendChild(this.renderer.domElement);
    }

    // Create bloom effect (desktop only, enabled by default)
    this.bloomEffect = new BloomEffect(this.renderer, this.scene, this.camera);
    this.bloomEffect.setEnabled(true); // ON by default with optimized settings

    // Create film grain effect (desktop only, enabled by default for CRT aesthetic)
    if (window.innerWidth >= 1024 && this.bloomEffect.getComposer()) {
      this.filmGrainEffect = new FilmGrainEffect();
      this.filmGrainEffect.addToComposer(this.bloomEffect.getComposer());
      this.filmGrainEffect.setEnabled(true); // ON by default for retro CRT look
      this.filmGrainEffect.setGrainAmount(0.12); // Subtle but visible
      this.filmGrainEffect.setChromaticAberration(0.0015); // Subtle RGB split
      this.filmGrainEffect.setVignette(0.35); // Noticeable vignette
      console.log('[PolytopeViewer] Film grain effect enabled (desktop)');
    } else {
      this.filmGrainEffect = null;
    }

    // Create materials (desktop only)
    if (window.innerWidth >= 1024) {
      this.iridescentMaterial = new IridescentMaterial();
      this.currentMaterialType = 'iridescent'; // 'iridescent' or 'basic'
      console.log('[PolytopeViewer] Materials available (desktop): iridescent');
    } else {
      this.iridescentMaterial = null;
      this.currentMaterialType = 'basic';
      console.log('[PolytopeViewer] Advanced materials disabled (mobile)');
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

    // Handle window resize (store bound reference for cleanup)
    this._boundOnWindowResize = () => this.onWindowResize();
    window.addEventListener('resize', this._boundOnWindowResize);

    // Create manual rotation controller (desktop only)
    if (window.innerWidth >= 1024) {
      this.manualRotationController = new ManualRotationController(this);
      console.log('[PolytopeViewer] Manual rotation controller available (desktop)');
    } else {
      console.log('[PolytopeViewer] Manual rotation disabled (mobile)');
    }

    // Check for Matrix-5 mode URL parameter
    if (PolytopeViewer.isMatrix5Enabled()) {
      this.matrix5Enabled = true;
      console.log('[PolytopeViewer] Matrix-5 mode ENABLED via URL parameter (?mode=matrix5)');
    }

    console.log('[PolytopeViewer] Initialized successfully');
  }

  /**
   * Load polytope from .off file
   */
  async loadPolytope(url, name = '') {
    console.log(`[PolytopeViewer] Loading polytope from ${url}`);

    try {
      // Trigger glitch effect on desktop before loading new polytope
      if (window.innerWidth >= 1024) {
        GlitchEffect.trigger(this.container);
      }

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

      // Reinitialize Matrix-5 rendering if active
      if (this.projectionMode === 'matrix5') {
        this.disableMatrix5Rendering();
        this.initMatrix5Rendering();
        // Hide standard geometry
        this.edgeLines.forEach(line => { line.visible = false; });
        this.tubeMeshes.forEach(mesh => { mesh.visible = false; });
        this.vertexMeshes.forEach(mesh => { mesh.visible = false; });
      }

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
        // Get quality settings (respects current meshQuality setting)
        const settings = this.getMeshSettings();

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

        // Use quality-based segments (or LOD-based for standard quality)
        const radialSegments = settings.radialSegments || this.getTubeRadialSegments(distance);
        const tubularSegments = settings.tubularSegments;

        // Create custom tube geometry (export-ready, updateable)
        const tubeGeometry = this.createCustomTubeGeometry(
          curve,
          tubularSegments,
          thickness,
          radialSegments
        );

        // Get material based on current selection
        const tubeMaterial = this.getCurrentTubeMaterial();

        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.group.add(tubeMesh);
        this.tubeMeshes.push(tubeMesh);

        // Store metadata for this tube (use actual values used)
        this.tubeMetadata.push({
          tubularSegments: tubularSegments,
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
   * Get mesh quality settings based on current quality mode
   *
   * Standard: Optimized for real-time performance (current defaults)
   * High: High-resolution for exports and close-up renders
   *
   * @returns {{ tubularSegments: number, radialSegments: number, curvePoints: number }}
   */
  getMeshSettings() {
    // Stereographic projection creates curved lines, needs more segments
    if (this.projectionType === 'stereographic') {
      return { tubularSegments: 64, radialSegments: 16, curvePoints: 50 };
    } else {
      // Perspective projection: straighter lines, fewer segments needed
      return { tubularSegments: 32, radialSegments: 12, curvePoints: 30 };
    }
  }

  /**
   * Get current triangle count for mesh view
   * @returns {{ trianglesPerTube: number, totalTriangles: number, edgeCount: number }}
   */
  getTriangleCount() {
    const settings = this.getMeshSettings();
    const edgeCount = this.edgeIndices?.length || 0;

    // For standard mode with LOD, estimate average radial segments
    const radialSegments = settings.radialSegments || 5; // Average LOD value
    const tubularSegments = settings.tubularSegments;

    // Triangle count per tube: 2 * tubularSegments * radialSegments
    // (2 triangles per quad, tubularSegments quads along, radialSegments quads around)
    const trianglesPerTube = 2 * tubularSegments * radialSegments;
    const totalTriangles = trianglesPerTube * edgeCount;

    return {
      trianglesPerTube,
      totalTriangles,
      edgeCount,
      tubularSegments,
      radialSegments
    };
  }

  /**
   * Get the current tube material based on material type selection
   * @returns {THREE.Material} The material to use for tubes
   */
  getCurrentTubeMaterial() {
    if (this.currentMaterialType === 'iridescent' && this.iridescentMaterial) {
      return this.iridescentMaterial.getMaterial();
    }
    // Fallback: basic Phong material
    return new THREE.MeshPhongMaterial({
      color: 0x667eea,
      shininess: 100,
      specular: 0x444444
    });
  }

  /**
   * Set the material type for mesh view
   * @param {'iridescent' | 'basic'} type - Material type
   */
  setMaterialType(type) {
    if (this.currentMaterialType === type) return;

    const validTypes = ['iridescent', 'basic'];
    if (!validTypes.includes(type)) {
      console.warn(`[PolytopeViewer] Invalid material type: ${type}`);
      return;
    }

    const oldType = this.currentMaterialType;
    this.currentMaterialType = type;
    console.log(`[PolytopeViewer] Material changed from ${oldType} to ${type}`);

    // Update all existing tube meshes with new material
    if (this.showMeshView && this.tubeMeshes.length > 0) {
      const newMaterial = this.getCurrentTubeMaterial();
      this.tubeMeshes.forEach(mesh => {
        if (mesh) {
          // Dispose old material to prevent GPU memory leak
          if (mesh.material && mesh.material !== newMaterial) {
            mesh.material.dispose();
          }
          mesh.material = newMaterial;
        }
      });
    }
  }

  /**
   * Rebuild all tube mesh geometry with current quality settings
   * Used when mesh quality changes or for export preparation
   */
  rebuildMeshGeometry() {
    if (!this.showMeshView || this.tubeMeshes.length === 0) return;

    const settings = this.getMeshSettings();
    const startTime = performance.now();

    // Clear metadata and Frenet cache
    this.tubeMetadata = [];
    this.frenetFrameCache = [];
    this.frenetCacheValid = [];

    const numCurvePoints = settings.curvePoints || this.NUM_CURVE_POINTS;

    // Rebuild each tube with new settings
    for (let i = 0; i < this.edgeIndices.length; i++) {
      const [idx1, idx2] = this.edgeIndices[i];
      const tubeMesh = this.tubeMeshes[i];

      if (!tubeMesh) continue;

      // Get 4D vertices for curve generation
      const v1_4d = this.vertices4DCurrent[idx1];
      const v2_4d = this.vertices4DCurrent[idx2];
      if (!v1_4d || !v2_4d) continue;

      // Generate curve points (same signature as createAllTubeMeshes)
      const curvePoints = generateCurvePoints(
        v1_4d,
        v2_4d,
        this.projectionType,
        numCurvePoints,
        this.perspectiveDistance
      );

      if (curvePoints.length < 2) continue;

      // Convert to Three.js vectors
      const threePoints = curvePoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

      // Calculate thickness based on average position
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

      // Get quality-based segments
      const radialSegments = settings.radialSegments || this.getTubeRadialSegments(distance);
      const tubularSegments = settings.tubularSegments;

      // Dispose old geometry
      if (tubeMesh.geometry) {
        tubeMesh.geometry.dispose();
      }

      // Create new geometry with quality settings
      const curve = new THREE.CatmullRomCurve3(threePoints);
      tubeMesh.geometry = this.createCustomTubeGeometry(
        curve,
        tubularSegments,
        thickness,
        radialSegments
      );

      // Store metadata
      this.tubeMetadata[i] = { tubularSegments, radialSegments };
      this.frenetCacheValid[i] = false;
    }

    const elapsed = performance.now() - startTime;
    const triCount = this.getTriangleCount();
    console.log(`[MeshQuality] Rebuilt ${this.tubeMeshes.length} tubes in ${elapsed.toFixed(1)}ms`);
    console.log(`[MeshQuality] Total triangles: ${triCount.totalTriangles.toLocaleString()}`);
  }

  /**
   * Create custom tube BufferGeometry with PER-POINT varying radius
   *
   * This creates a tube geometry from scratch with all attributes needed for:
   * - Real-time rendering (position, normal updates)
   * - OBJ/GLB/STL export (proper topology, normals, UVs)
   * - Smooth thickness gradient (thin near center, thick far from center)
   *
   * @param {THREE.Curve} curve - The curve path to follow
   * @param {number} tubularSegments - Number of segments along the curve (more = smoother curve)
   * @param {number} baseRadius - Base radius (used as fallback, actual radius varies per-point)
   * @param {number} radialSegments - Number of segments around the tube (more = rounder)
   * @returns {THREE.BufferGeometry} Export-ready tube geometry
   */
  createCustomTubeGeometry(curve, tubularSegments, baseRadius, radialSegments) {
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

    // Thickness gradient parameters
    const maxDistance = 3.0;

    let vertexIndex = 0;

    // Build vertices along the curve
    for (let i = 0; i <= tubularSegments; i++) {
      // Get position along curve (0.0 to 1.0)
      const t = i / tubularSegments;
      const p = curve.getPointAt(t);

      // Calculate PER-POINT radius based on distance from origin
      // This creates smooth thickness variation along the tube
      const distance = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      const normalizedDist = Math.min(distance / maxDistance, 1.0);
      const radius = this.minThickness +
        (this.maxThickness - this.minThickness) *
        Math.pow(normalizedDist, this.thicknessCurve);

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
   * Calculates PER-POINT radius for smooth thickness gradient.
   *
   * @param {THREE.BufferGeometry} geometry - Existing tube geometry to update
   * @param {THREE.Curve} curve - New curve path
   * @param {number} baseRadius - Base radius (fallback, actual radius varies per-point)
   * @param {number} tubularSegments - Must match geometry's segment count
   * @param {number} radialSegments - Must match geometry's segment count
   * @param {number} tubeIndex - Index for Frenet frame cache lookup
   */
  updateCustomTubePositions(geometry, curve, baseRadius, tubularSegments, radialSegments, tubeIndex) {
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

    // Thickness gradient parameters
    const maxDistance = 3.0;

    let vertexIndex = 0;

    // Update all vertices
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const p = curve.getPointAt(t);

      // Calculate PER-POINT radius based on distance from origin
      const distance = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      const normalizedDist = Math.min(distance / maxDistance, 1.0);
      const radius = this.minThickness +
        (this.maxThickness - this.minThickness) *
        Math.pow(normalizedDist, this.thicknessCurve);

      const T = frames.tangents[i];
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);

        // Calculate new vertex position with per-point radius
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
    // Vertex spheres disabled in Matrix-5 mesh view (GPU shader handles its own points)
    const hideVertexSpheres = this.projectionMode === 'matrix5' && this.showMeshView;
    if (this.showVertices && !hideVertexSpheres) {
      this.updateVertexPositions();
      this.vertexMeshes.forEach(mesh => { mesh.visible = true; });
    } else {
      this.vertexMeshes.forEach(mesh => { mesh.visible = false; });
    }
  }

  /**
   * Update vertex buffers after 4D rotation
   */
  updateVertexBuffers() {
    // Project all vertices to 3D
    if (this.projectionMode === 'matrix5' && this.vertices5DRotated) {
      // Matrix-5: project 5D rotated vertices through 5D→4D→3D pipeline
      for (let i = 0; i < this.vertices5DRotated.length; i++) {
        const v5d = this.vertices5DRotated[i];
        if (this.matrix5ProjectionType === 'stereographic') {
          this.vertex3DBuffer[i] = stereographicProjectVertex5Dto3D(v5d);
        } else {
          this.vertex3DBuffer[i] = projectVertex5Dto3D(v5d, 2.5, this.perspectiveDistance);
        }
      }
    } else {
      // Matrix-4: project 4D vertices to 3D
      for (let i = 0; i < this.vertices4DCurrent.length; i++) {
        const v4d = this.vertices4DCurrent[i];
        if (this.projectionType === 'stereographic') {
          this.vertex3DBuffer[i] = stereographicProject(v4d);
        } else {
          this.vertex3DBuffer[i] = perspectiveProject(v4d, this.perspectiveDistance);
        }
      }
    }
  }

  /**
   * Update a single curve's geometry in-place
   */
  updateSingleCurve(edgeIndex) {
    if (edgeIndex >= this.edgeLines.length) return;

    const [v1Idx, v2Idx] = this.edgeIndices[edgeIndex];
    let curvePoints;

    // Check if we're in Matrix-5 mode with mesh view (CPU path)
    if (this.projectionMode === 'matrix5' && this.vertices5DRotated) {
      // Use 5D curve generation
      const v1_5d = this.vertices5DRotated[v1Idx];
      const v2_5d = this.vertices5DRotated[v2Idx];

      curvePoints = generateCurvePoints5D(
        v1_5d,
        v2_5d,
        this.matrix5ProjectionType,
        this.NUM_CURVE_POINTS,
        2.5,  // scale5D
        this.perspectiveDistance  // scale4D
      );
    } else {
      // Standard 4D curve generation
      const v1_4d = this.vertices4DCurrent[v1Idx];
      const v2_4d = this.vertices4DCurrent[v2Idx];

      curvePoints = generateCurvePoints(
        v1_4d,
        v2_4d,
        this.projectionType,
        this.NUM_CURVE_POINTS,
        this.perspectiveDistance
      );
    }

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

    // Get metadata for this tube (contains quality settings used when created)
    const metadata = this.tubeMetadata[edgeIndex];

    // Use stored segments from metadata if available, otherwise use defaults
    const tubularSegments = metadata?.tubularSegments || this.TUBE_SEGMENTS;
    const storedRadialSegments = metadata?.radialSegments;

    // Get LOD-based radial segments
    const radialSegments = this.getTubeRadialSegments(distance);

    // Check if segment counts changed (rare - only happens with LOD transitions)
    if (storedRadialSegments && storedRadialSegments !== radialSegments) {
      // Segments changed - need to recreate geometry (fallback case)
      console.log(`[Performance] Tube ${edgeIndex} LOD changed: ${storedRadialSegments} → ${radialSegments}`);

      if (tubeMesh.geometry) {
        tubeMesh.geometry.dispose();
      }

      tubeMesh.geometry = this.createCustomTubeGeometry(
        curve,
        tubularSegments,
        thickness,
        radialSegments
      );

      // Update metadata
      if (metadata) {
        metadata.radialSegments = radialSegments;
      }
    } else {
      // Segments unchanged - update in-place (fast path - 99% of cases)
      this.updateCustomTubePositions(
        tubeMesh.geometry,
        curve,
        thickness,
        tubularSegments,
        storedRadialSegments || radialSegments,
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

    const settings = this.getMeshSettings();
    const numCurvePoints = settings.curvePoints || this.NUM_CURVE_POINTS;

    console.log(`[PolytopeViewer] Creating tube meshes (quality: ${this.meshQuality}, segments: ${settings.tubularSegments}x${settings.radialSegments || 'LOD'})`);

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
        numCurvePoints,
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

      // Use quality settings for segments
      const radialSegments = settings.radialSegments || this.getTubeRadialSegments(distance);
      const tubularSegments = settings.tubularSegments;

      // Create custom tube geometry (export-ready, updateable)
      const curve = new THREE.CatmullRomCurve3(threePoints);
      const tubeGeometry = this.createCustomTubeGeometry(
        curve,
        tubularSegments,
        thickness,
        radialSegments
      );

      // Use iridescent material on desktop, standard Phong on mobile
      // Get material based on current selection
      const tubeMaterial = this.getCurrentTubeMaterial();

      const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
      this.group.add(tubeMesh);
      this.tubeMeshes.push(tubeMesh);

      // Store metadata for this tube
      this.tubeMetadata.push({
        tubularSegments: tubularSegments,
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

    // Matrix-5 mode: GPU-based 5D projection
    if (this.projectionMode === 'matrix5') {
      this.updateMatrix5(delta);
    }

    // Update matrix display on desktop (4D or 5D based on projection mode)
    if (this.matrixDisplay) {
      if (this.projectionMode === 'matrix5') {
        // Show 5x5 rotation matrix in Matrix-5 mode
        const matrix5D = this.get5DRotationMatrix();
        this.matrixDisplay.update(matrix5D);
      } else {
        // Show 4x4 rotation matrix in Matrix-4 mode
        this.matrixDisplay.update(this.rotation4D.getCurrentRotationMatrix());
      }
    }

    if (this.rotationMode === 'manual' && this.manualRotationController) {
      // Manual mode: update from manual controller
      // Note: 3D rotation is disabled in manual mode for precise 4D control
      const deltaTime = delta / 1000; // Convert ms to seconds
      this.manualRotationController.update(deltaTime);
      if (this.projectionMode !== 'matrix5') {
        this.updateProjection();
      }
    } else if (this.rotating4D && this.rotationEnabled) {
      // Auto mode: continuous rotation
      this.rotation4D.update();
      if (this.projectionMode !== 'matrix5') {
        this.updateProjection();
      }
    }

    // Update material animation (desktop only, when mesh view is active)
    if (this.showMeshView && this.projectionMode !== 'matrix5') {
      const deltaTime = delta / 1000; // Convert ms to seconds
      if (this.iridescentMaterial && this.currentMaterialType === 'iridescent') {
        this.iridescentMaterial.update(deltaTime);
      }
    }

    // Update film grain effect (desktop only)
    if (this.filmGrainEffect) {
      this.filmGrainEffect.update();
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

    // Update film grain resolution
    if (this.filmGrainEffect) {
      this.filmGrainEffect.updateResolution(window.innerWidth, window.innerHeight);
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
    message.className = 'rotation-4d-disabled-notice';
    message.innerHTML = `
      <div class="notice-text">
        <div class="notice-title">4D ROTATION DISABLED</div>
        <div class="notice-message">
          THIS POLYTOPE HAS ${this.currentEdgeCount.toLocaleString()} EDGES.
          4D ROTATION IS DISABLED IN MESH VIEW FOR POLYTOPES WITH >${this.MAX_EDGES_FOR_4D_ROTATION_WITH_MESH.toLocaleString()} EDGES.
          SWITCH TO LINE VIEW TO ENABLE 4D ROTATION!
        </div>
      </div>
      <button class="notice-close" onclick="this.parentElement.remove()">✕</button>
    `;

    document.body.appendChild(message);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (message && message.parentElement) {
        message.classList.add('fade-out');
        setTimeout(() => {
          if (message && message.parentElement) {
            message.remove();
          }
        }, 500);
      }
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

    // Handle Matrix-5 mode transitions between GPU and CPU paths
    if (this.projectionMode === 'matrix5') {
      if (enabled) {
        // Switching to mesh view: use CPU path
        console.log('[Matrix5] Switching to CPU path for mesh view');
        // Hide GPU shader objects
        if (this.matrix5Lines) this.matrix5Lines.visible = false;
        if (this.matrix5Points) this.matrix5Points.visible = false;
        // Show tube meshes - vertex spheres hidden (5D projection not supported)
        this.edgeLines.forEach(line => { line.visible = false; });
        this.tubeMeshes.forEach(mesh => { mesh.visible = true; });
        this.vertexMeshes.forEach(mesh => { mesh.visible = false; });
        // Ensure 5D vertices are embedded
        if (!this.vertices5D || this.vertices5D.length === 0) {
          this.vertices5D = embedAllIn5D(this.vertices4DOriginal);
        }
        // Force geometry rebuild
        this.geometryInitialized = false;
      } else {
        // Switching to line view: use GPU shader
        console.log('[Matrix5] Switching to GPU shader for line view');
        // Hide tube meshes and line objects
        this.edgeLines.forEach(line => { line.visible = false; });
        this.tubeMeshes.forEach(mesh => { mesh.visible = false; });
        this.vertexMeshes.forEach(mesh => { mesh.visible = false; });
        // Show GPU shader objects (re-initialize if needed)
        if (!this.matrix5Lines) {
          this.initMatrix5Rendering();
        } else {
          this.matrix5Lines.visible = true;
          if (this.matrix5Points) this.matrix5Points.visible = this.showVertices;
        }
      }
    }

    // Update geometry
    if (this.geometryInitialized) {
      this.updateAllGeometry();
    }

    // Update performance banner
    if (this.performanceBanner) {
      this.performanceBanner.update(this.currentEdgeCount, this.rotating4D, this.showMeshView);
    }
  }

  // ============================================================================
  // MATRIX-5 (5D PROJECTION) MODE - EXPERIMENTAL
  // ============================================================================

  /**
   * Check if Matrix-5 mode is enabled via URL parameter
   * @returns {boolean} True if ?mode=matrix5 is present in URL
   */
  static isMatrix5Enabled() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') === 'matrix5';
  }

  /**
   * Set projection mode (Matrix-4 standard or Matrix-5 experimental)
   * @param {'matrix4' | 'matrix5'} mode - Projection mode
   */
  setProjectionMode(mode) {
    if (mode !== 'matrix4' && mode !== 'matrix5') {
      console.warn(`[Matrix5] Invalid projection mode: ${mode}`);
      return;
    }

    if (this.projectionMode === mode) return;

    const previousMode = this.projectionMode;
    this.projectionMode = mode;

    // Enable matrix5Enabled flag when switching to matrix5 mode
    if (mode === 'matrix5') {
      this.matrix5Enabled = true;
    }

    console.log(`[Matrix5] Switching projection mode: ${previousMode} → ${mode}`);

    if (mode === 'matrix5') {
      // Inherit projection type from current 4D setting if not already set
      if (!this.matrix5ProjectionType) {
        this.matrix5ProjectionType = this.projectionType; // 'stereographic' or 'perspective'
        console.log(`[Matrix5] Inheriting projection type: ${this.matrix5ProjectionType}`);
      }

      // Embed 4D vertices into 5D
      this.vertices5D = embedAllIn5D(this.vertices4DOriginal);
      this.matrix5Time = 0;

      // Initialize 5D rotation state
      if (!this.rotation5D) {
        this.rotation5D = new Rotation5D();
        this.rotation5D.setPlaneActive('wv', true);
      }

      if (this.showMeshView) {
        // Mesh view: use CPU-based 5D projection with existing tube geometry
        console.log('[Matrix5] Using CPU path for mesh view');
        // Hide GPU shader objects if they exist
        if (this.matrix5Lines) this.matrix5Lines.visible = false;
        if (this.matrix5Points) this.matrix5Points.visible = false;
        // Show tube meshes - vertex spheres hidden (5D projection not supported)
        this.edgeLines.forEach(line => { line.visible = false; });
        this.tubeMeshes.forEach(mesh => { mesh.visible = true; });
        this.vertexMeshes.forEach(mesh => { mesh.visible = false; });
        // Force geometry rebuild with 5D projection
        this.geometryInitialized = false;
        this.updateProjection();
      } else {
        // Line view: use GPU shader (fast path)
        console.log('[Matrix5] Using GPU shader for line view');
        this.initMatrix5Rendering();
        // Hide standard geometry
        this.edgeLines.forEach(line => { line.visible = false; });
        this.tubeMeshes.forEach(mesh => { mesh.visible = false; });
        this.vertexMeshes.forEach(mesh => { mesh.visible = false; });
      }
    } else {
      // Disable Matrix-5 rendering
      this.disableMatrix5Rendering();
      // Show standard geometry
      this.edgeLines.forEach(line => { line.visible = !this.showMeshView; });
      this.tubeMeshes.forEach(mesh => { mesh.visible = this.showMeshView; });
      this.vertexMeshes.forEach(mesh => { mesh.visible = this.showVertices; });
      // Rebuild geometry with standard 4D projection
      this.geometryInitialized = false;
      this.updateProjection();
    }
  }

  /**
   * Initialize Matrix-5 rendering objects
   * Creates GPU-accelerated shader materials and geometry for 5D projection
   */
  initMatrix5Rendering() {
    if (!this.vertices4DOriginal || this.vertices4DOriginal.length === 0) {
      console.warn('[Matrix5] No polytope loaded, cannot initialize');
      return;
    }

    console.log('[Matrix5] Initializing 5D projection rendering...');

    // Embed 4D vertices into 5D (v = 0)
    this.vertices5D = embedAllIn5D(this.vertices4DOriginal);

    // Create line material for edges
    this.matrix5Material = createMatrix5LineMaterial({
      uScale4D: this.perspectiveDistance,
      uScale5D: 2.5,
      uAutoRotate: true,
      uAutoRotateSpeed: 0.5,
      uAutoRotatePlane: 3 // WV plane
    });

    // Create Matrix-5 controller for uniform management
    this.matrix5Controller = new Matrix5Controller(this.matrix5Material);

    // Apply current projection type to Matrix-5 controller
    if (this.matrix5ProjectionType) {
      this.matrix5Controller.setProjectionType(this.matrix5ProjectionType);
    }

    // Create geometry for all edges
    const positions = [];
    const positions4D = [];

    // Build line segments for each edge
    for (let i = 0; i < this.edgeIndices.length; i++) {
      const [v1Idx, v2Idx] = this.edgeIndices[i];
      const v1 = this.vertices4DOriginal[v1Idx];
      const v2 = this.vertices4DOriginal[v2Idx];

      // Generate interpolated points along edge for smoother curves
      const NUM_SEGMENTS = 20;
      for (let j = 0; j < NUM_SEGMENTS; j++) {
        const t1 = j / NUM_SEGMENTS;
        const t2 = (j + 1) / NUM_SEGMENTS;

        // Interpolate in 4D
        const p1 = [
          v1[0] + t1 * (v2[0] - v1[0]),
          v1[1] + t1 * (v2[1] - v1[1]),
          v1[2] + t1 * (v2[2] - v1[2]),
          v1[3] + t1 * (v2[3] - v1[3])
        ];
        const p2 = [
          v1[0] + t2 * (v2[0] - v1[0]),
          v1[1] + t2 * (v2[1] - v1[1]),
          v1[2] + t2 * (v2[2] - v1[2]),
          v1[3] + t2 * (v2[3] - v1[3])
        ];

        // Add line segment (position is placeholder, shader will project)
        positions.push(0, 0, 0); // Vertex 1 (3D placeholder)
        positions.push(0, 0, 0); // Vertex 2 (3D placeholder)

        // Store 4D coordinates as custom attribute
        positions4D.push(p1[0], p1[1], p1[2], p1[3]);
        positions4D.push(p2[0], p2[1], p2[2], p2[3]);
      }
    }

    // Create BufferGeometry for line segments
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aPosition4D', new THREE.Float32BufferAttribute(positions4D, 4));

    // Create line segments object
    this.matrix5Lines = new THREE.LineSegments(geometry, this.matrix5Material);
    this.group.add(this.matrix5Lines);

    // Create point material for vertices (optional)
    const pointMaterial = createMatrix5PointMaterial({
      uScale4D: this.perspectiveDistance,
      uScale5D: 2.5,
      pointSize: 4.0
    });

    // Create vertex points
    const vertexPositions = [];
    const vertex4DPositions = [];

    for (let i = 0; i < this.vertices4DOriginal.length; i++) {
      const v = this.vertices4DOriginal[i];
      vertexPositions.push(0, 0, 0); // Placeholder
      vertex4DPositions.push(v[0], v[1], v[2], v[3]);
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexPositions, 3));
    pointGeometry.setAttribute('aPosition4D', new THREE.Float32BufferAttribute(vertex4DPositions, 4));

    this.matrix5Points = new THREE.Points(pointGeometry, pointMaterial);
    this.matrix5Points.visible = this.showVertices;
    this.group.add(this.matrix5Points);

    // Initialize 5D rotation state (for CPU-side calculations if needed)
    this.rotation5D = new Rotation5D();
    this.rotation5D.setPlaneActive('wv', true); // Default: rotate in WV plane

    console.log(`[Matrix5] Initialized: ${this.edgeIndices.length} edges, ${this.vertices4DOriginal.length} vertices`);
  }

  /**
   * Update Matrix-5 shader uniforms (called each frame)
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  updateMatrix5(deltaTime) {
    // Update animation time
    this.matrix5Time += deltaTime * 0.001;

    // GPU shader path (line view)
    if (this.matrix5Controller) {
      // Update time for auto-rotation
      this.matrix5Controller.update(deltaTime);

      // Sync 4D rotation angles from standard rotation controller
      if (this.rotation4D && this.rotating4D) {
        const angles = this.rotation4D.getCurrentAngles?.() || {};
        if (angles.xy !== undefined) this.matrix5Controller.set4DAngle('xy', angles.xy * Math.PI / 180);
        if (angles.xz !== undefined) this.matrix5Controller.set4DAngle('xz', angles.xz * Math.PI / 180);
        if (angles.xw !== undefined) this.matrix5Controller.set4DAngle('xw', angles.xw * Math.PI / 180);
        if (angles.yz !== undefined) this.matrix5Controller.set4DAngle('yz', angles.yz * Math.PI / 180);
        if (angles.yw !== undefined) this.matrix5Controller.set4DAngle('yw', angles.yw * Math.PI / 180);
        if (angles.zw !== undefined) this.matrix5Controller.set4DAngle('zw', angles.zw * Math.PI / 180);
      }

      // Update point visibility to match vertex setting
      if (this.matrix5Points) {
        this.matrix5Points.visible = this.showVertices;
      }
    }

    // CPU path (mesh view) - compute rotated 5D vertices
    if (this.showMeshView && this.vertices5D && this.vertices5D.length > 0) {
      // Get 5D rotation matrix for current animation time
      const angle5D = this.matrix5Time * this.matrix5RotationSpeed;
      const rotationMatrix5D = getRotationMatrix5D(this.matrix5RotationPlane, angle5D);

      // Rotate all 5D vertices
      this.vertices5DRotated = this.vertices5D.map(v => rotateVertex5D(v, rotationMatrix5D));

      // Hide vertex spheres in Matrix-5 mesh view (5D projection not supported for spheres)
      this.vertexMeshes.forEach(mesh => { mesh.visible = false; });

      // Update geometry with 5D-projected curves
      this.updateAllGeometry();
    }
  }

  /**
   * Disable Matrix-5 rendering and clean up resources
   */
  disableMatrix5Rendering() {
    console.log('[Matrix5] Disabling 5D projection rendering...');

    // Remove and dispose line segments
    if (this.matrix5Lines) {
      this.group.remove(this.matrix5Lines);
      if (this.matrix5Lines.geometry) this.matrix5Lines.geometry.dispose();
      if (this.matrix5Lines.material) this.matrix5Lines.material.dispose();
      this.matrix5Lines = null;
    }

    // Remove and dispose points
    if (this.matrix5Points) {
      this.group.remove(this.matrix5Points);
      if (this.matrix5Points.geometry) this.matrix5Points.geometry.dispose();
      if (this.matrix5Points.material) this.matrix5Points.material.dispose();
      this.matrix5Points = null;
    }

    // Clear controller and material references
    this.matrix5Controller = null;
    this.matrix5Material = null;
    this.rotation5D = null;
    this.vertices5D = [];

    console.log('[Matrix5] Cleanup complete');
  }

  /**
   * Set Matrix-5 auto-rotation plane
   * @param {'xv' | 'yv' | 'zv' | 'wv'} plane - 5D rotation plane
   */
  setMatrix5RotationPlane(plane) {
    // Update CPU-side state (for mesh view)
    this.matrix5RotationPlane = plane;

    // Update GPU shader (for line view)
    if (this.matrix5Controller) {
      this.matrix5Controller.setAutoRotatePlane(plane);
    }
    console.log(`[Matrix5] Rotation plane set to: ${plane.toUpperCase()}`);
  }

  /**
   * Set Matrix-5 auto-rotation speed
   * @param {number} speed - Rotation speed in radians per second
   */
  setMatrix5RotationSpeed(speed) {
    // Update CPU-side state (for mesh view)
    this.matrix5RotationSpeed = speed;

    // Update GPU shader (for line view)
    if (this.matrix5Controller) {
      this.matrix5Controller.setAutoRotateSpeed(speed);
    }
  }

  /**
   * Set Matrix-5 color scheme
   * @param {number} nearColor - Color when v ≈ 0 (hex)
   * @param {number} farColor - Color when |v| is large (hex)
   */
  setMatrix5Colors(nearColor, farColor) {
    if (!this.matrix5Controller) return;
    this.matrix5Controller.setColors(nearColor, farColor);
  }

  /**
   * Toggle Matrix-5 auto-rotation
   * @param {boolean} enabled - Whether auto-rotation is enabled
   */
  setMatrix5AutoRotate(enabled) {
    if (!this.matrix5Controller) return;
    this.matrix5Controller.setAutoRotate(enabled);
  }

  /**
   * Set Matrix-5 projection type
   * @param {'perspective' | 'stereographic'} type - Projection type
   */
  setMatrix5ProjectionType(type) {
    // Update CPU-side state (for mesh view)
    this.matrix5ProjectionType = type;

    // Update GPU shader (for line view)
    if (this.matrix5Controller) {
      this.matrix5Controller.setProjectionType(type);
    }
    console.log(`[Matrix5] Projection type set to: ${type}`);
  }

  /**
   * Get the current 5D rotation matrix for display
   * @returns {Array} 5x5 2D array representing the rotation matrix
   */
  get5DRotationMatrix() {
    // Calculate current 5D rotation angle based on time and speed
    const angle = this.matrix5Time * this.matrix5RotationSpeed;
    const matrix = getRotationMatrix5D(this.matrix5RotationPlane, angle);
    return this.float32To5x5Array(matrix);
  }

  /**
   * Convert Float32Array (column-major 5x5) to 2D array (row-major) for display
   * @param {Float32Array} float32 - Column-major 5x5 matrix
   * @returns {Array} 5x5 2D array in row-major order
   */
  float32To5x5Array(float32) {
    const result = [];
    for (let row = 0; row < 5; row++) {
      result.push([]);
      for (let col = 0; col < 5; col++) {
        // Column-major: m[col * 5 + row]
        result[row].push(float32[col * 5 + row]);
      }
    }
    return result;
  }

  /**
   * Capture screenshot with optional watermark removal, transparent background, and resolution
   * @param {string} filename - Filename for download
   * @param {boolean} removeWatermark - True to remove watermark (Creator/Pro tier)
   * @param {boolean} transparentBackground - True for transparent background (Creator/Pro tier)
   * @param {string} resolution - Resolution: 'current', '1080p', or '4k' (default: 'current' for free, '4k' for paid)
   */
  captureScreenshot(filename, removeWatermark = false, transparentBackground = false, resolution = 'current') {
    // SECURITY: License check - Enforce free tier restrictions
    const tier = licenseManager.getTier();
    if (tier === 'free') {
      // Free tier: force watermark, no transparency, current resolution only
      if (removeWatermark || transparentBackground || resolution !== 'current') {
        console.warn('[PolytopeViewer] Screenshot premium features blocked - requires Creator tier');
        // Enforce free tier settings (don't throw - just downgrade to free tier behavior)
        removeWatermark = false;
        transparentBackground = false;
        resolution = 'current';
      }
    }

    if (!this.screenshot) {
      this.screenshot = new Screenshot(this.renderer, this.camera, this.scene);
    }

    // Generate filename if not provided
    if (!filename) {
      const polytopeName = this.polytopeName || 'polytope';
      const resSuffix = resolution !== 'current' ? `-${resolution}` : '';
      filename = `${polytopeName}${resSuffix}-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`;
    }

    // Use high-res capture for non-current resolutions (Creator/Pro)
    if (resolution !== 'current' && removeWatermark) {
      this.screenshot.captureHighRes(this.bloomEffect, filename, transparentBackground, resolution);
      console.log(`[PolytopeViewer] High-res screenshot: ${filename} (${resolution}, transparent: ${transparentBackground})`);
    } else {
      // Standard capture for free tier or current resolution
      this.screenshot.captureWithBloom(this.bloomEffect, filename, removeWatermark, transparentBackground);
      console.log(`[PolytopeViewer] Screenshot captured: ${filename} (watermark: ${!removeWatermark}, transparent: ${transparentBackground})`);
    }
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
    // SECURITY: License check - OBJ export requires Creator tier or higher
    const tier = licenseManager.getTier();
    if (tier === 'free') {
      console.warn('[PolytopeViewer] OBJ export blocked - requires Creator tier');
      throw new Error('OBJ export requires Creator tier. Upgrade at 4d.pardesco.com/activate');
    }

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

  /**
   * Get list of active rotation planes
   * @returns {Array<string>} Active plane names (e.g., ['XY', 'ZW'])
   */
  getActiveRotationPlanes() {
    if (!this.rotation4D) return ['XY']; // Default

    const activePlanes = this.rotation4D.getActivePlanes();
    // Convert to uppercase format expected by Python scripts
    return activePlanes.map(p => p.toUpperCase());
  }

  /**
   * Export animation JSON chunk for longer animations
   *
   * Generates animation data for a specific frame range, enabling chunked
   * exports for longer animations (5s, 7s, 10s) that would be too memory-intensive
   * to generate in a single pass.
   *
   * @param {number} startFrame - Starting frame number (0-indexed)
   * @param {number} endFrame - Ending frame number (exclusive)
   * @param {number} totalFrames - Total frames in full animation (for rotation calculation)
   * @param {number} fps - Frames per second (default: 24)
   * @param {Function} progressCallback - Optional callback(progress, status) for progress updates
   * @returns {Promise<Object>} Animation JSON data for this chunk
   */
  async exportAnimationJSONChunk(startFrame, endFrame, totalFrames, fps = 24, progressCallback = null) {
    // SECURITY: License check - Animation JSON export requires Creator tier or higher
    const tier = licenseManager.getTier();
    if (tier === 'free') {
      console.warn('[PolytopeViewer] Animation JSON export blocked - requires Creator tier');
      throw new Error('Animation JSON export requires Creator tier. Upgrade at 4d.pardesco.com/activate');
    }

    const chunkFrameCount = endFrame - startFrame;
    console.log(`[PolytopeViewer] Exporting chunk: frames ${startFrame}-${endFrame - 1} of ${totalFrames} total`);

    // Validate we have polytope data
    if (!this.vertices4DOriginal || this.vertices4DOriginal.length === 0) {
      throw new Error('No polytope loaded');
    }

    if (!this.edgeIndices || this.edgeIndices.length === 0) {
      throw new Error('No edges to export');
    }

    // Check for active rotation planes
    const activePlanes = this.getActiveRotationPlanes();
    if (activePlanes.length === 0) {
      throw new Error('No rotation planes active. Enable at least one rotation plane before exporting.');
    }

    // Calculate rotation parameters (based on total animation, not chunk)
    const degreesPerFrame = 360.0 / totalFrames;
    const durationSeconds = totalFrames / fps;

    // Store current state to restore later
    const originalAngle = this.rotation4D.currentAngle;
    const wasRotating4D = this.rotating4D;
    const wasRotating3D = this.rotating3D;

    // Temporarily disable animation
    this.rotating4D = false;
    this.rotating3D = false;

    // Number of sample points per curve (matching old viewer format)
    const CURVE_SAMPLES = 51;

    // Prepare frames array for this chunk
    const frames = [];

    try {
      for (let frameIdx = 0; frameIdx < chunkFrameCount; frameIdx++) {
        const frameNum = startFrame + frameIdx;

        // Report progress within this chunk
        if (progressCallback) {
          const progress = (frameIdx + 1) / chunkFrameCount;
          progressCallback(progress, `Generating frame ${frameIdx + 1} of ${chunkFrameCount}...`);
        }

        // Calculate rotation angle for this frame (based on position in full animation)
        const angle = frameNum * degreesPerFrame;
        this.rotation4D.currentAngle = angle;

        // Apply rotation to get current 4D vertices
        const rotatedVertices = this.rotation4D.applyTo(this.vertices4DOriginal);

        // Generate curves for this frame
        const frameCurves = [];

        for (let edgeIdx = 0; edgeIdx < this.edgeIndices.length; edgeIdx++) {
          const [v1Idx, v2Idx] = this.edgeIndices[edgeIdx];
          const v1_4d = rotatedVertices[v1Idx];
          const v2_4d = rotatedVertices[v2Idx];

          // Generate curve points (sample along edge)
          const controlPoints = [];
          const thicknessValues = [];

          for (let i = 0; i < CURVE_SAMPLES; i++) {
            const t = i / (CURVE_SAMPLES - 1);

            // Interpolate in 4D
            const point4D = [
              v1_4d[0] + t * (v2_4d[0] - v1_4d[0]),
              v1_4d[1] + t * (v2_4d[1] - v1_4d[1]),
              v1_4d[2] + t * (v2_4d[2] - v1_4d[2]),
              v1_4d[3] + t * (v2_4d[3] - v1_4d[3])
            ];

            // Project to 3D
            let point3D;
            if (this.projectionType === 'stereographic') {
              // Normalize to unit sphere for stereographic projection
              const mag = Math.sqrt(
                point4D[0] * point4D[0] +
                point4D[1] * point4D[1] +
                point4D[2] * point4D[2] +
                point4D[3] * point4D[3]
              );
              const normalized = mag > 0 ? point4D.map(x => x / mag) : point4D;

              // Stereographic projection
              const denom = 1 - normalized[0];
              if (Math.abs(denom) < 1e-6) {
                // Near singularity, skip this point
                continue;
              }
              point3D = [
                normalized[1] / denom,
                normalized[2] / denom,
                normalized[3] / denom
              ];
            } else {
              // Perspective projection
              const d = this.perspectiveDistance;
              const w = point4D[0];

              if (w >= d * 0.99 || Math.abs(d - w) < 0.002) {
                // Behind or at viewing plane, skip
                continue;
              }

              const scale = d / (d - w);
              point3D = [
                point4D[1] * scale,
                point4D[2] * scale,
                point4D[3] * scale
              ];
            }

            // Calculate thickness based on distance from origin (radial gradient)
            const distance = Math.sqrt(
              point3D[0] * point3D[0] +
              point3D[1] * point3D[1] +
              point3D[2] * point3D[2]
            );
            const maxDistance = 3.0;
            const normalizedDist = Math.min(distance / maxDistance, 1.0);
            const curvedDist = Math.pow(normalizedDist, this.thicknessCurve);
            const thickness = this.minThickness +
              (this.maxThickness - this.minThickness) * curvedDist;

            controlPoints.push(point3D);
            thicknessValues.push(thickness);
          }

          // Only include edges with valid points
          if (controlPoints.length >= 2) {
            frameCurves.push({
              control_points: controlPoints,
              thickness_values: thicknessValues
            });
          }
        }

        frames.push({
          frame_number: frameNum,
          rotation_angle: angle,
          curves: frameCurves
        });

        // Allow UI to update every 5 frames
        if (frameIdx % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Build final JSON structure (matching old viewer format for Python compatibility)
      const animationData = {
        polytope_name: this.polytopeName || 'polytope',
        frame_count: chunkFrameCount,
        duration_seconds: durationSeconds,
        fps: fps,
        projection_type: this.projectionType,
        perspective_distance: this.perspectiveDistance,
        thickness_settings: {
          min: this.minThickness,
          max: this.maxThickness,
          curve: this.thicknessCurve
        },
        rotation_planes: activePlanes,
        degrees_per_frame: degreesPerFrame,
        frames: frames
      };

      console.log(`[PolytopeViewer] Chunk export complete: ${frames.length} frames, ${frames[0]?.curves?.length || 0} curves per frame`);

      return animationData;

    } finally {
      // Restore original state
      this.rotation4D.currentAngle = originalAngle;
      this.rotating4D = wasRotating4D;
      this.rotating3D = wasRotating3D;

      // Update projection to restore visual state
      this.updateProjection();
    }
  }

  /**
   * Export animation JSON for Blender Alembic conversion
   *
   * Generates animation data matching the format expected by
   * json_to_alembic_curves.py for professional Blender workflows.
   *
   * @param {number} frameCount - Number of frames (default: 48 for 2 second loop at 24fps)
   * @param {number} fps - Frames per second (default: 24)
   * @param {Function} progressCallback - Optional callback(progress, status) for progress updates
   * @returns {Promise<Object>} Animation JSON data
   */
  async exportAnimationJSON(frameCount = 48, fps = 24, progressCallback = null) {
    // SECURITY: License check - Animation JSON export requires Creator tier or higher
    const tier = licenseManager.getTier();
    if (tier === 'free') {
      console.warn('[PolytopeViewer] Animation JSON export blocked - requires Creator tier');
      throw new Error('Animation JSON export requires Creator tier. Upgrade at 4d.pardesco.com/activate');
    }

    console.log(`[PolytopeViewer] Starting animation export: ${frameCount} frames at ${fps} FPS`);

    // Validate we have polytope data
    if (!this.vertices4DOriginal || this.vertices4DOriginal.length === 0) {
      throw new Error('No polytope loaded');
    }

    if (!this.edgeIndices || this.edgeIndices.length === 0) {
      throw new Error('No edges to export');
    }

    // Check for active rotation planes
    const activePlanes = this.getActiveRotationPlanes();
    if (activePlanes.length === 0) {
      throw new Error('No rotation planes active. Enable at least one rotation plane before exporting.');
    }

    // Calculate rotation parameters
    const degreesPerFrame = 360.0 / frameCount;
    const durationSeconds = frameCount / fps;

    // Store current state to restore later
    const originalAngle = this.rotation4D.currentAngle;
    const wasRotating4D = this.rotating4D;
    const wasRotating3D = this.rotating3D;

    // Temporarily disable animation
    this.rotating4D = false;
    this.rotating3D = false;

    // Number of sample points per curve (matching old viewer format)
    const CURVE_SAMPLES = 51;

    // Prepare frames array
    const frames = [];

    try {
      for (let frameNum = 0; frameNum < frameCount; frameNum++) {
        // Report progress
        if (progressCallback) {
          const progress = (frameNum + 1) / frameCount;
          progressCallback(progress, `Generating frame ${frameNum + 1} of ${frameCount}...`);
        }

        // Calculate rotation angle for this frame
        const angle = frameNum * degreesPerFrame;
        this.rotation4D.currentAngle = angle;

        // Apply rotation to get current 4D vertices
        const rotatedVertices = this.rotation4D.applyTo(this.vertices4DOriginal);

        // Generate curves for this frame
        const frameCurves = [];

        for (let edgeIdx = 0; edgeIdx < this.edgeIndices.length; edgeIdx++) {
          const [v1Idx, v2Idx] = this.edgeIndices[edgeIdx];
          const v1_4d = rotatedVertices[v1Idx];
          const v2_4d = rotatedVertices[v2Idx];

          // Generate curve points (sample along edge)
          const controlPoints = [];
          const thicknessValues = [];

          for (let i = 0; i < CURVE_SAMPLES; i++) {
            const t = i / (CURVE_SAMPLES - 1);

            // Interpolate in 4D
            const point4D = [
              v1_4d[0] + t * (v2_4d[0] - v1_4d[0]),
              v1_4d[1] + t * (v2_4d[1] - v1_4d[1]),
              v1_4d[2] + t * (v2_4d[2] - v1_4d[2]),
              v1_4d[3] + t * (v2_4d[3] - v1_4d[3])
            ];

            // Project to 3D
            let point3D;
            if (this.projectionType === 'stereographic') {
              // Normalize to unit sphere for stereographic projection
              const mag = Math.sqrt(
                point4D[0] * point4D[0] +
                point4D[1] * point4D[1] +
                point4D[2] * point4D[2] +
                point4D[3] * point4D[3]
              );
              const normalized = mag > 0 ? point4D.map(x => x / mag) : point4D;

              // Stereographic projection
              const denom = 1 - normalized[0];
              if (Math.abs(denom) < 1e-6) {
                // Near singularity, skip this point
                continue;
              }
              point3D = [
                normalized[1] / denom,
                normalized[2] / denom,
                normalized[3] / denom
              ];
            } else {
              // Perspective projection
              const d = this.perspectiveDistance;
              const w = point4D[0];

              if (w >= d * 0.99 || Math.abs(d - w) < 0.002) {
                // Behind or at viewing plane, skip
                continue;
              }

              const scale = d / (d - w);
              point3D = [
                point4D[1] * scale,
                point4D[2] * scale,
                point4D[3] * scale
              ];
            }

            // Calculate thickness based on distance from origin (radial gradient)
            const distance = Math.sqrt(
              point3D[0] * point3D[0] +
              point3D[1] * point3D[1] +
              point3D[2] * point3D[2]
            );
            const maxDistance = 3.0;
            const normalizedDist = Math.min(distance / maxDistance, 1.0);
            const curvedDist = Math.pow(normalizedDist, this.thicknessCurve);
            const thickness = this.minThickness +
              (this.maxThickness - this.minThickness) * curvedDist;

            controlPoints.push(point3D);
            thicknessValues.push(thickness);
          }

          // Only include edges with valid points
          if (controlPoints.length >= 2) {
            frameCurves.push({
              control_points: controlPoints,
              thickness_values: thicknessValues
            });
          }
        }

        frames.push({
          frame_number: frameNum,
          rotation_angle: angle,
          curves: frameCurves
        });

        // Allow UI to update every 5 frames
        if (frameNum % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Build final JSON structure (matching old viewer format for Python compatibility)
      const animationData = {
        polytope_name: this.polytopeName || 'polytope',
        frame_count: frameCount,
        duration_seconds: durationSeconds,
        fps: fps,
        projection_type: this.projectionType,
        perspective_distance: this.perspectiveDistance,
        thickness_settings: {
          min: this.minThickness,
          max: this.maxThickness,
          curve: this.thicknessCurve
        },
        rotation_planes: activePlanes,
        degrees_per_frame: degreesPerFrame,
        frames: frames
      };

      console.log(`[PolytopeViewer] Animation export complete: ${frames.length} frames, ${frames[0]?.curves?.length || 0} curves per frame`);

      return animationData;

    } finally {
      // Restore original state
      this.rotation4D.currentAngle = originalAngle;
      this.rotating4D = wasRotating4D;
      this.rotating3D = wasRotating3D;

      // Update projection to restore visual state
      this.updateProjection();
    }
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
