# Testing Creator Tier (2000+ Polytopes)

## 🔑 Method 1: Browser Console (Quick Test)

### **Activate Creator Tier License (Temporary)**

Open browser DevTools (F12) and paste this in the Console:

```javascript
// Set Creator tier license (expires in 1 year)
const testLicense = {
  key: 'TEST-CREATOR-KEY-12345',
  email: 'test@example.com',
  tier: 'creator',
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  purchaseDate: new Date().toISOString(),
  daysRemaining: 365,
  validatedAt: new Date().toISOString()
};

localStorage.setItem('4d_viewer_license', JSON.stringify(testLicense));
console.log('✅ Creator tier activated! Reload the page.');
```

**Then reload the page** (F5 or Ctrl+R)

You should now see ~1,717 polytopes in the dropdown!

---

### **Switch to Professional Tier (All 2670+ Polytopes)**

```javascript
// Set Professional tier license
const testLicense = {
  key: 'TEST-PRO-KEY-12345',
  email: 'test@example.com',
  tier: 'professional',
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  purchaseDate: new Date().toISOString(),
  daysRemaining: 365,
  validatedAt: new Date().toISOString()
};

localStorage.setItem('4d_viewer_license', JSON.stringify(testLicense));
console.log('✅ Professional tier activated! Reload the page.');
```

**Reload page** → You should see ALL 2,670+ polytopes!

---

### **Revert to Free Tier**

```javascript
localStorage.removeItem('4d_viewer_license');
console.log('✅ Reverted to Free tier! Reload the page.');
```

**Reload page** → Back to 17 polytopes

---

## 🔑 Method 2: Activation Page (Production-Ready)

Navigate to: `http://localhost:3000/activate.html`

**Test License Keys** (if backend supports test mode):
- Creator: `TEST-CREATOR-LICENSE-KEY`
- Professional: `TEST-PRO-LICENSE-KEY`

---

## 🧪 Testing Checklist

### **Creator Tier (1,717 Polytopes)**
- [ ] Activate Creator tier via console
- [ ] Reload page
- [ ] Check dropdown shows "Creator Tier - 1717 polytopes available"
- [ ] Scroll through dropdown (should have 1,717 items)
- [ ] Select a polytope from middle of list
- [ ] Verify it loads correctly
- [ ] Check mesh view availability based on edge count

### **Professional Tier (2,670+ Polytopes)**
- [ ] Activate Professional tier via console
- [ ] Reload page
- [ ] Check dropdown shows "Professional Tier - 2670 polytopes available"
- [ ] Scroll through dropdown (should have ALL polytopes)
- [ ] Test searching for specific polytope
- [ ] Load complex polytope (>1200 edges)
- [ ] Verify mesh view disabled with notification

### **UI Performance**
- [ ] Dropdown opens without lag
- [ ] Scrolling through 2000+ items is smooth
- [ ] Search/filter works quickly
- [ ] Polytope loading is fast

---

## 🚨 Known Issues with Current UI

### **Problem: Native `<select>` with 2000+ Items**

The current dropdown uses a native HTML `<select>` element, which:
- ❌ Becomes sluggish with 2000+ options
- ❌ No search functionality
- ❌ Hard to navigate
- ❌ Poor UX for large lists

### **Recommended Fix:**
Upgrade to a **searchable dropdown component** with:
- ✅ Virtual scrolling (renders only visible items)
- ✅ Search/filter bar
- ✅ Category grouping
- ✅ Keyboard navigation
- ✅ Performance optimized for 10,000+ items

See `UI-IMPROVEMENTS.md` for implementation details.

---

## 🎯 Expected Behavior by Tier

| Tier | Polytopes | Features |
|------|-----------|----------|
| **Free** | 17 | Basic polytopes, mesh view, exports |
| **Creator** | 1,717 | All polytopes <500KB, searchable list |
| **Professional** | 2,670+ | ALL polytopes, including large files |

---

## 🐛 Troubleshooting

### Tier Not Changing After Setting License?
1. Check browser console for errors
2. Verify localStorage: `localStorage.getItem('4d_viewer_license')`
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Clear cache and reload

### Dropdown Too Slow?
- This is expected with 2000+ options in native `<select>`
- Implement searchable dropdown (see UI improvements)

### Polytope Not Loading?
- Check file exists: `public/data/polytopes/{id}.off`
- Verify filename is lowercase
- Check browser Network tab for 404 errors
