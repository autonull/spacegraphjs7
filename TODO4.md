# TODO4 — The Sculpting Plan

**SpaceGraphJS: from a capable cockpit to an intuitive, elegant, beautiful spatial interface.**
Self-contained. No time estimates. Ordered by dependency, not duration. Sections 1–11 remain the plan;
the progress block below records what has actually landed.

---

## Progress (updated 2026-11-21 — slices 1–3, 5, the standing track, composition and interaction ergonomics complete; next: motion, gated on demand)

**Slice 1 — One surface language: implemented in Pi, not yet promoted to a second host.**

| Item                                         | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boundary decision (§9.1)                     | done   | The owning module is `app/pi/src/shell/` (tokens, command surface, inspector, instrument selection). It stays inside Pi until a second host consumes it; no shared package was created speculatively.                                                                                                                                                                                                                                                             |
| Token module + Pi consumption (O2, H1, §9.2) | done   | `app/pi/src/shell/tokens.ts` resolves `DesignTokens` from `@spacegraphjs/shared/tokens` into a grayscale dark/light HUD and injects one `#shell-tokens` style element. `app/pi/index.html` now reads only `--sg-*` for color, type and spacing; the duplicated `--pi-*` color blocks were deleted, and `app/pi/src/theme.ts` reads the token names. `--pi-blend` remains a live policy-driven value, not a design token.                                          |
| Command bar + palette (J1, §10)              | done   | The header keeps identity, status, `/ commands`, surface, depth and focus; follow, axis, level, arrangement, catalog and rail moved into a native `<details id="settings-menu">`. `app/pi/src/shell/command-surface.ts` filters verbs, capabilities, chrome actions and every policy knob; `/`, `:`, `?` open palette, commands and help, with arrow/Enter/Escape and focus restore. `app/pi/tests/shell.spec.ts` covers keyboard, settings and token resolution. |
| Dockable inspector (J2, K4 bound only)       | done   | `app/pi/src/shell/inspector.ts` wraps the existing `#focus-lens` in an ARIA tablist (`detail`, `inner`, `signals`, `actions`), a pin control and a `tabpanel`. The `detail` tab remains the composite legacy view so shots and existing lens assertions are unchanged. The lens rebuilds markup only when focus/data changes and updates its transform on viewport changes; the inner tree keeps the existing ≤3 schema depth and chip cap.                       |
| Contextual instruments (J3, §9.4)            | done   | `app/pi/src/shell/instruments.ts` selects at most two instruments by node kind/status. The rail mounts only that pair for the focused node; the full kit mounts in the inspector's `signals` tab. `orchestration.spec.ts` and `shell.spec.ts` assert both halves.                                                                                                                                                                                                 |
| Review gate (§9.5)                           | done   | All 12 shots recaptured and reviewed in `docs/screenshots/index.html`; `cockpit` and `policy` show a compact bar with an unchanged canvas. `app/pi`: 95 unit tests, 66 e2e tests, vision/atlas gates and `tsc --noEmit` green.                                                                                                                                                                                                                                    |

**Clarifications that came out of this increment:**

1. Tokens are injected at runtime by the shell module, not declared in Pi's stylesheet. A host maps its own
   theme onto the same `--sg-*` names; Pi's grayscale HUD is one dataset, not a new global CSS contract.
2. The `detail` inspector tab is deliberately a superset (the former lens view). The other three tabs narrow
   it. This keeps the gallery byte-comparable and avoids a fourth representation rung.
3. Chrome font sizes and spacing gaps now come from tokens. Remaining pixel literals are panel geometry
   (rail width, lens size), canvas layout and LOD-derived card markup — not token roles. New CSS added in
   slice 1 uses token variables only.
4. `§11.1` (camera-move jank) is partially addressed by signature-gated lens rebuilds; the frame-time
   assertion is still owed. `§11.2` gained ARIA tabs/dialog and focus restore, but the 44px target audit,
   contrast audit and RTL pass are still owed. `§11.4` (domain `labelFor`) remains unscheduled.

**Slice 2 — Graph grammar and attention: implemented in Pi, gates green, not promoted past the flagship.**

| Item                                          | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shape language (H2)                           | done   | `app/pi/src/adapter.ts` emits one decorative `<i class="rung-shape">` per card; `app/pi/index.html` maps `data-kind` / `data-status` / `data-portal` to bracketed scope frames, a gate notch, a file-tab corner and one 3px severity bar. Radii stay 0 and the generic inset accent stripe is gone.                                                                                                                                              |
| Color semantics (H3)                          | done   | `app/pi/src/theme.ts` adds `context`, `causal`, `scope` and `severity` roles to all five `VIEW_PALETTES` and publishes `--view-*`; the HUD stays grayscale. `theme.backdrop` now defaults to `grid` at low alpha. Renderer theme colors fall back to HUD tokens when a palette role cannot clear 3:1 on the active background.                                                                                                                |
| Composed space (H4)                           | done   | `paint()` / `renderFocusLens()` publish `data-scope-focus` on `:root`. A focused scope adds one faint frame outline and repeating lane bands behind the canvas; both disappear when focus leaves the scope.                                                                                                                                                                                                                                 |
| Ranked ribbons and salience channels (I1, I2) | done   | `app/pi/src/attention.ts` reuses `mappingFor` / `applyEmphasis`. `emphasis.ribbonWidth` is a maximum; per-edge width = relation rank (causal > containment > context) × salience. New `emphasis.ribbonKinds` (`causal` default / `all` / `none`) and `emphasis.salienceSize` (default 1.15, opt-in 3) knobs; context edges become thin, dim inferred lines without ribbons. Default width 1.5 and causal base emphasis 0.45 keep ribbons subordinate to nodes. |
| Focus ring and connector (I3, I4)             | done   | The focused card always gets a 1px `--view-focus` ring, no longer gated on `focusScale`. A 1px SVG connector runs from the node to the inspector in both floating and pinned modes; the dashed canvas outline stays suppressed. Failure nodes carry one severity channel.                                                                                                                                                                   |
| Folded gates (§11.1, §11.2, M3, L4)           | done   | rAF p95 < 80ms during an edge flight; inspector tabs and pin meet 44px; `ContrastAuditor` passes every palette in dark and light; vision assertions cover intermediate descend frames, lens pin/unpin and all four gate shots in both themes; reduced-motion flights reach the final frame immediately.                                                                                                                                            |
| Review                                        | done   | All 12 shots recaptured and reviewed in `docs/screenshots/index.html`. `app/pi`: 108 unit tests, 76 e2e tests, vision gate, scale budgets and `tsc --noEmit` green. The pre-existing `verify` dependency-guard failure on five docs references is unchanged by this slice.                                                                                                                                                                  |

**Clarifications that came out of this increment:**

1. The shape layer is decorative markup plus CSS driven by existing contract attributes. No renderer branch, node field or new DOM subtree is introduced, so the gallery remains byte-comparable apart from the intended visual change.
2. Palette roles are host CSS data. Renderer status/selection colors that fail 3:1 fall back to HUD tokens, so the light theme uses the HUD's darker success/warning/error values rather than a vivid palette. The render model also carries the card background explicitly; without it the vision analyzer assumes a dark surface and reports false light-theme failures.
3. `emphasis.ribbonWidth` no longer means "one width for every causal edge"; it is a ceiling. `ribbonKinds=causal` is the default because `all` reintroduces the ribbon clutter the audit flagged. The 3× size remains an opt-in preset, never a default.
4. The focus ring is independent of `focusScale`; scaling stays purely opt-in. The connector is host DOM, not a contract seam.
5. The 44px check currently covers the inspector tab bar and pin. A full pass over command bar, rail and in-card actions is still owed, so §2's ergonomic-target claim is not yet universal.

**Slice 3 — Recursion, edges and proof: implemented in Pi, gates green, not promoted past the flagship.**

