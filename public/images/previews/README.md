# Preview Images

This directory contains preview images for the featured polytopes on the landing page.

## How to Generate Preview Images

1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/preview-generator.html`
3. Click "Generate All Preview Images"
4. Wait for the images to download (check your Downloads folder)
5. Move the downloaded images to this directory:
   - `tesseract-preview.png`
   - `24-cell-preview.png`
   - `120-cell-preview.png`

## Image Specifications

- **Format**: PNG
- **Size**: 600x600px (square)
- **Content**: Rendered 4D polytope with:
  - Iridescent material shader (beautiful color gradients)
  - Bloom effect enabled (glowing edges)
  - 4D rotation applied for visual interest:
    - Tesseract: XW plane rotation (0.3 rad)
    - 24-cell: YW plane rotation (0.4 rad)
    - 120-cell: ZW plane rotation (0.2 rad)
- **Watermark**: "4d.pardesco.com" (bottom right)

## Fallback Behavior

If preview images are not found, the landing page will gracefully fall back to emoji icons:
- Tesseract: 📦
- 24-cell: ⭐
- 120-cell: 🌟
