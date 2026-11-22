import { describe, expect, test } from 'vitest';
import { stateFrameMarkup } from '../src/shell/frames';

describe('shell state frames', () => {
    test.each(['empty', 'pending', 'failed'] as const)('%s has a titled, legible frame', (state) => {
        const markup = stateFrameMarkup(state);
        expect(markup).toContain('role="status"');
        expect(markup).toContain('<strong>');
        expect(markup).toContain('</strong><span>');
    });

    test('a supplied detail replaces the default copy and is escaped', () => {
        const markup = stateFrameMarkup('failed', '<img src=x>');
        expect(markup).toContain('&lt;img');
        expect(markup).not.toContain('<img');
    });
});