| Item                                              | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fast-loop prep (dev-loop items 1, 3, 4)           | done   | `app/pi/scripts/shot.ts` now fingerprints `src/**` recursively plus `packages/shared/src/**`; the both-themes vision test runs one representative shot (the full palette matrix is the unit `ContrastAuditor` audit at boundaries); root `package.json` gains `check` → `pnpm -r --if-present typecheck`, and `app/pi` gains a matching `typecheck` script. Item 2 stays a workflow note.                                                              |
| Inner topology and card registry (O3, O4, K1)     | done   | `app/pi/src/inner.ts` gains `radial`/`lane` placements and `innerConnectors`; `focusCardMarkup` draws a bounded SVG spoke layer. `app/pi/src/adapter.ts` adds a kind-keyed `registerCardTemplate` registry with the ladder as fallback. Both stay pure/Pi-local until a second host consumes them.                                                                                                                                                   |
| Portal previews and depth ruler (K2, K3)          | done   | `portalPreview` derives up to four stable glyphs from `ScopeSpec` and `paint()` attaches them to portal cards. `renderPortalCrumb` emits a vertical rung ruler with ticks; `fractal` now requests `emphasis.innerLayout: radial` and shows the connected two-chip topology.                                                                                                                                                                       |
| Policy disclosure, proof and onboarding (J4, J5, N1, N2) | done | `src/policy/panel.ts` collapses families by default and adds search, provenance and changed-only filters. A header proof line opens the catalogue; catalogue entries are question-first cards that expand to launch links. A dismissible first-run hint is stored client-side and suppressed in gallery shots.                                                                                                                                       |
| Shot review (M1)                                  | done   | The contact sheet keeps a previous/current pair per shot, a kept/rejected marker and a note field. Notes persist in `docs/screenshots/review.json` (data, not code); the in-browser "Copy review JSON" button exports accumulated edits.                                                                                                                                                                                                            |
| Recorded direction — edges and surfaces (§11.8)   | done   | `src/edges/TaperedEdge.ts` is a registered two-triangle trapezoid ribbon (broad at source, narrow at target, no length change); `spacegraph-renderer` maps ribbons to it. ADR 0014 records the two-consumer exception with before/after shots. Card surfaces gain a one-accent gradient wash and inset highlight. Shorter reach stays data: the `showcase` preset already uses `geometry.gap: 40` / `repulsion: 200`.                               |
| Review gate                                       | done   | All 12 shots recaptured and reviewed in `docs/screenshots/index.html`. `app/pi`: 118 unit tests, 77 e2e tests (single worker), vision and scale budgets green; root `pnpm run check` green across 31 workspaces; core edge tests (5) and `spacegraph-renderer` (22) green.                                                                                                                                                                        |

**Clarifications that came out of this increment:**

1. The renderer exception is a new registered edge type, not a host SVG overlay or a per-host branch. It is
   the only new renderer branch in the plan and is governed by ADR 0014; context edges remain thin and
   ribbon-free.
2. O3/O4 keep a clean Pi-local boundary (pure `inner.ts`, kind-keyed template registry) rather than a
   shared package. Promotion waits for a second host, as in slices 1–2.
3. The both-themes vision matrix is now a fast representative shot plus the unit `ContrastAuditor`
   palette audit. The full four-shot matrix is a slice-boundary gate, not a per-change gate.
4. The frame-time assertion passes in isolation but is sensitive to host load; run e2e with
   `--workers=1` on a busy machine. A subchip z-order fix removed the one chip-click interception flake.
5. The first-run hint is suppressed for `?shot=` URLs so gallery review stays comparable; the e2e gate
   exercises it on the normal entry route.

**Standing track — accessibility and parity (2026-11-21): implemented in Pi, gates green, not promoted past the flagship.**

| Item                       | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ergonomic target (§2, §11.2) | done   | `app/pi/src/shell/tokens.ts` publishes `spacing.target = 44px` as `--sg-spacing-target`. One token-driven rule in `app/pi/index.html` gives command-bar, rail and `.focus-button` controls a 44px hit area; the inspector tabs/pin reuse the same token instead of a literal. `app/pi/tests/shell.spec.ts` asserts the smallest representative control across all three areas is ≥44px. Bounded chip-internal controls (chip `↗` and subchips) stay below target inside the ≤3-depth lens; see remaining work.                                                            |
| Contrast audit (§11.2)      | done   | `app/pi/tests/shell.test.ts` audits every HUD text/status pair against background, card, popover and muted surfaces in both themes using the renderer's real `contrastRatio`. Chrome text opacities that diluted muted text on the light surface were removed. The renderer-palette audit stays in `grammar.test.ts`.                                                                                                                                                                                                                                                                                                         |
| RTL pass (§11.2)            | done   | Semantic chrome uses logical `inset-*`, `border-inline-*`, `padding-inline-*` and `text-align: start`; canvas decoration and the JS-anchored lens origin stay physical. Inner-chip placements use `inset-inline-start`, inspector tab arrow keys follow computed direction, and palette scroll uses `inline: 'nearest'`. `app/pi/tests/shell.spec.ts` boots English chrome with `dir=rtl` and asserts direction, settings anchoring and tab order.                                                                                                                        |
| Parity and review (L4, M3)  | done   | Full e2e single-worker: 79 passed, including reduced-motion final-frame and intermediate-frame vision. All 12 shots recaptured and reviewed in `docs/screenshots/index.html`; `pnpm run check` green across 31 workspaces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Clarifications that came out of this increment:**

1. The ergonomic target is a token, not a new CSS literal: `--sg-spacing-target` is the single source for
   every 44px hit area. Physical coordinates left in `index.html` are canvas decoration (scope brackets,
   file-tab corner) or the canvas-anchored lens origin; they are not semantic chrome.
2. The RTL gate exercises English chrome under forced `dir=rtl`. It does not substitute for a real RTL
   locale, mixed-script labels or pointer-resize verification; those stay in the remaining work.
3. Chip-internal controls are deliberately excluded from the 44px rule: enlarging them would overflow the
   bounded inner tree (K4). A design decision is owed before changing that exception.

**Visual-correctness pass (2026-11-21): the recorded slice-3 treatments were code-complete but visually absent from the gallery.**

| Item                            | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root-cause audit                | done   | Three independent defects hid the treatments. `LODPlugin._updateEdgeVisibility` unconditionally re-showed every edge's base `Line2` on each pre-render, overriding `TaperedEdge`'s constructor-time hide. `attention.ts` multiplied ribbon radii by `weight` and `TaperedEdge.update` multiplied by `weight` again, so the 1.5-unit ceiling produced sub-pixel polygons. The card wash used a 9% accent with a `transparent` fallback, effectively invisible on the HUD surface.                                                                                                              |
| Tapered ribbons actually render | done   | `Edge.suppressLine` is now an internal flag honoured by `LODPlugin`, so geometry-drawing edges keep their base line hidden. `attention.ts` treats `minRadius`/`maxRadius` as literal endpoints; the ceiling moves 1.5 → 60 world units (cards are 178–320 units wide) and the polygon carries a bright-source → dim-target vertex gradient. `TaperedEdge` remains the single ADR 0014 renderer exception. Wedges are legible in `cockpit`, `neon-cockpit` and both themes.                                                      |
| Card surfaces actually shaded   | done   | `index.html` wash raised to a 20% kind-tinted diagonal plus a 34% bottom shade with a real accent fallback; inset highlight/shadow raised to 34%/42%. The approval override keeps its severity channel and the same highlights. Tints are visible per kind in every shot without losing 3:1 text contrast in either theme.                                                                                                                                                                                                                                                                                                                             |
| Gates and review                | done   | All 12 shots recaptured and reviewed in `docs/screenshots/index.html`; `cockpit`, `neon-cockpit` and `light-theme` checked at zoom. `app/pi`: 120 unit tests and 79 e2e/vision tests green; root `pnpm run check` green across all workspaces. The one changed unit assertion now checks taper behavior (`minRadius < maxRadius`) instead of the old double-weight constant.                                                                                                                                                                                                                                                                             |

**Clarifications that came out of this increment:**

1. The prior progress rows called these treatments done because the code existed. The rendered gallery is the authority: the treatments were invisible until this pass. Slice 3's visual claims are now true, not merely recorded.
2. No contract field and no new renderer branch were added. `suppressLine` is an internal `Edge` flag, and the width change is a policy default plus a corrected interpolation, not a new mechanism.
3. Context edges still render as thin `Line2` connectors by design; the long gray diagonals in the default cockpit remain. Shortening their reach is still a data change (`geometry.gap`/`repulsion`), not a renderer change.

**Slice 5 — Node anatomy (2026-11-21): implemented in Pi, gates green, not promoted past the flagship.**

