# SpaceGraphJS + n8n Integration — Development Plan

> **Goal**: Integrate n8n as a programmatic dependency within SpaceGraphJS, making SpaceGraphJS the primary 3D/ZUI front-end for n8n workflow design, execution, monitoring, and autonomous AI-driven orchestration — while maintaining zero Python dependencies and targeting 60 FPS at 1,000+ nodes.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Dependency & Project Setup](#2-dependency--project-setup)
3. [Phase 0 — Bridge Module](#3-phase-0--bridge-module-spacegraph-n8n-bridgets)
4. [Phase 1 — Workflow Rendering](#4-phase-1--workflow-rendering)
5. [Phase 2 — Live Execution & Monitoring](#5-phase-2--live-execution--monitoring)
6. [Phase 3 — Embedded Widget Editing](#6-phase-3--embedded-widget-editing)
7. [Phase 4 — AI Vision Loop](#7-phase-4--ai-vision-loop)
8. [Phase 5 — LangFlow/Flowise Feature Parity](#8-phase-5--langflowflowise-feature-parity)
9. [Phase 6 — SpaceGraph OS Integration](#9-phase-6--spacegraph-os-integration)
10. [Node & Edge Type Mapping](#10-node--edge-type-mapping)
11. [New Node Types to Implement](#11-new-node-types-to-implement)
12. [New Plugins to Implement](#12-new-plugins-to-implement)
13. [File Structure](#13-file-structure)
14. [Performance Targets & Constraints](#14-performance-targets--constraints)
15. [Testing Strategy](#15-testing-strategy)
16. [Milestones & Sequencing](#16-milestones--sequencing)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                   SpaceGraph Application Layer                        │
│         (ZUI canvas, node/edge rendering, user interaction)           │
├──────────────────────────────────────────────────────────────────────┤
│                   spacegraph-n8n-bridge.ts                            │
│   WorkflowMapper ─ ExecutionMonitor ─ CredentialWidget ─ EventBus    │
├──────────────────────────────────────────────────────────────────────┤
│                   SpaceGraphJS Core (existing)                         │
│   Graph ─ Renderer ─ PluginManager ─ VisionManager ─ EventManager    │
├──────────────────────────────────────────────────────────────────────┤
│                   n8n (npm dependency, headless)                       │
│   Workflow ─ Node ─ ExecutionService ─ WebhookServer ─ Scheduler      │
├──────────────────────────────────────────────────────────────────────┤
│                   THREE.js / WebGL / ONNX Runtime Web                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| `npm install n8n` — no fork | Preserves upstream upgradability; overrides via wrappers only |
| n8n runs headless (`N8N_UI_DISABLED=true`) | SpaceGraph owns the entire UI surface |
| Bridge as a **singleton service** | Single source of truth for workflow↔graph state sync |
| RxJS observables for state sync | n8n emits events; SpaceGraph reacts without polling |
| One n8n `Workflow` → one `SpaceGraph` canvas | 1:1 mapping; sub-workflows → nested `GroupNode` instances |
| All new SpaceGraph nodes extend existing base types | No breakage to the existing plugin/registration system |

---

## 2. Dependency & Project Setup

### 2.1 Installation

```bash
# In the SpaceGraphJS monorepo root
npm install n8n rxjs

# Vite alias to resolve headless n8n core modules
# (add to vite.config.ts — see §2.3)
```

### 2.2 Environment Configuration

Create `packages/n8n-bridge/.env.example`:

```env
# n8n headless mode
N8N_UI_DISABLED=true
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_HOST=localhost

# Persistence (SQLite by default, Postgres for prod)
DB_TYPE=sqlite
DB_SQLITE_DATABASE=.n8n/database.sqlite

# Disable telemetry
N8N_DIAGNOSTICS_ENABLED=false
```

### 2.3 `vite.config.ts` Additions

```typescript
// Add to existing vite.config.ts resolve.alias block
resolve: {
  alias: {
    'n8n/core': path.resolve(__dirname, 'node_modules/n8n/packages/core/dist'),
    'n8n/workflow': path.resolve(__dirname, 'node_modules/n8n-workflow/dist'),
  },
},
// Externalize n8n server-side modules from browser bundle
build: {
  rollupOptions: {
    external: ['n8n', 'n8n-core', 'better-sqlite3'],
  },
},
```

> **Note**: n8n's execution engine runs in Node.js on a local dev server. The browser bundle only imports data-model types (`n8n-workflow`) and calls the bridge over a local WebSocket/REST interface. The heavy server-side modules are externalized from the browser bundle to keep it under 200 KB.

### 2.4 Package Workspace

Add `packages/n8n-bridge/` to the monorepo workspace. It exports:
- `spacegraph-n8n-bridge.ts` — the primary bridge module
- `N8nWorkflowPlugin.ts` — SpaceGraph plugin wrapper
- `N8nNode.ts`, `N8nEdge.ts` — SpaceGraph entities

---

## 3. Phase 0 — Bridge Module (`spacegraph-n8n-bridge.ts`)

**Effort**: ~3–4 days | **Prerequisite**: None (foundational)

This module is the integration seam. It owns all state synchronization between n8n's data model and SpaceGraph's graph state.

### 3.1 Core Classes

#### `N8nBridge`

```typescript
// packages/n8n-bridge/src/spacegraph-n8n-bridge.ts
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import type { SpaceGraph } from 'spacegraphjs';

export interface N8nWorkflowDiff {
  addedNodes: N8nNodeSpec[];
  removedNodes: string[];
  updatedNodes: Partial<N8nNodeSpec>[];
  addedEdges: N8nConnectionSpec[];
  removedEdges: string[];
}

export class N8nBridge {
  private sg: SpaceGraph;
  private wsClient: WebSocket;           // connects to n8n-bridge-server
  private workflowDiff$ = new Subject<N8nWorkflowDiff>();
  private executionState$ = new BehaviorSubject<ExecutionState | null>(null);

  constructor(sg: SpaceGraph, bridgeServerUrl = 'ws://localhost:5679') { ... }

  // Load a workflow by ID from the n8n server → render in SpaceGraph
  async loadWorkflow(workflowId: string): Promise<void> { ... }

  // Push a node position change from SpaceGraph → n8n metadata store
  pushNodePositionUpdate(nodeId: string, x: number, y: number): void { ... }

  // Trigger workflow execution
  async executeWorkflow(workflowId: string): Promise<string> { ... }  // returns executionId

  // RxJS observables for reactive UI updates
  get executionState(): Observable<ExecutionState | null> { return this.executionState$; }
  get workflowDiffs(): Observable<N8nWorkflowDiff> { return this.workflowDiff$; }
}
```

#### `WorkflowMapper`

Converts n8n's JSON format to SpaceGraph `GraphSpec` and back.

```typescript
export class WorkflowMapper {
  // n8n Workflow JSON → SpaceGraph GraphSpec
  static toGraphSpec(workflow: N8nWorkflowJSON): GraphSpec { ... }

  // SpaceGraph graph state delta → n8n Workflow JSON patch
  static toWorkflowPatch(diff: GraphDiff): Partial<N8nWorkflowJSON> { ... }

  // Map n8n node type string → SpaceGraph node type class name
  static resolveNodeType(n8nType: string): string { ... }
}
```

#### `N8nBridgeServer` (Node.js process)

Runs as a small Express/WS server (`packages/n8n-bridge/server/index.ts`) that:
1. Starts n8n programmatically (`n8n.start()`)
2. Proxies n8n REST API calls
3. Streams execution events over WebSocket to the browser

```typescript
// packages/n8n-bridge/server/index.ts
import { N8n } from 'n8n';
import { WebSocketServer } from 'ws';

const n8nApp = new N8n();
await n8nApp.start();

// WebSocket relay: n8n ExecutionService events → browser
const wss = new WebSocketServer({ port: 5679 });
n8nApp.executionService.on('workflowExecuteAfter', (data) => {
  broadcast(wss, { type: 'execution:complete', data });
});
```

### 3.2 State Synchronization Protocol

```
Browser (SpaceGraph)          n8n Bridge Server          n8n Engine
     │                               │                        │
     │──── WS: loadWorkflow(id) ────►│                        │
     │                               │──── REST GET /wf ─────►│
     │                               │◄─── workflow JSON ──────│
     │◄─── WS: workflow:loaded ──────│                        │
     │                               │                        │
     │  [user drags node]            │                        │
     │──── WS: node:moved ──────────►│                        │
     │                               │──── PATCH /wf ────────►│
     │                               │                        │
     │──── WS: execute:trigger ─────►│                        │
     │                               │──── POST /executions ─►│
     │                               │◄─── SSE execution log ─│
     │◄─── WS: execution:progress ───│                        │
```

---

## 4. Phase 1 — Workflow Rendering

**Effort**: ~4–5 days | **Prerequisite**: Phase 0

### 4.1 Node Type Mapping

See [§10 Node & Edge Type Mapping](#10-node--edge-type-mapping) for the full table. The high-level rule:

| n8n Node Category | SpaceGraph Node Type | Rationale |
|---|---|---|
| Trigger (Webhook, Cron) | `N8nTriggerNode` (new, extends `ShapeNode`) | Distinct visual (portal/clock icon) |
| AI / LLM | `N8nAiNode` (new, extends `HtmlNode`) | Needs embedded prompt textarea |
| Data Transform | `DataNode` (existing) | Pure data pass-through node |
| HTTP Request | `N8nHttpNode` (new, extends `HtmlNode`) | URL bar + response preview |
| Sub-workflow | `GroupNode` (existing) | Fractal nesting is native |
| Code (JS) | `N8nCodeNode` (new, extends `HtmlNode`) | Monaco editor embed |
| Merge / IF / Switch | `ShapeNode` (existing) | Geometric shapes per branching type |
| Output / Set / NoOp | `DataNode` (existing) | Minimal, data-centric |

### 4.2 Edge Rendering

| n8n Connection Type | SpaceGraph Edge Type | Visual Treatment |
|---|---|---|
| Normal data flow | `FlowEdge` | Animated data pulse particles |
| Conditional branch (IF true/false) | `CurvedEdge` with color tint | Green/red color coding |
| Optional / fallback | `DottedEdge` | Dashed line |
| High-volume / batched | `DynamicThicknessEdge` | Thickness scales with throughput |
| Error output | `AnimatedEdge` | Red pulsing animation |

### 4.3 Auto-Layout on Import

When a workflow is loaded, apply `HierarchicalLayout` by default (matches n8n's left-to-right DAG). Users can switch to `ForceLayout` (complex webs), `TimelineLayout` (sequential pipelines), or `ClusterLayout` (agent groupings) via a toolbar.

```typescript
// In WorkflowMapper.toGraphSpec()
const spec: GraphSpec = {
  nodes: mappedNodes,
  edges: mappedEdges,
  layout: { type: 'HierarchicalLayout', direction: 'LR' },
};
```

### 4.4 `N8nWorkflowPlugin` (SpaceGraph Plugin)

Registers as a standard SpaceGraph plugin so it participates in the existing `PluginManager` lifecycle:

```typescript
export class N8nWorkflowPlugin implements SpaceGraphPlugin {
  name = 'N8nWorkflowPlugin';
  private bridge: N8nBridge;

  init(sg: SpaceGraph): void {
    this.bridge = new N8nBridge(sg);
    sg.pluginManager.registerNodeType('N8nTriggerNode', N8nTriggerNode);
    sg.pluginManager.registerNodeType('N8nAiNode', N8nAiNode);
    sg.pluginManager.registerNodeType('N8nHttpNode', N8nHttpNode);
    sg.pluginManager.registerNodeType('N8nCodeNode', N8nCodeNode);
    // ... register remaining n8n node types
  }

  update(_delta: number): void {
    // Animate execution-in-progress nodes (pulse, rotate)
    this.bridge.executionState.subscribe(state => this.applyExecutionVisuals(state));
  }

  dispose(): void { this.bridge.dispose(); }
}
```

---

## 5. Phase 2 — Live Execution & Monitoring

**Effort**: ~3–4 days | **Prerequisite**: Phase 1

### 5.1 Execution State Visuals

Each n8n node transitions through execution states; SpaceGraph maps these to visual states on the corresponding SpaceGraph node:

| n8n Execution State | SpaceGraph Visual |
|---|---|
| `waiting` | Node slightly dimmed, opacity 0.6 |
| `running` | GSAP pulse animation + blue glow via `AutoColorPlugin` |
| `success` | Flash green → settle to teal accent |
| `error` | Flash red + `AnimatedEdge` on all outgoing edges turn red |
| `skipped` | Gray with dashed outline |

Implementation: subscribe to `bridge.executionState` in `N8nWorkflowPlugin.update()` and call `sg.graph.updateNode(id, { color, animation })`.

### 5.2 Data Flow Particles

During execution, `FlowEdge` instances should emit animated particles representing data packets moving between nodes. Extend `FlowEdge` with:

```typescript
// src/edges/FlowEdge.ts — new method
startDataFlow(rate: number = 1): void { ... }  // activates particle emission
stopDataFlow(): void { ... }
```

Particle count scales with `throughput` metadata from n8n execution events.

### 5.3 Execution Log Panel

Add an `HtmlNode`-based `ExecutionLogPanel` that:
- Appears as a floating node anchored to the bottom-right of the viewport
- Streams execution logs from the bridge WebSocket
- Supports filtering by node ID (click a node → filter logs to that node)
- Collapses to an icon when zoomed far out (LODPlugin integration)

### 5.4 Bottleneck Heatmap

Post-execution, overlay a heatmap on nodes using `AutoColorPlugin`'s color assignment:
- Color nodes by `executionDuration` (cool blue → warm red)
- Label edges with throughput counts via `LabeledEdge`

Trigger via: `sg.pluginManager.get('N8nWorkflowPlugin').showHeatmap(executionId)`.

### 5.5 Timeline Replay

Implement a replay mode that scrubs through an execution's timeline:
- Use `TimelineLayout` to reposition nodes along a time axis
- Replay state transitions frame-by-frame
- Allow scrubbing via a `HtmlNode`-embedded slider widget

---

## 6. Phase 3 — Embedded Widget Editing

**Effort**: ~4–5 days | **Prerequisite**: Phase 1

This phase delivers the ZUI's signature ergonomic advantage: editing node parameters by zooming in, not opening modal dialogs.

### 6.1 LOD-Driven Widget Reveal

Integrate with the existing `LODPlugin`. Define camera-distance thresholds on each n8n node type:

```typescript
// In N8nAiNode.ts
readonly lodThresholds = {
  icon: 800,       // > 800 units: show icon only
  label: 400,      // 400–800: icon + label
  summary: 150,    // 150–400: summary card
  full: 0,         // < 150: full embedded form
};
```

The "full" level renders a live HTML form (via CSS2DRenderer / HtmlNode pattern) with:
- **LLM nodes**: model selector dropdown, prompt textarea, temperature slider, max-tokens number input
- **HTTP nodes**: method dropdown, URL text field, headers table, body JSON editor
- **Code nodes**: embedded Monaco editor (lazy-loaded via dynamic import)
- **Credential nodes**: masked password inputs, "Test Connection" button

### 6.2 Widget Sync Pattern

All widget inputs are two-way bound to the n8n workflow JSON via the bridge:

```
User types in textarea → widget `input` event
  → N8nAiNode.onParamChange(key, value)
    → bridge.pushParamUpdate(nodeId, key, value)
      → WS → N8nBridgeServer
        → PATCH /api/v1/workflows/:id (n8n REST)
```

Debounce 300ms to avoid thrashing.

### 6.3 Credential Management Widget

Build `N8nCredentialNode` (new node type) that:
- Renders as a locked padlock icon when zoomed out
- Zooms in to reveal OAuth/API-key form fields
- Calls n8n's credential store API (`POST /api/v1/credentials`) on save
- Visually connects to nodes that consume the credential using `DottedEdge`

### 6.4 Node Palette (Sidebar Panel)

Implement a draggable `HtmlNode`-based palette panel listing all 300+ n8n node types, grouped into categories that match n8n's own taxonomy. Adding a node: drag from palette → drop on canvas → bridge creates node in n8n workflow + renders SpaceGraph node at drop position.

Categories: Core, AI/LLM, Data, HTTP/API, Database, Messaging, File, Developer, Triggers.

---

## 7. Phase 4 — AI Vision Loop

**Effort**: ~2–3 days | **Prerequisite**: Phase 2, Phase 3

This phase connects SpaceGraphJS's existing `VisionManager` / `VisionOverlayPlugin` to n8n-specific scenarios.

### 7.1 Vision Model Usage

The existing ONNX vision pipeline (`VisionManager`) already provides:
- **LQ-Net** — Layout Quality score
- **ODN** — Overlap Detection
- **TLA** — Text Legibility Assessment
- **CHE** — Color Harmony Evaluation

For the n8n integration, trigger the vision pipeline automatically:
1. **After workflow load** — score initial layout; auto-apply `HierarchicalLayout` if score < 60
2. **After execution** — re-score with heatmap overlay to detect color harmony violations
3. **After user edits** — 500ms debounced re-score; show `VisionOverlayPlugin` badge

### 7.2 n8n-Specific Vision Node

Register a new n8n node type: **"SpaceGraph Vision Optimizer"** (visible in n8n's node palette):

```
n8n node: SpaceGraphVisionOptimizerNode
  inputs: [workflow_json]
  outputs: [optimized_layout_json, vision_report]
  action: calls VisionManager.analyzeVision() on the rendered graph
          → applies auto-fix → serializes updated positions back to workflow JSON
```

This enables entirely n8n-native workflows that loop on their own visual quality.

### 7.3 Self-Healing Workflow Loop

Implement `N8nVisionHealer` class:

```typescript
export class N8nVisionHealer {
  constructor(private bridge: N8nBridge, private vision: VisionManager) {}

  async healLayout(workflowId: string): Promise<VisionReport> {
    const report = await this.vision.analyzeVision();
    if (report.layoutScore < 70) {
      await this.bridge.sg.pluginManager.get('ForceLayout').run();
      return this.vision.analyzeVision();  // re-score
    }
    if (report.overlap.overlaps.length > 0) {
      await this.bridge.sg.pluginManager.get('ErgonomicsPlugin').fixOverlaps();
    }
    return report;
  }
}
```

Callable from the `VisionOverlayPlugin`'s "Auto-Fix" button.

### 7.4 Prompt-Based Workflow Builder

Expose a command input (`HtmlNode`-based overlay, triggered by `/` key) that accepts natural-language instructions:

```
User: "Add a researcher agent that searches the web and summarizes results"
→ Bridge calls local LLM (or n8n's own AI node) to generate workflow JSON fragment
→ WorkflowMapper maps it to SpaceGraph nodes
→ Vision loop scores and auto-corrects layout
→ Result rendered in < 30s
```

---

## 8. Phase 5 — LangFlow/Flowise Feature Parity

**Effort**: ~3–5 days | **Prerequisite**: Phase 3

This phase ensures the SpaceGraph+n8n combo matches and exceeds the capabilities described in the specification.

### 8.1 RAG Pipeline Template

Provide a ready-made workflow template: `Input → Embedder → VectorStore → Retriever → LLM → Output`. Each node maps to n8n's built-in AI nodes. Rendered via `HierarchicalLayout`; zooming into VectorStore shows index statistics as a live `ChartNode`.

### 8.2 Multi-Agent Orchestration View

When a workflow contains sub-workflows (n8n sub-workflow nodes):
- Render as `GroupNode` (existing) with fractal nesting
- Zoom in to reveal the agent's internal workflow as a nested SpaceGraph
- Animate handoff edges between agents during execution with `AnimatedEdge`

### 8.3 Human-in-the-Loop Nodes

Implement `N8nHitlNode`:
- Zooms in to reveal: output text from previous step, approve/reject buttons, free-text comment field
- On approve → resumes n8n execution (`POST /api/v1/executions/:id/resume`)
- Visually: shows a "🔴 WAITING" badge until resolved

### 8.4 Webhook Entry-Point Portals

`N8nWebhookNode` renders as a glowing portal with live traffic counter:
- Shows last 5 received payload previews (scrollable, embeded in `HtmlNode`)
- Incoming traffic → `AnimatedEdge` pulses on the outgoing edge
- Test webhook via "Send Test Request" button embedded in node widget

### 8.5 Cron / Schedule Nodes as Orbital Timers

`N8nScheduleNode` renders with an orbiting GSAP animation showing the next-run countdown. In the minimap (`MinimapPlugin`), schedule nodes are highlighted with a clock icon.

### 8.6 Export / Import

- **Export workflow**: serialize n8n JSON + SpaceGraph position metadata → single JSON file downloadable via bridge
- **Import from n8n JSON**: `WorkflowMapper.toGraphSpec()` handles standard n8n export format
- **Import from LangFlow**: provide a `LangflowMigrator` utility that maps LangFlow's component format to n8n nodes
- **3D GLTF export**: export the Three.js scene as `.gltf` for external viewing

### 8.7 Real-Time Collaboration

Use `Y.js` (CRDT library) over WebSocket for multi-user editing:
- Node position changes, param edits, and execution triggers are all CRDTs
- `VisionOverlayPlugin` scores are shared across sessions
- No additional server required — use n8n's existing WebSocket server as transport

---

## 9. Phase 6 — SpaceGraph OS Integration

**Effort**: ~5–7 days | **Prerequisite**: Phase 5

### 9.1 Workflows as Bootable Apps

In `PLAN/SPACEGRAPH_OS.md`, processes are nodes. n8n workflows become "process nodes" in SpaceGraphOS:
- Each workflow has a status: `stopped | starting | running | errored`
- `N8nWorkflowPlugin` emits lifecycle events compatible with the OS process graph
- Workflows can be "launched" from the OS graph by double-clicking

### 9.2 Fractal LOD: Infinite Drill-Down

Leverage the P1 roadmap item "Fractal LOD zooming":
- A `GroupNode` containing a workflow's sub-graph seamlessly reveals itself at sufficient zoom
- Depth is unlimited: a sub-workflow can itself contain sub-workflows as `GroupNode`s
- `LODPlugin` governs the transition; `VisionManager` verifies legibility at each zoom level

### 9.3 OS Process Graph Integration

Extend the bridge server to expose n8n execution state as OS-level process entries:

```typescript
// Bridge server extension
n8nApp.executionService.on('workflowExecuteAfter', (data) => {
  osProcessGraph.update({
    pid: data.executionId,
    name: data.workflowName,
    status: data.status,
    cpu: data.metrics.cpuUsage,
    memory: data.metrics.memUsage,
  });
});
```

A dedicated "System Processes" `GroupNode` on the OS canvas shows all running n8n workflows alongside OS processes.

### 9.4 Hardware Acceleration Hooks (SpaceGraph Mini)

When running on RK3588:
- Route ONNX vision inference to the NPU via `onnxruntime-node` with EP=`RknnExecutionProvider`
- n8n AI node execution offloaded to NPU-accelerated local models
- Target: vision analysis latency < 50ms (currently ~200ms on CPU)

---

## 10. Node & Edge Type Mapping

### n8n Node → SpaceGraph Node Type

| n8n Node Type | SpaceGraph Type | New? | Notes |
|---|---|---|---|
| Webhook | `N8nTriggerNode` | ✅ New | Portal visual, live traffic counter |
| Schedule/Cron | `N8nScheduleNode` | ✅ New | Orbiting animation, countdown |
| HTTP Request | `N8nHttpNode` | ✅ New | URL bar + mini response preview |
| Code (JS) | `N8nCodeNode` | ✅ New | Monaco editor at full zoom level |
| AI Agent | `N8nAiNode` | ✅ New | Prompt textarea, model picker |
| LLM Chain | `N8nAiNode` | ✅ New | Reuses same type, different config schema |
| Vector Store (all) | `ChartNode` (existing) | — | Show index stats as live chart |
| Sub-workflow | `GroupNode` (existing) | — | Fractal nesting is native |
| IF / Switch | `ShapeNode` (existing) | — | Diamond geometry |
| Merge | `ShapeNode` (existing) | — | Funnel geometry |
| Set / NoOp | `DataNode` (existing) | — | Lightweight, data-centric |
| Credentials | `N8nCredentialNode` | ✅ New | Secure form fields |
| Wait / HITL | `N8nHitlNode` | ✅ New | Approve/reject buttons embedded |
| Email / Slack / API | `N8nHttpNode` | — | Reuse, configure with service icon |
| SpaceGraph Vision Optimizer | `N8nVisionOptimizerNode` | ✅ New | Calls VisionManager |

### n8n Connection → SpaceGraph Edge Type

| n8n Connection | SpaceGraph Edge Type | Visual Behavior |
|---|---|---|
| Normal data flow | `FlowEdge` | Animated particles proportional to throughput |
| IF true branch | `CurvedEdge` | Green tint |
| IF false branch | `CurvedEdge` | Red tint |
| Optional / fallback | `DottedEdge` | Gray dashed |
| Error output | `AnimatedEdge` | Red pulsing animation |
| High-volume batch | `DynamicThicknessEdge` | Thickness = log(count) |
| Credential reference | `DottedEdge` | Purple tint, flows to credential node |

---

## 11. New Node Types to Implement

All new nodes live in `src/nodes/` and extend existing base classes. Register in `SpaceGraph.ts`'s `init()` method (or in `N8nWorkflowPlugin.init()`).

### `N8nTriggerNode`
- Extends: `ShapeNode`
- Visual: Hexagonal shape + portal glow effect (GSAP)
- LOD levels: icon (🔗) → label+type → full traffic stats panel
- File: `src/nodes/N8nTriggerNode.ts`

### `N8nScheduleNode`
- Extends: `ShapeNode`
- Visual: Circle with GSAP-animated orbiting dot showing countdown
- LOD levels: icon (🕐) → next-run time → full cron expression editor
- File: `src/nodes/N8nScheduleNode.ts`

### `N8nHttpNode`
- Extends: `HtmlNode`
- Visual: Card with method badge (GET/POST/etc.) + domain label
- LOD levels: method badge → URL summary → full request/response editor
- File: `src/nodes/N8nHttpNode.ts`

### `N8nAiNode`
- Extends: `HtmlNode`
- Visual: Gradient card (violet/blue) + "AI" badge
- LOD levels: model name → prompt preview → full prompt + params editor
- File: `src/nodes/N8nAiNode.ts`

### `N8nCodeNode`
- Extends: `HtmlNode`
- Visual: Dark-theme card with syntax-highlighted snippet preview
- LOD levels: "JS" badge → first 3 lines of code → full Monaco editor (lazy import)
- File: `src/nodes/N8nCodeNode.ts`

### `N8nCredentialNode`
- Extends: `ShapeNode`
- Visual: Lock icon, color-coded by credential type
- LOD levels: lock icon → service name → masked fields + test button
- File: `src/nodes/N8nCredentialNode.ts`

### `N8nHitlNode`
- Extends: `HtmlNode`
- Visual: Orange "WAITING" badge + embedded approve/reject UI
- LOD levels: status badge → decision summary → full input + approve/reject
- File: `src/nodes/N8nHitlNode.ts`

### `N8nVisionOptimizerNode`
- Extends: `HtmlNode`
- Visual: Eye icon + live vision score gauge
- LOD levels: score badge → score breakdown → full vision report + auto-fix controls
- File: `src/nodes/N8nVisionOptimizerNode.ts`

---

## 12. New Plugins to Implement

### `N8nWorkflowPlugin`
- **Location**: `packages/n8n-bridge/src/N8nWorkflowPlugin.ts`
- **Responsibilities**: Bridge lifecycle, node type registration, execution visual updates
- **Implements**: `SpaceGraphPlugin`

### `N8nExecutionMonitorPlugin`
- **Location**: `packages/n8n-bridge/src/N8nExecutionMonitorPlugin.ts`
- **Responsibilities**: Receive execution events, apply state visuals, manage `FlowEdge` particle animation
- **Implements**: `SpaceGraphPlugin`

### `N8nCollaborationPlugin`
- **Location**: `packages/n8n-bridge/src/N8nCollaborationPlugin.ts`
- **Dependencies**: `yjs`, `y-websocket`
- **Responsibilities**: Multi-user CRDT state sync for node positions, param changes, and run triggers

---

## 13. File Structure

```
spacegraph7/
├── packages/
│   └── n8n-bridge/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── spacegraph-n8n-bridge.ts  ← Core bridge
│       │   ├── WorkflowMapper.ts          ← n8n JSON ↔ GraphSpec
│       │   ├── N8nWorkflowPlugin.ts       ← SpaceGraph plugin
│       │   ├── N8nExecutionMonitorPlugin.ts
│       │   ├── N8nCollaborationPlugin.ts
│       │   ├── N8nVisionHealer.ts         ← Vision loop integration
│       │   ├── LangflowMigrator.ts        ← Import from LangFlow format
│       │   └── types.ts                   ← n8n-specific TypeScript types
│       ├── server/
│       │   ├── index.ts                   ← n8n server + WS relay
│       │   └── n8n-api-proxy.ts           ← REST proxy routes
│       └── examples/
│           ├── basic-workflow.ts          ← Simple load + render
│           ├── rag-agent.ts               ← RAG pipeline demo
│           └── multi-agent.ts             ← Swarm orchestration demo
│
└── src/
    └── nodes/
        ├── N8nTriggerNode.ts    ← NEW
        ├── N8nScheduleNode.ts   ← NEW
        ├── N8nHttpNode.ts       ← NEW
        ├── N8nAiNode.ts         ← NEW
        ├── N8nCodeNode.ts       ← NEW
        ├── N8nCredentialNode.ts ← NEW
        ├── N8nHitlNode.ts       ← NEW
        └── N8nVisionOptimizerNode.ts ← NEW
```

---

## 14. Performance Targets & Constraints

| Metric | Target | Strategy |
|---|---|---|
| FPS at 1,000 n8n nodes | ≥ 60 FPS | `CullingManager` + LODPlugin; virtualize off-screen nodes |
| Browser bundle size | < 200 KB | Externalize n8n server modules; lazy-import Monaco |
| Vision analysis latency | < 200ms (CPU), < 50ms (NPU) | Existing ONNX pipeline; RK3588 NPU path for OS deployment |
| Workflow sync latency | < 100ms | WS debounced at 300ms for param edits; positions sync immediately |
| Time-to-first-render | < 3s from workflow load | `WorkflowMapper` runs sync; BVH culling from frame 1 |
| Sub-30s vision heal loop | < 30s end-to-end | Vision → auto-layout → re-score pipeline target |
| 1000+ node workflow | Lazy load off-screen nodes | `CullingManager` + BVH (`three-mesh-bvh`) already in place |

---

## 15. Testing Strategy

### Unit Tests (Vitest)

Extend existing test suite (`test/`) with:

| Test | Coverage |
|---|---|
| `WorkflowMapper.toGraphSpec()` | Round-trip fidelity for all n8n node types |
| `N8nBridge.pushNodePositionUpdate()` | WS message format correctness |
| `N8nVisionHealer.healLayout()` | Mock vision scores → correct layout plugin invoked |
| LOD threshold logic on new node types | Correct widget shown at each camera distance |

### Integration Tests (Playwright)

Extend `test/vision.spec.ts`:

```typescript
test('n8n workflow renders without overlaps', async ({ page }) => {
  await page.goto('/demo/n8n-workflow.html');
  const vision = createVisionAssert(page);
  await vision.noOverlap();
  await vision.isLegible();
  await vision.expectedLayoutScore(70);
});

test('execution state changes node colors correctly', async ({ page }) => {
  // Trigger mock execution, assert node color change
});
```

### Bridge Server Tests

Use `supertest` to test the HTTP proxy and WebSocket relay in isolation, with n8n running against an in-memory SQLite DB.

### Vision Regression Gate

Add to existing GitHub Actions CI (`.github/workflows/`):
```yaml
- name: n8n workflow vision test
  run: npm run test:vision -- --grep "n8n"
```

---

## 16. Milestones & Sequencing

```
Week 1–2:  Phase 0 — Bridge Module
           ├── N8nBridgeServer (Node.js)
           ├── N8nBridge (browser WS client + RxJS)
           └── WorkflowMapper (n8n JSON ↔ GraphSpec)

Week 3–4:  Phase 1 — Workflow Rendering
           ├── New node types (N8nTriggerNode, N8nAiNode, N8nHttpNode, N8nCodeNode)
           ├── Edge type assignment logic in WorkflowMapper
           └── N8nWorkflowPlugin (PluginManager integration)

Week 5:    Phase 2 — Live Execution & Monitoring
           ├── Execution state visuals (GSAP animations)
           ├── FlowEdge particle system
           └── ExecutionLogPanel + Bottleneck Heatmap

Week 6–7:  Phase 3 — Embedded Widget Editing
           ├── LOD-driven widget reveal (all node types)
           ├── Two-way param sync (widget → bridge → n8n)
           ├── N8nCredentialNode + N8nHitlNode
           └── Node Palette panel

Week 8:    Phase 4 — AI Vision Loop
           ├── Vision pipeline triggers (on-load, post-execution, post-edit)
           ├── N8nVisionHealer
           └── Prompt-based workflow builder (/ key command)

Week 9–10: Phase 5 — LangFlow/Flowise Parity
           ├── RAG pipeline template
           ├── Multi-agent fractal nesting
           ├── Webhook portals + cron orbital timers
           ├── Export/Import (n8n JSON, GLTF, LangFlow migration)
           └── Y.js real-time collaboration

Week 11–13: Phase 6 — SpaceGraph OS Integration
           ├── Workflows as bootable OS process nodes
           ├── Fractal LOD infinite drill-down
           └── NPU acceleration hooks (RK3588)
```

### Dependency Graph

```
Phase 0 (Bridge)
   └── Phase 1 (Rendering)
         ├── Phase 2 (Execution)
         │     └── Phase 4 (Vision Loop)
         └── Phase 3 (Widgets)
               └── Phase 5 (Parity)
                     └── Phase 6 (OS)
```

---

## Appendix A: SpaceGraph API Reference Points

Key existing SpaceGraphJS APIs consumed by this integration:

| API | Location | Usage |
|---|---|---|
| `SpaceGraph.create(container, spec)` | `src/SpaceGraph.ts:94` | Entry point for rendering a workflow |
| `graph.addNode(nodeSpec)` | `src/core/Graph.ts` | Add n8n node to canvas |
| `graph.updateNode(id, patch)` | `src/core/Graph.ts` | Update execution state colors |
| `pluginManager.registerNodeType(name, cls)` | `src/core/PluginManager.ts` | Register new n8n node types |
| `VisionManager.analyzeVision()` | `src/core/VisionManager.ts` | Trigger vision quality check |
| `cameraControls.flyTo(target, z, dur)` | `src/core/CameraControls.ts` | Zoom to a specific node |
| `EventManager` (mitt-based) | `src/core/EventManager.ts` | Subscribe to node/edge events |
| `FlowEdge` | `src/edges/FlowEdge.ts` | Primary data flow edge |
| `HierarchicalLayout` | `src/plugins/HierarchicalLayout.ts` | Default workflow layout |
| `LODPlugin` | `src/plugins/LODPlugin.ts` | Distance-based widget reveal |
| `VisionOverlayPlugin` | `src/plugins/VisionOverlayPlugin.ts` | Live quality score UI |
| `ErgonomicsPlugin` | `src/plugins/ErgonomicsPlugin.ts` | Auto-fix overlaps |

---

## Appendix B: Open Questions & Risks

| Risk | Mitigation |
|---|---|
| n8n's ESM/CJS compatibility in Vite | Vite aliases + `build.rollupOptions.external` for server-side modules |
| Monaco editor bundle size (>4MB) | Dynamic import; only loaded when user zooms into a Code node |
| n8n API versioning breaking bridge | Pin n8n version in `package.json`; abstract behind typed bridge interface |
| WebGL + heavy DOM (Monaco, charts) performance | Virtual scrolling + `CullingManager`; test at 1000 nodes in CI |
| Real-time collaboration CRDT conflicts | Y.js handles automatically; test with 3+ concurrent users |
| Credential security in browser context | Never expose raw credentials to browser; always call bridge server proxy |
