import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POLYTOPES = [
  { id: '5-hi', name: '120-Cell', edges: 1200 },
  { id: '20-thex', name: 'Tetrahedral Hexacosihecatonicosachoron', edges: 120 }
];

async function capture() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (let i = 0; i < POLYTOPES.length; i++) {
    const p = POLYTOPES[i];
    const num = i + 5;
    const filename = `screenshot-${num}-${p.id}.png`;
    const filepath = join(__dirname, '..', filename);

    console.log(`📸 [${num}/6] ${p.name} (${p.edges} edges)`);

    try {
      await page.goto(`http://localhost:3001/viewer.html?id=${p.id}`, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(r => setTimeout(r, 4000));

      await page.evaluate(() => {
        const btn = document.getElementById('rotate-4d-btn');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: filepath });
      console.log(`   ✅ Saved: ${filename}\n`);
    } catch (err) {
      console.log(`   ❌ Failed:`, err.message);
    }
  }

  await browser.close();
  console.log('✅ Done!');
}

capture();
