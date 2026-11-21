# SpaceGraphJS — Software Roadmap

> **An interface that can finish itself.** Mechanism first, then continuity, then an experiment system that
> compares alternatives honestly. This document tracks reality; `TODO3.md` tracks the active plan.

---

## Current Status (2026-11-21)

Version `8.5.0`, alpha — not yet released to npm. The **mechanism layer is complete and verified**: recursive
scopes, representation rungs, camera verbs, one position authority, an opt-in vision loop, capability-gated
sensory/scene/motion seams, incremental patch transport, four conforming domains, full-state permalinks,
annotations, audit reports, graph diffs, and the Pi flagship with a five-task study harness.

Workstreams A (configuration spine), B (navigation/continuity) and C (living rectangles/orchestration) of
`TODO3.md` are implemented and gated. D (one world), E (experimentation program), F (truth pass) and G
(study/release/proof) remain. The participant study has no winner; no immersive mode or visual default has
been promoted.

```
pnpm install            # workspace
pnpm test               # 814 unit tests
pnpm --filter pi test:e2e   # 38 Playwright tests
pnpm run build          # library, packages, demo
```

---

## Architecture Overview

Hosts own policy; the library owns mechanisms. Core never imports the renderer contract.

```
host (Pi / Graph IDE / demo)  ── policy schema, presets, panel, recorder, orchestration
        ↓
domain (agent / workflow / filesystem / data)  ── six-slot vocabulary + mapping + selectors
        ↓
kernel + layout + salience + motion + vision   ── pure mechanisms, one position authority
        ↓
renderer contract (@spacegraphjs/renderer)     ── swappable adapters: WebGL 2D/3D, Cytoscape, SVG
```

### Implemented mechanisms

- **Scope engine:** `ScopeSpec → buildScopeTree → layoutScopes → ScopeHost → ScopeSimulation`, with portals,
  path-qualified IDs, pinning, warm starts, sleep, and animated frame origins.
- **Representation:** `representationRung` plus continuous `representationWeights`; legibility gates spectacle.
- **Motion:** `MotionDirector` with registered `flyTo`/`trace` camera handlers; reduced-motion parity.
- **Vision:** `createVisionLoop` (analyze → scores → host policy → measure again), `createVisionAssert` test
  gate, heuristics with report-only ONNX/hybrid strategies.
- **Transport:** `RenderModelPatch`/`createPatchPainter`, `diffKernels`, `GraphHistory`.
- **Domains:** four conforming domain packages built through `create-spacegraph`'s six-slot recipe.
- **Host systems (Pi):** 29-knob policy schema with provenance, live panel, permalink v2, session recorder
  with counterfactual re-scoring, navigation verb set, instrument kit, and graph-driven prompt/steer/approve/
  reject/retry/compare.

### Verification gates

| Gate | Command | Current |
|---|---|---|
| Unit tests | `pnpm test` | 814 passing |
| Pi unit tests | `pnpm --filter pi test` | 50 passing |
| Pi e2e | `pnpm --filter pi test:e2e` | 38 passing |
| Visual atlas | `pnpm run verify:visual` | green |
| Build | `pnpm run build` | green |
| Root `tsc` | `pnpm exec tsc -p tsconfig.json --noEmit` | pre-existing `app/demo` errors remain (F work) |

Budgets in `src/scale.ts` are regression smoke gates only, not optimization targets.

---

## Near-Term (ordered by dependency, not date)

| Workstream | Goal | State |
|---|---|---|
| A | Any configuration is data; any experiment is a URL | done |
| B | One legible, interruptible descent; measurable ergonomics | core done; touch bindings and true rung compositing remain |
| C | The graph is a cockpit; detail rungs are instruments | core done; second host before promotion remains |
| D | One world canvas, isolated domains, new domains born experimentable | next |
| E | Any alternative can be tried, scored and decided as data | pending |
| F | Docs are true, gates are real, contract frozen | in progress |
| G | Study published, release live, hosted flagship | external, runs in parallel |

See `TODO3.md` §12 for the definition of done and §11 for explicit anti-goals.

---

## SpaceGraphOS Vision (long-term)

SpaceGraphJS is the graphics primitive for a larger GUI program: files, apps and processes as nodes in one
navigable world, with vision as a health instrument. The compositor, NPU acceleration and hardware stack are
research tracks, not scheduled product work. No XR/sound/haptics/gamepad default ships; seams stay
host-registered and report-only.

---

## What NOT To Build (deferred or rejected)

| Item | Reason |
|---|---|
| Workerization, text-renderer swaps, realtime transport | No measured demand; budgets are smoke gates |
| Ten scheduled domains | The scaffold makes each domain host work |
| Library XR/sound/haptics/gamepad defaults | Seams stay host-registered |
| Docker image, proprietary deployment silos, IPFS, Nix flake | A library, not a service |
| A second position authority or `inferred-cause` edges | Settled invariants |

---

## Release Checklist

```bash
pnpm run lint
pnpm run format:check
pnpm run build
pnpm test
pnpm --filter pi test
pnpm --filter pi test:e2e
pnpm run verify:visual
pnpm run test:publish
pnpm run docs       # TypeDoc, output gitignored
pnpm pack --dry-run
```

Release workflow: `test:publish` → build → npm via the existing workflow. No Changesets. The published study,
replayable sessions and launchable presets are the proof surface; distribution follows evidence.

---

## Document Map

| For... | Read... |
|---|---|
| Active plan and progress | `TODO3.md` |
| Open questions and knob mapping | `docs/not-decided.md` |
| Vision and philosophy | `README.md` |
| API reference | `pnpm run docs` → `docs/api/index.html` |
| Host integration | `docs/host-integration.md` |
| Experiments | `docs/experiments.md` |
| Scopes and depth | `docs/scopes.md`, `docs/world.md` |
| Contributing | `docs/CONTRIBUTING.md` |
