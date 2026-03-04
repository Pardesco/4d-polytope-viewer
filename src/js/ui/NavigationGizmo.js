import * as THREE from 'three';

/**
 * NavigationGizmo - Blender-style 3D orientation widget
 * Displays current view orientation and allows clicking to snap to standard views
 *
 * Works with group rotation (polytope rotates, camera is static)
 */
export class NavigationGizmo {
  constructor(camera, group, size = 100) {
    this.mainCamera = camera;
    this.group = group;  // The polytope group that rotates
    this.size = size;
    this.enabled = true;

    // Animation state
    this.isAnimating = false;
    this.animationStart = null;
    this.animationDuration = 300;
    this.startRotation = new THREE.Euler();
    this.targetRotation = new THREE.Euler();

    // Hover state
    this.hoveredObj = null;

    // Create container div for positioning
    this.container = document.createElement('div');
    this.container.id = 'navigation-gizmo-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 280px;
      left: 20px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: auto;
      z-index: 1000;
    `;
    document.body.appendChild(this.container);

    // Create separate canvas for gizmo (overlay)
    this.canvas = document.createElement('canvas');
    this.canvas.width = size * window.devicePixelRatio;
    this.canvas.height = size * window.devicePixelRatio;
    this.canvas.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: transparent;
      cursor: default;
    `;
    this.container.appendChild(this.canvas);

    // Create separate renderer for gizmo
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0);