| Item                                   | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parts vocabulary and rung skeletons    | done   | `app/pi/src/anatomy.ts` defines `anatomyHeader`, `anatomySignal`, `anatomyRow` and `anatomyPort`, then assembles a distinct skeleton per rung: overview = header only; execution = header + signal + body row; detail = header + status + wrapped body/telemetry rows. New CSS in `app/pi/index.html` reads only `--sg-*` tokens and logical `inset-*` properties.                                                                                                          |
| Kind-specific arrangements             | done   | `arrangementOf` maps run/unit/message/tool/artifact/approval/error (plus file, action, read-tool, state, retry aliases) to eight arrangements; messages and artifacts drop the activity signal, tools keep it, gates and failures keep the existing notch/severity shape. `ANATOMY_KINDS` registers every kind through the existing `registerCardTemplate` registry in `client.ts`; the default ladder stays the fallback.                                  |
| Source and target ports                | done   | `derivePorts` derives outgoing/source and incoming/target sides from view edges and simulated positions; sides are card-local logical `start`/`end` or physical `top`/`bottom`. `anatomyPort` draws them inside card edges. The host writes them into `node.data.ports` for cards and the lens. The renderer still draws ribbons center-to-center, so the ports are the visible endpoint marks rather than a new renderer seam.                      |
| One anatomy across card and lens       | done   | `focusCardMarkup` delegates to `anatomyLens`, which reuses the same header, signal, body-row and port parts at the detail rung and adds the bounded inner topology. The lens keeps `.focus-detail`, `.focus-chip`, `.focus-connectors`, `.focus-actions` and 44px `.focus-button` hooks, so shell and keyboard tests are unchanged.                                                                                                                     |
| Gates and review                       | done   | `node-detail`, `fractal` and `cockpit` recaptured and reviewed in `docs/screenshots/index.html`; all 12 shots recaptured. `app/pi`: 128 unit tests, 79 e2e/vision tests green (single worker), `pnpm scale` budgets met, root `pnpm run check` green across workspaces. `pnpm verify` still reports the same five pre-existing docs references.                                                                                                        |

**Clarifications that came out of this increment:**

1. The anatomy is one Pi-local module registered behind the existing card-template registry. No contract field, node class, renderer branch or fourth representation rung was added; promotion still waits for a second host.
2. Ports are host DOM marks on card edges, derived from edge direction and neighbour positions. A ribbon still reaches the node center; aligning its geometric endpoint to a card boundary would need a renderer change and a second consumer, so the port stub is the honest seam.
3. Compact cards carry a status dot only at the detail rung; the full status chip stays in the enlarged lens. Adding the dot to the execution rung clipped `Approve patch`, and the gate shots caught it before review.
4. Detail and lens body rows wrap up to three lines; execution rows stay single-line ellipses. `labelFor` and clipped source labels remain the next work item — this slice changes the skeleton, not the source text.

**Content legibility (2026-11-21): short titles and defined non-happy-path frames.**

| Item                                | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labelFor` domain accessor          | done   | `packages/domain/agent/src/vocabulary.ts` exports `labelFor`: messages use their role (`assistant`, `user`), artifacts use the path basename, approvals become `approve`, and other kinds keep their label. `buildAgentView` applies it once and stores the original in `data.fullLabel`. No `DomainVocabulary` field, kernel contract change or edit to the other three domains.                                                                                                      |
| Full text kept in detail and proof  | done   | `detailOf` in `app/pi/src/anatomy.ts` falls back to `fullLabel`; transcript rows in `host.ts` use `fullLabel` as their prefix with the message text after the colon. Cards and the lens show short titles while detail rows, telemetry and the transcript keep the full source text.                                                                                                                                                                                                           |
| Empty, pending and failed frames    | done   | `app/pi/src/shell/frames.ts` owns one hidden `#state-frame` with three token-styled states. `host.setFrame` plus the derived zero-node empty state toggle it; `client.ts` sets pending when the EventSource opens, clears it on `onopen` and sets failed on `onerror`. Pending is a quiet corner chip; empty and failed are centered cards. The same `setFrame` is exposed on `__pi` for scripted use.                                                                                    |
| Gates and review                    | done   | `cockpit`, `node-detail`, `fractal` and `light-theme` recaptured and reviewed in `docs/screenshots/index.html`; all 12 shots recaptured. Pi: 132 unit tests, 81 e2e/vision tests green (single worker); agent domain: 10 tests; `pnpm scale` budgets met; root `pnpm run check` green. `pnpm verify` still reports the same five pre-existing docs references.                                                                                                                       |

**Clarifications that came out of this increment:**

1. `labelFor` is a plain domain export applied by the view builder, not a new `DomainVocabulary` field. That keeps it a vocabulary rule rather than a contract change; another domain can add its own accessor when it has a consumer.
2. Shorter labels changed the `labelFontPx` inputs and exposed a timing flake in `browser.spec.ts`: the minimum-font assertion read the DOM on the same tick as the knob change. It now polls the applied value. The invariant and threshold are unchanged.
3. The three frames are shell-owned and driven by one public method; no product seam was added for tests. The e2e gate drives the same `setFrame` a script would call.
4. `cockpit` and `light-theme` no longer ellipsize card labels; the transcript regains full `user message` / `Approve patch` prefixes while cards stay short. The remaining clipped text is pre-existing chip geometry, not a source label.

**Composition and default palette (2026-11-21): a quiet canvas frame and palette-owned causal ribbons.**

| Item                                    | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet frame for graph shots             | done   | `Shot.rail?: boolean` gives graph-centric shots (`cockpit`, `node-detail`, `deep-focus`, `fractal`, `dynamic-range`, `aurora-map`, `neon-cockpit`, `light-theme`) the full canvas width; chrome shots (`layout-*`, `catalog`, `policy`) keep the rail. `PiHost.applyShot` applies the rail state before framing and re-fits on change, so gallery navigation is deterministic in both directions. `app/pi/tests/shell.spec.ts` asserts the rail hides on `cockpit`, restores on `policy`, and that the canvas is wider in the quiet frame.                                                                                   |
| Tightened framing                       | done   | `fitView` takes a shot `padding` (default 60); `cockpit` uses 40 and `dynamic-range` moves 0.5 → 0.58 with the rail closed. Recaptured `cockpit` shows larger, denser nodes with the transcript as the only chrome; `dynamic-range` keeps its wide-overview question but with bigger nodes and no rail competing for attention. No clipping at either edge; vision and scale gates green.                                                                                                                                                                                                                                                                                        |
| Causal color as data with provenance    | done   | `app/pi/src/theme.ts` exports `paletteCausal`, reusing the palette `causal` role already published as `--view-causal` to CSS (card notch, connector) — a second consumer, so no new global token. `attention.ts` writes the color into `RenderEdge.data.ribbon.color`; `packages/spacegraph-renderer/src/mapping.ts` passes it to `TaperedEdge` as `data.color` with the edge-style fallback, adding no renderer branch. `legible()` keeps 3:1 in both themes; `mono` ribbons brighten from edge gray to causal light gray, neon/aurora match the palette, light theme falls back to a dark accent.                                                        |
| Gates and review                        | done   | All 12 shots recaptured and reviewed in `docs/screenshots/index.html`; `cockpit`, `dynamic-range`, `light-theme`, `neon-cockpit`, `deep-focus` and `aurora-map` checked at zoom. `app/pi`: 134 unit tests and 82 e2e/vision tests green (single worker); `pnpm scale` budgets met; root `pnpm run check` green across all workspaces. `pnpm verify` still reports the same five pre-existing docs references. Decision recorded in ADR 0014.                                                                                                                                                                                                                                             |

**Clarifications that came out of this increment:**

1. The quiet frame is shot data, not a product default change. The rail remains open on the normal entry route; only gallery shots that ask a question about the graph opt into the full-width frame. `applyShot` re-opens it when navigating to a chrome shot.
2. Ribbon color is palette data, not a new `RenderTheme` role or design token. The causal role already had a CSS consumer, so the renderer reuse satisfies the two-consumer rule without a contract change; `mapping.ts` keeps the existing fallback when a host supplies no ribbon color.
3. `dynamic-range` stays intentionally sparse: the shot's question is how far the scene can zoom before structure stops communicating. The change tightens node size and removes competing chrome; it does not fabricate density by changing the fixture.
4. The brighter causal color makes ribbons more legible, not louder: width is still capped at 60 world units against 178–320-unit cards, and the brightness ramp still runs source → target. The `neon-cockpit` shot was re-checked specifically for the earlier "ribbons outshine nodes" regression.
5. Interaction ergonomics is now the next fundamental. The bounded chip-control 44px exception and the inspector reach around the new node anatomy are the concrete work; reduced-motion final-frame and intermediate-frame vision stay standing gates.

