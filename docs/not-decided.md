# Not decided here (P6.2)

These are experiment inputs, not library answers. The explorer exists so a host, reader or experiment can decide; a preset is an example, never a recommendation or a default.

1. Which scale bands, if any, feel like fractal zoom to a developer.
2. Which representation ladder suits which node kinds.
3. Which salience signals matter, and their weights.
4. Which visual channel carries emphasis without harming legibility.
5. Whether animated camera flights help or annoy.
6. Which depth treatment, if any, is worth promoting to a default.
7. Whether widgets belong inside cards, attached to them, or only in pinned windows.
8. Whether the immersive direction wins the stop-rule test.
9. Budget values for DOM nodes, frame time and matrix size.
10. Which renderer is the default for the flagship explorer (both must stay switchable).
11. Whether the manifest is a build-time artifact or a runtime registry (settled for now as a runtime assembly; revisitable).

The library also deliberately does not decide node/edge kinds or session vocabulary, budget ceilings inside an algorithm, a winner of the `n >= 5` study, or any WebXR/sound implementation. Those remain host policy or gated scenarios in `SPACEGRAPH.TODO.41.md`.

## Settled by the flagship work (2026-11-20)

The flagship and Phases B–E settled several inputs above as **host policy, not library defaults**. They are recorded as durable ADRs in `docs/adr/` so a reader does not re-litigate them:

- Freeform zero-g is the default; lanes/grid/tree are opt-in per scope.
- One position authority: `ScopeSimulation` owns coordinates, physics borrows a bounded set and reconciles at rest.
- Capabilities are registered and gated through `supports(...)`, never renderer branches.
- Hosts own policy; the library owns mechanisms. Legibility gates spectacle.
- Sensory seams are host-registered and report-only; no WebXR, sound, haptics or gamepad default ships.

The numbered questions above remain open decisions for a host or experiment, not library answers. In particular the `n >= 5` study has no winner or published result yet, so whether the immersive direction survives the stop rule (item 8) is still undecided. Nothing here claims a study outcome or promotes an immersive mode to a default.

The corresponding records are [ADR 0001–0003](./adr/README.md) (one model, one position authority,
hosts own policy), [ADR 0005–0007](./adr/README.md) (capabilities, legibility, sensory seams),
[ADR 0010–0012](./adr/README.md) (world scoping, freeform default, no inferred cause), and
[ADR 0008](./adr/0008-evidence-gate-for-defaults.md) (the stop rule). Vocabulary used below is
defined in [the glossary](./glossary.md).

## Knob mapping (TODO3 Workstream A)

Every question is now a live knob family in `app/pi/src/policy/schema.ts`, editable in the Pi policy panel and shareable as a permalink v2. A preset is an experiment input, never a recommendation.

| Question                  | Knob family                                             | Example preset                       |
| ------------------------- | ------------------------------------------------------- | ------------------------------------ |
| 1 — scale bands           | `bands.*`                                               | `wide-bands`                         |
| 2 — representation ladder | `ladder.*`                                              | `dense`                              |
| 3 — salience signals      | `salience.*`                                            | baseline (weights still under study) |
| 4 — emphasis channel      | `emphasis.*`                                            | `quiet`                              |
| 5 — camera flights        | `camera.*`                                              | `quiet`                              |
| 6 — depth treatment       | `depth.*`                                               | `flat-map`                           |
| 7 — widget placement      | `widgets.*`                                             | `full-cockpit`                       |
| 8 — immersive direction   | `surface.*`, `navigation.*`, `orchestration.*`          | `flat-map`, `full-cockpit`           |
| 9 — budgets               | `guardrails.*`, `geometry.*`                            | `dense`                              |
| 10 — renderer default     | runtime capability registry; theme variant in `theme.*` | `light`                              |
| 11 — manifest assembly    | settled for now as runtime assembly; not a policy knob  | —                                    |

The stop rule for any variant lives in `TODO3.md` §7: a default changes only after a recorded comparison and a human decision.
