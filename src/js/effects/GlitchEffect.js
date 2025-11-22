export class GlitchEffect {
  /**
   * Applies chromatic aberration "glitch" when polytope changes
   */
  static trigger(element) {
    // Add glitch class
    element.classList.add('glitch-active');
    
    // Remove after animation
    setTimeout(() => {
      element.classList.remove('glitch-active');
    }, 300);
  }
}