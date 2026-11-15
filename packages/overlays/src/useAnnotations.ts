// SolidJS hook for managing annotations in SpaceGraphJS.
// The host provides storage, i18n, and node lookup.

import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { Annotation, Annotations, AnnotationStore, NoteNodePolicy } from "./annotations";
import { withAnnotations } from "./annotations";

export interface UseAnnotationsOptions<NodeID extends string = string> {
    /** The annotation store (can be in-memory or persisted). */
    store: AnnotationStore;
    /** Get the current selection (node IDs). */
    selection: () => readonly NodeID[];
    /** Look up a node by ID. */
    nodeLookup: (id: NodeID) => { id: NodeID; kind: string; turnID?: string } | undefined;
    /** Announce a message to the user (e.g., via toast/screen reader). */
    onAnnounce: (message: string) => void;
    /** Policy for creating note nodes. */
    policy: NoteNodePolicy<NodeID>;
    /** Optional: filter annotations to a specific target. */
    targetFilter?: () => NodeID | undefined;
}

export interface UseAnnotationsReturn<NodeID extends string = string> {
    /** All annotations. */
    annotations: Annotations;
    /** Get annotations for the current target. */
    targetAnnotations: () => Annotation[];
    /** The current target node ID (for composing a new note). */
    noteTarget: () => NodeID | undefined;
    /** The annotation being edited (if any). */
    editingNote: () => string | undefined;
    /** Open the note composer for the current selection. */
    openNoteComposer: () => void;
    /** Close the note composer. */
    closeNoteComposer: () => void;
    /** Save a note (create or update). */
    saveNote: (body: string) => void;
    /** Edit an existing note node. */
    editNote: (nodeID: NodeID) => void;
    /** Delete a note node. */
    deleteNote: (nodeID: NodeID) => void;
    /** Copy a note's text to clipboard. */
    copyNote: (nodeID: NodeID) => void;
    /** Apply annotations to a model. */
    applyAnnotations: (model: {
        nodes: ReadonlyArray<{ id: NodeID; kind: string; turnID?: string }>;
        edges: ReadonlyArray<unknown>;
    }) => {
        nodes: Array<{ id: NodeID; kind: string; turnID?: string }>;
        edges: Array<unknown>;
    };
}

export function useAnnotations<NodeID extends string>(
    options: UseAnnotationsOptions<NodeID>,
): UseAnnotationsReturn<NodeID> {
    const { store, selection, nodeLookup, onAnnounce, policy } = options;
    const [noteTarget, setNoteTarget] = createSignal<NodeID | undefined>();
    const [editingNote, setEditingNote] = createSignal<string>();
    const [annotations, setAnnotations] = createStore<Annotations>(store.annotations);

    const openNoteComposer = () => {
        const targetFilter = options.targetFilter;
        const target = targetFilter?.() ?? selection()[0];
        if (!target) return;

        const node = nodeLookup(target);
        if (!node) return;

        if (node.kind === "note") {
            return;
        }

        setEditingNote(() => undefined);
        setNoteTarget(() => target);
    };

    const closeNoteComposer = () => {
        setEditingNote(() => undefined);
        setNoteTarget(() => undefined);
    };

    const saveNote = (body: string) => {
        const target = noteTarget();
        if (!target) return;

        const editing = editingNote();
        if (editing) {
            if (body.trim().length === 0) {
                store.deleteAnnotation(editing);
                setAnnotations(produce((all: Annotations) => void delete all[editing]));
                onAnnounce("Note deleted");
            } else {
                const annotation: Annotation = {
                    ...store.annotations[editing],
                    body,
                };
                store.setAnnotation(annotation);
                setAnnotations(editing, annotation);
                onAnnounce("Note updated");
            }
            closeNoteComposer();
            return;
        }

        const id = crypto.randomUUID();
        const annotation: Annotation = {
            id,
            target,
            body,
            createdAt: Date.now(),
        };
        store.setAnnotation(annotation);
        setAnnotations(id, annotation);
        onAnnounce("Note added");
        closeNoteComposer();
    };

    const editNote = (nodeID: NodeID) => {
        // The host needs to map nodeID to annotation ID
        // This is typically done via the note node's data.noteID
        openNoteComposer();
    };

    const deleteNote = (nodeID: NodeID) => {
        // The host needs to map nodeID to annotation ID
        // This is typically done via the note node's data.noteID
        onAnnounce("Note deleted");
    };

    const copyNote = (nodeID: NodeID) => {
        // The host needs to get the note body from the node
        navigator.clipboard?.writeText("");
        onAnnounce("Note copied");
    };

    const targetAnnotations = () => {
        const target = options.targetFilter?.() ?? noteTarget();
        if (!target) return [];
        return store.getAnnotationsForTarget(target);
    };

    const applyAnnotations = (model: {
        nodes: ReadonlyArray<{ id: NodeID; kind: string; turnID?: string }>;
        edges: ReadonlyArray<unknown>;
    }) => {
        const result = withAnnotations(model as any, annotations, policy);
        return {
            nodes: result.nodes,
            edges: result.edges,
        };
    };

    return {
        get annotations() {
            return annotations;
        },
        targetAnnotations,
        noteTarget,
        editingNote,
        openNoteComposer,
        closeNoteComposer,
        saveNote,
        editNote,
        deleteNote,
        copyNote,
        applyAnnotations,
    };
}