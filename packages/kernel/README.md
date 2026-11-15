# @spacegraphjs/kernel

The dependency-free graph substrate for SpaceGraphJS hosts. It owns ordered nodes, edges, hyperedges,
versioned kernels, append-log sessions, LWW workspaces, JSON serialization, topology queries, registry
types and conformance checks. It knows no domain vocabulary.

```ts
import { Kernel, query, KernelCodec } from '@spacegraphjs/kernel';

const kernel = new Kernel({
    nodes: [{ id: 'a', kind: 'node', label: 'A' }],
    edges: [],
    hyperedges: [],
});

const found = query(kernel).nodes((node) => node.id === 'a');
const json = KernelCodec.encode(kernel);
```

## SessionKernel & GraphHistory

`SessionKernel` is an append-only log of kernel operations (add/remove nodes, edges, hyperedges). Each
append produces a new version. `checkout(version)` and `fork(version)` replay the log to a prior state.

```ts
import { SessionKernel, addNode, GraphHistory, createGraphHistory } from '@spacegraphjs/kernel';

const session = new SessionKernel()
    .append({ id: 'e1', op: addNode('n1', 'step', 'Step 1') })
    .append({ id: 'e2', op: addNode('n2', 'step', 'Step 2') });

const history = createGraphHistory(session, 10); // keep last 10 snapshots
history.captureAt(1);
history.captureAt(2);

const checkedOut = history.checkout(1); // SessionKernel at version 1
const forked = history.fork(1);         // independent SessionKernel from version 1
```

Rules: no clock, no randomness, no network; imports only its own relative modules. Hosts supply domain
predicates and vocabulary. `runConformance(kernel)` is a named export rather than a subpath.
