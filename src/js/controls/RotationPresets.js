/**
 * RotationPresets - Predefined 4D rotation configurations
 *
 * Provides quick access to interesting rotation states
 */

export class RotationPresets {
  static presets = {
    identity: {
      name: 'Identity',
      description: 'No rotation (default view)',
      angles: { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 }
    },

    clifford45: {
      name: 'Clifford Torus',
      description: 'Classic Clifford parallel transport',
      angles: {
        xy: Math.PI / 4,  // 45 degrees
        xz: 0,
        xw: 0,
        yz: 0,
        yw: 0,
        zw: Math.PI / 4  // 45 degrees
      }
    },

    hopf: {
      name: 'Hopf Rotation',
      description: 'Hopf fibration-inspired rotation',
      angles: {
        xy: 0,
        xz: Math.PI / 6,  // 30 degrees
        xw: 0,
        yz: 0,
        yw: Math.PI / 6,  // 30 degrees
        zw: 0
      }
    },

    doubleRotation: {
      name: 'Double Rotation',
      description: 'Three simultaneous plane rotations',
      angles: {
        xy: Math.PI / 6,  // 30 degrees
        xz: Math.PI / 6,  // 30 degrees
        xw: 0,
        yz: 0,
        yw: 0,
        zw: Math.PI / 6   // 30 degrees
      }
    },

    isoclinic: {
      name: 'Isoclinic',
      description: 'Equal rotation on all planes',
      angles: {
        xy: Math.PI / 6,  // 30 degrees
        xz: Math.PI / 6,
        xw: Math.PI / 6,
        yz: Math.PI / 6,
        yw: Math.PI / 6,
        zw: Math.PI / 6
      }
    }
  };

  static get(name) {
    return this.presets[name] || null;
  }

  static getAll() {
    return Object.keys(this.presets).map(key => ({
      key,
      ...this.presets[key]
    }));
  }

  static getRandom() {
    const random = () => (Math.random() * Math.PI / 2) - Math.PI / 4; // -45 to 45 degrees in radians
    return {
      name: 'Random',
      description: 'Random rotation configuration',
      angles: {
        xy: random(),
        xz: random(),
        xw: random(),
        yz: random(),
        yw: random(),
        zw: random()
      }
    };
  }
}
