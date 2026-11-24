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
- B1/B2 improved the shots: friendly labels, committed-detail summaries, captioned edges and a legend.
  They still use one full-size PNG per state, most nodes render at one size, and the gallery has 22
  near-duplicate frames. A shot must show a sequence and a size hierarchy, not just prove a canvas
  exists.
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
| A0 | Done. Pi AI 1.6.0 has **no** in-process GGUF provider; `llamacpp-embedded` is not published and not installed. Use `createProvider` + `openAICompletionsApi()` against an external `llama-server`. Keyless auth must still resolve `{ auth: { apiKey: 'local' } }` for the completions API. | This row: exact imports and boot recipe below |
| A1 | Add `PI_DURABLE_PROVIDER=local` (alias `llamacpp`) to `src/server.ts`. Validate `PI_DURABLE_MODEL_PATH`, connect through `createProvider` + `openAICompletionsApi()` to `PI_DURABLE_MODEL_URL` (default `http://127.0.0.1:9931/v1`), with `PI_DURABLE_MODEL`, `PI_DURABLE_MODEL_CTX` and `PI_DURABLE_MODEL_MAX_TOKENS`. Skip faux seeding and fixture answers in local mode. Import the completions API dynamically so faux startup stays light. | Server boots offline with no key; health reports `provider: local`, `providerMode: live`, `model`, `modelPath`, `baseUrl`, no `providerError` |
| A2 | Typed errors: missing GGUF path, unreadable file, unsupported provider, and timeouts become `no-provider` / `model-unavailable` with a recovery string, never a bare stack. Named scenarios stay offline in local mode. | Keyless/missing-file paths covered by offline tests; live prompt covered by A3 |
| A3 | Smoke test: isolated server process, local 0.8B GGUF, one short prompt (`"Reply with exactly: ready."`), assert a committed assistant entry and a non-empty answer within a generous timeout. No screenshot, no API key, no network. Skip only when the model file is absent, with a visible skip reason. | `tests/local-model.spec.ts` passes (or reports a concrete missing-file skip) |
| A4 | Document local mode in the app README and plan progress: env table, first-call cost, expected RAM, and why it is not a visual gate. | Commands and env names exist; `verify` guard stays green |

**A0 boot recipe (landed).**

```bash
llama-server -m /home/me/gguf/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 9931 -c 2048 -ngl 0 --reasoning off
PI_DURABLE_PROVIDER=local \
PI_DURABLE_MODEL_PATH=/home/me/gguf/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf \
PI_DURABLE_MODEL_URL=http://127.0.0.1:9931/v1 \
  pnpm --filter pi-durable dev
```

`--reasoning off` matters: Qwen3.5 spends its whole token budget on `reasoning_content` otherwise and
returns an empty `content`. The test starts its own server on port 9932 with that flag.

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

### B1b Importance-sized cards and visual variety

- Assign each node an importance tier and feed the adapter's existing `nodeSizeFn` and a custom card
  template: `conversation`, `run`, the active/selected task, compaction/handoff boundaries and the
  committed answer are large (more padding, larger type, status pill); messages and tool actions are
  medium; docs, config and deferred state are compact chips. The tier comes from committed `data`,
  not from a renderer branch.
- Give tiers distinct treatments inside the durable palette (flat panels, an accent rule for a
  boundary, dashed border for deferred docs), deliberately **not** the Pi Agent demo's glass/glow
  styling. Share semantics with that demo — `diffKernels`, agent "why" selectors, scope simulation
  and the replay idea — but keep this app's chrome, palette, typography and card proportions.
- At least one screenshot must make the size hierarchy obvious: one large conversation/answer node
  surrounded by smaller evidence nodes.

Exit: a test asserts `${data-importance}` classes and three distinct rendered sizes in one frame;
the vision score still gates the shot.

### B2 Edge and scope readability

- Caption edges with their recorded kind (`orders`, `owns`, `sleeps-on`, `delegates`, `retry`,
  `checkpoint`, `fork`) using the renderer's existing edge-label path.
- Use adapter lane labels / axis labels for the three placements instead of relying on position only.
- Tighten the layout so cards occupy the stage; keep one position authority.

Exit: screenshot tests assert edge captions and lane labels exist; no card overlaps in the captured
frame at 1600x1000 and at 900x700.

### B3 Additional representations

Each is a placement of the same folded kernel, selected by `?shot=<id>` or a view button, not a new
panel per capability. Reuse the Pi Agent demo's **functions** (`diffKernels`, selectors, scope
simulation, recorder patterns) without copying its visual language:

