/**
 * Performance management for polytope complexity
 * Prevents browser crashes from extreme edge counts
 *
 * Edge count thresholds (updated for optimized line view):
 * - Mobile: 600 safe, 1200 warning (line view highly optimized)
 * - Desktop: 500 safe, 1200 warning, 2400 block
 */

export const EDGE_LIMITS = {
  mobile: {
    safe: 600,        // Full rotation enabled, no warnings (optimized line view)
    warning: 1200,    // Show warning, rotation may be slow (but show all edges)
    blocked: Infinity // No hard block on mobile (user choice)
  },
  desktop: {
    safe: 500,        // Full rotation enabled, no warnings
    warning: 1200,    // Show warning, allow override
    blocked: 2400     // Static only or confirmation required
  }
};

export const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  MEDIUM: 'medium',
  COMPLEX: 'complex',
  EXTREME: 'extreme'
};

export class PerformanceManager {
  constructor() {
    this.isMobile = this.detectMobile();
    this.limits = this.isMobile ? EDGE_LIMITS.mobile : EDGE_LIMITS.desktop;
    this.deviceType = this.isMobile ? 'mobile' : 'desktop';

    // User preferences (can override warnings)
    this.loadPreferences();
  }

  /**
   * Detect if device is mobile based on user agent and screen width
   */
  detectMobile() {
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 768;
    return isMobileUA || isSmallScreen;
  }

  /**
   * Get complexity level based on edge count
   */
  getComplexity(edgeCount) {
    if (edgeCount <= this.limits.safe) {
      return COMPLEXITY_LEVELS.SIMPLE;
    } else if (edgeCount <= this.limits.warning) {
      return COMPLEXITY_LEVELS.MEDIUM;
    } else if (edgeCount <= this.limits.blocked) {
      return COMPLEXITY_LEVELS.COMPLEX;
    } else {
      return COMPLEXITY_LEVELS.EXTREME;
    }
  }

  /**
   * Check if rotation should be allowed
   */
  canRotate(edgeCount) {
    return edgeCount <= this.limits.warning;
  }

  /**
   * Check if warning should be shown
   */
  shouldWarn(edgeCount) {
    const complexity = this.getComplexity(edgeCount);
    return complexity === COMPLEXITY_LEVELS.MEDIUM || complexity === COMPLEXITY_LEVELS.COMPLEX;
  }

  /**
   * Check if rotation should be blocked
   */
  shouldBlock(edgeCount) {
    return edgeCount > this.limits.blocked;
  }

  /**
   * Check if user has dismissed warning for this polytope
   */
  hasUserOverride(polytopeName) {
    return this.preferences.overrides[polytopeName] === true;
  }

  /**
   * Get warning/blocking message for UI
   */
  getMessage(edgeCount, polytopeName = '') {
    if (edgeCount <= this.limits.safe) {
      return null;
    }

    const complexity = this.getComplexity(edgeCount);

    if (complexity === COMPLEXITY_LEVELS.MEDIUM) {
      return {
        type: 'warning',
        level: 'medium',
        title: 'Complex Polytope',
        message: `This polytope has ${edgeCount.toLocaleString()} edges. ` +
                 `Rotation may be slow (8-15 FPS) on ${this.deviceType} devices.`,
        explanation: 'This is one of the more intricate 4D shapes! The viewer will work, but may not be as smooth.',
        options: [
          { label: 'Continue', value: 'continue', primary: true },
          { label: 'View Static', value: 'static', primary: false }
        ],
        dismissible: true
      };
    }

    if (complexity === COMPLEXITY_LEVELS.COMPLEX) {
      return {
        type: 'warning',
        level: 'high',
        title: 'Very Complex Polytope',
        message: `This polytope has ${edgeCount.toLocaleString()} edges. ` +
                 `Rotation will be very slow (3-8 FPS) and may cause lag.`,
        explanation: this.isMobile
          ? 'For the best experience, view this on a desktop computer.'
          : 'This is an extremely detailed 4D structure! Performance may vary.',
        options: [
          { label: 'View Static', value: 'static', primary: true },
          { label: 'Try Anyway', value: 'continue', primary: false, warning: true }
        ],
        dismissible: true
      };
    }

    if (complexity === COMPLEXITY_LEVELS.EXTREME) {
      return {
        type: 'blocked',
        level: 'extreme',
        title: 'Rotation Disabled',
        message: `This polytope has ${edgeCount.toLocaleString()} edges. ` +
                 `Rotation is disabled to prevent browser crashes.`,
        explanation: 'This is one of the most complex 4D polytopes! You can still view it in static mode, ' +
                    'or download our desktop app for full interactive experience.',
        options: [
          { label: 'View Static', value: 'static', primary: true },
          { label: 'Learn More', value: 'learn', primary: false }
        ],
        dismissible: false
      };
    }

    return null;
  }

  /**
   * Get estimated FPS for given edge count
   */
  getEstimatedFPS(edgeCount) {
    if (edgeCount <= this.limits.safe) {
      return '60 FPS';
    } else if (edgeCount <= this.limits.warning) {
      return '15-30 FPS';
    } else if (edgeCount <= this.limits.blocked) {
      return '5-15 FPS';
    } else {
      return '< 5 FPS';
    }
  }

  /**
   * Get recommended edge limit for rendering
   * NOTE: Always render ALL edges - we only limit mesh view, not edge rendering
   */
  getEdgeLimit(edgeCount) {
    // Always render all edges - no limit!
    // Mesh view limitation is handled separately in viewer.js (MAX_EDGES_FOR_MESH)
    return edgeCount;
  }

  /**
   * Save user override preference
   */
  saveOverride(polytopeName, allow = true) {
    this.preferences.overrides[polytopeName] = allow;
    this.savePreferences();
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const stored = localStorage.getItem('polytope_performance_prefs');
      this.preferences = stored ? JSON.parse(stored) : { overrides: {} };
    } catch (e) {
      console.warn('Failed to load performance preferences:', e);
      this.preferences = { overrides: {} };
    }
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      localStorage.setItem('polytope_performance_prefs', JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('Failed to save performance preferences:', e);
    }
  }

  /**
   * Log performance metrics to console
   */
  logMetrics(edgeCount, polytopeName, fps = null) {
    console.group(`🎯 Performance Metrics: ${polytopeName}`);
    console.log(`Device: ${this.deviceType}`);
    console.log(`Edges: ${edgeCount.toLocaleString()}`);
    console.log(`Complexity: ${this.getComplexity(edgeCount)}`);
    console.log(`Estimated FPS: ${this.getEstimatedFPS(edgeCount)}`);
    console.log(`Recommended Edge Limit: ${this.getEdgeLimit(edgeCount)}`);
    if (fps !== null) {
      console.log(`Actual FPS: ${fps.toFixed(1)}`);
    }
    console.groupEnd();
  }
}
