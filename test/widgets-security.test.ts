// P3.5 parity baseline. The host security test owns escaping; this test proves the widget library
// itself never evaluates markup, fetches content or writes raw HTML into the DOM.

// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSafeWidgetMarkup, WIDGET_SECURITY_CONTRACT } from 'spacegraphjs/widgets';

const dir = resolve(__dirname, '../src/widgets');
const source = readdirSync(dir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => readFileSync(resolve(dir, file), 'utf8'))
    .join('\n');

describe('widget security contract (P3.5)', () => {
    it('rejects executable markup vectors', () => {
        for (const attack of [
            '<script>window.__xss = 1</script>',
            '<img src=x onerror="window.__xss = 1">',
            '<svg onload=window.__xss=1>',
            '<iframe src="javascript:window.__xss=1"></iframe>',
            'javascript:window.__xss=1',
            'eval(window.__xss)',
        ]) {
            expect(isSafeWidgetMarkup(attack)).toBe(false);
        }
    });

    it('accepts inert markup', () => {
        expect(isSafeWidgetMarkup('<div class="summary">A &amp; B</div>')).toBe(true);
    });

    it('declares the host-owned sanitization and CSP boundary', () => {
        expect(WIDGET_SECURITY_CONTRACT.markup).toContain('host-sanitized');
        expect(WIDGET_SECURITY_CONTRACT.csp).toContain('script-src');
    });

    it('never evaluates, fetches or writes raw HTML in library code', () => {
        expect(source).not.toMatch(/\beval\s*\(|\bnew\s+Function\s*\(|\bfetch\s*\(|\.innerHTML\s*=/);
    });
});
