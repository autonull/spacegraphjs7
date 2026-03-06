# Phase 2: Productization & Usability (UX/DX)

## 2.1 The Core Insight

**SpaceGraphJS has a fundamental UX paradox:**

> It's a **self-building UI library**, but developers must manually build everything.

The AI vision system that can "see, verify, and self-correct" is buried in spec docs—not embedded in the developer workflow. This creates maximum friction for the very audience it should empower.

**Current State:**

```
Developer reads spec → Manually writes code → Manually runs demo → Manually checks quality
```

**Vision-Closed State:**

```
Developer specifies intent → AI builds → Vision verifies → AI self-corrects → Developer reviews
```

---

## 2.2 Usability Friction Log

| #       | Friction Point                                 | Severity    | User Impact                         | Effort to Fix |
| ------- | ---------------------------------------------- | ----------- | ----------------------------------- | ------------- |
| **F1**  | No npm package                                 | 🔴 Critical | Can't `npm install spacegraphjs`    | Low           |
| **F2**  | No quickstart tutorial                         | 🔴 Critical | No path from zero to working graph  | Medium        |
| **F3**  | No live demo (CodeSandbox/StackBlitz)          | 🔴 Critical | Can't try before cloning            | Low           |
| **F4**  | Vision system not integrated into dev workflow | 🔴 Critical | Core differentiator is theoretical  | High          |
| **F5**  | No CLI scaffolding tool                        | 🟡 High     | Manual setup for new projects       | Medium        |
| **F6**  | API docs incomplete                            | 🟡 High     | Can't discover node/edge types      | Medium        |
| **F7**  | No TypeScript types published                  | 🟡 High     | No autocomplete in IDE              | Low           |
| **F8**  | No example gallery                             | 🟡 High     | Can't see what's possible           | Medium        |
| **F9**  | No CONTRIBUTING.md                             | 🟢 Medium   | Contributors don't know how to help | Low           |
| **F10** | No CHANGELOG.md                                | 🟢 Medium   | Can't track progress                | Low           |

---

## 2.3 Time-to-Hello-World Analysis

**Current TTHW:** Unknown (no documented path)

**Target TTHW:** <5 minutes

### Current Path (Assumed)

```
1. Clone repo
2. ??? (no install instructions)
3. ??? (no build command documented)
4. ??? (no demo to run)
5. Read 1500-line spec to understand API
```

### Target Path

```bash
# Option A: npm (fastest)
npm install spacegraphjs
npx sg6 create my-graph
cd my-graph && npm run dev
# → Browser opens at localhost:5173 with working graph

# Option B: Direct import
import { SpaceGraph } from 'spacegraphjs';
```

---

## 2.4 The Vision-First DX Revolution

**This is the key differentiator:** SpaceGraphJS should be the first UI library where **the AI builds with you, not for you**.

### Vision-Closed Development Experience

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision';

