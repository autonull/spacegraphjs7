import { describe, expect, it } from 'vitest';
import type { RenderNode } from '@spacegraphjs/renderer';
import {
    WIDGET_CAPABILITIES,
    WIDGET_SLOTS,
    WidgetLayer,
    WidgetRegistry,
    resolveWidgetSize,
    type WidgetDescriptor,
    type WidgetHandle,
    type WidgetMountContext,
    type WidgetSizingPolicy,
} from 'spacegraphjs/widgets';

const node = (id: string, extra: Partial<RenderNode> = {}): RenderNode => ({
    id,
    kind: 'tool',
    label: id,
    position: [0, 0, 0],
    ...extra,
});

const descriptor = (
    id: string,
    slots: WidgetDescriptor['slots'],
    representations: WidgetDescriptor['representations'],
    extra: Partial<WidgetDescriptor> = {},
): WidgetDescriptor => ({
    id,
    label: id,
    slots,
    representations,
    mount: () => ({}),
    ...extra,
});

describe('WidgetRegistry (P3.1)', () => {
    it('registers, lists and unregisters descriptors by id', () => {
        const registry = new WidgetRegistry();
        const body = descriptor('body', ['body'], []);
        expect(registry.register(body)).toBe(registry);
        expect(registry.list()).toEqual([body]);
        expect(registry.get('body')).toBe(body);
        expect(registry.unregister('body')).toBe(true);
        expect(registry.list()).toEqual([]);
        expect(registry.unregister('body')).toBe(false);
    });

    it('resolves deterministically by node request, representation and slot', () => {
        const registry = new WidgetRegistry()
            .register(descriptor('summary', ['body'], ['card']))
            .register(descriptor('composer', ['attached'], ['widget', 'detail']))
            .register(descriptor('terminal', ['pinned'], []));

        const ids = (nodes: readonly WidgetDescriptor[]) => nodes.map((d) => d.id);
        expect(ids(registry.resolve(node('a', { widgets: ['summary'] }), 'card', WIDGET_SLOTS))).toEqual([
            'summary',
        ]);
        expect(ids(registry.resolve(node('a'), 'card', ['body']))).toEqual(['summary']);
        expect(ids(registry.resolve(node('a'), 'detail', ['attached']))).toEqual(['composer']);
        expect(ids(registry.resolve(node('a'), 'dot', ['pinned']))).toEqual(['terminal']);
        expect(registry.resolve(node('a', { widgets: ['missing'] }), 'card', WIDGET_SLOTS)).toEqual([]);
    });
});

describe('resolveWidgetSize (P3.2)', () => {
    it('clamps to the host budget and reports the chosen overflow', () => {
        expect(
            resolveWidgetSize(
                { width: 440, height: 180 },
                { max: { width: 220, height: 100 }, overflow: 'summary', feedLayout: true },
            ),
        ).toEqual({
            size: { width: 220, height: 100 },
            overflow: 'summary',
            feedLayout: true,
        });
    });

    it('leaves in-budget measurements untouched and defaults to no layout feedback', () => {
        expect(resolveWidgetSize({ width: 120, height: 40 }, { max: { width: 220, height: 100 } })).toEqual({
            size: { width: 120, height: 40 },
            overflow: undefined,
            feedLayout: false,
        });
    });
});

describe('WidgetLayer (P3.2–P3.4)', () => {
    const setup = (sizing: WidgetSizingPolicy = { feedLayout: true }) => {
        const mounted: WidgetMountContext[] = [];
        const opacities: number[] = [];
        const interactiveFlags: boolean[] = [];
        const unmounted: string[] = [];
        const registration = descriptor('summary', ['body'], ['card', 'detail'], {
            capabilities: ['interactive', 'focus'],
            initialSize: { width: 200, height: 80 },
            mount: (context) => {
                mounted.push(context);
                const handle: WidgetHandle = {
                    setOpacity: (value) => opacities.push(value),
                    setInteractive: (value) => interactiveFlags.push(value),
                    unmount: () => unmounted.push('summary'),
                };
                return handle;
            },
        });
        const rungs = new Map<string, string>([['a', 'card']]);
        const layer = new WidgetLayer({
            registry: new WidgetRegistry().register(registration),
            slots: ['body'],
            sizing,
            representationOf: (id) => rungs.get(id) ?? 'dot',
        });
        return { layer, rungs, mounted, opacities, interactiveFlags, unmounted };
    };

    it('attaches on an eligible representation and detaches when the rung changes', () => {
        const { layer, rungs, interactiveFlags, unmounted, mounted } = setup();
        layer.sync([node('a')]);
        expect(layer.mounted().map((m) => `${m.nodeId}:${m.slot}:${m.descriptorId}`)).toEqual([
            'a:body:summary',
        ]);
        expect(mounted[0].slot).toBe('body');
        expect(interactiveFlags).toEqual([true]);

        rungs.set('a', 'dot');
        layer.sync([node('a')]);
        expect(layer.mounted()).toEqual([]);
        expect(unmounted).toEqual(['summary']);
    });

    it('feeds the largest desired size to layout only when allowed', () => {
        const withFeedback = setup();
        withFeedback.layer.sync([node('a')]);
        expect(withFeedback.layer.desiredSizes().get('a')?.size).toEqual({ width: 200, height: 80 });

        const withoutFeedback = setup({ feedLayout: false });
        withoutFeedback.layer.sync([node('a')]);
        expect([...withoutFeedback.layer.desiredSizes()]).toEqual([]);
    });

    it('projects scene fog onto widget opacity', () => {
        const { layer, opacities } = setup();
        layer.sync([node('a')]);
        layer.setDepthFade(0, 0);
        layer.setDepthFade(1, 0.5);
        expect(opacities[0]).toBe(1);
        expect(opacities[1]).toBeCloseTo(Math.exp(-0.25), 5);
        expect(layer.mounted()[0].opacity).toBeCloseTo(Math.exp(-0.25), 5);
    });

    it('unmounts every live widget on destroy', () => {
        const { layer, unmounted } = setup();
        layer.sync([node('a')]);
        layer.destroy();
        expect(unmounted).toEqual(['summary']);
        expect(layer.mounted()).toEqual([]);
    });
});

describe('widget vocabulary', () => {
    it('exposes stable slot and capability ids', () => {
        expect(WIDGET_SLOTS).toEqual(['header', 'body', 'footer', 'attached', 'pinned']);
        expect(WIDGET_CAPABILITIES).toContain('depth-fade');
    });
});
