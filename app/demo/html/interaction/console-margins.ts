// Console margins — a reading surface with two graph rails derived from the same committed lines.
// The console is the primary view; the rails are read models, never a second graph store.

import type { InnerSourceEdge, InnerSourceNode } from 'spacegraphjs/inspect';
import {
    terminalChapters,
    terminalFacetExprs,
    terminalFacetMatch,
    terminalFacets,
    terminalFidelity,
    terminalFocusWeights,
    terminalGrow,
    terminalLineHTML,
    terminalLODFor,
    terminalPalette,
    terminalTokens,
    type TerminalLine,
} from 'spacegraphjs/terminal';
import { ScaleDomain } from 'spacegraphjs/zoom';

const LADDER = ['dot', 'glyph', 'card', 'detail'] as const;
type Band = (typeof LADDER)[number];

const FIXTURE: readonly TerminalLine[] = [
    {
        id: 'l01',
        kind: 'user',
        status: 'complete',
        label: 'Route question',
        text: 'How does `router.dispatch()` choose a handler?',
        turn: 1,
        role: 'user',
        at: 1,
    },
    {
        id: 'l02',
        kind: 'assistant',
        status: 'complete',
        label: 'Plan trace',
        text: 'I will trace the call and cite the source.',
        turn: 1,
        role: 'assistant',
        at: 2,
        parent: 'l01',
    },
    {
        id: 'l03',
        kind: 'tool',
        status: 'complete',
        label: 'grep',
        text: '`grep -R dispatch src/` — 3 matches in `src/router.ts`',
        turn: 1,
        role: 'tool',
        at: 3,
        parent: 'l02',
    },
    {
        id: 'l04',
        kind: 'file',
        status: 'complete',
        label: 'src/router.ts:42',
        text: '`src/router.ts:42` maps an intent to a handler.',
        turn: 1,
        role: 'tool',
        at: 4,
        parent: 'l03',
    },
    {
        id: 'l05',
        kind: 'assistant',
        status: 'complete',
        label: 'Answer',
        text: 'It dispatches by `intent`; see [docs](https://example.dev/router).',
        turn: 1,
        role: 'assistant',
        at: 5,
        parent: 'l04',
    },
    {
        id: 'l06',
        kind: 'user',
        status: 'complete',
        label: 'Repro failure',
        text: 'The route test fails. Fix it.',
        turn: 2,
        role: 'user',
        at: 6,
    },
    {
        id: 'l07',
        kind: 'tool',
        status: 'failed',
        label: 'test',
        text: '`bun test route.test.ts` → 1 failed, 4 passed',
        turn: 2,
        role: 'tool',
        at: 7,
        parent: 'l06',
    },
    {
        id: 'l08',
        kind: 'error',
        status: 'failed',
        label: 'TypeError',
        text: 'Expected `handler` but received `undefined` at `src/router.ts:51`.',
        turn: 2,
        role: 'tool',
        at: 8,
        parent: 'l07',
    },
    {
        id: 'l09',
        kind: 'file',
        status: 'complete',
        label: 'src/router.ts',
        text: 'Fallback to `noop` when the intent is unknown.',
        turn: 2,
        role: 'tool',
        at: 9,
        parent: 'l08',
    },
    {
        id: 'l10',
        kind: 'tool',
        status: 'complete',
        label: 'test again',
        text: '`bun test route.test.ts` → 5 passed',
        turn: 2,
        role: 'tool',
        at: 10,
        parent: 'l09',
    },
    {
        id: 'l11',
        kind: 'approval',
        status: 'complete',
        label: 'Approval',
        text: 'Apply the patch to `src/router.ts`?',
        turn: 2,
        role: 'assistant',
        at: 11,
        parent: 'l10',
    },
    {
        id: 'l12',
        kind: 'user',
        status: 'complete',
        label: 'Approve',
        text: 'Approved. Commit it.',
        turn: 3,
        role: 'user',
        at: 12,
    },
    {
        id: 'l13',
        kind: 'tool',
        status: 'complete',
        label: 'commit',
        text: '`git commit -m fix(router): default handler` → `a1b2c3d`',
        turn: 3,
        role: 'tool',
        at: 13,
        parent: 'l12',
    },
    {
        id: 'l14',
        kind: 'assistant',
        status: 'complete',
        label: 'Summary',
        text: 'One turn, committed. [unsafe](javascript:alert(1)) is ignored.',
        turn: 3,
        role: 'assistant',
        at: 14,
        parent: 'l13',
    },
];