export default defineConfig({
    plugins: [
        spacegraphVision({
            mode: 'dev', // 'dev' | 'ci' | 'build'
            autoFix: true,
            checks: ['layout', 'legibility', 'overlap', 'color'],
            thresholds: { layout: 80, legibility: 85 },
            // Real-time feedback in dev server
            liveOverlay: true, // Show vision analysis in browser overlay
        }),
    ],
});
```

```typescript
// In development, vision reports in real-time:
//
// ┌─────────────────────────────────────────────────┐
// │  Vision Analysis (Live)                         │
// ├─────────────────────────────────────────────────┤
// │  Layout Quality: 72/100 ⚠️                      │
// │  ├─ Issue: Node overlap detected (3 nodes)      │
// │  └─ Auto-fix applied ✓                          │
// │                                                 │
// │  Text Legibility: 94/100 ✓                      │
// │  WCAG AA: Pass ✓                                │
// │                                                 │
// │  Color Harmony: 68/100 ⚠️                       │
// │  ├─ Suggestion: Increase contrast on labels     │
// │  └─ [Apply Suggestion] [Ignore]                 │
// └─────────────────────────────────────────────────┘
```

---

## 2.5 Prioritized Fix List

### 🔴 P0: Foundation (Week 1)

| Task   | Description              | Effort  | Impact                         |
| ------ | ------------------------ | ------- | ------------------------------ |
| **T1** | Publish npm package      | 2 hours | Enables all adoption           |
| **T2** | Write QUICKSTART.md      | 4 hours | First working graph in 5 min   |
| **T3** | Create live demo         | 1 hour  | Instant try-before-clone       |
| **T4** | Add package.json scripts | 30 min  | `npm run dev`, `npm run build` |

### 🟡 P1: Vision Integration (Week 2-3)

| Task   | Description                    | Effort  | Impact                           |
| ------ | ------------------------------ | ------- | -------------------------------- |
| **T5** | Build Vite vision plugin       | 8 hours | Real-time AI feedback in dev     |
| **T6** | Create vision overlay UI       | 4 hours | Visual quality dashboard         |
| **T7** | Implement auto-fix CLI         | 6 hours | `npx sg6 fix --layout`           |
| **T8** | Add vision assertions to tests | 4 hours | `await visionAssert.noOverlap()` |

### 🟢 P2: Developer Experience (Week 4-5)

| Task    | Description                      | Effort   | Impact                      |
| ------- | -------------------------------- | -------- | --------------------------- |
| **T9**  | Create sg6 CLI scaffolder        | 8 hours  | `npx sg6 create my-project` |
| **T10** | Build example gallery (10 demos) | 12 hours | Show what's possible        |
| **T11** | Write API docs (TypeDoc)         | 6 hours  | Autocomplete + reference    |
| **T12** | Add CONTRIBUTING.md              | 2 hours  | Enable contributors         |

### 🔵 P3: Polish (Week 6)

| Task    | Description               | Effort  | Impact                      |
| ------- | ------------------------- | ------- | --------------------------- |
| **T13** | Create demo video (2 min) | 4 hours | Show vision self-correcting |
| **T14** | Build landing page        | 8 hours | First impression matters    |
| **T15** | Set up Matrix community   | 1 hour  | Early adopter hub           |

---

## 2.6 Implementation: Quickstart Template

````markdown
# Quickstart (5 minutes)

## Install

```bash
npm install spacegraphjs three
```
````

## Create your first graph

```typescript
// main.ts
import { SpaceGraph } from 'spacegraphjs';

const graph = SpaceGraph.create('#container', {
    nodes: [
        { id: 'a', type: 'ShapeNode', label: 'Node A', position: [0, 0, 0] },
        { id: 'b', type: 'ShapeNode', label: 'Node B', position: [100, 0, 0] },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'Edge' }],
});

graph.render();
```

## Run with vision

```bash
npx sg6 dev
# Opens browser with live vision overlay
```

## Auto-fix issues

```bash
npx sg6 fix --all
# AI detects and fixes layout, color, overlap issues
```

```

---

## 2.7 The Self-Assembly Workflow

```

┌─────────────────────────────────────────────────────────────┐
│ The SpaceGraphJS Self-Assembly Loop │
├─────────────────────────────────────────────────────────────┤
│ │
│ 1. Developer writes minimal spec │
│ `ts                                                   │
│     const graph = { nodes: [...], edges: [...] };           │
│     ` │
│ │
│ 2. AI generates initial layout │
│ → Force-directed placement │
│ → Color scheme selection │
│ → Node sizing │
│ │
│ 3. Vision models analyze output │
│ → LQ-Net: Layout quality = 65/100 ⚠️ │
│ → ODN: 12 overlaps detected │
│ → TLA: 3 illegible labels │
│ │
│ 4. AI self-corrects │
│ → Applies force-directed fix │
│ → Adjusts node positions │
│ → Increases font sizes │
│ │
│ 5. Vision re-verifies │
│ → Layout quality = 91/100 ✓ │
│ → Overlaps = 0 ✓ │
│ → Legibility = 98/100 ✓ │
│ │
│ 6. Developer reviews & approves │
│ → Accepts changes │
│ → Commits to project │
│ │
│ Total time: 45 seconds │
│ Traditional time: 30+ minutes │
│ │
└─────────────────────────────────────────────────────────────┘

```

---

## 2.8 Phase 2 Deliverables Summary

### Usability Friction Log
✅ **10 friction points identified** (4 critical, 4 high, 2 medium)

### Time-to-Hello-World Strategy
✅ **Target: <5 minutes** via npm + quickstart template

### Prioritized Fix List
✅ **15 tasks across 4 weeks** (P0 foundation → P3 polish)

### Vision-First DX Design
✅ **Real-time overlay** showing AI analysis during development
✅ **Auto-fix CLI** for one-command quality improvements
✅ **Self-assembly workflow** documented as core differentiator
```
