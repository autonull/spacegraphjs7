  SpaceGraphJS — Complete Implementation Plan: Phases 0, 1, 2.1, 4.4                                                                                      
                                                                                                                                                          
  Ground Truth: What's Actually Missing                                                                                                                   
                                                                                                                                                          
  Before planning, correct the record from the initial analysis:                                                                                          
                                                                                                                                                          
  Already implemented (contrary to earlier assumptions):                                                                                                  
  - graph.toJSON() and graph.fromJSON() — present in Graph.ts:235-286
  - SpaceGraph.fromURL() — present in SpaceGraph.ts:415-444                                                                                               
  - SpaceGraph.import() — present in SpaceGraph.ts:388-410  
  - PhysicsPlugin springs + repulsion — actually implemented, not just stubbed. The comment at the top was misleading. The _step() method has Verlet,     
  springs, and O(n²) repulsion.                                                                                                                           
  - VisionManager heuristics — real WCAG contrast checking and BVH-based overlap detection runs without ONNX models. ONNX is an optional override layer.  
                                                                                                                                                          
  Actually missing:                                                                                                                                       
  1. SpaceGraph.create() async race — returns a half-initialized instance; callers can't await it                                                         
  2. node.type property — Graph.toJSON() accesses node.type but the base Node class (Node.ts:8-27) never defines it; only node.constructor.name is        
  reliable                                                                                                                                                
  3. sg.options — VisionManager references sg.options at line 38, but SpaceGraph constructor only accepts _options which is immediately discarded         
  4. PhysicsPlugin collision is O(n²) with no spatial pruning — breaks at >100 nodes                                                             
  5. Demo shows 5 nodes — not representative of anything                                                                                                  
  6. No exportPNG() / screenshot method                                                                                                                   
  7. No SpaceGraph.quick() shorthand                                                                                                                      
  8. HMR (dispose() on Vite hot reload) not wired                                                                                                         
                                                                                                                                                          
  ---                                                                                                                                                     
  Phase 0 — Triage (estimated: 1 week)                      
                                                                                                                                                          
  Task 0.1 — Fix SpaceGraph.create() async race             
                                                                                                                                                          
  File: src/SpaceGraph.ts:102-132                                                                                                                         
   
  Problem: create() is typed as returning SpaceGraph but internally fires an unhandled async chain. If init() or loadSpec() fails, the returned instance  
  silently never renders. Callers in demos and the kitchen sink use graph.render() before init completes.
                                                                                                                                                          
  Fix: Make create() async, returning Promise<SpaceGraph>. This is a breaking change but the library is alpha — do it now.                                
   
  // Before                                                                                                                                               
  static create(container: string | HTMLElement, spec: GraphSpec): SpaceGraph
                                                                                                                                                          
  // After
  static async create(container: string | HTMLElement, spec: GraphSpec, options?: SpaceGraphOptions): Promise<SpaceGraph>                                 
                                                            
  The method body becomes straightforward: await sg.init(), then sg.loadSpec(spec), then return sg. Callers don't call sg.render() manually — create()    
  starts the loop internally before resolving.
                                                                                                                                                          
  Update all call sites: demo/main.ts, any tests, the React/Vue/Solid adapters. The React adapter already uses await so it gets this for free.            
   
  Also: Remove the now-redundant SpaceGraph.import() static method — it does the same thing as create() + graph.fromJSON(). Consolidate.                  
                                                            
  Task 0.2 — Fix node.type property                                                                                                                       
                                                            
  File: src/nodes/Node.ts                                                                                                                                 
   
  Problem: Graph.toJSON() serializes node.type (line 249) but the base Node class never assigns this.type. The round-trip toJSON() → fromJSON() loses the 
  node type and reconstruction fails.                       
                                                                                                                                                          
  Fix: Add a type property to Node base class, assigned in constructor from the spec:                                                                     
   
  public readonly type: string;                                                                                                                           
                                                            
  constructor(sg: SpaceGraph, spec: NodeSpec) {
      // ...existing...
      this.type = spec.type;                                                                                                                              
  }
                                                                                                                                                          
  Each subclass constructor passes its spec up to super(sg, spec) so this is automatic. Verify in Graph.toJSON() that node.type is preferred over         
  node.constructor.name.
                                                                                                                                                          
  Task 0.3 — Preserve options on SpaceGraph                                                                                                               
   
  File: src/SpaceGraph.ts:77-94                                                                                                                           
                                                            
  Problem: _options is accepted but never stored. VisionManager accesses sg.options?.onnxExecutionProviders which is always undefined.                    
   
  Fix: Store options as a public property:                                                                                                                
                                                            
  public options: SpaceGraphOptions;
                                                                                                                                                          
  constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
      this.options = options;                                                                                                                             
      // ...rest unchanged                                  
  }                                                                                                                                                       
   
  No other changes needed — VisionManager already reads it correctly.                                                                                     
                                                            
  Task 0.4 — HMR cleanup                                                                                                                                  
                                                            
  File: demo/main.ts and Vite config

  Problem: In development, Vite hot module replacement re-runs main.ts without cleaning up the previous WebGL context, causing canvas accumulation and    
  memory leak.
                                                                                                                                                          
  Fix: Register a module dispose handler in demo/main.ts:                                                                                                 
   
  if (import.meta.hot) {                                                                                                                                  
      import.meta.hot.dispose(() => {                       
          sg.dispose();
      });
  }
                                                                                                                                                          
  Move sg to module scope so the dispose handler can reach it.
                                                                                                                                                          
  Task 0.5 — Audit and document all stubs                                                                                                                 
   
  Action: Grep for TODO, stub, // extend, // Placeholder, not implemented across the entire src/ tree. For each:                                          
  - If the surrounding code is genuinely non-functional: file a GitHub issue and add a // KNOWN GAP: issue #N comment
  - If the code works but the comment is stale: delete the comment                                                                                        
  - Result: an honest inventory at the end of Phase 0             
                                                                                                                                                          
  Expected findings: PhysicsPlugin's top comment ("Verlet-based 2-D physics stub") is misleading — the implementation is real. Remove the misleading      
  label. VisionManager's ONNX paths are real infrastructure with phantom models — document this explicitly.                                               
                                                                                                                                                          
  Task 0.6 — CI on every push                                                                                                                             
                                                            
  File: .github/workflows/ci.yml (create if absent)                                                                                                       
   
  Minimal pipeline:                                                                                                                                       
  1. npm install                                            
  2. npm run build — catches TypeScript errors                                                                                                            
  3. npm run test — Vitest unit tests         
  4. npm run lint — ESLint                                                                                                                                
                                                                                                                                                          
  Don't run Playwright E2E in CI yet — it requires a browser environment and will be slow. That comes in Phase 1.
                                                                                                                                                          
  Success criteria for Phase 0: npm run build && npm run test passes clean from a fresh clone. The SpaceGraph.create() call in demo/main.ts is await-based
   and handles errors visibly.                                                                                                                            
                                                                                                                                                          
  ---                                                       
  Phase 1 — Core Product (estimated: 5 weeks)
                                                                                                                                                          
  1.1 — Fix PhysicsPlugin scaling
                                                                                                                                                          
  File: src/plugins/PhysicsPlugin.ts:119-159                

  Problem: The O(n²) collision/repulsion loop at lines 120-159 iterates every pair of nodes every frame. At 100 nodes: 4,950 pairs. At 300 nodes: 44,850  
  pairs. At 1,000 nodes: ~500,000 pairs per frame at 60fps. This hits the performance target wall immediately.
                                                                                                                                                          
  The SpatialIndex class already exists in src/core/SpatialIndex.ts and is used by VisionManager. Use it here.                                            
   
  Fix: Before the collision loop, build a spatial grid. For each node, only check neighbors within collisionRadius * 3 of its cell. This reduces typical  
  work from O(n²) to O(n·k) where k is average neighbors per cell.
                                                                                                                                                          
  // Replace the nested for loop with:                      
  const spatialIndex = new SpatialIndex(this.settings.collisionRadius * 3);                                                                               
  spatialIndex.build(nodes);                                                                                                                              
                                                                                                                                                          
  for (const node of nodes) {                                                                                                                             
      const searchBox = new THREE.Box3().setFromCenterAndSize(
          node.position,                                                                                                                                  
          new THREE.Vector3(this.settings.collisionRadius * 4, this.settings.collisionRadius * 4, this.settings.collisionRadius * 4)
      );                                                                                                                                                  
      const neighbors = spatialIndex.queryBox(searchBox);   
      // ...existing pair logic, skip if neighbor.id <= node.id                                                                                           
  }                                                                                                                                                       
                                                                                                                                                          
  Import SpatialIndex at the top of the file.                                                                                                             
                                                            
  Also: The physics loop currently runs every frame unconditionally when enabled: true. Add a convergence check — if no node moved more than 0.1 units in 
  the last frame, pause the loop and resume on the next node:added, node:moved, or graph:reset event. This saves GPU/CPU time when the graph has settled.
                                                                                                                                                          
  Also: Change the default for enabled from false to true — there's no good reason to disable it by default if it works correctly. Force-directed live    
  layout is one of the library's primary value propositions.
                                                                                                                                                          
  1.2 — Node Quality Audit                                                                                                                                
   
  Audit every node type. For each: does it render, does it update via updateSpec(), does it dispose cleanly? The method here is simple: add each node type
   to the kitchen sink demo (Task 1.4) and test by eye. Then write unit tests to confirm new NodeType(mockSg, spec) doesn't throw.
                                                                                                                                                          
  Priority defects to find and fix:                                                                                                                       
   
  NoteNode — the most-used note type; verify label text renders, color customization works, updateSpec re-renders text.                                   
                                                            
  CodeEditorNode — Monaco loads asynchronously via @monaco-editor/loader. The node constructor likely starts loading Monaco but the editor won't be ready 
  for several seconds. There needs to be a placeholder state while loading and the node's dispose() must release the Monaco instance.
                                                                                                                                                          
  GlobeNode — this is a showcase node. Verify: sphere renders with default material if no textureUrl provided, markers appear at correct lat/lng, rotation
   animation doesn't conflict with InteractionPlugin drag.
                                                                                                                                                          
  SceneNode — loads external GLTF/OBJ. Verify the async load doesn't throw if the URL is invalid or slow; show a loading indicator mesh (a wireframe      
  sphere or THREE.AxesHelper) while loading.
                                                                                                                                                          
  ProcessNode — the spec has pid, name, cpu, memory as data fields. The visual currently appears to render a simple panel. Define what "process" means: it
   should display a mini task-manager card with color-coded CPU/memory bars. This is the node type for system monitoring use cases.
                                                                                                                                                          
  AudioNode — depends on Web Audio API. Verify: graceful degradation if AudioContext is blocked by browser autoplay policy (show a "click to enable audio"
   state). Visualization should update every animation frame using AnalyserNode data.
                                                                                                                                                          
  VideoNode — requires browser autoplay policy handling. Muted autoplay works; unmuted autoplay requires user gesture. Implement a click-to-play overlay  
  state.
                                                                                                                                                          
  IFrameNode — the most security-sensitive type. Verify sandbox attribute is set by default (prevent scripts unless spec.data.allowScripts: true).        
  Coordinate scroll events: when the pointer is over an iframe, wheel events should scroll the iframe content, not pan the graph. When the pointer leaves,
   restore graph pan behavior.                                                                                                                            
                                                            
  1.3 — Kitchen Sink Demo

  File: demo/main.ts (complete rewrite)

  This is the most important deliverable. It is the first thing a developer sees. It must be genuinely impressive.                                        
  
  Structure: A large graph space with labeled zones, one for each node category:                                                                          
                                                            
  Zone: "Content Nodes"      — HtmlNode, MarkdownNode, NoteNode, DataNode                                                                                 
  Zone: "Media Nodes"        — ImageNode, VideoNode, AudioNode, CanvasNode                                                                                
  Zone: "Specialty Nodes"    — GlobeNode, ChartNode, MathNode, CodeEditorNode                                                                             
  Zone: "Structure Nodes"    — GroupNode, ShapeNode, TextMeshNode, InstancedShapeNode                                                                     
  Zone: "Integration Nodes"  — ProcessNode, SceneNode, IFrameNode                                                                                         
                                                                                                                                                          
  Each zone is a GroupNode container. Nodes within zones are connected by edges. Zones are connected to each other by FlowEdge or LabeledEdge.            
                                                            
  Demo behaviors to show:                                                                                                                                 
  - Physics running live (nodes slightly jiggling into equilibrium on load)
  - fitView() called 500ms after load to frame all content                                                                                                
  - A clock node (HtmlNode with setInterval updating innerHTML) proving live DOM updates work
  - A live ChartNode with data that updates every 2 seconds                                                                                               
  - HUD controls to toggle physics, switch layouts, run vision analysis                                                                                   
                                                                                                                                                          
  Code structure: Move the demo to use SpaceGraphApp instead of bare SpaceGraph. This tests SpaceGraphApp and gives a cleaner demo codebase.              
                                                                                                                                                          
  1.4 — Vision System: Clean Up the Contract                                                                                                              
                                                                                                                                                          
  File: src/core/VisionManager.ts                                                                                                                         
                                                            
  The heuristic-based analysis (WCAG contrast, BVH overlap) works without ONNX models. The ONNX paths are try/catch guarded and fail silently. This is    
  actually fine architecture — it degrades gracefully.
                                                                                                                                                          
  What needs doing:                                         

  1. Document the contract clearly. In the JSDoc for VisionManager and in the README, state explicitly: "Vision heuristics run in all environments. ONNX  
  models are optional and enhance heuristic confidence when provided."
                                                                                                                                                          
  2. Add startAutonomousAnalysis(intervalMs) and stopAutonomousAnalysis() public methods. Currently autonomousTimer is private with no public start/stop  
  API. Expose it.
                                                                                                                                                          
  3. Add sg.vision.analyze() to the demo HUD. The HUD plugin should have a "Run Vision Check" button that calls sg.vision.analyze() and overlays the      
  results as colored highlights on offending nodes.
                                                                                                                                                          
  4. Add auto-fix callback. When overlap analysis finds nodes that intersect, VisionManager should emit a vision:overlap event with the offending node    
  IDs. The PhysicsPlugin should listen for this and temporarily increase repulsion for those specific pairs, nudging them apart. This closes the
  vision-correction loop without ONNX.                                                                                                                    
                                                            
  5. Fix the node.id < nodeB.id comparison in overlap analysis (line 148) — this is a string comparison that doesn't correctly deduplicate pairs when node
   IDs are non-sequential strings. Change to a Set<string> of processed pairs keyed by [a.id, b.id].sort().join('|').
                                                                                                                                                          
  1.5 — Serialization: Complete the Contract                                                                                                              
  
  Already working: graph.toJSON(), graph.fromJSON(), SpaceGraph.export(), SpaceGraph.import(), SpaceGraph.fromURL()                                       
                                                            
  Gaps:                                                                                                                                                   
                                                            
  Add sg.exportPNG(scale?: number): Promise<Blob>:                                                                                                        
  
  async exportPNG(scale: number = 1): Promise<Blob> {                                                                                                     
      // Three.js WebGLRenderer has preserveDrawingBuffer; we need to trigger a render
      // then use canvas.toBlob()                                                                                                                         
      this.renderer.render();                                                                                                                             
      return new Promise((resolve, reject) => {                                                                                                           
          this.renderer.renderer.domElement.toBlob(                                                                                                       
              (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
              'image/png'                                                                                                                                 
          );                                                
      });                                                                                                                                                 
  }                                                         

  Note: requires { preserveDrawingBuffer: true } in the WebGLRenderer constructor options. Add this to Renderer.ts.                                       
  
  Add URL state: sg.toShareURL(): string encodes sg.export() as a base64 URL hash. SpaceGraph.fromURL() already handles loading from URLs — if the URL    
  hash contains a ?spec= param, decode and load it directly. This enables shareable graph state in the browser.
                                                                                                                                                          
  Spec validation: graph.fromJSON() currently silently drops nodes with unregistered types. Add a spec.nodes.filter(n =>                                  
  this.sg.pluginManager.getNodeType(n.type)) pre-pass that logs a clear warning listing all unrecognized types before proceeding.
                                                                                                                                                          
  ---                                                       
  Phase 2.1 — API Ergonomics
                            
  Task 2.1.1 — The create() signature
                                                                                                                                                          
  After the Phase 0 fix making create() async, the primary API becomes:
                                                                                                                                                          
  const sg = await SpaceGraph.create('#root', spec);        
                                                                                                                                                          
  This is clean. Document it prominently. The pattern is:                                                                                                 
  - SpaceGraph.create() — new graph from spec                                                                                                             
  - SpaceGraph.fromURL() — new graph from URL                                                                                                             
  - SpaceGraph.import() — new graph from full export blob (includes camera + plugin state)
                                                                                                                                                          
  Remove the redundant import() method or make it a thin alias for fromURL() with local object support. Don't maintain two methods that do the same thing.
                                                                                                                                                          
  Task 2.1.2 — Events API                                                                                                                                 
                                                                                                                                                          
  File: src/core/EventManager.ts                                                                                                                          
   
  The event system exists but the event names and payloads are only documented internally. Add a public SpaceGraphEvents type map (already exported in    
  index.ts) that documents every event:                     
                                                                                                                                                          
  export interface SpaceGraphEvents {                       
      'node:added': { node: Node };
      'node:removed': { id: string };
      'node:click': { node: Node; event: PointerEvent };
      'node:dblclick': { node: Node; event: PointerEvent };                                                                                               
      'node:contextmenu': { node: Node; event: PointerEvent };
      'node:dragstart': { node: Node };                                                                                                                   
      'node:dragend': { node: Node };                       
      'edge:added': { edge: Edge };                                                                                                                       
      'edge:removed': { id: string };                                                                                                                     
      'edge:click': { edge: Edge; event: PointerEvent };
      'graph:ready': {};                                                                                                                                  
      'graph:cleared': {};                                                                                                                                
      'vision:report': { report: VisionReport };
      'vision:overlap': { pairs: Array<{a: string, b: string}> };                                                                                         
      'layout:applied': { layoutName: string };                                                                                                           
  }
                                                                                                                                                          
  Add strongly-typed sg.on() and sg.off() methods directly on SpaceGraph that forward to events.on() / events.off(). This removes one level of indirection
   from the user-facing API.
                                                                                                                                                          
  Task 2.1.3 — SpaceGraph.quick()                                                                                                                         
   
  A one-method prototype path for when you don't care about types or configuration:                                                                       
                                                            
  static async quick(                                                                                                                                     
      container: string | HTMLElement,                      
      nodes: Array<{ id: string; label: string; [k: string]: any }>,
      edges: Array<{ source: string; target: string; [k: string]: any }> = []                                                                             
  ): Promise<SpaceGraph>                                                                                                                                  
                                                                                                                                                          
  Internally converts to NodeSpec[] with type: 'ShapeNode', random positions within a bounding sphere, and calls SpaceGraph.create(). Purpose: lower the  
  barrier from "want to try this" to "first graph on screen" to under 10 lines of code.
                                                                                                                                                          
  Task 2.1.4 — Reactive data binding                                                                                                                      
   
  This is the "live graphs" primitive. Design:                                                                                                            
                                                            
  // Bind a data array to the graph                                                                                                                       
  sg.bind<T>(                                               
      data: T[] | Observable<T[]>,                                                                                                                        
      nodeMapper: (item: T) => Partial<NodeSpec>,
      edgeMapper?: (items: T[]) => Partial<EdgeSpec>[]                                                                                                    
  ): () => void  // returns unbind function                 
                                                                                                                                                          
  Implementation: when data changes, diff against current nodes by ID. Add new nodes, update changed ones, remove missing ones. Animate additions with    
  node.animate({ scale: 0 → 1 }) and removals with animate({ scale: 0 }) then graph.removeNode().                                                         
                                                                                                                                                          
  For the simple array case, use a MutationObserver-style polling approach initially. For Observable support, detect via duck-typing (check for .subscribe
   method). Rxjs compatibility is free if the interface is duck-typed.
                                                                                                                                                          
  This is what makes SpaceGraph viable for dashboards, monitoring tools, and live data visualization.                                                     
   
  ---                                                                                                                                                     
  Phase 4.4 — The ZUI Standard                              

  What this is

  A published specification defining how web applications declare and expose ZUI entry points — analogous to manifest.json for PWAs, robots.txt for       
  crawlers, or sitemap.xml for search engines. The goal is not a W3C submission on day one; it's establishing vocabulary and a reference implementation
  that makes others adopt the pattern.                                                                                                                    
                                                            
  The ZUI Manifest

  File path convention: /.well-known/zui-manifest.json (following the RFC 8615 well-known URI pattern)                                                    
   
  Spec v0.1:                                                                                                                                              
                                                            
  {
    "zui_version": "0.1",
    "name": "My Application",                                                                                                                             
    "description": "Human-readable description of what this ZUI represents",
                                                                                                                                                          
    // Static graph spec — the full graph as a SpaceGraph-compatible JSON spec                                                                            
    "spec_url": "/api/zui/graph.json",
                                                                                                                                                          
    // Or inline if small                                                                                                                                 
    "spec": {                                                                                                                                             
      "nodes": [...],                                                                                                                                     
      "edges": [...]                                        
    },

    // Live update endpoint — SSE or WebSocket for real-time graphs                                                                                       
    "stream_url": "/api/zui/stream",
    "stream_protocol": "sse" | "websocket",                                                                                                               
                                                                                                                                                          
    // Update granularity hint                                                                                                                            
    "update_mode": "full" | "patch",  // full = replace spec, patch = NodeSpec[] diffs                                                                    
                                                                                                                                                          
    // Spatial hints for consumers                                                                                                                        
    "initial_layout": "force" | "grid" | "hierarchical" | ...,                                                                                            
    "recommended_zoom": 0.5,                                                                                                                              
                                                                                                                                                          
    // Auth
    "auth": "none" | "bearer" | "cookie",                                                                                                                 
                                                                                                                                                          
    // Registered node namespaces this app uses                                                                                                           
    "node_types": ["ShapeNode", "HtmlNode", "custom:MyAppNode"]                                                                                           
  }                                                                                                                                                       
                                                            
  SpaceGraph.fromManifest()                                                                                                                               
                                                            
  Implement consumption directly in SpaceGraph:                                                                                                           
   
  static async fromManifest(                                                                                                                              
      origin: string,  // e.g. "https://myapp.com"          
      container: HTMLElement,                                                                                                                             
      options?: SpaceGraphOptions
  ): Promise<SpaceGraph>                                                                                                                                  
                                                            
  Implementation:                                                                                                                                         
  1. Fetch ${origin}/.well-known/zui-manifest.json
  2. If spec_url, fetch the graph spec and call SpaceGraph.create()                                                                                       
  3. If stream_url, create the graph then open the stream and call sg.update(patch) on each message
  4. If spec is inline, use it directly                                                                                                                   
  5. Apply initial_layout from the manifest                                                                                                               
                                                                                                                                                          
  This makes any ZUI-compliant server trivially consumable. A developer could point a SpaceGraph shell at any server and get its ZUI automatically.       
                                                                                                                                                          
  The Reference Server                                                                                                                                    
                                                                                                                                                          
  Publish @spacegraph/zui-server — a tiny Express/Hono middleware that:                                                                                   
  - Serves /.well-known/zui-manifest.json for an app        
  - Provides a /api/zui/graph.json endpoint backed by any data source                                                                                     
  - Provides an SSE stream at /api/zui/stream                        
  - Handles CORS                                                                                                                                          
                                                                                                                                                          
  Example:
  import { zuiServer } from '@spacegraph/zui-server';                                                                                                     
                                                            
  app.use(zuiServer({                                                                                                                                     
    name: 'My API',  
    nodes: () => myDatabase.getNodes(),  // called on each request                                                                                        
    edges: () => myDatabase.getEdges(),                           
    stream: true  // auto-sets up SSE with node/edge change events                                                                                        
  }));                                                                                                                                                    
                                                                                                                                                          
  Making the Standard Real                                                                                                                                
                                                                                                                                                          
  A standard with one implementation is just a library. It becomes a standard when multiple independent parties adopt it. The roadmap:                    
   
  Step 1 — Reference implementation in SpaceGraph (as above)                                                                                              
                                                            
  Step 2 — Publish the spec as a standalone document at zui-standard.org (or similar), hosted on GitHub, versioned with semver, accepting PRs.            
  Deliberately kept separate from the SpaceGraph brand so it can be adopted by competing graph libraries.
                                                                                                                                                          
  Step 3 — n8n bridge compliance — The n8n bridge in packages/n8n-bridge should emit a ZUI manifest so any n8n instance can be pointed at by a SpaceGraph 
  shell and its workflow graph appears automatically. This is a concrete, useful demonstration.
                                                                                                                                                          
  Step 4 — Write connectors for popular tools:                                                                                                            
  - @spacegraph/zui-github — turns a GitHub repo's dependency graph, PR graph, or issue graph into a ZUI manifest
  - @spacegraph/zui-postgres — walks a database schema into a ZUI spec                                                                                    
  - @spacegraph/zui-k8s — Kubernetes cluster topology                 
                                                                                                                                                          
  Each connector is trivial code (< 200 lines). Each one is a compelling demo. Each one demonstrates the standard working in practice.
                                                                                                                                                          
  Step 5 — Pitch to graph-adjacent projects — Grafana, Obsidian, Logseq, Gephi. Not asking them to adopt SpaceGraph specifically, but to adopt the        
  manifest URL convention. If Obsidian exports a /.well-known/zui-manifest.json from its local server, any ZUI renderer can display your vault. This is   
  the network effect.                                                                                                                                     
                                                            
  ---
  Delivery Sequencing

  Week 1:   Phase 0 (all tasks: 0.1–0.6)
  Week 2:   Phase 1.1 (PhysicsPlugin scaling) + Phase 1.2 (Node audit)                                                                                    
  Week 3:   Phase 1.3 (Kitchen sink demo) — this is the hardest single task                                                                               
  Week 4:   Phase 1.4 (Vision cleanup) + Phase 1.5 (Serialization)                                                                                        
  Week 5:   Phase 2.1 tasks 2.1.1–2.1.3 (create(), events, quick())                                                                                       
  Week 6:   Phase 2.1 task 2.1.4 (bind()) + Phase 4.4 manifest spec                                                                                       
  Week 7:   Phase 4.4 fromManifest() + zui-server package                                                                                                 
  Week 8:   Integration, documentation, npm publish 6.0.0-beta.1                                                                                          
                                                                                                                                                          
  Success Criteria                                                                                                                                        
                                                                                                                                                          
  Phase 0: npm run build && npm run test passes from clean clone. No race conditions. create() is awaitable.                                              
   
  Phase 1: Demo renders all 20 node types. Physics converges at 500 nodes at 30fps minimum. toJSON() → fromJSON() round-trips without data loss.          
                                                            
  Phase 2.1: A developer with no prior SpaceGraph knowledge can go from npm install spacegraphjs to a live graph in < 15 lines of code. The events API is 
  fully typed.                                              
                                                                                                                                                          
  Phase 4.4: /.well-known/zui-manifest.json is served by at least two distinct applications (SpaceGraph demo server + the n8n bridge).                    
  SpaceGraph.fromManifest() loads both correctly. The spec is published as a standalone document with a public URL.
 
