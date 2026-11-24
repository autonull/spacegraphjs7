# Changelog

All notable changes to this project are documented here. The project has no Changesets; releases
follow the workflow in `docs/ROADMAP.md` (`test:publish` → build → npm).

## [Unreleased] — 8.5.0 alpha

### Added

- **Vision helpers (TODO11 D4):** `spacegraphVision(spec, options)` returns a non-throwing graded quality report with `passed`, and `visionAssert(spec, options)` exposes test assertions for overlap, labels, edges, DOM budget, accessibility and the score floor. Both ship through `spacegraphjs/quality` and reuse `checkQuality`; no Playwright or build-plugin dependency, no autofix, no default. The stale README/CONTRIBUTING claims about a Vite plugin are corrected.
- **Chapter packing (general library):** `chapterPacking(ids, { card, gap?, columns?, viewport?, previous? })` packs a small set of host-defined chapter cards, caps columns to the viewport and preserves cells from `previous` when new ids stream in. Pi's chapters view uses it; `app/demo/second-host.ts` proves the same helper with non-agent ids.
- **Pi single-row chrome:** the proof affordance is now a pulldown that groups presets, experiments and recorded comparisons, and the attention readout moved from the top bar into a bottom status strip beside the evidence line. All control ids and data attributes stay unchanged.
- **Ergonomic layout heuristics (general library):** `solveErgonomicLayout()` packs any graph into a
  measured, surface-fitted grid using aspect-matched column selection, proximity ordering and bounded
  swap refinement. It returns positions plus occupancy, edge-length, aspect-fit and overlap scores,
  with no DOM, renderer or host vocabulary. `?graphLayout=ergonomic` is one opt-in consumer; no default
  changed. New pure tests cover chain, star, wide and narrow surfaces.
- **Chapters subgraph layout (TODO9 default-study):** the opt-in `?graphLayout=chapters` view removes the
  turn-card/turn-lane duplication: one large card per turn (plus Run) holds its work as internal chips,
  with the failure tinted by severity, arranged in a compact two-column grid with short inter-chapter
  edges. Freeform and every prior view stay reachable; a labelled gallery shot and ADR 0008 stub record
  the experiment. No default changed.
- **Continuous connection grammar (TODO9 Phase 3):** the opt-in `?ui=continuity` preset adds a square
  attachment collar, a tapered core, a one-sided sheath and a salience-driven bend to `FluxEdge` through
  opaque `data`; the causal accent also drives card borders, ports, transcript dots and the focus ring,
  and `theme.backdrop=flat` lets the grid recede. No contract field or host renderer branch, and no
  default flipped. A labelled incumbent/variant pair and a pending ADR 0008 decision record the experiment.
- **Study export and honest label (TODO9 Phase 4):** the study page shows trial progress, enables a
  Copy report button at the end of a run and stacks below 900px without changing the report text or
  `window.__study`. The light experiment is labelled `Light view` rather than promising a full shell theme.
- **Solved-target scope fields (TODO9 Phase 3):** `ScopeSimulation.targets` exposes the solved layout
  read-only, and a pure `scopeFieldRects()` mapping plus an optional renderer `projectWorld()` seam
  let the opt-in `?ui=field-targets` preset anchor scope frames to solver bounds instead of animated
  node screen positions. No new position authority, contract field, renderer branch or default change;
  the experiment has its own labelled pair and pending ADR 0008 stub.
- **Readable chrome and catalog (TODO9 Phase 4):** the opt-in `?ui=readable` preset raises chrome to a
  13px body / 12px secondary floor, switches to plain-language labels while keeping ids and jargon
  in tooltips, and moves the rail into a 300px on-demand drawer behind a four-panel strip. The proof
  catalog groups Presets, View experiments and Study questions, adds a 40px filter, and makes the
  gallery and Reference entry points open one canonical five-question list. No default changed.
