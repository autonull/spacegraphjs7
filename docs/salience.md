# Salience and emphasis (P2)

`spacegraphjs/salience` scores nodes from host-registered signals and maps the score onto visual
channels. The library supplies the mechanism; the host supplies the signals, weights and channels.
No value is a default.

```ts
import {
    centralitySignal,
    createSalience,
    kindSignal,
    applyModelEmphasis,
    mappingFor,
} from 'spacegraphjs/salience';
import type { EmphasisChannel } from '@spacegraphjs/renderer';

const score = createSalience([kindSignal({ session: 0.9, tool: 0.4 }, 2), centralitySignal()]);
const result = score({ model, now: Date.now(), selected: new Set(['s1']) });

const channels: readonly EmphasisChannel[] = ['size', 'glow'];
const view = applyModelEmphasis(model, result.values, mappingFor(channels, { size: [1, 1.5] }));

result.explain('s1');
// [{ signal: 'kind', label: 'node kind', weight: 2, value: 0.9, contribution: 0.64 }, ...]
```

- `createSalience([])` returns a uniform zero map: emphasizing nothing is today's behavior.
- Every signal returns a value in `[0, 1]` and a reason label; `explain(id)` lists weighted reasons.
- `applyModelEmphasis` keeps node ids and positions; edges inherit their louder endpoint.
- A renderer declares channels with `RendererCapabilities.emphasis`; `supportsEmphasis()` gates them.
- `RenderNode.emphasis` and `RenderEdge.emphasis` are additive: a backend that ignores them is unchanged.
