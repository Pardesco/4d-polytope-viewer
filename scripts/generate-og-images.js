/**
 * OG Image Generator for Knowledge Base
 *
 * Generates Open Graph images (1200x630) for VIP polytope pages
 * Uses mesh view with bloom disabled for clean, shareable images
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// OG image standard dimensions
const OG_VIEWPORT = {
  width: 1200,
  height: 630
};

// The 6 convex regular polychora (VIPs)
const CONVEX_REGULARS = [
  { id: '1-pen', slug: 'pentachoron', name: 'Pentachoron', aka: '5-cell' },
  { id: '2-tes', slug: 'tesseract', name: 'Tesseract', aka: 'Hypercube' },
  { id: '3-hex', slug: '16-cell', name: 'Hexadecachoron', aka: '16-cell' },
  { id: '4-ico', slug: '24-cell', name: 'Icositetrachoron', aka: '24-cell' },
  { id: '5-hi', slug: '120-cell', name: 'Hecatonicosachoron', aka: '120-cell' },
  { id: '6-ex', slug: '600-cell', name: 'Hexacosichoron', aka: '600-cell' }
];

// The 10 Schläfli-Hess star polychora
const STAR_REGULARS = [
  { id: '7-fix', slug: 'icosahedral-120-cell', name: 'Icosahedral 120-cell' },
  { id: '8-gohi', slug: 'great-120-cell', name: 'Great 120-cell' },
  { id: '9-gahi', slug: 'grand-120-cell', name: 'Grand 120-cell' },
  { id: '10-sishi', slug: 'small-stellated-120-cell', name: 'Small Stellated 120-cell' },
  { id: '11-gaghi', slug: 'great-grand-120-cell', name: 'Great Grand 120-cell' },
  { id: '12-gishi', slug: 'great-stellated-120-cell', name: 'Great Stellated 120-cell' },
  { id: '13-gashi', slug: 'grand-stellated-120-cell', name: 'Grand Stellated 120-cell' },
  { id: '14-gofix', slug: 'great-icosahedral-120-cell', name: 'Great Icosahedral 120-cell' },
  { id: '15-gax', slug: 'grand-600-cell', name: 'Grand 600-cell' },
  { id: '16-gogishi', slug: 'great-grand-stellated-120-cell', name: 'Great Grand Stellated 120-cell' }
];

// All 16 regular polychora
const ALL_REGULARS = [...CONVEX_REGULARS, ...STAR_REGULARS];

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000', // Vite dev server
  outputDir: join(__dirname, '..', 'public', 'images', 'og'),
  loadDelay: 3000,      // Wait for polytope to load
  rotationDelay: 2000,  // Let it rotate to interesting angle
  settleDelay: 500      // Final settle before capture
};

async function setupViewerForOG(page) {
  /**
   * Configure viewer for OG image capture:
   * - Mesh view ON (solid tubes)
   * - Bloom OFF (cleaner for compression)
   * - Hide UI elements
   * - Set optimal camera angle
   */
  await page.evaluate(() => {
    const viewer = window.viewer;
    if (!viewer) {
      console.error('Viewer not found');
      return false;
    }

    // Enable mesh view
    if (!viewer.meshViewEnabled) {
      viewer.toggleMeshView(true);
    }

    // Disable bloom
    if (viewer.bloomEffect) {
      viewer.bloomEffect.setEnabled(false);
    }

    // Hide UI elements for clean capture
    const elementsToHide = [
      '.hud-overlay',
      '.controls-panel',
      '.export-menu',
      '.polytope-selector-container',
      '#matrix-display',
      '.performance-warning',
      '.watermark'
    ];

    elementsToHide.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.style.display = 'none';
    });

    // Ensure canvas fills viewport
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    }

    return true;
  });
}

async function captureOGImage(page, polytope, outputPath) {
  const url = `${CONFIG.baseUrl}/viewer.html?id=${polytope.id}`;

  console.log(`  Loading: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for initial load
  await new Promise(resolve => setTimeout(resolve, CONFIG.loadDelay));

  // Configure viewer for OG capture
  await setupViewerForOG(page);

  // Enable 4D rotation briefly for interesting angle
  await page.evaluate(() => {
    const viewer = window.viewer;
    if (viewer && !viewer.rotating4D) {
      viewer.rotating4D = true;
    }
  });

  // Let it rotate to an interesting angle
  await new Promise(resolve => setTimeout(resolve, CONFIG.rotationDelay));

  // Stop rotation for clean capture
  await page.evaluate(() => {
    const viewer = window.viewer;
    if (viewer) {
      viewer.rotating4D = false;
    }
  });

  // Final settle
  await new Promise(resolve => setTimeout(resolve, CONFIG.settleDelay));

  // Capture screenshot
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 90,
    clip: {
      x: 0,
      y: 0,
      width: OG_VIEWPORT.width,
      height: OG_VIEWPORT.height
    }
  });
}

async function generateOGImages(polytopes = ALL_REGULARS) {
  console.log('🖼️  OG Image Generator for Knowledge Base\n');
  console.log(`   Viewport: ${OG_VIEWPORT.width}x${OG_VIEWPORT.height}`);
  console.log(`   Output: ${CONFIG.outputDir}`);
  console.log(`   Polytopes: ${polytopes.length}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--use-gl=egl'  // Enable WebGL in headless mode
    ]
  });

  const results = {
    success: [],
    failed: []
  };

  try {
    const page = await browser.newPage();
    await page.setViewport(OG_VIEWPORT);

    for (let i = 0; i < polytopes.length; i++) {
      const polytope = polytopes[i];
      const filename = `${polytope.slug}.jpg`;
      const outputPath = join(CONFIG.outputDir, filename);

      console.log(`📸 [${i + 1}/${polytopes.length}] ${polytope.name}`);

      try {
        await captureOGImage(page, polytope, outputPath);
        console.log(`   ✅ Saved: ${filename}\n`);
        results.success.push(polytope);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        results.failed.push({ polytope, error: error.message });
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${results.success.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);

    if (results.success.length > 0) {
      console.log('\n📁 Generated images:');
      results.success.forEach(p => {
        console.log(`   - ${p.slug}.jpg (${p.name})`);
      });
    }

    if (results.failed.length > 0) {
      console.log('\n⚠️  Failed captures:');
      results.failed.forEach(({ polytope, error }) => {
        console.log(`   - ${polytope.name}: ${error}`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }

  return results;
}

// CLI options
const args = process.argv.slice(2);
let targetPolytopes = ALL_REGULARS;

if (args.includes('--convex-only')) {
  targetPolytopes = CONVEX_REGULARS;
  console.log('Mode: Convex regulars only (6 shapes)\n');
} else if (args.includes('--stars-only')) {
  targetPolytopes = STAR_REGULARS;
  console.log('Mode: Star regulars only (10 shapes)\n');
} else if (args.length > 0 && !args[0].startsWith('--')) {
  // Specific slug provided
  const slug = args[0];
  const found = ALL_REGULARS.find(p => p.slug === slug || p.id === slug);
  if (found) {
    targetPolytopes = [found];
    console.log(`Mode: Single polytope (${found.name})\n`);
  } else {
    console.error(`Unknown polytope: ${slug}`);
    console.log('Available slugs:', ALL_REGULARS.map(p => p.slug).join(', '));
    process.exit(1);
  }
}

// Run
generateOGImages(targetPolytopes).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