- **Graph arrangements (TODO7):** six opt-in graph views (`freeform`, `timeline`, `timeline-rows`,
  `lanes`, `tree`, `force`) selectable by URL, `__pi` hook and full-state permalink. `timeline-rows`
  transposes the timeline into horizontal turn stripes stacked vertically through a general
  `orientation` layout option, not a renderer branch. Every view, transcript alignment and the ribbon
  corridor are reachable from the command palette, the `g`/`a`/`r` keys and permalinks, with the active
  view shown in the HUD, and the palette offers `Focus turn 1…N`. A `?studyGraphLayout=timeline`
  harness override enables a pilot without changing the 36-cell study matrix. An opt-in
  `?graphMorph=1` lets the simulation springs animate view switches; intermediate frames pass the
  vision gates and reduced motion still snaps. Solved positions feed
  `ScopeSimulation` as targets, so one position authority remains. Scope hulls, turn tabs, an aligned
  transcript and bundled cross-scope ribbons are host-side overlays; the default stays `freeform`
  pending the study and ADR 0008 decision. The flexibility gate is automated across all views, three
  zoom octaves, two aspects, dark/light and reduced motion.
- **Mockup-informed field refinement (ADR 0016):** deep navy gradient canvas, node-core dots, directional
  arrowheads on causal flux edges and square status chips. Expensive compositing (backdrop blur,
  blend modes) was removed; cards stay square and default glow drops to 0.2.
- **Fluid flagship style (ADR 0016):** a general registered `FluxEdge` renders curved, tapered, glowing
  filaments instead of sticks; every edge becomes flux, context edges stay thin but present, and
  artifact dots become rings. A host `#field` layer merges soft per-node halos into one backdrop, and
  unit/delegate scopes use compact grid packing with row metadata and a frame offset. The default
  palette is aurora with glow 0.45; the HUD stays grayscale. No renderer branch or contract field.
- **Graph within a graph (TODO5 Phase 4):** inner chips are now graph nodes with boundary-anchored
  directed spokes, start/end ports and failed/error status color in every lens layout. The lens
  autoscales from the focused node's on-screen footprint, radial chips scale for small and large
  fan-outs, and a `recursion` shot exercises bounded depth-3 re-entry with settled and intermediate
  vision gates. Still host DOM/SVG: no `RenderNode.children`, renderer branch or contract field.
- **Dense typography (TODO5 Phase 3):** an opt-in `dense-type` preset raises the existing
  `ladder.minLabelPx` floor to 18 and tightens card padding, row typography and card height through
  CSS variables. Widths stay unchanged so larger labels do not truncate. Six vision gates cover the
  preset across the fit matrix; defaults are untouched (ADR 0008), and gap/repulsion remain inert under
  camera fit (`TODO4.md:114`).
- **Adaptive ergonomic fit (TODO5 Phase 2):** the flagship derives CSS-px camera insets from the canvas
  aspect and refits only on a material aspect change (ADR 0015). The target — three zoom octaves, aspect
  ratios, and the existing `ladder.minLabelPx` floor — is data in `app/pi/src/policy/adaptive-fit.ts`;
  no new policy knob, contract field or renderer branch. Six `fit-*` shots and a vision gate cover
  3 octaves × 2 aspects; the `adaptiveFit()` hook exposes the last metrics.
- **Motion gate (TODO5 Phase 1):** an opt-in `living-graph` preset and shot extend salience decay and the
  existing rung/camera blend clocks; `tests/motion.spec.ts` records a with/without comparison and asserts
  that active cards pulse while reduced motion snaps to the final frame. L2 ribbon flow is recorded as
  deferred (renderer branch, no second consumer). No default changed; pixel identity is not a gate.
- **One surface language (TODO4 slice 1):** the Pi flagship consumes a shared token layer through
  `app/pi/src/shell/tokens.ts`; a compact command bar exposes a `/` palette for every verb and knob
  (`:` commands, `?` help); the focus lens becomes a tabbed, pinnable inspector; the rail shows at most
  two contextual instruments with the full kit in the inspector. Shots recaptured; no contract change.
- **Configuration spine (A):** 30-knob typed policy schema with provenance, live panel, permalink v2,
  and a session recorder with deterministic and counterfactual replay.
