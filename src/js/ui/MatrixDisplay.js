export class MatrixDisplay {
  /**
   * Displays a live rotation matrix with animated updates
   * Supports both 4x4 (Matrix-4) and 5x5 (Matrix-5) modes
   */
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.dimension = 4;
    this.matrix = this.createIdentityMatrix();
    this.element = this.create();
    this.container.appendChild(this.element);
  }

  createIdentityMatrix() {
    return Array(this.dimension).fill(null).map((_, i) =>
      Array(this.dimension).fill(null).map((_, j) => i === j ? 1 : 0)
    );
  }

  /**
   * Set the matrix dimension (4 or 5)
   * Recreates the grid with appropriate size
   * @param {number} dim - 4 or 5
   */
  setDimension(dim) {
    if (dim !== 4 && dim !== 5) return;
    if (this.dimension === dim) return;

    this.dimension = dim;
    this.matrix = this.createIdentityMatrix();

    // Recreate the grid
    if (this.element && this.container) {
      this.container.removeChild(this.element);
    }
    this._cells = null; // Invalidate cached cells
    this._prevMatrix = null;
    this.element = this.create();
    this.container.appendChild(this.element);
  }

  create() {
    const grid = document.createElement('div');
    grid.className = 'matrix-grid';
    const is5D = this.dimension === 5;

    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this.dimension}, 1fr);
      gap: ${is5D ? '2px' : '4px'};
      font-family: 'Share Tech Mono', monospace;
      font-size: ${is5D ? '0.65rem' : '0.75rem'};
    `;

    // Create NxN cells
    const totalCells = this.dimension * this.dimension;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      cell.style.cssText = `
        background: rgba(0, 255, 255, 0.05);
        border: 1px solid rgba(0, 255, 255, 0.2);
        padding: ${is5D ? '2px' : '4px'};
        text-align: center;
        color: #00ffff;
        font-size: ${is5D ? '0.55rem' : '0.7rem'};
        transition: all 0.3s ease;
      `;
      cell.textContent = '0.00';
      grid.appendChild(cell);
    }

    return grid;
  }

  /**
   * Update matrix from rotation system
   * Skips DOM updates if matrix values haven't changed (avoids 60fps DOM thrashing)
   * @param {Array} rotationMatrix - NxN array (4x4 or 5x5)
   */
  update(rotationMatrix) {
    if (!rotationMatrix || !this.element) return;

    // Quick check: has the matrix actually changed?
    if (this._prevMatrix && this._matrixEqual(rotationMatrix, this._prevMatrix)) {
      return; // No change, skip DOM updates
    }

    // Cache cells reference (avoid querySelectorAll every frame)
    if (!this._cells) {
      this._cells = this.element.querySelectorAll('.matrix-cell');
    }

    rotationMatrix.forEach((row, i) => {
      row.forEach((value, j) => {
        const index = i * this.dimension + j;
        const cell = this._cells[index];
        if (!cell) return;

        const displayValue = value.toFixed(2);

        if (cell.textContent !== displayValue) {
          cell.style.background = 'rgba(0, 255, 255, 0.3)';
          cell.style.color = '#ffffff';
          cell.style.transform = 'scale(1.1)';

          cell.textContent = displayValue;

          setTimeout(() => {
            cell.style.background = 'rgba(0, 255, 255, 0.05)';
            cell.style.color = '#00ffff';
            cell.style.transform = 'scale(1)';
          }, 300);
        }
      });
    });

    // Store a deep copy for comparison
    this._prevMatrix = rotationMatrix.map(row => [...row]);
  }

  /**
   * Compare two matrices for equality (within floating point tolerance)
   */
  _matrixEqual(a, b) {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a[i].length; j++) {
        if (Math.abs(a[i][j] - b[i][j]) > 0.005) return false;
      }
    }
    return true;
  }
}
