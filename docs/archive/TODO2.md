SpaceGraphJS — Roadmap Extension: Rendering, Vision AI, Hardware, Ecosystem

This document extends TODO.md (Phases 0, 1, 2.1, 4.4) with four new phases:
Phase R (GPU Rendering), Phase V (Vision AI), Phase H (Hardware), Phase E (Ecosystem).
TODO.md tasks remain the immediate priority. These phases follow sequentially.

---
Phase R — GPU Rendering Overhaul
Objective: 60 FPS at 1000+ nodes. No DOM. No individual meshes.
Prerequisite: Phase 1 of TODO.md complete.

The current renderer creates one Three.js Object3D per node. At 1000 nodes this
means 1000 draw calls per frame. The fix is instancing: one draw call for all
nodes of the same geometry family.

R.1 — InstancedMesh Node Renderer

File: src/core/Renderer.ts + new src/rendering/InstancedNodeRenderer.ts

Replace per-node mesh creation with a pool of THREE.InstancedMesh objects, one
per geometry family (box, sphere, cylinder, plane, custom). Node positions,
scales, and colors are written into the InstancedMesh instance matrix and color
buffers each frame.

Design:
- InstancedNodeRenderer maintains a Map<GeometryFamily, THREE.InstancedMesh>
- On node:added, assign the node an instance slot in the appropriate mesh
- Each frame, iterate nodes and write position/rotation/scale into
  mesh.setMatrixAt(slot, matrix) and mesh.setColorAt(slot, color)
- Call mesh.instanceMatrix.needsUpdate = true once per family per frame
- On node:removed, mark the slot free and compact on next frame if >20% vacant

This is the single highest-leverage change in the entire roadmap. Expected
result: 10x reduction in draw calls. 1000 nodes should be trivial; target 5000.

Node types that require HTML overlay (HtmlNode, IFrameNode, CodeEditorNode) are
exempt and remain DOM-based CSS3DObject elements. All geometry-only node types
(ShapeNode, NoteNode, TextMeshNode, GlobeNode, etc.) move to instanced rendering.

R.2 — Texture Atlas for Node Labels/Icons

File: src/rendering/TextureAtlas.ts (new)

Node labels currently create one THREE.CanvasTexture per node. At 500 nodes
this is 500 GPU textures. Pack all label textures into a single 4096x4096 atlas
using a shelf-packing algorithm. UV coordinates per instance are written into a
custom attribute buffer.

Implementation sketch:
  const atlas = new TextureAtlas(4096);
  const uv = atlas.pack(labelCanvas);  // returns {u, v, w, h} in [0,1] space
  // write uv into per-instance attribute buffer

Use a dirty flag: only re-pack when labels change. Most frames the atlas is
static.

R.3 — Three-Method Public API Audit

The public API must fit in a developer's working memory. Target: ≤10 methods
before you need to read docs.

  import { SpaceGraph } from 'spacegraphjs';

  // Create
  const sg = await SpaceGraph.create('#root', spec);
  const sg = await SpaceGraph.quick('#root', nodes, edges);
  const sg = await SpaceGraph.fromURL('#root', url);
  const sg = await SpaceGraph.fromManifest('#root', origin);

  // Mutate
  sg.addNode(spec)
  sg.removeNode(id)
  sg.addEdge(spec)
  sg.removeEdge(id)
  sg.update(patch)

  // Observe
  sg.on(event, handler)
  sg.off(event, handler)

  // Lifecycle
  sg.dispose()

Everything else (layout switching, physics tuning, vision) goes through
sg.plugins.get('PhysicsPlugin') or similar. The top-level API stays clean.

R.4 — Physics Defaults: Breathe on First Render

File: src/plugins/PhysicsPlugin.ts

When no layout is specified, the graph should look like an organic neural
network on load. Current defaults are too stiff and require manual tuning.

Changes:
- repulsionStrength default: 300 → 800
- springLength default: 80 → 150
- damping default: 0.9 → 0.85 (slightly less friction = more fluid motion)
- enabled default: false → true (already noted in TODO.md 1.1, confirm here)
- Add a "settle" animation: on graph:ready, run physics for 2 seconds at 3x
  speed (timeStep multiplier), then return to 1x. Nodes reach equilibrium
  before the user sees them instead of visibly flying around on load.