**Interaction ergonomics (2026-11-21): the bounded chip exception is decided and compensated, and one action path serves the lens and the palette.**

| Item                                | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chip-control exception decision     | done   | Kept the K4 cap. The chip stays a 20px bounded preview; its 44px `↗` box is clipped by `overflow: hidden`. Every chip target now has a 44px equivalent in the inspector's `actions` tab and the palette, so the exception is compensated rather than hidden. `app/pi/tests/focus-lens.spec.ts` asserts one 44px target per chip and that activating one focuses the node.                                                                                                                                                                                                                                                             |
| Focus and inspector reach           | done   | `#focus-lens button:focus-visible` draws a 2px `--sg-colors-ring` outline. A `Focus the inspector` palette command moves focus to the active tab. `CommandSurface.close(keepFocus)` no longer restores the opener when a command moved focus or switched surface mode — the old restore silently undid the reach. `app/pi/tests/focus-lens.spec.ts` and `shell.spec.ts` assert the ring and the focus hand-off.                                                                                                                                                                                                                                                                       |
| Command surface around the anatomy  | done   | `PiHost.commands()` adds a `focus` group: center/trace/follow for the focused node, approve/reject for approvals, and one `Focus inner · <label>` command per bounded chip (same ≤6 cap as `innerTree`). Every row calls `handleNodeAction`, the same path as the lens buttons; no second action mechanism. `app/pi/tests/shell.spec.ts` asserts the group is filterable and the inspector command lands focus in the lens.                                                                                                                                                                                                                                               |
| Gates                               | done   | `app/pi`: 134 unit tests and 85 e2e/vision tests green (single worker); `tsc --noEmit` clean. No gallery recapture: the target list appears only in the `actions` tab and the ring only on keyboard focus, so no shot uses either — the e2e assertions are this slice's gate. Standing reduced-motion final-frame and intermediate-frame vision gates remain green in the full suite.                                                                                                                                                                                                                                                                                                       |

**Clarifications that came out of this increment:**

1. Enlarging the chip controls was rejected: the chip is 20px tall by design, a 44px hit area would overlap neighbouring chips and reintroduce the click interception fixed in slice 3. The bounded tree stays authoritative; the 44px controls live in the actions tab and the palette.
2. The `actions` tab target list is not a fourth representation rung. It is the existing tab showing the same focus verbs at a compliant size — the compact chip is a preview affordance, and the tab is its action surface.
3. Focus restore in the command surface is now conditional, which also fixes mode-switching palette commands being immediately closed. This belongs to §11.2's focus-management requirement, not to a new keyboard binding.
4. No new policy knob or contract field. The chip cap comes from `emphasis.innerDepth`, already live; the palette group is derived from the same focused node and `innerTree` that build the lens.

**Direction recorded for slice 3 (user feedback, 2026-11-21):**

- Edges are too long and too line-like. Shorten their reach (`geometry.repulsion`, `geometry.gap` or a new
  link-length policy) and replace thin tubes with tapered polygon geometry — triangles/trapezoids — that
  reads as tangible and weighted. The user chose a **renderer edge type** over a host SVG overlay. This is
  an explicit exception to §3.7 / §7's two-consumer rule and needs a one-line decision record with
  before/after shots per §11.8.
- Card surfaces need subtle color shading and depth cues — layered gradients, inset highlights — instead of
  flat dark rectangles with borders. Stay modern and minimal: one accent channel, no bloom, particles or new
  chrome. Keep 3:1 contrast in both themes and keep the frame-time and scale budgets green.
- Tests stay loose and fast. Prefer one behavioral assertion per change over exact pixel, geometry or CSS
  constants; avoid exhaustive matrices where a representative shot passes. A gate should catch breakage,
  not dictate implementation detail.

**Development-loop notes (items 1, 3 and 4 landed with slice 3; item 2 remains a workflow note):**

1. `app/pi/scripts/shot.ts:52` fingerprints only top-level `src/*.ts` and `src/policy/*.ts`; `src/shell/**` and
   `packages/shared/src/tokens.ts` are invisible to `--watch`. Make it recursive and include shared tokens.
2. Tier the loop: tsc + unit (~2s) → one targeted Playwright spec → the four slice shots → full `shots:all`
   plus vision and e2e only at slice boundaries. Keep `pnpm --filter pi dev` and `server` running so Playwright
   reuses them (`app/pi/playwright.config.ts:14`).
3. The both-themes vision test (`app/pi/tests/vision.spec.ts:113`) boots eight pages (~26s). Keep one
   representative shot in both themes plus the unit `ContrastAuditor` audit; leave the full matrix at the
   boundary gate.
4. Root AGENTS names `bun run check`, but `package.json` has no `check` script. Add one wrapping package
   typechecks so the fast loop has one unambiguous command.

**Remaining work, in order — fundamentals first, parity last:**

1. **Motion and life (L1–L3, §6) (next, gated on a recorded demand).** Interaction ergonomics is done: the
   chip exception is compensated, the lens has a keyboard focus ring, and the palette shares the lens action
   path. The slices that parked motion — anatomy and composition — have landed, but effects were flagged as
   overdone. Do not build new animation: promote an existing opt-in preset (§10) only when a concrete
   comparison exists, keep it data with provenance, and keep reduced-motion parity and the frame-time gate
   green. If no demand appears, leave this parked and move to the next item when its consumer exists.
2. **Slice 4 — Proliferation (O5–O7).** Still gated on a second host consuming the shell, tokens and
   inspector unchanged. Verified 2026-11-21: `app/demo` imports only mechanism-layer helpers; the only
   importers of `app/pi/src/shell` and `@spacegraphjs/shared/tokens` live in Pi. Not work we can start;
   when the consumer exists, split core/domain policy vocabulary, emit the world-host template and a real
   `createVisionAssert` gate from the scaffold, replace generated `vocabulary.ts` with
   `@spacegraphjs/shared/domain`, and add one cross-domain shot. No contract or position-authority change.

**Peripheral — parked, not dropped:**

- RTL parity: the forced-`dir=rtl` gate stays green, but a real RTL locale, mixed-script labels and
  keyboard/pointer resize in both directions wait until the fundamentals above are reviewed.
- M4 ergonomic counters and M2 perceptual smoke (cut): both add gates without adding certainty.
- N3/N4 published gallery, study and release stay with TODO3's G3–G5.
- Housekeeping: confirm ADR 0014, fill `docs/screenshots/review.json` verdicts, re-run e2e with
  `--workers=1` on a loaded machine.

Slices 1–3, 5, the standing accessibility track, composition and interaction ergonomics are recorded as
done; the visual-correctness and content-legibility passes repaired treatments that were recorded before
they actually rendered or read well, composition gave graph shots a quiet frame and palette-owned causal
ribbons, and ergonomics compensated the bounded chip exception with 44px targets in the actions tab and
palette. Last prior commits: `bddd7a6` (slice 2), `01c4759` (slice 3), `0c0b184` (standing track),
`80dd02e` (visual pass), `86dba56` (plan ordering), `1021683` (node anatomy), `c5c02d8` (labels/frames),
`3f2a76b` (composition). The remaining program is motion (gated on a recorded demand) and proliferation
(gated on a second host); parity stays peripheral. The study, release and hosted URL stay deferred with
TODO3's G3–G5.

---

## 0. Context

TODO3 delivered the mechanisms and the evidence surface. The configuration spine has 41 knobs with
provenance and hot apply; navigation has a closed verb set; the Pi flagship has palettes, backdrops, a
bounded inner-node lens, faceted causal ribbons, a 12-shot deterministic gallery, and a watch-mode
capture loop. Root tests, Pi unit/e2e, renderer package tests, the vision gates and the scale budgets
are green.

What is still missing is **form**. The current flagship communicates _that_ the system is capable but
not yet _why it feels good to use_. Nodes are near-uniform gray rectangles with clipped labels; depth
and attention are optional effects rather than a visual grammar; the catalog (the proof surface) is
hidden behind a drawer; motion is limited to camera flights and rung crossfades; chrome outspeaks the
graph. TODO3 built the instrument. TODO4 shapes it.

Everything below composes the TODO3 invariants. Nothing here re-litigates them: no new position
authority, no renderer branch, no immersive default, no contract field without a real second consumer,
no fabricated study, release or deployment.

---

