# SpaceGraphJS — Contingency Plan & Risk Mitigation

**Purpose:** Anticipate every hidden contingency. Ensure total success regardless of obstacles.

---

## Executive Summary

**Known unknowns:** Things we know could go wrong (covered in ENHANCED-BUILD-PLAN.md)

**Unknown unknowns:** Things we don't know could go wrong (covered here)

**This document ensures:** No single failure can kill the project.

---

## Risk Matrix: Complete Analysis

### Critical Risks (Could Kill Project)

| Risk | Probability | Impact | Prevention | Detection | Recovery |
|------|-------------|--------|------------|-----------|----------|
| **R1: Three.js incompatibility** | 25% | 100% | Version pinning | Build fails | Fallback version |
| **R2: npm package name taken** | 15% | 100% | Check before Day 1 | npm publish fails | Alternative name |
| **R3: TypeScript export broken** | 30% | 80% | Daily type checks | Import fails | Fix exports |
| **R4: WebGL not supported** | 5% | 100% | Feature detection | Blank screen | Fallback message |
| **R5: Critical memory leak** | 20% | 60% | Memory profiling | DevTools check | Fix leak |

### High Risks (Could Delay Launch)

| Risk | Probability | Impact | Prevention | Detection | Recovery |
|------|-------------|--------|------------|-----------|----------|
| **R6: ESM module resolution fails** | 40% | 50% | Correct package.json | Import errors | Fix type/module |
| **R7: Camera controls broken** | 50% | 30% | Test early | User reports | Simplified controls |
| **R8: Build size too large** | 25% | 40% | Bundle analysis | npm pack check | Tree-shaking |
| **R9: Browser compatibility** | 35% | 50% | Multi-browser test | Cross-browser test | Polyfills |
| **R10: Node.js version mismatch** | 30% | 40% | engines field | Error message | Clear requirements |

### Medium Risks (Annoyances)

| Risk | Probability | Impact | Prevention | Detection | Recovery |
|------|-------------|--------|------------|-----------|----------|
| **R11: npm login expired** | 20% | 20% | Test before publish | Auth error | npm login |
| **R12: Git conflicts** | 25% | 10% | Daily commits | Merge conflict | Resolve carefully |
| **R13: Documentation typos** | 60% | 10% | Proofread | User reports | Fix post-launch |
| **R14: Matrix room spam** | 10% | 10% | Moderation settings | User reports | Enable moderation |
| **R15: Low initial adoption** | 50% | 30% | Content marketing | Download count | Month 2 marketing |

---

## Contingency Procedures

### R1: Three.js Incompatibility

**Prevention (Day 1):**
```json
{
  "peerDependencies": {
    "three": ">=0.150.0 <0.170.0"
  },
  "devDependencies": {
    "three": "^0.160.0"
  }
}
```

**Detection:**
```bash
# Day 2: If build fails with Three.js errors
npm run build 2>&1 | grep -i "three"
```

**Recovery:**
```bash
# Try known-compatible version
npm install three@0.160.0 --save-dev

# If that fails, try older version
npm install three@0.155.0 --save-dev

# Update peerDependencies range
# Rebuild and test
```

**Fallback:** Pin exact version in documentation if range doesn't work.

---

### R2: npm Package Name Taken

**Prevention (Day 0):**
```bash
# Check availability BEFORE starting
npm view spacegraphjs 2>&1 | grep -q "npm ERR" && echo "Available" || echo "Taken"

# Also check similar names
npm view space-graph-js
npm view spacegraph-js
npm view @autonull/spacegraphjs
```

**If `spacegraphjs` is taken:**

| Alternative | Pros | Cons |
|-------------|------|------|
| `@autonull/spacegraphjs` | Scoped, professional | Requires org setup |
| `spacegraph-js` | Clear separator | Hyphen in import |
| `spacegraph-core` | Implies extensibility | Less memorable |
| `zui-spacegraph` | Descriptive | Longer name |

**Recovery:**
```bash
# Update package.json
{
  "name": "@autonull/spacegraphjs"
}

# Update all imports
import { SpaceGraph } from '@autonull/spacegraphjs';

# Update documentation
# npm login (ensure org access)
npm publish --tag alpha
```

---

### R3: TypeScript Export Broken

**Prevention (Day 1-2):**
```json
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "./dist/types",
    "esModuleInterop": true
  }
}
```

```typescript
// src/index.ts - Use explicit exports
export { SpaceGraph } from './SpaceGraph';
export type { GraphSpec, NodeSpec, EdgeSpec } from './types';
```

