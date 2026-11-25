// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mountComposer } from '../src/composer';

const field = (): HTMLTextAreaElement => {
    const element = document.createElement('textarea');
    document.body.append(element);
    return element;
};

describe('mountComposer', () => {
    it('submits on Enter, inserts a newline on Shift+Enter and keeps history', () => {
        const element = field();
        const onSubmit = vi.fn();
        const composer = mountComposer(element, { onSubmit });
        element.value = 'first question';
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(onSubmit).toHaveBeenCalledWith('first question');

        composer.clear();
        element.value = 'line one';
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
        expect(element.value).toBe('line one');
        element.value = 'second question';
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(onSubmit).toHaveBeenCalledTimes(2);

        composer.clear();
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(element.value).toBe('second question');
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(element.value).toBe('first question');
        composer.destroy();
        element.remove();
    });

    it('stops listening after destroy', () => {
        const element = field();
        const onSubmit = vi.fn();
        const composer = mountComposer(element, { onSubmit });
        composer.destroy();
        element.value = 'ignored';
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(onSubmit).not.toHaveBeenCalled();
        element.remove();
    });
});
