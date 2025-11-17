/**
 * Polytope selector dropdown
 * Allows user to switch between polytopes without editing URL
 *
 * Now supports tier-based polytope lists with lazy loading:
 * - Free tier: ~20 curated polytopes
 * - Creator tier: ~1,717 polytopes (<500KB)
 * - Professional tier: ~2,670 polytopes (all)
 */

import { licenseManager } from '../license/LicenseManager.js';

export class PolytopeSelector {
  constructor(viewer, containerId = 'polytope-selector') {
    this.viewer = viewer;
    this.container = document.getElementById(containerId);
    this.currentId = null;
    this.polytopes = []; // Populated from tier-specific JSON
    this.filteredPolytopes = []; // After applying filters
    this.tier = 'free'; // Default tier
    this.isLoading = false;

    // Filter state
    this.filters = {
      category: 'all', // 'all' or category name (Cat1, Cat2, etc.)
      edgeMin: 0,
      edgeMax: Infinity
    };
  }

  /**
   * Initialize selector by loading tier-appropriate polytope list
   * @returns {Promise<void>}
   */
  async init() {
    if (!this.container) {
      console.warn('[PolytopeSelector] Container not found');
      return;
    }

    try {
      // Get user's license tier
      this.tier = licenseManager.getTier();
      console.log(`[PolytopeSelector] Loading polytopes for tier: ${this.tier}`);

      // Load tier-specific polytope list (metadata only, no geometry)
      await this.loadPolytopeList();

      // Render dropdown with loaded list
      this.render();
      this.attachListeners();

      console.log(`[PolytopeSelector] Initialized with ${this.polytopes.length} polytopes`);
    } catch (error) {
      console.error('[PolytopeSelector] Failed to initialize:', error);

      // Fallback: show error and use minimal default list
      this.polytopes = [
        { id: '2-tes', name: 'Tesseract (2-Tes)', category: 'Platonic', file_size_kb: 2.5 }
      ];
      this.render();
      this.attachListeners();
    }
  }

