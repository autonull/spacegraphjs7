# @spacegraphjs/config

Discovery, configuration and negotiation for every SpaceGraphJS capability axis.
No renderer, host or OpenCode dependency.

## Recipe

```ts
import {
    buildManifest,
    ConfigSpace,
    ConfigState,
    manifestSpace,
    negotiate,
} from '@spacegraphjs/config';

const manifest = buildManifest('1.0.0', [
    { id: 'projection', values: ['spacegraph', 'cytoscape'], source: 'renderer', default: 'spacegraph' },
    { id: 'depth', values: ['none', 'fog'], source: 'DepthCues', capability: 'depth' },
]);

const space = manifestSpace(manifest);
const requested = ConfigState.from(space, { projection: 'cytoscape', depth: 'fog' });
const result = negotiate(requested.space, requested, { capabilities: new Set() });

result.state.get('depth'); // 'none' — degraded with a reason in result.axes
location.hash = result.state.toHash(); // '#projection=cytoscape&depth=none'
ConfigState.fromSearch(space, location.hash).equals(result.state); // true
```

`manifest.entries` is the discoverable list: each entry carries `id`, `values`,
`source`, an optional `capability` / `flag` requirement, and an optional
`reducedMotion` note. Flags gate availability; they never choose a value.
