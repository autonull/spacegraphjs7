# Recursive scopes

A scope is a subgraph with its own solver and its own frame in the parent's space. The parent sees
the whole child as one portal body; the child lays out its own interior. This gives one graph many
simultaneous layouts — a force-directed overview containing a tidy tree containing a grid — without
merging their models.

## The model

A host supplies a flat list of `ScopeSpec`s. Each has a unique `id`, an optional `parent`, its own
`nodes` and `edges`, and an optional `strategy` (`force` by default, or `grid` / `tree`).

A node with `scope: '<childId>'` is the **portal** for that child. The child's solved bounds size the
portal body in the parent, so the parent makes room for the whole subgraph. A child with no portal
node is still laid out and gets a synthetic body.

Identity is path-qualified: scope `turn-1` inside `session` is `session/turn-1`, and a node `tool-3`
inside it is `session/turn-1/tool-3`. Stable qualified ids survive reparenting and are the seam for
incremental updates.

Edge endpoints may be a local node id, a direct child scope id, or a qualified path (`inner/x` or
`/session/turn-1/x`). `buildScopeTree` validates every reference before layout, so a scope layout
never fails on a dangling endpoint.

## Geometry

`layoutScopes` runs in two passes:

1. **Bottom-up.** Each scope solves its interior. Portal nodes carry the child's bounds and the
   links declared by edges, so the parent's solver treats subgraphs as physical bodies.
2. **Top-down.** Each child frame's origin is its portal's solved position plus an offset, scaled by
   its parent. Content positions are `origin + scale * local`. A child `scale` multiplies down the
   chain.

Edges are projected through those frames into world space. Each projected edge reports
`interScope`, so a host can draw a bridge differently from an internal edge. `bounds` covers every
frame and therefore every node.

## Adapting by zoom and focus

`activeScopePaths(tree, { band, focus, maxDepth })` returns the scopes that should be simulated at
the current zoom band. Scopes below the band are inactive but still laid out, so activating them
does not jump their contents. The `focus` path keeps its ancestors active at any depth.

## Continuity

`ScopeHost` is the stateful entry point for hosts. `update(specs, signals)` rebuilds the tree, carries
local positions forward, and returns a `change` from `computeIncremental`. Use `scopePositionsAt`
to interpolate that change over a host clock. Ids listed in `pinned` hold their previous local
position; everything else reflows. Set `warmStart: true` to seed the solvers with previous positions
when append-only stability matters more than reflow.

## Example

```ts
import { ScopeHost, scopePositionsAt } from 'spacegraphjs/layout';

const host = new ScopeHost({ seed: 7, pinned: new Set(['session/focused-tool']) });

const frame = host.update(
    [
        {
            id: 'session',
            strategy: 'force',
            nodes: [
                { id: 'focused-tool', size: [180, 80] },
                { id: 'turns', scope: 'turns' },
            ],
            edges: [{ id: 'focus-link', source: 'focused-tool', target: 'turns/first/tool' }],
        },
        {
            id: 'turns',
            parent: 'session',
            strategy: 'tree',
            nodes: [{ id: 'first', scope: 'first' }],
        },
        {
            id: 'first',
            parent: 'turns',
            strategy: 'grid',
            nodes: [{ id: 'tool', size: [120, 64] }],
        },
    ],
    { band: 1, focus: 'session/turns/first/tool' },
);

// Animate from the previous layout to this one.
const positions = scopePositionsAt(frame.change, progress);
```

## Physical animation

`ScopeSimulation` turns those stable targets into motion. Bodies are critically damped springs that
chase the solved layout; new bodies start at their owning scope's origin, so a subgraph grows out of
its portal instead of appearing at its final position. Frames animate too, and edges follow the
animated endpoints.

The host drives `advance(seconds)`. Integration uses a fixed step with a cap on catch-up steps, and
each body sleeps once it is close to its target and slow enough. `settled`, `energy` and `steps` are
readable for diagnostics; `settle()` snaps everything to rest for reduced-motion or headless use.
`pin(ids)` holds bodies at their solved target, which is how focus and attention stay still while the
rest of the graph rearranges.

```ts
import { ScopeSimulation } from 'spacegraphjs/layout';

const simulation = new ScopeSimulation({ pinned: new Set(['session/focused-tool']) });
simulation.setSpecs(specs, { band: 1, focus: 'session/focused-tool' });

function frame(deltaSeconds: number) {
    simulation.advance(deltaSeconds);
    const view = simulation.view();
    // Draw view.positions, view.frames and view.edges.
}
```

Positions returned by `positions` and `view()` are snapshots: advancing the simulation never mutates
a previously returned position.

`ScopeError` carries a `code` (`cycle`, `duplicate-scope`, `duplicate-node`, `unknown-parent`,
`unknown-portal`, `unknown-endpoint`, `invalid-id`) so hosts can report configuration problems at
the boundary.
