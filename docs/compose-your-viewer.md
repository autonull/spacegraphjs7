# Compose your own viewer (P6.2)

A viewer is a host composition of library mechanisms. The library owns selection and playback; you own registries, appearance, budgets and policy. No preset is a default.

```ts
import { manifestSpace, negotiate } from '@spacegraphjs/config';
import { libraryManifest } from '@spacegraphjs/config/library';
import { InlineGraph } from '@spacegraphjs/svg-renderer';
import { createSalience } from 'spacegraphjs/salience';
import { WidgetRegistry, WidgetLayer } from 'spacegraphjs/widgets';
import { cartesianMatrix } from 'spacegraphjs/experiments';

const manifest = libraryManifest();
const space = manifestSpace(manifest);
const state = negotiate(space, yourState, { capabilities, flags }).state;

const salience = createSalience(yourSignals)({ model, now: clock(), selected });
const widgets = new WidgetLayer({
    registry: new WidgetRegistry().register(...yourWidgets),
    slots: yourSlots,
    sizing: yourBudget,
    representationOf: yourLadderLookup,
});
new InlineGraph(element).setModel(model);
```

1. Build a `RenderModel` from your own domain with `@spacegraphjs/adapter`; never import a host package.
2. List capabilities from `libraryManifest()` plus your own axis entries; negotiate them with `negotiate`.
3. Register representations, edges, salience signals, camera verbs and widgets. Each seam is a registry; none hardcodes an appearance.
4. Choose a renderer backend by capability (`supports`, `supportsDepth`, `supportsEmphasis`), never by name.
5. Capture combinations with `cartesianMatrix`; read `docs/not-decided.md` before promoting any configuration.

Recipes: `docs/salience.md`, `docs/widgets.md`, `docs/motion.md`, `docs/world.md`, `docs/experiments.md`, `docs/contract-versioning.md`. The explorer (`pnpm run explorer`) is the running reference and the OpenCode adapter is one case study.
