# TODO15 — Durable action lifecycle: cancel, fork at entry, new conversation

> **Status: drafted (2026-11-24); no work landed yet.** TODO14 finished the atlas: octave sizing,
> wayfinding, minimal chrome, depth add-ons, engagement, and the ZUI follow-ups. Its only open items
> are measurement and density tuning, which this plan deliberately excludes. TODO15 closes the Core
> journey steps that TODO10–TODO14 recorded but never wired into the UI: prompt mode with cancel,
> fork at the selected entry, and a new conversation. All three have server routes or pure kit seams
> today; the work is client wiring, offline parity, and gates.

## 0. Baseline

- TODO12 §Core lists the unmet steps: prompt mode and cancel (`TODO12.md:277`, capability
  `submission.abort()` at `:128`); "Select an entry, Fork here → new tab with a `fork` edge back"
  (`:279`, capability `root.fork(entryId)` at `:131`); every step completable locally (`:287-290`).
- The server already implements `POST /api/conversations` (`src/server.ts:446-462`),
  `POST /api/conversations/:id/fork` with `{ entryId }` and a last-entry fallback (`:489-507`), and
  `POST /api/conversations/:id/abort` (`:522-528`). Prompt accepts `requestId` and `mode` and is
  idempotent by request id (`:472-487`).
- `forkOps` creates one boundary node and only recorded `fork`/`forkedFrom` edges
  (`src/translator.ts:304-321`). `TabRegistry.add(id, ops)` and `fork(from, to, version)` cover
  offline tabs (`../pi-kit/src/session.ts:51-60`, `:85-95`).
- The client has a prompt mode select and busy state (`src/client.ts:66-97`) but no cancel, no
  request-id feedback, and no new-conversation call. The Fork button always passes
  `entryId: undefined` (`client.ts:99-121`). The controls drawer has Fork / Approve / Export /
  Permalink / Catalog (`index.html:343-358`) and the prompt form has no Cancel (`index.html:409-415`).
- Selection is already address state: `host.address().focus` round-trips through permalink and
  `applyAddress` (`src/host.ts:1300-1315`, `:1334-1369`); `provenanceFor` supplies the inspector
  caption (`host.ts:552-556`). The `onFork` callback field is declared but unused (`host.ts:441-443`).
- Read-only gating already exists: `data-observer="true"` / `data-asof` hide and guard commit
  controls (`index.html:199-204`, `client.ts:72-75`, `:101`, `:125`). The `?` overlay is generated
  from one `KEY_BINDINGS` table (`client.ts:311-347`).
- Existing gates cover the adjacent journeys: `tests/first-run.spec.ts:4-42` (nine offline steps,
  blind fork at `:21`), `:73-101` (request-id idempotence); `tests/observer-ui.spec.ts:4-13`;
  `tests/a11y.spec.ts:25-51`, `:54-71`, `:102-117`; `tests/tabs.test.ts:18-26`;
  `tests/translator.test.ts:62-64`; `tests/scenarios.test.ts:8-11`, `:37-45`.

## 1. Invariants carried forward

1. **Committed truth is the only truth.** Every action adds or retires durable facts; deferred
   documents stay visible but never folded. No UI action invents an edge, a node id, or a result.
2. **One translation boundary.** Durable types stay in `src/server.ts`; the browser receives
   `AgentEvent`s and stable-id `KernelOp`s only. `verify` keeps the import guard and pinned versions.
3. **One owner, no competing harness.** No hosted Harness, no second storage owner, no browser-side
   replay writer in this plan. Observers remain separate read-only processes (`TODO13.md:29-32`).
4. **Recorded edges only.** Fork uses `fork`/`forkedFrom`; unknown kinds are ignored and the edge
   whitelist in `tests/scenarios.test.ts` does not grow.
5. **One position authority and one renderer contract.** No new contract field, camera, model, or
   hidden filter. Actions change the folded kernel, not the octave or layout authorities.
6. **Muting, never hiding.** Read-only and past states keep every control reachable in accessible
   names or the announcer; a hidden commit control is a typed, announced state, not a dropped one.
7. **Chrome stays minimal.** The H0 icon rail and one drawer own the new controls; canvas keeps ≥70%
   of viewport width. Every new control has `aria-label`, `title`, a keyboard path, and a help row.
8. **Offline parity.** A step that cannot be completed locally is a gate failure. Every online action
   has a deterministic local-feed equivalent with the same ids and edge kinds.