- **Navigation and continuity (B):** closed navigation verb set with keyboard and touch bindings,
  portal dissolve, two-rung compositing, and ergonomic counters.
- **Living rectangles (C):** instrument kit with a second host, and graph-driven prompt / steer /
  approve / reject / retry / compare with transcript parity.
- **One world (D):** one canvas, one `ScopeSimulation`, one cross-domain camera flight; scaffold emits
  the spine so new domains are born experimentable.
- **Experimentation (E):** seeded pairwise sampling, experiment resolver layer, offline / online /
  human tiers, decision artifacts, and verbatim negative results. Offline replay now re-simulates
  the fixture's geometry and vision feedback under each variant, not just re-scores events.
- **Truth pass (F):** durable ADRs, a vocabulary glossary, this changelog, deprecation policy, an
  isolated `scale` CI job, and a clean root `tsc` gate.
- **Proof surface (G, code side):** the Pi flagship's catalog launches every preset and sampled
  experiment cell from its URL, showing the question or decision rule without claiming a winner.
- **Visual pass:** Pi chrome is a grayscale HUD — black background, neutral surfaces, monospace
  uppercase labels, transparent panels, only structural dividers and a corner-bracketed readout;
  the transcript is collapsible and resizable from its own edge. Color is reserved for the graph view.
- **Screenshots:** one root, `docs/screenshots/`, holding a tracked curated gallery plus gitignored
  generated visual-gate output; Pi captures come from a Playwright spec, and stale images were removed.
- **Screenshot studio:** ten named shots in `app/pi/src/shots.ts` launch deterministic views through
  `?shot=<id>` (`cockpit`, `node-detail`, `dynamic-range`, three layouts, palettes, light theme,
  catalog and policy). A capture CLI with a contact sheet and watch mode makes the feedback loop a
  source edit → refresh cycle. New additive hooks: `shots`, `applyShot`, `frame`, `setViewport`,
  `shotReady`.
- **Deep focus:** a fixed-size host lens anchored to the focused node shows a bounded inner layout,
  per-chip metadata/signal bars, nested chips at depth 2, and controls wired to the existing verbs;
  focusing a chip rebuilds the tree, so recursion is navigation, not unbounded DOM. `emphasis.focusScale`,
  `neighborScale` and `contextScale` are opt-in and default to 1 — focused nodes do not grow by default.
  New `focus-lens` and `fractal` presets and shots explore the alternative.
- **Faceted edges:** causal edges carry a ribbon descriptor in the existing `RenderEdge.data`; the
  SpaceGraph adapter forwards it to core's `DynamicThicknessEdge` with three segments. `emphasis.ribbonWidth`
  controls the width, 0 disables it. No contract field or renderer-specific branch was added.
- **Density and progressive disclosure:** the catalog and rail are header-toggled drawers, empty portal
  sections stay hidden, and all surfaces default to square corners. The canvas keeps the reclaimed width.
- **View palettes:** `theme.palette`, `theme.backdrop` and `theme.glow` are live knobs with five
  palettes, three backdrops and emissive glow. Four new presets (`neon`, `ember`, `aurora`,
  `circuit`) launch them. Color is applied through host CSS variables and the renderer theme; the
  HUD stays grayscale. The detail LOD card adds a compact telemetry line and wraps its text.
- **View coherence:** the flagship fits content once at startup, gives nodes per-kind size, shape and
  accent color plus distinct edge styles, and renders the transcript as a spine with expandable detail
  and a draggable vertical scroll overview. Its startup policy uses `flat` depth and a 40-unit step.
  Labels follow an LOD rule driven by the configurable `ladder.minLabelPx` floor, and a launchable
  `?scenario=rich&preset=showcase` provides a denser capture fixture.

### Changed

- `ZoomBands` / `ScaleDomain` replace `FractalZoomPlugin` as the band and scale mechanism.
- Root docs now reference real paths under `docs/` and `app/demo/`.
- Pi type hierarchy: the smallest shell tokens lift to 11px/10px, the attention badge and panel headings
  gain their own roles, and the inspector bar drops its redundant title. All 12 shots recaptured; 18
  vision gates and 15 chrome e2e pass.

