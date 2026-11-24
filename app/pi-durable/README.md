# app/pi-durable

A private workspace consumer that turns durable Pi sessions into a navigable graph. One Node process
owns one Harness; the browser holds conversation views as kernel state and switches tabs without
remounting a session. SpaceGraphJS has no knowledge of Pi, and the library's default host does not
change.

![One durable turn](../../docs/screenshots/pi-durable/basic-turn.png)

![Forked tabs](../../docs/screenshots/pi-durable/fork-tabs.png)

```bash
pnpm install
pnpm --filter pi-durable dev          # server 8788 + Vite 5176 → http://localhost:5176
pnpm --filter pi-durable check:fast   # types + translator/fold/tab tests
pnpm --filter pi-durable verify:fast  # check:fast + browser journey
pnpm --filter pi-durable shots:focus  # four Core shots + before/after pairs
pnpm --filter pi-durable shots:phase2 # task-graph and timeline shots
pnpm --filter pi-durable shots:all    # every Core and Next scenario shot
pnpm --filter pi-durable verify:visual
pnpm --filter pi-durable verify       # dependency and docs allowlist guard
pnpm --filter pi-durable build        # static bundle, boots from the local feed
```

No provider, key or fixture command is needed: the default Harness uses a faux provider over JSONL
storage in the gitignored `.pi-durable/` directory. `PI_DURABLE_PROVIDER=openai` opts into a live
OpenAI model with `OPENAI_API_KEY` and an optional `PI_DURABLE_MODEL`; it skips faux fixture seeding,
reports its mode in `/api/health`, and returns a typed `no-provider` error without a key. Named
scenarios stay offline in that mode.

## First-run journey

1. `pnpm --filter pi-durable dev` with no environment variables.
2. First paint shows the **root** tab, a seeded transcript with order edges, a run node, and one
   sleeping approval task. Badges report `provider: faux · storage: jsonl · 1 task sleeping`.
3. Prompt "Capital of France?" → a user node, then the deterministic "Paris." answer. The form
   stays usable while the run settles; select `steer` or `followUp`, or cancel with the API.
4. The **Tasks** view shows the signal and deadline. **Approve** wakes the task and records its result.
5. Select an entry and press **Fork** → a new tab with a `fork` edge back; each tab keeps its own
   selection, camera, view and transcript position.
6. `Ctrl+C`, restart: conversations and tasks are recovered from storage; a retried `requestId`
   returns the original submission and adds no second answer.
7. `[` / `]` switch tabs; **Copy** writes a permalink carrying the active tab.
8. `/` focuses the prompt, `?` toggles help, `g` cycles graph/tasks/timeline, `Esc` clears overlays.
   Export produces JSON, a session document, SVG or Markdown.
9. `pnpm --filter pi-durable build` serves the same page from a local op feed with no server.

Keyboard traversal, a roving-tabindex ARIA tablist with RTL arrows, live announcements, 44px
targets, glossary tooltips and a narrow layout are part of the gate, not polish.
`tests/a11y.spec.ts` checks all of them; `tests/resume.spec.ts` stops and restarts a server on an
isolated JSONL directory to prove recovery without a duplicate answer.

## Scenarios and URL state

`?scenario=<id>` boots one named fixture without a server; `?shot=<id>` does the same and selects the
shot's view. `src/scenarios.ts` is the single catalog: each row names a `Core` or `Next` coverage row
from the plan, a deterministic view, tasks, expected stable ids and the test that guards it. `?s=<tab>`
restores the active tab; `?seed=<name>` varies faux answers for capture runs.

The four Core shots are `basic-turn`, `sleeping-approval`, `fork-tabs` and `resumed`. Phase 2 adds
`task-graph` and `timeline`, two placements of the same folded kernel: the first scopes ownership and
wait edges, the second scopes the `orders` chain. Neither adds a renderer branch. The remaining
shots demonstrate one `Next` row each: busy inbox, extension sections, tool calls, system prompts,
per-conversation agents, settings, environment, reload, reset/handoff, compaction, agent-event traces,
subagent reports, child tasks, host-owned documents, usage and typed errors. `pnpm --filter
pi-durable shots:all` captures every one; the contact sheet keeps before/after pairs without writing
a verdict.