9. **Deterministic evidence.** Tests run from `app/pi-durable`, use injected clocks and pure `?shot`
   states, and assert behavior rather than implementation. No fixed sleeps, mocks, global state, or
   root test runs. A failed gate is reported, not retried to green.
10. **Phased gates.** No phase lands before the previous one passes the full ladder. One recapture
    only if the rendered output changes; no verdict is written in `review.json`.

## 2. Delivery order

| Phase | Stream | Why this order | Gate before the next phase |
| ----- | ------ | -------------- | -------------------------- |
| 1 — Cancel | A (abort, accepted feedback) | Cancel is the smallest unmet Core step and its server route already exists; it establishes the request-id and busy-state pattern used later. | Full ladder green; online and offline cancel both typed and announced; idempotent retry still yields one answer; read-only controls stay hidden. |
| 2 — Fork | F (fork at selected entry) | Uses the address focus and provenance already landed in TODO14; the server parameter and pure translator seam are ready. | Full ladder green; fork uses the selected entry and only recorded edges; tab view state stays independent; inspector and permalink round-trip. |
| 3 — New | N (new conversation, shared consistency) | A new tab completes the lifecycle and validates that all three actions obey the same read-only and a11y rules. | Full ladder green; nine-step journey runs keyboard-only in both feeds; no dead control at 375px and 900px; recapture only if chrome changed. |

Each row below names its phase. Stream G records the evidence common to all phases.

## 3. Phase 1 — Stream A: prompt cancel and accepted feedback

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| A0 | Add a Cancel control beside the prompt form and a `abort()` hook. Online, post to `/api/conversations/:id/abort` through the existing `postJSON` helper (`src/api.ts:37-42`); offline, clear busy state and announce that no network request was made. Keep mode and request id in the announcer. | Online and offline E2E asserts the busy flag clears, the announcer names the outcome, and no committed entry appears for an aborted request. |
| A1 | Treat request id as the idempotency key. The accepted response (`202 { status, requestId }`) is feedback only; it never becomes a kernel fact. A retry with the same id still produces one answer. | Extend `tests/first-run.spec.ts:73-101`; no extra message or answer node appears for a retried id. |
| A2 | Guard Cancel under `data-observer="true"` and `data-asof`; keep the control's text in `title` and the announcer when hidden. Add its click and shortcut rows to the generated `?` overlay. | `tests/observer-ui.spec.ts` and `tests/a11y.spec.ts` stay green; no hover-only control and no dead keyboard path. |

Stop rule: cancel changes request state, never the folded kernel. If an abort needs a new node, edge,
renderer field or hidden filter, report the gap and leave that path out.

## 4. Phase 2 — Stream F: fork at the selected entry

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| F0 | Derive `entryId` from `host.address().focus` when the selected node is a committed entry; otherwise keep the server's last-entry fallback and say so in the announcer. Online, send `{ entryId }` to the existing fork route. | E2E forks a selected message and asserts the new tab's boundary and `fork`/`forkedFrom` edges point to that entry, not just the head. |
| F1 | Offline parity through `forkOps` and `TabRegistry.fork(from, to, version)` with the same stable ids. No Durable type crosses into the browser. | `tests/first-run.spec.ts` fork step passes with an explicit selected entry; `tests/translator.test.ts` and `verify` stay green. |
| F2 | Wire the unused `onFork` hook so an inspector action can call the same path; caption it with `provenanceFor` so "Fork here" is grounded in a committed entry. | `tests/provenance.spec.ts` and `tests/provenance.test.ts` stay green; the inspector names the source entry after the fork. |
| F3 | Keep per-tab view state independent after a fork; the new tab opens at `fact`/`graph` with its own address, and the source tab is unchanged. | `tests/tabs.test.ts` and a permalink round-trip assert the two addresses diverge only by tab id and recorded fork. |

Stop rule: a fork is a recorded relation. Do not synthesize a conversation from a deferred document,
an observer stream, or a past-state view.

## 5. Phase 3 — Stream N: new conversation and shared consistency

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| N0 | Add a "New conversation" control to the H0 controls drawer. Online, post to `/api/conversations` and add the returned id through the existing registry path (`client.ts:113`); offline, add an empty tab with a stable local id and announce the offline nature. | Online and offline E2E creates a tab with no fabricated entries and no new edge kind. |
| N1 | Add `newTab`, `forkAt` and `abort` hooks with explicit typed outcomes; keep `onFork`/`onApprove` as the only callback fields the client binds. | Hook tests call each action once and assert the address, tab list, and announcer text; no hook writes global state. |
| N2 | Complete the keyboard-only nine-step journey in both feeds: prompt, cancel, select, fork here, approve, new, switch view, permalink, return. All Durable terms keep one-line glossary tooltips. | `tests/first-run.spec.ts` and `tests/a11y.spec.ts` pass at 375px and 900px; 44px targets and tab order hold. |
| N3 | Update `README.md` action list and the `?` overlay from the single `KEY_BINDINGS` table; no new runtime dependency and no new renderer contract. | `verify` guard passes; README lists cancel, fork-at-entry and new conversation with their shortcuts. |

