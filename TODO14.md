# TODO14 — Octave atlas: hierarchy, wayfinding and depth

> **Status: proposed (2026-11-24).** TODO13 landed the durable atlas: continuous attention, one Lens,
> a landmark trail and compact address, scrubbable story plates, two workshops, and budget/spatial
> grace. Its captures pass the gates, but the graph still reads as a field of similarly sized
> rectangles, the rail competes with the canvas, and a visitor cannot answer "what am I looking at,
> why is it here, and how do I get back?" This plan fixes those fundamentals first, then adds
> engagement and depth. It opens a new plan instead of growing TODO13 past its stop rule.

## 0. Baseline

- TODO13 §7 records the landed state: `src/attention.ts` grades nodes with `ScaleDomain`;
  `SpaceGraphRenderer` receives cards from one `VocabularyAdapter`; four Core heroes and seven
  story plates are tracked; 66 vitest tests, 33 E2E tests and the root check are green.
- Present sizing is `IMPORTANCE_SIZE` (`hero 280×120`, `medium 190×72`, `compact 110×40`) multiplied
  by `0.94 + attention × 0.12` in `sizeOf`. That is a 1.13× range; most nodes are `medium` or
  `compact`, so the frame has almost no size hierarchy.
- The rail is a `330px` column with seven labelled view buttons, five rung buttons, a Lens form,
  inspector, controls, legend and glossary; the header and footer add more labelled chrome. At
  `900×700` this leaves the graph cramped. Miniaturising controls is a prerequisite for the add-ons
  below, which otherwise compete for the same space.
- Wayfinding gaps: `src/address.ts` carries tab/view/rung/layout/time/camera but not the focused
  node; the inspector shows a summary but not provenance; Lens `find` matches labels, not committed
  text; there is no view-state history and no way to pin one fact against another.
- The existing seams are sufficient: adapter `nodeSizeFn` and `renderCardTemplate`, renderer
  `RenderNode.size` and `RenderModel`, `applyEmphasis` / `applyEdgeEmphasis`, `createRenderClock`,
  `diffKernels`, and `ScopeSpec.nodes[].size` for layout occupancy. No renderer contract field,
  second camera or second model is required.
- Attention is already continuous (`ZoomBands` resolves five landmark addresses; `ScaleDomain.sample()`
  interpolates importance). Octaves reuse that sample; they do not add a parallel scale.
- Strobe `rec_487bf5` recorded 7.00% main-busy and 7.91 ms paint on the current frame; Playwright
  measured `ready` at 893 ms and first ops at 1123 ms with no provider. Bigger cards need a new
  measurement, not a relaxed gate.

## 1. Invariants carried forward

1. **The graph owns the frame.** Chrome collapses to icons and drawers; the canvas keeps at least
   70% of viewport width. Icon-only controls keep text in `aria-label`, `title` and the announcer.
2. **One octave authority.** `src/octaves.ts` derives every size from committed `kind`, `data` and the
   current attention sample. No second renderer contract, camera, model or hidden filter.
3. **Committed truth is visible.** A low-attention node shrinks to a dot and stays addressable in the
   inspector; it is never deleted and no edge is invented.
4. **One position authority.** Layout collision uses the same octave sizes the renderer draws;
   kit scopes and `ScopeSimulation` still own every coordinate.
5. **Power-of-two ladder.** One octave doubles rendered size. Every size is a member of the ladder or
   a continuous interpolation between two adjacent octaves; templates switch only at band boundaries.
6. **Legibility floor and ceiling.** Sizes stay inside `8 … 512` renderer units. Focus and selection
   force at least the `card` band without moving the node.
7. **Flat ink/vellum grammar.** Nested squares, hairline rules, small-caps captions and monospaced
   ids. No glass, glow, parallax or bounce; theme tokens own colour, including icons.
8. **One page, one kernel.** Views and landmarks re-place the same folded kernel; RTL mirrors the
   survey gutter, never node ids or edge kinds.
9. **Muting, never hiding.** Every filter, focus lens and culling path dims or shrinks facts; it does
   not remove nodes, edges or documents from the fold. Collapsing chrome never removes a control.
10. **Phased gates.** No add-on lands before its prerequisite phase passes the full verification
    ladder. Each phase ends with one recapture and a fresh measurement if visual cost changed.
