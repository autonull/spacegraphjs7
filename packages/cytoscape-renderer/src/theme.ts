import {
  DEFAULT_THEME,
  resolveTheme,
  themeVariable,
  THEME_ROLES,
  type RenderTheme,
  type SemanticTokenMap,
} from '@spacegraphjs/renderer';
import { normalizeTheme } from './mapping';

/**
 * The Cytoscape renderer's palette. Cytoscape rejects 8-digit hex and draws its labels from the
 * muted roles, so the bridge normalizes every colour before the stylesheet sees it.
 */
export const CYTOSCAPE_THEME: RenderTheme = DEFAULT_THEME;

/** The token map the bridge uses when the host maps no variable of its own. */
export const CYTOSCAPE_TOKENS: SemanticTokenMap = Object.fromEntries(
  THEME_ROLES.map((role) => [role, themeVariable(role)])
);

/** Resolves the host's semantic tokens into the palette Cytoscape draws with. */
export class CytoscapeThemeBridge {
  constructor(
    private readonly tokens: SemanticTokenMap = CYTOSCAPE_TOKENS,
    private readonly defaults: RenderTheme = CYTOSCAPE_THEME,
  ) {}

  resolve(read: (variable: string) => string): RenderTheme {
    return normalizeTheme(resolveTheme(this.tokens, read, this.defaults));
  }
}
