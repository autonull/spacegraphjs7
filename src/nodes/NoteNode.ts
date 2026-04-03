import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { DOMNode } from './DOMNode';

/**
 * NoteNode — Sticky-note style editable text node.
 *
 * data options:
 *   color      : CSS background color (default '#fef08a')
 *   text       : note body text
 *   width      : pixel width  (default 200)
 *   height     : pixel height (default 160)
 *   editable   : boolean — whether text is directly editable (default true)
 */
export class NoteNode extends DOMNode {
    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const color = (spec.data?.color ?? '#fef08a') as string;
        const w = (spec.data?.width ?? 200) as number;
        const h = (spec.data?.height ?? 160) as number;

        const div = DOMUtils.createElement('div');
        super(sg, spec, div, w, h, { visible: false });

        const text = (spec.data?.text ?? spec.label ?? '') as string;
        const editable = spec.data?.editable !== false;

        this.domElement.className = 'sg-note-node';

        this.setupContainerStyles(w, h, 'light', {
            backgroundColor: color,
            borderRadius: '4px',
            boxShadow: '2px 4px 12px rgba(0,0,0,0.25)',
            padding: '10px',
            userSelect: 'text',
            cursor: editable ? 'text' : 'default',
        });

        const titleEl = DOMUtils.createElement('div', {
            className: 'sg-note-title sg-node-title',
            textContent: spec.label ?? 'Note',
            style: {
                fontWeight: 'bold',
                marginBottom: '6px',
                fontSize: '13px',
                color: '#555',
            },
        });

        const bodyEl = DOMUtils.createElement('div', {
            className: 'sg-note-body',
            textContent: text,
            style: {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            },
        });

        if (editable) {
            bodyEl.contentEditable = 'true';
            bodyEl.style.outline = 'none';
        }

        this.domElement.appendChild(titleEl);
        this.domElement.appendChild(bodyEl);
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.label !== undefined) {
            const el = this.domElement.querySelector('.sg-note-title');
            if (el) el.textContent = updates.label ?? '';
        }
        if (updates.data?.text !== undefined) {
            const el = this.domElement.querySelector('.sg-note-body');
            if (el) el.textContent = updates.data.text as string;
        }
        if (updates.data?.color) {
            this.domElement.style.background = updates.data.color as string;
        }
        return this;
    }

    /** Programmatically read the current note body text (may have been edited inline). */
    getText(): string {
        return (this.domElement.querySelector('.sg-note-body') as HTMLElement)?.innerText ?? '';
    }
}
