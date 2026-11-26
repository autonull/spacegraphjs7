import { describe, it, expect } from 'vitest';
import type { GraphFacets } from './types';
import { facetCount, mergeFacets, toggleFacet } from './facets';
import { noopI18n, passthroughI18n } from './i18n';
import { createIconRenderer } from '@spacegraphjs/shared/icons';
import { createPopoverRenderer } from '@spacegraphjs/shared/popover';
import { cx, styleVar, generateId, fixedSize, absolutePosition } from '@spacegraphjs/shared/css';
import { useToggle, useDebounce, useLocalStorage, useControlledValue } from '@spacegraphjs/shared/hooks';

describe('i18n fallbacks', () => {
    it('passes keys through without a plural suffix', () => {
        expect(passthroughI18n.t('ui.label')).toBe('ui.label');
        expect(passthroughI18n.plural('ui.item', 3)).toBe('ui.item');
        expect(noopI18n.plural('ui.item', 3)).toBe('ui.itemPlural');
    });

    it('interpolates placeholders but leaves keys intact', () => {
        expect(passthroughI18n.t('ui.label', { name: 'Ada' })).toBe('ui.label');
        expect(passthroughI18n.plural('{count} items', 3, { count: 3 })).toBe('3 items');
    });
});

describe('shared icons', () => {
    it('creates an icon renderer', () => {
        const renderIcon = createIconRenderer();
        const icon = renderIcon({ name: 'outline-eye', size: 'small' });
        expect(icon).toBeDefined();
    });

    it('renders unknown icons as placeholder', () => {
        const renderIcon = createIconRenderer();
        const icon = renderIcon({ name: 'unknown-icon', size: 'small' });
        expect(icon).toBeDefined();
    });

    it('sizes fallback icons without changing stroke width', () => {
        const icon = createIconRenderer()({ name: 'outline-eye', size: 'medium' }) as HTMLElement;
        expect(icon.innerHTML).toContain('width="20"');
        expect(icon.innerHTML).toContain('height="20"');
        expect(icon.innerHTML).toContain('stroke-width="2"');
    });
});

describe('shared popover', () => {
    it('creates a popover renderer', () => {
        const Popover = createPopoverRenderer();
        expect(Popover).toBeDefined();
    });
});

describe('shared css utilities', () => {
    it('concatenates class names', () => {
        expect(cx('a', 'b')).toBe('a b');
        expect(cx('a', false)).toBe('a');
        expect(cx({ a: true, b: false })).toBe('a');
    });

    it('creates CSS variable references', () => {
        expect(styleVar('color-primary')).toBe('var(--color-primary)');
        expect(styleVar('color-primary', 'red')).toBe('var(--color-primary, red)');
    });

    it('generates unique IDs', () => {
        const id1 = generateId('test');
        const id2 = generateId('test');
        expect(id1).not.toBe(id2);
        expect(id1.startsWith('test-')).toBe(true);
    });

    it('creates fixed size styles', () => {
        const style = fixedSize(100, 200);
        expect(style.width).toBe('100px');
        expect(style.height).toBe('200px');
    });

    it('creates absolute position styles', () => {
        const style = absolutePosition(10, 20, 30, 40);
        expect(style.top).toBe('10px');
        expect(style.left).toBe('20px');
        expect(style.right).toBe('30px');
        expect(style.bottom).toBe('40px');
    });
});

describe('shared hooks', () => {
    it('creates toggle hook', () => {
        const [value, toggle, setTrue, setFalse] = useToggle(false);
        expect(value()).toBe(false);
        toggle();
        expect(value()).toBe(true);
        setFalse();
        expect(value()).toBe(false);
        setTrue();
        expect(value()).toBe(true);
    });

    it('debounces values', () => {
        const currentValue = 0;
        const debounced = useDebounce(() => currentValue, 50);
        expect(typeof debounced).toBe('function');
        expect(debounced()).toBe(0);
    });

    it('reads and writes localStorage values', () => {
        const key = 'test-key-shared-' + Date.now();
        localStorage.setItem(key, JSON.stringify('stored'));
        const [value, setValue] = useLocalStorage(key, 'default');
        expect(value()).toBe('stored');
        setValue('next');
        expect(value()).toBe('next');
        expect(localStorage.getItem(key)).toBe(JSON.stringify('next'));
        localStorage.removeItem(key);
    });

    it('reads the latest uncontrolled value from the accessor', () => {
        const [value, setValue] = useControlledValue<number>(undefined, undefined, 1);
        expect(value()).toBe(1);
        setValue(5);
        expect(value()).toBe(5);
        setValue((previous) => previous + 1);
        expect(value()).toBe(6);
    });
});

describe('facet editing helpers', () => {
    const facets: GraphFacets = {
        query: '',
        kinds: new Set(['tool']),
        statuses: new Set(),
        domains: new Set(['session']),
        failedTools: true,
        composeMode: 'and',
    };

    it('preserves untouched filters when merging', () => {
        expect(mergeFacets(facets, { query: 'auth' })).toEqual({ ...facets, query: 'auth' });
    });

    it('toggles values while keeping locked ones', () => {
        expect([...toggleFacet(new Set(['session', 'code']), 'code')]).toEqual(['session']);
        expect([...toggleFacet(new Set(['session']), 'session', 'session')]).toEqual(['session']);
        expect([...toggleFacet(new Set(['session']), 'code')]).toEqual(['session', 'code']);
    });

    it('finds display counts by value', () => {
        const counts = [{ value: 'tool', kept: 2, total: 5 }];
        expect(facetCount('tool', counts)).toEqual({ value: 'tool', kept: 2, total: 5 });
        expect(facetCount('note', counts)).toBeUndefined();
    });
});
