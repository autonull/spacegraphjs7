# HTML widgets (P3)

`spacegraphjs/widgets` attaches living HTML to graph nodes. The library owns registration,
resolution, lifecycle, measured sizing and DOM-fog projection; the host owns the markup, the mount
functions and CSP. No widget implementation is hardcoded in the library and no configuration is a
default.

```ts
import { WidgetLayer, WidgetRegistry, WIDGET_SLOTS } from 'spacegraphjs/widgets';

const registry = new WidgetRegistry();
registry.register({
    id: 'summary',
    label: 'Node summary',
    slots: ['attached'],
    representations: ['widget', 'detail'],
    capabilities: ['interactive', 'focus', 'depth-fade'],
    initialSize: { width: 220, height: 72 },
    mount: ({ node }) => {
        const element = renderSummary(node); // host-owned, sanitized DOM
        return {
            element,
            measure: () => ({ width: element.offsetWidth, height: element.offsetHeight }),
            setOpacity: (opacity) => (element.style.opacity = String(opacity)),
            setInteractive: (on) => element.toggleAttribute('data-sg-interactive', on),
            unmount: () => element.remove(),
        };
    },
});

const layer = new WidgetLayer({
    registry,
    slots: ['attached'],
    sizing: { max: { width: 320, height: 180 }, overflow: 'summary', feedLayout: false },
    representationOf: (id) => rungFor(id),
    onSize: (id, size) => anchorFor(id, size.size, size.feedLayout),
});

layer.sync(model.nodes);
layer.setDepthFade(1.2, 0.4); // scene fog projected onto widget opacity
```

- `WidgetRegistry.resolve` filters deterministically by `RenderNode.widgets`, representation rung and
  enabled slot. Remove a registration and the capability degrades to no widget.
- `resolveWidgetSize` clamps a host measurement to the budget; `overflow` is set only when clamped, and
  the desired size reaches layout only when `feedLayout` is true. Cards never reframe the map by default.
- `WidgetLayer.sync` mounts newly eligible widgets and unmounts the rest on representation changes.
  Handle keys are stable (`node:slot:descriptor`), so live content survives unrelated model updates.
- `setDepthFade(distance, density)` reuses `depthFade` from `spacegraphjs/depth`; the host maps the
  opacity onto its own DOM. A backend that cannot host widgets leaves `RendererCapabilities.widgetSlots`
  out and the host hides the control.
- `RenderNode.widgets` / `RenderNode.widgetSlots` are additive: a renderer that ignores them renders
  exactly as before.
- Security: markup is host-sanitized only. The library never evaluates markup, fetches content or writes
  raw HTML. CSP is supplied by the host (`script-src` without `unsafe-inline`); `isSafeWidgetMarkup` is a
  cheap parity guard, not a sanitizer. See `test/widgets-security.test.ts` and the host parity test in
  `packages/session-graph/src/canvas/security.test.ts`.
- Reduced motion: widgets do not animate on their own. Mount, unmount and fog changes follow the host's
  representation transition, which zeroes its duration under reduced motion.