11. **Deterministic evidence.** Tests run from `app/pi-durable`, use injected clocks and pure `?shot`
    states; no fixed sleeps, mocks or global state. A failed gate is reported, not retried to green.
    Human verdicts stay external.

## 2. Delivery order

Work lands in three phases. The order is part of the plan; do not cherry-pick an add-on ahead of a
fundamental. HUD minimisation is a fundamental because later widgets need a home that does not steal
the graph.

| Phase | Streams | Why this order | Gate before the next phase |
| ----- | ------- | -------------- | -------------------------- |
| 1 — Fundamentals | O (octave sizing), W (focused address, small-band access, provenance), H (HUD minimisation) | A visitor must first see a real hierarchy, land on an exact fact, understand it, get back, and see the canvas rather than the chrome. | Full ladder green; no card overlap at both viewports; rail collapsed with every control reachable; four heroes + seven plates recaptured. |
| 2 — Depth add-ons | I (full-text Lens, time scrub, change digest, instrument panel), C0 (view history), C3 (palette polish) | These deepen comprehension once the basics are stable, the address codec can carry new state, and a drawer exists for their UI. | Full ladder green; new hooks covered; drawer still collapses; no new PNGs unless a view changes shape. |
| 3 — Engagement add-ons | E (follow thread, focus lens, guided routes, activity pulse, callouts, staggered motion), C1 (compare), C2 (muting filters) | Motion and delights sit on top of legible nodes, solved wayfinding and minimal chrome. | Full ladder green; reduced motion and RTL green; final recapture and Strobe run. |

Each row below names its phase. Stream G at the end records the evidence common to all phases.

## 3. Phase 1 — Stream O: octave sizing

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| O0 | Publish the ladder. Base unit `8` renderer units, octaves `k = 0…6` → `8, 16, 32, 64, 128, 256, 512`. Define base octave per committed role and a landmark shift of at most ±1.5 octaves, clamped to the ladder. | `tests/octaves.test.ts` asserts exact `2^k` ratios, monotonic attention change between landmarks, floor/ceiling, and unchanged node/edge ids. |
| O1 | Add `src/octaves.ts`: `octaveFor(node, sample)`, `sizeForOctave(octave)`, `bandForOctave(octave)` and the role table. Replace `IMPORTANCE_SIZE` / `sizeOf` in `src/host.ts`; keep `applyModelEmphasis` for opacity and label density. | One size authority; no duplicated tier constants; `representation()` hook reports octave and band per node. |
| O2 | Feed `size` into `ScopeSpec.nodes` from the same helper and include the octave bucket in the `#scopeKey` cache. Focus/selection use the card band without changing position. | `tests/octaves.spec.ts` finds no card overlap at `1600×1000` and `900×700`, and a zoom to `cosmos` grows a conversation node by ≥3 octaves relative to `grain`. |
| O3 | Template bands: `dot` (k≤1), `chip` (k=2), `card` (k=3), `panel` (k=4), `monument` (k≥5). Each band shows the committed detail it can hold; every band keeps a full accessible name and the `data-kind`, `data-importance`, `data-attention` and `data-workshop` attributes. | `tests/variety.spec.ts` counts ≥4 distinct rendered sizes and ≥3 template bands in one frame. |
| O4 | Edge hierarchy from recorded kinds only: `orders` solid hairline, `owns`/`delegates` solid medium, `sleeps-on`/`waiting.on` dashed amber, `checkpoint` dotted, `fork` hairline double, `retry` dashed vermilion. Captions appear only above an attention threshold. | Edge-kind whitelist unchanged; assertions on thickness and caption visibility; no edge kind outside the recorded set. |

**O0 role ladder (starting point).** Base octave is derived from committed role; the sample shifts it
continuously.

| Committed role | Base `k` | `grain` | `fact` | `cosmos` |
| -------------- | -------- | ------- | ------ | -------- |
| conversation, committed answer, boundary head | 5 | 128 | 256 | 512 |
| run, active task | 4 | 64 | 128 | 256 |
| message, action, nested call | 3 | 32 | 64 | 128 |
| doc, config, artifact, image plate | 2 | 16 | 32 | 64 |
| pending signal, trace span | 1 | 8 | 16 | 32 |

