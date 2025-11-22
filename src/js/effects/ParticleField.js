export class ParticleField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 30; // Keep low for performance
    
    this.resize();
    this.init();
    this.animate();
    
    // Resize handler
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  init() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff'
      });
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(p => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      
      // Wrap around
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
      
      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fill();
      
      // Glow effect
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;
    });
    
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize
const bgCanvas = document.createElement('canvas');
bgCanvas.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;
document.body.insertBefore(bgCanvas, document.body.firstChild);

new ParticleField(bgCanvas);