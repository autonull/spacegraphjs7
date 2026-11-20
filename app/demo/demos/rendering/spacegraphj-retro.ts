import { addOverlayPanel, createDemo, SpaceGraph } from '../../framework';

// Two views from the SpaceGraphJ reference screenshots:
//  - graph: near-black canvas, serif glyph cards, thick crimson ribbons, white selection outline.
//  - gui: a compound widget dashboard laid out as a subgraph (GroupNode + data.parent children),
//    zoomable as one unit. Inner layout modes reposition the widgets via setPositions.

type View = 'graph' | 'gui';
type InnerMode = 'grid' | 'column' | 'row';

const VIEWS: readonly View[] = ['graph', 'gui'];
const MODES: readonly InnerMode[] = ['grid', 'column', 'row'];
const CRIMSON = 0x620025;
const PARK_X = 10000;
const DASHBOARD = { width: 1500, height: 950 };

const GLYPHS = ['&&', '&p', '∞', '→', '◇', '++', '==', '<>', '::', '##'];
const GRAPH_IDS = GLYPHS.map((_, index) => `glyph-${index}`);
const WIDGET_IDS = ['wave-1', 'wave-2', 'tabs', 'buttons', 'slider', 'status'];

const graphPositions = (): Record<string, [number, number, number]> =>
    Object.fromEntries(
        GRAPH_IDS.map((id, index) => {
            const angle = (index / GLYPHS.length) * Math.PI * 2;
            return [
                id,
                [Math.cos(angle) * 460, Math.sin(angle) * 340, 0] as [number, number, number],
            ];
        }),
    );

const parked = (ids: readonly string[]): Record<string, [number, number, number]> =>
    Object.fromEntries(ids.map((id) => [id, [PARK_X, PARK_X, 0] as [number, number, number]]));

function glyphCard(index: number) {
    const glyph = GLYPHS[index]!;
    return {
        id: GRAPH_IDS[index]!,
        type: 'HtmlNode',
        position: graphPositions()[GRAPH_IDS[index]!]!,
        data: {
            width: 104,
            height: 30,
            showControls: false,
            style: {
                background: '#101010',
                border: '1px solid #222222',
                color: '#e8e8e8',
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                alignItems: 'center',
                paddingLeft: '10px',
            },
            html: `<span>${glyph}</span><div style="position:absolute;left:8px;right:8px;top:50%;height:1px;background:#555"></div>`,
        },
    };
}

function waveform(id: string, color: string, data: number[]) {
    return {
        id,
        type: 'ChartNode',
        position: [0, 0, 0] as [number, number, number],
        data: {
            chartType: 'line',
            width: 560,
            height: 240,
            theme: 'dark',
            labels: data.map((_, index) => String(index)),
            datasets: [
                {
                    label: id,
                    data,
                    color,
                    fill: true,
                    backgroundColor: `${color}33`,
                },
            ],
            chartOptions: { elements: { line: { tension: 0.35 } } },
        },
    };
}

function widget(id: string, html: string, width: number, height: number) {
    return {
        id,
        type: 'HtmlNode',
        position: [0, 0, 0] as [number, number, number],
        data: {
            parent: 'dashboard',
            width,
            height,
            showControls: false,
            html,
        },
    };
}

const TABS = [
    'lAtt',
    'lChart',
    'lScope',
    'lGame',
    'lGraph',
    'lHisto',
    'lInput',
    'lMeta',
    'lSpect',
    'lStat',
    'lTasks',
];
const SIDEBAR = ['Clear', 'Load', 'Save', 'List'];
const WAVE = [8, 14, 9, 22, 16, 30, 12, 26, 18, 34, 14, 24, 11, 28, 19, 31, 13, 25, 17, 29];

function dashboardNodes() {
    return [
        {
            id: 'dashboard',
            type: 'GroupNode',
            position: [0, 0, 0] as [number, number, number],
            data: {
                pinned: true,
                width: DASHBOARD.width,
                height: DASHBOARD.height,
                depth: 40,
                color: 0x050505,
            },
        },
        waveform('wave-1', '#427c3b', WAVE),
        waveform(
            'wave-2',
            '#8b5cf6',
            WAVE.map((value, index) => (value + (index % 4) * 5) / 1.5),
        ),
        widget(
            'tabs',
            `<div style="width:100%;height:100%;display:flex;align-items:center;gap:3px;background:#0b0b0b;font:11px monospace;color:#bbb">
                ${TABS.map((tab, index) => `<span style="padding:4px 6px;background:${index === 4 ? '#3b82f6' : '#1a1a1a'};color:${index === 4 ? '#fff' : '#aaa'}">${tab}</span>`).join('')}
             </div>`,
            940,
            40,
        ),
        widget(
            'buttons',
            `<div style="width:100%;height:100%;display:flex;flex-direction:column;gap:10px;justify-content:center;font:20px monospace;color:#ddd">
                ${SIDEBAR.map((label) => `<button style="background:#111;color:#ddd;border:1px solid #333;padding:8px;font:inherit;text-align:left">${label}</button>`).join('')}
             </div>`,
            170,
            300,
        ),
        widget(
            'slider',
            `<div style="width:100%;height:100%;display:flex;align-items:center;gap:12px;background:#0b0b0b;color:#bbb;font:12px monospace">
                <span>rangeDurs</span><input type="range" min="0" max="100" value="62" style="flex:1;accent-color:#8b5cf6"/>
             </div>`,
            560,
            48,
        ),
        widget(
            'status',
            `<div style="width:100%;height:100%;background:#0b0b0b;color:#888;font:11px monospace;padding:10px;box-sizing:border-box">
                subgraph · compound widgets · zoom to inspect
             </div>`,
            560,
            56,
        ),
    ];
}

