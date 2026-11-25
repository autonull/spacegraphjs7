# TODO16 — Graph as a complete reading and authoring surface

> **Status: complete for all ungated work (2026-11-25).** Streams R/L, D, A and C, the document
> renderer, a11y bridge, typed-edge paths, reading/docs loop and `marked` cleanup have landed. Goal:
> make SpaceGraphJS, not just the Pi Durable demo, able to replace a conventional text or web UI.
> Every capability lands as a library primitive first and is then adopted by the demo. No second
> model, hidden filter or parallel renderer contract is allowed.

## 0. Thesis

A graph UI replaces a text UI only when it can do everything a text UI does without leaving the
graph: read a committed history in order, search and cite it, open rich documents, compose and
edit, navigate by keyboard, and expose the same content to assistive technology. The graph is a
projection of committed facts; text and web-like views must be additional projections of the same
fold, never a second store or a lossy export.

## 1. Invariants

1. **One committed fold.** Reading, graph, diff and document views project the same kernel; ids,
   edge kinds and order are unchanged.
2. **Text is a projection, not an export.** Every paragraph, heading, code block and link maps back
   to a node id; selecting it reveals that node in the graph.
3. **Parity of interaction.** Every action available by pointer is reachable by keyboard and exposed
   to assistive technology with a stable name.
4. **Mutations stay committed.** Composer actions produce kernel ops through the same path as the
   demo's prompt; no view holds private draft state that can silently diverge.
5. **Library first.** A capability used by Pi Durable lives in a published SpaceGraphJS package or
   root subpath with its own unit tests; the app keeps only vocabulary and theme choices.
6. **Progressive disclosure.** Dense graph, readable document and focused inspection are views of
   one surface; switching views changes representation, never placement authority or history.

## 2. Candidate capabilities

| Stream | Library capability | Pi Durable adoption | Why it matters |
| ------ | ------------------ | ------------------- | -------------- |
| R — reading order | Pure fold from kernel/model to ordered sections with stable ids, roles, timestamps and links | Upgrade `transcript` from a filtered node set to a real readable document with selectable text and node backlinks | A conventional UI reads top to bottom; the graph must offer the same without losing the map |
| D — rich documents | Reusable markdown/code/image/table rendering primitive with theme tokens and safe HTML | Inspector and document view render committed content, not just summaries | Web UIs show documents; cards alone cannot |
| A — keyboard and ARIA parity | Roving focus, arrow traversal, semantic list/tree roles and one announcer contract | Full keyboard journey: read, search, select, open, edit, back | Graph UIs commonly fail where text UIs succeed: keyboard and screen readers |
| C — composer | Multi-line input, history, attachments and inline command grammar as a library control | Prompt footer becomes a real editor; drafts stay local until committed | Authoring is half of a text UI |
| L — links and citations | Stable node-address links in both directions, including compact addresses | Text passages link to graph nodes; graph nodes link back to their passages | Citations are the bridge between the two projections |
| G — evidence | Unit tests per primitive, one E2E ladder per phase, no new PNG unless a view changes shape | Verification recorded in §5 | Keep gates meaningful and bounded |

## 3. Delivery order

1. ~~**R and L together.**~~ Landed: `src/reading.ts` is published as `spacegraphjs/reading`; Pi
   Durable's `transcript` view is now a readable document with a graph backlink on every fact.
2. ~~**D after R.**~~ Landed: a safe inline/fenced subset (code, strong, emphasis, http/mailto/#
   links) renders only when the host opts in with `format: 'markdown'`; raw HTML is never trusted.
3. ~~**A after D.**~~ Landed: `mountReading` owns section focus, arrow/Home/End navigation, Enter/Space
   reveal and listener teardown. Pi Durable supplies only the reveal callback.
4. ~~**C last.**~~ Landed: `spacegraphjs/composer` owns multiline editing, history recall and
   submit intent. Pi Durable keeps the commit path; drafts never become a second store.

## 4. Decisions

- **Reader shape:** a DOM overlay over the same container, not a renderer mode or node template. The
  canvas hides while a text surface shows; ids, edges, order and placement authority stay shared.
