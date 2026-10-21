import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

import { BaseContentNode } from './BaseContentNode';

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
export class NoteNode extends BaseContentNode {
  static typeName: string = 'NoteNode';
  private bodyElement: HTMLElement | null = null;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    const color = (spec.data?.color ?? '#fef08a') as string;

    super(sg, spec, {
      defaultWidth: 200,
      defaultHeight: 160,
      defaultTheme: 'light',
      materialParams: { visible: false },
      className: 'sg-note-node',
      customStyles: {
        backgroundColor: color,
        borderRadius: '4px',
        boxShadow: '2px 4px 12px rgba(0,0,0,0.25)',
        padding: '10px',
        userSelect: 'text',
        cursor: spec.data?.editable !== false ? 'text' : 'default',
      },
    });

    const text = (spec.data?.text ?? spec.label ?? '') as string;
    const editable = spec.data?.editable !== false;

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
    this.titleElement = titleEl;
    this.bodyElement = bodyEl;
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);
    this.syncTitleLabel(updates);
    if (updates.data?.text !== undefined && this.bodyElement) {
      this.bodyElement.textContent = updates.data.text as string;
    }
    if (updates.data?.color) {
      this.domElement.style.background = updates.data.color as string;
    }
    return this;
  }

  /** Programmatically read the current note body text (may have been edited inline). */
  getText(): string {
    return this.bodyElement?.innerText ?? '';
  }
}