const scale = new ScaleDomain({
    stops: [
        { at: 0, id: 'dot', label: 'Field', importance: 0.2 },
        { at: 0.25, id: 'glyph', label: 'Index', importance: 0.4 },
        { at: 0.6, id: 'card', label: 'Structure', importance: 0.7 },
        { at: 1, id: 'detail', label: 'Reading', importance: 1 },
    ],
    range: { min: 0.2, max: 2.4, closerIsLarger: true },
});

const sourceNodes: readonly InnerSourceNode[] = FIXTURE.map((line) => ({
    id: line.id,
    label: line.label,
    kind: line.kind,
    status: line.status,
    data: { role: line.role, scope: `Turn ${line.turn ?? 0}` },
}));

const sourceEdges: readonly InnerSourceEdge[] = [
    ...FIXTURE.flatMap((line) =>
        line.parent ? [{ source: line.parent, target: line.id, kind: 'delegates' }] : [],
    ),
    ...FIXTURE.flatMap((line, index) => {
        const next = FIXTURE[index + 1];
        return next && next.turn === line.turn
            ? [{ source: line.id, target: next.id, kind: 'contains' }]
            : [];
    }),
    { source: 'l03', target: 'l09', kind: 'related' },
    { source: 'l08', target: 'l09', kind: 'related' },
];

const requireElement = <T extends Element>(id: string, constructor: new () => T): T => {
    const found = document.getElementById(id);
    if (!(found instanceof constructor)) throw new Error(`console-margins: missing #${id}`);
    return found;
};

const byId = <T extends Element>(id: string): HTMLElement =>
    requireElement(id, HTMLElement);

const stage = byId('stage');
const linesEl = byId('lines');
const spineEl = requireElement('spine', SVGSVGElement);
const spineScroll = byId('spine-scroll');
const growEl = requireElement('grow', SVGSVGElement);
const bridgesEl = requireElement('bridges', SVGSVGElement);
const facetsEl = byId('facets');
const zoomEl = requireElement('zoom', HTMLInputElement);
const paletteEl = requireElement('palette', HTMLSelectElement);
const followEl = requireElement('follow', HTMLButtonElement);
const resetEl = requireElement('reset', HTMLButtonElement);

const svgNS = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Readonly<Record<string, string | number>> = {},
): SVGElementTagNameMap[K] => {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
};

const ROW = 34;
const SPINE_W = 232;
const GROW_W = 300;
const GROW_H = 232;

const state = {
    focusID: 'l08',
    zoom: Number(zoomEl.value) / 100,
    palette: paletteEl.value,
    facet: '',
    follow: false,
};

const band = (): Band => terminalLODFor(state.zoom, LADDER) as Band;

const visibleLines = (): readonly TerminalLine[] => {
    const expressions = terminalFacetExprs(state.facet);
    return expressions.length ? FIXTURE.filter((line) => terminalFacetMatch(line, expressions)) : FIXTURE;
};

const focusWeights = (lines: readonly TerminalLine[]): ReadonlyMap<string, number> =>
    terminalFocusWeights(FIXTURE, state.focusID);

const escapeAttr = (value: string): string =>
    value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

const renderLines = (): void => {
    const lines = visibleLines();
    const currentBand = band();
    const sample = scale.sample(state.zoom);
    const fidelity = terminalFidelity(sample.importance, currentBand);
    const palette = terminalPalette(state.palette);
    const weights = focusWeights(lines);

    linesEl.innerHTML = lines
        .map((line) => {
            const index = FIXTURE.indexOf(line);
            const html = terminalLineHTML(line, palette.glyphs, {
                band: currentBand,
                ladder: LADDER,
                tokens: terminalTokens(line.text),
                ...(currentBand === 'detail'
                    ? {
                          chrome: {
                              lineNumber: index + 1,
                              source: `T${line.turn ?? 0}·${String(line.at ?? 0).padStart(2, '0')}`,
                          },
                      }
                    : {}),
            });
            const weight = weights.get(line.id) ?? 1;
            const opacity = Math.round(fidelity.opacity * (0.4 + 0.6 * weight) * 100) / 100;
            const stagger = Math.round(fidelity.stagger * (1 - weight));
            return `<div class="line" data-line-id="${escapeAttr(line.id)}" data-kind="${escapeAttr(line.kind)}" data-status="${escapeAttr(line.status)}" data-focused="${line.id === state.focusID}" role="option" aria-selected="${line.id === state.focusID}" style="opacity:${opacity};transition-delay:${stagger}ms">${html}</div>`;
        })
        .join('');

    byId('line-count').textContent = `${lines.length} / ${FIXTURE.length} lines`;
    byId('band').textContent = currentBand;
    byId('fidelity').innerHTML = `opacity <b>${fidelity.opacity.toFixed(2)}</b> · stagger <b>${fidelity.stagger}ms</b> · importance <b>${sample.importance.toFixed(2)}</b>`;
};

