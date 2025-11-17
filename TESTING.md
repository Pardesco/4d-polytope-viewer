# Testing Instructions

## Parser Fix Testing

The parser has been updated to handle .off file format variations more robustly.

### Changes Made:
1. **Flexible line ending handling** - Now handles CRLF, LF, and CR
2. **Case-insensitive 4OFF detection** - Accepts "4OFF", "4off", "4 OFF"
3. **Better error messages** - Logs what it found if parsing fails
4. **Enhanced debugging** - Shows first 5 lines and raw content

### Test All Polytopes:

Start dev server:
```bash
npm run dev
```

Then test each polytope by visiting:

**Simple Polytopes (Should all work):**
- http://localhost:3000/viewer.html?id=1-Pen (5-cell, 10 edges)
- http://localhost:3000/viewer.html?id=2-Tes (Tesseract, 32 edges)
- http://localhost:3000/viewer.html?id=3-Hex (16-cell, 32 edges)
- http://localhost:3000/viewer.html?id=4-Ico (24-cell, 96 edges)
- http://localhost:3000/viewer.html?id=5-Hi (120-cell, 720 edges)
- http://localhost:3000/viewer.html?id=6-Ex (600-cell, 1200 edges)

**Other Cat1 Polytopes:**
- http://localhost:3000/viewer.html?id=7-Fix
- http://localhost:3000/viewer.html?id=8-Gohi
- http://localhost:3000/viewer.html?id=9-Gahi
- http://localhost:3000/viewer.html?id=10-Sishi
- http://localhost:3000/viewer.html?id=11-Gaghi
- http://localhost:3000/viewer.html?id=12-Gishi
- http://localhost:3000/viewer.html?id=13-Gashi
- http://localhost:3000/viewer.html?id=14-Gofix
- http://localhost:3000/viewer.html?id=15-Gax
- http://localhost:3000/viewer.html?id=16-Gogishi
- http://localhost:3000/viewer.html?id=17-Tho

### Expected Behavior:

**For simple polytopes (<400 edges):**
- ✅ Loads without warnings
- ✅ Full 4D rotation enabled
- ✅ Smooth 60 FPS

**For medium polytopes (400-720 edges):**
- ⚠️ Shows performance warning
- ⚠️ May run at 15-30 FPS
- ✅ User can choose to continue or view static

**For complex polytopes (>720 edges):**
- 🚫 Shows "rotation disabled" warning
- ✅ Static view available
- ⚠️ Desktop users can override

### Debug Console Output:

Open browser console (F12) to see detailed parser output:

```
[LoadOff] Fetching: /data/polytopes/2-Tes.off
[LoadOff] Loaded 804 bytes
[LoadOff] Content starts: "4OFF
16 24 32 8

# Vertices
0.5 0.5 0.5 0.5"
[Parser] First 5 lines: 0: "4OFF", 1: "16 24 32 8", 2: "", 3: "# Vertices", 4: "0.5 0.5 0.5 0.5"
[Parser] Found 4OFF marker at line 0: "4OFF"
[Parser] Header: 16 vertices, 24 faces, 32 edges, 8 cells
[Parser] Parsed 16 vertices
[Parser] Processed 24 faces
[Parser] Extracted 32 unique edges
```

### If Parser Still Fails:

The console will show:
```
[Parser] No 4OFF marker found
[Parser] File starts with: ...
[Parser] First non-empty line: ...
```

Report these messages so we can further diagnose.

### Performance Testing:

1. **Test 600-cell (6-Ex)** - Should show warning, limit rotation
2. **Enable mesh view** - Verify thickness gradient (outer thick, center thin)
3. **Check FPS display** - Should show current frame rate
4. **Test on mobile** - Should adapt edge limits automatically

### Success Criteria:

- [ ] All 17 polytopes load without "No 4OFF marker" error
- [ ] Performance warnings appear for complex polytopes
- [ ] Mesh view shows correct thickness gradient
- [ ] Console shows detailed parser logs
- [ ] No JavaScript errors in console
