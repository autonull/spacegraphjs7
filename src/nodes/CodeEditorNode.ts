import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import loader from '@monaco-editor/loader';

/**
 * CodeEditorNode — Embeds a full Monaco editor into the ZUI.
 *
 * data options:
 *   code     : string — initial code to display
 *   language : string — language for syntax highlighting (default 'typescript')
 *   theme    : string — 'vs-dark' or 'vs' (default 'vs-dark')
 *   width    : pixel width  (default 600)
 *   height   : pixel height (default 400)
 */
export class CodeEditorNode extends DOMNode {
    private editorContainer: HTMLDivElement;
    private editorInstance: any = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 600;
        const h = spec.data?.height ?? 400;

        const div = document.createElement('div');
        super(sg, spec, div, w, h, { visible: false });

        this.domElement.className = 'spacegraph-code-editor-node';
        Object.assign(this.domElement.style, {
            width: `${w}px`,
            height: `${h}px`,
            backgroundColor: spec.data?.theme === 'vs' ? '#fffffe' : '#1e1e1e',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        });

        // Optional title bar
        const titleBar = document.createElement('div');
        Object.assign(titleBar.style, {
            height: '30px',
            backgroundColor: spec.data?.theme === 'vs' ? '#f3f3f3' : '#2d2d2d',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            color: spec.data?.theme === 'vs' ? '#333' : '#ccc',
            flexShrink: '0',
            userSelect: 'none'
        });
        titleBar.textContent = spec.label || spec.data?.language || 'Code Editor';
        this.domElement.appendChild(titleBar);

        this.editorContainer = document.createElement('div');
        Object.assign(this.editorContainer.style, {
            flexGrow: '1',
            width: '100%',
            height: '100%',
            position: 'relative'
        });
        this.domElement.appendChild(this.editorContainer);

        this.initEditor(spec);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private initEditor(spec: NodeSpec) {
        loader.init().then(monaco => {
            this.editorInstance = monaco.editor.create(this.editorContainer, {
                value: spec.data?.code || '// Write some code here...',
                language: spec.data?.language || 'typescript',
                theme: spec.data?.theme || 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14
            });

            this.editorInstance.onDidChangeModelContent(() => {
                this.data.code = this.editorInstance.getValue();
            });
        }).catch(err => {
            console.error('[CodeEditorNode] Failed to load Monaco editor', err);
            this.editorContainer.textContent = 'Failed to load editor.';
            this.editorContainer.style.color = 'red';
            this.editorContainer.style.padding = '20px';
        });
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);

        if (updates.data) {
            if (updates.data.width || updates.data.height) {
                const w = updates.data.width || this.data?.width || 600;
                const h = updates.data.height || this.data?.height || 400;
                this.domElement.style.width = `${w}px`;
                this.domElement.style.height = `${h}px`;
                this.updateBackingGeometry(w, h);
                if (this.editorInstance) {
                    this.editorInstance.layout();
                }
            }
            if (updates.data.code !== undefined && this.editorInstance && updates.data.code !== this.editorInstance.getValue()) {
                this.editorInstance.setValue(updates.data.code);
            }
            if (updates.data.language !== undefined && this.editorInstance) {
                loader.init().then(monaco => {
                    monaco.editor.setModelLanguage(this.editorInstance.getModel(), updates.data!.language!);
                });
            }
        }

        if (updates.label !== undefined) {
            const titleBar = this.domElement.firstChild as HTMLElement;
            if (titleBar) titleBar.textContent = updates.label;
        }
    }

    dispose(): void {
        if (this.editorInstance) {
            this.editorInstance.dispose();
        }
        super.dispose();
    }
}
