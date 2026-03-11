# SpaceGraphJS — Software Roadmap

> **The First Self-Building UI Framework**: AI that sees what it builds, verifies quality autonomously, and self-corrects in 30 seconds.

---

## Current Status

The library is **Alpha quality**. The core rendering engine, all node/edge types, and the Vision AI loop are implemented. We are in the **Developer Experience** hardening phase before a stable `1.0` release.

```
npm install spacegraphjs three
```

---

## Architecture Overview

SpaceGraphJS is a layered graph rendering framework built on Three.js. Each layer is independently extensible via plugins.

```
┌─────────────────────────────────────────────────────┐
│            SpaceGraph Application Layer              │
│     (HTML/TS entry point, spec-driven API)          │
├─────────────────────────────────────────────────────┤
│              Plugin Manager                          │
│  Layout ─ Physics ─ Color ─ Vision ─ Interaction    │
├─────────────────────────────────────────────────────┤
│             Core Engine                              │
│  Graph ─ Renderer ─ Camera ─ Events ─ Culling       │
├─────────────────────────────────────────────────────┤
│         THREE.js / WebGL / ONNX Runtime Web          │
└─────────────────────────────────────────────────────┘
```

### What's Implemented ✅

**Node Types (19):** ShapeNode, HtmlNode, InstancedShapeNode, ImageNode, GroupNode, NoteNode, CanvasNode, TextMeshNode, DataNode, VideoNode, IFrameNode, ChartNode, MarkdownNode, GlobeNode, SceneNode, AudioNode, MathNode, + 2 more

**Edge Types (8):** Edge, CurvedEdge, FlowEdge, LabeledEdge, DottedEdge, DynamicThicknessEdge, AnimatedEdge, BundledEdge

**Layout Plugins (10):** ForceLayout, GridLayout, CircularLayout, HierarchicalLayout, RadialLayout, TreeLayout, SpectralLayout, GeoLayout, TimelineLayout, ClusterLayout

**Core Plugins (4):** InteractionPlugin, LODPlugin, AutoLayoutPlugin, AutoColorPlugin

**Extended Plugins (4):** PhysicsPlugin, MinimapPlugin, ErgonomicsPlugin, VisionOverlayPlugin

**Vision System (5 modules):**
- `VisionManager` — ONNX model inference for layout quality (LQ-Net), overlap detection (ODN), text legibility (TLA), color harmony (CHE), visual hierarchy (VHS), ergonomics (EQA)
- `VisionOverlayPlugin` — Live UI overlay with quality scores + "Auto-Fix" button
- `analyzer.ts` — Playwright-based build analysis for Vite integration
- `assert.ts` — Playwright test assertions (`visionAssert.noOverlap()`, `.isLegible()`, `.expectedLayoutScore()`)
- `plugin.ts` — Vite plugin stub (`spacegraphVision()`)

**CLI & Tooling:**
- `packages/create-spacegraph/` — `npx sg6 create my-app` scaffolder
- `packages/cli/` — `sg6 fix` interactive auto-fix tool

**DX & Docs:**
- `QUICKSTART.md`, `CONTRIBUTING.md`, `docs/vision-plugin.md`
- `typedoc.json` — `npm run docs` generates API reference (output gitignored)
- 9 live examples in `examples/`
- 75 passing unit tests + 1 Playwright vision E2E test

---

## Near-Term: Hardening for `1.0` Release

These are sequenced software tasks ordered by priority. **P0** blocks release; **P1** ships with release; **P2** is post-release.

### P0 — Must ship before `1.0`

| Task | Description | Key Files |
|------|-------------|-----------|
| **Real ONNX weights for vision models** | Replace dummy `.onnx` files with trained models covering layout, overlap, legibility. Currently `generate_dummy_vision.py` creates placeholder weights. | `train_vision_models.py`, `public/*.onnx` |
| **Bundle size audit** | Ensure `spacegraphjs.js` ships without bundling optional heavyweights (KaTeX, Chart.js) by default. Use tree-shaking and dynamic imports. | `vite.config.ts`, `src/index.ts` |
| **API stability pass** | Review all public APIs for naming consistency, deprecate any alpha-era names, document breaking changes in `CHANGELOG.md`. | `src/types.ts`, `src/index.ts` |
| **Error handling** | All `SpaceGraph.create()` and plugin `.init()` paths must surface actionable errors, not silent failures or stack traces. | `SpaceGraph.ts`, `PluginManager.ts` |
| **CI vision gate** | GitHub Actions pipeline must run `npm run test:vision` and fail the build if visual regression is detected. | `.github/workflows/` |