| View | Shows | Source |
| ---- | ----- | ------ |
| `diff` | Two tabs compared with `diffKernels`: added/removed nodes and edges | `tabKernel` for the active and a selected peer tab |
| `trace` | `pi.durable.*` spans as a trace facet with no causal edges | `data.trace` |
| `docs` | Built-in and host documents (`pi.live`, `pi.inbox`, `pi.usage`, `app.todos`) with deferred marked | doc nodes from the translator |
| `transcript` | Ordered entries with compact text, boundaries and compaction heads | `orders` + `checkpoint` edges |

Exit: four new URL states and shots (`diff`, `trace`, `docs`, `transcript`), each with a test that
asserts the representation and that no new causal edge was invented.

### B4 Story composites instead of one PNG per state

One story = one tracked composite that shows a **sequence of motion**, not one static frame per
scenario. This cuts the gallery from 22 PNGs toward roughly 10: four full-resolution Core heroes for
README embedding, plus six story composites.

| Story | Frames (captured from pure `?shot`/`?scenario` state) |
| ----- | ---------------------------------------------------- |
| `turn-flow` | seeded conversation → prompt submitted → answer committed |
| `task-wake` | sleeping approval → Approve pressed → task settled |
| `fork-journey` | fork created → child tab active → diff of parent and child |
| `resume-journey` | compaction boundary → historical `asOf` view → resumed answer |
| `inspect-flow` | usage → agent-event trace → host documents |
| `child-flow` | subagent report → child tasks → typed error with recovery |

Implementation:

- Capture each frame at a lower viewport (start with 800×500) in one Playwright page, driving
  `window.__durable` hooks (`applyShot`, `setTab`, `prompt`, `viewName`, `reveal`) with a fixed seed.
  Wait for stable viewport between frames; never encode a private camera path.
- Compose frames into one PNG per story inside the browser with a `<canvas>` drawn from the captured
  frame data URLs, adding a short caption per frame. Use a 2×2 grid for four frames or a 3×1 strip
  for three; output stays 1600×1000 so existing README embeds keep their aspect ratio. No new image
  dependency (`canvas` is only an indirect jsdom dependency, not an app dependency).
- Store composites under `docs/screenshots/pi-durable/stories/<id>.png`; keep four Core heroes
  (`basic-turn`, `fork-tabs`, `sleeping-approval`, `resumed`) at full resolution. Retire the
  superseded individual Next PNGs once composites are tracked; keep `.prev` pairs for everything
  that remains.
- `scripts/shot.ts` gains `shots:stories` and a `--composite` path; `shots:all` becomes heroes +
  stories. The contact sheet shows composites with before/after pairs, not a wall of near-duplicate
  single frames. Recapture once with `PI_DURABLE_FAUX_SEED=fixed`; no verdict is written.

Exit: tracked gallery shrinks, `shots:all` green, each composite has 3–4 legible frames with captions,
total screenshot bytes drop versus the current 22 PNGs, and `docs/screenshots/README.md` plus the
demo landing page list stories instead of retired single frames.

## 3b. Stream D — the Durable Atlas: an iconic fractal ZUI

Ambition: turn the workspace from a diagnostic panel into a navigable instrument. One folded kernel,
five zoom rungs, one visual grammar, no new renderer contract. The signature is a **survey mark** —
nested squares turned 45°, drawn from theme tokens in SVG/CSS — used in the brand, the overview and
the focus reticle. It is original to this app; the Pi Agent demo's glass/glow language stays out.

**Design canon**

- Rungs are places, not filters. Zoom changes what a committed fact means at that scale; it never invents an edge or hides committed truth.
- Ink and vellum: deep ink ground, muted panels, cyan survey lines, amber waits, vermilion failures. Flat surfaces, hairline rules, small-caps captions, monospaced ids. No glass, no glow.
- One authority: kit scopes own targets, the simulation owns the current frame, the adapter owns level-of-detail, the host owns rung semantics, theme tokens own colour.
- Motion is an eased dive and surface with a crossfade between rungs; reduced motion falls back to an instant cut. No parallax jitter, no bounce.
- Every rung is legible at 900×700 and 1600×1000, mirrored under RTL, and reachable by keyboard.

