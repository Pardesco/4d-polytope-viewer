/**
 * IridescentMaterial - Holographic/Soap-Bubble Shader Material
 *
 * Desktop only (shader complexity)
 * Colors shift based on viewing angle (Fresnel effect)
 * Purple → Pink → Cyan gradient
 */

import * as THREE from 'three';

export class IridescentMaterial {
  constructor() {
    this.material = this.createMaterial();
    this.time = 0;
  }

  /**
   * Create custom shader material with iridescence
   */
  createMaterial() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        // Color palette for iridescence
        color1: { value: new THREE.Color(0x8B5CF6) }, // Purple
        color2: { value: new THREE.Color(0xEC4899) }, // Pink
        color3: { value: new THREE.Color(0x06B6D4) }, // Cyan

        // Fresnel parameters
        fresnelPower: { value: 2.5 },

        // Animation
        time: { value: 0.0 },

        // Lighting (basic)
        lightPosition: { value: new THREE.Vector3(5, 5, 5) }
      },

      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          // Transform normal to world space
          vNormal = normalize(normalMatrix * normal);

          // Calculate view position for Fresnel
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;

          // World position for additional effects
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,

      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        uniform float fresnelPower;
        uniform float time;
        uniform vec3 lightPosition;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          // Normalize vectors
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);

          // Fresnel effect (edge glow based on viewing angle)
          float fresnel = pow(1.0 - abs(dot(viewDir, normal)), fresnelPower);

          // Iridescence based on view angle
          float iridescence = dot(viewDir, normal) * 0.5 + 0.5;

          // Add subtle world-space variation for more interest
          float worldVariation = sin(vWorldPosition.x * 2.0) *
                                 cos(vWorldPosition.y * 2.0) *
                                 sin(vWorldPosition.z * 2.0);
          worldVariation = worldVariation * 0.15 + 0.5; // Normalize to 0.35-0.65

          // Subtle time-based animation (very slow)
          float timeOffset = time * 0.05;

          // Combine for color phase
          float phase = iridescence + worldVariation + timeOffset;
          phase = fract(phase); // Keep in 0-1 range

          // Mix three colors based on phase (smooth transitions)
          vec3 color;
          if (phase < 0.33) {
            // Purple to Pink
            float t = phase / 0.33;
            color = mix(color1, color2, t);
          } else if (phase < 0.66) {
            // Pink to Cyan
            float t = (phase - 0.33) / 0.33;
            color = mix(color2, color3, t);
          } else {
            // Cyan to Purple
            float t = (phase - 0.66) / 0.34;
            color = mix(color3, color1, t);
          }

          // Add Fresnel highlight (edge glow)
          color = mix(color, vec3(1.0), fresnel * 0.4);

          // Basic lighting (subtle)
          vec3 lightDir = normalize(lightPosition - vWorldPosition);
          float diffuse = max(dot(normal, lightDir), 0.0) * 0.3 + 0.7;
          color *= diffuse;

          // Ensure colors stay vibrant
          color = clamp(color, 0.0, 1.0);

          gl_FragColor = vec4(color, 1.0);
        }
      `,

      side: THREE.DoubleSide,
      transparent: false
    });

    return material;
  }

  /**
   * Update animation (call every frame)
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    this.time += deltaTime;
    this.material.uniforms.time.value = this.time;
  }

  /**
   * Set custom color palette
   * @param {number} color1 - Hex color (e.g., 0x8B5CF6)
   * @param {number} color2 - Hex color
   * @param {number} color3 - Hex color
   */
  setColors(color1, color2, color3) {
    this.material.uniforms.color1.value.setHex(color1);
    this.material.uniforms.color2.value.setHex(color2);
    this.material.uniforms.color3.value.setHex(color3);
  }

  /**
   * Set Fresnel power (edge glow intensity)
   * @param {number} power - 0.0 to 5.0 (default: 2.5)
   */
  setFresnelPower(power) {
    this.material.uniforms.fresnelPower.value = power;
  }

  /**
   * Get the Three.js material
   * @returns {THREE.ShaderMaterial}
   */
  getMaterial() {
    return this.material;
  }

  /**
   * Dispose of material resources
   */
  dispose() {
    this.material.dispose();
  }
}
