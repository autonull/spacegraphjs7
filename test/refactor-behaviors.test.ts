import { describe, expect, it } from 'vitest';
import { ErgonomicsAPI } from '../src/core/Ergonomics';
import { ShapeNode } from '../src/nodes/ShapeNode';
import { SelectionManager } from '../src/plugins/interaction/SelectionManager';
import { DOMUtils, isEditableTarget } from '../src/utils/DOMUtils';

const shapeNode = (id: string) =>
    new ShapeNode(undefined, { id, type: 'ShapeNode', data: {} } as never);

describe('Ergonomics visibility and flags', () => {
    it('hides and shows both the Surface flag and the Object3D', () => {
        const shape = shapeNode('a');
        const sg = { graph: { queryEngine: { getNode: () => shape } } } as any;
        const ergo = new ErgonomicsAPI(sg);

        expect(ergo.hide('a')).toBe(shape);
        expect(shape.visible).toBe(false);
        expect(shape.object.visible).toBe(false);

        expect(ergo.toggleVisibility('a')).toBe(true);
        expect(shape.visible).toBe(true);
        expect(shape.object.visible).toBe(true);

        expect(ergo.show('a')).toBe(shape);
    });

    it('returns the node from flag writers so the API stays fluent', () => {
        const shape = shapeNode('a');
        const sg = { graph: { queryEngine: { getNode: () => shape } } } as any;
        const ergo = new ErgonomicsAPI(sg);

        expect(ergo.opacity('a', 0.5)).toBe(shape);
        expect(shape.data.opacity).toBe(0.5);
    });
});

describe('SelectionManager', () => {
    it('reports selected edges from the single selection source', () => {
        const edge = { id: 'e1' };
        const sg = {
            renderer: { renderer: { domElement: document.createElement('div') } },
            selection: { list: ['e1', 'missing'] },
            graph: { edges: new Map([['e1', edge]]) },
        } as any;

        expect([...new SelectionManager(sg).getSelectedEdges()]).toEqual([edge]);
    });
});

describe('isEditableTarget', () => {
    it('covers text inputs, selects and contenteditable controls', () => {
        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');

        expect(isEditableTarget(document.createElement('input'))).toBe(true);
        expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
        expect(isEditableTarget(document.createElement('select'))).toBe(true);
        expect(isEditableTarget(editable)).toBe(true);
        expect(isEditableTarget(document.createElement('div'))).toBe(false);
        expect(isEditableTarget(null)).toBe(false);
    });
});

describe('DOMUtils accessibility options', () => {
    it('applies labels, pressed state and tooltips at creation', () => {
        const button = DOMUtils.createElement('button', {
            textContent: 'View',
            ariaLabel: 'View mode',
            ariaPressed: false,
            role: 'group',
            title: 'View mode',
        });

        expect(button.getAttribute('aria-label')).toBe('View mode');
        expect(button.getAttribute('aria-pressed')).toBe('false');
        expect(button.getAttribute('role')).toBe('group');
        expect(button.title).toBe('View mode');
    });
});