## 1. Honest audit

### 1.1 Deficient

| Area                        | Evidence in the current gallery                                                                     | Consequence                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Visual grammar**          | Nodes are gray rectangles; `data-kind` changes only a 2px accent stripe and a radius (now zero).    | Kind, scope, status and importance are not legible at a glance.         |
| **Type hierarchy**          | One 11–13px monospace register for chrome, cards, chips and labels; `user mess…`, `assistant mes…`. | No reading order; detail rungs cannot feel like a reveal.               |
| **Hierarchy of attention**  | `emphasis.focusScale` and neighbors default to `1`; only color and the lens direct attention.       | The graph does not tell the eye where to go before the user interacts.  |
| **Recursive depth**         | The lens is a CSS grid of chips at depth 2; no connector to the node, no sense of "inside".         | "Fractal" is navigation between flat views, not an experience of scale. |
| **Composed negative space** | `dynamic-range` and `fractal` leave large black areas; grid/starfield are decorative only.          | Emptiness reads as missing content, not as depth or quiet.              |
| **Motion and life**         | Static frames; activity is a five-bar glyph, edges are static tubes.                                | A spatial system looks like a diagram.                                  |
| **Proof discoverability**   | The catalog is a closed drawer; screenshots of the flagship show no evidence surface.               | The strongest differentiator is invisible to a visitor.                 |
| **Affordance discovery**    | Verbs live in keyboard bindings, double-clicks and a tiny header; no visible hint.                  | Users cannot find what the system can do.                               |

### 1.2 Overdone

| Area                   | Evidence                                                                                              | Correction                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Ribbons**            | Every causal edge is a bright, 3-segment tube of equal weight; in `neon-cockpit` they outshine nodes. | Fewer, narrower, semantically ranked ribbons; keep thin lines for context.     |
| **Header**             | 10+ controls (follow, depth, axis, level, arrangement, surface, toggles) in one row.                  | Collapse into a command/settings surface; keep three primary controls visible. |
| **Rail instruments**   | Seven `INSTRUMENT_IDS` mount into a 200px rail regardless of relevance.                               | Show one or two contextual instruments; the rest on demand.                    |
| **Policy panel**       | 41 auto-generated knobs appear as one flat list.                                                      | Group by family, collapse by default, add search and provenance filters.       |
| **Catalog text**       | When open, the drawer is a wall of capability and experiment prose.                                   | Progressive cards: question first, details on expand.                          |
| **Effects in presets** | Glow, grid and starfield exist but only as opt-in data.                                               | Keep them data; make one restrained treatment the default visual baseline.     |

### 1.3 Keep

The grayscale HUD, one policy source with provenance, deterministic shots, the bounded inner tree,
square corners, the suppressed dashed outline, the one-fit-at-startup rule, and the vision gates.
These are settled and should not be reworked.

### 1.4 Domain neutrality audit

TODO3 proved a second consumer for the mechanism layer and one world with four domains. The _visual
and ergonomic_ layer has not had that pass. Everything good in this document currently lives in
`app/pi/`: the lens, inner layout, ribbons, palettes, drawers, type and spacing, shot catalog. A new
domain inherits the spine and the vision gate from the scaffold but inherits none of the craft.

| Gap                                          | Evidence                                                                                                                                            | Universal need                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Chrome and grammar are Pi-local              | Header, lens, drawers and CSS live in `app/pi/index.html` and `app/pi/src/host.ts`                                                                  | A host-neutral shell with slots for domain vocabulary              |
| Inspector is host-specific                   | `focusCardMarkup` assumes agent kinds and verbs                                                                                                     | A domain-supplied neighborhood/action adapter behind one inspector |
| Visual tokens are per-page CSS               | Palette variables and type sizes are declared in Pi's stylesheet                                                                                    | A shared token layer every host resolves into its theme            |
| Policy is partly semantic                    | `surface` and `orchestration` families describe Pi's transcript and agent loop                                                                      | A neutral core family set plus a domain family                     |
| Shots are Pi-only                            | `SHOTS` and the capture CLI are wired to `app/pi`                                                                                                   | A fixture + shot convention the scaffold emits for every domain    |
| One world is a demo                          | `app/demo/src/world-host.ts` composes four domains in one canvas                                                                                    | A documented default architecture, not a special case              |
| Scaffold vision gate is a smoke check        | `packages/create-spacegraph/domain.js:353-366,467-474` emits only `toBeVisible`, while Pi uses `createVisionAssert`                                 | Generated domains need a real legibility gate, not a placeholder   |
| Scaffold duplicates shared helpers           | generated `vocabulary.ts` re-implements `dataString`/`roleOf`/`relationOf` (`domain.js:122-128`) instead of importing `@spacegraphjs/shared/domain` | Generated code must drift less, not more                           |
| Agent semantics leak into neutral interfaces | `FacetAccessors` carries `isFailedTool`/`isSubagentCall` even in the workflow wrapper                                                               | Rename to generic roles before generalizing further                |

---

## 2. Destination

Perfection here is not a fixed look. It is six qualities, each with an operational test.

1. **Intuitive** — every verb is discoverable in three ways (visible affordance, keyboard hint, command
   palette); a first-time user reaches a revealed node and back home without documentation.
2. **Ergonomic** — the focused object, its exits and its next action are within one eye movement; no
   control is smaller than the ergonomic target; no state is more than one keystroke from a familiar view.
3. **Elegant** — one type scale, one spacing scale, one shape language, one accent discipline; no
   control or panel exists only to demonstrate a capability.
4. **Beautiful** — depth, hierarchy and motion make negative space intentional; the graph is the
   most compelling rectangle on screen.
5. **Composed** — a screenshot at any shot id has a clear subject, a supporting context and a quiet
   frame; nothing is clipped, nothing is a wall of text.
6. **Portable** — the same grammar, tokens, inspector, drawers, shot loop and proof surface work for
   workflow, filesystem and data domains without copying Pi's CSS or rewriting its verbs.
7. **Still honest** — every new default is a preset until a recorded comparison and a human decision
   promote it; the study and the release stay deferred.

---

## 3. Invariants

Inherited from TODO3 and extended:

1. **One grammar.** Type, spacing, color, shape and motion are policies, not per-component constants.
2. **One attention model.** Salience is scored once; size, opacity, ribbon weight and label density are
   channels of that score. No component invents its own "important" flag.
3. **One focus, many rungs.** The focused object changes representation, not identity or position.
4. **Progressive disclosure by default.** Advanced controls, instruments and proof live behind one
   obvious affordance; they never consume canvas by default.
5. **Legibility gates beauty.** Every new visual state passes vision assertions at settled _and_
   intermediate frames, in dark and light themes, with reduced motion.
6. **Motion is optional and semantic.** Animation communicates change of state; it never decorates a
   static frame and never runs under reduced motion.
7. **No renderer branch.** New visuals use existing contract data (including `RenderEdge.data`) and
   host DOM/CSS. A renderer or contract change needs a measured demand and two consumers.
8. **One substrate, many vocabularies.** Generalize from a second real consumer, never from a hypothetical
   one; a domain supplies kinds, relations, verbs and instruments, never a second renderer or grammar.
9. **The gallery is the spec.** A change to appearance is not done until its shots are recaptured,
   reviewed in the contact sheet, and asserted by the e2e gate.

---

## 4. Workstreams

This is a catalog of ideas grouped by concern. Execution is **not** one workstream at a time; §6
consolidates them into four vertical slices.

### O — Universal substrate and proliferation (catalog; boundary owned by slice 1)

**Goal:** every new domain inherits the crafted UI, not just the mechanism spine. This workstream runs
beside H: H must define tokens in a form another host can resolve, not as Pi-only CSS.

- O1 **Shell kit.** Extract the header/command bar, drawers, inspector frame and transcript shell from
  `app/pi/index.html` + `host.ts` into a host-neutral shell module. A host supplies identity, verbs,
  surface controls and fixtures. Pi is the first consumer; Graph IDE or the one-world demo is the second.
  Promotion waits for that second consumer, per the existing rule.
- O2 **Shared visual tokens.** Move type, spacing, palette and shape tokens out of Pi's stylesheet into
  a resolvable token layer that any host maps onto its own CSS variables. Palette/backdrop/glow stay
  policy data; only their _resolution_ becomes shared. Pi's grayscale HUD becomes one theme among many.