- **Metadata density:** role, status and timestamp sit in a small `<dl>` per section; prose stays
  primary. Provenance remains reachable through the inspector and the backlink.
- **Safe markdown:** `src/documents.ts` owns the escape-first subset and safe-URL checks. Raw HTML is
  never trusted and `marked` is not a dependency.
- **Shortcut stability:** global bindings live in one host table and skip text entry; the reader owns
  arrows/Home/End/Enter/Space on focused sections. View and reveal changes announce through the
  shared `spacegraphjs/a11y` channel; other bindings keep their labels in the help overlay.

## 5. Progress

| Stream | State | Evidence |
| ------ | ----- | -------- |
| R/L — reading order and backlinks | Landed | `src/reading.ts` exports `readingOrder` and `readingHTML`. Order follows recorded edges from roots; unreachable facts follow in host order; cycles are visited once. HTML is escaped, semantic, and every section carries `data-node-id`. The root subpath `./reading` is generated from `script/library-entries.ts`, not hand-edited. Pi Durable's `transcript` view renders this DOM from the full folded kernel and hides the canvas; clicking a section returns to `graph` and reveals the node. `test/reading.test.ts` and `tests/reading.spec.ts` pass. |
| D/A — rich text and keyboard parity | Landed | `readingTextHTML` handles inline code, strong, emphasis, safe links and fenced code; unsafe links and raw markup are dropped. `mountReading` mounts the document, gives sections `tabindex="0"`, implements ↑/↓, Home/End and Enter/Space, and returns `reveal`/`destroy`. Pi Durable removed its own reader click handler and passes one `onReveal` callback. `test/reading-view.test.ts` (2 jsdom tests) and a second `tests/reading.spec.ts` keyboard gate pass. |
| C — composer | Landed | `src/composer.ts` is published as `spacegraphjs/composer`. It grows a textarea to 160px, submits on Enter, inserts a newline on Shift+Enter, recalls submissions with ↑/↓ and exposes `focus`/`clear`/`value`/`destroy`. Pi Durable's prompt form delegates to it and keeps the same kernel commit path; global shortcuts now ignore textareas and contenteditable fields. `test/composer.test.ts` (2 tests) and `tests/composer.spec.ts` (1 gate) pass. |
| D extension — documents | Landed | `src/documents.ts` is published as `spacegraphjs/documents`. `parseDocument` and `documentHTML` handle headings, paragraphs, fenced code, quotes, lists, tables and images; `safeDocumentHTML` drops unsafe links/images and never trusts raw HTML. Shared `src/markup.ts` holds escaping and safe-URL checks. `MarkdownNode` uses the renderer directly, eliminating its async `marked` path and raw `innerHTML`. `test/documents.test.ts` (2 tests) passes. |
| A extension — a11y bridge | Landed | `spacegraphjs/a11y` exports `createAnnouncer`, one polite live-region contract shared by `AccessibilityLayer`, `mountReading` and Pi Durable's `announce`. `mountReading` accepts `announce`; arrow/Home/End and `reveal` speak passage position and label, and `destroy` removes a library-owned region. Pi Durable routes chrome, view and reveal messages through the same channel. `test/a11y.test.ts`, `test/reading-view.test.ts` and the reader keyboard E2E gate cover it. |
| Cleanup — `marked` peer | Landed | No source imports `marked`. Removed the optional peer and metadata, the dev dependency, `@types/marked`, bundler external entries and the README claim. The stale sleep-based `MarkdownNode` test now asserts rendered `<h1>` directly. `pnpm-lock.yaml` regenerated; `marked` remains only as a transitive Pi dependency. |
| L — semantic edge paths | Landed | `src/navigation/edgePath.ts` is published through `spacegraphjs/navigation`. It walks recorded kinds breadth-first, directed or not, with stable steps and cycle suppression. Both private hosts adopted it: Pi Durable's `thread` and Pi's `traceOrder` now supply only vocabulary; their host-only walkers are gone. `test/navigation/edge-path.test.ts` covers direction, kind filtering and cycles. |
| R/D — complete reading loop | Landed | `reveal` targets the reader while `transcript` or `docs` is visible, so Lens find no longer focuses a hidden canvas. The `docs` view now renders committed documents through `mountReading` with safe markdown and graph backlinks instead of cards. The inspector gains a "Read in transcript" action, closing the citation loop. E2E gates cover reveal routing, document rendering and the inspector backlink. |

