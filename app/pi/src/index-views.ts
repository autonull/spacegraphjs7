import type { GraphViewData } from '@spacegraphjs/shared';
import { shortcutRow } from 'pi-kit/keyboard';
import type { Catalog } from './catalog';
import { button, el } from './dom';
import type { Command } from './shell';
import type { ScopeSpec } from 'spacegraphjs/layout';

/** Replace the evidence list with one row per line. */
export function renderEvidence(lines: readonly string[]): void {
    el('evidence').replaceChildren(
        ...lines.map((line) => {
            const item = document.createElement('li');
            item.textContent = line;
            item.title = line;
            return item;
        }),
    );
}

/** Both visible reference maps render from the same tables that feed the command help. */
export function renderShortcutReference(entries: readonly Command[]): void {
    el('keyboard-map').replaceChildren(
        ...entries
            .filter((entry) => entry.hint && !entry.hint.includes('.'))
            .map((entry) => shortcutRow(entry.hint!, entry.label, 'reference-row')),
    );
}

export function renderMouseReference(
    gestures: readonly { readonly key: string; readonly label: string }[],
): void {
    el('mouse-map').replaceChildren(
        ...gestures.map(({ key, label }) => shortcutRow(key, label, 'reference-row')),
    );
}

export function renderOverview(
    specs: readonly ScopeSpec[],
    view: GraphViewData,
    reveal: (id: string) => void,
): void {
    el('overview').replaceChildren(
        ...specs.map((spec) =>
            button(`${spec.id} · ${spec.nodes.length}`, () => {
                const first =
                    spec.nodes[0] && view.nodes.find((node) => node.id === spec.nodes[0].id);
                if (first) reveal(first.id);
            }),
        ),
    );
}

export function renderTurnMap(view: GraphViewData, reveal: (id: string) => void): void {
    el('turn-map').replaceChildren(
        ...(view.turns ?? []).map((id, index) =>
            button(`turn ${index + 1}`, () => reveal(id), { title: id }),
        ),
    );
}

/** One visible proof line; the full catalogue stays one click away. */
export function renderProofLine(catalog: Catalog): void {
    const line = document.getElementById('proof-line');
    if (!(line instanceof HTMLElement)) return;
    const { presets, experiments } = catalog;
    const detail = document.createElement('span');
    detail.className = 'proof-detail';
    detail.textContent = ` · ${presets.length} presets · ${experiments.length} experiments`;
    const jargon = document.createElement('span');
    jargon.className = 'jargon-label';
    jargon.textContent = 'proof';
    const plain = document.createElement('span');
    plain.className = 'plain-label';
    plain.textContent = 'Evidence';
    line.replaceChildren(jargon, plain, detail);
    line.title = 'proof — open the evidence catalog of presets, experiments and comparisons';
}

export function mountFirstRunHint(record: (kind: string) => void): void {
    const hint = document.getElementById('first-run-hint');
    if (!(hint instanceof HTMLElement)) return;
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('shot')) {
        hint.remove();
        return;
    }
    const key = 'spacegraph:first-run-hint';
    if (localStorage.getItem(key) === 'seen') {
        hint.remove();
        return;
    }
    hint.hidden = false;
    const dismiss = (): void => {
        localStorage.setItem(key, 'seen');
        hint.remove();
        record('hint:dismiss');
    };
    hint.querySelector('button')?.addEventListener('click', dismiss);
}