Intermediate landmarks (`territory`, `passage`) interpolate between rows. These are renderer units;
CSS card width and height come from the same `sizeForOctave` call, so the DOM and the canvas agree.

## 4. Phase 1 — Stream W: wayfinding fundamentals

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| W0 | Focused address. Extend `Address` with `focus?: string`; `permalink()` and `compactAddress()` carry it, `applyAddress()` restores selection through `reveal()` and the inspector. The Lens `focus <id>` command sets it. | `tests/address.test.ts` round-trips `focus`; an E2E reload of the permalink restores the same active tab, view, landmark and selected node. |
| W1 | Small-band usability. Hover or keyboard focus on a dot shows its full committed summary; focus raises the dot to card band without moving it; 44px targets remain reachable at `375px` width. | `tests/a11y.spec.ts` extended with dot-band focus, inspector text and narrow viewport passes. |
| W2 | Detail treatments on the live canvas: scope frames and small-caps lane captions, clock for sleeping, vermilion rule for failure, cyan survey rule for boundaries, dashed fold for deferred docs, bounded inset for image artifacts, brackets for nested workshops. Reuse the story-plate engraving. | `tests/variety.spec.ts` asserts one treatment per status/role and plate frames in `graph`, `tasks` and `transcript`; RTL gutter check stays green. |
| W3 | Provenance: a "why is this here?" section in the inspector with stable id, commit sequence, source entry, predecessor/successor, producing view facet and edge kinds. Add Lens `why` for the selected node. | Unit test derives provenance from the folded kernel; E2E asserts provenance for a message and for a deferred doc, with no new edge kind. |

Stop rule: if a treatment needs a new renderer contract field, a second owner or a hidden filter,
report the gap and leave that treatment out. Do not force it into the adapter.

## 5. Phase 1 — Stream H: HUD minimisation

The rail becomes a slim icon strip; full text lives in accessible names, tooltips, the announcer and
one collapsible drawer. This is the permanent home for the add-on widgets in phases 2 and 3.

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| H0 | Narrow the rail from `330px` to an icon strip (target ≤ `64px`). Group `Views`, `Rung`, `Lens`, `Controls`, `Legend` and `Glossary` into icon buttons with `aria-label` and `title`; full labels appear in a drawer or on keyboard focus. Keep the inspector and prompt reachable by default. | A11y test asserts every icon control has an accessible name, is tabbable and is never hover-only; measured rail width ≤ `64px` at `1600×1000`. |
| H1 | Replace seven labelled view buttons and five rung buttons with compact icon groups plus a current-value badge; keep `g`, `[`/`]`, the trail and Lens as full-text fallbacks. | All seven views and five rungs remain selectable by keyboard and announced; no dead control; `tests/rungs.spec.ts` and `tests/representations.spec.ts` stay green. |
| H2 | Move Lens from a labelled rail section to a compact icon command bar over the canvas, with the `Ctrl/⌘ K` hint inside the control; one-line help stays in the `?` overlay. | Lens E2E passes from both keyboard and click; command bar does not cover the survey plate at `900×700`. |
| H3 | Compact header badges into icon+count chips for `provider`, `storage`, `tasks` and `tab`; text stays in `title` and the `aria-live` announcer. Tab strip uses short ids. | Badge text remains in DOM for existing tests; header height decreases; RTL badge order preserved. |
| H4 | Add presentation mode from the icon rail or `Shift+F`: hides rail and footer chrome, keeps canvas, announcer and a small persistent exit control. Do not reuse `f`, which focuses the selection. | A11y test reaches the exit control by keyboard and restores the prior view on exit; reduced-motion and RTL green. |
| H5 | Draw icons as inline SVG from theme tokens (survey mark, lens, rung, tasks, docs, signal); no icon font or new runtime dependency. Icons are decorative; text stays in accessible names. | `verify` guard confirms no new dependency; README lists the icon set; screenshots show no missing glyphs. |
| H6 | At `375px` and `900px`, collapse the rail into a slide-out drawer; keep the graph at ≥70% of viewport width and never cover the survey plate. `Esc` closes the drawer. | Narrow-viewport E2E passes; no card overlap; drawer closes with `Esc` and restores focus. |

