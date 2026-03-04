#!/usr/bin/env node
/**
 * Unified Build Script
 *
 * Builds both the main viewer app (Vite) and the knowledge base (Astro),
 * then merges them into a single dist folder for Cloudflare Pages deployment.
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const kbDir = join(rootDir, 'knowledge-base');
const distDir = join(rootDir, 'dist');
const kbDistDir = join(kbDir, 'dist');

console.log('🔨 Unified Build Script\n');

// Step 1: Clean dist folder
console.log('1️⃣  Cleaning dist folder...');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir);

// Step 2: Build main app with Vite
console.log('2️⃣  Building main app (Vite)...');
try {
  execSync('npm run build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
} catch (error) {
  console.error('❌ Main app build failed');
  process.exit(1);
}

// Step 3: Build knowledge base with Astro
console.log('\n3️⃣  Building knowledge base (Astro)...');
try {
  execSync('npm run build', {
    cwd: kbDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
} catch (error) {
  console.error('❌ Knowledge base build failed');
  process.exit(1);
}

// Step 4: Copy knowledge base output to main dist
console.log('\n4️⃣  Merging knowledge base into dist...');
try {
  // Copy all KB dist contents to main dist (will not overwrite existing files)
  cpSync(kbDistDir, distDir, {
    recursive: true,
    force: false,  // Don't overwrite existing files
    errorOnExist: false
  });
  console.log('   ✅ Merged /guide, /learn, /shapes directories');
  console.log('   ✅ Merged /_kb assets');
} catch (error) {
  console.error('❌ Merge failed:', error.message);
  process.exit(1);
}

// Summary
console.log('\n✅ Build complete!\n');
console.log('📁 Output: dist/');
console.log('   Main app:');
console.log('     - /index.html (landing page)');
console.log('     - /viewer.html (4D viewer)');
console.log('     - /gallery.html (gallery)');
console.log('   Knowledge base:');
console.log('     - /guide/ (knowledge base hub)');
console.log('     - /learn/* (5 articles)');
console.log('     - /shapes/* (7 pages)');
console.log('\n🚀 Ready for deployment to Cloudflare Pages');
