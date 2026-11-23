# Possibilities — the design space SpaceGraphJS opens

**Purpose.** `TODO2.md` is the execution slice: ship the Pi flagship, prove one more domain, promote
only reused code. This document is the design space around it — what becomes possible once the
primitives are composed. It is a map, not a commitment: items here are not scheduled unless they
appear in `TODO2.md`.

**The unlock.** Three facts do most of the work:

1. `RenderNode.html` is host-sanitized markup and `shape: 'card'` renders it (`packages/renderer/src/index.ts:74-93`).
2. Positions are host-authoritative; scopes recurse through portals; `ScopeSimulation` settles.
3. Motion, physics, depth, salience, widgets and vision are pure, host-composed mechanisms.

Therefore a rectangle is not a label — it is a **zoomable portal into a live interface or a nested
graph**. The graph stops being a diagram *about* a domain and becomes the domain's workspace.

---

## 1. The rectangle ladder

`docs/screenshots/spacegraphj/full_gui.png` and `graph_view.png` show the two ends: a dense instrument
workspace built from rectangles, and the same structure seen from far away. One node, four rungs:

| Rung | What the rectangle shows |
| ---- | ------------------------ |
| overview | one line of text, size by salience, glyph identity for composition nodes |
| execution | mini-instrument: sparkline, status bar, short log excerpt, edge count |
| detail | full working panel: chart, statistics rows, slider, tab strip, console |
| portal | the rectangle opens a child scope; the parent keeps its body as a summary |

Representation can be a **function**, not a fixed ladder: `(node, zoom, activity, vision)` → rung.
Salience promotes a hot node to a richer rung; a vision overlap warning demotes it; a scope portal
keeps a persistent glyph so spatial memory survives zoom. Stable path-qualified IDs make the same
rectangle the same place at every scale (`docs/scopes.md`).

## 2. Physics as meaning

`gravity: 0` is the default; forces are transient and cool to rest. That makes physical cues semantic:

- gravity well → importance or attention; repulsion → independence
- spring tension → dependency weight; collision → conflict (two writers, one file)
- drag-throw → reorder with momentum, then settle to the authoritative layout
- Play/Reconcile → "shake the graph to see its structure", then return to the stable view

Body caps, sleep and a bounded borrowed set keep this game-like but cheap. No two solvers own one node.

## 3. Cinematics as cognition

Camera verbs are host-bound and interruptible; each answers a question:

- `flyTo` — take me there
- `trace` — show me how I got here (highlighted path + camera sweep)
- `sweep` — survey this scope
- `follow` — narrate a live stream as it arrives

Depth is a spectrum (`flat / layered / depth-stack / orbit`) sampled from turn or hierarchy axes, with
fog, parallax and card facing. Reduced motion collapses every verb to an instant jump. Vision gates
keep the spectacle legible: spectacle never outruns measurement.

## 4. Every domain becomes a workspace

The six-slot wrapper recipe (`docs/semantic-wrappers.md`) makes each of these a vocabulary change, not
a library change:

| Domain | Nested scope | Instrument inside a node |
| ------ | ------------ | ------------------------ |
| agent (Pi, shipped) | run / turn / delegation | five selector answers, activity, transcript excerpt |
| workflow (shipped) | subworkflow / step | retry chain, artifact, duration bars |
| filesystem (planned) | directory / symbol | diff, blame strip, dependents |
| data | pipeline / stage | schema, sample rows, metric sparkline |
| knowledge | note / tag cluster | backlinks, text, edit history |
| infrastructure | service / deploy | live metrics panel, incident timeline |
| education | topic / lesson | quiz, progress, worked example |
| games | room / level | the level itself — physics play is the mechanic |
| music | session / track | waveform, mixer strip, clip list (the screenshot literally) |
| science | experiment / result | chart, raw data, provenance |

## 5. Compositional worlds

`InterGraphEdge` joins isolated models: agent artifact → workflow compile step → filesystem file →
data metric. One workspace, many canvases, one overlay; no domain resolves another's nodes. A single
cross-domain `trace` answers "this metric regressed → which step → which tool call → which commit".
This is the strongest form of "versatile application domains": not one graph per domain, but one
world made of domains.

## 6. Shareable scenes and collaboration

A full-state permalink makes a URL a **scene**, not a node anchor. That enables:

- graph diffs between two runs, with annotated nodes
- shared viewports for review ("look at this corner of the map")
- auditable artifacts: the five-task answers become linked evidence, not screenshots
- async handoff: the exported JSON/SVG/HTML is a readable report of a spatial argument

## 7. Self-verifying interfaces

The original thesis is that a UI can see what it builds. The pieces exist: four vision analyzers,
`createVisionAssert`, `scopePolicy` retargeting, salience channels, an autonomous fixer. The next form
is a runtime loop — legibility, hierarchy, ergonomics and overlap feed layout and representation
continuously, with the host choosing when to apply fixes. Honesty stays explicit: heuristic or ONNX,
recorded per capture, never silently assumed.

## 8. Host-registered senses

Sound, haptics and WebXR are **host-registered seams** (`docs/world.md`): the library gates registered
adapters and ships no implementation, while the demo registers a console-only sound adapter. Gamepad,
gesture input and world-space panels remain host work through `InputManager`/`Fingering`. No library
default or headset assumption. Widget slots (`header / body / footer / attached / pinned`) already let a host mount live
controls inside a rectangle, so most "GUI possibilities" need no engine change at all.

## 9. Product forms

- **Session observatory** — Pi today: a run you can walk through instead of scroll.
- **Graph IDE** — code, tests, artifacts and tool calls in one spatial workspace.
- **Incident war room** — services, deploys and alerts as a live, physical map.
- **Learning atlas** — a curriculum you explore; each topic opens a lesson.
- **Research notebook** — experiments and results linked by provenance.
- **GraphOS** — an infinite canvas where files, processes and tools are all zoomable nodes.

The flagship landing page, the five-task study and the captured clip are the proof surface for all of
them (`app/demo/flagship.html`, `docs/pi-study.md`).

## 10. Horizons

- **Now (TODO2 Wave A):** zoomable rectangle ladder, trace, Playground, honest vision, permalink,
  guided replay — all host-side in Pi.
- **Next (Wave B/C):** third domain, three-domain composition, promote only reused helpers.
- **Later (explicitly not now):** fourth domain, XR/sound/haptics adapters, gamepad, post-processing,
  full `RenderModelPatch` streaming, cross-session graphs, five-layout comparative study.
- **Research gate:** the five-task study. If the graph loses, immersive work stops and the library
  remains the deliverable (`../SPACEGRAPH.md:485-487`). No vision here overrides that rule.

## 11. Boundaries

The library never learns a domain's vocabulary, never imports a provider SDK, never picks a default
renderer or geometry, and never claims a study result. Those remain host, domain and human decisions.
Everything above is composed from the same contract, scope engine and six wrapper slots — that is what
makes the possibilities additive rather than a menu of special cases.
