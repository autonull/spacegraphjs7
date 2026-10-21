/**
 * Colour helpers for the renderer contract: the parse and normalize operations every adapter needs
 * to turn a host's CSS colour into something it can draw. Zero dependencies.
 */

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * A CSS colour as the `0xRRGGBB` number a renderer draws with; undefined when it cannot be read.
 *
 * Reads 3, 6, and 8 digit hex (the alpha is dropped) and `rgb()`/`rgba()`.
 */
export function parseColor(value: string | undefined): number | undefined {
  const hex = value?.trim();
  if (!hex) return undefined;

  if (hex.startsWith('#')) {
    const body = hex.slice(1);
    if (body.length === 3) return Number.parseInt(body.replace(/./g, (c) => c + c), 16);
    if (body.length === 6 || body.length === 8) return Number.parseInt(body.slice(0, 6), 16);
    return undefined;
  }

  const rgb = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return undefined;

  return (Number(rgb[1]) << 16) | (Number(rgb[2]) << 8) | Number(rgb[3]);
}

/**
 * The 6-digit hex form of a colour, or the value unchanged when it is not hex. A renderer that
 * rejects 8-digit hex (Cytoscape) normalizes every theme token through this.
 */
export function normalizeHexColor(value: string): string {
  const match = HEX_COLOR.exec(value.trim());
  if (!match) return value;

  const body = match[1]!;
  return body.length === 3 ? `#${[...body].map((character) => character + character).join('')}` : `#${body.slice(0, 6)}`;
}

/**
 * The WCAG 2.1 relative luminance of a colour whose channels are already in 0..1.
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const linear = (channel: number): number =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The WCAG contrast ratio between two relative luminances: `(L1 + 0.05) / (L2 + 0.05)`, where L1
 * is the lighter of the two.
 */
export function contrastRatioOf(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
