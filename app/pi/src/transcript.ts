import type { GraphViewData } from '@spacegraphjs/shared';
import { button, el } from './dom';

/** The host facts the transcript renders and the actions its rows trigger. */
export interface TranscriptHost {
    view(): GraphViewData;
    revealed(): string;
    reveal(id: string): void;
    record(kind: string, meta: Readonly<Record<string, string | number | boolean>>): void;
    align(): void;
}

const TRANSCRIPT_KINDS = new Set([
    'message',
    'tool',
    'read-tool',
    'artifact',
    'file',
    'approval',
    'error',
]);

/** Owns the transcript rows, their expanded state and the scroll overview. */
export class TranscriptView {
    #expanded = new Set<string>();

    constructor(private readonly host: TranscriptHost) {}

    render(): void {
        const view = this.host.view();
        const messages = view.nodes.filter((node) => TRANSCRIPT_KINDS.has(node.kind));
        const byID = new Map(view.nodes.map((node) => [node.id, node]));
        const revealed = this.host.revealed();
        const rows = messages.map((node) => {
            const expanded = this.#expanded.has(node.id);
            const row = document.createElement('div');
            row.className = 'spine-row';
            row.dataset.expanded = String(expanded);
            row.dataset.kind = node.kind;
            const fullLabel = String(node.data?.fullLabel ?? node.label);
            const text = String(node.data?.text ?? node.summary ?? '');
            const head = document.createElement('div');
            head.className = 'spine-head';
            head.append(
                button(`${fullLabel}: ${text}`, () => this.host.reveal(node.id), {
                    className: 'transcript-row',
                    dataset: { node: node.id, revealed: String(node.id === revealed) },
                }),
                button(expanded ? '▾' : '▸', () => this.toggle(node.id), {
                    className: 'spine-expand',
                    title: expanded ? 'Collapse detail' : 'Expand detail',
                }),
            );
            const links = view.edges
                .filter((edge) => edge.source === node.id || edge.target === node.id)
                .slice(0, 3)
                .map((edge) => {
                    const outgoing = edge.source === node.id;
                    const neighbor = outgoing ? edge.target : edge.source;
                    const relation = String(edge.data?.relation ?? edge.kind);
                    return `${outgoing ? '→' : '←'} ${relation} ${byID.get(neighbor)?.label ?? neighbor}`;
                });
            const detail = document.createElement('div');
            detail.className = 'transcript-detail';
            detail.textContent = [`${node.kind} · ${node.status}`, ...links].join(' · ');
            row.append(head, detail);
            return row;
        });
        el('transcript-list').replaceChildren(...rows);
        this.#renderOverview(messages.map((node) => node.id));
        this.host.align();
    }

    toggle(id: string): void {
        if (this.#expanded.has(id)) this.#expanded.delete(id);
        else this.#expanded.add(id);
        this.host.record('transcript:expand', { node: id, expanded: this.#expanded.has(id) });
        this.render();
    }

    updateOverview(): void {
        const pane = el('transcript');
        const view =
            el('transcript-overview').querySelector<SVGRectElement>('[data-transcript-view]');
        if (!view) return;
        const fraction = pane.clientHeight / Math.max(pane.scrollHeight, 1);
        const height = Math.max(12, 200 * fraction);
        const max = Math.max(pane.scrollHeight - pane.clientHeight, 1);
        view.setAttribute('height', String(height));
        view.setAttribute('y', String((pane.scrollTop / max) * (200 - height)));
    }

    #renderOverview(ids: readonly string[]): void {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 16 200');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        const view = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        view.setAttribute('x', '2');
        view.setAttribute('width', '12');
        view.setAttribute('data-transcript-view', '');
        svg.append(view);
        for (const [index, id] of ids.entries()) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', '8');
            dot.setAttribute('cy', String(((index + 0.5) / Math.max(ids.length, 1)) * 200));
            dot.setAttribute('r', '2.4');
            dot.setAttribute('data-transcript-node', id);
            svg.append(dot);
        }
        el('transcript-overview').replaceChildren(svg);
        this.updateOverview();
    }
}