- O3 **Domain-neutral inspector.** `innerTree`, `innerPlacements` and the lens markup become a pure
  inspect module with a domain adapter: child relation kinds (`contains`, `delegates`, `depends-on`,
  `part-of`), chip fields, and verbs. The agent adapter stays in `app/pi`; the traversal, bound and
  placement logic does not. The contract seam is already intended for this: `getNodeScreenPosition` is
  documented as how a host anchors a detail surface to a node (`packages/renderer/src/index.ts:284-289`).
- O4 **Card template registry.** The three-rung ladder plus the detail cockpit becomes a reusable
  template registry keyed by kind, registered by the _host_ through its existing adapter slot (slot 4)
  so policy stays host-side. The scaffold emits a starter set; no new `RenderNode` field, no renderer
  branch. This is where "every rectangle is a portal" gets a default implementation.
- O5 **Core policy vs domain policy.** Separate a neutral core (bands, ladder, salience, emphasis,
  camera, depth, widgets, geometry, guardrails, navigation, theme) from a domain family. `surface` and
  `orchestration` remain Pi-local until a second domain needs them; do not generalize them by guesswork.
  Audit semantics that hide in neutral families: `guardrails.window` says "newest turns", and
  `emphasis.innerDepth`/`innerLayout`/`ribbonWidth` bundle Pi craft — split their vocabulary, not just
  their location, before a second domain consumes them.
- O6 **One world as the default architecture.** The scaffold emits a world-host template: domains as
  isolated child scopes, path-qualified ids, one `ScopeSimulation`, one camera, one cross-domain trace.
  The four-canvas `InterGraphEdge` case stays the separate-surface embedding option, not the norm.
- O7 **Universal shots and proof.** The scaffold emits fixture + shot catalog + capture invocation, so
  a new domain is born with deterministic screenshots, vision gates and the same contact sheet. Its
  `verify:visual` must call `createVisionAssert`, not the current `toBeVisible` smoke check, and its
  generated vocabulary must import `@spacegraphjs/shared/domain` instead of re-implementing it. At least
  one shot per domain and one cross-domain shot belong to the shared gallery.
- O8 **Domain capability matrix.** Define explicitly what the universal grammar means where it matters:

    | Domain         | Nested scope       | Attention signal    | Inner content           | Time/severity axis |
    | -------------- | ------------------ | ------------------- | ----------------------- | ------------------ |
    | workflow       | subworkflow / step | blocked or retrying | gate, retry chain       | run order          |
    | filesystem     | directory / symbol | recently changed    | diff, blame, dependents | history            |
    | data           | pipeline / stage   | failed / drifting   | schema, sample rows     | stream position    |
    | knowledge      | note / cluster     | linked / stale      | backlinks, provenance   | edit history       |
    | media          | session / track    | playing             | waveform, clip list     | transport time     |
    | infrastructure | service / deploy   | incident severity   | live metrics            | alert timeline     |

    Of these product forms, only Graph IDE and the explorer exist as runnable surfaces. The knowledge
    atlas, incident war room, research notebook and music workspace remain `docs/POSSIBILITIES.md` ideas;
    O8 defines their _requirements_ on the substrate, not a schedule to build them.

- **Gate:** a second host consumes the shell, tokens and inspector with unchanged flagship behavior;
  the scaffold emits the new pieces; one cross-domain shot is green; no contract or position-authority
  change. Until that consumer exists, O1–O4 stay as extracted-in-Pi modules with a clean boundary only.

### H — Visual grammar (foundation)

**Goal:** nodes communicate kind, scope and state without reading their labels.

- H1 **Type and spacing scale.** One token set in `app/pi/index.html` for display/title/body/meta sizes,
  one spacing ladder (2/4/8/16/32). Apply to cards, lens, rail, transcript, catalog. Kill the 11px-everywhere
  register. Labels use `text-overflow` with a real title attribute so nothing is silently clipped.
- H2 **Shape language.** Square corners are the baseline. Distinguish kinds with _structure_, not radius:
  scope portals get a bracketed glyph frame; errors get a left severity bar; approvals get a gate notch;
  artifacts get a file-tab corner. Implemented in `cardMarkup`/`focusCardMarkup` with escaped markup and CSS.
- H3 **Color semantics.** VIEW_PALETTES gain semantic roles for `focus`, `context`, `causal`, `scope`,
  `severity`. Chrome stays grayscale. One restrained default treatment: a subtle grid or horizon at low
  alpha, chosen by preset data, never an unconditional effect.
- H4 **Composed space.** Scope frames get a faint boundary contour and lane bands only when a scope is
  focused; the void becomes legible as "space between scopes" rather than emptiness.
- **Gate:** vision assertions for all three rungs in both themes; no truncated label in any shot;
  snapshot review of `cockpit`, `node-detail`, `dynamic-range`.

### I — Attention and edge language

**Goal:** the graph directs the eye without enlarging nodes by default.

- I1 **Rank the ribbons.** `emphasis.ribbonWidth` becomes a _maximum_; actual width comes from
  salience × kind (causal flow > containment > reads). Context edges stay thin and dim. Cyan bands
  stop dominating. Add `emphasis.ribbonKinds` as an enum knob (`causal` / `all` / `none`).
- I2 **Salience-to-channel mapping.** Reuse `mappingFor`/`applyEmphasis` vocabulary: salience drives a
  bounded size range (≤1.15 by default), opacity and edge thickness; the 3× scale stays an opt-in preset.
- I3 **Focus ring, not a box.** Replace the floating-lens-only focus signal with a restrained ring plus
  a one-pixel connector from the node to its lens. Keep the dashed outline suppressed permanently.
- I4 **Severity without noise.** Failure nodes get one semantic channel (color bar or pulse), never four.
- **Gate:** default shots show one clear focal point; `focus-lens` remains a launchable alternative;
  ergonomic counters show no increase in wrong turns or zoom reversals under the default.

### J — Chrome reduction and progressive disclosure

**Goal:** the graph owns the screen; controls appear when needed.

- J1 **Command bar.** Reduce the header to identity, status, a compact command button (`/`) and three
  primary controls (surface, depth, focus). Move follow/axis/level/arrangement into a settings popover
  with the same hooks behind it. Keyboard `:`, `?` and `/` open command, help and palette.
- J2 **Dockable inspector.** The focus lens becomes a real panel with tabs: `detail`, `inner`, `signals`,
  `actions`. Pin/unpin to a corner; unpin follows the node. This replaces the floating-box feel without
  adding a renderer seam.
- J3 **Contextual instruments.** `#instrument-kit` shows at most two instruments chosen by node kind and
  task; the rest are available from the inspector tab. `widgets.dock` already controls placement.
- J4 **Policy panel as inspector.** Family sections collapsed by default, search box, provenance filter,
  and "changed only" view. 41 knobs stay reachable without being presented all at once.
- J5 **Proof moment.** Add a compact "evidence" card to the default frame — one line: presets, experiments,
  last recorded comparison — that opens the catalog drawer. The proof surface stops being invisible.
- **Gate:** keyboard-only run of all verbs; reduced-motion run; no regression in `catalog`/`policy` shots;
  canvas width at default ≥ current width.

### K — Recursive representation

**Goal:** make the inner tree feel like depth, not a spreadsheet.

- K1 **Connector topology.** Draw the inner tree as a tiny graph: chips connected by short lines to the
  focused node, laid out on a radial or lane placement (`innerLayout` gains `radial`, `lane`).
- K2 **Portal previews.** A portal node at the execution rung shows a miniature of its child scope
  (bounded to 4 glyphs) derived from `ScopeSpec`, not a copy of its label. Descend dissolves from that
  preview into the real frame, giving continuity.
- K3 **Breadcrumb as depth ruler.** The existing portal crumb becomes a vertical scale with rung ticks;
  clicking a tick flies to that scope. `navigation.breadcrumbs` keeps it optional.
- K4 **Bounded recursion.** Keep `innerDepth ≤ 3`, a hard chip cap, and navigation-based re-entry. No
  self-similar DOM growth, no new `RenderNode.children`.
- **Gate:** intermediate descend frames pass vision assertions; trace + descend + ascend keyboard e2e;
  `fractal` shot shows a legible two-level structure with connectors.

### L — Motion and life

**Goal:** a living cockpit that still respects stillness.

- L1 **Activity pulse.** One subtle amplitude channel on active nodes and causal ribbons, derived from
  the existing activity map; amplitude capped, no per-frame DOM churn in the hot path.