  /**
   * Load polytope list from tier-specific JSON file
   * Loads only metadata (names, IDs, categories, sizes) - no geometry
   */
  async loadPolytopeList() {
    this.isLoading = true;

    try {
      const listPath = `/data/polytope-lists/${this.tier}-tier.json`;
      console.log(`[PolytopeSelector] Fetching: ${listPath}`);

      const response = await fetch(listPath);

      if (!response.ok) {
        throw new Error(`Failed to load polytope list: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.polytopes || !Array.isArray(data.polytopes)) {
        throw new Error('Invalid polytope list format');
      }

      this.polytopes = data.polytopes;
      this.filteredPolytopes = [...this.polytopes]; // Start with all polytopes
      console.log(`[PolytopeSelector] Loaded ${this.polytopes.length} polytopes for ${this.tier} tier`);

      // Log edge count stats
      const edgeCounts = this.polytopes.map(p => p.edges || 0).filter(e => e > 0);
      const minEdges = Math.min(...edgeCounts);
      const maxEdges = Math.max(...edgeCounts);
      console.log(`[PolytopeSelector] Edge count range: ${minEdges} - ${maxEdges}`);

    } catch (error) {
      console.error('[PolytopeSelector] Failed to load polytope list:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    this.container.innerHTML = '';

    // Show loading state
    if (this.isLoading || this.polytopes.length === 0) {
      const select = document.createElement('select');
      select.id = 'polytope-select';
      select.className = 'w-full bg-dark-lighter text-white border border-primary/30 rounded-lg px-3 py-2 text-sm';
      const option = document.createElement('option');
      option.textContent = 'Loading polytopes...';
      option.disabled = true;
      select.appendChild(option);
      this.container.appendChild(select);
      return;
    }

    // Get unique categories
    const categories = ['all', ...new Set(this.polytopes.map(p => p.category).filter(Boolean).sort())];

    // Add filter controls (only for creator/pro tiers with many polytopes)
    if (this.polytopes.length > 50) {
      const filterContainer = document.createElement('div');
      filterContainer.className = 'mb-3 space-y-2';
      filterContainer.innerHTML = `
        <div class="flex gap-2">
          <select id="category-filter" class="flex-1 bg-dark-lighter text-white border border-primary/30 rounded-lg px-2 py-1 text-xs">
            ${categories.map(cat => `<option value="${cat}">${cat === 'all' ? 'All Categories' : cat}</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-2 items-center text-xs">
          <span class="text-gray-400">Edges:</span>
          <input type="number" id="edge-min" placeholder="Min" value="${this.filters.edgeMin}"
                 class="w-20 bg-dark-lighter text-white border border-primary/30 rounded px-2 py-1 text-xs">
          <span class="text-gray-400">-</span>
          <input type="number" id="edge-max" placeholder="Max" value="${this.filters.edgeMax === Infinity ? '' : this.filters.edgeMax}"
                 class="w-20 bg-dark-lighter text-white border border-primary/30 rounded px-2 py-1 text-xs">
          <button id="reset-filters" class="text-gray-400 hover:text-white text-xs">Reset</button>
        </div>
        <div id="filter-count" class="text-xs text-gray-400 text-center"></div>
      `;
      this.container.appendChild(filterContainer);
    }

    // Create dropdown
    const select = document.createElement('select');
    select.id = 'polytope-select';
    select.className = 'w-full bg-dark-lighter text-white border border-primary/30 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none';

    // Apply filters and sort
    this.applyFilters();
    const sortedPolytopes = [...this.filteredPolytopes].sort((a, b) => {
      const numA = parseInt(a.id.match(/^(\d+)/)?.[1] || '999999');
      const numB = parseInt(b.id.match(/^(\d+)/)?.[1] || '999999');
      return numA - numB;
    });

    // Add options - show edge count instead of file size
    sortedPolytopes.forEach(polytope => {
      const option = document.createElement('option');
      option.value = polytope.id;

      const edges = polytope.edges || 0;
      option.textContent = `${polytope.name} (${edges} edges)`;
      select.appendChild(option);
    });

    // Set current selection
    const urlParams = new URLSearchParams(window.location.search);
    const currentId = urlParams.get('id') || '2-tes';

    const polytopeExists = sortedPolytopes.some(p => p.id === currentId);
    if (polytopeExists) {
      select.value = currentId;
      this.currentId = currentId;
    } else if (sortedPolytopes.length > 0) {
      select.value = sortedPolytopes[0].id;
      this.currentId = sortedPolytopes[0].id;
    }

    this.container.appendChild(select);

    // Update filter count
    if (this.polytopes.length > 50) {
      const filterCount = document.getElementById('filter-count');
      if (filterCount) {
        filterCount.textContent = `Showing ${this.filteredPolytopes.length} of ${this.polytopes.length} polytopes`;
      }
    }

    // Add tier badge
    this.addTierBadge();

    // Attach filter listeners
    this.attachFilterListeners();
  }

  applyFilters() {
    this.filteredPolytopes = this.polytopes.filter(p => {
      // Category filter
      if (this.filters.category !== 'all' && p.category !== this.filters.category) {
        return false;
      }

      // Edge count filter
      const edges = p.edges || 0;
      if (edges < this.filters.edgeMin || edges > this.filters.edgeMax) {
        return false;
      }

      return true;
    });
  }

  attachFilterListeners() {
    const categoryFilter = document.getElementById('category-filter');
    const edgeMin = document.getElementById('edge-min');
    const edgeMax = document.getElementById('edge-max');
    const resetBtn = document.getElementById('reset-filters');

    if (categoryFilter) {
      categoryFilter.value = this.filters.category;
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.updateFilters();
      });
    }

    if (edgeMin) {
      edgeMin.addEventListener('input', (e) => {
        this.filters.edgeMin = parseInt(e.target.value) || 0;
        this.updateFilters();
      });
    }

    if (edgeMax) {
      edgeMax.addEventListener('input', (e) => {
        this.filters.edgeMax = parseInt(e.target.value) || Infinity;
        this.updateFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.filters.category = 'all';
        this.filters.edgeMin = 0;
        this.filters.edgeMax = Infinity;
        this.updateFilters();
      });
    }
  }

  updateFilters() {
    // Re-apply filters
    this.applyFilters();

    // Update dropdown options
    const select = document.getElementById('polytope-select');
    if (!select) return;

    select.innerHTML = '';

    const sortedPolytopes = [...this.filteredPolytopes].sort((a, b) => {
      const numA = parseInt(a.id.match(/^(\d+)/)?.[1] || '999999');
      const numB = parseInt(b.id.match(/^(\d+)/)?.[1] || '999999');
      return numA - numB;
    });

    sortedPolytopes.forEach(polytope => {
      const option = document.createElement('option');
      option.value = polytope.id;
      const edges = polytope.edges || 0;
      option.textContent = `${polytope.name} (${edges} edges)`;
      select.appendChild(option);
    });

    // Update filter count
    const filterCount = document.getElementById('filter-count');
    if (filterCount) {
      filterCount.textContent = `Showing ${this.filteredPolytopes.length} of ${this.polytopes.length} polytopes`;
    }

    // Reset selection if current isn't in filtered list
    if (!sortedPolytopes.some(p => p.id === this.currentId) && sortedPolytopes.length > 0) {
      select.value = sortedPolytopes[0].id;
    }
  }

  /**
   * Add tier badge below selector
   */
  addTierBadge() {
    const badge = document.createElement('div');
    badge.className = 'mt-2 text-xs text-center';

    const tierLabels = {
      free: { text: 'Free Tier', color: 'text-gray-400' },
      creator: { text: 'Creator Tier', color: 'text-purple-400' },
      professional: { text: 'Professional Tier', color: 'text-pink-400' }
    };

    const tierInfo = tierLabels[this.tier] || tierLabels.free;

    badge.innerHTML = `
      <span class="${tierInfo.color}">
        ${tierInfo.text} - ${this.polytopes.length} polytopes available
      </span>
    `;

    // Add upgrade link for free tier
    if (this.tier === 'free') {
      badge.innerHTML += `<br><a href="https://pardesco.com/products/4d-viewer-creator" class="text-primary hover:underline text-xs">Upgrade for ${1717 - this.polytopes.length}+ more</a>`;
    }

    this.container.appendChild(badge);
  }

  attachListeners() {
    const select = document.getElementById('polytope-select');
    if (!select) return;

    select.addEventListener('change', async (e) => {
      const polytopeId = e.target.value;
      await this.loadPolytope(polytopeId);
    });
  }

  async loadPolytope(polytopeId) {
    if (this.currentId === polytopeId) return;

    try {
      // Find polytope in loaded list
      const polytopeInfo = this.polytopes.find(p => p.id === polytopeId);
      if (!polytopeInfo) {
        throw new Error(`Polytope ${polytopeId} not found in ${this.tier} tier`);
      }

      // Show loading
      const loadingEvent = new CustomEvent('polytope-loading', {
        detail: {
          id: polytopeId,
          name: polytopeInfo.name,
          sizeKB: polytopeInfo.file_size_kb
        }
      });
      window.dispatchEvent(loadingEvent);

      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('id', polytopeId);
      window.history.pushState({}, '', url);

      // ALL tiers use /data/polytopes/{id}.off - the existing .off files work fine!
      // The tier list just controls which polytopes are SHOWN, not where they're loaded from
      const polytopePath = `/data/polytopes/${polytopeId}.off`;

      console.log(`[PolytopeSelector] Loading geometry from: ${polytopePath}`);

      // Load polytope geometry (lazy loaded on-demand)
      const data = await this.viewer.loadPolytope(polytopePath, polytopeInfo.name);

      // Update info panel with full polytope data
      this.updateInfoPanel(polytopeId, data);

      this.currentId = polytopeId;

      console.log(`[PolytopeSelector] Loaded ${polytopeId} (${polytopeInfo.file_size_kb.toFixed(1)} KB)`);
    } catch (error) {
      console.error('[PolytopeSelector] Failed to load polytope:', error);
      alert(`Failed to load ${polytopeId}: ${error.message}`);
    }
  }

  updateInfoPanel(polytopeId, data) {
    const polytope = this.polytopes.find(p => p.id === polytopeId);
    if (!polytope) return;

    // Update name
    const nameElement = document.getElementById('polytope-name');
    if (nameElement) {
      nameElement.textContent = polytope.name;
    }

    // Update statistics from loaded data
    if (data && data.metadata) {
      const verticesElement = document.getElementById('polytope-vertices');
      if (verticesElement) {
        verticesElement.textContent = data.metadata.vertexCount;
      }

      const edgesElement = document.getElementById('polytope-edges');
      if (edgesElement) {
        edgesElement.textContent = `${data.metadata.edgeCount} / ${data.metadata.edgeCount}`;
      }

      const facesElement = document.getElementById('polytope-faces');
      if (facesElement) {
        facesElement.textContent = data.metadata.faceCount;
      }

      const cellsElement = document.getElementById('polytope-cells');
      if (cellsElement) {
        cellsElement.textContent = data.metadata.cellCount;
      }
    }

    // Update file size info
    const sizeElement = document.getElementById('polytope-file-size');
    if (sizeElement && polytope.file_size_kb) {
      const sizeKB = polytope.file_size_kb;
      const sizeDisplay = sizeKB < 1024
        ? `${sizeKB.toFixed(1)} KB`
        : `${(sizeKB / 1024).toFixed(2)} MB`;
      sizeElement.textContent = sizeDisplay;
    }
  }
}
