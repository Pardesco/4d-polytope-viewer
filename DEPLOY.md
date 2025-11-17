# Quick Deploy Guide

**Target:** 4d.pardesco.com
**Status:** Production build ready in `dist/` folder

---

## 🚀 Cloudflare Pages (Recommended)

### **Option 1: Drag & Drop (Fastest)**

1. **Go to:** https://dash.cloudflare.com
2. **Login/Signup** (free account)
3. **Navigate:** Workers & Pages → Create application → Pages → Upload assets
4. **Drag folder:** The entire `dist/` folder from:
   ```
   C:\Users\Randall\Documents\polytope-web-app\dist
   ```
5. **Project name:** `polytope-4d`
6. **Deploy!**

**Result:** Live at `https://polytope-4d.pages.dev` in ~2 minutes

### **Option 2: CLI (Automated)**

```bash
# Install Wrangler (one-time)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy from project root
cd C:\Users\Randall\Documents\polytope-web-app
wrangler pages deploy dist --project-name=polytope-4d
```

---

## 🌐 Custom Domain Setup

**After deployment:**

1. **Cloudflare Dashboard** → Pages → polytope-4d → Custom domains
2. **Add domain:** `4d.pardesco.com`
3. **If pardesco.com is on Cloudflare:**
   - DNS records added automatically ✅
4. **If pardesco.com is elsewhere:**
   - Add CNAME: `4d` → `polytope-4d.pages.dev`
5. **Wait 5 minutes** for SSL certificate

**Result:** Live at `https://4d.pardesco.com`

---

## ✅ Pre-Deployment Checklist

- [x] Production build complete (`npm run build`)
- [x] All 17 polytopes in `dist/data/polytopes/`
- [x] Bundle optimized (130 KB gzipped)
- [x] No console errors in local testing
- [x] Polytope selector working
- [x] Performance warnings functional
- [ ] Final local test (`npm run preview`)
- [ ] Verify on mobile browser

---

## 🧪 Post-Deployment Testing

**After deploying, test these URLs:**

- `https://4d.pardesco.com/`
- `https://4d.pardesco.com/viewer.html`
- `https://4d.pardesco.com/viewer.html?id=5-hi`
- `https://4d.pardesco.com/viewer.html?id=6-ex`

**Verify:**
- [ ] Landing page loads
- [ ] Viewer loads default tesseract
- [ ] Dropdown selector works
- [ ] 5-hi shows all edges
- [ ] 6-ex loads correctly
- [ ] No 404 errors on polytope files
- [ ] HTTPS working (green lock)
- [ ] Fast load times (<3 seconds)

---

## 🐛 If Something Goes Wrong

### **404 on .off files:**
- Check: `dist/data/polytopes/` exists
- Check: Files are lowercase (2-tes.off not 2-Tes.off)
- Re-deploy if needed

### **Blank page:**
- Open browser console (F12)
- Check for errors
- Verify all assets loading (check Network tab)

### **Slow loading:**
- Cloudflare CDN needs time to propagate (wait 5 min)
- Check gzip compression is active (should be automatic)

### **Custom domain not working:**
- DNS propagation takes 5-60 minutes
- Check DNS records in Cloudflare
- Verify SSL certificate issued

---

## 📊 Expected Performance

**Lighthouse Scores (Target):**
- Performance: 90+
- Accessibility: 85+
- Best Practices: 90+
- SEO: 85+

**Load Times:**
- Initial: <3 seconds (4G)
- Time to Interactive: <5 seconds
- Polytope switch: <2 seconds

---

## 🔄 Updating After Deployment

**To update the live site:**

1. Make changes locally
2. Test: `npm run dev`
3. Build: `npm run build`
4. Deploy updated `dist/` folder (same process as initial)

**Cloudflare automatically:**
- Invalidates old cache
- Deploys new version
- Maintains custom domain
- No downtime

---

## 💡 Tips

- **First deploy takes longest** (~5 min for SSL)
- **Subsequent deploys are instant** (~30 seconds)
- **Cloudflare caches aggressively** - good for performance
- **Browser cache:** Users may need hard refresh (Ctrl+Shift+R)

---

## 📞 Support

**Cloudflare Issues:**
- Docs: https://developers.cloudflare.com/pages/
- Community: https://community.cloudflare.com/

**Project Issues:**
- Check: PROJECT_STATUS.md
- Check: TESTING.md
- Console logs show detailed error info

---

**Ready to deploy! The viewer is production-ready and all issues are resolved.** 🚀
