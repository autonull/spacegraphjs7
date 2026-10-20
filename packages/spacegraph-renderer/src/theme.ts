import {
  DEFAULT_THEME,
  resolveTheme,
  type RenderTheme,
  type SemanticTokenMap,
} from '@spacegraphjs/renderer';

/**
 * The SpaceGraph renderer's palette. A host overrides a role by mapping it to a CSS variable; every
 * role the host leaves unmapped keeps the value below, so a missing stylesheet still yields a
 * legible canvas.
 */
export const RENDERER_THEME: RenderTheme = DEFAULT_THEME;

/** Resolves the renderer's palette from the host's semantic tokens. */
export function resolveRendererTheme(
  tokens: SemanticTokenMap,
  read: (variable: string) => string,
  defaults: RenderTheme = RENDERER_THEME,
): RenderTheme {
  return resolveTheme(tokens, read, defaults);
}
