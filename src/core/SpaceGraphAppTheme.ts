import type { SpaceGraphApp } from './SpaceGraphApp';
import {
  renderButtons,
  renderTitleCard,
  renderToolbar,
  renderToolbarActions,
  setupSearchHUD,
  updateStatsHUD,
} from './SpaceGraphAppHUD';
import { selectionChanged } from './Selection';

export function setupDefaultHUD(app: SpaceGraphApp, theme: any) {
  if (typeof document === 'undefined') return;

  app.hud.removeElement('app-title-card');
  app.hud.removeElement('app-toolbar');

  if (app.options.title) {
    renderTitleCard(app, theme);
  }

  renderToolbar(app, theme);

  const nodes = [...app.currentSelected];
  const edges = [...app.currentSelectedEdges];
  app.sg.events.emit(
    'selection:changed',
    selectionChanged(
      nodes.map((node) => node.id),
      edges.map((edge) => edge.id)
    )
  );
  renderToolbarActions(app);
}

export function setTheme(
  app: SpaceGraphApp,
  theme: Partial<NonNullable<typeof app.options.theme>>
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

export { renderButtons, renderToolbarActions, setupSearchHUD, updateStatsHUD };