const renderSpine = (): void => {
    const chapters = terminalChapters(FIXTURE);
    const height = FIXTURE.length * ROW + 12;
    spineEl.setAttribute('width', String(SPINE_W));
    spineEl.setAttribute('height', String(height));
    spineEl.setAttribute('viewBox', `0 0 ${SPINE_W} ${height}`);
    spineEl.replaceChildren();

    const focusIndex = FIXTURE.findIndex((line) => line.id === state.focusID);
    const active = chapters.findIndex((chapter) => {
        const start = FIXTURE.findIndex((line) => line.id === chapter.startID);
        const end = FIXTURE.findIndex((line) => line.id === chapter.endID);
        return focusIndex >= start && focusIndex <= end;
    });
    const centers = chapters.map((chapter) => {
        const start = FIXTURE.findIndex((line) => line.id === chapter.startID);
        const end = FIXTURE.findIndex((line) => line.id === chapter.endID);
        return ((start + end) / 2) * ROW + ROW / 2;
    });

    spineEl.append(
        svg('path', {
            d: centers.map((y, index) => `${index ? 'L' : 'M'} 26 ${y.toFixed(1)}`).join(' '),
            fill: 'none',
            stroke: 'var(--border)',
            'stroke-width': 1.5,
        }),
    );

    chapters.forEach((chapter, index) => {
        const y = centers[index]!;
        const group = svg('g', {
            class: 'spine-node',
            'data-line-id': chapter.startID,
            'data-active': String(index === active),
            tabindex: 0,
            role: 'button',
            'aria-label': `Focus ${chapter.label}`,
        });
        group.append(
            svg('circle', { cx: 26, cy: y, r: index === active ? 7 : 5 }),
            svg('rect', { x: 44, y: y - 11, width: SPINE_W - 56, height: 22, rx: 5 }),
            svg('text', { x: 54, y: y + 4 }),
        );
        group.querySelector('circle')!.setAttribute('fill', index === active ? 'var(--accent)' : 'var(--surface-3)');
        group.querySelector('text')!.textContent =
            band() === 'dot' ? '' : band() === 'glyph' ? chapter.label.slice(0, 1) : chapter.label;
        group.addEventListener('click', () => setFocus(chapter.startID));
        group.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setFocus(chapter.startID);
            }
        });
        spineEl.append(group);
    });

    byId('spine-count').textContent = `${chapters.length} chapters`;
};

const renderGrow = (): void => {
    const growth = terminalGrow(state.focusID, sourceNodes, sourceEdges, {
        depth: 2,
        limit: 5,
        layout: 'radial',
    });
    growEl.replaceChildren();
    if (!growth) {
        byId('grow-source').textContent = 'no neighbourhood';
        return;
    }

    const line = FIXTURE.find((entry) => entry.id === state.focusID)!;
    byId('grow-source').textContent = `${line.label} · ${growth.chips.length} neighbours`;

    const cx = GROW_W / 2;
    const cy = GROW_H / 2;
    const detail = band() === 'detail' || band() === 'card';

    growth.connectors.forEach((connector) => {
        growEl.append(
            svg('line', {
                x1: cx,
                y1: cy,
                x2: connector.x2 * (GROW_W / 100),
                y2: connector.y2 * (GROW_H / 100),
                stroke: 'var(--border)',
                'stroke-width': 1,
            }),
        );
    });

    growth.placements.forEach(({ chip, left, top, width, height }) => {
        const x = Math.max(10, Math.min(GROW_W - width * (GROW_W / 100) - 8, left * (GROW_W / 100)));
        const y = Math.max(14, Math.min(GROW_H - height * (GROW_H / 100) - 8, top * (GROW_H / 100)));
        const group = svg('g', {
            class: 'grow-chip',
            'data-line-id': chip.id,
            'data-active': String(chip.id === state.focusID),
            tabindex: 0,
            role: 'button',
            'aria-label': `Focus ${chip.label}`,
        });
        group.append(
            svg('rect', { x, y, width: width * (GROW_W / 100), height: height * (GROW_H / 100), rx: 5 }),
            svg('text', { x: x + 6, y: y + 14 }),
        );
        const text = group.querySelector('text')!;
        text.textContent = detail ? chip.label.slice(0, 22) : chip.label.slice(0, 1);
        group.addEventListener('click', () => setFocus(chip.id));
        group.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setFocus(chip.id);
            }
        });
        growEl.append(group);
    });

    growEl.append(
        svg('circle', { cx, cy, r: 13, fill: 'var(--surface-3)', stroke: 'var(--accent)', 'stroke-width': 1.5, 'data-focus': 'true' }),
        svg('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: 'var(--accent)', 'font-size': 10 }),
    );
    growEl.lastElementChild!.textContent = detail ? line.kind.slice(0, 3) : line.kind.slice(0, 1);
};