Success criteria: A 50-node graph with random initial positions should look
naturally spread out within 2 seconds of loading, without any manual fitView()
or layout call from the developer.

---
Phase V — Vision AI: Quantized, In-Browser, Self-Correcting
Objective: The 30-second autonomous layout correction loop. No server required.
Prerequisite: Phase R complete, TODO.md Phase 1.4 (Vision cleanup) complete.

V.1 — WebNN ONNX Runtime Integration

File: src/vision/OnnxRuntime.ts (new)

Current VisionManager has ONNX paths that are try/catch guarded and silently
fail because no models are bundled. This task makes the ONNX path real.

Use onnxruntime-web with WebNN execution provider as primary, WebGL as fallback:

  import * as ort from 'onnxruntime-web';
  ort.env.wasm.numThreads = 1;  // avoid SharedArrayBuffer requirement

  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['webnn', 'webgl', 'wasm'],
    graphOptimizationLevel: 'all',
  });

Model loading is lazy: only load a model when the corresponding analysis type
is first requested. Cache sessions in a Map<ModelName, InferenceSession>.

V.2 — Quantized Model Pipeline

The 6 vision models (LQ-Net, TLA, CHE, ODN, VHS, EQA) do not need float32
precision for layout quality judgements. Convert all models to int8 via ONNX
quantization:

  python -m onnxruntime.quantization.quantize \
    --model model_fp32.onnx \
    --output model_int8.onnx \
    --quant_type IntegerOps

Expected size reduction: ~4x. A model that was 40MB becomes ~10MB. With lazy
loading and browser caching, the user only downloads models they trigger.

Target model sizes (post-quantization):
  ODN (overlap detection):    <5MB   — runs on every vision check
  VHS (visual hierarchy):     <8MB   — runs on layout evaluation
  EQA (ergonomics):           <8MB   — runs on layout evaluation
  TLA (text legibility):      <5MB   — runs on contrast check
  CHE (color harmony):        <5MB   — runs on palette check
  LQ-Net (layout quality):    <10MB  — runs on full quality audit

Host models at a CDN (jsdelivr or equivalent). Never bundle in the ppnpm package.

V.3 — Evolutionary Layout Optimizer

File: src/vision/LayoutOptimizer.ts (new)

After the basic physics simulation converges, run an evolutionary pass:

Algorithm:
1. Take a screenshot via sg.exportPNG() (requires Phase R + preserveDrawingBuffer)
2. Run VHS + EQA models on the screenshot → score ∈ [0, 1]
3. Generate N=8 candidate parameter mutations (springLength ±10%, repulsion ±15%)
4. For each candidate: apply params, run physics for 0.5s, screenshot, score
5. Keep the highest-scoring candidate
6. Repeat for up to 5 generations or until score > 0.85
7. Emit layout:optimized event with final score and generation count

This is not gradient descent in the strict sense — it's a (1+λ) evolution
strategy with the vision models as the fitness function. Simple, no backprop,
works on any differentiable-or-not layout parameter.

Expose as: sg.vision.optimizeLayout(options?: { generations?: number, target?: number })

V.4 — Developer Experience: Natural Language Layout

File: src/plugins/AIPlugin.ts (new)

Wire an optional AI backend (OpenAI-compatible API) that accepts a text prompt
and produces a NodeSpec[]:

  sg.ai.generate('Make me a dashboard for my Kubernetes clusters')

Implementation:
1. Send prompt + current graph schema to LLM
2. LLM returns NodeSpec[] JSON
3. sg.loadSpec() loads the result
4. sg.vision.optimizeLayout() runs automatically
5. Resolve the promise with the final graph

The AI plugin is optional and only activates when sg.options.aiEndpoint is set.
No AI dependency in the core package. The plugin is in packages/ai-plugin/.

---
Phase H — Hardware: SpaceGraph Mini & SpaceGraphOS
Objective: A dedicated spatial computing appliance. No paper-prison OS.
Prerequisite: Phase V complete. This is a multi-month track.

