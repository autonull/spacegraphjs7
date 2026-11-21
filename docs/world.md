# World and sensory seams (P4.3–P4.5)

Depth, scene features and sensory channels are policies. The library samples and gates them; the host owns fog, lights, instancing, parallax, trails and any sensory adapter. Nothing is enabled unless an axis or a capability asks for it.

```ts
import { sampleDepth } from 'spacegraphjs/depth';
import {
    enabledSceneFeatures,
    registerSensory,
    worldPolicyFor,
    supportsSceneFeature,
    supportsSensory,
    type SensoryAdapter,
    type WorldCapabilities,
} from 'spacegraphjs/world';

const policy = worldPolicyFor(state.get('sceneFeature'), state.get('sensory'), state.get('lod'));
const capabilities: WorldCapabilities = { sceneFeatures: ['fog'], sensory: [] };

const features = enabledSceneFeatures(capabilities, policy.features);
if (supportsSceneFeature(capabilities, 'fog')) renderer.setDepthFade(0.05);

// The host owns the device. The library only records and gates the adapter.
const adapter: SensoryAdapter = {
    id: 'sound',
    label: 'Console audio',
    emit: (type, detail) => console.info(type, detail),
};
const dispose = registerSensory(adapter);
if (!supportsSensory(capabilities, policy.sensory)) reportUnsupported(policy.sensory);
adapter.emit('reveal', node.id);
dispose(); // restores the unsupported default
```

- `blendDepth` interpolates two named mode treatments; the named modes remain the endpoints.
- `worldRepresentation` maps overview rungs to instanced geometry and detail rungs to DOM cards; it adds no LOD state.
- `SCENE_FEATURES` and `SENSORY_SEAMS` are descriptors. `supportsSensory` returns true only after a host registers an adapter for that seam and the capability does not exclude it; the registration returns a disposer. WebXR, sound and haptics are off by default and no headset is assumed.
- The demo registers a console-only audio adapter on one page to prove registration and gating; it writes to the console and never touches hardware.
- Declared axes: `depth`, `depthAxis`, `sceneFeature`, `sensory`. See `test/depth-continuum.test.ts`, `test/world.test.ts` and the demo's explorer and sensory-adapter page specs.