**Detection:**
```bash
# Day 2: Test type resolution
npm run build
ls dist/types/  # Should show .d.ts files

# Test in fresh project
mkdir /tmp/type-test && cd /tmp/type-test
npm install /path/to/spacegraphjs
cat > test.ts << 'EOF'
import { SpaceGraph } from 'spacegraphjs';
// TypeScript should provide autocomplete
EOF
npx tsc --noEmit test.ts  # Should pass
```

**Recovery:**
```bash
# If types don't export:
# 1. Check tsconfig.json has declaration: true
# 2. Check src/index.ts has explicit exports
# 3. Rebuild
npm run clean && npm run build

# 4. Verify .d.ts files exist
find dist/types -name "*.d.ts"

# 5. If still broken, add explicit type exports
# src/index.ts
export * from './SpaceGraph';
export * from './types';
```

---

### R4: WebGL Not Supported

**Prevention (Day 3):**
```typescript
// src/SpaceGraph.ts - Add feature detection
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}
```

**Detection:**
```html
<!-- demo/index.html -->
<div id="webgl-error" style="display:none; color: red; padding: 20px;">
  <h2>WebGL Not Supported</h2>
  <p>SpaceGraphJS requires WebGL support.</p>
  <p>Please try a modern browser: Chrome, Firefox, Safari, or Edge.</p>
  <p>Check your support: <a href="https://get.webgl.org/">get.webgl.org</a></p>
</div>
```

```typescript
// demo/main.ts
if (!checkWebGLSupport()) {
  document.getElementById('webgl-error').style.display = 'block';
  document.getElementById('container').style.display = 'none';
  throw new Error('WebGL not supported');
}
```

**Recovery:**
- User sees clear error message
- Directed to WebGL test page
- No silent failures

---

### R5: Critical Memory Leak

**Prevention (Day 5):**
```typescript
// src/SpaceGraph.ts - Add cleanup method
dispose(): void {
  console.log('[SpaceGraph] Disposing...');
  
  // Remove event listeners
  window.removeEventListener('resize', this.onResize);
  
  // Dispose Three.js objects
  this.nodes.forEach(node => {
    node.geometry.dispose();
    if (Array.isArray(node.material)) {
      node.material.forEach(m => m.dispose());
    } else {
      node.material.dispose();
    }
  });
  
  this.edges.forEach(edge => {
    edge.geometry.dispose();
    edge.material.dispose();
  });
  
  // Remove canvas
  this.renderer.domElement.remove();
  this.renderer.dispose();
  
  console.log('[SpaceGraph] Disposed successfully');
}
```

**Detection:**
```javascript
// In browser DevTools → Memory tab
// 1. Take heap snapshot
// 2. Refresh page 5 times
// 3. Take another snapshot
// 4. Compare - should not grow significantly

// Or use Performance Monitor
// Should stay stable, not climb
```

**Recovery:**
```bash
# If leak detected:
# 1. Identify leaking objects (DevTools → Heap Snapshot)
# 2. Add dispose() calls for those objects
# 3. Test again
# 4. Document dispose() in QUICKSTART.md
```

---

### R6: ESM Module Resolution Fails

**Prevention (Day 1):**
```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/spacegraphjs.js"
    }
  }
}
```

**Detection:**
```bash
# Day 2: Test module resolution
node --experimental-specifier-resolution=node -e "import('spacegraphjs')"

# If error: "ERR_MODULE_NOT_FOUND" or "ERR_UNSUPPORTED_DIR_IMPORT"
```

**Recovery:**
```bash
# Option 1: Add .js extensions to all imports
# src/index.ts
export { SpaceGraph } from './SpaceGraph.js';  // Add .js

# Option 2: Use package.json exports field correctly
# Ensure "import" points to actual file

# Option 3: Add module field for older bundlers
{
  "module": "./dist/spacegraphjs.js"
}
```

---

### R7: Camera Controls Broken

**Prevention (Day 5):**
```typescript
// Use simplified, tested controls
// Include visual feedback
console.log('[SpaceGraph] Controls: Left-click drag to rotate, scroll to zoom');

// Add on-screen instructions
const instructions = document.createElement('div');
instructions.style.position = 'fixed';
instructions.style.bottom = '10px';
instructions.style.left = '10px';
instructions.style.background = 'rgba(0,0,0,0.7)';
instructions.style.color = 'white';
instructions.style.padding = '10px';
instructions.style.borderRadius = '4px';
instructions.textContent = '🖱️ Drag to rotate • Scroll to zoom';
document.body.appendChild(instructions);
```

