# SpaceGraphJS — Software Roadmap

> **An interface that can finish itself.** Mechanism first, then continuity, then an experiment system
> that compares alternatives honestly. This document tracks reality; `TODO3.md` holds the active plan
> and its progress ledger.

---

## Current Status (2026-11-21)

Version `8.5.0`, alpha — not yet released to npm. The **mechanism layer is complete and verified**.
Workstreams A–F of `TODO3.md` are implemented, plus the code-side proof surface of G:

| Workstream                               | State     | What landed                                                                                                             |
| ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| A — Configuration spine                  | done      | 30-knob typed schema, provenance resolver, live panel, permalink v2, recorder/counterfactual replay                     |
| B — Navigation & continuity              | core done | navigation verbs + touch bindings, two-rung compositing, portal dissolve, ergonomic counters                            |
| C — Living rectangles & Pi orchestration | core done | instrument kit (two hosts), prompt/steer/approve/reject/retry/compare from graph affordances                            |
| D — One world & proliferation            | done      | one canvas / one `ScopeSimulation` / one cross-domain camera flight; domains born experimentable from the scaffold      |
| E — Experimentation program              | done      | seeded sampling, experiment layer, offline/online/human tiers, decision artifacts, negative results published verbatim  |
| F — Truth pass                           | done      | 13 ADRs, glossary, changelog, reconciled docs, isolated `scale` job, clean root `tsc` gate                              |
| G — Proof & delivery                     | partial   | code-side proof surface and decision seams landed; participant study, npm release and hosting are deferred               |

No immersive mode, ladder, gesture map or visual default has been promoted. Presets are examples,
never recommendations. The `n >= 5` study has no winner.

```
pnpm install                          # workspace
pnpm test                             # 852 unit tests
pnpm --filter pi test                 # 74 unit tests
pnpm --filter pi test:e2e             # 46 Playwright tests
pnpm --filter demo test               # 34 tests
pnpm run build                        # library, packages, demo
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

- **Scope engine:** `ScopeSpec → buildScopeTree → layoutScopes → ScopeHost → ScopeSimulation`, with
  portals, path-qualified IDs, pinning, warm starts, sleep, and animated frame origins.
- **Representation:** `representationRung` plus continuous `representationWeights` and
  `representationLayers`; legibility gates spectacle.
- **Motion:** `MotionDirector` with registered `flyTo`/`trace` camera handlers; reduced-motion parity.
- **Vision:** `createVisionLoop` (analyze → scores → host policy → measure again), `createVisionAssert`
  test gate, heuristics with report-only ONNX/hybrid strategies.
- **Transport:** `RenderModelPatch`/`createPatchPainter`, `diffKernels`, `GraphHistory`.
- **Domains:** four conforming domain packages built through `create-spacegraph`'s six-slot recipe.
- **Host systems (Pi):** 30-knob policy schema with provenance, live panel, permalink v2, session
  recorder with counterfactual re-scoring, navigation verb set, instrument kit, graph-driven
  prompt/steer/approve/reject/retry/compare, a public catalog that launches every preset and sampled
  experiment cell from its URL, one-shot startup fit-to-content, per-kind node/edge variety, and a
  transcript spine with expandable detail and a vertical scroll overview.

### Verification gates

| Gate            | Command                                   | Current          |
| --------------- | ----------------------------------------- | ---------------- |
| Unit tests      | `pnpm test`                               | 852 passing      |
| Pi unit tests   | `pnpm --filter pi test`                   | 74 passing       |
| Pi e2e          | `pnpm --filter pi test:e2e`               | 46 passing       |
| Demo unit tests | `pnpm --filter demo test`                 | 34 passing       |
| Demo e2e        | `pnpm --filter demo test:e2e`             | 21 passing       |
| Visual atlas    | `pnpm run verify:visual`                  | green            |
| Build           | `pnpm run build`                          | green            |
| Root `tsc`      | `pnpm exec tsc --noEmit -p tsconfig.json` | clean (0 errors) |

Budgets in `src/scale.ts` and `app/pi/scripts/scale.ts` are regression smoke gates only, not
optimization targets. `scale` runs in an isolated CI job so timing reflects the code, not concurrent
load.

---

## Remaining work (ordered by dependency)

Nothing is scheduled. Code-side work is complete; the proof/delivery items are fully deferred.

| Workstream      | Goal                                                 | State                                               |
| --------------- | ---------------------------------------------------- | --------------------------------------------------- |
| G proof surface | Launchable preset/experiment catalog on the flagship | done — `app/pi/src/catalog.ts`                      |
| G               | Study published, release live, hosted flagship       | deferred; naming pass / beta → 1.0 follows them     |

See `TODO3.md` §12 for the definition of done and §11 for explicit anti-goals.

---

## SpaceGraphOS Vision (long-term)

SpaceGraphJS is the graphics primitive for a larger GUI program: files, apps and processes as nodes in one
navigable world, with vision as a health instrument. The compositor, NPU acceleration and hardware stack are
research tracks, not scheduled product work. No XR/sound/haptics/gamepad default ships; seams stay
host-registered and report-only.

---

## What NOT To Build (deferred or rejected)

| Item                                                        | Reason                                      |
| ----------------------------------------------------------- | ------------------------------------------- |
| Workerization, text-renderer swaps, realtime transport      | No measured demand; budgets are smoke gates |
| Ten scheduled domains                                       | The scaffold makes each domain host work    |
| Library XR/sound/haptics/gamepad defaults                   | Seams stay host-registered                  |
| Docker image, proprietary deployment silos, IPFS, Nix flake | A library, not a service                    |
| A second position authority or `inferred-cause` edges       | Settled invariants (see `docs/adr/`)        |

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

| For...                                       | Read...                                       |
| -------------------------------------------- | --------------------------------------------- |
| Active plan and progress                     | `TODO3.md`                                    |
| Open questions and knob mapping              | `docs/not-decided.md`                         |
| Vocabulary (bands / levels / rungs / scopes) | `docs/glossary.md`                            |
| Settled decisions                            | `docs/adr/README.md`                          |
| Changelog and stability policy               | `CHANGELOG.md`, `docs/contract-versioning.md` |
| Vision and philosophy                        | `README.md`                                   |
| API reference                                | `pnpm run docs` → `docs/api/index.html`       |
| Host integration                             | `docs/host-integration.md`                    |
| Experiments                                  | `docs/experiments.md`                         |
| Scopes and depth                             | `docs/scopes.md`, `docs/world.md`             |
| CI and gates                                 | `docs/ci.md`                                  |
| Contributing                                 | `docs/CONTRIBUTING.md`                        |