## Environment

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PI_DURABLE_LOCAL_FEED` | off in dev | Marks the browser harness as a local fixture run |
| `PI_DURABLE_STORAGE` | `jsonl` | `jsonl`, `memory` or `sqlite` store |
| `PI_DURABLE_DIR` | `.pi-durable` | JSONL directory; an isolated directory is used by the restart test |
| `PI_DURABLE_PROVIDER` | `faux` | `faux` (default) or `openai` (opt-in live mode) |
| `PI_DURABLE_MODEL` | `gpt-4o-mini` | Model id for `openai` mode; faux mode always uses `faux-1` |
| `OPENAI_API_KEY` | unset | Required when `PI_DURABLE_PROVIDER=openai`; otherwise prompts fail with typed `no-provider` |
| `PI_DURABLE_FAUX_SEED` | `fixed` | Keeps screenshot answers deterministic |
| `PI_DURABLE_SERVER_PORT` | `8788` | Node server port |
| `PI_DURABLE_WEB_PORT` | `5176` | Vite port |
| `SG_DURABLE_SHOTS` | `docs/screenshots` | Screenshot output directory |
| `SG_DURABLE_SHOT` | all | Comma-separated shot ids |

## Server API (Core)

| Route | Purpose |
| ----- | ------- |
| `GET /events` | One SSE stream; `id:` is the conversation id and `data:` is one `KernelOp` |
| `GET /api/health` | Harness state, storage, provider and recovered task count |
| `GET /api/conversations` / `POST /api/conversations` | Conversation registry |
| `POST /api/conversations/:id/prompt` | `{ text, mode: steer\|followUp, requestId }` |
| `POST /api/conversations/:id/fork` | `{ entryId }` → new conversation |
| `POST /api/conversations/:id/signal` | `{ key, value }` wakes a sleeping task |
| `POST /api/conversations/:id/abort` | Withdraw queued work |
| `GET /api/scenarios` / `POST /api/scenarios/:id/load` | Named sessions |
| `GET /api/export?format=json\|session\|svg\|md` | Model, session document, SVG or transcript |

Errors are typed (`no-provider`, `unknown-conversation`, `run_failed`, `turn_limit`, `invalid_park`,
`read-only`) and carry a recovery action instead of a stack.

## Layout

- `src/server.ts` — the only file that imports Pi packages: Harness, faux models, registry, JSONL
  storage, routes and the single SSE stream.
- `src/translator.ts` — pure `Durable view → AgentEvent → KernelOp` translation. Stable ids,
  one node per fact, no inferred cause.
- `src/scenarios.ts` — one deterministic fixture per coverage row, with expected ids and tests.
- `src/local-feed.ts` — deterministic ops for the built page and every shot.
- `src/client.ts` — one `EventSource` demultiplexed on `lastEventId`; DOM and keyboard binding.
- `src/host.ts` — one renderer restored from the active tab's kernel and view state; kit `buildScopes`
  feeds one `ScopeSimulation`, which places the graph, tasks and timeline views of that same kernel.
- `src/shots.ts` — shot catalog; `?shot=<id>` reproduces each state from pure data.

The shared pipeline lives in `app/pi-kit` (ops/demux, `TabRegistry`, session/workspace state, scope
builder, theme, fixtures). It imports no Pi and no UI chrome. `app/pi` re-exports its `ops.ts` from the same kit;
neither app's state machine is shared.

## Glossary

A **conversation** owns a transcript of committed **entries**. A **commit** is one atomic durable
write. A **doc** is a built-in view such as `pi.live`, `pi.inbox` or `pi.usage`. A **task** is a durable
state machine that can sleep on a **signal**. A **fork** starts a new conversation at an existing
entry. Edges are drawn only for links Durable records.

Upstream design: [pi-durable spec](https://github.com/earendil-works/pi/tree/main/packages/durable).
Pin 1.6.0; the API changes without notice between releases.

## Troubleshooting

- `Pi import outside server.ts` from `pnpm --filter pi-durable verify`: move the import into the
  server adapter; the kit and library never depend on Pi.
- Empty canvas after a build: open the page without `?shot`; the static bundle boots from the local
  feed and needs no server.
- A shot looks stale: `pnpm --filter pi-durable shots:focus` copies the old PNG to `.prev` and writes
  a contact sheet with before/after pairs. No verdict is written automatically.
