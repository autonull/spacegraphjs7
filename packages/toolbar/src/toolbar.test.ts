import { render } from 'solid-js/web';
import { describe, it, expect } from 'vitest';
import { createIconRenderer } from '@spacegraphjs/shared/icons';
import { passthroughI18n } from '@spacegraphjs/shared/i18n';
import { createPopoverRenderer } from '@spacegraphjs/shared/popover';
import { useToolbarState } from '@spacegraphjs/toolbar/hooks';
import { GraphTimeControl } from './GraphTimeControl';

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
});

describe('shared popover', () => {
    it('creates a popover renderer', () => {
        const Popover = createPopoverRenderer();
        expect(Popover).toBeDefined();
    });
});

describe('GraphTimeControl', () => {
    it('opens the facets menu in response to a graph command', () => {
        const host = document.createElement('div');
        const menu = document.createElement('details');
        menu.dataset.slot = 'graph-toolbar-facets';
        document.body.append(host, menu);
        const dispose = render(
            () =>
                GraphTimeControl({
                    i18n: passthroughI18n,
                    onCheckpoint: () => {},
                    turnCount: 3,
                    checkpoint: 0,
                    model: { nodes: [], edges: [], turns: [] },
                }),
            host,
        );
        window.dispatchEvent(new CustomEvent('graph:command', { detail: { name: 'facets' } }));
        expect(menu.open).toBe(true);
        dispose();
        host.remove();
        menu.remove();
    });
});

describe('toolbar hooks', () => {
    it('creates toolbar state', () => {
        const state = useToolbarState();
        expect(state.level).toBeDefined();
        expect(state.setLevel).toBeDefined();
        expect(state.facets).toBeDefined();
        expect(state.setFacets).toBeDefined();
    });

    it('accepts initial values', () => {
        const state = useToolbarState({
            level: 'overview',
            files: true,
        });
        expect(state.level()).toBe('overview');
        expect(state.files()).toBe(true);
    });
});
