# 4D Polytope Viewer

Interactive visualization of 4-dimensional polytopes using stereographic projection and true 4D rotation.

**Live Site:** https://4d.pardesco.com *(coming soon)*

---

## 🎯 Quick Start

### **Development**
```bash
npm install
npm run dev
# Opens http://localhost:3000
```

### **Production Build**
```bash
npm run build
# Output in dist/
```

### **Preview Production**
```bash
npm run preview
# Opens http://localhost:4173
```

---

## ✨ Features

- 🔄 **True 4D Rotation** - Rotate in 6 fundamental planes (XY, XZ, XW, YZ, YW, ZW)
- 📐 **Stereographic Projection** - Beautiful curved edges from 4D to 3D
- 🎮 **Interactive Controls** - Mouse, keyboard, and touch support
- 📊 **17 Polytopes** - From simple 5-cell to complex 600-cell
- ⚡ **Performance Safety** - Smart edge limiting prevents crashes
- 🎨 **Beautiful UI** - Glassmorphism design with smooth animations
- 📱 **Responsive** - Works on desktop and mobile

---

## 🎮 Controls

### **Mouse**
- **Drag** - Rotate 3D view
- **Scroll** - Zoom in/out

### **Keyboard**
- **Space** - Toggle 4D rotation
- **R** - Reset view
- **M** - Toggle mesh view
- **V** - Toggle vertices
- **P** - Toggle projection type
- **3** - Toggle 3D auto-rotation

### **UI**
- **Dropdown** - Select polytope (top-right panel)
- **Plane Buttons** - Enable/disable rotation planes
- **View Toggles** - Switch between line/mesh, show/hide vertices

---

## 📦 Project Structure

```
src/js/
├── polytope/          # Core 4D math and rendering
│   ├── stereographic.js
│   ├── rotation4d.js
│   ├── parser.js
│   └── viewer.js
├── ui/                # User interface
│   ├── controls.js
│   └── polytope-selector.js
├── performance/       # Safety and optimization
│   └── manager.js
└── main.js           # Entry point
```

---

## 🔧 Tech Stack

- **Three.js r128** - 3D rendering engine
- **Vite 5.4** - Build system
- **Tailwind CSS 3.4** - Styling
- **ES6 Modules** - Modern JavaScript
- **Cloudflare Pages** - Hosting (planned)

---

## 📊 Available Polytopes

| Polytope | Edges | Complexity | Notes |
|----------|-------|------------|-------|
| 5-Cell (1-Pen) | 10 | Simple | Simplest regular polytope |
| Tesseract (2-Tes) | 32 | Simple | 4D hypercube, default |
| 16-Cell (3-Hex) | 32 | Simple | 4D cross-polytope |
| 24-Cell (4-Ico) | 96 | Simple | Self-dual |
| 120-Cell (5-Hi) | 1200 | Medium | Performance warning |
| 600-Cell (6-Ex) | 1200 | Medium | Performance warning |
| *+ 11 more* | varies | varies | See dropdown |

---

## 🚀 Deployment

See `DEPLOY.md` for detailed deployment instructions.

**Quick Deploy to Cloudflare Pages:**
1. Build: `npm run build`
2. Upload `dist/` folder to Cloudflare Pages
3. Configure custom domain
4. Done!

---

## 🧪 Testing

See `TESTING.md` for comprehensive test procedures.

**Quick Test:**
```bash
npm run dev
# Visit http://localhost:3000/viewer.html
# Try switching polytopes with dropdown
# Enable mesh view, test 4D rotation
```

---

## 📝 Documentation

- `PROJECT_STATUS.md` - Detailed project status and progress
- `TESTING.md` - Test procedures and checklists
- `DEPLOY.md` - Deployment guide
- `README.md` - This file

---

## 🎨 Design Philosophy

**Visual Quality:** Prioritize beauty over aggressive performance limiting
**User Trust:** Show warnings but allow overrides
**Accessibility:** Clear labels, keyboard shortcuts, responsive design
**Performance:** Smart but generous edge limits, FPS monitoring

---

## 🐛 Known Limitations

- Gallery page is placeholder (Sprint 2)
- Mobile touch gestures basic (pinch-zoom coming)
- Export functionality removed (was server-dependent)
- Very complex polytopes (>2400 edges) show reduced detail

---

## 🤝 Contributing

This is a Pardesco LLC project. For issues or suggestions:
1. Test thoroughly with `npm run dev`
2. Document expected vs actual behavior
3. Include browser console output
4. Note which polytope was loaded

---

## 📄 License

Copyright © 2025 Pardesco LLC. All rights reserved.

---

## 🙏 Credits

**Powered by:**
- Three.js community
- Vite build system
- Tailwind CSS framework
- Claude AI (development assistance)

**Polytope Data:**
- Based on uniform polychora classifications
- .off file format for 4D geometry

---

**Built with ❤️ for exploring the fourth dimension**

For detailed project information, see `PROJECT_STATUS.md`
