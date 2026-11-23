// A reusable host kit of sanitized attached instruments. Promoted from the Pi host after Graph IDE
// became the second consumer. The renderer still never interprets the data: hosts own every value.

import type { RenderNode } from '@spacegraphjs/renderer';
import { WidgetLayer } from './layer';
import { WidgetRegistry, type WidgetDescriptor, type WidgetHandle } from './registry';

export const INSTRUMENT_IDS = [
    'sparkline',
    'meter',
    'status',
    'logtail',
    'diff',
    'tabs',
    'controls',
] as const;
export type InstrumentID = (typeof INSTRUMENT_IDS)[number];

export interface InstrumentData {
    readonly series?: readonly number[];
    readonly value?: number;
    readonly status?: string;
    readonly lines?: readonly string[];
    readonly tabs?: readonly string[];
    readonly actions?: readonly string[];
}

export interface InstrumentKit {
    readonly layer: WidgetLayer;
    refresh(nodes: readonly RenderNode[]): void;
}

type ActionHandler = (action: string, node: RenderNode) => void;
type InstrumentRenderer = (
    element: HTMLElement,
    data: InstrumentData,
    node: RenderNode,
    onAction?: ActionHandler,
) => void;

const rows = (lines: readonly string[], decorate?: (row: HTMLElement, line: string) => void) =>
    lines.map((line) => {
        const row = document.createElement('span');
        row.textContent = line;
        decorate?.(row, line);
        return row;
    });

const RENDERERS: Record<InstrumentID, InstrumentRenderer> = {
    sparkline(element, data) {
        const points = (data.series ?? [])
            .slice(-32)
            .map(
                (value, index, all) =>
                    `${(index / Math.max(1, all.length - 1)) * 100},${20 - Math.min(20, Math.max(0, value * 20))}`,
            )
            .join(' ');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 20');
        svg.setAttribute('aria-label', 'activity sparkline');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', points);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', 'currentColor');
        line.setAttribute('stroke-width', '1');
        svg.append(line);
        element.replaceChildren(svg);
    },
    meter(element, data) {
        const percent = Math.round(Math.min(1, Math.max(0, data.value ?? 0)) * 100);
        const meter = document.createElement('span');
        meter.className = 'instrument-meter';
        meter.setAttribute('role', 'meter');
        meter.setAttribute('aria-valuenow', String(percent));
        const fill = document.createElement('i');
        fill.style.width = `${percent}%`;
        meter.append(fill);
        const label = document.createElement('span');
        label.textContent = `${percent}%`;
        element.replaceChildren(meter, label);
    },
    status(element, data) {
        element.textContent = data.status ?? 'idle';
    },
    logtail(element, data) {
        element.replaceChildren(...rows((data.lines ?? []).slice(-3)));
    },
    diff(element, data) {
        element.replaceChildren(
            ...rows(data.lines ?? [], (row, line) => {
                row.dataset.sign = line.startsWith('+')
                    ? 'add'
                    : line.startsWith('-')
                      ? 'remove'
                      : 'same';
            }),
        );
    },
    tabs(element, data) {
        element.replaceChildren(
            ...(data.tabs ?? []).map((label) => {
                const tab = document.createElement('button');
                tab.type = 'button';
                tab.textContent = label;
                return tab;
            }),
        );
    },
    controls(element, data, node, onAction) {
        element.replaceChildren(
            ...(data.actions ?? []).map((action) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = action;
                button.dataset.instrumentAction = action;
                button.dataset.instrumentTarget = node.id;
                button.addEventListener('click', () => onAction?.(action, node));
                return button;
            }),
        );
    },
};

/** Host-owned instrument kit. Only sanitized data reaches the DOM; the renderer never interprets it. */
export const createInstrumentKit = (
    container: HTMLElement,
    dataFor: (node: RenderNode) => InstrumentData,
    onAction?: ActionHandler,
): InstrumentKit => {
    const registry = new WidgetRegistry();
    for (const id of INSTRUMENT_IDS) {
        const descriptor: WidgetDescriptor = {
            id,
            label: id,
            slots: ['attached'],
            representations: ['detail'],
            mount: ({ node }): WidgetHandle => {
                const element = document.createElement('div');
                element.className = `instrument instrument-${id}`;
                element.dataset.instrumentFor = node.id;
                const update = (current: RenderNode): void =>
                    RENDERERS[id](element, dataFor(current), current, onAction);
                update(node);
                container.append(element);
                return {
                    element,
                    measure: () => ({ width: 180, height: 28 }),
                    update: (context) => update(context.node),
                    unmount: () => element.remove(),
                };
            },
        };
        registry.register(descriptor);
    }
    const layer = new WidgetLayer({
        registry,
        slots: ['attached'],
        representationOf: () => 'detail',
    });
    return {
        layer,
        refresh(nodes) {
            layer.sync(nodes);
            const byID = new Map(nodes.map((node) => [node.id, node]));
            for (const mounted of layer.mounted()) {
                const node = byID.get(mounted.nodeId);
                if (node) mounted.handle.update?.({ node, slot: mounted.slot });
            }
        },
    };
};
