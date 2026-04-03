import loader from '@monaco-editor/loader';

import { DOMUtils } from '../utils/DOMUtils';
import { createLogger } from '../utils/logger';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { DOMNode } from './DOMNode';

const logger = createLogger('CodeEditorNode');

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
    private editorInstance: unknown = null;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = (spec.data?.width as number) ?? 600;
        const h = (spec.data?.height as number) ?? 400;

        const div = DOMUtils.createElement('div');
        super(sg, spec, div, w, h, { visible: false });

        this.domElement.className = 'spacegraph-code-editor-node';
        const isLight = (spec.data?.theme as string) === 'vs';

        this.setupContainerStyles(w, h, isLight ? 'light' : 'dark', {
            backgroundColor: isLight ? '#fffffe' : '#1e1e1e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
        });

        const titleBar = this.createTitleBar(
            spec.label ?? (spec.data?.language as string) ?? 'Code Editor',
            isLight ? 'light' : 'dark',
        );
        titleBar.style.backgroundColor = isLight ? '#f3f3f3' : '#2d2d2d';
        titleBar.style.color = isLight ? '#333' : '#ccc';
        this.domElement.appendChild(titleBar);

        this.editorContainer = DOMUtils.createElement('div');
        Object.assign(this.editorContainer.style, {
            flexGrow: '1',
            width: '100%',
            height: '100%',
            position: 'relative',
        });
        this.domElement.appendChild(this.editorContainer);

        this.initEditor(spec);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private initEditor(spec: NodeSpec) {
        loader
            .init()
            .then((monaco) => {
                this.editorInstance = monaco.editor.create(this.editorContainer, {
                    value: (spec.data?.code as string) ?? '// Write code here...',
                    language: (spec.data?.language as string) ?? 'typescript',
                    theme: (spec.data?.theme as string) ?? 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                });

                (
                    this.editorInstance as {
                        onDidChangeModelContent: (cb: () => void) => void;
                        getValue: () => string;
                    }
                ).onDidChangeModelContent(() => {
                    this.data.code = (this.editorInstance as { getValue: () => string }).getValue();
                });
            })
            .catch((err) => {
                logger.error('Failed to load Monaco editor:', err);
                this.editorContainer.textContent = 'Failed to load editor.';
                this.editorContainer.style.color = 'red';
                this.editorContainer.style.padding = '20px';
            });
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.data) {
            if (updates.data.width || updates.data.height) {
                const w = (updates.data.width as number) ?? (this.data?.width as number) ?? 600;
                const h = (updates.data.height as number) ?? (this.data?.height as number) ?? 400;
                this.domElement.style.width = `${w}px`;
                this.domElement.style.height = `${h}px`;
                this.updateBackingGeometry(w, h);
                if (this.editorInstance) {
                    (this.editorInstance as { layout: () => void }).layout();
                }
            }
            if (
                updates.data.code !== undefined &&
                this.editorInstance &&
                updates.data.code !== (this.editorInstance as { getValue: () => string }).getValue()
            ) {
                (this.editorInstance as { setValue: (v: string) => void }).setValue(
                    updates.data.code as string,
                );
            }
            if (updates.data.language !== undefined && this.editorInstance) {
                const lang = updates.data.language;
                loader.init().then((monaco) => {
                    monaco.editor.setModelLanguage(
                        (
                            this.editorInstance as { getModel: () => unknown }
                        ).getModel() as Parameters<typeof monaco.editor.setModelLanguage>[0],
                        lang as string,
                    );
                });
            }
        }

        if (updates.label !== undefined) {
            const titleSpan = this.domElement.querySelector('.sg-node-title');
            if (titleSpan) titleSpan.textContent = updates.label;
        }

        return this;
    }

    dispose(): void {
        (this.editorInstance as { dispose?: () => void })?.dispose?.();
        super.dispose();
    }
}
