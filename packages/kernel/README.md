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

Rules: no clock, no randomness, no network; imports only its own relative modules. Hosts supply domain
predicates and vocabulary. `runConformance(kernel)` is a named export rather than a subpath.
