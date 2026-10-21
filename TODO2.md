# SpaceGraphJS — Agent Operating System & Visualization Platform

> **Vision document** — The long-term platform strategy. The OpenCode integration is the first reference implementation; see `../SPACEGRAPH.md` for OpenCode-specific details.

---

## 1. The Core Vision: Agent OS

SpaceGraphJS is not merely a graph visualization library. It is becoming an **operating system for agentic development** — a universal substrate that any agentic coding tool can plug into, providing:

| Layer | What it provides |
|-------|------------------|
| **Event ingestion** | Universal adapter interface: any agent tool → standard `RenderModel` |
| **Semantic model** | Nodes, edges, levels, layout, selectors — pure, tested, agent-agnostic |
| **Renderer contract** | `GraphRenderer` interface: 2D/3D/WebGL/Canvas/SVG backends, capability negotiation |
| **View controller** | `GraphController`: selection, focus, navigation trail, zoom bands, search, overlays |
| **Persistence & sharing** | Export (SVG/JSON/HTML), permalinks (`#graph:<node>`), session comparison |
| **Cross-session intelligence** | Recurring patterns, file hotspots, agent behavior profiles, error dashboards |
| **Multi-agent coordination** | Visualize handoffs, conflicts, parallel agents working on shared codebase |
| **Time-travel / replay** | Scrub through execution timeline, branch from any point, counterfactual exploration |
| **Codebase knowledge overlay** | Graph nodes linked to repo structure — files, symbols, dependencies, ownership |
| **Natural language query** | "Why did it refactor auth?" → graph highlights causal path |
| **Collaborative annotation** | Team notes, decisions, tags on graph nodes; shared investigation |

**Goal:** Every agentic tool (OpenCode, Hermes, Cursor, Copilot, etc.) implements a thin `SessionGraphAdapter` → standard `RenderModel`. SpaceGraphJS absorbs the visualization, navigation, and intelligence layer, becoming the **common substrate** for agentic development.

---

## 2. Target Users: All of Them

| User type | What the graph gives them |
|-----------|---------------------------|
| **Experienced devs debugging agents** | Causal paths, retry chains, subagent contributions — no mental reconstruction |
| **New/casual users** | Approachable visual map instead of intimidating terminal log; see *how* the agent thinks |
| **Team leads reviewing agent work** | Audit trails, decision links, exportable artifacts for code review |
| **Agent developers/researchers** | Execution visualization, behavior analytics, comparative studies |
| **Multi-agent teams** | Handoff visualization, conflict detection, shared context maps |

---

## 3. Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SPACEGRAPHJS PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Agent Tool A          Agent Tool B          Agent Tool C          ...      │
│  (OpenCode)            (Hermes)              (Competitor)                  │
│       │                    │                    │                            │
│       ▼                    ▼                    ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              SessionGraphAdapter (per agent tool)                   │   │
│  │  Agent events → standard RenderModel (nodes, edges, positions)      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    @spacegraphjs/adapter                             │   │
│  │  Domain → RenderModel pipeline, diffRenderModels, serialization     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          ▼                         ▼                         ▼             │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐     │
│  │ SpaceGraph    │        │ Cytoscape     │        │ SVG           │     │
│  │ Renderer      │        │ Renderer      │        │ Renderer      │     │
│  │ (2D+3D)       │        │ (2D Canvas)   │        │ (Static)      │     │
│  └───────────────┘        └───────────────┘        └───────────────┘     │
│          │                         │                         │             │
│          └─────────────────────────┼─────────────────────────┘             │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    @spacegraphjs/renderer (CONTRACT)                 │   │
│  │  RenderModel, GraphRenderer, RenderTheme, capabilities, FitOptions  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          ▼                         ▼                         ▼             │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐     │
│  │ GraphController│        │ Levels/Zoom   │        │ Navigation    │     │
│  │ (selection,   │        │ (bands,       │        │ (search,      │     │
│  │  focus, trail)│        │  semantic LOD)│        │  minimap,     │     │
│  └───────────────┘        └───────────────┘        │  a11y)        │     │
│                                                     └───────────────┘     │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐             │
│          ▼                         ▼                         ▼             │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐     │
│  │ Depth Spectrum│        │ Layout Engine │        │ Overlays      │     │
│  │ (flat,        │        │ (LaneLayout,  │        │ (turn-map,    │     │
│  │  layered,     │        │  Tree, Force) │        │  diff,        │     │
│  │  depth-stack) │        │               │        │  annotations) │     │
│  └───────────────┘        └───────────────┘        └───────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HOST INTEGRATIONS (thin wrappers)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  OpenCode:  packages/session-graph + packages/app/src/session/graph (DONE)  │
│  Hermes:    (planned) thin adapter + host UI                                │
│  Others:    (planned) same pattern                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Published Package Set (`CONTRACT_VERSION = 3`)