Stop rule: miniaturisation is presentation only. Never drop a control, its accessible name or its text
equivalent to save pixels.

## 6. Phase 2 — Stream I: information add-ons

These rows use the H0 drawer; none may introduce a new always-visible rail section.

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| I0 | Full-text Lens: `find <text> [status:<s>] [kind:<k>]` searches committed text and summaries via `rankedSearch`, not only labels. Results stay in stable id order. | `tests/lens.test.ts` covers text and filter parsing; E2E finds a committed answer by its body text. |
| I1 | Time scrubber: turn discrete `?asOf=` into a slider with a tick per committed entry, a read-only badge and a "return to present" action. Present stays the default. | Scrub test asserts prior answers appear and later ones remain absent; no commit controls in past state. |
| I2 | Change digest: fold two snapshots with `diffKernels` and show "since seq n" with added/removed counts and a one-line summary. | `tests/digest.test.ts` proves counts match the diff and no edge kind is invented; E2E shows the digest in the drawer. |
| I3 | Instrument panel behind `?instruments=1`: octave histogram, attention weights, edge-kind counts and the `omitted` budget count. | `instruments()` hook matches the rendered model; no verdict or hidden state written; panel lives in the drawer. |

## 7. Phase 2 — Stream C: ergonomic add-ons, part one

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| C0 | View-state history: back/forward for view, rung, layout and Lens moves, kept separate from browser history and never touching committed data. | Keyboard E2E walks a command sequence backward and forward and restores each address. |
| C3 | Command palette polish: Lens history and prefix completion, plus a `?` overlay listing every shortcut, including `Ctrl/⌘ K`, `f` (focus selection), `Shift+F` (presentation mode) and `0` (reset view). | A11y test checks the overlay against real bindings; no icon control lacks a shortcut or a click path. |

## 8. Phase 3 — Stream E: engagement add-ons

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| E0 | Follow the thread: selecting a node offers a camera glide along its recorded edges; `Esc` restores the prior view and selection. | E2E asserts the trail contains only recorded edge kinds and that `Esc` restores the address. |
| E1 | Focus lens: double-click enters one neighbourhood; unrelated nodes drop octaves and mute but stay present. `Esc` restores attention. | Test proves node and edge counts are unchanged inside the focus lens; attention weights change monotonically. |
| E2 | Guided routes: story plates gain next/prev with one "what to notice" line tied to each committed fact. No new standalone PNGs. | Existing chapter scrub hooks drive the route; each caption is present in the DOM and the inspector. |
| E3 | Activity pulse: a hairline ripple from the node a new commit touched, plus a text ticker of recent commits in the drawer. Motion is never the only signal. | Reduced-motion path cuts instantly; text ticker present when motion is suppressed. |
| E4 | Curiosity callouts in the H0 drawer: "2 sleeping signals", "1 deferred doc", "3 unreviewed spans", each linking to the relevant view. | Callouts count only committed data; drawer collapse at `900×700` does not hide core controls. |
| E5 | Staggered reveal on view and landmark changes through `createRenderClock`; per-band delay, eased morph only, no parallax or bounce. | Reduced-motion path green; camera stays per tab; Strobe re-measure recorded. |

## 9. Phase 3 — Stream C: ergonomic add-ons, part two

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| C1 | Compare mode: pin one node or tab as a reference, then run `diffKernels` against the current selection inside the existing diff view. | Unit test proves added/removed ids come only from the two kernels; E2E clears the pin and restores the prior view. |
| C2 | Muting filters: kind/status chips in the drawer dim non-matches and show counts, with one reset key. They never remove nodes, edges or documents from the fold. | Representation hook reports identical node and edge ids with filters on and off; count badges match the fold. |

## 10. Stream G — evidence common to all phases

| ID | Work | Exit evidence |
| -- | ---- | ------------- |
| G0 | At the end of each phase, run the full verification ladder once. Recapture only when rendered output changed (phases 1 and 3). | Exact commands and results recorded in §13 progress. |
| G1 | Keep four Core heroes at full resolution and seven story plates as the only tracked composites. Retire no PNG without a `.prev` pair and a refreshed contact sheet. | Gallery size stays at 11 tracked images; no verdict written. |
| G2 | Re-run Strobe after phase 3 with the same headless recipe as TODO13 and commit the handle and numbers to the progress table. | Strobe handle recorded; headless frame/GPU refusals stated, not hidden. |

