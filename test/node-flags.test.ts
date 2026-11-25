// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ShapeNode } from 'spacegraphjs/nodes';

const node = (data: Record<string, unknown> = {}) =>
    new ShapeNode(undefined, { id: 'a', type: 'ShapeNode', data } as never);

describe('node visibility wrappers', () => {
    it('show, hide and the toggles change only the Surface flag', () => {
        const n = node();
        expect(n.visible).toBe(true);
        n.hide();
        expect(n.visible).toBe(false);
        n.show();
        expect(n.visible).toBe(true);
        n.toggleVisible();
        expect(n.visible).toBe(false);
        n.toggleVisible();
        expect(n.visible).toBe(true);
    });

    it('setVisible mirrors the Object3D and setHighlight drives the control state', () => {
        const n = node();
        n.setVisible(false);
        expect(n.visible).toBe(false);
        expect(n.object.visible).toBe(false);
        n.setVisible(true);
        expect(n.visible).toBe(true);
        expect(n.object.visible).toBe(true);
        n.setHighlight();
        expect(n.controlState).toBe('selected');
        n.setHighlight(false);
        expect(n.controlState).toBe('normal');
    });

    it('enable and disable also mirror the flag onto the Object3D', () => {
        const n = node();
        n.disable();
        expect(n.visible).toBe(false);
        expect(n.object.visible).toBe(false);
        n.enable();
        expect(n.visible).toBe(true);
        expect(n.object.visible).toBe(true);
    });
});

describe('node data flags', () => {
    it('defaults fixed and pinned off, selectable and draggable on', () => {
        const n = node();
        expect(n.isFixed()).toBe(false);
        expect(n.isPinned()).toBe(false);
        expect(n.isSelectable()).toBe(true);
        expect(n.isDraggable()).toBe(true);
    });

    it('setters flip each flag independently', () => {
        const n = node();
        n.setFixed().setPinned().setSelectable(false).setDraggable(false);
        expect(n.isFixed()).toBe(true);
        expect(n.isPinned()).toBe(true);
        expect(n.isSelectable()).toBe(false);
        expect(n.isDraggable()).toBe(false);
    });

    it('keeps strict equality for opt-in flags', () => {
        const n = node({ fixed: 1, pinned: 'yes' });
        expect(n.isFixed()).toBe(false);
        expect(n.isPinned()).toBe(false);
    });
});
