export class MatrixDisplay {
  /**
   * Displays a live 4x4 rotation matrix with animated updates
   * This adds HUGE credibility to the "neural interface" feel
   */
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.matrix = this.createIdentityMatrix();
    this.element = this.create();
    this.container.appendChild(this.element);
  }
  
  createIdentityMatrix() {
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }
  
  create() {
    const grid = document.createElement('div');
    grid.className = 'matrix-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.75rem;
    `;
    
    // Create 16 cells (4x4)
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      cell.style.cssText = `
        background: rgba(0, 255, 255, 0.05);
        border: 1px solid rgba(0, 255, 255, 0.2);
        padding: 4px;
        text-align: center;
        color: #00ffff;
        font-size: 0.7rem;
        transition: all 0.3s ease;
      `;
      cell.textContent = '0.00';
      grid.appendChild(cell);
    }
    
    return grid;
  }
  
  /**
   * Update matrix from your rotation system
   * @param {Array} rotationMatrix - 4x4 array from rotation4d.js
   */
  update(rotationMatrix) {
    const cells = this.element.querySelectorAll('.matrix-cell');
    
    rotationMatrix.forEach((row, i) => {
      row.forEach((value, j) => {
        const index = i * 4 + j;
        const cell = cells[index];
        const displayValue = value.toFixed(2);
        
        if (cell.textContent !== displayValue) {
          // Value changed - highlight it
          cell.style.background = 'rgba(0, 255, 255, 0.3)';
          cell.style.color = '#ffffff';
          cell.style.transform = 'scale(1.1)';
          
          cell.textContent = displayValue;
          
          // Fade back
          setTimeout(() => {
            cell.style.background = 'rgba(0, 255, 255, 0.05)';
            cell.style.color = '#00ffff';
            cell.style.transform = 'scale(1)';
          }, 300);
        }
      });
    });
  }
}