### P1 — Ships with `1.0`

| Task | Description | Key Files |
|------|-------------|-----------|
| **Fractal LOD zooming** | Nodes that are themselves graphs (sub-graphs). When camera zooms sufficiently close, a `GroupNode` seamlessly reveals its children as a nested graph. This is the core primitive for SpaceGraphOS. | `src/nodes/GroupNode.ts`, `LODPlugin.ts` |
| **Semantic edge navigation** | Double-clicking an edge smoothly navigates the camera across the connection to the target node, establishing spatial traversal as the primary navigation model. | `InteractionPlugin.ts`, `CameraControls.ts` |
| **Viewport serialization** | `sg.export()` and `SpaceGraph.import()` — serialize graph state (positions, node data, plugin config) to JSON for save/restore and sharing. | `SpaceGraph.ts`, `src/core/` |
| **Performance benchmark suite** | Formal benchmark: 60 FPS at 1,000 nodes, <200KB bundle, <30s time-to-first-render. Run in CI on every release. | `verification/`, `.github/workflows/` |
| **Inter-graph edges** | Edges that connect nodes in different `SpaceGraph` instances (multi-canvas layout), required for compositional ZUI views. | `src/edges/Edge.ts`, `Graph.ts` |
| **CONTRIBUTING.md polish** | Add `good-first-issue` guide with links to specific `src/nodes/` files. Add setup guide for ONNX model training. | `CONTRIBUTING.md` |

### P2 — Post-`1.0`

| Task | Description | Notes |
|------|-------------|-------|
| **Vision model training pipeline** | Full `train_vision_models.py` → `.onnx` pipeline with CI. Requires labeled layout corpus. | Research track |
| **React / Vue adapters** | `@spacegraphjs/react` and `@spacegraphjs/vue` for framework integration. Use framework-agnostic core. | Community driven |
| **Open VSX extension** | Editor integration for syntax highlighting of `.sgraph` spec files. | After demand confirmed |
| **SpaceGraphOS compositor** | Wayland-based compositor rendering the entire Linux OS as a SpaceGraph, using `VisionManager` for system health overlay. | Long-term (hardware required) |

---

## Medium-Term: SpaceGraphOS Vision

SpaceGraphJS is the **graphics primitive** for a larger GUI revolution.

### Fractal Zooming User Interface (FZUI)
Standard ZUIs translate the camera. A **Fractal ZUI** traverses semantic edges.
- Zoom → document node becomes an editable canvas at that zoom level
- Zoom out → it becomes a node in the project graph again
- Navigate by zooming, not clicking application icons

### SpaceGraphOS Stack
```
SpaceGraphJS Applications (files, apps, processes — all nodes)
          ↓
SpaceGraph Compositor (Wayland-based, entire OS is a graph)
          ↓
Vision Acceleration Layer (NPU-accelerated ONNX inference, <50ms)
          ↓
Linux Base (Buildroot/Alpine, <500MB rootfs)
          ↓
RK3588 Hardware (8-core ARM, 6 TOPS NPU, Mali-G610 GPU)
```

See `PLAN/SPACEGRAPH_OS.md` for the full architectural vision.

---

## What NOT To Build (Deferred/Rejected)

| Item | Reason |
|------|--------|
| Docker image | It's a library, not a service |
| Self-hosted CDN / Verdaccio | npm/unpkg suffice |
| Vercel / Netlify / CodeSandbox integrations | Proprietary silos |
| IPFS distribution | Ideological, low practical impact |
| Nix flake | Too niche, blocks nothing |

---

## Release Checklist

```bash
# Before tagging a release:
npm run lint
npm run format:check
npm run build          # zero errors
npm run test           # 75+ tests passing
npm run test:vision    # Playwright vision gate passes
npm run docs           # TypeDoc generates cleanly (output gitignored)
npm pack --dry-run     # verify package contents
```

---

## Document Map

| For... | Read... |
|--------|---------|
| Vision & philosophy | `README.md` |
| Software roadmap (this) | `ROADMAP.md` |
| Fractal ZUI & OS architecture | `PLAN/SPACEGRAPH_OS.md` |
| API reference | `npm run docs` → `docs/api/index.html` |
| Getting started | `QUICKSTART.md` |
| Contributing | `CONTRIBUTING.md` |
| Hardware & sustainability | `PLAN/PHASE-5-SUSTAINABILITY.md` |
| Research program | `PLAN/RESEARCH.md` |
| Growth & community | `PLAN/GROWTH.md` |
| Risk register | `PLAN/RISKS.md` |