- L2 **Flow on causal ribbons.** Use existing `FlowEdge`/dash-offset behavior for `writes`/`delegates`
  only while follow mode is active through the existing `setFollow` hook. Static screenshots keep a
  fixed phase.
- L3 **Choreography.** Assign durations from `camera.verbMs`/`ladder.blendMs`; no new timing constants.
  Rung crossfade, portal dissolve and lens pin share one clock.
- L4 **Reduced motion.** All of L1–L3 render their final frame immediately; parity is a gate, not a note.
- **Gate:** still-frame screenshots are byte-identical across repeated runs of the same shot; reduced-motion
  e2e passes; scale budget unchanged.

### M — Measurement and the feedback loop

**Goal:** make taste reviewable without making taste a guess.

- M1 **Shot review evolves.** The contact sheet gains side-by-side diff, a "kept/rejected" marker and a
  short note field persisted in `docs/screenshots/review.json` (data, not prose in code).
- M2 **Perceptual smoke.** A cheap histogram/SSIM-style check flags shots that changed by more than a
  threshold between runs; humans decide whether the change is good.
- M3 **Vision at intermediate frames.** Extend `createVisionAssert` call sites to the descend and lens-pin
  transitions, not only settled states.
- M4 **Ergonomic counters.** Track time-to-first-relevant, choice count, travel distance and lens opens;
  publish a counterfactual under `focus-lens` vs default with the same recording.
- **Gate:** the loop stays one command (`pnpm --filter pi shot --watch`), no manual camera driving, all
  images still in `docs/screenshots/`.

### N — Proof and onboarding (delivery-side, still no release claim)

**Goal:** a visitor understands the claim in ten seconds.

- N1 **First-run hint.** One dismissible line: "double-click an edge to travel; `/` lists every verb".
  Stored client-side, recorded as a neutral event.
- N2 **Catalog cards.** Question, decision rule and launch link on one card; details expand. Negative
  results stay verbatim.
- N3 **Published gallery.** The curated shots become the landing page's primary content, with one line
  explaining each. The flagship HTML and README links point at the same root.
- N4 **Study and release remain deferred.** G3/G4/G5 from TODO3 are untouched; nothing here implies a
  participant result, npm publish or hosted URL.

---

## 5. New feature candidates (ranked)

1. **Host-neutral shell + token layer (O1/O2)** — highest leverage across products; without it every
   domain reinvents chrome and type, and the gallery cannot compare like with like.
2. **Domain adapter for the inspector (O3/O4)** — makes the lens a universal pattern instead of an agent
   feature, and gives the scaffold a visual default to emit.
3. **Command palette with verb completion** — highest leverage inside one product; makes the closed verb
   set discoverable.
4. **Dockable tabbed inspector** — removes the floating-box look and organizes existing controls.
5. **One-world shell for the scaffold (O6/O7)** — makes "one canvas, many domains" the default product
   shape rather than a demo, and gives every domain a proof surface on day one.
6. **Portal preview glyphs** — makes recursion visible while staying inside existing scope data.
7. **Salience-ranked ribbons** — fixes the most overdone visual with one knob and one mapping.
8. **Shot diff/review workflow** — improves the iteration loop that produced this plan.
9. **Depth contour / lane bands** — turns empty space into structure.
10. **Flow animation on causal edges** — life, but only after H/I settle; easy to overdo.

Not candidates: new node classes, a fourth representation rung in the contract, realtime sync, XR/sound,
a second position authority, a framework that dictates domain vocabulary, or a new scheduled domain.
Proliferation stays scaffold-led and demand-driven.

---

## 6. Efficient sequence — five slices, one standing track

Section 4 is a **catalog of ideas, not an execution order**. Running eight horizontal workstreams in
parallel would build the shell three times and restyle the graph twice. Execute vertical slices in
readiness order; each ends with recaptured shots, a human look at the contact sheet, and all gates green.
No slice starts before the previous one has been reviewed. Slice 4 is blocked on a second consumer, so
slice 5 runs in its place. This is the consolidation that makes the plan cheaper.

| Slice                                             | Deliverable                                                                                                                                       | Folds together                         | Review gate                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **1. One surface language**                       | A token module Pi consumes, a compact command bar, drawers, a dockable inspector frame and contextual instruments                                 | O1, O2, H1, J1, J2, J3, K4(bound only) | `cockpit` and `policy` shots; keyboard-only run; no new CSS constant outside the token module                    |
| **2. Graph grammar and attention**                | One type/spacing/color/shape language for nodes; ranked ribbons; a focus ring with connector; scope contours where space is empty                 | H2, H3, H4, I1, I2, I3, I4             | `cockpit`, `neon-cockpit`, `node-detail`, `dynamic-range`; vision gates in both themes                           |
| **3. Recursion, edges and proof**                 | The inner topology with connectors, portal previews, depth-ruler breadcrumb, visible proof line, catalog cards, first-run hint, shot review notes, shorter tapered polygon edges and shaded cards | O3, O4, K1, K2, K3, J4, J5, N1, N2, M1 | `fractal`, `deep-focus`, `catalog`; descend intermediate frames; loose tests; one cross-domain shot if a second host is ready |
| **5. Node anatomy** (implemented; 4 is gated)    | Distinct skeleton per rung from one parts vocabulary, kind-specific arrangements, source/target port marks on card edges, one anatomy across card and lens | K (depth), H1/H2 refinement, §10 "inspect an edge or a scope" | `node-detail`, `fractal`, `cockpit`; keyboard reach; scale budget unchanged                                      |
| **4. Proliferation** (gated on a second consumer) | Policy core/domain split, world-host template, scaffold emits real vision gate, shared helpers and shots                                          | O5, O6, O7 (O8 is already written)     | Second host consumes shell/tokens/inspector unchanged; scaffold output green; no contract change                 |

**Standing track — gates and parity.** M3 (vision at intermediate frames) and L4 (reduced-motion
final-frame parity) ride along with every slice. Keyboard parity is tested in slice 1; touch parity
follows the existing bindings. No separate workstream.

**Cut or deferred to keep the plan honest:**

- L1–L3 (activity pulse, flow animation, new choreography) — parked until slice 5's anatomy and the
  composition pass settle. Animating an unsettled grammar amplifies noise, and effects were flagged as
  overdone; any revival stays opt-in data.
- Real RTL parity and the bounded chip-control 44px decision — parked with the peripheral track. The
  forced-`dir=rtl` gate and the current target pass stay green; a real locale, mixed-script labels and
  pointer resize are not on the critical path to a better flagship.
- M2 (perceptual smoke) — cut. The contact sheet plus a human decision is the review mechanism;
  an automated "taste diff" adds a gate without adding certainty.
- M4 (ergonomic counterfactual) — parked with the peripheral track; adds a gate without adding certainty.
- N3/N4 (published gallery, study/release) — remain deferred with TODO3's G3/G4/G5.
- J4 (policy search) and N2 (catalog cards) are small; fold them into slice 3 rather than tracking them alone.

**Why this is cheaper:** the boundary decision is made before any styling, so tokens are not promoted
by copy-paste; the shell is built once; ribbons are fixed in the same pass as node semantics instead of
a second "attention" pass; and promotion to the scaffold happens only after two concrete consumers,
not speculatively.

---

## 7. Anti-goals

- No new contract field or renderer branch unless a measured demand and a second consumer exist.
- No default enlargement of the focused node; the three scale knobs stay off unless a study says otherwise.
- No "game" effects layer — particles, bloom, scanlines — that does not carry state or hierarchy.
- No more knobs without a live consumer and a preset; prefer tightening an existing knob to adding one.
- No auto-promotion of a preset to a default, and no fabricated comparison, study, release or URL.
- No richer catalog text; progressive disclosure means _less_ visible prose, not more.
- No rewrite of the scope engine, solver, renderer contract or position authority.

---

## 8. Definition of done

- A first-time user can reveal, traverse, descend, trace and return home from visible affordances and
  from the command palette, on keyboard and touch, with reduced motion.
- One visual grammar is traceable to tokens; no component carries a private font size, spacing or accent.
- At every shot, the graph has a clear subject; no label is silently clipped; negative space is composed.
- Ribbons are ranked and subordinate to nodes; the default frame directs attention without scaling nodes.
- The lens is dockable, connected to its node and shows a legible bounded inner topology.
- Proof is visible in one line from the default frame and expands on demand; negatives stay verbatim.
- Vision assertions cover settled and intermediate frames; scale budgets and all existing gates stay green.
- Every new choice is data with provenance; every visual change is recaptured and reviewed in the gallery.
- A second domain consumes the shell, tokens, inspector and shot convention with unchanged flagship
  behavior; the scaffold emits them, and one cross-domain shot proves one canvas and one camera.

