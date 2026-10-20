# @spacegraphjs/adapter

The host-agnostic half of a SpaceGraphJS integration: it turns a **domain model** (a host's own
graph model) into the renderer contract's `RenderModel`. The renderer adapters never see the host's
vocabulary; they see nodes, edges, positions and markup.

The package depends on `@spacegraphjs/renderer` only — no core, no framework, no renderer backend.

## What the base owns

`ModelAdapter` is the pipeline: **level filter → node map → bands → lane gutter → captions → edges**.
It owns

- the DOM card budget (cards above it degrade to dots),
- the focus neighbourhood (nodes outside it are dimmed),
- the collapsed-cluster chip,
- the chrome markup (lane gutter, row and column captions),
- the escaping of every label that reaches the markup.

## What the host owns

The vocabulary, through five abstract methods and a configuration object:

| Member | Answers |
|---|---|
| `nodeShape(node)` | how the renderer draws this kind |
| `nodeStatus(node)` | the renderer's status vocabulary |
| `isStructuralKind(kind)` | chrome or activity |
| `nodeData(node, level, dimmed)` | the affordance data a renderer reads |
| `toRenderEdge(edge, level)` | the renderer's edge vocabulary |

`buildBands` and `bundleEdges` are optional overrides; the base draws no bands and keeps every
edge.

## Usage

```ts
import { ModelAdapter } from '@spacegraphjs/adapter';

class MyAdapter extends ModelAdapter<MyNode, MyEdge, 'coarse' | 'fine', MyModel> {
  nodeShape(node) { return node.kind === 'step' ? 'card' : 'panel'; }
  nodeStatus(node) { return node.failed ? 'error' : 'neutral'; }
  isStructuralKind(kind) { return kind === 'group'; }
  nodeData(node, level, dimmed) { return { dimmed }; }
  toRenderEdge(edge) { return { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind }; }
}

const adapter = new MyAdapter({
  cardBudget: (level) => (level === 'coarse' ? 12 : 40),
  nodeFilter: (model, level) => model.nodes.filter((node) => node.level === level),
});

const renderModel = adapter.build(model, { level: 'fine', positions });
```

## Conformance

`adapterConformance(adapter, fixture)` returns the cases every adapter must pass. The suite is
runner-agnostic — it returns `{ name, check }` pairs, so a host can run it under Vitest, Bun, or
Jest:

```ts
for (const conformanceCase of adapterConformance(adapter, fixture)) {
  test(conformanceCase.name, conformanceCase.check);
}
```

The fixture declares which node is the activity card, which one is chrome, which cluster is
collapsed, and what the focus neighbourhood is; the suite never needs to know the host's kinds.
