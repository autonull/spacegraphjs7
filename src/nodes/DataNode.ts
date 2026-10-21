import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

import { BaseContentNode } from './BaseContentNode';
import { paletteOf } from './palette';

/**
 * DataNode — Displays arbitrary JSON/objects as a structured, interactive view.
 *
 * data options:
 *   data      : unknown — the JSON payload to render
 *   expanded  : boolean — auto-expand top level (default true)
 *   width     : pixel width  (default 250)
 *   maxHeight : max pixel height before scrolling (default 300)
 *   theme     : 'dark' | 'light' (default 'dark')
 */
export class DataNode extends BaseContentNode {
  static readonly typeName: string = 'DataNode';
  readonly contentContainer!: HTMLElement;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    const maxH = (spec.data?.maxHeight as number) ?? 300;
    const theme = (spec.data?.theme as string) ?? 'dark';

    super(sg, spec, {
      defaultWidth: 250,
      defaultHeight: maxH,
      defaultTheme: theme as 'dark' | 'light',
      materialParams: { opacity: 0.1 },
      className: `spacegraph-data-node theme-${theme}`,
      customStyles: {
        height: 'auto',
        maxHeight: `${maxH}px`,
        fontFamily: 'monospace, "Courier New", Courier',
        fontSize: '12px',
      },
      createTitleBar: spec.label ?? 'JSON Data',
    });

    this.contentContainer = DOMUtils.createElement('div', {
      style: {
        padding: '8px 12px',
        overflowY: 'auto',
        flexGrow: '1',
        scrollbarWidth: 'thin',
        scrollbarColor: paletteOf(theme).scrollbar,
      },
    });

    this.domElement.appendChild(this.contentContainer);
    this._renderData(spec.data?.data ?? spec.data?.fields, spec.data?.expanded !== false, theme);
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);

    if (updates.label !== undefined && this.titleElement) {
      this.titleElement.textContent = updates.label;
    }

    if (updates.data) {
      const theme = (updates.data.theme as string) ?? (this.data?.theme as string) ?? 'dark';

      if (updates.data.width || updates.data.maxHeight) {
        const w = this.dimension(updates, 'width', 250);
        const h = this.dimension(updates, 'maxHeight', 300);
        this.domElement.style.width = `${w}px`;
        this.domElement.style.maxHeight = `${h}px`;
        this.updateBackingGeometry(w, h);
      }

      if (updates.data.data !== undefined || updates.data.fields !== undefined) {
        const payload = updates.data.data ?? updates.data.fields;
        this._renderData(payload, updates.data.expanded !== false, theme);
      }
    }

    return this;
  }

  private _renderData(data: unknown, expandTopLevel: boolean, theme: string) {
    this.contentContainer.innerHTML = '';
    if (data === undefined || data === null) {
      const empty = DOMUtils.createElement('div');
      empty.style.color = paletteOf(theme).faintText;
      empty.style.fontStyle = 'italic';
      empty.textContent = 'null';
      this.contentContainer.appendChild(empty);
      return;
    }

    const tree = this._buildTree(data, theme, 0, expandTopLevel);
    this.contentContainer.appendChild(tree);
  }

  private _buildTree(data: unknown, theme: string, depth: number, expanded: boolean): HTMLElement {
    const container = DOMUtils.createElement('div');
    container.style.paddingLeft = depth > 0 ? '12px' : '0';

    if (typeof data !== 'object' || data === null) {
      const valSpan = DOMUtils.createElement('span');
      valSpan.style.color = this._getColorForType(data, theme);
      valSpan.style.wordBreak = 'break-all';
      valSpan.textContent = typeof data === 'string' ? `"${data}"` : String(data);
      container.appendChild(valSpan);
      return container;
    }

    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const openBracket = isArray ? '[' : '{';
    const closeBracket = isArray ? ']' : '}';

    if (keys.length === 0) {
      const emptySpan = DOMUtils.createElement('span');
      emptySpan.style.color = paletteOf(theme).faintText;
      emptySpan.textContent = `${openBracket}${closeBracket}`;
      container.appendChild(emptySpan);
      return container;
    }

    const toggleWrapper = DOMUtils.createElement('div', {
      style: {
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'baseline',
      },
    });

    const chevron = DOMUtils.createElement('span');
    chevron.textContent = expanded ? '▼' : '▶';
    Object.assign(chevron.style, {
      display: 'inline-block',
      width: '12px',
      fontSize: '9px',
      color: paletteOf(theme).faintText,
      transition: 'transform 0.1s',
    });

    const summary = DOMUtils.createElement('span');
    summary.style.color = paletteOf(theme).mutedText;
    summary.textContent = isArray
      ? `Array(${keys.length}) ${openBracket}`
      : `Object ${openBracket}`;

    toggleWrapper.appendChild(chevron);
    toggleWrapper.appendChild(summary);
    container.appendChild(toggleWrapper);

    const childrenDiv = DOMUtils.createElement('div');
    childrenDiv.style.display = expanded ? 'block' : 'none';

    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const row = DOMUtils.createElement('div');
      row.style.display = 'flex';
      row.style.marginTop = '2px';

      if (!isArray) {
        const keySpan = DOMUtils.createElement('span');
        keySpan.style.color = paletteOf(theme).keyText;
        keySpan.style.marginRight = '6px';
        keySpan.textContent = `"${key}":`;
        row.appendChild(keySpan);
      }

      const valNode = this._buildTree(
        (data as Record<string, unknown>)[key],
        theme,
        depth + 1,
        false
      );
      row.appendChild(valNode);

      if (index < keys.length - 1) {
        const comma = DOMUtils.createElement('span');
        comma.textContent = ',';
        comma.style.color = paletteOf(theme).faintText;
        row.appendChild(comma);
      }

      childrenDiv.appendChild(row);
    }

    const closeSpan = DOMUtils.createElement('div');
    closeSpan.style.color = paletteOf(theme).mutedText;
    closeSpan.style.paddingLeft = depth > 0 ? '12px' : '0';
    closeSpan.textContent = closeBracket;
    childrenDiv.appendChild(closeSpan);

    container.appendChild(childrenDiv);

    toggleWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowExpanded = childrenDiv.style.display === 'none';
      childrenDiv.style.display = isNowExpanded ? 'block' : 'none';
      chevron.textContent = isNowExpanded ? '▼' : '▶';
      toggleWrapper.style.opacity = '0.7';
      setTimeout(() => {
        toggleWrapper.style.opacity = '1';
      }, 100);
    });

    return container;
  }

  private _getColorForType(value: unknown, theme: string): string {
    const palette = paletteOf(theme);
    if (value === null) return palette.mutedText;
    switch (typeof value) {
      case 'string':
        return palette.value.string;
      case 'number':
        return palette.value.number;
      case 'boolean':
        return palette.value.boolean;
      default:
        return palette.value.other;
    }
  }
}
