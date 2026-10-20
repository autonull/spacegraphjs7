import { describe, expect, it } from 'vitest';
import { diffTone, parsePatch, renderCodeDiff, type CodeDiff } from '../../src/overlays';

const PATCH = ['--- a/file.ts', '+++ b/file.ts', '@@ -1,2 +1,2 @@', ' const a = 1', '-const b = 2', '+const b = 3'].join(
    '\n',
);

const DIFFS: CodeDiff[] = [
    { file: 'src/file.ts', patch: PATCH, additions: 1, deletions: 1, status: 'modified' },
    { file: 'src/other.ts', patch: '+added', additions: 1, deletions: 0, status: 'added' },
];

describe('parsePatch', () => {
    it('tones the patch lines by their marker', () => {
        expect(parsePatch(PATCH).map((line) => line.tone)).toEqual([
            'header',
            'header',
            'header',
            'context',
            'removed',
            'added',
        ]);
    });

    it('keeps the patch text verbatim', () => {
        expect(parsePatch(PATCH).map((line) => line.text)).toEqual(PATCH.split('\n'));
    });

    it('drops the trailing empty line of a patch', () => {
        expect(parsePatch('+one\n').map((line) => line.text)).toEqual(['+one']);
    });

    it('reads the tone of a single line', () => {
        expect(diffTone('@@ -1 +1 @@')).toBe('header');
        expect(diffTone('--- a/x')).toBe('header');
        expect(diffTone('+++ b/x')).toBe('header');
        expect(diffTone('+added')).toBe('added');
        expect(diffTone('-removed')).toBe('removed');
        expect(diffTone(' context')).toBe('context');
    });
});

describe('renderCodeDiff', () => {
    it('renders the file header with its counts and the patch lines', () => {
        const container = document.createElement('div');

        renderCodeDiff(container, DIFFS);

        const files = container.querySelectorAll('[data-slot="code-diff-file"]');
        expect(files).toHaveLength(2);
        expect(files[0]!.querySelector('[data-slot="code-diff-path"]')?.textContent).toBe('src/file.ts');
        expect(files[0]!.querySelector('[data-slot="code-diff-additions"]')?.textContent).toBe('+1');
        expect(files[0]!.querySelector('[data-slot="code-diff-deletions"]')?.textContent).toBe('-1');
        expect(files[0]!.querySelectorAll('[data-slot="code-diff-line"]')).toHaveLength(6);
    });

    it('writes the patch as text, never as markup', () => {
        const container = document.createElement('div');

        renderCodeDiff(container, [
            { file: '<img src=x onerror=alert(1)>', patch: '+<script>alert(1)</script>', additions: 1, deletions: 0, status: 'added' },
        ]);

        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain('<script>alert(1)</script>');
    });

    it('tones the lines through the host class', () => {
        const container = document.createElement('div');

        renderCodeDiff(container, [DIFFS[0]!], { toneClass: (tone) => `tone-${tone}` });

        const tones = [...container.querySelectorAll('[data-slot="code-diff-line"]')].map(
            (line) => line.getAttribute('class'),
        );

        expect(tones).toEqual(['tone-header', 'tone-header', 'tone-header', 'tone-context', 'tone-removed', 'tone-added']);
    });

    it('reports the activated file', () => {
        const container = document.createElement('div');
        const picked: string[] = [];

        renderCodeDiff(container, DIFFS, { onSelect: (diff) => picked.push(diff.file) });
        container.querySelectorAll('[data-slot="code-diff-header"]')[1]!.dispatchEvent(new Event('click'));

        expect(picked).toEqual(['src/other.ts']);
    });
});
