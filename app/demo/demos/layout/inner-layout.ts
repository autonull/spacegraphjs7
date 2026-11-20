import { addOverlayPanel, createDemoWithNodes, shapeNode, SpaceGraph } from '../../framework';

// Inner-node layouts: one GroupNode acts as a subgraph container, nine ShapeNodes declare
// membership with `data.parent`, and switching a mode computes new child positions in the
// container's local frame. There is no built-in inner-layout primitive; `setPositions` is the seam.

type Mode = 'grid' | 'column' | 'row';

const MODES: readonly Mode[] = ['grid', 'column', 'row'];
const CHILD_COUNT = 9;
const CONTAINER = { width: 1200, height: 900, color: 0x1e1e3f };
const CHILD_IDS = Array.from({ length: CHILD_COUNT }, (_, index) => `child-${index}`);
const PALETTE = [
    0x60a5fa, 0x34d399, 0xf472b6, 0xfbbf24, 0xa78bfa, 0x22d3ee, 0xf87171, 0x4ade80, 0xc084fc,
];

function positionsFor(mode: Mode): Record<string, [number, number, number]> {
    const positions: Record<string, [number, number, number]> = {};
    CHILD_IDS.forEach((id, index) => {
        if (mode === 'grid') {
            const column = index % 3;
            const row = Math.floor(index / 3);
            positions[id] = [(column - 1) * 260, -(row - 1) * 180, 0];
        } else if (mode === 'column') {
            positions[id] = [0, -(index - 4) * 95, 0];
        } else {
            positions[id] = [(index - 4) * 120, 0, 0];
        }
    });
    return positions;
}

export default async function innerLayoutDemo(): Promise<SpaceGraph> {
    const nodes = [
        {
            id: 'container',
            type: 'GroupNode',
            position: [0, 0, 0] as [number, number, number],
            data: {
                pinned: true,
                width: CONTAINER.width,
                height: CONTAINER.height,
                depth: 60,
                color: CONTAINER.color,
            },
        },
        ...CHILD_IDS.map((id, index) =>
            shapeNode(id, [0, 0, 0], {
                parent: 'container',
                color: PALETTE[index % PALETTE.length],
                size: 70,
            }),
        ),
    ];

    const sg = await createDemoWithNodes(nodes);
    let current: Mode = 'grid';

    const apply = (mode: Mode): Mode => {
        if (!MODES.includes(mode)) return current;
        current = mode;
        sg.setPositions(positionsFor(mode));
        sg.requestFrame();
        const active = sg.container.querySelector<HTMLElement>('#inner-layout-active');
        if (active) active.textContent = mode;
        for (const button of sg.container.querySelectorAll<HTMLButtonElement>('[data-inner-mode]'))
            button.dataset.active = String(button.dataset.innerMode === mode);
        return mode;
    };

    addOverlayPanel(
        sg,
        'top-right',
        {},
        `<strong>Inner-node layouts</strong><br/>
         <small>subgraph container · <span id="inner-layout-active">grid</span></small>
         <div style="display:flex;gap:6px;margin-top:10px">
             ${MODES.map((mode) => `<button type="button" data-inner-mode="${mode}">${mode}</button>`).join('')}
         </div>`,
    );

    for (const button of sg.container.querySelectorAll<HTMLButtonElement>('[data-inner-mode]'))
        button.addEventListener('click', () => apply(button.dataset.innerMode as Mode));

    apply('grid');
    sg.fitView(140, 0);

    (window as any).__innerLayoutDemo = {
        modes: () => [...MODES],
        mode: () => current,
        set: (mode: string) => apply(mode as Mode),
        positions: () =>
            CHILD_IDS.map((id) => {
                const position = sg.graph.nodes.get(id)?.position;
                return { id, x: position?.x ?? 0, y: position?.y ?? 0 };
            }),
        container: () => ({
            x: 0,
            y: 0,
            width: CONTAINER.width,
            height: CONTAINER.height,
        }),
    };

    return sg;
}