**Detection:**
```javascript
// In browser console
// Try rotating - camera should move
// Try zooming - camera should move in/out

// If nothing happens, check:
// 1. Event listeners attached?
// 2. Canvas receiving events?
// 3. Camera position updating?
```

**Recovery:**
```typescript
// Fallback: Use OrbitControls from three/examples
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// In constructor
this.controls = new OrbitControls(this.camera, this.renderer.domElement);
this.controls.enableDamping = true;

// In render loop
this.controls.update();
```

---

### R8: Build Size Too Large

**Prevention (Day 1):**
```json
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: false, // Don't include in package
    rollupOptions: {
      external: ['three'], // Don't bundle three.js
    },
  },
});
```

**Detection:**
```bash
# Day 11: Check bundle size
npm pack
tar -tzf spacegraphjs-*.tgz | grep dist
gzip -c dist/spacegraphjs.js | wc -c  # Should be <100KB

# If >500KB, investigate
```

**Recovery:**
```bash
# 1. Check what's being bundled
npm run build -- --debug

# 2. Ensure three.js is external
# Check vite.config.ts has external: ['three']

# 3. Tree-shake unused code
# Use ES modules, avoid side effects

# 4. Remove console.log from production build
# terser options: { compress: { drop_console: true } }
```

---

### R9: Browser Compatibility

**Prevention (Day 5):**
```typescript
// Test in multiple browsers
// Minimum support:
// - Chrome 90+
// - Firefox 90+
// - Safari 14+
// - Edge 90+

// Add browser detection
function checkBrowserSupport(): { supported: boolean; message?: string } {
  const ua = navigator.userAgent;
  
  // Check for ES6 support
  try {
    new Function('return class Test {}')();
  } catch {
    return { supported: false, message: 'ES6 not supported' };
  }
  
  return { supported: true };
}
```

**Detection:**
```bash
# Day 5: Test in multiple browsers
# Chrome: Open demo/index.html
# Firefox: Open demo/index.html
# Safari: Open demo/index.html (if on Mac)

# Check for:
# - Rendering works
# - Controls work
# - No console errors
```

**Recovery:**
```typescript
// If Safari issues:
// Add webkit prefixes
// Check for Safari-specific WebGL issues

// If Firefox issues:
// Check for Firefox-specific WebGL limitations
// Add Firefox workarounds

// Document browser requirements in README:
// "Requires modern browser (Chrome 90+, Firefox 90+, Safari 14+, Edge 90+)"
```

---

### R10: Node.js Version Mismatch

**Prevention (Day 1):**
```json
{
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "preinstall": "node -e \"if(process.version<'v18')process.exit(1)\""
  }
}
```

**Detection:**
```bash
# npm will show warning if engines don't match
# npm WARN EBADENGINE Unsupported engine {
# npm WARN EBADENGINE   package: 'spacegraphjs@6.0.0',
# npm WARN EBADENGINE   required: { node: '>=18.0.0' },
# npm WARN EBADENGINE   current: { node: 'v16.0.0' }
```

**Recovery:**
```bash
# Document in README:
# "Requires Node.js 18 or higher"

# Provide nvm instructions:
# nvm install 18
# nvm use 18
```

---

## Pre-Launch Checklist (Comprehensive)

### Technical Verification

- [ ] **Build succeeds:** `npm run build` completes without errors
- [ ] **Types export:** `dist/types/index.d.ts` exists and is valid
- [ ] **Bundle size:** <100KB gzipped (excluding three.js)
- [ ] **Fresh install:** Works in empty directory
- [ ] **Demo renders:** 3 nodes + 3 edges visible
- [ ] **Controls work:** Rotate, zoom functional
- [ ] **No console errors:** Clean console in Chrome, Firefox
- [ ] **Memory stable:** No leaks after 10 page refreshes
- [ ] **Resize works:** Window resize handled correctly
- [ ] **WebGL check:** Graceful error if unsupported

### Documentation Verification

- [ ] **QUICKSTART tested:** Stranger can follow in <10 minutes
- [ ] **README complete:** Installation, features, links
- [ ] **LICENSE present:** MIT license file
- [ ] **TROUBLESHOOTING.md:** Common issues documented
- [ ] **TypeDoc/JSDoc:** Public APIs documented

### npm Verification

- [ ] **Package name available:** `npm view spacegraphjs` returns error
- [ ] **package.json valid:** All required fields present
- [ ] **Files correct:** Only dist/, README.md, LICENSE included
- [ ] **npm login valid:** `npm whoami` succeeds
- [ ] **Publish test:** `npm publish --tag alpha --dry-run` succeeds

### Community Verification

