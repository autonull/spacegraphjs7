# SpaceGraphJS — Redemption Plan

**Status:** The library has a real, functional WebGL core (52 exported classes, 32 working demos) but is shipwrecked: no source files, no build system, placeholder AI models, and a generic visual identity. The Java/C++ ancestors had a genuine retro aesthetic—Hershey vector fonts, 16-segment displays, demoscene shaders, XOR cursors, physics sandboxes. That soul was lost in translation to JavaScript.

This plan recovers it.

---

## Phase 0: Truth & Recovery (Week 1)

### 0.1 Capture the Ghosts — screenshots/video of legacy versions

The old codebases can actually build. `spacegraphc` has all dependencies installed (GL, GLU, GLUT, FTGL, SDL) and `spacegraphj` has precompiled `.class` files. We need visuals before we design.

- [ ] **Build spacegraphc** — `make -j4` in `spacegraphc/` should produce a binary. Run under `Xvfb :99`, capture screenshots of every demo/widget
- [ ] **Run spacegraphj prebuilt classes** — assemble classpath from `target/` directories and JOGL 2.5.0, try running test classes under Xvfb
- [ ] **Try spacegraph1 build** — `ant` in `spacegraph1/` with `JAVA_HOME` set to JDK 17
- [ ] **Video capture** — use `ffmpeg -f x11grab` against Xvfb to record interactive sessions
- [ ] **Extract color palettes** — from legacy Java source code (spacegraph1 `Color.java` grays, spacegraphj bipolar red/green, neon shader colors)
- [ ] **Extract font specimens** — render the Hershey vector fonts (futural, times roman, gothic, script, cursive) from spacegraphj's `.jhf` files
- [ ] **Catalog every GLSL shader** — `16seg.glsl`, `bitmapfont.glsl`, `bitmapfont2.glsl`, `metablob.glsl`, `grid.glsl` from spacegraphj — these are the aesthetic DNA

### 0.2 Restore Source Continuity

- [ ] **Reconstruct working directory** — find the original source (git reflog, remote branches, stash) that produced `dist/spacegraphjs.js`
- [ ] **Create root `package.json`** with proper scripts: `dev`, `build`, `test`, `start:demo`
- [ ] **Create `vite.config.ts`** matching the dist build profile
- [ ] **Create `tsconfig.json`** with strict mode
- [ ] **Verify the library rebuilds** from source and produces identical output to existing `dist/`

---

## Phase 1: Retro Aesthetic (Weeks 2-4)

The modern library uses plain Three.js primitives with no visual personality. The legacy versions had character. Port that character forward.

### 1.1 Retro Theme (CSS-Driven, Approximate)

Don't port GLSL shaders or Hershey font parsers. Achieve the feel through CSS and Three.js material tuning:

- [ ] **RetroTheme CSS preset** — dark background (`#000` or `#111`), monospace or system-ui font, low-saturation gray palette with neon accent colors (cyan, green, amber)
- [ ] **Post-processing overlay** — CSS `filter: contrast(1.05) saturate(0.8) brightness(0.9)` on the canvas container for a muted CRT-ish feel; optional scanline CSS overlay (`repeating-linear-gradient`)
- [ ] **Panel styling** — semi-transparent dark backgrounds (`rgba(0,0,0,0.75)`) with thin bright border (`1px solid rgba(255,255,255,0.3)`) matching spacegraphc's HUD panels
- [ ] **Cursor** — CSS `crosshair` cursor by default; optional hexagonal crosshair via CSS `clip-path` on a custom cursor element
- [ ] **Color palette** — port spacegraph1's extended gray scale (`GrayMinusMinus` through `GrayPlusPlusPlus`) as CSS custom properties; add neon accent palette for highlights
- [ ] **Bipolar color scheme** — red/green for data visualization (from spacegraphj Plot2D)
- [ ] **Font** — use `font-family: monospace` or load a single retro bitmap font via `@font-face` (e.g., "Press Start 2P" or similar from Google Fonts); no Hershey vector parsing needed

### 1.2 Color Systems