| Package | Version | Description |
|---------|---------|-------------|
| `spacegraphjs` | 8.4.0 | Core: graph, events, camera, plugins, nodes, edges, vision (dynamic) |
| `@spacegraphjs/renderer` | 0.3.0 | **Contract only** — `RenderModel`, `GraphRenderer`, `RenderTheme`, capabilities, `FitOptions` |
| `@spacegraphjs/adapter` | 0.2.0 | Domain → `RenderModel` pipeline, `diffRenderModels`, serialization |
| `@spacegraphjs/spacegraph-renderer` | 0.3.0 | 2D ortho + 3D perspective, CSS3D HTML cards, CSS2D edge labels |
| `@spacegraphjs/cytoscape-renderer` | 0.3.0 | 2D Canvas, clipped DOM card overlay, declared 3D no-op |
| `@spacegraphjs/svg-renderer` | 0.1.0 | Static SVG export, `InlineGraph`, serialization |

---

## 5. Generic Capabilities (Host-Agnostic)

| Capability | Module | Status |
|------------|--------|--------|
| Semantic levels / zoom bands | `spacegraphjs/levels`, `spacegraphjs/zoom` | ✅ Done |
| Layout strategies + placement engines | `spacegraphjs/layout` (LaneLayout + strategies) | ✅ Done (5 layouts) |
| Summary representations | `spacegraphjs/representations` (ribbon, matrix) | ✅ Done |
| Navigation (search, minimap, trail) | `spacegraphjs/navigation` | ✅ Done |
| View controller | `spacegraphjs/control` (`GraphController`) | ✅ Done |
| Accessibility (roving tabindex, ARIA) | `spacegraphjs/a11y` | ✅ Done |
| Depth spectrum | `spacegraphjs/depth` + contract `depths` | ✅ Done |
| Scoped overlay & code diff | `spacegraphjs/overlays` | ✅ Done |
| Static export (SVG/JSON/standalone HTML) | `@spacegraphjs/svg-renderer` | ✅ Done |
| Cross-session intelligence | `spacegraphjs/intelligence` | 🔄 Planned |
| Multi-agent coordination | `spacegraphjs/multiagent` | 🔄 Planned |
| Time-travel / replay | `spacegraphjs/replay` | 🔄 Planned |
| Codebase knowledge overlay | `spacegraphjs/codebase` | 🔄 Planned |
| Natural language query | `spacegraphjs/nlq` | 🔄 Planned |
| Collaborative annotation | `spacegraphjs/collab` | 🔄 Planned |

---

## 6. Strategic Roadmap

### 6.1 Immediate (1-2 months): Close OpenCode integration

| Task | Description |
|------|-------------|
| T8.1 | Fix all 4 red CI workflows |
| T8.2 | Make fork installable from clean clone |
| T8.3 | Library roadmap: budget CI, devtools, API docs, `vue-spacegraph` decision |
| T8.4 | Retire ad-hoc scripts → `docs/archive/` |
| T8.5 | Final capture set + demo video |
| T8.6 | Re-measure every number in docs |
| T8.7 | Freeze OpenCode graph code |
| T9 | Merge upstream `dev` |
| T10.1 | Publish SpaceGraphJS to npm |
| T10.2 | Cut `session-graph` branch consuming published packages |
| T10.3 | Hosted demo on GitHub Pages |
| T10.4 | Upstream RFC (after T2.2 measurement) |

### 6.2 Near-term (3-6 months): Platform expansion & exploratory R&D

| Priority | Area | Concrete explorations |
|----------|------|----------------------|
| **P1** | **Multi-agent collaboration viz** | Multiple agents working together, handoffs, conflicts, shared context |
| **P1** | **Time-travel / session replay** | Scrub execution timeline, branch from any point, counterfactual "what if" |
| **P1** | **Codebase knowledge overlay** | Graph nodes linked to repo structure — files, symbols, dependencies, ownership |
| **P1** | **Natural language query** | "Why did it refactor auth?" → graph highlights causal path |
| **P1** | **Collaborative annotation** | Team notes, decisions, tags on graph nodes; shared investigation |
| **P2** | **Session comparison view** | Side-by-side diff of two session graphs (same task, different runs) |
| **P2** | **Recurring error dashboard** | Aggregate: "This test fails in 40% of sessions; here's the pattern" |
| **P2** | **File hotspots map** | Which files agents touch most, where bugs cluster, ownership |
| **P2** | **Agent behavior profile** | Per-project stats: tools used, retry rates, avg session length |
| **P2** | **Hermes Agent integration** | Second reference implementation; validate adapter pattern |
| **P2** | **Competitor integrations** | Cursor, Copilot, etc. — prove universal adapter works |