| ID | Rung or capability | Design | Exit evidence |
| -- | ------------------ | ------ | ------------- |
| D1 | Five named rungs | `cosmos` (whole workspace), `territory` (conversations/tasks), `passage` (turns), `fact` (entries/edges), `grain` (raw document fields). Use `spacegraphjs/zoom` `ZoomBands` with hysteresis over `normalizeZoom(zoom, range)`; `src/rungs.ts` keeps rung policy in host data. `deriveZoom` and `representationLayers` remain the library routes for deeper LOD. | `?rung=<name>` states; `tests/rungs.spec.ts` asserts fewer nodes at `cosmos` than `fact`, a permalink that round-trips the rung, and that a zoom gesture changes rung. |
| D2 | Dive and surface | Wheel/pinch and double-click arm semantic zoom; `zoomBy` and the rung switch drive explicit dives. Next: `ScaleDomain.sample()` and `representationChanges` for eased rung crossfades, with reduced-motion cutting instantly. Camera stays per tab in `ViewState`. | Keyboard + pointer Playwright test; focus state survives tab switch; no renderer contract field. |
| D3 | Survey overview | A corner survey plate draws folded positions and a viewport reticle; click or arrow keys pan. Native `Navigation.project`/`GraphMinimap` is the refinement path; the first slice stays host-owned SVG. | Overview test: reticle tracks viewport; click changes centre; RTL mirrors the gutter. |
| D4 | Trail and address | Breadcrumb `cosmos › territory › passage › fact` doubles as a copyable permalink; `?rung=` and `?s=` round-trip. | Permalink test; reload restores rung, tab and camera. |
| D5 | Atlas plates | Story composites become engraved plates: numbered captions, the survey mark, a scale bar, and a rung legend. Four heroes stay full-resolution. | Seven plates recaptured; contact sheet shows plates; no new standalone PNGs. |
| D6 | Workshop and plate surfaces | C1 code mode reads as nested workshops (program → calls → artifacts). C2 images read as bounded plate insets inside a fact card. Both keep the ink/vellum grammar. | `code-mode` and `images` story frames; tests assert action/artifact nodes and image data only. |
| D7 | Performance and grace | Fractal culling by rung via `rungView`, cached fold and scope targets, `applyNodeBudget`/`SpatialIndex2D` for larger kernels, dynamic imports for code mode/images. Cold paint under two seconds with no provider. | Strobe measurement recorded; reduced-motion and no-provider paths green. |

Stop rule: if a rung needs a new renderer contract field or a second owner, keep the rung as a host
data facet and report the gap instead of adding a parallel camera or panel.

## 4. Stream C — deferred surfaces from TODO12 §11

| ID | Surface | Design | Exit evidence |
| -- | ------- | ------ | ------------- |
| C1 | Code mode | Install `createCodemodeExtension` with `CodemodeSandbox` in the server registry. One scenario commits a `code()` call with nested tool results and a journaled restart. Browser sees action nodes and artifacts only. | `code-mode` scenario, fold test, restart test, shot |
| C2 | Images | Use `createNodePhotonImages` + fit extension behind an opt-in env; a scenario commits a tool result with a small generated PNG as an image artifact. Card shows a bounded thumbnail from existing `data`, never a new contract field. | `images` scenario, one deterministic tiny PNG fixture, test, shot |
| C3 | Read-only observer | A second process opens the JSONL directory with `{ readOnly: true }` and serves `/events/observe` on a separate port. `?observer=1` renders that stream as a historical view; all action controls are absent and commit attempts return typed `read-only`. | Observer process test: owner writes, observer reads, observer commit rejected; shot |
| C4 | Time travel | Read documents at a stored `at` / `snapshotAsOf` point via `?asOf=<seq>`; render a read-only historical view with a badge. Current view stays the default. | `time-travel` scenario with two committed states, test that past view differs from present, shot |
| C5 | Recorder/replay | Record host actions (prompt, fork, approve, view switch) as a deferred `app.replay` document; `?replay=<id>` replays them against the local feed with an injected clock. No model calls. | `tests/replay.test.ts` with deterministic event sequence; shot |
| C6 | Storage conformance | Run upstream `registerStorageConformance` against Memory, JSONL and SQLite plus one in-repo custom storage adapter. No UI. | `tests/storage-conformance.test.ts` green for all backends |

The "shot" in each row above is a story frame, not a new standalone PNG: C1 joins `inspect-flow`,
C2/C3 join a new `host-boundary` story, and C4/C5 join `resume-journey`.

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
- D rungs must be host data facets over the same folded kernel. If a rung needs a second camera, another renderer contract field or a competing owner, stop and report the gap.
- The survey mark is drawn from theme tokens, not a bitmap, so light/dark and custom themes stay consistent; RTL mirrors the overview gutter without mirroring node ids.
- Fractal culling must never drop committed truth: a coarse rung summarises, it does not delete edges from the fold.
- Human verdicts on new pairs remain an external gate; this plan never writes one.