function widgetPositions(mode: InnerMode): Record<string, [number, number, number]> {
    const slots: Record<InnerMode, readonly [number, number][]> = {
        grid: [
            [-300, 160],
            [300, 160],
            [0, 360],
            [-560, 0],
            [0, -140],
            [300, -260],
        ],
        column: [
            [0, 320],
            [0, 160],
            [0, 20],
            [-360, 20],
            [0, -140],
            [0, -280],
        ],
        row: [
            [-520, 160],
            [-120, 160],
            [280, 160],
            [560, 160],
            [-200, -80],
            [280, -200],
        ],
    };
    const positions: Record<string, [number, number, number]> = {};
    WIDGET_IDS.forEach((id, index) => {
        const [x, y] = slots[mode][index]!;
        positions[id] = [x, y, 0];
    });
    return positions;
}

export default async function spacegraphJRetroDemo(): Promise<SpaceGraph> {
    const edges = GRAPH_IDS.flatMap((id, index) =>
        index === 0
            ? GRAPH_IDS.slice(1, 6).map((target, position) => ({
                  id: `ribbon-${position}`,
                  source: id,
                  target,
                  type: position % 2 ? 'DynamicThicknessEdge' : 'Edge',
                  data: {
                      color: CRIMSON,
                      weight: 1,
                      minRadius: 5,
                      maxRadius: 14,
                      thickness: 8,
                      gradientColors: ['#43001a', '#ff0040'],
                  },
              }))
            : [],
    );

    const sg = await createDemo(
        {
            nodes: [...GRAPH_IDS.map((_, index) => glyphCard(index)), ...dashboardNodes()],
            edges,
        },
        {
            theme: {
                background: '#050505',
                node: { fill: '#101010', stroke: '#222222' },
                edge: { color: CRIMSON },
                label: {
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 18,
                    color: '#dddddd',
                },
                selection: '#ffffff',
            },
        },
    );

    let view: View = 'graph';
    let innerMode: InnerMode = 'grid';

    const frame = () => {
        const active =
            view === 'graph'
                ? { ...graphPositions(), ...parked(['dashboard', ...WIDGET_IDS]) }
                : {
                      ...parked(GRAPH_IDS),
                      dashboard: [0, 0, 0] as [number, number, number],
                      ...widgetPositions(innerMode),
                  };
        sg.setPositions(active);
        sg.center(0, 0, 0);
        sg.setZoom(0.35);
        const label = document.getElementById('retro-view-active');
        if (label) label.textContent = `${view} · ${innerMode}`;
    };

    const setView = (next: View): View => {
        view = next;
        frame();
        return view;
    };

    const setInnerMode = (next: InnerMode): InnerMode => {
        innerMode = next;
        frame();
        return innerMode;
    };

    addOverlayPanel(
        sg,
        'top-right',
        {},
        `<strong>SpaceGraphJ style</strong><br/>
         <small id="retro-view-active">graph · ${innerMode}</small>
         <div style="display:flex;gap:6px;margin-top:10px">
             ${VIEWS.map((option) => `<button type="button" data-retro-view="${option}">${option}</button>`).join('')}
         </div>
         <div style="display:flex;gap:6px;margin-top:6px">
             ${MODES.map((mode) => `<button type="button" data-retro-mode="${mode}">${mode}</button>`).join('')}
         </div>`,
    );

    for (const button of sg.container.querySelectorAll<HTMLButtonElement>('[data-retro-view]'))
        button.addEventListener('click', () => setView(button.dataset.retroView as View));
    for (const button of sg.container.querySelectorAll<HTMLButtonElement>('[data-retro-mode]'))
        button.addEventListener('click', () => setInnerMode(button.dataset.retroMode as InnerMode));

    sg.select('glyph-2');
    setView('graph');

    (window as any).__retroDemo = {
        views: () => [...VIEWS],
        view: () => view,
        set: (next: string) => setView(next as View),
        setModes: () => [...MODES],
        innerMode: () => innerMode,
        setInnerMode: (next: string) => setInnerMode(next as InnerMode),
        zoom: (value?: number) => {
            if (value !== undefined) sg.setZoom(value);
            return sg.zoom;
        },
        stats: () => ({
            nodes: sg.graph.nodes.size,
            edges: sg.graph.edges.size,
            selected: 'glyph-2',
            crimson: CRIMSON,
        }),
        positionOf: (id: string) => sg.graph.nodes.get(id)?.position.toArray() ?? null,
        focus: (id: string) => {
            const position = sg.graph.nodes.get(id)?.position;
            if (!position) return false;
            sg.setCamera([position.x, position.y, 340], [position.x, position.y, 0]);
            return true;
        },
        positions: () =>
            WIDGET_IDS.map((id) => {
                const position = sg.graph.nodes.get(id)?.position;
                return { id, x: position?.x ?? 0, y: position?.y ?? 0 };
            }),
        container: () => ({
            x: 0,
            y: 0,
            width: DASHBOARD.width,
            height: DASHBOARD.height,
        }),
    };

    return sg;
}