## 11. Verification ladder

```bash
pnpm --filter pi-durable typecheck          # types only
pnpm --filter pi-durable test               # pure octave/address/filter/diff tests
pnpm --filter pi-durable verify             # Pi import + dependency + docs guard
pnpm --filter pi-durable test:e2e           # journeys, a11y, icon chrome, focus, provenance
pnpm --filter pi-durable verify:visual      # vision + variety gates
pnpm --filter pi-durable shots:all          # four heroes + seven plates
pnpm --filter pi-durable build              # static local-feed bundle
pnpm run check                              # canonical root lint and types
strobe record 'http://localhost:<port>/?shot=basic-turn' --headless --for 6s --probes timing --json
```

When port `5176` is occupied, set `SG_DURABLE_PORT` and `PI_DURABLE_SERVER_PORT` to free ports for
Playwright and Strobe. Run each gate once per change set; recapture once with
`PI_DURABLE_FAUX_SEED=fixed`.

## 12. Open questions and risks

- **Backend fidelity.** Confirm that the card renderer honours large `nodeSizeFn` values and that CSS
  width/height from `sizeForOctave` matches the canvas footprint. If it does not, derive both from one
  helper and keep the adapter as the only conversion point.
- **Overlap at narrow widths.** `monument` cards at `512` units can crowd a `900×700` stage. Layout
  occupancy and the focus exception must be checked in the same frame; cap the band before allowing
  overlap.
- **Fractional octaves.** Continuous interpolation produces non-power-of-two sizes. Treat those as
  transitions between octaves, snap template bands with hysteresis, and never describe them as new
  octaves.
- **Icon comprehension.** Icon-only controls are smaller but harder to learn. Use familiar survey
  grammar, keep full labels in `title`/`aria-label`, expose a `?` overlay, and never rely on hover
  alone. If an icon is ambiguous, keep a short text label rather than guessing.
- **Drawer pressure.** I3, E3, E4 and C2 all want drawer space. H0 owns the drawer at `900×700`; later
  add-ons may not reintroduce always-visible labelled sections or reduce graph width below 70%.
- **Attribute churn and motion cost.** Changing size or entering a focus lens on every wheel event
  can trigger layout work. Cache by octave bucket, re-grade with `applyModelEmphasis` for sub-bucket
  changes, and keep the stagger bounded.
- **Provenance and diff cost.** "Why is this here?" and the change digest read the folded kernel and
  `diffKernels`; compute them on selection or digest open, not on every commit.
- **Motion as signal.** The activity pulse and staggered reveal are decoration, not the only carrier of
  state. Text ticker, inspector and badges must work with reduced motion.
- **Headless measurement.** Strobe refuses frame and GPU metrics without a display; record main-work
  and CPU only, and keep the cold-paint Playwright measure separate from the visual gate.
- **Human verdict.** The recaptured pairs stay unjudged in the contact sheet; this plan never writes a
  verdict.

## 13. Progress

| Stream | Phase | State | Evidence |
| ------ | ----- | ----- | -------- |
| O — octave sizing | 1 | Proposed | Ladder, role table and guards defined above; no code landed. |
| W — wayfinding fundamentals | 1 | Proposed | Focused address, small-band access, live detail and provenance defined above. |
| H — HUD minimisation | 1 | Proposed | Icon rail, compact badges, command bar, presentation mode and drawer defined above. |
| I — information add-ons | 2 | Proposed | Full-text Lens, time scrub, change digest and instrument panel defined above. |
| C0/C3 — ergonomics, part one | 2 | Proposed | View history, palette polish, shortcuts and overlay defined above. |
| E — engagement add-ons | 3 | Proposed | Follow thread, focus lens, guided routes, pulse, callouts and stagger defined above. |
| C1/C2 — ergonomics, part two | 3 | Proposed | Compare mode and muting filters defined above. |
| G — evidence | all | Proposed | Full ladder, 11 tracked images and a fresh Strobe handle pending. |

Update this table at the end of each change set with the exact commands and results. Keep TODO13 as
the record of the landed atlas; record new work here only.
