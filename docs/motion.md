# Motion direction (P4.1–P4.2)

The library supplies the director and camera sequencer; the host supplies verbs, timing, easing, stagger, reduced motion and the camera adapter. No verb is a default and animations never write canonical node positions.

```ts
import { MotionDirector, CameraVerbRegistry, type CameraAdapter } from 'spacegraphjs/motion';

const director = new MotionDirector().register('arrive', ({ value }) => {
    emphasis.set('node-1', value); // host-owned channel
});
director.play(
    [
        { id: 'node-1', verb: 'arrive', target: 'emphasis', from: 0, to: 1, duration: 0.5 },
        { id: 'node-2', verb: 'arrive', target: 'emphasis', from: 0, to: 1, duration: 0.5 },
    ],
    { ease: 'spring.snappy', stagger: 0.08, reducedMotion: prefersReducedMotion },
);

const adapter: CameraAdapter = {
    fit: (ids, duration) => controller.fitView(100, duration, ids),
    focus: (id, duration) => controller.focusNode(id, 100, duration),
    flyTo: (position, target, duration) => controls.flyTo(toVector3(target), distance, duration),
    orbit: (amount, duration) => controls.setPolar(controls.spherical.phi, amount, duration),
    zoom: (amount, duration) =>
        controls.flyTo(target, controls.spherical.radius / amount, duration),
    reset: () => controller.resetCamera(),
};
new CameraVerbRegistry().run({ verb: 'flyTo', position: [0, 0, 12], target: [0, 0, 0] }, adapter);
```

- `playMotion` emits one stable-id frame per step per `advance`; `reducedMotion` emits only final frames.
- Easing includes the four gsap-equivalent curves and analytic `spring.*` curves; hosts clamp overshoot on `[0, 1]` channels.
- Camera verbs use neutral defaults unless a host registers an override; unknown verbs are no-ops.
- Orthographic orbit is opt-in through `controls.setOrbitInOrthographic(true)`; content-relative zoom bounds come from the host `CameraPolicy`.
- Declared axes: `motion` (preference), `motionVerb`, `cameraVerb`. See `test/motion.test.ts` and `test/e2e/explorer.spec.ts`.

## Pi flagship decision record (2026-11-22, TODO5 Phase 1)

**L1 — active-card pulse:** landed. A one-shot CSS brightness pulse uses alternating keyframe names to
restart and takes its duration from the existing `ladder.blendMs` clock. Reduced motion sets `animation:
none` and reaches the same settled state. No new subsystem, renderer branch, contract field or knob.

**L2 — ribbon flow: deferred with reason.** `FlowEdge` dash animation belongs to the engine-mode page;
making it drive Pi ribbons requires a renderer branch, which ADR 0005 forbids. Promotion needs a measured
demand and a second host consumer, as with the other renderer-type exceptions. Today the causal ribbon is
static host CSS/SVG data in `RenderEdge.data`; no dash animation ships in Pi.

**L3 — choreography:** landed for existing clocks. Pulse, rung crossfade and camera verbs already share
`ladder.blendMs` / `camera.verbMs` / `camera.traceMs`. The opt-in `living-graph` preset lengthens those
clocks plus `salience.decayRate` and records provenance through the `policy()` hook. It is an experiment
input, not a recommendation or default (ADR 0008).

**Evidence:** `app/pi/tests/motion.spec.ts` writes `docs/screenshots/motion/{with.png,without.png,comparison.json}`.
The harness asserts pulse presence/absence and that both variants settle. Framing differs because
`emulateMedia({ reducedMotion: 'reduce' })` changes the one-time `renderer.fit`; pixel identity and
viewport parity are explicitly not gates during active development.