H.1 — Hardware Target Specification

  SpaceGraph Mini
  SoC:        Rockchip RK3588
  RAM:        32GB LPDDR5
  Storage:    256GB NVMe
  NPU:        6 TOPS × 2 (12 TOPS total, RKNPU2)
  GPU:        Mali-G610 MP4
  Display:    HDMI 2.1 (4K@60fps) + DisplayPort 1.4
  Networking: 2.5GbE + WiFi 6 + BT 5.0
  Target BOM: <$180 (retail $249)

Reference boards to evaluate: Orange Pi 5 Max, Rock 5B, Radxa ROCK 5C.
All are available now. Choose based on Linux kernel maturity and NPU driver
quality. The Orange Pi 5 Max currently has the most stable Rockchip BSP.

H.2 — SpaceGraphOS: Kiosk Linux

Approach: Do NOT write an OS. Take Arch Linux ARM or Alpine Linux, strip to
minimum, and boot directly into a full-screen Chromium/electron-based WebGL
context. This is the kiosk pattern used by every embedded display product.

Build recipe:
1. Minimal Arch ARM rootfs (pacstrap with base, linux-rockchip, firmware)
2. No X11, no Wayland, no display manager
3. Install: chromium-browser-stable + matching GPU drivers (panfrost or mali)
4. /etc/systemd/system/spacegraph.service → ExecStart=chromium --kiosk --app=...
5. Chromium --use-gl=egl --enable-webgl --ignore-gpu-blocklist
6. Boot time target: <15 seconds from power-on to rendered graph

The OS is a build script + a systemd unit file. It is not a fork. Total custom
code: ~200 lines of shell + a systemd service. Resist the urge to do more.

H.3 — RKNPU2 Vision Model Offloading

File: packages/spacegraph-native/src/NpuBridge.ts (new)

The 6 vision models currently target ONNX Web (CPU/WebGL). On the RK3588, we
want them on the 12 TOPS NPU for sub-10ms inference.

Path:
1. Convert ONNX int8 models to RKNN format using rknn-toolkit2:
     rknn-toolkit2 convert --model model_int8.onnx --output model.rknn
2. Run inference via RKNPU2 C API, wrapped in a Node.js native addon
3. The native addon exposes the same interface as the ONNX Web sessions:
     npu.runInference(modelName, inputTensor) → Float32Array
4. VisionManager detects the native addon at runtime and routes to it:
     const runner = typeof NpuBridge !== 'undefined' ? NpuBridge : OnnxRuntime;

The web version and the native version share identical vision logic. Only the
inference backend differs.

H.4 — Bill of Materials and Licensing

Software licenses:
  spacegraphjs (core):     MIT
  packages/ai-plugin:      MIT
  packages/zui-server:     MIT
  SpaceGraphOS build:      GPL-2.0 (follows Linux kernel)

Hardware:
  SpaceGraph Mini schematics, PCB, BOM: CERN-OHL-S v2 (strong copyleft)
  This ensures derivative hardware must also be open.

---
Phase E — Ecosystem: Trojan Horses and Framework Bridges
Objective: Viral adoption. Developers encounter SpaceGraph inside tools they
already use.
Prerequisite: TODO.md Phase 4.4 (ZUI Standard) complete.

E.1 — The File System Visualizer (Demo / Trojan Horse)

File: packages/demos/fs-explorer/

A single-file Node.js script that:
1. Walks a directory tree (using fs.walk or glob)
2. Emits a ZUI manifest (Phase 4.4 format) as a local HTTP server
3. Opens a browser tab pointing at a SpaceGraph shell loaded from CDN
4. The graph renders immediately: files as nodes, directories as GroupNodes,
   imports/requires as edges (parsed via acorn or @babel/parser for JS/TS)

Usage:
  pnpm dlx spacegraph-explore ./my-project

The script itself is <300 lines. The visual result is a navigable 3D
constellation of the user's codebase. When a developer sees their own project
visualized this way for the first time, they will share it.

Also provide:
  pnpm dlx spacegraph-explore --github owner/repo
  (clones to /tmp, then runs the same pipeline)

E.2 — React Wrapper

