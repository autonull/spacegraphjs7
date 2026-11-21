# Glossary — bands, levels, rungs, scopes

The library uses four distinct words for four distinct things. They are often confused because a
single zoom gesture moves all four at once. Keep them separate in code, docs and experiments.

| Term             | Owned by                    | Question it answers                                                                                                                  | Source                                             |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Zoom / scale** | camera                      | How far am I zoomed? A continuous value normalized to `[0, 1]` over a host-defined `ZoomRange`.                                      | `src/core/zoom.ts`                                 |
| **Band**         | `ZoomBands` / `ScaleDomain` | What named scale interval am I in? A contiguous interval of normalized zoom with hysteresis.                                         | `src/zoom/ZoomBands.ts`, `src/zoom/ScaleDomain.ts` |
| **Level**        | host (`LevelConfig`)        | Which nodes and edges exist at this semantic level, and what DOM budget may it spend? Host owns the vocabulary.                      | `src/levels/index.ts`                              |
| **Rung**         | `representationRung`        | How much of one card should I draw? `overview → execution → detail`, chosen from the base level plus activity and a legibility gate. | `src/salience/representation.ts`                   |
| **Scope**        | scope engine                | Which recursive subtree owns this node? A `ScopeSpec` with a path-qualified id and its own child tree.                               | `src/layout/scope.ts`                              |
| **Depth**        | host policy (`depth.*`)     | How should scope depth be drawn? Fog, parallax and facing are treatments, not levels.                                                | `src/depth`                                        |
| **Widget slot**  | `WidgetLayer`               | Where does an instrument attach? `inside`, `attached` or `pinned`.                                                                   | `src/widgets/layer.ts`                             |

## How they compose

A camera zoom produces a normalized value. `ZoomBands` maps it to a **band** with hysteresis;
`ScaleDomain` additionally interpolates semantic importance between host-defined stops. The host
maps the band (or stop) to a semantic **level** through its own `LevelConfig` — the library does not
know what "session" or "turn" mean. A node's **rung** starts at that level and is promoted by
activity, but only when `legibility >= legibilityGate`; poor legibility demotes it back. Near a
rung boundary `representationWeights` and `representationLayers` crossfade the two adjacent rungs
so identity and position never pop.

A **scope** is independent of scale: it is structural, not visual. A child scope appears in its
parent as a **portal** — a rectangle whose frame animates from parent coordinates into child
coordinates on `descend`, and back on `ascend`. One **position authority** (`ScopeSimulation`) owns
every coordinate across all scopes; physics borrows a bounded set and reconciles at rest.

## Related terms

- **Policy vector** — the fully resolved set of typed knobs; **layer** — one precedence source
  (`defaults → preset → experiment → url → panel`); **provenance** — the source recorded per knob.
- **Preset** — a named policy vector plus fixture; an example, never a recommendation.
- **Neutral event** — an interaction fact stamped with the resolved vector; the one event log feeds
  measurement and replay.
- **Counterfactual replay** — replay a recorded session under a different vector and re-score it.
- **World** — one canvas holding several isolated domain scopes under one root; `InterGraphEdge`
  is reserved for genuinely separate surfaces with separate cameras.
- **One keystroke back** — every immersive state keeps a `Esc`/Home exit to the familiar hybrid view.

See `docs/not-decided.md` for open questions and their knob families, `docs/adr/` for settled
decisions, and `TODO3.md` for the active plan.
