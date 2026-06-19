import type { SpaceGraphApp } from './SpaceGraphApp';
import {
    renderTitleCard,
    renderToolbar,
    renderButtons,
    renderToolbarActions,
    setupSearchHUD,
    updateStatsHUD,
} from './SpaceGraphAppHUD';

export function setupDefaultHUD(app: SpaceGraphApp, theme: any) {
    if (typeof document === 'undefined') return;

    app.hud.removeElement('app-title-card');
    app.hud.removeElement('app-toolbar');

    if (app.options.title) {
        renderTitleCard(app, theme);
    }

    renderToolbar(app, theme);

    app.sg.events.emit('selection:changed', {
        nodes: (app as any).currentSelected,
        edges: (app as any).currentSelectedEdges,
        timestamp: Date.now(),
    });
    renderToolbarActions(app);
}

export function setTheme(
    app: SpaceGraphApp,
    theme: Partial<NonNullable<typeof app.options.theme>>,
) {
    app.options.theme = { ...app.options.theme, ...theme };

    setupDefaultHUD(app, app.options.theme);
    if (app.options.enableSearch) {
        setupSearchHUD(app, app.options.theme);
    }
    if (app.buttons.length > 0) {
        renderButtons(app, app.options.theme);
    }
    renderToolbarActions(app);
}

export { updateStatsHUD, renderButtons, renderToolbarActions, setupSearchHUD };