### Fixed

- Pi timeline hull tabs (TODO7): the tab now shows the turn number with a state glyph (`✓`, `▸`, `!`, `✕`) instead of the words `TURN` and `COMPLETE`; status name stays on the node and detail views. Gallery recaptured.
- Pi reserved child lane (TODO7): the packed unit/delegate frame offset no longer places the first child row on its parent card. All five graph views now report zero parent/child overlaps in `graph-baseline.json`; the other four views keep their solved positions.
- Pi flight path (TODO6): `advance()` positions-only frames now use a new `ModelRenderer.setPositions()` / `SpaceGraphRenderer.applyPositions()` path instead of rebuilding every node and edge spec through `setModel()`; other renderers keep the full-set fallback. Per-frame JS cost drops from a 2.295 ms full rebuild to 0.368 ms for `advance()`. The 80 ms browser flight target still needs a physical-GPU measurement; evidence is in `docs/performance.md`.
- Pi deferred-audit follow-up (TODO6): cross-scope causal ribbons carry a stable source-scope tint through the existing `data.ribbon.color`, so long cross-unit relations stay traceable without a contract field, renderer branch or new knob; with/without evidence and a logged decision are under `docs/screenshots/edges/`. The command bar stays on one row at widths <=1000px, returning 50px of canvas height, and depth-3 inner chips reveal their full names on hover or keyboard focus.
- Pi fresh-audit follow-up (TODO6): the light-theme canvas readout now uses a light grayscale HUD token
  instead of the dark theme foreground (1.1:1 → 17.7:1); catalog summaries are 44px square bordered
  rows; label typography reserves glyph and padding width so packed portal and role labels no longer
  truncate; and the focus lens measures its source card and moves into free canvas space. The four
  fixes are gated by unit and browser assertions, and all gallery shots were recaptured with verdicts.
- Pi frame hygiene: the readout is anchored to the canvas so it no longer overlaps the transcript in
  the stacked arrangement; the proof catalog reframes after opening so its graph nodes are not clipped;
  the attention badge uses natural plurals and the catalog scroll starts at its first question.
- Pi reading comfort: expanded transcript rows show causal neighbors instead of repeating the message,
  and the light-theme card wash uses a softer token-derived shade.
- Pi proof lines name nodes instead of printing raw IDs, and the policy filter toggle follows the HUD
  control styling.
- Pi detail cards read as `Kind · Status` at every zoom; raw fields stay on hover. The deep-focus lens
  no longer magnifies internal identifiers. `verify:fast` runs types, unit tests and chrome e2e in one
  command without rewriting the gallery.
- Pi HUD diagnostics: the canvas readout shows only representation context by default; energy, overlap
  and fps stay on hover and are restored by the settings `diagnostics` toggle or `?debug`.
- Pi catalog cards disclose the question and launch links only when expanded, so the drawer reads as a
  scannable title list. The `catalog` shot is recaptured; `TODO4.md` records why gap/repulsion changes
  cannot shorten the long context diagonals in the fitted gallery.
- Test agility: one retry and `--fully-parallel` chrome e2e (~15s instead of ~37s), a 1.5px tolerance on
  the projected label minimum, and a 120ms rAF p95 budget. The motion comparison records evidence; pixel
  identity and viewport parity are not gates during active UI development.

### Removed

- `FractalZoomPlugin` — use `ZoomBandsPlugin` / `ScaleDomain`. No compatibility alias is kept.

### Not changed

- No immersive mode, ladder, gesture map or visual default has been promoted. Presets are examples,
  never recommendations. Participant study and release are fully deferred; no winner is published.

## Stability and deprecation policy

The published surface is alpha and additive. `LIBRARY_CONTRACT_VERSION` bumps only for new capability
axes or additive fields; capability is probed with `supports(...)`, never by version or renderer
identity. A moved public name is deleted in the change that adds its replacement; no alias or
deprecation shim is kept. See `docs/contract-versioning.md` and
`docs/adr/0013-additive-contract-versioning.md`.
