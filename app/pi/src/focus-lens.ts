import type { AgentView } from '@spacegraphjs/agent';
import type { RenderModel, RenderNode, RendererViewport } from '@spacegraphjs/renderer';
import type { InstrumentKit } from 'spacegraphjs/widgets';
import { toAdapterNode, focusCardMarkup } from './adapter';
import { derivePorts } from './anatomy';
import { el } from './dom';
import { innerTree, type InnerLayout } from './inner';
import { denseType, type ResolvedPolicy } from './policy';
import type { Position } from './policy/host';
import type { Inspector } from './shell';
import { contextualInstruments } from './shell';

/** Host facts the focus lens reads and the camera facts it projects through. */
export interface LensHost {
    view(): AgentView;
    model(): RenderModel | undefined;
    positions(): ReadonlyMap<string, Position>;
    portals(): ReadonlyMap<string, string>;
    policy(): ResolvedPolicy;
    selection(): readonly string[];
    revealed(): string;
    inspector(): Inspector | undefined;
    cardSize(kind: string, html: boolean, dense: boolean): readonly [number, number];
    screenPosition(id: string): { x: number; y: number } | undefined;
    viewport(): RendererViewport;
}

/** Owns the inspector card, its placement, the connector and the two instrument kits. */
export class FocusLens {
    #signature = '';
    #connector?: SVGLineElement;
    #instruments?: InstrumentKit;
    #inspectorInstruments?: InstrumentKit;
    #instrumentFocus = '';

    constructor(private readonly host: LensHost) {}

    attach(
        connector: SVGLineElement,
        instruments: InstrumentKit,
        inspectorInstruments: InstrumentKit,
    ): void {
        this.#connector = connector;
        this.#instruments = instruments;
        this.#inspectorInstruments = inspectorInstruments;
    }

    render(): void {
        const inspector = this.host.inspector();
        if (!inspector) return;
        const overlay = inspector.element;
        const policy = this.host.policy();
        const depth = Number(policy.values['emphasis.innerDepth']);
        const focus = this.host.revealed() || this.host.selection()[0] || '';
        if (!focus || depth <= 0) {
            this.#hide(overlay);
            return;
        }
        const point = this.host.screenPosition(focus);
        const view = this.host.view();
        const viewNode = view.nodes.find((node) => node.id === focus);
        const adapterNode = viewNode ? toAdapterNode(viewNode) : undefined;
        const modelNode = this.host.model()?.nodes.find((node) => node.id === focus);
        if (!point || !adapterNode || !modelNode) {
            this.#hide(overlay);
            return;
        }
        const layout = String(policy.values['emphasis.innerLayout']) as InnerLayout;
        const scope = this.host.portals().get(focus);
        const scopeFocus = scope ?? '';
        if (document.documentElement.dataset.scopeFocus !== scopeFocus)
            document.documentElement.dataset.scopeFocus = scopeFocus;
        const chips = innerTree(focus, view.nodes, view.edges, depth);
        const signature = [
            focus,
            depth,
            layout,
            adapterNode.kind,
            adapterNode.status,
            chips.map((chip) => chip.id).join(','),
        ].join('|');
        if (signature !== this.#signature) {
            overlay.dataset.kind = adapterNode.kind;
            const ports = derivePorts(focus, view.edges, (id) => this.host.positions().get(id));
            inspector.slot.innerHTML = focusCardMarkup(
                {
                    ...adapterNode,
                    ...(scope ? { scope } : {}),
                    ...(ports ? { data: { ...adapterNode.data, ports } } : {}),
                },
                chips,
                layout,
            );
            this.#signature = signature;
        }
        this.refreshInstruments(modelNode);
        const canvas = el('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        if (!inspector.pinned) {
            const viewport = this.host.viewport();
            const pixelsPerWorld =
                (canvas.clientWidth || 1000) / Math.max(viewport.extent?.width ?? 1000, 1);
            const scale =
                focus === this.host.revealed() ? Number(policy.values['emphasis.focusScale']) : 1;
            const [cardWidth, cardHeight] = this.host.cardSize(
                adapterNode.kind,
                true,
                denseType(policy.values),
            );
            const onScreenWidth = cardWidth * scale * pixelsPerWorld;
            const onScreenHeight = cardHeight * scale * pixelsPerWorld;
            const width = Math.round(Math.max(300, Math.min(420, onScreenWidth)));
            const height = Math.round(Math.max(210, Math.min(300, onScreenHeight)));
            overlay.style.width = `${width}px`;
            overlay.style.height = `${height}px`;
            const cardRect = document.getElementById(`node-html-${focus}`)?.getBoundingClientRect();
            const card = cardRect
                ? {
                      left: cardRect.left - canvasRect.left,
                      right: cardRect.right - canvasRect.left,
                      top: cardRect.top - canvasRect.top,
                      bottom: cardRect.bottom - canvasRect.top,
                  }
                : {
                      left: point.x - onScreenWidth / 2,
                      right: point.x + onScreenWidth / 2,
                      top: point.y - onScreenHeight / 2,
                      bottom: point.y + onScreenHeight / 2,
                  };
            const centerX = (card.left + card.right) / 2;
            const centerY = (card.top + card.bottom) / 2;
            const margin = 12;
            const candidates = [
                { x: centerX - width / 2, y: card.bottom + margin },
                { x: centerX - width / 2, y: card.top - height - margin },
                { x: card.right + margin, y: centerY - height / 2 },
                { x: card.left - width - margin, y: centerY - height / 2 },
            ];
            const fits = (spot: { x: number; y: number }): boolean =>
                spot.x >= margin &&
                spot.y >= margin &&
                spot.x + width <= canvas.clientWidth - margin &&
                spot.y + height <= canvas.clientHeight - margin;
            const spot = candidates.find(fits) ?? candidates[0]!;
            const x = Math.min(
                Math.max(margin, spot.x),
                Math.max(margin, canvas.clientWidth - width - margin),
            );
            const y = Math.min(
                Math.max(margin, spot.y),
                Math.max(margin, canvas.clientHeight - height - margin),
            );
            overlay.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        }
        overlay.hidden = false;
        const line = this.#connector;
        const parent = line?.parentElement;
        if (line && parent) {
            const lensRect = overlay.getBoundingClientRect();
            line.setAttribute('x1', String(Math.round(point.x)));
            line.setAttribute('y1', String(Math.round(point.y)));
            line.setAttribute('x2', String(Math.round(lensRect.left - canvasRect.left + 12)));
            line.setAttribute('y2', String(Math.round(lensRect.top - canvasRect.top + 12)));
            parent.toggleAttribute('hidden', false);
        }
    }

    /** The rail shows at most two contextual instruments; the inspector holds the full kit. */
    refreshInstruments(node?: RenderNode): void {
        if (!this.#instruments) return;
        const scoped = node ? [{ ...node, widgets: contextualInstruments(node) }] : [];
        this.#instruments.refresh(scoped);
        const key = node ? `${node.id}:${node.status ?? ''}` : '';
        if (key === this.#instrumentFocus) return;
        this.#instrumentFocus = key;
        this.#inspectorInstruments?.refresh(node ? [node] : []);
    }

    #hide(overlay: HTMLElement): void {
        overlay.hidden = true;
        this.#connector?.parentElement?.toggleAttribute('hidden', true);
    }
}