    // Create gizmo scene and camera
    this.scene = new THREE.Scene();
    this.gizmoCamera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 50);
    this.gizmoCamera.position.set(0, 0, 10);

    // Lights for 3D effect
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clickTargets = [];
    this.createGizmo();
    this.setupEventListeners();

    // Update position based on matrix panel
    this.updatePosition();
    this._boundUpdatePosition = () => this.updatePosition();
    window.addEventListener('resize', this._boundUpdatePosition);

    console.log('[NavigationGizmo] Initialized (group rotation mode)');
  }

  /**
   * Update gizmo position to stay above the rotation matrix panel
   */
  updatePosition() {
    const matrixPanel = document.querySelector('.hud-bottom-left');
    if (matrixPanel) {
      const panelRect = matrixPanel.getBoundingClientRect();
      const panelHeight = panelRect.height;
      // Position gizmo above the panel with 10px gap
      this.container.style.bottom = `${panelHeight + 30}px`;
    }
  }

  createGizmo() {
    // Geometry constants
    const axisLength = 1.0;
    const axisRadius = 0.08;
    const coneHeight = 0.35;
    const coneRadius = 0.22;
    const centerRadius = 0.15;

    // Blender-like Colors (cyberpunk adjusted)
    const colors = {
      x: 0xff3653, // Red
      y: 0x8adb00, // Green
      z: 0x2c8fff, // Blue (cyan-ish)
      gray: 0xdddddd,
      hover: 0xffffff
    };

    // Materials
    const createMat = (color) => new THREE.MeshLambertMaterial({ color: color });

    this.materials = {
      x: createMat(colors.x),
      y: createMat(colors.y),
      z: createMat(colors.z),
      gray: createMat(colors.gray),
      hover: new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
    };

    // Root group that will mirror the main group rotation
    this.gizmoRoot = new THREE.Group();
    this.scene.add(this.gizmoRoot);

    // --- AXES HELPER FUNCTIONS ---
    const addAxis = (axis, colorMat, view, label) => {
      const group = new THREE.Group();
      group.userData = { view: view, label: label, originalMat: colorMat };

      // Cylinder (Stem)
      const stemGeom = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 16);
      stemGeom.translate(0, axisLength / 2, 0);
      const stem = new THREE.Mesh(stemGeom, colorMat);
      group.add(stem);

      // Cone (Head)
      const coneGeom = new THREE.ConeGeometry(coneRadius, coneHeight, 32);
      coneGeom.translate(0, axisLength + coneHeight / 2, 0);
      const cone = new THREE.Mesh(coneGeom, colorMat);
      group.add(cone);

      // Label (Sprite)
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000'; // Shadow
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.charAt(1), 34, 34);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label.charAt(1), 32, 32);

      const spriteMap = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteMap, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, axisLength + coneHeight + 0.3, 0);
      sprite.scale.set(0.6, 0.6, 1);
      group.add(sprite);

      // Orientation
      if (axis === 'x') group.rotation.z = -Math.PI / 2;
      else if (axis === 'z') group.rotation.x = Math.PI / 2;

      this.gizmoRoot.add(group);
      this.clickTargets.push(group);

      // Invisible Hit Box for easier clicking
      const hitGeom = new THREE.CylinderGeometry(coneRadius * 1.5, coneRadius * 1.5, axisLength + coneHeight, 8);
      hitGeom.translate(0, (axisLength + coneHeight) / 2, 0);
      const hitMesh = new THREE.Mesh(hitGeom, new THREE.MeshBasicMaterial({ visible: false }));
      if (axis === 'x') hitMesh.rotation.z = -Math.PI / 2;
      else if (axis === 'z') hitMesh.rotation.x = Math.PI / 2;

      hitMesh.userData = { parentGroup: group };
      group.add(hitMesh);
    };

    // Positive Axes
    addAxis('x', this.materials.x, 'px', '+X');
    addAxis('y', this.materials.y, 'py', '+Y');
    addAxis('z', this.materials.z, 'pz', '+Z');

    // Negative Axes (Small Spheres)
    const addNegAxis = (axis, colorMat, view) => {
      const group = new THREE.Group();
      group.userData = { view: view, label: '', originalMat: colorMat };

      const sphereGeom = new THREE.SphereGeometry(axisRadius * 1.5, 16, 16);
      const mesh = new THREE.Mesh(sphereGeom, colorMat);
      mesh.position.y = -axisLength * 0.8;

      if (axis === 'x') group.rotation.z = -Math.PI / 2;
      else if (axis === 'z') group.rotation.x = Math.PI / 2;

      group.add(mesh);
      this.gizmoRoot.add(group);
      this.clickTargets.push(group);
    };

    addNegAxis('x', this.materials.x, 'nx');
    addNegAxis('y', this.materials.y, 'ny');
    addNegAxis('z', this.materials.z, 'nz');

    // Center Sphere (Reset)
    const centerMesh = new THREE.Mesh(
      new THREE.SphereGeometry(centerRadius, 32, 32),
      this.materials.gray
    );
    centerMesh.userData = { view: 'center', label: 'Reset', originalMat: this.materials.gray };
    this.gizmoRoot.add(centerMesh);
    this.clickTargets.push(centerMesh);

    // Isometric Corners
    const isoSphereGeom = new THREE.SphereGeometry(axisRadius * 1.5, 16, 16);
    const isoOffset = 0.65 * axisLength;

    const addIsoCorner = (x, y, z, view, material = this.materials.gray) => {
      const mesh = new THREE.Mesh(isoSphereGeom, material);
      mesh.position.set(x * isoOffset, y * isoOffset, z * isoOffset);
      mesh.userData = { view: view, label: '', originalMat: material };

      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.4;
      mesh.userData.originalMat = mesh.material;

      this.gizmoRoot.add(mesh);
      this.clickTargets.push(mesh);
    };

    // 4 front-facing corners (isometric views)
    addIsoCorner(1, 1, 1, 'iso_ppp');
    addIsoCorner(-1, 1, 1, 'iso_npp');
    addIsoCorner(1, -1, 1, 'iso_pnp');
    addIsoCorner(-1, -1, 1, 'iso_nnp');

    // Background hover circle
    const bgGeom = new THREE.CircleGeometry(1.6, 32);
    this.bgMesh = new THREE.Mesh(bgGeom, new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      opacity: 0.0,
      transparent: true,
      side: THREE.DoubleSide
    }));
    this.bgMesh.position.z = -2;
    this.scene.add(this.bgMesh);
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.handleHover(null);
      this.bgMesh.material.opacity = 0.0;
    });
  }

  onClick(event) {
    if (!this.enabled || !this.hoveredObj) return;

    const view = this.hoveredObj.userData.view;
    const instant = event.shiftKey;
    this.snapToView(view, instant);
  }

  onMouseMove(event) {
    if (!this.enabled) return;

    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    this.mouse.x = (localX / this.size) * 2 - 1;
    this.mouse.y = -(localY / this.size) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.gizmoCamera);

    const intersects = this.raycaster.intersectObjects(this.clickTargets, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target.parent && !target.userData.view && target.parent !== this.scene) {
        target = target.parent;
      }

      if (target.userData.view) {
        this.handleHover(target);
        this.canvas.style.cursor = 'pointer';
        this.bgMesh.material.opacity = 0.1;
      }
    } else {
      this.handleHover(null);
      this.canvas.style.cursor = 'default';
      this.bgMesh.material.opacity = 0.0;
    }
  }

  handleHover(obj) {
    if (this.hoveredObj === obj) return;

    if (this.hoveredObj) {
      this.setHighlight(this.hoveredObj, false);
    }

    this.hoveredObj = obj;

    if (this.hoveredObj) {
      this.setHighlight(this.hoveredObj, true);
    }
  }

  setHighlight(group, active) {
    group.traverse(child => {
      if (child.isMesh && child.material) {
        if (active) {
          child.currentHex = child.material.emissive ? child.material.emissive.getHex() : 0;
          if (child.material.emissive) child.material.emissive.setHex(0x555555);
          else child.material.color.setHex(0xffffff);
        } else {
          if (child.material.emissive) child.material.emissive.setHex(child.currentHex || 0);
          else if (group.userData.originalMat) child.material.color.copy(group.userData.originalMat.color);
        }
      }
    });
  }

  /**
   * Get target group rotation for a given view
   * Since camera is at +Z looking at origin, we rotate the GROUP to show different views
   */
  getViewRotation(view) {
    const rotations = {
      // View from +X means rotate group -90 around Y
      'px': new THREE.Euler(0, -Math.PI / 2, 0),
      // View from -X means rotate group +90 around Y
      'nx': new THREE.Euler(0, Math.PI / 2, 0),
      // View from +Y means rotate group +90 around X
      'py': new THREE.Euler(Math.PI / 2, 0, 0),
      // View from -Y means rotate group -90 around X
      'ny': new THREE.Euler(-Math.PI / 2, 0, 0),
      // View from +Z (default) means no rotation
      'pz': new THREE.Euler(0, 0, 0),
      // View from -Z means rotate group 180 around Y
      'nz': new THREE.Euler(0, Math.PI, 0),
      // Isometric views
      'iso_ppp': new THREE.Euler(-Math.PI / 6, -Math.PI / 4, 0),
      'iso_npp': new THREE.Euler(-Math.PI / 6, Math.PI / 4, 0),
      'iso_pnp': new THREE.Euler(Math.PI / 6, -Math.PI / 4, 0),
      'iso_nnp': new THREE.Euler(Math.PI / 6, Math.PI / 4, 0),
      // Center = reset to default
      'center': new THREE.Euler(0, 0, 0)
    };
    return rotations[view] || rotations['center'];
  }

  snapToView(view, instant = false) {
    const targetRot = this.getViewRotation(view);

    if (instant || this.isAnimating) {
      this.group.rotation.copy(targetRot);
    } else {
      this.isAnimating = true;
      this.animationStart = performance.now();
      this.startRotation.copy(this.group.rotation);
      this.targetRotation.copy(targetRot);
    }
  }

  update() {
    if (!this.enabled) return;

    // Handle animation
    if (this.isAnimating) {
      const elapsed = performance.now() - this.animationStart;
      let t = Math.min(elapsed / this.animationDuration, 1);

      // Ease out cubic
      t = 1 - Math.pow(1 - t, 3);

      // Interpolate rotation using quaternions for smooth interpolation
      const startQuat = new THREE.Quaternion().setFromEuler(this.startRotation);
      const targetQuat = new THREE.Quaternion().setFromEuler(this.targetRotation);
      const currentQuat = new THREE.Quaternion().slerpQuaternions(startQuat, targetQuat, t);

      this.group.quaternion.copy(currentQuat);

      if (t >= 1) {
        this.isAnimating = false;
        // Ensure we end exactly at target
        this.group.rotation.copy(this.targetRotation);
      }
    }

    // Sync gizmo orientation with main group (inverted to show view direction)
    // The gizmo shows "where you're looking from", not "how the object is rotated"
    this.gizmoRoot.quaternion.copy(this.group.quaternion).invert();
  }

  render() {
    if (!this.enabled) return;
    this.renderer.render(this.scene, this.gizmoCamera);
  }

  setEnabled(value) {
    this.enabled = value;
    this.container.style.display = value ? 'block' : 'none';
  }

  setSize(size) {
    this.size = size;
    this.canvas.width = size * window.devicePixelRatio;
    this.canvas.height = size * window.devicePixelRatio;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.container.style.width = size + 'px';
    this.container.style.height = size + 'px';
    this.renderer.setSize(size, size);
  }

  dispose() {
    window.removeEventListener('resize', this._boundUpdatePosition);
    this.container.remove();
    this.renderer.dispose();
  }
}
