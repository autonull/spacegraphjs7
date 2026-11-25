# TODO16 — Graph as a complete reading and authoring surface

> **Status: phases R/L, D, A and C landed; document renderer extension landed (2026-11-25).** Goal: make SpaceGraphJS, not just the Pi Durable demo,
> able to replace a conventional text or web UI. Pi Durable is the reference client; every capability
> lands as a library primitive first and is then adopted by the demo. No second model, hidden filter
> or parallel renderer contract is allowed.

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

## 4. Open questions

- Should the reader be a renderer mode, a DOM overlay, or a node template? The choice must avoid a
  second camera, model or placement authority.
- How should timestamps, roles and provenance appear in a linear document without overwhelming it?
- What is the minimum safe markdown subset for committed text, and where does sanitisation live?
- Which browser shortcuts must remain stable across graph, reader and composer?

## 5. Progress

| Stream | State | Evidence |
| ------ | ----- | -------- |
| R/L — reading order and backlinks | Landed | `src/reading.ts` exports `readingOrder` and `readingHTML`. Order follows recorded edges from roots; unreachable facts follow in host order; cycles are visited once. HTML is escaped, semantic, and every section carries `data-node-id`. The root subpath `./reading` is generated from `script/library-entries.ts`, not hand-edited. Pi Durable's `transcript` view renders this DOM from the full folded kernel and hides the canvas; clicking a section returns to `graph` and reveals the node. `test/reading.test.ts` and `tests/reading.spec.ts` pass. |
| D/A — rich text and keyboard parity | Landed | `readingTextHTML` handles inline code, strong, emphasis, safe links and fenced code; unsafe links and raw markup are dropped. `mountReading` mounts the document, gives sections `tabindex="0"`, implements ↑/↓, Home/End and Enter/Space, and returns `reveal`/`destroy`. Pi Durable removed its own reader click handler and passes one `onReveal` callback. `test/reading-view.test.ts` (2 jsdom tests) and a second `tests/reading.spec.ts` keyboard gate pass. |
| C — composer | Landed | `src/composer.ts` is published as `spacegraphjs/composer`. It grows a textarea to 160px, submits on Enter, inserts a newline on Shift+Enter, recalls submissions with ↑/↓ and exposes `focus`/`clear`/`value`/`destroy`. Pi Durable's prompt form delegates to it and keeps the same kernel commit path; global shortcuts now ignore textareas and contenteditable fields. `test/composer.test.ts` (2 tests) and `tests/composer.spec.ts` (1 gate) pass. |
| D extension — documents | Landed | `src/documents.ts` is published as `spacegraphjs/documents`. `parseDocument` and `documentHTML` handle headings, paragraphs, fenced code, quotes, lists, tables and images; `safeDocumentHTML` drops unsafe links/images and never trusts raw HTML. Shared `src/markup.ts` holds escaping and safe-URL checks. `MarkdownNode` uses the renderer directly, eliminating its async `marked` path and raw `innerHTML`. `test/documents.test.ts` (2 tests) passes. |

### Verification evidence for R/L (this change set)

- `pnpm run write:exports` and `pnpm run build:lib` — generated manifests and `dist/reading.*` in sync; `pnpm run check:generated` — passed.
- `pnpm exec vitest run test/documents.test.ts test/reading.test.ts test/reading-view.test.ts test/composer.test.ts test/spacegraph.test.ts test/boundaries.test.ts` — 110 passed; none of the new modules depends on the renderer contract.
- `pnpm -r --if-present typecheck`, `pnpm --filter pi-durable test` (94), `pnpm --filter pi-durable verify` — clean.
- `SG_DURABLE_PORT=5442 PI_DURABLE_SERVER_PORT=8926 pnpm --filter pi-durable test:e2e` — 68 passed, including both reader gates, the composer gate and the updated transcript/composite gates. `boot` and story frames now accept either canvas or reader as the visible surface. `pnpm --filter pi-durable build` — clean.
- Eleven tracked PNGs were recaptured by the E2E run; turn-flow frame 4 now shows the readable transcript. `.prev` pairs and the contact sheet are retained; no verdict was written.

## 6. Verification ladder

```bash
pnpm run write:exports
pnpm run build:lib
pnpm -r --if-present typecheck
pnpm exec vitest run test/reading.test.ts test/boundaries.test.ts
pnpm --filter pi-durable test
pnpm --filter pi-durable verify
pnpm --filter pi-durable test:e2e
pnpm --filter pi-durable build
```

No test is retried to green without a cause fix. Human screenshot verdicts stay external.

## 7. Remaining work

1. ~~**D extension — images, tables and documents.**~~ Landed: `spacegraphjs/documents` parses and renders a safe subset (headings, paragraphs, code, quotes, lists, tables, images) with escape-first HTML. `MarkdownNode` now uses it synchronously instead of raw `marked` output; the reader delegates its markdown formatting to the same renderer.
2. **A extension — library a11y bridge.** `mountReading` handles local focus and activation; wire it to `spacegraphjs/a11y` announcements and to the host's global shortcut table so screen-reader users hear view and reveal changes.
3. **C extension — attachments and draft persistence.** The composer owns in-memory history only; attachments and cross-reload drafts still need a committed path if they are ever wanted. Do not add local draft state without an explicit contract.
4. **Remove the unused `marked` peer.** `MarkdownNode` no longer calls it; drop the optional peer, dev dependency and bundler external entry only after checking no published consumer relies on the import.
5. **Library adoption.** Pi Durable still owns its own permalink codec, trail, announcer and card templates. Promote each to a library primitive only when a second host needs it, to avoid speculative abstraction.
