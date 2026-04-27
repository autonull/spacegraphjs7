import type { SpaceGraphApp } from './SpaceGraphApp';
import type { AppButtonConfig } from './SpaceGraphApp';
import type { Node as SGNode } from '../nodes/Node';
import { DOMUtils } from '../utils/DOMUtils';
import * as THREE from 'three';

const SECONDARY_TEXT_COLOR = '#94a3b8';
const BORDER_GLASS = '1px solid rgba(255,255,255,0.1)';
const BORDER_SUBTLE = 'rgba(255,255,255,0.1)';
const BG_GLASS = 'rgba(255,255,255,0.05)';
const BG_HOVER = 'rgba(255,255,255,0.1)';

export function renderTitleCard(app: SpaceGraphApp, theme: any) {
    app.hud.removeElement('app-title-card');
    if (!app.options.title) return;

    const titleCard = DOMUtils.createElement('div', {
        innerHTML: `
            <h1 style="font-size: 18px; margin: 0 0 8px 0; background: -webkit-linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${app.options.title}</h1>
            ${app.options.description ? `<p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">${app.options.description}</p>` : ''}
        `,
        style: {
            background: theme.backgroundColor,
            backdropFilter: 'blur(8px)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            width: '300px',
            color: 'white',
            fontFamily: 'sans-serif',
            transition: 'all 0.3s ease',
        },
    });

    app.hud.addElement({ id: 'app-title-card', position: 'top-left', element: titleCard });
}

export function renderToolbar(app: SpaceGraphApp, theme: any) {
    app.hud.removeElement('app-toolbar');

    const container = DOMUtils.createElement('div', {
        style: {
            background: theme.backgroundColor,
            backdropFilter: 'blur(8px)',
            padding: '12px 24px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            color: 'white',
            fontFamily: 'sans-serif',
        },
    });

    const nodesStat = createStatBlock(
        'Nodes',
        'sg-app-node-count',
        app.sg.graph.nodes.size.toString(),
    );
    const selectedStat = createStatBlock(
        'Selected',
        'sg-app-selected-count',
        '0',
        theme.primaryColor,
    );

    container.append(nodesStat, createDivider(), selectedStat, createDivider());

    const fitBtn = DOMUtils.createElement('button', {
        textContent: 'Fit View',
        style: {
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
            border: 'none',
            padding: '8px 16px',
            borderRadius: '99px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
        },
    });
    fitBtn.onclick = () => app.sg.fitView(200);
    container.appendChild(fitBtn);

    container.appendChild(createModeToggle(app, theme));
    container.appendChild(createZoomControls(app, theme));

    const actionsContainer = DOMUtils.createElement('div', {
        id: 'sg-app-toolbar-actions',
        style: { display: 'flex', gap: '12px' },
    });
    container.appendChild(actionsContainer);

    app.hud.addElement({ id: 'app-toolbar', position: 'bottom-center', element: container });
}

function createStatBlock(label: string, id: string, value: string, color?: string): HTMLElement {
    return DOMUtils.createElement('div', {
        innerHTML: `<span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">${label}</span><span id="${id}" style="font-size: 16px; font-weight: 700;${color ? ` color: ${color};` : ''}">${value}</span>`,
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    });
}

function createDivider(): HTMLElement {
    return DOMUtils.createElement('div', {
        style: { width: '1px', height: '24px', background: BORDER_SUBTLE },
    });
}

