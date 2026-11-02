/**
 * Design tokens for SpaceGraphJS components.
 * Maps to CSS custom properties for consistent theming across hosts.
 */

export interface DesignTokens {
  /** Color tokens */
  colors: {
    /** Primary brand color */
    primary: string
    /** Primary color for text on primary background */
    primaryForeground: string
    /** Secondary color */
    secondary: string
    /** Muted/background color */
    muted: string
    /** Muted foreground color */
    mutedForeground: string
    /** Accent color */
    accent: string
    /** Accent foreground */
    accentForeground: string
    /** Destructive/error color */
    destructive: string
    /** Destructive foreground */
    destructiveForeground: string
    /** Border color */
    border: string
    /** Input border color */
    input: string
    /** Ring/focus color */
    ring: string
    /** Background */
    background: string
    /** Foreground/text */
    foreground: string
    /** Card background */
    card: string
    /** Card foreground */
    cardForeground: string
    /** Popover background */
    popover: string
    /** Popover foreground */
    popoverForeground: string
  }

  /** Spacing tokens (in px) */
  spacing: {
    none: string
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    "2xl": string
    "3xl": string
  }

  /** Border radius tokens (in px) */
  radii: {
    none: string
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }

  /** Shadow tokens */
  shadows: {
    none: string
    sm: string
    md: string
    lg: string
    xl: string
  }

  /** Transition tokens */
  transitions: {
    fast: string
    normal: string
    slow: string
  }

  /** Font size tokens (in px) */
  fontSizes: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    "2xl": string
    "3xl": string
  }

  /** Font weight tokens */
  fontWeights: {
    normal: number
    medium: number
    semibold: number
    bold: number
  }

  /** Line height tokens */
  lineHeights: {
    tight: string
    normal: string
    relaxed: string
    compact: string
  }

  /** Z-index tokens */
  zIndices: {
    hide: number
    base: number
    dropdown: number
    sticky: number
    modal: number
    popover: number
    tooltip: number
  }

  // Allow indexing for flattening
  [key: string]: unknown
}

/** Default design tokens (light theme). */
export const defaultTokens: DesignTokens = {
  colors: {
    primary: "hsl(221.2 83.2% 53.3%)",
    primaryForeground: "hsl(210 40% 98%)",
    secondary: "hsl(210 40% 96.1%)",
    muted: "hsl(210 40% 96.1%)",
    mutedForeground: "hsl(215.4 16.3% 46.9%)",
    accent: "hsl(210 40% 96.1%)",
    accentForeground: "hsl(222.2 47.4% 11.2%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(210 40% 98%)",
    border: "hsl(214.3 31.8% 91.4%)",
    input: "hsl(214.3 31.8% 91.4%)",
    ring: "hsl(221.2 83.2% 53.3%)",
    background: "hsl(0 0% 100%)",
    foreground: "hsl(222.2 84% 4.9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(222.2 84% 4.9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(222.2 84% 4.9%)",
  },
  spacing: {
    none: "0px",
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },
  radii: {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
  transitions: {
    fast: "100ms ease",
    normal: "200ms ease",
    slow: "300ms ease",
  },
  fontSizes: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    lg: "14px",
    xl: "16px",
    "2xl": "18px",
    "3xl": "20px",
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
    compact: "1.3",
  },
  zIndices: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
  },
}

/** Dark theme tokens. */
export const darkTokens: DesignTokens = {
  ...defaultTokens,
  colors: {
    primary: "hsl(217.2 91.2% 59.8%)",
    primaryForeground: "hsl(222.2 47.4% 11.2%)",
    secondary: "hsl(217.2 32.6% 17.5%)",
    muted: "hsl(217.2 32.6% 17.5%)",
    mutedForeground: "hsl(215 20.2% 65.1%)",
    accent: "hsl(217.2 32.6% 17.5%)",
    accentForeground: "hsl(210 40% 98%)",
    destructive: "hsl(0 62.8% 30.6%)",
    destructiveForeground: "hsl(210 40% 98%)",
    border: "hsl(217.2 32.6% 17.5%)",
    input: "hsl(217.2 32.6% 17.5%)",
    ring: "hsl(224.3 76.3% 48%)",
    background: "hsl(222.2 84% 4.9%)",
    foreground: "hsl(210 40% 98%)",
    card: "hsl(222.2 84% 4.9%)",
    cardForeground: "hsl(210 40% 98%)",
    popover: "hsl(222.2 84% 4.9%)",
    popoverForeground: "hsl(210 40% 98%)",
  },
}

/**
 * Generates CSS custom property declarations from tokens.
 * @param tokens - Design tokens object
 * @param prefix - Prefix for CSS variables (default: "sg")
 * @returns CSS string with custom property declarations
 */
export function generateTokenCSS(tokens: DesignTokens, prefix = "sg"): string {
  const lines: string[] = []
  const flatten = (obj: Record<string, unknown>, path = ""): void => {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}-${key}` : key
      if (typeof value === "object" && value !== null) {
        flatten(value as Record<string, unknown>, newPath)
      } else {
        lines.push(`  --${prefix}-${newPath}: ${value};`)
      }
    }
  }
  flatten(tokens as Record<string, unknown>)
  return `:root {\n${lines.join("\n")}\n}`
}