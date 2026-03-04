/**
 * Automated Screenshot Capture for Sales Page
 *
 * Captures 6 interesting polytopes with varying edge counts
 * for showcase/marketing purposes
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 6 interesting polytopes with varying complexity
const POLYTOPES_TO_CAPTURE = [
  { id: '2-tes', name: 'Tesseract', edges: 32, description: 'Classic 4D hypercube' },
  { id: '4-ico', name: '24-Cell', edges: 96, description: 'Self-dual regular polytope' },
  { id: '10-sishi', name: 'Small Stellated 120-Cell', edges: 1200, description: 'Beautiful star polytope' },
  { id: '22-thi', name: 'Triangular Hebesphenorotunda', edges: 4800, description: 'Complex uniform polytope' },
  { id: '31-tissidtixhi', name: 'Tetrahedral Icositetrachoron', edges: 8400, description: 'Massive uniform polytope' },
  { id: '5-hi', name: '120-Cell', edges: 1200, description: 'Most complex regular polytope' }
];

const VIEWPORT = {
  width: 1920,
  height: 1080
};

const SCREENSHOT_DELAY = 3000; // Wait for polytope to load and settle

async function captureScreenshots() {
  console.log('🎥 Starting automated screenshot capture...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    for (let i = 0; i < POLYTOPES_TO_CAPTURE.length; i++) {
      const polytope = POLYTOPES_TO_CAPTURE[i];
      const filename = `screenshot-${i + 1}-${polytope.id}.png`;
      const filepath = join(__dirname, '..', filename);

      console.log(`📸 [${i + 1}/6] Capturing: ${polytope.name} (${polytope.edges} edges)`);
      console.log(`   Description: ${polytope.description}`);

      // Navigate to viewer with polytope
      const url = `http://localhost:3001/viewer.html?id=${polytope.id}`;
      console.log(`   Loading: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle0' });

      // Wait for WebGL to initialize and polytope to load
      await new Promise(resolve => setTimeout(resolve, SCREENSHOT_DELAY));

      // Enable 4D rotation for more interesting view
      await page.evaluate(() => {
        if (window.viewer && !window.viewer.rotating4D) {
          const button = document.getElementById('rotate-4d-btn');
          if (button) button.click();
        }
      });

      // Wait a bit more for rotation to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Take screenshot
      await page.screenshot({
        path: filepath,
        fullPage: false
      });

      console.log(`   ✅ Saved: ${filename}\n`);
    }

    console.log('🎉 All screenshots captured successfully!');
    console.log('\n📁 Screenshots saved in project root:');
    POLYTOPES_TO_CAPTURE.forEach((p, i) => {
      console.log(`   ${i + 1}. screenshot-${i + 1}-${p.id}.png - ${p.name}`);
    });

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