function createModeToggle(app: SpaceGraphApp, theme: any): HTMLElement {
    const container = DOMUtils.createElement('div', {
        style: {
            display: 'flex',
            gap: '4px',
            background: BG_GLASS,
            borderRadius: '99px',
            padding: '2px',
            border: BORDER_GLASS,
        },
    });

    const modeButtons: Record<string, HTMLButtonElement> = {};
    const updateModeStyles = (activeMode: string) => {
        for (const [mode, btn] of Object.entries(modeButtons)) {
            btn.style.background =
                mode === activeMode
                    ? `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                    : 'transparent';
            btn.style.color = mode === activeMode ? 'white' : SECONDARY_TEXT_COLOR;
        }
    };

    const modes = ['default', 'select', 'connect'] as const;
    const labels = ['View', 'Select', 'Connect'];

    modes.forEach((mode, i) => {
        const btn = DOMUtils.createElement('button', {
            textContent: labels[i],
            style: {
                background: 'transparent',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '99px',
                color: SECONDARY_TEXT_COLOR,
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            },
        });
        btn.onclick = () => {
            app.setMode(mode);
            updateModeStyles(mode);
        };
        modeButtons[mode] = btn;
        container.appendChild(btn);
    });

    const interaction = app.sg.pluginManager.getPlugin('interaction') as any;
    updateModeStyles(interaction ? interaction.mode : 'default');

    return container;
}

function createZoomControls(app: SpaceGraphApp, theme: any): HTMLElement {
    const container = DOMUtils.createElement('div', {
        style: {
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: BG_GLASS,
            borderRadius: '99px',
            padding: '2px 4px',
            border: BORDER_GLASS,
        },
    });

    const createBtn = (label: string, isZoomIn: boolean) => {
        const btn = DOMUtils.createElement('button', {
            textContent: label,
            style: {
                background: 'transparent',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '99px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
            },
        });
        btn.onmouseenter = () => (btn.style.background = BG_HOVER);
        btn.onmouseleave = () => (btn.style.background = 'transparent');
        btn.onclick = () => {
            if (!app.sg.cameraControls) return;
            const currentRadius = app.sg.cameraControls.spherical.radius;
            const targetRadius = Math.max(
                10,
                Math.min(
                    5000,
                    currentRadius + (isZoomIn ? -currentRadius * 0.5 : currentRadius * 0.5),
                ),
            );
            app.sg.cameraControls.flyTo(app.sg.cameraControls.target, targetRadius, 0.5);
        };
        return btn;
    };

    const zoomSlider = DOMUtils.createElement('input', {
        type: 'range',
        id: 'sg-app-zoom-slider',
        min: '10',
        max: '5000',
        step: '1',
        style: {
            width: '80px',
            margin: '0 8px',
            cursor: 'pointer',
            accentColor: theme.primaryColor,
        },
    });

    zoomSlider.oninput = () => {
        if (!app.sg.cameraControls) return;
        const invertedRadius = 5010 - parseFloat(zoomSlider.value);
        app.sg.cameraControls.spherical.radius = invertedRadius;
        app.sg.cameraControls.flyTo(app.sg.cameraControls.target, invertedRadius, 0);
    };

    if (app.sg.cameraControls)
        zoomSlider.value = (5010 - app.sg.cameraControls.spherical.radius).toString();

    const sliderHandler = () => {
        if (app.sg.cameraControls)
            zoomSlider.value = (5010 - app.sg.cameraControls.spherical.radius).toString();
    };
    app.sg.events.on('camera:move', sliderHandler);
    (app as any)._zoomSliderHandler = sliderHandler;

    container.append(createBtn('-', false), zoomSlider, createBtn('+', true));
    return container;
}

export function renderButtons(app: SpaceGraphApp, theme: any) {
    if (typeof document === 'undefined') return;

    app.hud.removeElement('app-actions');

    const container = DOMUtils.createElement('div', {
        style: {
            display: 'flex',
            gap: '12px',
            flexDirection: 'column',
        },
    });

    for (const btn of app.buttons) {
        container.appendChild(createStyledButton(btn, false, theme));
    }

    app.hud.addElement({
        id: 'app-actions',
        position: 'top-right',
        element: container,
    });
}

export function renderToolbarActions(app: SpaceGraphApp) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('sg-app-toolbar-actions');
    if (!container) return;

    container.innerHTML = '';

    const theme = {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        ...app.options.theme,
    };

    for (const btn of app.toolbarActions) {
        container.appendChild(createStyledButton(btn, true, theme));
    }
}

function createStyledButton(btn: AppButtonConfig, isToolbar: boolean, theme: any): HTMLElement {
    const bgNormal = isToolbar ? 'transparent' : theme.backgroundColor;
    const bgHover = BG_HOVER;

    const btnEl = DOMUtils.createElement('button', {
        id: `sg-${isToolbar ? 'toolbar-' : ''}btn-${btn.id}`,
        style: {
            background: bgNormal,
            border: isToolbar ? '1px solid rgba(255,255,255,0.2)' : BORDER_GLASS,
            padding: isToolbar ? '6px 12px' : '10px 16px',
            borderRadius: isToolbar ? '99px' : '8px',
            color: 'white',
            fontFamily: 'sans-serif',
            fontSize: isToolbar ? '13px' : '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: isToolbar ? '6px' : '8px',
        },
    });

    if (btn.icon) {
        btnEl.appendChild(DOMUtils.createElement('span', { innerHTML: btn.icon }));
    }

    btnEl.appendChild(document.createTextNode(btn.label));

    btnEl.onmouseenter = () => (btnEl.style.background = bgHover);
    btnEl.onmouseleave = () => (btnEl.style.background = bgNormal);
    btnEl.onclick = () => btn.onClick();

    return btnEl;
}

export function setupSearchHUD(app: SpaceGraphApp, theme: any) {
    if (typeof document === 'undefined') return;

    app.hud.removeElement('app-search');

    const container = DOMUtils.createElement('div', {
        style: {
            background: theme.backgroundColor,
            backdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: '99px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            width: '300px',
            transition: 'background 0.3s ease',
        },
    });

    const icon = DOMUtils.createElement('span', {
        textContent: '🔍',
        style: { marginRight: '10px', fontSize: '14px', color: '#94a3b8' },
    });
    container.appendChild(icon);

    const input = DOMUtils.createElement('input', {
        type: 'text',
        placeholder: 'Search nodes...',
        style: {
            background: 'transparent',
            border: 'none',
            color: 'white',
            outline: 'none',
            width: '100%',
            fontFamily: 'sans-serif',
            fontSize: '14px',
        },
    });

    input.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();
        if (!query) {
            app.clearSelectionStyles();
            app.sg.events.emit('selection:changed', {
                nodes: [],
                edges: [],
                timestamp: Date.now(),
            });
            return;
        }

        const matches: SGNode[] = [];
        for (const node of app.sg.graph.nodes.values()) {
            const label = String(node.data?.label || node.data?.title || node.id || '');
            if (label.toLowerCase().includes(query)) {
                matches.push(node);
            }
        }

        app.clearSelectionStyles();
        app.applySelectionStyles();
        app.sg.events.emit('selection:changed', {
            nodes: matches.map((n) => n.id),
            edges: [],
            timestamp: Date.now(),
        });

        if (matches.length === 1 && app.sg.cameraControls) {
            const node = matches[0];
            const targetPos = node.position.clone();
            const targetRadius = node.data?.width
                ? Math.max((node.data as any).width * 1.5, 150)
                : 150;
            app.sg.cameraControls.flyTo(targetPos, targetRadius);
        }
    });

    container.appendChild(input);

    app.hud.addElement({
        id: 'app-search',
        position: 'top-center',
        element: container,
    });
}

export function updateStatsHUD(app: SpaceGraphApp) {
    if (typeof document === 'undefined') return;

    const countEl = document.getElementById('sg-app-selected-count');
    if (countEl) {
        countEl.textContent = (
            (app as any).currentSelected.length + (app as any).currentSelectedEdges.length
        ).toString();
    }

    const nodeCountEl = document.getElementById('sg-app-node-count');
    if (nodeCountEl) {
        nodeCountEl.textContent = app.sg.graph.nodes.size.toString();
    }
}

export function addGrid(app: SpaceGraphApp) {
    if (app.options.enableGrid === false) return;
    const size = 10000;
    const divisions = 100;
    const gridHelper = new THREE.GridHelper(size, divisions, 0x475569, 0x1e293b);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    app.sg.renderer.scene.add(gridHelper);
}
