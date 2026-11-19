# app/pi

The Pi reference app: a private pnpm workspace consumer that embeds Pi in a Node process, turns its
events into `KernelOp`s and renders them through an unmodified SpaceGraphJS. SpaceGraphJS has no
knowledge of this app; see `pnpm --filter pi verify`.

```bash
pnpm --filter pi dev      # Node op server + Vite client, one command
pnpm --filter pi test     # translation, fold and capability tests (no provider needed)
pnpm --filter pi verify   # one-way dependency guard
pnpm --filter pi build
```

## Layout

- `src/server.ts` — Node HTTP server: `/events` (SSE) and `POST /prompt`. This is the only file that
  imports Pi packages; it translates `AgentSessionEvent`s through `src/pi-events.ts` into the generic
  `AgentEvent` type from `@spacegraphjs/agent`.
- `src/client.ts` — `EventSource` → `Kernel` → `agentDomain.build` → `GraphController` → `SpaceGraphRenderer`.
- `src/capabilities.ts` — the capability gallery and test hooks (`window.__pi`), driven by a local
  kernel-op feed so CI never needs a provider.
- `src/theme.ts` — host CSS tokens → `RenderTheme`.

## Provider

Live mode needs a model and credentials for that provider (for example `ANTHROPIC_API_KEY`). With no
model available, `createAgentSession()` succeeds but the page reports that no provider is configured
and prompting returns 503. `PI_LOCAL_FEED=1 pnpm --filter pi dev` replays a deterministic op feed
instead of starting a session; this is the same feed the tests use.

## SDK notes (version 1.5.2)

The packages are scoped: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core` and
`@earendil-works/pi-ai` (there are no unscoped `pi-agent-core` / `pi-ai` packages on npm).
`session.subscribe()` emits `compaction_start`/`compaction_end` and `thinking_level_changed`;
`model_change` is a persisted session entry, not a subscribe event. `stopReason` and `usage` live on
the message payload, not on the event. A prompt sent while the session is streaming must declare
`streamingBehavior: "steer" | "followUp"`.