- [ ] **Port spacegraph1 gray scale** — the `Color.GrayPlusPlus` (0.7), `Color.GrayMinusMinus` (0.3) etc. palette maps directly to a design token system
- [ ] **Port bipolar color scheme** from spacegraphj `Plot2D` — red for negative, green for positive, used for data visualization widgets
- [ ] **Port HSV/HSL color math** from spacegraphj for dynamic palette generation
- [ ] **Color-blind simulation overlays** — the legacy CHE model placeholder should at minimum have real CSS-based color blindness filters (protanopia, deuteranopia, tritanopia)

### 1.3 Post-Processing

- [ ] **Bloom / glow** — CSS `box-shadow` and `filter: drop-shadow()` for glow on accent elements; avoids Three.js post-processing pipeline complexity
- [ ] **Scanline overlay** — optional: one CSS pseudo-element with `repeating-linear-gradient`. Toggleable, zero runtime cost when off

---

## Phase 2: Make the Vision System Real (Weeks 5-8)

The ONNX model files are ~1.8-4.3 KB each — trivially small. They cannot contain real neural network weights. The vision pipeline code (Vite plugin, analyzer, test assertions) is structurally complete but drives placeholder models.

### 2.1 Hard Truth

- [ ] **Validate ONNX files** — confirm they parse and measure actual parameters. They are almost certainly stubs (1.8-4.3KB cannot contain real neural net weights). Document what they are
- [ ] **Deprecate ONNX runtime from critical path** — the 24MB WASM binary should not block the "vision" feature from working. Make onnxruntime-web an optional import, not a dependency

### 2.2 The Real Vision System (CSS/DOM-based, no ML needed)

Most claimed vision checks don't require neural networks. Replace stubs with working deterministic code:

- [ ] **Overlap detection** — `getBoundingClientRect()` intersection math. Exact, fast, zero deps
- [ ] **Contrast checking** — WCAG 2.1 `(L1 + 0.05) / (L2 + 0.05)` on computed styles. Exact
- [ ] **Font size legibility** — `window.getComputedStyle()` pixel measurement vs threshold
- [ ] **Color harmony** — Itten color wheel rules as deterministic functions (~20 lines each)
- [ ] **Visual ergonomics** — Fitts's Law from element positions/sizes. Pure math

That's it. Six functions, zero ML, all work immediately, all give exact answers.

### 2.3 Integrate Vision into UI

- [ ] **Vision panel** — a collapsible overlay showing live scores for the current graph. Styled with the retro theme (dark bg, monospace, thin borders)

---

## Phase 3: Fill the Structural Gaps (Weeks 2-8, parallel)

### 3.1 Build System

- [ ] **Root `package.json`** with scripts: `dev`, `build`, `test`, `lint`, `demo`
- [ ] **`vite.config.ts`** with lib mode and demo mode
- [ ] **`tsconfig.json`** — `strict: true`, paths for `@spacegraphjs/*`
- [ ] **ESLint + Prettier** config
- [ ] **`vitest.config.ts`** with coverage
- [ ] **`playwright.config.ts`** for E2E

### 3.2 Source Restoration

- [ ] **Re-export all core classes** — verify the 52 exports from `dist/spacegraphjs.js` have corresponding TypeScript sources
- [ ] **Type declarations** — generate `.d.ts` for all public API surfaces
- [ ] **Node types** — 24+ node types from dist must have source implementations (ShapeNode, HtmlNode, ImageNode, etc.)
- [ ] **Edge types** — 8 edge types from dist need source (Edge, CurvedEdge, FlowEdge, etc.)
- [ ] **Layout engines** — 10+ layout engines from dist need source

### 3.3 Framework Bindings

- [ ] **React package** — currently 964 bytes, basically a re-export. Needs real hooks: `useSpaceGraph()`, `useNode()`, `useEdge()`
- [ ] **Solid package** — same, needs `createSpaceGraphSignal()` etc.
- [ ] **Vue package** — doesn't even have a `dist/`. Build it.
- [ ] **Create framework interop tests** — render a node in each framework, verify it works

### 3.4 n8n Bridge

- [ ] **Audit `packages/n8n-bridge/dist/`** — 78 KB is substantial. Document what nodes it provides and verify they deploy
- [ ] **Add retro-styled n8n nodes** — the bridge should feel like the rest of the system

