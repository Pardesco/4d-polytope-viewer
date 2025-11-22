export class AnimatedBorder {
  constructor(element) {
    this.element = element;
    this.init();
  }
  
  init() {
    const rect = this.element.getBoundingClientRect();
    const cornerSize = 20;
    
    // Create SVG overlay
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      width: calc(100% + 4px);
      height: calc(100% + 4px);
      pointer-events: none;
      z-index: 10;
    `;
    
    // Define path (cut corners)
    const width = rect.width; // Use bounding client rect dimensions
    const height = rect.height;
    
    const pathData = `
      M ${cornerSize} 0
      L ${width - cornerSize} 0
      L ${width} ${cornerSize}
      L ${width} ${height - cornerSize}
      L ${width - cornerSize} ${height}
      L ${cornerSize} ${height}
      L 0 ${height - cornerSize}
      L 0 ${cornerSize}
      Z
    `;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#00ffff');
    path.setAttribute('stroke-width', '1');
    path.setAttribute('stroke-dasharray', '5 10');
    path.setAttribute('opacity', '0.6');
    
    // Animate dash offset (scanning effect)
    path.style.animation = 'border-scan 4s linear infinite';
    
    svg.appendChild(path);
    this.element.style.position = 'relative';
    this.element.appendChild(svg);
  }
}

// Add animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes border-scan {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: 150; }
  }
`;
document.head.appendChild(style);