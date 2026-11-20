# Semantic wrappers — the worked recipe

**Status:** canonical. **Derived from:** `@spacegraphjs/agent` + the reference flagship host. **Audience:** a
team adding a new domain to SpaceGraphJS without changing the library.

This document is the recipe. It turns the agent/Pi implementation into a repeatable sequence of files,
types and gates. Goal: a new semantic domain can adopt the stack by filling in the same slots, while
the library stays ignorant of the domain.

---

## 1. The one-way rule

```
host events → domain event mapper → KernelOp → Kernel
                                         │
                                         ▼
                          domain build() → domain view
                              │                    │
                     selectors / facets      ModelAdapter
                              │                    │
                              └────► PiHost ◄──────┘
                                        │
                         contract renderer registry
                                        │
                                  SpaceGraph 2d/3d
```

Dependencies point one way: **host → domain → kernel → shared**. Nothing under `src/` or `packages/`
imports a host or a provider SDK. the flagship host's `scripts/verify.ts` enforces this; copy that guard into
every wrapper host. A wrapper is vocabulary, mapping and selectors — never a library API change.

Library layers you consume (do not modify):

| Need                                | Package / entry                                               |
| ----------------------------------- | ------------------------------------------------------------- |
| Kernel and `defineDomain`           | `@spacegraphjs/kernel`                                        |
| Generic event type, view shape      | `@spacegraphjs/shared`                                        |
| Event → `KernelOp` mapping          | your own `mapping.ts` (the agent wrapper's is the model)      |
| Selectors, facets, trace vocabulary | your own `selectors.ts`, `facets.ts`                          |
| View → `RenderModel`                | `@spacegraphjs/adapter` (`ModelAdapter`)                      |
| Renderer, contract, gating          | `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer` |
| Scopes, recursion, physics          | `spacegraphjs` (`ScopeHost`, `ScopeSimulation`, `ScopeSpec`)  |
| Levels, motion, vision, export      | `spacegraphjs/levels`, `/motion`, `/vision`, `/experiments`   |

---

## 2. The six slots

A wrapper is six files (plus tests). Fill them in order.

### Slot 1 — Vocabulary (`vocabulary.ts`)

Declare the domain's kinds and edges as open-ended string unions, not enums. Read host tags first,
fall back to a kind map, then to the raw kind. This is the single place where domain meaning is named.

```ts
export const AGENT_KINDS = [
    'run',
    'unit',
    'message',
    'action',
    'artifact',
    'state',
    'retry',
] as const;
export const EDGE_KINDS = ['contains', 'orders', 'writes', 'delegates', 'retry'] as const;
```

Reference: `packages/domain/agent/src/vocabulary.ts`. Key exports:

- `roleOf` / `relationOf` — host tag (`data.role` / `data.relation`) beats the default map beats the
  raw kind. Never reject an unknown kind.
- `AGENT_RELATIONS` — a convention over ordinary edge kinds; a host may tag its own edges with
  `data.relation` and the selectors keep working.
- `agentVocabulary: DomainVocabulary` — `lanes`, `levels`, `laneOf`, `scopeIdOf`, `shapeOf`,
  `statusOf`, `edgesVisibleAt`. These are _advisory projections_, not constraints.
- `buildAgentView(kernel)` — maps `Kernel` → `AgentView` (`GraphViewData` + `root`, turns, active
  turn). It carries `data` through verbatim; it does not invent causes.
- `agentDomain = defineDomain<AgentView>({ id, manifest, build, vocabulary })` — `defineDomain` is an
  identity helper for inference (`packages/kernel/src/domain.ts`). `manifest()` returns structural
  `DomainManifestEntry[]` (`id`, `values`, `source`, optional `capability`).

### Slot 2 — Event → `KernelOp` mapper (`mapping.ts`)

A translator, not a framework. It converts provider-neutral events into `add-node` / `add-edge` ops
with stable, path-qualified IDs. The agent wrapper's `AgentEventMapper` is ~150 lines of exhaustive
switch. Rules:

- Ids are `[prefix, runId, unitId, ...parts].join(':')`. Stable ids make retries idempotent.
- Emit ordinary `contains` / `orders` / `writes` / `delegates` edges. **Never emit an
  `inferred-cause` edge** — that would bake a host's causal claim into the model.
- Unknown data is stringified into `node.data`; the domain never interprets provider payloads.
- The mapper holds only an ordinal counter and the current unit id. No host vocabulary inside.

Reference: `packages/domain/agent/src/mapping.ts`.

### Slot 3 — Selectors and facets (`selectors.ts`, `facets.ts`)

Selectors answer the investigative questions over the _built view_. They return `AnswerTrace`
(`answerIds`, `contextIds`, `answerEdgeIds`) or rich records; they never mutate.

- Graph walks (`why`, `ledHere`, `downstream`, `upstream`, `related`) share one `walk(view, start,
direction, kinds)` helper with an edge-kind set.
- Rich selectors (`failureDetails`, `changedFiles`, `delegationContributions`) carry turn context,
  paths, writers and readers so a host can render a self-contained answer.
- `facetAccessors` maps nodes to generic search facets (`isFailedTool`, `isFileWrite`,
  `isSubagentCall`, `isRetry`, …). `traceVocabulary` declares provenance/read/downstream edge kinds.
  Both use generic role names only.

Reference: `packages/domain/agent/src/selectors.ts`, `packages/domain/agent/src/facets.ts`.

### Slot 4 — View → `RenderModel` (`adapter.ts` in the host)

`ModelAdapter` (`packages/adapter/src/ModelAdapter.ts`) applies **host policy**: which nodes a level
shows, which edges survive, the DOM card budget, card/band markup, focus dimming and lane/axis
captions. The adapter is where `AgentView` becomes a `RenderModel`. Policy is a host concern; keep it
out of the domain package.

```ts
// host side — illustrative shape
const adapter = new ModelAdapter({
    nodeFilter: (view, level) => levelNodes(view, level),
    edgeFilter: (view, level, focus, candidates, visible) => visibleEdges(candidates, visible),
    cardBudget: (level) => CARD_BUDGETS[level],
    renderCardTemplate: (node, level, ctx) => cardHtml(node, level, ctx),
    neighbors: (view, id) => neighborhood(view, id),
});
```

`adapterConformance(adapter, fixture)` (`packages/adapter/src/conformance.ts`) is the portable test:
one node per visible id, positions honoured, card budget honoured, focus neighbourhood honoured,
bands behind content, edges mapped. A wrapper copies a fixture that names its own card, structural
node, chip and focus neighbourhood. See `packages/adapter/test/adapter.test.ts` and the workflow
wrapper's `conformance.test.ts`.

### Slot 5 — Host policy (`host.ts`, `policy.ts`, `scopes.ts`)

The host owns everything that is a _choice_:

- **Clock and simulation** — one frame clock advances the scope simulation, camera director,
  activity decay and vision sampling; it sleeps when settled and pauses on a hidden tab.
- **Freeform by default** — `ScopeSimulation` with zero gravity, repulsion + edge attraction,
  cooling, sleep, warm starts and pinning. A scope may opt into lanes/grid/tree via
  `ScopeSpec.strategy`; never make lanes the global default.
- **One position authority per view** — the scope simulation owns coordinates. `PhysicsPlugin`
  (gravity 0) is pointer play in a separate engine-mode page, reconciled at rest. Never both on one
  node.
- **Levels and budgets** — zoom drives `overview/execution/detail` with hysteresis and a DOM card
  budget per level (Pi uses 12/40/24). Manual pinning stays available.
- **Scopes** — `agentScopes(view)` maps run → turn → delegated subtree → leaves to validated
  `ScopeSpec[]` with path-qualified ids, portals and cross-scope edges.
- **Contract gating** — `supports(...)` / `supportsDepth(...)` gate every affordance. No
  `renderer === '...'` branches. Unsupported depth modes no-op.

Reference: the flagship host's `src/host.ts`, `src/policy.ts`, `src/scopes.ts`.

### Slot 6 — Verification (`verify`, tests, gallery)

A wrapper ships its own gates. Pi's `package.json` scripts are the template:

| Check                       | Command                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| Fold, selectors, scope tree | `pnpm --filter <host> test` — real kernel + fixture, no mocks              |
| Adapter contract            | `adapterConformance` case list in the domain/host test                     |
| Browser + hybrid surface    | `pnpm --filter <host> test:e2e`                                            |
| Vision gate                 | `pnpm --filter <host> verify:visual` — `createVisionAssert` on every scene |
| Scale                       | `pnpm --filter <host> scale` — assert measured budgets                     |
| One-way dependency          | `pnpm --filter <host> verify` — no host/provider imports in library        |

An evidence-only gallery is part of the contract: every advertised capability runs library code and
asserts non-empty evidence and unique ids. The flagship gallery lives in the host's `src/capabilities.ts`.

---

## 3. The agent + Pi worked example

Concretely, the flagship is assembled from these files:

| Role                                                | File                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| Domain vocabulary and `defineDomain`                | `packages/domain/agent/src/vocabulary.ts`                            |
| Event → `KernelOp`                                  | `packages/domain/agent/src/mapping.ts`                               |
| Investigative selectors                             | `packages/domain/agent/src/selectors.ts`                             |
| Facet / trace vocabulary                            | `packages/domain/agent/src/facets.ts`                                |
| Provider translation (the only provider-aware file) | host `src/server.ts` + `src/pi-events.ts`                            |
| Event decode                                        | host `src/ops.ts`                                                    |
| Canonical provider-free fixture                     | host `src/fixture.ts`                                                |
| Host policy                                         | host `src/host.ts`, `src/policy.ts`, `src/scopes.ts`, `src/theme.ts` |
| Engine-mode physics page                            | host `src/engine.ts`, `engine.html`                                  |
| Gallery / evidence                                  | host `src/capabilities.ts`                                           |
| Contract guard                                      | host `scripts/verify.ts`, `scripts/publish-check.ts`                 |

The five investigative questions are _capabilities backed by selectors_, not UI labels. Each one
calls a selector over `buildAgentView(kernel)` and returns evidence ids; the hybrid surface
(`log / map / hybrid`, transcript always mounted) reveals the answer. The transcript is the ergonomic
bridge: the user picks a question, not a mode.

the `window.__pi` hooks (`hooks()` in the flagship host's `src/host.ts`) exposes the state a study needs: `surface`,
`arrangement`, `setSurface`, `setArrangement`, `capabilities`, `run`, `evidence`, `reveal`, `follow`,
`setFollow`, `advance`, `settle`, `vision`, `activity`, `fps`, `export`, `scopes`, `simulation`. A
study harness drives these hooks; see `docs/pi-study.md`.

---

## 4. Generality: the workflow domain

`packages/domain/workflow` is the second wrapper. It follows the same six slots with workflow
vocabulary (`workflow`, `subworkflow`, `step`, `run`, `trigger`, `artifact`) and relations
(`contains`, `orders`, `delegates`, `writes`, `retries`). It exists to prove the recipe, not to add a
library API. Its conformance test composes `adapterConformance` with a domain fixture. Start there
when adding a third domain.

Two wrappers can compose without sharing a model. Mount each domain in its own canvas through the
contract renderer, then connect one node per canvas with an `InterGraphEdge`: its endpoint projection
reads each node's own camera, and the dashed path lives in a single page-level SVG overlay. Neither
graph can resolve the other's IDs. The compositional demo in the demo app shows the agent wrapper and
the workflow wrapper in one workspace with exactly one cross-canvas link; keep models isolated and
the overlay as the only bridge.

---

## 5. Anti-patterns

- **A provider SDK import inside a package.** Only the app's `server.ts` may import provider types.
- **A library API added for a host affordance.** If a node class or edge animation is core-only, keep
  it on the engine-mode page. The contract boundary is a feature, not an obstacle.
- **A causal edge the events did not assert.** `writes` / `delegates` / `orders` are facts;
  `inferred-cause` is a claim a host must not smuggle into the model.
- **Two position authorities.** Scope simulation wins; physics is isolated and reconciled at rest.
- **Lanes as the default.** Freeform zero-g is the default; lanes are one opt-in scope policy.
- **A capability without evidence.** Every gallery entry must run code and return non-empty ids.

---

## 6. Links

- [`docs/PLAN/INDEX.md`](PLAN/INDEX.md) — plan navigation.
- [`docs/scopes.md`](scopes.md) — scope tree, policies and the vision → policy → motion loop.
- [`docs/world.md`](world.md) — sound/haptics/WebXR stay host-registered adapters.
- [`docs/not-decided.md`](not-decided.md) — immersion and flagship renderer are host decisions.
- [`docs/pi-study.md`](pi-study.md) — the five-task experiment protocol and harness.
- The flagship host's `README.md` — its commands and gates.
