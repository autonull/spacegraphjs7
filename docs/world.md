# World and sensory seams (P4.3–P4.5)

Depth, scene features and sensory channels are policies. The library samples and gates them; the host owns fog, lights, instancing, parallax, trails and any sensory adapter. Nothing is enabled unless an axis or a capability asks for it.

```ts
import { sampleDepth } from 'spacegraphjs/depth';
import {
    worldPolicyFor,
    supportsSceneFeature,
    supportsSensory,
    type WorldCapabilities,
} from 'spacegraphjs/world';

const policy = worldPolicyFor(state.get('sceneFeature'), state.get('sensory'), state.get('lod'));
const capabilities: WorldCapabilities = { sceneFeatures: ['fog'], sensory: [] };

if (supportsSceneFeature(capabilities, 'fog')) renderer.setDepthFade(0.05);
if (!supportsSensory(capabilities, policy.sensory)) reportUnsupported(policy.sensory);

const sample = sampleDepth(
    { mode: 'layered', axis: 'lane', strength: 1, spread: 40 },
    normalizedLaneIndex,
    cameraDistance,
);
node.position[2] = sample.offset; // host applies the sampled depth
```

- `blendDepth` interpolates two named mode treatments; the named modes remain the endpoints.
- `worldRepresentation` maps overview rungs to instanced geometry and detail rungs to DOM cards; it adds no LOD state.
- `SCENE_FEATURES` and `SENSORY_SEAMS` are descriptors. Sound, haptics and WebXR report unsupported until a host registers an adapter; no headset is assumed.
- Declared axes: `depth`, `depthAxis`, `sceneFeature`, `sensory`. See `test/depth-continuum.test.ts`, `test/world.test.ts` and `test/e2e/explorer.spec.ts`.