File: packages/react-spacegraph/src/SpaceGraphCanvas.tsx

  import { SpaceGraphCanvas } from '@spacegraph/react';

  <SpaceGraphCanvas
    nodes={nodes}
    edges={edges}
    onNodeClick={(node) => ...}
    style={{ width: '100%', height: '600px' }}
  />

Implementation:
- useRef for container div
- useEffect creates SpaceGraph instance on mount, disposes on unmount
- useMemo(spec, [nodes, edges]) — only re-create spec object when data changes
- When nodes/edges props change, call sg.update(patch) instead of recreating
- Forward sg instance via ref: <SpaceGraphCanvas ref={sgRef} /> → sgRef.current is the SpaceGraph instance

The wrapper is intentionally thin. It does not abstract SpaceGraph's event
system or plugin API. It just manages lifecycle. Advanced usage goes through
sgRef.current directly.

E.3 — Vue Wrapper

File: packages/vue-spacegraph/src/SpaceGraphCanvas.vue

Same design as React wrapper, adapted to Vue 3 Composition API:
- onMounted / onUnmounted for lifecycle
- watch(props.nodes, ...) for reactive updates
- defineExpose({ sg }) for parent access to the instance

E.4 — GitHub Repository Connector

File: packages/zui-github/src/index.ts

Implements the ZUI manifest spec (Phase 4.4) backed by the GitHub API:

  import { zuiGitHub } from '@spacegraph/zui-github';
  app.use(zuiGitHub({ repo: 'owner/repo', token: process.env.GITHUB_TOKEN }));

Graphs to offer (selectable via query param ?view=):
  - dependency: package.json dependencies as nodes, requires as edges
  - prs: open PRs as nodes, review relationships as edges
  - issues: issues as nodes, labels as GroupNodes, assignees as edges
  - contributors: contributor graph by file ownership (via git log)

Each view is <100 lines of data transformation + ZUI manifest emission.

E.5 — Kubernetes Connector

File: packages/zui-k8s/src/index.ts

  import { zuiK8s } from '@spacegraph/zui-k8s';
  app.use(zuiK8s({ kubeconfig: '~/.kube/config' }));

Node types mapped:
  Deployment → ShapeNode (box)
  Pod → ShapeNode (sphere, colored by status: green/yellow/red)
  Service → ShapeNode (cylinder)
  Namespace → GroupNode
  Ingress → ShapeNode with external edge annotation

Stream mode: watch the k8s API and push SSE updates to the ZUI stream endpoint.
Pod restarts and status changes appear in real-time on the graph.

---
Delivery Sequencing

These phases follow the TODO.md delivery schedule (8 weeks baseline).

Week 9:   Phase R.1 (InstancedMesh renderer) — hardest task in this doc
Week 10:  Phase R.2 (texture atlas) + R.4 (physics defaults)
Week 11:  Phase R.3 (API audit) + V.1 (WebNN ONNX integration)
Week 12:  Phase V.2 (quantized models) + V.3 (evolutionary optimizer)
Week 13:  Phase V.4 (AI plugin) + E.2 (React wrapper)
Week 14:  Phase E.1 (fs-explorer demo) + E.3 (Vue wrapper)
Week 15:  Phase E.4 (GitHub connector) + E.5 (k8s connector)
Week 16:  Phase H.1-H.2 spec finalization + board selection
Ongoing:  Phase H.3-H.4 (NPU offloading, hardware build) — parallel track

---
Success Criteria

Phase R: Lighthouse performance score >90 on the kitchen sink demo page.
         Chrome DevTools shows ≤20 draw calls for a 500-node graph.
         No frame drops below 60fps on a mid-range laptop GPU.

Phase V: sg.vision.optimizeLayout() improves VHS score by >0.1 on a
         deliberately ugly random-layout graph.
         All 6 models load and run without throwing in Chrome and Firefox.
         Total model download on first vision check: <30MB.

Phase H: Boot-to-graph in <15 seconds on RK3588 hardware.
         NPU inference latency <10ms per vision model per frame.
         CPU temperature <40°C under sustained vision loop.

Phase E: pnpm dlx spacegraph-explore runs without global install on Node 18+.
         React wrapper passes react-hooks exhaustive-deps lint with zero warnings.
         GitHub connector renders the spacegraphjs repo's own dependency graph correctly.
