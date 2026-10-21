/**
 * The colours the DOM nodes draw with, per theme. Each role names what the colour is for, so a
 * host that restyles a node restyles one role here and not every hex across the node files.
 */

export type NodeTheme = 'dark' | 'light';

export interface NodePalette {
  /** The card's own surface. */
  surface: string;
  /** The card's edge. */
  border: string;
  /** The card's primary text. */
  text: string;
  /** The title bar's surface. */
  headerSurface: string;
  /** Secondary text on the card's surface. */
  mutedText: string;
  /** The faintest text on the card's surface. */
  faintText: string;
  /** A key in a data listing. */
  keyText: string;
  /** A chart's grid line. */
  gridLine: string;
  /** A chart's canvas. */
  canvasSurface: string;
  /** The scrollbar's track and thumb. */
  scrollbar: string;
  /** The colours the data types are drawn with. */
  value: {
    string: string;
    number: string;
    boolean: string;
    other: string;
  };
}

export const NODE_PALETTE: Record<NodeTheme, NodePalette> = {
  dark: {
    surface: '#1e293b',
    border: '#334155',
    text: '#f8fafc',
    headerSurface: '#0f172a',
    mutedText: '#94a3b8',
    faintText: '#64748b',
    keyText: '#7dd3fc',
    gridLine: '#1e293b',
    canvasSurface: '#0f172a',
    scrollbar: '#475569 #1e293b',
    value: {
      string: '#a3e635',
      number: '#fbbf24',
      boolean: '#f472b6',
      other: '#e2e8f0',
    },
  },
  light: {
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    headerSurface: '#f1f5f9',
    mutedText: '#64748b',
    faintText: '#94a3b8',
    keyText: '#0284c7',
    gridLine: '#e2e8f0',
    canvasSurface: '#ffffff',
    scrollbar: '#cbd5e1 #f8fafc',
    value: {
      string: '#16a34a',
      number: '#d97706',
      boolean: '#db2777',
      other: '#334155',
    },
  },
};

/** The palette a theme name asks for; an unknown theme falls back to the dark one. */
export function paletteOf(theme: string | undefined): NodePalette {
  return NODE_PALETTE[theme === 'light' ? 'light' : 'dark'];
}