---

## 9. First slice, in order

1. **Boundary decision.** Name the module that will own tokens and shell primitives. Extract nothing
   until a second consumer exists; establish the boundary so new token work does not land in Pi-only CSS.
2. **Token module + Pi consumption.** Move type/spacing/color/shape tokens into it; Pi resolves them into
   its HUD theme. Delete the duplicates in `app/pi/index.html` rather than keeping aliases.
3. **Command bar + dockable inspector.** Collapse the crowded header; add `/` palette and the tabbed
   inspector frame; keep every hook unchanged so shots and tests need no camera rewrites.
4. **Contextual instruments.** Show at most two instruments by node kind/task; the rest move to the
   inspector tab. Delete the always-on kit row from the rail.
5. **Review.** Recapture `cockpit` and `policy`, run keyboard-only and reduced-motion e2e, then decide
   whether slice 2 starts or the shell needs one more pass.

Everything after slice 1 waits for that review. Slice 1 is recorded as done in the progress block; sections 2–9 remain the plan for slices 2–4.

---

## 10. Free capability — leverage over new construction

The cheapest capability gains are **exposure, not mechanism**. Most of the things a new spatial app
needs already exist as host hooks or contract seams; they are simply unreachable from the current
chrome. Each item below is a thin view over an existing seam, not a new subsystem. Ship at most three
per slice, each with a shot or e2e assertion so the capability is both discoverable and verified.

| Capability                                  | Seam that already exists                                                             | New work                                                                          | Slice | Cost       |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----- | ---------- |
| Command palette for every verb and knob     | `hooks()` already enumerates the closed verb set and the policy schema               | Filterable list + `/` binding; no new verb registry                               | 1     | low        |
| Share the exact view                        | `permalink()`, shot URL, policy vector, `export()`                                   | One header button copying a URL that restores viewport, policy and focus          | 1     | low        |
| Search / filter across a domain             | selectors + facets, `setLaneScope`, `GraphController` selection                      | One input that highlights matches and scopes the view                             | 1     | low        |
| Widget slots inside cards                   | `WIDGET_SLOTS` includes `header`/`body`/`footer`; instrument kit is already promoted | Mount one or two neutral widgets in the detail card through the existing registry | 1/3   | low        |
| Inspect an edge or a scope, not just a node | `getNodeScreenPosition` for endpoints; scope frames from `ScopeSimulation`           | Parameterize the lens by target type; same markup and actions                     | 3     | low–medium |
| Annotate in place                           | `pinNote`, `withPinnedNotes`, editable `HtmlNode` content                            | A note button in the lens that reuses the existing note store                     | 3     | low        |
| Replay scrubber                             | `recording()`, `replayRecording()`, `renderHistory()`                                | A slider over recorded events; replay stays deterministic                         | 3     | low–medium |
| "Why am I seeing this?"                     | `AnswerTrace` selectors + `trace()` + evidence lines                                 | One lens button that runs the trace vocabulary and shows the answer               | 3     | low        |
| Runtime self-healing switch                 | `setVisionLoop`, `runVisionLoop`, `scopePolicy`                                      | Expose the existing opt-in loop as a data-driven inspector control                | 3     | low        |
| Compare two policies or runs                | `diffKernels`, `compareRuns()`, permalink v2                                         | A "compare with baseline" action that launches the alternative shot               | 3/4   | medium     |
| Cross-domain trace from the palette         | `worldTrace`, `crossTracePath`, `traceSteps` in the one-world host                   | Expose the already-implemented trace as a command                                 | 4     | low        |
| Depth / scene features as view modes        | depth modes + capability-gated `sceneFeatures`                                       | Data-only presets; no renderer work                                               | 2     | low        |

**Do not manufacture capability by adding:** new node classes, a fourth representation rung, library
defaults for XR/sound/gamepad, generic transport controls in the contract, or a framework that dictates
domain vocabulary. If a capability needs a new contract field or renderer branch, it is not free and
does not belong in this section.

**Recommended first three:** command palette, share-exact-view, and inspect-edge/scope. Together they
make the existing system feel substantially more capable without adding a single new mechanism.

Slice 1 of this section is implemented; the remaining capabilities stay candidates until their slice is reviewed.

---

## 11. Open considerations not yet in any slice

These are real gaps in the plan as written. They are listed, not scheduled.

1. **Interaction cost, not just layout cost.** `renderFocusLens` rebuilds the lens `innerHTML` on every
   `viewportChange`, and ribbons add a mesh per edge. The existing `scale` budget measures layout and
   does not cover camera-move jank. Before slice 2, confirm that camera movement stays smooth: update
   the lens transform only on viewport changes and rebuild its markup only when focus or data changes;
   consider dropping `backdrop-filter` on low-end machines. Gate: a frame-time assertion during a flight,
   not just a settled-state measurement.
2. **Accessibility beyond reduced motion.** The lens adds buttons but no focus management, tab order or
   aria labeling; its controls are likely below the 44px ergonomic target; palette contrast on the light
   theme is unverified; RTL parity is untested. Gate: keyboard reachability and focus order for the lens,
   target-size check, `ContrastAuditor` over every palette in both themes, and an RTL pass.
3. **UI state is not shareable.** Drawer state, lens pinning and inspector tab are not in the permalink,
   so "share the exact view" (§10) is not yet exact. Decide whether chrome belongs in a `ui` layer of the
   permalink or only in shot data; do not add it by accident.
4. **Content quality beats typography.** Many clipped labels are data problems (`user mess…` comes from
   the source text, not the CSS). Add a domain-level `labelFor` accessor that produces a short meaningful
   title, with the full text kept in detail/telemetry. This is universal and cheaper than more font tuning.
   Landed with the content-legibility pass: `labelFor` lives in the agent domain and `fullLabel` preserves
   the source text.
5. **Empty, loading and error states.** The plan designs the happy path only. A new domain needs defined
   frames for zero nodes, a failed event source, a pending stream and an empty scope. These are cheap,
   domain-neutral states and should be part of the shell kit rather than host afterthoughts. Zero-node,
   pending and failed-source frames landed in `shell/frames.ts`; the empty-scope frame stays open.
6. **Gallery curation budget.** Twelve shots are tracked; the review loop makes adding more trivial. Set
   a cap, retire obsolete shots in the same change that supersedes them, and keep one shot per _question_,
   not per feature. Otherwise the proof surface becomes the clutter it was meant to replace.
7. **Honest validation without a fabricated study.** "Intuitive" and "beautiful" remain claims. A
   lightweight path is possible without TODO3's G3: a few recorded task walkthroughs with timings,
   published verbatim with the counterfactual comparison, explicitly labelled as internal, not a
   participant study. Decide whether this is worth doing before promoting any default.
8. **Decision governance.** Several current defaults (square corners, hidden catalog, thin ribbons) came
   from conversation, not a recorded comparison. That is acceptable when the user requested them, but
   each promoted default should get a one-line decision record with before/after shots so future
   contributors know what was chosen and why. Negative alternatives stay in the catalog. ADR 0014 now
   records both the tapered geometry and the palette-causal ribbon color, with the recaptured gallery as
   its before/after pair; other promoted defaults still owe a line.
9. **Scale beyond the smoke fixture.** The budgets are measured at 60 turns and four domains. A real
   filesystem or infrastructure workspace can be an order of magnitude larger. Windowing and sleep exist;
   the plan needs an explicit large-fixture experiment before claiming general-purpose scalability.
10. **Async collaboration.** Permalinks plus annotations already allow shared review, but identity and
    presence are undefined. Realtime sync stays deferred; the cheap version — a shared annotated URL —
    should be named as the supported collaboration mode so it is not mistaken for an absence.

None of these changes the four-slice sequence. Items 1, 2 and 4 should be folded into slices 1–2 because
they affect the shell and grammar being built now; the rest are recorded for a later increment. Item 2's
target-size, contrast and forced-RTL pass landed with the standing track, and the bounded chip-control
exception was decided with the interaction-ergonomics pass (K4 cap kept, 44px equivalents in the actions
tab and palette). A real-RTL / mixed-script matrix remains open and parked.