### 3.5 Testing

- [ ] **Unit tests for all 52 exports** — verify they instantiate without error
- [ ] **Rendering tests** — verify Three.js scene has expected object counts
- [ ] **Visual regression tests** — baseline screenshots, then compare after changes
- [ ] **Legacy comparison tests** — render same graph in retro style and "modern" style, measure FPS

---

## Phase 4: The Demos (Weeks 4-6)

The current demo page has 32 entries but they all look like generic Three.js.

- [ ] **Create "Retro" demo mode** — toggleable theme that applies Hershey fonts, dark backgrounds, neon accents, XOR cursors, scanline overlay
- [ ] **Rewrite `basic.ts` demo** in retro style — 3 nodes with Hershey vector labels, dark background, neon edge lines
- [ ] **Rewrite `fractal.ts` demo** — tree structure rendered with 16-segment display counters, metaball background
- [ ] **Create "Legacy Comparison" demo** — side-by-side: generic Three.js rendering vs retro-styled rendering
- [ ] **Create "Vision HUD" demo** — live vision analysis displayed on a retro panel (overlap scores, contrast ratios, hierarchy score)

---

## Phase 5: The CLI & Developer Experience (Weeks 6-8)

- [ ] **Audit `packages/cli/dist/bin/sg6.js`** — what does it do? Dev server? Scaffold?
- [ ] **Add `sg6 init --retro`** — scaffold a new project with retro aesthetic presets
- [ ] **Add `sg6 vision`** — run vision analysis from CLI, output report in terminal with retro-styled ASCII tables
- [ ] **Add `sg6 capture`** — take a screenshot of a spacegraph and run vision analysis on it

---

## Phase 6: Hardening & Launch (Weeks 8-12)

### 6.1 What to Cut

The following are aspirational and should be deprioritized until the core is solid:

- [ ] **SpaceGraph Mini hardware** — cut entirely. Not happening
- [ ] **Academic papers** — cut entirely. No user studies, no CHI submissions. Ship product
- [ ] **ONNX models / vision ML** — cut from critical path. CSS/DOM analysis replaces them
- [ ] **Monaco editor, KaTeX, Chart.js** — make optional plugins, not bundled deps. They bloat the demo

### 6.2 Quality Bar

- [ ] **No console errors** in Chrome, Firefox, Safari (for all demos)
- [ ] **60 FPS at 500 nodes** on a mid-range laptop
- [ ] **Bundle < 100 KB gzipped** for core library (exclude Three.js from this measurement)
- [ ] **< 30 seconds** from `npm install` to first rendered graph
- [ ] **All 52 exports are tested**

### 6.3 Launch

- [ ] `npm publish spacegraphjs@0.1.0-retro`
- [ ] GitHub release with screenshots comparing retro aesthetic vs generic
- [ ] Minimal landing page showing the 16-segment display and Hershey fonts
- [ ] Blog post: "How We Brought a Demoscene Aesthetic to WebGL Graph Visualization"

---

## Success Criteria

| Criterion | How to Verify |
|-----------|--------------|
| Legacy screenshots exist | `screenshots/` directory with spacegraphc + spacegraphj captures |
| RetroTheme produces visibly different output from generic | Side-by-side screenshot comparison |
| CSS-based vision checks report real numbers | Run on a demo, get overlap percentage > 0 |
| Library rebuilds from source | `npm run build` produces working dist/ |
| All 32 demos render in retro style | Manual demo walkthrough |
| Bundle size under 100 KB (core) | `gzip dist/spacegraphjs.js \| wc -c` |
| No ONNX placeholder models in core | Remove them from the critical path; make opt-in |

---

## Principles

1. **Retro feel via CSS, not shaders.** The aesthetic comes from color, font, spacing, and overlay effects — all doable in CSS. No GLSL porting needed.
2. **CSS/DOM analysis > ONNX placeholders.** Working simple code beats broken complex code every time.
3. **Ship what exists, fix what doesn't.** The library works. The demos work. Build on that.
4. **Source code must be present.** No more compiled-only artifacts. The project must be rebuildable from `git clone`.