Stop rule: no action may make the canvas scroll away from a committed fact. A step that cannot be
completed locally is a gate failure, not a documented exception.

## 6. Stream G — evidence common to all phases

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| G0 | At the end of each phase, run the full ladder once. Recapture only when rendered chrome changed; keep every `.prev` pair and the contact sheet. | Exact commands and results recorded in §9 progress. |
| G1 | Keep the gallery at the eleven tracked images unless a control changes the default frame; retire no PNG without a `.prev` pair and a refreshed contact sheet. | No verdict written in `review.json`. |
| G2 | Keep Strobe, node-area density tuning and idle-machine measurements out of this plan; TODO14 owns them. | No performance handle is recorded here. |

## 7. Verification ladder

```bash
pnpm --filter pi-durable typecheck          # types only
pnpm --filter pi-durable test               # pure action/id/edge tests
pnpm --filter pi-durable verify             # Pi import + dependency + docs guard
SG_DURABLE_PORT=<free> PI_DURABLE_SERVER_PORT=<free> pnpm --filter pi-durable test:e2e
SG_DURABLE_PORT=<free> PI_DURABLE_SERVER_PORT=<free> pnpm --filter pi-durable verify:visual
pnpm --filter pi-durable build              # static local-feed bundle
bun run check                               # canonical root lint and types
```

When port `5176` is occupied, set `SG_DURABLE_PORT` and `PI_DURABLE_SERVER_PORT` to free ports for
Playwright. Never use `8801` for `PI_DURABLE_SERVER_PORT`: `local-model.spec.ts` binds its own server
there. Run each gate once per change set; recapture once with `PI_DURABLE_FAUX_SEED=fixed` only if the
default frame changed.

## 8. Open questions and risks

- **Entry identity at the boundary.** A selected entry id must be recognized as a committed
  transcript entry before it is sent as `entryId`; otherwise the server silently falls back to the
  last entry. Decide the check once in a pure helper and announce the fallback.
- **Cancel semantics.** Abort is a request-level state, not a rollback. If a commit already landed,
  cancel cannot remove it. Tests must assert "no further entry" rather than "previous entry removed".
- **Request id lifetime.** Ids are idempotency keys for one prompt; they are not kernel nodes and
  must not appear in representation, provenance or instruments.
- **Offline fork version.** The local feed must fork the selected entry's version, not the latest
  revision. `TabRegistry.fork` already takes a version; verify the version comes from the selected
  entry's provenance.
- **Read-only paths.** Hidden controls must still be announced once on action attempt; do not render
  a disabled-looking commit button that cannot act.
- **Chrome pressure.** Three new controls belong in the existing drawer and prompt row. If they push
  the canvas below 70% width at `900×700`, combine or iconise them rather than growing the rail.
- **Visual cost.** A Cancel button may change the default frame. Recapture with the fixed seed and
  refresh the contact sheet; keep human verdicts external.

## 9. Progress

| Stream | Phase | State | Evidence |
| ------ | ----- | ----- | -------- |
| A — cancel and accepted feedback | 1 | Planned | Server route and prompt mode exist; no client cancel. |
| F — fork at selected entry | 2 | Planned | Server parameter, `forkOps` and address focus exist; client passes no entry id. |
| N — new conversation | 3 | Planned | Server route and `registry.add` exist; no client control. |
| G — evidence | all | Planned | Ladder in §7; no gate has run for this plan. |

### Verification evidence

None yet. Record each phase's command output here once, including free ports and any fixed cause.

## 10. Remaining work and decisions

1. Implement Stream A, then run the full ladder and record the result before starting Stream F.
2. Implement Stream F with the selected-entry check and offline fork version; run the ladder again.
3. Implement Stream N and the keyboard-only nine-step journey; run the final ladder once.
4. Recapture only if default chrome changed; keep `.prev` pairs and leave verdicts to a human.
5. Carry performance and density tuning back to TODO14; do not add them here.

Keep TODO13 as the record of the landed atlas and TODO14 as the record of the finished octaves and
wayfinding work. Record new work here only.
