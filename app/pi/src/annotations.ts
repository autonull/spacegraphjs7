import type { RenderModel, RenderNode } from '@spacegraphjs/renderer';
import {
    WidgetLayer,
    WidgetRegistry,
    type WidgetDescriptor,
    type WidgetHandle,
} from 'spacegraphjs/widgets';

export type PinnedNote = {
    readonly id: string;
    readonly target: string;
    readonly body: string;
};

export class NoteStore {
    readonly #notes = new Map<string, PinnedNote>();

    constructor(initial: readonly PinnedNote[] = []) {
        this.replaceAll(initial);
    }

    get list(): readonly PinnedNote[] {
        return [...this.#notes.values()];
    }

    add(target: string, body: string): PinnedNote {
        const note = { id: `note:${target}:${this.#notes.size + 1}`, target, body };
        this.#notes.set(note.id, note);
        return note;
    }

    remove(id: string): boolean {
        return this.#notes.delete(id);
    }

    replaceAll(notes: readonly PinnedNote[]): void {
        this.#notes.clear();
        for (const note of notes) this.#notes.set(note.id, note);
    }

    forTarget(target: string): readonly PinnedNote[] {
        return this.list.filter((note) => note.target === target);
    }
}

/** Pinned notes travel on `RenderNode.data`; the widget layer only decides how they are shown. */
export const withPinnedNotes = (model: RenderModel, notes: readonly PinnedNote[]): RenderModel => {
    if (!notes.length) return model;
    const byTarget = new Map<string, PinnedNote[]>();
    for (const note of notes) {
        byTarget.set(note.target, [...(byTarget.get(note.target) ?? []), note]);
    }
    return {
        ...model,
        nodes: model.nodes.map((node) => {
            const pinned = byTarget.get(node.id);
            if (!pinned) return node;
            return {
                ...node,
                widgets: [...(node.widgets ?? []), 'annotation'],
                data: { ...node.data, annotations: pinned },
            };
        }),
    };
};

export type AnnotationWidgets = {
    readonly layer: WidgetLayer;
    /** Mount what is new and refresh notes on widgets that were already mounted. */
    refresh(nodes: readonly RenderNode[]): void;
};

/** Host-owned widget: a row of reviewer notes in the rail, mounted only while its node is visible. */
export const createAnnotationWidgets = (
    container: HTMLElement,
    onRemove: (id: string) => void,
): AnnotationWidgets => {
    const descriptor: WidgetDescriptor = {
        id: 'annotation',
        label: 'Reviewer note',
        slots: ['pinned'],
        mount: ({ node }): WidgetHandle => {
            const element = document.createElement('div');
            element.className = 'annotation-chip';
            element.dataset.annotationFor = node.id;
            const render = (current: RenderNode): void => {
                const notes = (current.data?.annotations ?? []) as readonly PinnedNote[];
                element.replaceChildren(
                    ...notes.map((note) => {
                        const row = document.createElement('div');
                        row.className = 'annotation-row';
                        const text = document.createElement('span');
                        text.textContent = note.body;
                        const remove = document.createElement('button');
                        remove.type = 'button';
                        remove.textContent = '×';
                        remove.setAttribute('aria-label', `Remove note ${note.id}`);
                        remove.addEventListener('click', () => onRemove(note.id));
                        row.append(text, remove);
                        return row;
                    }),
                );
            };
            render(node);
            container.append(element);
            return {
                element,
                measure: () => ({ width: 180, height: 26 }),
                update: (context) => render(context.node),
                unmount: () => element.remove(),
            };
        },
    };
    const registry = new WidgetRegistry().register(descriptor);
    const layer = new WidgetLayer({
        registry,
        slots: ['pinned'],
        representationOf: () => 'detail',
    });
    return {
        layer,
        refresh(nodes) {
            layer.sync(nodes);
            const byID = new Map(nodes.map((node) => [node.id, node]));
            for (const mounted of layer.mounted()) {
                const node = byID.get(mounted.nodeId);
                if (node) mounted.handle.update?.({ node, slot: mounted.slot });
            }
        },
    };
};
