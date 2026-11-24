# TODO13 — Durable workspace: local model, richer representations, deferred surfaces

> **Status: proposed (2026-11-24).** TODO12 landed the Core, Next scenarios, scoped placements,
> gates, the opt-in OpenAI path and 22 tracked shots. This plan continues with three streams: a real
> offline model smoke test, denser and more varied visual evidence, and the surfaces TODO12 §11
> deferred. It deliberately opens a new plan instead of growing TODO12 beyond its stop rule.

## 0. Baseline

- TODO12 §13 records the landed state: one server-owned Harness, one SSE stream, per-tab kernels,
  `buildScopes` + `ScopeSimulation` placements, 22 named scenarios, a11y/restart/coverage gates,
  `PI_DURABLE_PROVIDER=openai` opt-in with typed `no-provider`, docs and a demo landing page.
- Local GGUF files exist at `/home/me/gguf` (symlink to `/home/me/notention9/models`), including
  `Qwen_Qwen3.5-0.8B-Q4_K_M.gguf` (553 MB), 2B (1.4 GB), 4B (2.9 GB) and a 3B Llama (1.9 GB).
  The 0.8B Q4 model is the smoke-test candidate.
- Current screenshots are sparse: cards show kind or label only, the rail lists minimal rows, edges
  have no captions, and large areas of the canvas are empty. A shot must explain a durable fact at a
  glance, not just prove that a canvas exists.
- Deferred list from TODO12 §11: code mode, images, remote/hosted Harness, `readOnly` observer,
  custom storage conformance, `snapshotAsOf` time travel, recorder/replay, and human verdicts. Human
  verdicts stay external; everything else is in scope here.
- The vision score is still a deterministic DOM/canvas heuristic, not a model verdict. Keep it; do
  not write a verdict into `review.json`.

## 1. Invariants carried forward

1. One owner for a storage directory. An observer is a separate process, never an in-app tab.
2. One SSE stream for the owner; additional read-only streams are separate, explicitly marked URLs.
3. One translation boundary: Durable facts become `AgentEvent`s then stable-id `KernelOp`s.
   Durable types never enter the browser outside the server adapter.
4. Committed state is truth. Deferred documents are visible but never folded as facts.
5. No inferred cause: emit only edges Durable records. Unknown kinds are ignored.
6. One position authority and capabilities-as-data: statuses, traces, sleep deadlines and boundaries
  live in `data`; no new renderer contract field or depth mode for a scenario.
7. Deterministic tests from package directories with injected clocks; no fixed sleeps, mocks, global
  `this`, `any` or tests from the repo root.
8. `server.ts` is the only Pi importer in `app/pi-durable`; `app/pi-kit` and the library import no Pi.
9. Screenshots are pure `?shot=<id>` states with a fixed faux seed. A live-model run is evidence of
  execution, not a visual gate.

## 2. Stream A — real offline model smoke test

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| A0 | Confirm the installed Pi AI 1.6.0 llama.cpp / llamacpp-embedded provider: import path, factory signature, model id, auth semantics, required env, and whether the WASM build needs threads or a worker. Record the exact shape in this plan before coding. | A0 note with exact imports and a one-paragraph boot recipe |
| A1 | Add `PI_DURABLE_PROVIDER=local` (alias `llamacpp`) to `src/server.ts`. Resolve `PI_DURABLE_MODEL_PATH` to a GGUF file, default to the 0.8B Qwen file when present, and read `PI_DURABLE_MODEL`/`PI_DURABLE_MODEL_CTX`/`PI_DURABLE_MODEL_MAX_TOKENS`. Skip faux seeding and fixture answers in local mode. Dynamic-import the provider so faux startup stays light. | Server boots offline with no key; health reports `provider: local`, `providerMode: live`, `model`, `modelPath`, no `providerError` |
| A2 | Typed errors: missing GGUF path, unreadable file, unsupported provider, and timeouts become `no-provider` / `model-unavailable` with a recovery string, never a bare stack. Named scenarios stay offline in local mode. | Keyless/missing-file paths covered by offline tests; live prompt covered by A3 |
| A3 | Smoke test: isolated server process, local 0.8B GGUF, one short prompt (`"Reply with exactly: ready."`), assert a committed assistant entry and a non-empty answer within a generous timeout. No screenshot, no API key, no network. Skip only when the model file is absent, with a visible skip reason. | `tests/local-model.spec.ts` passes (or reports a concrete missing-file skip) |
| A4 | Document local mode in the app README and plan progress: env table, first-call cost, expected RAM, and why it is not a visual gate. | Commands and env names exist; `verify` guard stays green |

Stop rule: if the installed provider cannot load the GGUF without a network fetch or native rebuild,
record the exact failure and keep faux as the default; do not add a compatibility shim.

## 3. Stream B — denser and more varied visual evidence

### B1 Node detail

- Friendly labels and a one-line "why" per card: role, status, deadline countdown, signal key, token
  count, head/checkpoint id, and the committed text or tool result. Use existing `data` on the node
  and `agentDomain` selectors; do not add a renderer field.
- `src/host.ts` adapter `extraNodeData` becomes a single summary builder used by graph, tasks and
  timeline placements. The rail inspector shows the same fields plus stable id and edge kinds.
- A status legend maps warning/success/error/running tones to durable meanings.

Exit: `vision()` counts visible `[data-kind]` cards and summaries; a dedicated test asserts that a
sleeping task card contains its signal and a deadline, and that a message card contains its text.