- [ ] **Matrix room:** #spacegraphjs:matrix.org created
- [ ] **Join link works:** https://matrix.to/#/#spacegraphjs:matrix.org
- [ ] **GitHub repo:** Public, with README
- [ ] **GitHub Sponsors:** Page created (optional)

---

## Launch Day Runbook

### T-Minus 1 Day (Final Verification)

```bash
# 1. Clean build
npm run clean && npm run build

# 2. Verify types
ls dist/types/index.d.ts

# 3. Test fresh install
rm -rf /tmp/final-test
mkdir /tmp/final-test && cd /tmp/final-test
npm install /path/to/spacegraphjs
npm install three
# Create test file, verify import works

# 4. Check bundle size
gzip -c dist/spacegraphjs.js | wc -c

# 5. Run demo one more time
# Open demo/index.html in Chrome and Firefox

# 6. npm login check
npm whoami

# 7. Prepare announcement text
# Save to launch-announcement.md
```

### Launch Day (T-0)

```bash
# 9:00 AM - Final check
npm run build

# 10:00 AM - Publish to npm
npm publish --tag alpha

# 10:05 AM - Verify on npmjs.com
# https://www.npmjs.com/package/spacegraphjs

# 10:10 AM - Test public install
mkdir /tmp/public-test && cd /tmp/public-test
npm install spacegraphjs@alpha three

# 11:00 AM - Post announcement
# GitHub Discussions
# Matrix room
# Twitter/LinkedIn (optional)

# 2:00 PM - Monitor for issues
# Watch GitHub notifications
# Monitor Matrix for bug reports

# 5:00 PM - Day 1 metrics
# npm downloads (target: 10+)
# Matrix members (target: 5+)
# GitHub stars (target: 5+)
```

### T-Plus 1 Day (Follow-up)

```bash
# Check metrics
# npm trends spacegraphjs
# GitHub Insights
# Matrix room activity

# Respond to any issues within 24 hours
# Thank early adopters
# Document any bugs found
```

---

## Emergency Rollback Procedure

### If Critical Bug Found Post-Launch

```bash
# 1. Acknowledge immediately
# Post in Matrix: "Aware of issue, investigating"

# 2. Reproduce the bug
# Document exact steps

# 3. Fix in isolated branch
git checkout -b hotfix/issue-1

# 4. Test thoroughly
# Fresh install test
# Demo test
# Edge cases

# 5. Patch release
npm version patch  # 6.0.0-alpha.1 → 6.0.0-alpha.2
npm run build
npm publish --tag alpha

# 6. Announce fix
# "Fixed in v6.0.0-alpha.2 - please update"

# 7. If bug is CRITICAL (data loss, security):
# npm deprecate spacegraphjs@6.0.0-alpha.1 "Critical bug, use alpha.2"
```

---

## Success Metrics (With Contingencies)

| Metric | Target | If Missed, Do This |
|--------|--------|-------------------|
| npm downloads (Week 1) | 50 | Post to more channels (Reddit, Dev.to) |
| Matrix members (Week 1) | 10 | Personal outreach to interested users |
| GitHub stars (Week 1) | 10 | Add star badge, mention in articles |
| Bug reports (Week 1) | 0-2 | Good! If >5, pause and fix fundamentals |
| Time to first response | <24h | Set up notifications |

---

## The Ultimate Safety Net

**If everything goes wrong:**

1. **Code doesn't work:** → Fix before launch (Days 6-7 buffer)
2. **npm publish fails:** → Fix package.json, try alternative name
3. **No adoption:** → Month 2 content marketing, improve docs
4. **Critical bug:** → Hotfix within 48 hours, transparent communication

**The project cannot fail if:**
- You ship working code (Phase A)
- You verify installation works (Days 11-12)
- You respond to issues quickly (Launch +1)

---

## Summary: Contingency Coverage

| Risk Category | Coverage |
|---------------|----------|
| Technical (R1-R10) | ✅ Prevention + Detection + Recovery |
| Documentation | ✅ Verification + Troubleshooting |
| npm Publishing | ✅ Name check + Dry run + Rollback |
| Community | ✅ Matrix setup + Response plan |
| Emergency | ✅ Hotfix procedure + Deprecation |

---

## Start Now

```bash
# Read this contingency plan (done)
cat PLAN/CONTINGENCY-PLAN.md

# Review before launch day
# Keep open during Phase A and Phase B

# If any risk materializes:
# 1. Don't panic
# 2. Find the risk in this document
# 3. Follow the recovery procedure
```

---

**This plan ensures total success regardless of obstacles.**

**Every risk has prevention, detection, and recovery.**

**Build first. Launch second. Ship when it works.** 🚀
