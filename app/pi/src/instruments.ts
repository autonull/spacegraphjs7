import { escapeHtml } from '@spacegraphjs/adapter';
import type { RenderNode } from '@spacegraphjs/renderer';
import {
    WidgetLayer,
    WidgetRegistry,
    type WidgetDescriptor,
    type WidgetHandle,
} from 'spacegraphjs/widgets';

export const INSTRUMENT_IDS = ['sparkline', 'meter', 'status', 'logtail', 'diff', 'tabs', 'controls'] as const;
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

const dataLines = (data: InstrumentData): readonly string[] => data.lines ?? [];

const render = (
    element: HTMLElement,
    id: InstrumentID,
    data: InstrumentData,
    node: RenderNode,
    onAction?: (action: string, node: RenderNode) => void,
): void => {
    if (id === 'sparkline') {
        const points = (data.series ?? [])
            .slice(-32)
            .map((value, index, all) => `${(index / Math.max(1, all.length - 1)) * 100},${20 - Math.min(20, Math.max(0, value * 20))}`)
            .join(' ');
        element.innerHTML = `<svg viewBox="0 0 100 20" aria-label="activity sparkline"><polyline points="${escapeHtml(points)}" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
        return;
    }
    if (id === 'meter') {
        const percent = Math.round(Math.min(1, Math.max(0, data.value ?? 0)) * 100);
        element.innerHTML = `<span class="instrument-meter" role="meter" aria-valuenow="${percent}"><i style="width:${percent}%"></i></span><span>${percent}%</span>`;
        return;
    }
    if (id === 'status') {
        element.textContent = data.status ?? 'idle';
        return;
    }
    if (id === 'logtail') {
        element.replaceChildren(
            ...dataLines(data)
                .slice(-3)
                .map((line) => {
                    const row = document.createElement('span');
                    row.textContent = line;
                    return row;
                }),
        );
        return;
    }
    if (id === 'diff') {
        element.replaceChildren(
            ...dataLines(data).map((line) => {
                const row = document.createElement('span');
                row.textContent = line;
                row.dataset.sign = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'same';
                return row;
            }),
        );
        return;
    }
    if (id === 'tabs') {
        element.replaceChildren(
            ...(data.tabs ?? []).map((label) => {
                const tab = document.createElement('button');
                tab.type = 'button';
                tab.textContent = label;
                return tab;
            }),
        );
        return;
    }
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
};

/** Host-owned instrument kit. Only sanitized data reaches the DOM; the renderer never interprets it. */
export const createInstrumentKit = (
    container: HTMLElement,
    dataFor: (node: RenderNode) => InstrumentData,
    onAction?: (action: string, node: RenderNode) => void,
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
                    render(element, id, dataFor(current), current, onAction);
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
