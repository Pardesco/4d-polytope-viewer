export class CircularProgress {
  constructor(options) {
    this.value = options.value || 0;
    this.label = options.label || '';
    this.color = options.color || '#00ffff';
    this.size = options.size || 80;
    this.strokeWidth = options.strokeWidth || 3;
    
    this.element = this.create();
  }
  
  create() {
    const container = document.createElement('div');
    container.className = 'circular-progress';
    container.style.cssText = `
      position: relative;
      width: ${this.size}px;
      height: ${this.size}px;
      display: inline-block;
    `;
    
    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.size);
    svg.setAttribute('height', this.size);
    svg.style.transform = 'rotate(-90deg)';
    
    const radius = (this.size - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Background circle
    const bgCircle = this.createCircle(radius, '#1a2332', 1);
    
    // Progress circle
    const progressCircle = this.createCircle(radius, this.color, 0);
    progressCircle.style.filter = `drop-shadow(0 0 5px ${this.color})`;
    progressCircle.setAttribute('stroke-dasharray', circumference);
    progressCircle.setAttribute('stroke-dashoffset', circumference);
    
    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    
    // Center label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'circular-label';
    labelDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Share Tech Mono', monospace;
      font-size: ${this.size / 3.5}px;
      font-weight: bold;
      color: ${this.color};
      text-align: center;
      text-shadow: 0 0 8px ${this.color};
      pointer-events: none;
    `;
    labelDiv.textContent = this.label;
    
    container.appendChild(svg);
    container.appendChild(labelDiv);
    
    this.progressCircle = progressCircle;
    this.labelDiv = labelDiv;
    this.circumference = circumference;
    
    return container;
  }
  
  createCircle(radius, color, opacity) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', this.size / 2);
    circle.setAttribute('cy', this.size / 2);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', this.strokeWidth);
    return circle;
  }
  
  update(value, label) {
    this.value = Math.max(0, Math.min(100, value));
    const offset = this.circumference * (1 - this.value / 100);
    this.progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
    this.progressCircle.setAttribute('stroke-dashoffset', offset);
    
    if (label !== undefined) {
      this.labelDiv.textContent = label;
    }
  }
}