# Architecture Decision Records

Durable, settled decisions. An ADR is not an open question: `docs/not-decided.md` is the living
index of questions still resolved by experiment, and each of those maps to a knob family and a
preset. When an experiment produces a recorded comparison and a human decision (ADR 0008), the
decision is promoted here and removed from `not-decided.md`.

| ADR                                             | Decision                                                      |
| ----------------------------------------------- | ------------------------------------------------------------- |
| [0001](./0001-one-model-pure-representation.md) | One model; representation is a pure function                  |
| [0002](./0002-one-position-authority.md)        | One position authority (`ScopeSimulation`)                    |
| [0003](./0003-host-owns-policy.md)              | Hosts own policy; library owns mechanisms                     |
| [0004](./0004-one-way-dependencies.md)          | One-way dependency: host → domain → kernel → shared           |
| [0005](./0005-capabilities-not-branches.md)     | Capabilities via `supports(...)`, never renderer branches     |
| [0006](./0006-legibility-gates-spectacle.md)    | Legibility gates spectacle                                    |
| [0007](./0007-no-device-defaults.md)            | Sensory seams host-registered and report-only                 |
| [0008](./0008-evidence-gate-for-defaults.md)    | No default changes without comparison + human decision        |
| [0009](./0009-pull-only-promotion.md)           | Pull-only promotion into the library                          |
| [0010](./0010-world-scoping.md)                 | One world canvas; `InterGraphEdge` only for separate surfaces |
| [0011](./0011-freeform-default.md)              | Freeform zero-g default; structured geometry opt-in           |
| [0012](./0012-never-infer-cause.md)             | Never infer cause; commands map to `KernelOp`s                |
| [0013](./0013-additive-contract-versioning.md)  | Additive contract versioning; runtime manifest assembly       |
| [0014](./0014-tapered-ribbon-edges.md)          | Tapered polygon ribbons; renderer-type exception              |

Conventions: status (`Accepted`, `Superseded`), date, source, Context / Decision / Consequences.
Numbering is sequential; a superseding ADR links back to the one it replaces. Keep records short and
factual — no rationale that is not already in the code, a test or a recorded experiment.