### B2 Edge and scope readability

- Caption edges with their recorded kind (`orders`, `owns`, `sleeps-on`, `delegates`, `retry`,
  `checkpoint`, `fork`) using the renderer's existing edge-label path.
- Use adapter lane labels / axis labels for the three placements instead of relying on position only.
- Tighten the layout so cards occupy the stage; keep one position authority.

Exit: screenshot tests assert edge captions and lane labels exist; no card overlaps in the captured
frame at 1600x1000 and at 900x700.

### B3 Additional representations

Each is a placement of the same folded kernel, selected by `?shot=<id>` or a view button, not a new
panel per capability:

| View | Shows | Source |
| ---- | ----- | ------ |
| `diff` | Two tabs compared with `diffKernels`: added/removed nodes and edges | `tabKernel` for the active and a selected peer tab |
| `trace` | `pi.durable.*` spans as a trace facet with no causal edges | `data.trace` |
| `docs` | Built-in and host documents (`pi.live`, `pi.inbox`, `pi.usage`, `app.todos`) with deferred marked | doc nodes from the translator |
| `transcript` | Ordered entries with compact text, boundaries and compaction heads | `orders` + `checkpoint` edges |

Exit: four new URL states and shots (`diff`, `trace`, `docs`, `transcript`), each with a test that
asserts the representation and that no new causal edge was invented.

### B4 Shot matrix refresh

- Extend `src/shots.ts` catalog and `docs/screenshots/README.md` with B3 shots and any new B1/B2
  detail shot. Recapture all shots once with `PI_DURABLE_FAUX_SEED=fixed` and regenerate the contact
  sheet. Keep `.prev` pairs; no verdict is written automatically.
- Update the demo landing page to embed the strongest four images from the new matrix.

Exit: `shots:all` green, every shot has a `.prev` pair on re-capture, vision scores above the gate,
and README tables match the catalog exactly.

## 4. Stream C — deferred surfaces from TODO12 §11

| ID | Surface | Design | Exit evidence |
| -- | ------- | ------ | ------------- |
| C1 | Code mode | Install `createCodemodeExtension` with `CodemodeSandbox` in the server registry. One scenario commits a `code()` call with nested tool results and a journaled restart. Browser sees action nodes and artifacts only. | `code-mode` scenario, fold test, restart test, shot |
| C2 | Images | Use `createNodePhotonImages` + fit extension behind an opt-in env; a scenario commits a tool result with a small generated PNG as an image artifact. Card shows a bounded thumbnail from existing `data`, never a new contract field. | `images` scenario, one deterministic tiny PNG fixture, test, shot |
| C3 | Read-only observer | A second process opens the JSONL directory with `{ readOnly: true }` and serves `/events/observe` on a separate port. `?observer=1` renders that stream as a historical view; all action controls are absent and commit attempts return typed `read-only`. | Observer process test: owner writes, observer reads, observer commit rejected; shot |
| C4 | Time travel | Read documents at a stored `at` / `snapshotAsOf` point via `?asOf=<seq>`; render a read-only historical view with a badge. Current view stays the default. | `time-travel` scenario with two committed states, test that past view differs from present, shot |
| C5 | Recorder/replay | Record host actions (prompt, fork, approve, view switch) as a deferred `app.replay` document; `?replay=<id>` replays them against the local feed with an injected clock. No model calls. | `tests/replay.test.ts` with deterministic event sequence; shot |
| C6 | Storage conformance | Run upstream `registerStorageConformance` against Memory, JSONL and SQLite plus one in-repo custom storage adapter. No UI. | `tests/storage-conformance.test.ts` green for all backends |

Stop rule: a surface that needs a competing owner inside the same page, a network fetch, or a new
renderer contract is split into its own change set and reported rather than forced into the Core.

## 5. Verification ladder

```bash
pnpm --filter pi-durable check:fast          # types + pure tests
pnpm --filter pi-durable verify              # dependency + docs allowlist guard
pnpm --filter pi-durable test:e2e            # journey, a11y, resume, provider, new streams
pnpm --filter pi-durable shots:all           # full gallery + before/after pairs
pnpm --filter pi-durable verify:visual       # vision-gated shot matrix
pnpm --filter pi-durable build               # static local-feed bundle
pnpm run check                              # canonical root lint and types
```

Run each gate once per change set; a failed gate is reported as failed and never retried to green.
The live model smoke test is separately invoked and its skip reason is reported.

## 6. Open questions and risks

- Which installed Pi AI module exposes the local provider, and whether `llamacpp-embedded` is present
  in the pnpm store. A0 resolves this before A1; everything else in Stream A depends on it.
- GGUF load time and RAM for the 0.8B model; the smoke test uses a generous timeout and keeps the
  live run out of the visual gate.
- Edge captions and lane labels must reuse the renderer's existing capabilities; if a new contract
  field appears necessary, stop and propose it instead of adding one silently.
- Code mode and images may pull heavy optional packages; keep them behind dynamic imports so the
  provider-free default still paints in under two seconds.
- Human verdicts on new pairs remain an external gate; this plan never writes one.

## 7. Progress

| Stream | State | Evidence |
| ------ | ----- | -------- |
| A — local model smoke | Proposed | A0 not started |
| B — visual detail and representations | Proposed | No code changed |
| C — deferred surfaces | Proposed | No code changed |

Update this table at the end of each change set with the exact commands and results. Keep TODO12 as
the record of the landed Core; record new work here only.
