// P3.5. Hosts sanitize markup and own CSP. The library never evaluates markup, fetches content or
// writes innerHTML; this guard is a cheap parity check, not a sanitizer.

export const WIDGET_SECURITY_CONTRACT = {
    markup: 'host-sanitized only',
    evaluation: 'no eval, Function or inline handlers',
    network: 'the library never fetches widget content',
    csp: 'host supplies a script-src without unsafe-inline; widgets mount trusted DOM',
} as const;

const UNSAFE_MARKUP =
    /<\s*script\b|<\s*\/\s*script|<\s*iframe\b|\bon[a-z]+\s*=|\bjavascript\s*:|\beval\s*\(|\bnew\s+Function\s*\(/i;

/** Reject markup carrying executable vectors; a false result does not certify the markup as safe. */
export function isSafeWidgetMarkup(html: string): boolean {
    return !UNSAFE_MARKUP.test(html);
}