### Verification log

| Change set | Fast gates | Browser gate |
| ---------- | ---------- | ------------ |
| R/L | library vitest 110; `pi-durable test` 94 | E2E 68 |
| A/cleanup | library vitest 125; `pi-durable test` 94 | E2E 68 |
| Typed paths / reading loop | library vitest 45; `pi check:fast` 181; `pi-durable test` 94 | E2E 71 |

`write:exports`, `build:lib` and `check:generated` resynced the two library change sets;
`pnpm run check`, `pi-durable verify` and `pi-durable build` passed in each. Tracked PNGs were
recaptured only where a view changed shape; `.prev` pairs and the contact sheet are retained and no
human verdict was written.

## 6. Verification ladder

Run one tier per change; do not repeat a lower tier after a higher one passes.

```bash
# Tier 1 — every change, no browser (~20 s)
pnpm run check
pnpm exec vitest run test/navigation/edge-path.test.ts test/reading.test.ts \
  test/reading-view.test.ts test/a11y.test.ts test/documents.test.ts \
  test/composer.test.ts test/boundaries.test.ts
pnpm --filter pi check:fast
pnpm --filter pi-durable test

# Tier 2 — only when the library surface changes
pnpm run write:exports
pnpm run build:lib
pnpm run check:generated

# Tier 3 — only when a view, route or announcement changes
pnpm --filter pi-durable verify
cd app/pi-durable
SG_DURABLE_PORT=5442 PI_DURABLE_SERVER_PORT=8926 \
  pnpm exec playwright test --config playwright.config.ts --workers=1
pnpm --filter pi-durable build
```

`pnpm run check` already typechecks every workspace, so a separate `pnpm -r --if-present typecheck`
is redundant. Use one browser worker on this host: eight workers exhaust memory and crash Chromium
before assertions run. Never retry to green without a cause fix. Human screenshot verdicts stay
external.

## 7. Remaining work

1. ~~**D extension — images, tables and documents.**~~ Landed: `spacegraphjs/documents` parses and renders a safe subset (headings, paragraphs, code, quotes, lists, tables, images) with escape-first HTML. `MarkdownNode` now uses it synchronously instead of raw `marked` output; the reader delegates its markdown formatting to the same renderer.
2. ~~**A extension — library a11y bridge.**~~ Landed: `spacegraphjs/a11y` owns `createAnnouncer`; `AccessibilityLayer`, `mountReading` and Pi Durable's global announcement path share it. Reader navigation and programmatic reveal speak passage position and label; view and reveal changes still pass through the host channel used by the shortcut table.
3. **C extension — attachments and draft persistence — deferred.** The composer owns in-memory history only. Before adding anything here, write the contract: which kernel op commits a draft, where attachment bytes live, and how a reload reconciles them. No local draft state without that contract.
4. ~~**Remove the unused `marked` peer.**~~ Landed: no source or published consumer imports it; peer metadata, dev dependencies, bundler externals, README claim and the stale test were removed, and the lockfile regenerated.
5. **Library adoption — partly landed.** ~~Announcer and semantic edge paths~~ are library-owned and adopted by both Pi hosts; the second-host trigger is satisfied. Pi Durable still owns its permalink codec, trail and card templates. Promote those only when a second host actually needs them, to avoid speculative abstraction.

**Plan status:** complete for all ungated work. Streams R/L/D/A/C, their extensions, the shared
announcer, typed-edge paths and the reading/docs loop are landed and adopted by Pi Durable. Only two
gated items remain: item 3 starts with a written draft contract (kernel op, byte storage, reload
reconciliation); the rest of item 5 starts with a second host needing permalinks, trail or card
templates. Neither has a trigger today, so neither is in flight.