### 6.3 Medium-term (6-12 months): Platform maturation

| Area | Vision |
|------|--------|
| **Agent OS substrate** | SpaceGraphJS becomes the common execution visualization layer for all agentic tools |
| **Standardized agent event protocol** | Like LSP for agents — common schema for tool calls, file ops, reasoning, delegation |
| **Plugin ecosystem** | Community-built renderers, layouts, overlays, intelligence modules |
| **Cloud-hosted collaboration** | Shared graph workspaces, real-time multi-user investigation, audit trails |
| **AI-assisted exploration** | "Summarize this failure," "Find similar patterns," "Suggest fix" via LLM on graph |
| **Enterprise features** | RBAC, compliance export, integration with CI/CD, incident response playbooks |

### 6.4 Cross-session intelligence (unblocked by single-session validation)

| Capability | Description | Seam |
|------------|-------------|------|
| **Session comparison** | Side-by-side diff of two attempts at same task | `data.sessionID`, stable IDs, `diffRenderModels` |
| **Recurring error detection** | Aggregate failures across sessions, find root causes | Export → analysis pipeline |
| **File hotspot map** | Which files agents modify most, bug correlation | `file` nodes + `writes` edges across sessions |
| **Agent behavior profiles** | Per-project: tool usage, retry rates, efficiency metrics | Canonical fixture + streaming metrics |
| **Knowledge graph accumulation** | Persistent repo map: symbols, dependencies, agent touches | `spacegraphjs/codebase` + git integration |

---

## 7. Future Seams (Platform Level)

| ID | Item | Unblock condition | Seam present |
|----|------|-------------------|--------------|
| D8 | **Multi-agent coordination viz** | Multiple agent tools integrated | Universal adapter + shared `RenderModel` |
| D9 | **Time-travel / replay engine** | Session recording + deterministic replay | `GraphController` + layout determinism |
| D10 | **Codebase knowledge overlay** | Repo indexing + symbol graph | `spacegraphjs/codebase` (planned) |
| D11 | **Natural language query interface** | LLM + graph traversal | Selectors (`why`, `forwardChain`, `ancestors`) |
| D12 | **Collaborative annotation layer** | Multi-user + persistence | Overlay system + export/import |
| D13 | **Standardized agent event protocol** | Multi-tool adoption | Adapter interface as de facto spec |
| D14 | **Plugin ecosystem** | External contributors | Renderer contract + capability flags |
| D15 | **Cloud collaboration backend** | Multi-user demand | `GraphController` + persistence layer |

---

## 8. Open Questions (Living Section)

> This section captures the "unpredictable paradigm shift" explorations. Add to it as we learn.

1. **What does "agent OS" mean concretely?** Is it a runtime, a protocol, a UI framework, or all three?
2. **Standardized agent event schema** — should we propose an open spec (like LSP) for agent tool events?
3. **Multi-agent conflict resolution** — when two agents edit the same file, how does the graph show it?
4. **Counterfactual exploration** — "what if the agent had taken the other branch?" — replay with modifications.
5. **Graph as prompt** — can users *author* agent tasks by drawing/editing the graph?
6. **Persistent agent memory** — graph as long-term memory across sessions, projects, teams.
7. **Visual debugging** — set breakpoints on graph nodes, inspect state at any point in execution.
8. **Agent swarm visualization** — dozens of agents working in parallel on a large codebase.
9. **Cost/token visualization** — overlay token usage, cost, latency on the graph.
10. **Custom domain-specific nodes** — let hosts define their own node kinds, edges, layouts.

---

## 9. Governance & Sustainability

- **License:** MIT
- **Governance:** Start lightweight (maintainers + contributors), formalize as adopters grow
- **Contributing:** `CONTRIBUTING.md`, `CODEOWNERS`, issue templates — evolve as needed
- **Release process:** Tagged versions, `test:publish` verification, npm publish order documented

---

## 10. Relationship to OpenCode Integration

The OpenCode integration (`../SPACEGRAPH.md`) is:

1. **Reference implementation** — proves the adapter pattern works
2. **Stress test** — real sessions, real UI, real performance requirements
3. **First adopter** — validates the contract, renderers, and generic capabilities
4. **Not the product** — SpaceGraphJS is the platform; OpenCode is one host

Other agent tools follow the same pattern: implement `SessionGraphAdapter` → consume platform capabilities.

---

*This vision evolves with the platform. The OpenCode integration is chapter 1; the agent operating system is the book.*