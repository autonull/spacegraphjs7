import { GridHelper } from 'three';
import { searchBy } from '../navigation/search';
import { focusNodeCamera } from '../utils/CameraUtils';
import { DOMUtils } from '../utils/DOMUtils';
import type { AppButtonConfig, SpaceGraphApp, SpaceGraphAppOptions } from './SpaceGraphApp';

export type HudTheme = NonNullable<SpaceGraphAppOptions['theme']>;

const SECONDARY_TEXT_COLOR = '#94a3b8';
const BORDER_GLASS = '1px solid rgba(255,255,255,0.1)';
const BORDER_SUBTLE = 'rgba(255,255,255,0.1)';
const BG_GLASS = 'rgba(255,255,255,0.05)';
const BG_HOVER = 'rgba(255,255,255,0.1)';
const BUTTON_BASE = {
    border: 'none',
    borderRadius: '99px',
    color: 'white',
    cursor: 'pointer',
} as const;

const HUD_STYLE_ID = 'sg-app-hud-style';
const HUD_CONTROL_CLASS = 'sg-hud-control';

function installFocusStyles(): void {
    if (document.getElementById(HUD_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = HUD_STYLE_ID;
    style.textContent = `.${HUD_CONTROL_CLASS}:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }`;
    document.head.appendChild(style);
}

function hudControl<T extends HTMLElement>(element: T): T {
    installFocusStyles();
    element.classList.add(HUD_CONTROL_CLASS);
    if (element instanceof HTMLButtonElement) element.type = 'button';
    return element;
}

/** The glass a host's chrome sits on: the theme's surface, blurred, with a hairline edge. */
function glassPanel(theme: HudTheme = {}): Partial<CSSStyleDeclaration> {
    return {
        background: theme.backgroundColor,
        backdropFilter: 'blur(8px)',
        border: BORDER_GLASS,
    };
}

export function renderTitleCard(app: SpaceGraphApp, theme: HudTheme = {}) {
    app.hud.removeElement('app-title-card');
    if (!app.options.title) return;

    const titleCard = DOMUtils.createElement('div', {
        innerHTML: `
            <h1 style="font-size: 18px; margin: 0 0 8px 0; background: -webkit-linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${app.options.title}</h1>
            ${app.options.description ? `<p style="font-size: 12px; color: ${SECONDARY_TEXT_COLOR}; line-height: 1.5; margin: 0;">${app.options.description}</p>` : ''}
        `,
        style: {
            ...glassPanel(theme),
            padding: '16px',
            borderRadius: '12px',
            width: 'min(300px, calc(100vw - 32px))',
            color: 'white',
            fontFamily: 'sans-serif',
            transition: 'all 0.3s ease',
        },
    });

    app.hud.addElement({ id: 'app-title-card', position: 'top-left', element: titleCard });
}

export function renderToolbar(app: SpaceGraphApp, theme: HudTheme = {}) {
    app.hud.removeElement('app-toolbar');

    const container = DOMUtils.createElement('div', {
        style: {
            ...glassPanel(theme),
            padding: '12px 24px',
            borderRadius: '99px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: '100%',
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
        ariaLabel: 'Fit all nodes in view',
        title: 'Fit all nodes in view (F)',
        style: {
            ...BUTTON_BASE,
            background: BG_GLASS,
            border: BORDER_GLASS,
            padding: '8px 16px',
            fontWeight: '600',
        },
    });
    fitBtn.setAttribute('aria-keyshortcuts', 'F');
    hudControl(fitBtn);
    fitBtn.onmouseenter = () => (fitBtn.style.background = BG_HOVER);
    fitBtn.onmouseleave = () => (fitBtn.style.background = BG_GLASS);
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
        innerHTML: `<span style="font-size: 10px; color: ${SECONDARY_TEXT_COLOR}; text-transform: uppercase;">${label}</span><span id="${id}" style="font-size: 16px; font-weight: 700;${color ? ` color: ${color};` : ''}">${value}</span>`,
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    });
}

function createDivider(): HTMLElement {
    return DOMUtils.createElement('div', {
        style: { width: '1px', height: '24px', background: BORDER_SUBTLE },
    });
}

function createModeToggle(app: SpaceGraphApp, theme: HudTheme = {}): HTMLElement {
    const container = DOMUtils.createElement('div', {
        id: 'sg-app-mode-toggle',
        role: 'group',
        ariaLabel: 'Interaction mode',
        style: {
            display: 'flex',
            gap: '4px',
            background: BG_GLASS,
            borderRadius: '99px',
            padding: '2px',
            border: BORDER_GLASS,
        },
    });

    const modes = ['default', 'select', 'connect'] as const;
    const labels = ['View', 'Select', 'Connect'];

    modes.forEach((mode, i) => {
        const btn = DOMUtils.createElement('button', {
            textContent: labels[i],
            ariaLabel: `${labels[i]} mode`,
            title: `${labels[i]} mode`,
            style: {
                ...BUTTON_BASE,
                background: 'transparent',
                padding: '6px 16px',
                color: SECONDARY_TEXT_COLOR,
                fontWeight: 'bold',
                fontSize: '12px',
                transition: 'all 0.2s ease',
            },
        });
        hudControl(btn);
        btn.dataset['mode'] = mode;
        btn.onclick = () => app.setMode(mode);
        container.appendChild(btn);
    });

    syncModeToggle(app, theme);
    return container;
}

/** One authority for mode visuals: call after any `setMode`, including host toolbar actions. */
export function syncModeToggle(app: SpaceGraphApp, theme: HudTheme = {}): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('sg-app-mode-toggle');
    if (!container) return;
    const interaction = app.sg.pluginManager.get('interaction') as { mode?: string } | undefined;
    const active = interaction?.mode ?? 'default';
    container.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
        const on = button.dataset['mode'] === active;
        button.style.background = on
            ? `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
            : 'transparent';
        button.style.color = on ? 'white' : SECONDARY_TEXT_COLOR;
        button.setAttribute('aria-pressed', String(on));
    });
}

export function createZoomControls(app: SpaceGraphApp, theme: HudTheme = {}): HTMLElement {
    const container = DOMUtils.createElement('div', {
        role: 'group',
        ariaLabel: 'Zoom',
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
            ariaLabel: isZoomIn ? 'Zoom in' : 'Zoom out',
            title: isZoomIn ? 'Zoom in (+)' : 'Zoom out (−)',
            style: {
                ...BUTTON_BASE,
                background: 'transparent',
                padding: '6px 12px',
                fontWeight: 'bold',
                fontSize: '16px',
            },
        });
        hudControl(btn);
        btn.setAttribute('aria-keyshortcuts', isZoomIn ? '+' : '-');
        btn.onmouseenter = () => (btn.style.background = BG_HOVER);
        btn.onmouseleave = () => (btn.style.background = 'transparent');
        btn.onclick = () => {
            const next = app.sg.zoom + (isZoomIn ? 0.1 : -0.1);
            app.sg.setZoom(Math.max(0, Math.min(1, next)));
        };
        return btn;
    };

    const zoomSlider = DOMUtils.createElement('input', {
        type: 'range',
        id: 'sg-app-zoom-slider',
        ariaLabel: 'Zoom level',
        title: 'Zoom level (+ / −)',
        min: '0',
        max: '1',
        step: '0.01',
        style: {
            width: '80px',
            margin: '0 8px',
            cursor: 'pointer',
            accentColor: theme.primaryColor,
        },
    });

    hudControl(zoomSlider);
    zoomSlider.oninput = () => app.sg.setZoom(Number.parseFloat(zoomSlider.value));

    const zoomValue = DOMUtils.createElement('span', {
        id: 'sg-app-zoom-value',
        title: 'Current zoom',
        textContent: `${Math.round(app.sg.zoom * 100)}%`,
        style: {
            minWidth: '34px',
            textAlign: 'center',
            fontSize: '11px',
            color: SECONDARY_TEXT_COLOR,
            fontVariantNumeric: 'tabular-nums',
        },
    });

    const sliderHandler = () => {
        const percent = Math.round(app.sg.zoom * 100);
        zoomSlider.value = app.sg.zoom.toFixed(2);
        zoomSlider.setAttribute('aria-valuetext', `${percent} percent`);
        zoomValue.textContent = `${percent}%`;
    };
    sliderHandler();
    app.sg.events.on('zoom:change', sliderHandler);
    app._zoomSliderHandler = sliderHandler;

    container.append(createBtn('-', false), zoomSlider, zoomValue, createBtn('+', true));
    return container;
}

export function renderButtons(app: SpaceGraphApp, theme: HudTheme = {}) {
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

function createStyledButton(
    btn: AppButtonConfig,
    isToolbar: boolean,
    theme: HudTheme = {},
): HTMLElement {
    const bgNormal = isToolbar ? 'transparent' : (theme.backgroundColor ?? '');
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

    hudControl(btnEl);
    if (btn.icon) {
        btnEl.appendChild(DOMUtils.createElement('span', { innerHTML: btn.icon }));
    }

    btnEl.appendChild(document.createTextNode(btn.label));

    btnEl.onmouseenter = () => (btnEl.style.background = bgHover);
    btnEl.onmouseleave = () => (btnEl.style.background = bgNormal);
    btnEl.onclick = () => btn.onClick();

    return btnEl;
}

export function setupSearchHUD(app: SpaceGraphApp, theme: HudTheme = {}) {
    if (typeof document === 'undefined') return;

    app.hud.removeElement('app-search');

    const container = DOMUtils.createElement('div', {
        style: {
            ...glassPanel(theme),
            padding: '8px 16px',
            borderRadius: '99px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            width: '300px',
            transition: 'background 0.3s ease',
        },
    });

    const icon = DOMUtils.createElement('span', {
        textContent: '🔍',
        style: { marginRight: '10px', fontSize: '14px', color: SECONDARY_TEXT_COLOR },
    });
    container.appendChild(icon);

    const input = DOMUtils.createElement('input', {
        type: 'search',
        id: 'sg-app-search-input',
        ariaLabel: 'Search nodes',
        title: 'Search nodes ( / )',
        placeholder: 'Search nodes...',
        style: {
            background: 'transparent',
            border: 'none',
            color: 'white',
            flex: '1',
            minWidth: '0',
            fontFamily: 'sans-serif',
            fontSize: '14px',
        },
    });
    input.setAttribute('aria-keyshortcuts', '/');
    hudControl(input);

    const status = DOMUtils.createElement('span', {
        id: 'sg-app-search-status',
        role: 'status',
        style: {
            flex: '0 0 auto',
            marginInlineStart: '8px',
            fontSize: '11px',
            color: SECONDARY_TEXT_COLOR,
            fontVariantNumeric: 'tabular-nums',
        },
    });
    status.setAttribute('aria-live', 'polite');

    input.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
        if (!query) {
            app.sg.clearSelection();
            status.textContent = '';
            return;
        }
        const matches = searchBy(
            { nodes: [...app.sg.graph.nodes.values()] },
            query,
            (node, needle) => {
                const text = [node.label, node.data?.label, node.data?.title, node.id]
                    .filter(Boolean)
                    .join(' ');
                return text.toLowerCase().includes(needle) ? 0 : -1;
            },
        );

        app.sg.select(matches.map((match) => match.id));
        status.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
        if (matches.length === 1 && app.sg.cameraControls) {
            focusNodeCamera(app.sg, matches[0]);
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        input.value = '';
        app.sg.clearSelection();
        status.textContent = '';
    });

    container.append(input, status);

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
        countEl.textContent = (app.currentSelected.size + app.currentSelectedEdges.size).toString();
    }

    const nodeCountEl = document.getElementById('sg-app-node-count');
    if (nodeCountEl) {
        nodeCountEl.textContent = app.sg.graph.nodes.size.toString();
    }
}

export function addGrid(app: SpaceGraphApp): () => void {
    if (app.options.enableGrid === false) return () => undefined;
    const gridHelper = new GridHelper(10000, 100, 0x475569, 0x1e293b);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    app.sg.renderer.scene.add(gridHelper);
    return () => app.sg.renderer.scene.remove(gridHelper);
}
