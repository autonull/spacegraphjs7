import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * DataNode — Displays arbitrary JSON/objects as a structured, interactive view.
 * Now extended from DOMNode to natively handle sizing and interactive backing properly.
 *
 * data options:
 *   data      : any — the JSON payload to render
 *   expanded  : boolean — auto-expand top level (default true)
 *   width     : pixel width  (default 250)
 *   maxHeight : max pixel height before scrolling (default 300)
 *   theme     : 'dark' | 'light' (default 'dark')
 */
export class DataNode extends DOMNode {
    private contentContainer!: HTMLElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 250;
        const maxH = spec.data?.maxHeight ?? 300;
        const theme = spec.data?.theme ?? 'dark';

        const div = document.createElement('div');
        // Initialize DOMNode base. Use fixed height or let DOM size it naturally inside the wrapper.
        // We'll give it a generous height based on maxH since it scrolls.
        super(sg, spec, div, w, maxH, { opacity: 0.1 });

        this.domElement.className = `spacegraph-data-node theme-${theme}`;

        const bgColor = theme === 'dark' ? '#1e293b' : '#f8fafc';
        const borderColor = theme === 'dark' ? '#334155' : '#e2e8f0';
        const headerColor = theme === 'dark' ? '#0f172a' : '#f1f5f9';
        const textColor = theme === 'dark' ? '#e2e8f0' : '#334155';

        Object.assign(this.domElement.style, {
            width: `${w}px`,
            maxHeight: `${maxH}px`,
            background: bgColor,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontFamily: 'monospace, "Courier New", Courier',
            fontSize: '12px',
            color: textColor,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            border: `1px solid ${borderColor}`
        });

        // Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            background: headerColor,
            padding: '8px 12px',
            fontWeight: '600',
            fontSize: '13px',
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: '0',
            userSelect: 'none'
        });

        const titleSpan = document.createElement('span');
        titleSpan.textContent = spec.label || 'JSON Data';
        header.appendChild(titleSpan);
        this.domElement.appendChild(header);

        // Content Area (Scrollable)
        this.contentContainer = document.createElement('div');
        Object.assign(this.contentContainer.style, {
            padding: '8px 12px',
            overflowY: 'auto',
            flexGrow: '1',
            scrollbarWidth: 'thin',
            scrollbarColor: theme === 'dark' ? '#475569 #1e293b' : '#cbd5e1 #f8fafc'
        });

        this.domElement.appendChild(this.contentContainer);

        this._renderData(spec.data?.data || spec.data?.fields, spec.data?.expanded !== false, theme);
    }

    private _renderData(data: any, expandTopLevel: boolean, theme: string) {
        this.contentContainer.innerHTML = '';
        if (data === undefined || data === null) {
            const empty = document.createElement('div');
            empty.style.color = theme === 'dark' ? '#64748b' : '#94a3b8';
            empty.style.fontStyle = 'italic';
            empty.textContent = 'null';
            this.contentContainer.appendChild(empty);
            return;
        }

        const tree = this._buildTree(data, theme, 0, expandTopLevel);
        this.contentContainer.appendChild(tree);
    }

    private _buildTree(data: any, theme: string, depth: number, expanded: boolean): HTMLElement {
        const container = document.createElement('div');
        container.style.paddingLeft = depth > 0 ? '12px' : '0';

        if (typeof data !== 'object' || data === null) {
            // Primitive value
            const valSpan = document.createElement('span');
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
            const emptySpan = document.createElement('span');
            emptySpan.style.color = theme === 'dark' ? '#64748b' : '#94a3b8';
            emptySpan.textContent = `${openBracket}${closeBracket}`;
            container.appendChild(emptySpan);
            return container;
        }

        // Parent toggle node
        const toggleWrapper = document.createElement('div');
        Object.assign(toggleWrapper.style, {
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'baseline'
        });

        const chevron = document.createElement('span');
        chevron.textContent = expanded ? '▼' : '▶';
        Object.assign(chevron.style, {
            display: 'inline-block',
            width: '12px',
            fontSize: '9px',
            color: theme === 'dark' ? '#64748b' : '#94a3b8',
            transition: 'transform 0.1s'
        });

        const summary = document.createElement('span');
        summary.style.color = theme === 'dark' ? '#94a3b8' : '#64748b';
        summary.textContent = isArray ? `Array(${keys.length}) ${openBracket}` : `Object ${openBracket}`;

        toggleWrapper.appendChild(chevron);
        toggleWrapper.appendChild(summary);
        container.appendChild(toggleWrapper);

        // Children container
        const childrenDiv = document.createElement('div');
        childrenDiv.style.display = expanded ? 'block' : 'none';

        keys.forEach((key, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.marginTop = '2px';

            // Key
            if (!isArray) {
                const keySpan = document.createElement('span');
                keySpan.style.color = theme === 'dark' ? '#7dd3fc' : '#0284c7';
                keySpan.style.marginRight = '6px';
                keySpan.textContent = `"${key}":`;
                row.appendChild(keySpan);
            }

            // Value
            const valNode = this._buildTree(data[key], theme, depth + 1, false);
            row.appendChild(valNode);

            if (index < keys.length - 1) {
                 const comma = document.createElement('span');
                 comma.textContent = ',';
                 comma.style.color = theme === 'dark' ? '#64748b' : '#94a3b8';
                 row.appendChild(comma);
            }

            childrenDiv.appendChild(row);
        });

        const closeSpan = document.createElement('div');
        closeSpan.style.color = theme === 'dark' ? '#94a3b8' : '#64748b';
        closeSpan.style.paddingLeft = depth > 0 ? '12px' : '0';
        closeSpan.textContent = closeBracket;
        childrenDiv.appendChild(closeSpan);

        container.appendChild(childrenDiv);

        // Interaction
        toggleWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const isNowExpanded = childrenDiv.style.display === 'none';
            childrenDiv.style.display = isNowExpanded ? 'block' : 'none';
            chevron.textContent = isNowExpanded ? '▼' : '▶';
            // Slight visual feedback
            toggleWrapper.style.opacity = '0.7';
            setTimeout(() => toggleWrapper.style.opacity = '1', 100);
        });

        return container;
    }

    private _getColorForType(value: any, theme: string): string {
        if (value === null) return theme === 'dark' ? '#94a3b8' : '#64748b';
        switch (typeof value) {
            case 'string': return theme === 'dark' ? '#a3e635' : '#16a34a';
            case 'number': return theme === 'dark' ? '#fbbf24' : '#d97706';
            case 'boolean': return theme === 'dark' ? '#f472b6' : '#db2777';
            default: return theme === 'dark' ? '#e2e8f0' : '#334155';
        }
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);

        if (updates.label !== undefined) {
             const titleSpan = this.domElement.querySelector('.sg-data-header span');
             if (titleSpan) titleSpan.textContent = updates.label;
        }

        if (updates.data) {
            const theme = updates.data.theme || this.data?.theme || 'dark';

            if (updates.data.width || updates.data.maxHeight) {
                const w = updates.data.width || this.data?.width || 250;
                const h = updates.data.maxHeight || this.data?.maxHeight || 300;
                this.domElement.style.width = `${w}px`;
                this.domElement.style.maxHeight = `${h}px`;
                this.updateBackingGeometry(w, h);
            }

            if (updates.data.data !== undefined || updates.data.fields !== undefined) {
                 const payload = updates.data.data !== undefined ? updates.data.data : updates.data.fields;
                 this._renderData(payload, updates.data.expanded !== false, theme);
            }
        }
    }
}
