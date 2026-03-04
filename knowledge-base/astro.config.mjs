import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [
    tailwind(),
    mdx()
  ],
  output: 'static',
  site: 'https://4d.pardesco.com',
  base: '/',
  build: {
    assets: '_kb',  // Prefix to avoid conflicts with main app assets
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
