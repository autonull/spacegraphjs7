// Tests for generic annotation storage and overlay.

import { describe, it, expect, beforeEach } from "vitest";
import {
    createAnnotationStore,
    withAnnotations,
    createDefaultNoteNodePolicy,
    type Annotation,
    type NoteNodePolicy,
} from "./annotations";

describe("createAnnotationStore", () => {
    let store: ReturnType<typeof createAnnotationStore>;

    beforeEach(() => {
        store = createAnnotationStore();
    });

    it("starts empty", () => {
        expect(store.getAnnotationIds()).toEqual([]);
        expect(store.getAnnotationsForTarget("any")).toEqual([]);
    });

    it("sets and gets an annotation", () => {
        const ann: Annotation = { id: "a1", target: "n1", body: "Test note" };
        store.setAnnotation(ann);
        expect(store.getAnnotation("a1")).toEqual(ann);
        expect(store.getAnnotationIds()).toEqual(["a1"]);
    });

    it("updates an annotation", () => {
        store.setAnnotation({ id: "a1", target: "n1", body: "First" });
        store.setAnnotation({ id: "a1", target: "n1", body: "Updated" });
        expect(store.getAnnotation("a1")?.body).toBe("Updated");
    });

    it("deletes an annotation", () => {
        store.setAnnotation({ id: "a1", target: "n1", body: "Test" });
        store.deleteAnnotation("a1");
        expect(store.getAnnotation("a1")).toBeUndefined();
        expect(store.getAnnotationIds()).toEqual([]);
    });

    it("clears all annotations", () => {
        store.setAnnotation({ id: "a1", target: "n1", body: "Test" });
        store.setAnnotation({ id: "a2", target: "n2", body: "Test 2" });
        store.clearAnnotations();
        expect(store.getAnnotationIds()).toEqual([]);
    });

    it("gets annotations for target", () => {
        store.setAnnotation({ id: "a1", target: "n1", body: "Note 1" });
        store.setAnnotation({ id: "a2", target: "n1", body: "Note 2" });
        store.setAnnotation({ id: "a3", target: "n2", body: "Note 3" });
        const forN1 = store.getAnnotationsForTarget("n1");
        expect(forN1).toHaveLength(2);
        expect(forN1.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
    });

    it("accepts initial annotations", () => {
        const initial = {
            a1: { id: "a1", target: "n1", body: "Initial" },
        };
        const store2 = createAnnotationStore(initial);
        expect(store2.getAnnotation("a1")).toEqual(initial.a1);
    });
});

describe("withAnnotations", () => {
    const policy = createDefaultNoteNodePolicy<"string">();

    const model = {
        nodes: [
            { id: "turn:t1", kind: "turn" },
            { id: "step:s1", kind: "step", turnID: "turn:t1" },
        ],
        edges: [
            { id: "e1", kind: "sequence", source: "turn:t1", target: "step:s1" },
        ],
    };

    it("returns original model when no annotations", () => {
        const result = withAnnotations(model, {}, policy);
        expect(result.nodes).toHaveLength(2);
        expect(result.edges).toHaveLength(1);
    });

    it("adds note nodes and annotation edges", () => {
        const annotations = {
            a1: { id: "a1", target: "turn:t1", body: "Test note" },
        };
        const result = withAnnotations(model, annotations, policy);
        expect(result.nodes).toHaveLength(3);
        expect(result.edges).toHaveLength(2);

        const noteNode = result.nodes.find((n) => n.kind === "note");
        expect(noteNode).toBeDefined();
        expect(noteNode?.label).toBe("Test note");
        expect(noteNode?.summary).toBe("Test note");
        expect(noteNode?.data).toEqual({ noteID: "a1", target: "turn:t1" });

        const annotatesEdge = result.edges.find((e) => e.kind === "annotates");
        expect(annotatesEdge).toBeDefined();
        expect(annotatesEdge?.source).toBe(noteNode!.id);
        expect(annotatesEdge?.target).toBe("turn:t1");
    });

    it("inherits turnID from turn target node (id is turnID)", () => {
        const annotations = {
            a1: { id: "a1", target: "turn:t1", body: "Note on turn" },
        };
        const result = withAnnotations(model, annotations, policy);
        const noteNode = result.nodes.find((n) => n.kind === "note");
        // Turn node's id IS the turnID
        expect(noteNode?.turnID).toBe("turn:t1");
    });

    it("inherits turnID from step node via turnID field", () => {
        const annotations = {
            a1: { id: "a1", target: "step:s1", body: "Note on step" },
        };
        const result = withAnnotations(model, annotations, policy);
        const noteNode = result.nodes.find((n) => n.kind === "note");
        expect(noteNode?.turnID).toBe("turn:t1");
    });

    it("skips annotations with missing targets", () => {
        const annotations = {
            a1: { id: "a1", target: "missing", body: "Note" },
        };
        const result = withAnnotations(model, annotations, policy);
        expect(result.nodes).toHaveLength(2);
        expect(result.edges).toHaveLength(1);
    });

    it("uses custom noteNodeID prefix from policy", () => {
        const customPolicy: NoteNodePolicy<string> = {
            ...policy,
            noteNodeID: (id) => `custom:${id}`,
        };
        const annotations = {
            a1: { id: "a1", target: "turn:t1", body: "Test" },
        };
        const result = withAnnotations(model, annotations, customPolicy);
        const noteNode = result.nodes.find((n) => n.kind === "note");
        expect(noteNode?.id).toBe("custom:a1");
    });

    it("uses custom annotates edge kind from policy", () => {
        const customPolicy: NoteNodePolicy<string> = {
            ...policy,
            annotatesEdgeKind: "custom-annotates",
        };
        const annotations = {
            a1: { id: "a1", target: "turn:t1", body: "Test" },
        };
        const result = withAnnotations(model, annotations, customPolicy);
        const annotatesEdge = result.edges.find((e) => e.kind === "custom-annotates");
        expect(annotatesEdge).toBeDefined();
    });

    it("handles multiple annotations on same target", () => {
        const annotations = {
            a1: { id: "a1", target: "turn:t1", body: "Note 1" },
            a2: { id: "a2", target: "turn:t1", body: "Note 2" },
        };
        const result = withAnnotations(model, annotations, policy);
        expect(result.nodes).toHaveLength(4); // 2 original + 2 notes
        const noteNodes = result.nodes.filter((n) => n.kind === "note");
        expect(noteNodes).toHaveLength(2);
        expect(noteNodes.map((n) => n.label).sort()).toEqual(["Note 1", "Note 2"]);
    });

    it("includes createdAt as time when provided", () => {
        const annotations = {
            a1: { id: "a1", target: "turn:t1", body: "Test", createdAt: 1234567890 },
        };
        const result = withAnnotations(model, annotations, policy);
        const noteNode = result.nodes.find((n) => n.kind === "note");
        expect(noteNode?.time).toBe(1234567890);
    });
});

describe("createDefaultNoteNodePolicy", () => {
    it("creates policy with custom prefix", () => {
        const policy = createDefaultNoteNodePolicy<"string">("mynote:");
        expect(policy.noteNodeID("abc")).toBe("mynote:abc");
    });

    it("uses default prefix when not specified", () => {
        const policy = createDefaultNoteNodePolicy<"string">();
        expect(policy.noteNodeID("abc")).toBe("note:abc");
    });

    it("default policy creates note with correct structure", () => {
        const policy = createDefaultNoteNodePolicy<"string">();
        const annotation: Annotation = {
            id: "a1",
            target: "turn:t1",
            body: "Test body\nwith newline",
            createdAt: 12345,
        };
        // Turn node's id IS the turnID
        const targetNode = { id: "turn:t1", kind: "turn" };
        const noteNode = policy.createNoteNode(annotation, targetNode, policy);
        expect(noteNode.id).toBe("note:a1");
        expect(noteNode.kind).toBe("note");
        expect(noteNode.label).toBe("Test body");
        expect(noteNode.summary).toBe("Test body\nwith newline");
        expect(noteNode.turnID).toBe("turn:t1");
        expect(noteNode.time).toBe(12345);
        expect(noteNode.data).toEqual({ noteID: "a1", target: "turn:t1" });
    });
});