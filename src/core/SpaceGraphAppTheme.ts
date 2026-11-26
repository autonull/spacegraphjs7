import type { SpaceGraphApp } from './SpaceGraphApp';
import type { HudTheme } from './SpaceGraphAppHUD';
import {
    renderButtons,
    renderTitleCard,
    renderToolbar,
    renderToolbarActions,
    setupSearchHUD,
} from './SpaceGraphAppHUD';

export function setupDefaultHUD(app: SpaceGraphApp, theme: HudTheme) {
    if (typeof document === 'undefined') return;

    app.hud.removeElement('app-title-card');
    app.hud.removeElement('app-toolbar');

    if (app.options.title) {
        renderTitleCard(app, theme);
    }

    renderToolbar(app, theme);

    app.updateStatsHUD();
    renderToolbarActions(app);
}

export function refreshChrome(app: SpaceGraphApp, theme: NonNullable<typeof app.options.theme>) {
    setupDefaultHUD(app, theme);
    if (app.options.enableSearch) setupSearchHUD(app, theme);
    if (app.buttons.length > 0) renderButtons(app, theme);
}

export function setTheme(
    app: SpaceGraphApp,
    theme: Partial<NonNullable<typeof app.options.theme>>,
) {
    app.options.theme = { ...app.options.theme, ...theme };
    refreshChrome(app, app.options.theme);
}