## 7. Progress

| Stream | State | Evidence |
| ------ | ----- | -------- |
| A — local model smoke | Landed | `PI_DURABLE_PROVIDER=local` with OpenAI-compatible `llama-server`; `tests/local-model.spec.ts` passes with the 0.8B Qwen GGUF (13 s); README env table updated |
| B — visual detail and representations | Landed | B1/B2: friendly labels, per-card summaries, edge captions, legend, richer inspector; `tests/detail.spec.ts`. B1b/B3: importance tiers (`hero`/`medium`/`compact`) from committed `data`, `nodeSizeFn` + card template, lane/axis captions, four re-placements (`diff`, `trace`, `docs`, `transcript`), `tests/representations.spec.ts`. B4: seven tracked composites in `docs/screenshots/pi-durable/stories/`, four Core heroes retained, 18 near-duplicate Next PNGs retired (gallery 2.4 MB → 1.2 MB), `tests/stories.spec.ts`, `shots:stories` and `--composite`, contact sheet/docs/landing page updated. Frames are captured at 1600×1000 and drawn into 800×500 grid cells: the lower viewport made the mobile rail dominate the frame. Gates 2026-11-24: `pnpm check:fast` (39 tests), `pnpm verify`, `pnpm build`, `pnpm verify:visual` (5 tests), `pnpm shots:all` (4 heroes + 6 stories), root `pnpm run check` all green. |
| C — deferred surfaces | In progress | C3/C4/C5/C6 landed 2026-11-24: observer process (`PI_DURABLE_OBSERVER=1`, `/events/observe`, typed `read-only`, `tests/observer.test.ts`, `tests/observer-ui.spec.ts`); `?asOf=<seq>` snapshots with badge (`tests/time-travel.test.ts`, `tests/time-travel.spec.ts`); deferred `app.replay` recorder/replay (`tests/replay.test.ts`); upstream `registerStorageConformance` for memory, custom delegating adapter, JSONL and SQLite behind `PI_DURABLE_CONFORMANCE=1` (`tests/storage-conformance.test.ts`). Seven composites now include `resume-journey` as-of/replay frames and a new `host-boundary` story. Gates: `pnpm check:fast` (48 vitest tests), `pnpm verify`, `pnpm shots:stories` (7 composites), `pnpm test:e2e` (30 tests), `pnpm verify:visual`, root `pnpm run check` green. Playwright starts the observer on `PI_DURABLE_SERVER_PORT + 12` so spawn-based tests keep their own ports. C1/C2 remain proposed; see the stop-rule note below. |
| D — iconic fractal ZUI | In progress | D1/D3 first slice landed: survey-mark brand, five-rung switch/permalink, `ZoomBands` zoom-driven rungs, host-data `rungView` filters, corner survey plate with click/arrow pan (`src/rungs.ts`, `src/host.ts`, `tests/rungs.spec.ts`). Native library routes identified for the rest: `ScaleDomain`/`representationChanges` (D2), `Navigation.project`/`GraphMinimap` (D3 polish), `applyNodeBudget`/`SpatialIndex2D` (D7). D2 crossfade, D4 deep-link codec, D5 plate restyling, D6 C1/C2 surfaces and D7 strobe remain. Both missing C dependencies are cached for one offline install. First-slice gates: `pnpm check:fast` (48 vitest tests), `pnpm verify`, `pnpm build`, `pnpm test:e2e` (30 tests, including `rungs.spec.ts`), `pnpm shots:focus`, root `pnpm run check` all green. |

C1/C2 dependency gap, since closed: `createCodemodeExtension` is exported from
`@earendil-works/pi-durable/codemode`, but its required `CodemodeSandbox` comes from
`@earendil-works/pi-codemode/portable`; C2's `createNodePhotonImages()` needs
`@silvia-odwyer/photon`'s WebAssembly. Neither package was installed as a direct dependency. Both
versions (`pi-codemode@1.6.0`, `photon@0.3.3`) are already in `pnpm-lock.yaml` and the local pnpm
store, so the next change set can add them offline and land C1/C2 together with the first D rungs.
C3/C4/C5/C6 need no new dependency and are landed.

Update this table at the end of each change set with the exact commands and results. Keep TODO12 as
the record of the landed Core; record new work here only.