const renderFacets = (): void => {
    const counts = terminalFacets(FIXTURE);
    facetsEl.innerHTML = [...counts.entries()]
        .filter(([key]) => key.startsWith('kind:') || key.startsWith('status:'))
        .map(([key, count]) => {
            const active = state.facet === key;
            return `<button type="button" class="facet" data-facet="${escapeAttr(key)}" data-active="${active}" aria-pressed="${active}">${escapeAttr(key)} <b>${count}</b></button>`;
        })
        .join('');
    byId('filter-readout').textContent = state.facet || 'all';
};

const bridge = (from: DOMRect | undefined, to: DOMRect | undefined, stageRect: DOMRect, tone: string): string => {
    if (!from || !to) return '';
    const x1 = from.right - stageRect.left;
    const y1 = from.top + from.height / 2 - stageRect.top;
    const x2 = to.left - stageRect.left;
    const y2 = to.top + to.height / 2 - stageRect.top;
    const mid = (x1 + x2) / 2;
    return `<path d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" fill="none" stroke="${tone}" stroke-width="1" stroke-dasharray="4 3" opacity="0.9"/>`;
};

const renderBridges = (): void => {
    const stageRect = stage.getBoundingClientRect();
    const line = linesEl.querySelector<HTMLElement>(`[data-line-id="${state.focusID}"]`);
    const spine = spineEl.querySelector<SVGGElement>('[data-active="true"]');
    const grow = growEl.querySelector<SVGCircleElement>('[data-focus="true"]');
    const lineRect = line?.getBoundingClientRect();
    const toSpine = spine?.getBoundingClientRect();
    const toGrow = grow?.getBoundingClientRect();
    bridgesEl.innerHTML = [
        bridge(toSpine, lineRect, stageRect, 'var(--accent)'),
        bridge(lineRect, toGrow, stageRect, 'var(--success)'),
    ].join('');
};

const renderStatus = (): void => {
    const line = FIXTURE.find((entry) => entry.id === state.focusID)!;
    byId('status').innerHTML = `focus <b>${escapeAttr(line.id)}</b> · <b>${escapeAttr(line.label)}</b> · ${escapeAttr(line.kind)} / ${escapeAttr(line.status)}`;
};

const render = (): void => {
    renderLines();
    renderSpine();
    renderGrow();
    renderFacets();
    renderStatus();
    requestAnimationFrame(renderBridges);
};

const setFocus = (id: string): void => {
    if (!FIXTURE.some((line) => line.id === id)) return;
    state.focusID = id;
    state.follow = false;
    followEl.setAttribute('aria-pressed', 'false');
    render();
};

const setZoom = (value: number): void => {
    state.zoom = Math.max(0, Math.min(1, value));
    zoomEl.value = String(Math.round(state.zoom * 100));
    render();
};

zoomEl.addEventListener('input', () => setZoom(Number(zoomEl.value) / 100));
paletteEl.addEventListener('change', () => {
    state.palette = paletteEl.value;
    document.documentElement.dataset.palette = state.palette;
    render();
});
followEl.addEventListener('click', () => {
    state.follow = !state.follow;
    followEl.setAttribute('aria-pressed', String(state.follow));
    if (state.follow) setFocus(FIXTURE.at(-1)!.id);
});
resetEl.addEventListener('click', () => {
    state.facet = '';
    state.follow = false;
    followEl.setAttribute('aria-pressed', 'false');
    setZoom(0.95);
    setFocus('l08');
});

linesEl.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-line-id]');
    if (target) setFocus(target.dataset.lineId!);
});

linesEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const visible = visibleLines();
    const index = visible.findIndex((line) => line.id === state.focusID);
    const next = visible[Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))];
    if (!next) return;
    setFocus(next.id);
    linesEl.querySelector<HTMLElement>(`[data-line-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
});

facetsEl.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-facet]');
    if (!target) return;
    const facet = target.dataset.facet!;
    state.facet = state.facet === facet ? '' : facet;
    render();
});

linesEl.addEventListener('scroll', () => {
    spineScroll.scrollTop = linesEl.scrollTop;
    requestAnimationFrame(renderBridges);
});
spineScroll.addEventListener('scroll', () => {
    linesEl.scrollTop = spineScroll.scrollTop;
});
window.addEventListener('resize', renderBridges);

render();
