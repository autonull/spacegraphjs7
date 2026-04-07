import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { BaseContentNode } from './BaseContentNode';

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
    private contentContainer!: HTMLElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
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
                scrollbarColor: theme === 'dark' ? '#475569 #1e293b' : '#cbd5e1 #f8fafc',
            },
        });

        this.domElement.appendChild(this.contentContainer);
        this._renderData(
            spec.data?.data ?? spec.data?.fields,
            spec.data?.expanded !== false,
            theme,
        );
    }

    private _renderData(data: unknown, expandTopLevel: boolean, theme: string) {
        this.contentContainer.innerHTML = '';
        if (data === undefined || data === null) {
            const empty = DOMUtils.createElement('div');
            empty.style.color = theme === 'dark' ? '#64748b' : '#94a3b8';
            empty.style.fontStyle = 'italic';
            empty.textContent = 'null';
            this.contentContainer.appendChild(empty);
            return;
        }

        const tree = this._buildTree(data, theme, 0, expandTopLevel);
        this.contentContainer.appendChild(tree);
    }

    private _buildTree(
        data: unknown,
        theme: string,
        depth: number,
        expanded: boolean,
    ): HTMLElement {
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
            emptySpan.style.color = theme === 'dark' ? '#64748b' : '#94a3b8';
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
            color: theme === 'dark' ? '#64748b' : '#94a3b8',
            transition: 'transform 0.1s',
        });

        const summary = DOMUtils.createElement('span');
        summary.style.color = theme === 'dark' ? '#94a3b8' : '#64748b';
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
                keySpan.style.color = theme === 'dark' ? '#7dd3fc' : '#0284c7';
                keySpan.style.marginRight = '6px';
                keySpan.textContent = `"${key}":`;
                row.appendChild(keySpan);
            }

            const valNode = this._buildTree(
                (data as Record<string, unknown>)[key],
                theme,
                depth + 1,
                false,
            );
            row.appendChild(valNode);

            if (index < keys.length - 1) {
                const comma = DOMUtils.createElement('span');
                comma.textContent = ',';
                comma.style.color = theme === 'dark' ? '#64748b' : '#94a3b8';
                row.appendChild(comma);
            }

            childrenDiv.appendChild(row);
        }

        const closeSpan = DOMUtils.createElement('div');
        closeSpan.style.color = theme === 'dark' ? '#94a3b8' : '#64748b';
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
        if (value === null) return theme === 'dark' ? '#94a3b8' : '#64748b';
        switch (typeof value) {
            case 'string':
                return theme === 'dark' ? '#a3e635' : '#16a34a';
            case 'number':
                return theme === 'dark' ? '#fbbf24' : '#d97706';
            case 'boolean':
                return theme === 'dark' ? '#f472b6' : '#db2777';
            default:
                return theme === 'dark' ? '#e2e8f0' : '#334155';
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.label !== undefined) {
            const titleSpan = this.domElement.querySelector('.sg-node-title');
            if (titleSpan) titleSpan.textContent = updates.label;
        }

        if (updates.data) {
            const theme = (updates.data.theme as string) ?? (this.data?.theme as string) ?? 'dark';

            if (updates.data.width || updates.data.maxHeight) {
                const w = (updates.data.width as number) ?? (this.data?.width as number) ?? 250;
                const h =
                    (updates.data.maxHeight as number) ?? (this.data?.maxHeight as number) ?? 300;
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
}
