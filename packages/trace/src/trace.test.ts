// Trace classification tests with a synthetic cause graph.

import { describe, it, expect } from 'bun:test';
import type { TraceConfig, TraceModel, TraceNode, TraceEdge } from './types';
import {
    traceWhy,
    traceLedHere,
    traceRelated,
    traceDownstream,
    litNodeIds,
    isLit,
    isAnswer,
    isEdgeVisible,
    isAnswerEdge,
    stepLitNode,
    copyTraceAsOutline,
} from './classify';

// Build a synthetic cause graph:
// session
//   turn:1
//     phase:explore
//       tool:read (reads file:a.ts)
//         file:a.ts
//     phase:edit
//       tool:edit (writes file:a.ts)
//         file:a.ts
//     phase:verify
//       tool:test (produces test-result)
//         result:test (success)
//   turn:2
//     phase:explore
//       tool:read (reads file:b.ts)
//         file:b.ts
//     phase:edit
//       tool:edit (writes file:b.ts)
//         file:b.ts
//       tool:edit (writes file:a.ts)
//         file:a.ts

function createTestModel(): TraceModel {
    const nodes: TraceNode[] = [
        { id: 'session', kind: 'session', label: 'Session' },
        { id: 'turn:1', kind: 'turn', label: 'Turn 1', turnID: 'turn:1' },
        { id: 'phase:1:explore', kind: 'phase', label: 'Explore', turnID: 'turn:1' },
        { id: 'tool:1', kind: 'tool', label: 'read a.ts', turnID: 'turn:1' },
        { id: 'file:a.ts', kind: 'file', label: 'a.ts', turnID: 'turn:1' },
        { id: 'phase:1:edit', kind: 'phase', label: 'Edit', turnID: 'turn:1' },
        { id: 'tool:2', kind: 'tool', label: 'edit a.ts', turnID: 'turn:1' },
        { id: 'phase:1:verify', kind: 'phase', label: 'Verify', turnID: 'turn:1' },
        { id: 'tool:3', kind: 'tool', label: 'test', turnID: 'turn:1' },
        { id: 'result:1', kind: 'result', label: 'tests pass', status: 'success', turnID: 'turn:1' },
        { id: 'turn:2', kind: 'turn', label: 'Turn 2', turnID: 'turn:2' },
        { id: 'phase:2:explore', kind: 'phase', label: 'Explore', turnID: 'turn:2' },
        { id: 'tool:4', kind: 'tool', label: 'read b.ts', turnID: 'turn:2' },
        { id: 'file:b.ts', kind: 'file', label: 'b.ts', turnID: 'turn:2' },
        { id: 'phase:2:edit', kind: 'phase', label: 'Edit', turnID: 'turn:2' },
        { id: 'tool:5', kind: 'tool', label: 'edit b.ts', turnID: 'turn:2' },
        { id: 'tool:6', kind: 'tool', label: 'edit a.ts', turnID: 'turn:2' },
    ];

    const edges: TraceEdge[] = [
        // part-of hierarchy
        { id: 'e1', kind: 'part-of', source: 'turn:1', target: 'session' },
        { id: 'e2', kind: 'part-of', source: 'phase:1:explore', target: 'turn:1' },
        { id: 'e3', kind: 'part-of', source: 'tool:1', target: 'phase:1:explore' },
        { id: 'e4', kind: 'part-of', source: 'phase:1:edit', target: 'turn:1' },
        { id: 'e5', kind: 'part-of', source: 'tool:2', target: 'phase:1:edit' },
        { id: 'e6', kind: 'part-of', source: 'phase:1:verify', target: 'turn:1' },
        { id: 'e7', kind: 'part-of', source: 'tool:3', target: 'phase:1:verify' },
        { id: 'e8', kind: 'part-of', source: 'result:1', target: 'phase:1:verify' },
        { id: 'e9', kind: 'part-of', source: 'turn:2', target: 'session' },
        { id: 'e10', kind: 'part-of', source: 'phase:2:explore', target: 'turn:2' },
        { id: 'e11', kind: 'part-of', source: 'tool:4', target: 'phase:2:explore' },
        { id: 'e12', kind: 'part-of', source: 'phase:2:edit', target: 'turn:2' },
        { id: 'e13', kind: 'part-of', source: 'tool:5', target: 'phase:2:edit' },
        { id: 'e14', kind: 'part-of', source: 'tool:6', target: 'phase:2:edit' },
        // reads
        { id: 'e15', kind: 'reads', source: 'tool:1', target: 'file:a.ts' },
        { id: 'e16', kind: 'reads', source: 'tool:4', target: 'file:b.ts' },
        // writes
        { id: 'e17', kind: 'writes', source: 'tool:2', target: 'file:a.ts' },
        { id: 'e18', kind: 'writes', source: 'tool:5', target: 'file:b.ts' },
        { id: 'e19', kind: 'writes', source: 'tool:6', target: 'file:a.ts' },
        // produces
        { id: 'e20', kind: 'produces', source: 'tool:3', target: 'result:1' },
        // sequence
        { id: 'e21', kind: 'sequence', source: 'tool:1', target: 'tool:2' },
        { id: 'e22', kind: 'sequence', source: 'tool:2', target: 'tool:3' },
        { id: 'e23', kind: 'sequence', source: 'tool:4', target: 'tool:5' },
        { id: 'e24', kind: 'sequence', source: 'tool:5', target: 'tool:6' },
    ];

    return {
        root: 'session',
        nodes,
        edges,
        turns: ['turn:1', 'turn:2'],
        turnByMessageID: new Map(),
        activeTurn: 'turn:2',
    };
}

function createTraversal() {
    const incoming = (model: TraceModel, id: string) => model.edges.filter((e) => e.target === id);
    const outgoing = (model: TraceModel, id: string) => model.edges.filter((e) => e.source === id);
    const nodeIndex = (model: TraceModel) => new Map(model.nodes.map((n) => [n.id, n]));
    const parentIndex = (model: TraceModel) => {
        const map = new Map<string, string>();
        for (const edge of model.edges) {
            if (edge.kind === 'part-of') map.set(edge.source, edge.target);
        }
        return map;
    };
    const childIndex = (model: TraceModel) => {
        const map = new Map<string, string[]>();
        for (const edge of model.edges) {
            if (edge.kind === 'part-of') {
                const arr = map.get(edge.target) ?? [];
                arr.push(edge.source);
                map.set(edge.target, arr);
            }
        }
        return map;
    };
    const sequenceIndex = (model: TraceModel) => {
        const next = new Map<string, string>();
        const previous = new Map<string, string>();
        for (const edge of model.edges) {
            if (edge.kind === 'sequence') {
                next.set(edge.source, edge.target);
                previous.set(edge.target, edge.source);
            }
        }
        return { next, previous };
    };
    const ancestors = (model: TraceModel, id: string) => {
        const result: TraceNode[] = [];
        const parents = parentIndex(model);
        const nodes = nodeIndex(model);
        let current = id;
        for (;;) {
            const parent = parents.get(current);
            if (!parent) break;
            const node = nodes.get(parent);
            if (!node) break;
            result.push(node);
            current = parent;
        }
        return result;
    };
    const forwardChain = (model: TraceModel, id: string) => {
        const result: TraceNode[] = [];
        const seq = sequenceIndex(model);
        const nodes = nodeIndex(model);
        let current = id;
        for (;;) {
            const next = seq.next.get(current);
            if (!next) break;
            const node = nodes.get(next);
            if (!node) break;
            result.push(node);
            current = next;
        }
        return result;
    };
    const downstreamChain = (model: TraceModel, id: string) => {
        const result: { node: TraceNode; edge: TraceEdge; confidence: string }[] = [];
        const seen = new Set([id]);
        const nodes = nodeIndex(model);
        const queue = [id];
        for (let index = 0; index < queue.length; index++) {
            const current = queue[index];
            for (const edge of model.edges) {
                if (edge.source !== current) continue;
                if (!['sequence', 'produces', 'writes'].includes(edge.kind)) continue;
                if (seen.has(edge.target)) continue;
                const node = nodes.get(edge.target);
                if (!node) continue;
                seen.add(edge.target);
                queue.push(edge.target);
                result.push({ node, edge, confidence: edge.confidence ?? 'explicit' });
            }
        }
        return result;
    };

    return { incoming, outgoing, ancestors, forwardChain, downstreamChain, nodeIndex, parentIndex, childIndex, sequenceIndex };
}

function createVocabulary() {
    return {
        provenanceEdgeKinds: new Set(['reads', 'writes', 'produces', 'evidence']),
        readEdgeKinds: new Set(['reads', 'searches', 'references']),
        downstreamEdgeKinds: new Set(['sequence', 'produces', 'writes']),
    };
}

describe('trace classification', () => {
    const model = createTestModel();
    const traversal = createTraversal();
    const vocabulary = createVocabulary();
    const config: TraceConfig = { model, traversal, vocabulary };

    describe('traceWhy', () => {
        it('finds the file readers and writers for a file', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            // Answer: tool:1 (reads), tool:2 (writes), tool:6 (writes)
            expect(overlay.answerIds.has('tool:1')).toBe(true);
            expect(overlay.answerIds.has('tool:2')).toBe(true);
            expect(overlay.answerIds.has('tool:6')).toBe(true);
            // Context: ancestors of answer nodes
            expect(overlay.contextIds.has('phase:1:explore')).toBe(true);
            expect(overlay.contextIds.has('phase:1:edit')).toBe(true);
            expect(overlay.contextIds.has('phase:2:edit')).toBe(true);
            expect(overlay.contextIds.has('turn:1')).toBe(true);
            expect(overlay.contextIds.has('turn:2')).toBe(true);
            expect(overlay.contextIds.has('session')).toBe(true);
        });

        it('finds the tool that produced a result', () => {
            const overlay = traceWhy(config, 'result:1');
            expect(overlay.answerIds.has('tool:3')).toBe(true);
            expect(overlay.contextIds.has('phase:1:verify')).toBe(true);
        });
    });

    describe('traceLedHere', () => {
        it('follows the forward chain from a tool', () => {
            const overlay = traceLedHere(config, 'tool:1');
            expect(overlay.answerIds.has('tool:2')).toBe(true);
            expect(overlay.answerIds.has('tool:3')).toBe(true);
            expect(overlay.answerIds.has('tool:1')).toBe(false);
        });

        it('returns empty for the last tool in chain', () => {
            const overlay = traceLedHere(config, 'tool:3');
            expect(overlay.answerIds.size).toBe(0);
        });
    });

    describe('traceRelated', () => {
        it('finds incoming and outgoing neighbors', () => {
            const overlay = traceRelated(config, 'tool:2');
            // Incoming: tool:1 (sequence)
            // Outgoing: file:a.ts (writes), tool:3 (sequence)
            expect(overlay.answerIds.has('tool:1')).toBe(true);
            expect(overlay.answerIds.has('file:a.ts')).toBe(true);
            expect(overlay.answerIds.has('tool:3')).toBe(true);
        });
    });

    describe('traceDownstream', () => {
        it('follows sequence/produces/writes edges forward', () => {
            const overlay = traceDownstream(config, 'tool:1');
            expect(overlay.answerIds.has('tool:2')).toBe(true); // sequence
            expect(overlay.answerIds.has('tool:3')).toBe(true); // sequence
            expect(overlay.answerIds.has('result:1')).toBe(true); // produces
            expect(overlay.answerIds.has('file:a.ts')).toBe(true); // writes from tool:2
        });

        it('crosses turn boundaries via sequence', () => {
            // Note: in this model, sequence edges don't cross turns
            // But downstream follows writes edges
            const overlay = traceDownstream(config, 'tool:5');
            expect(overlay.answerIds.has('tool:6')).toBe(true); // sequence
            expect(overlay.answerIds.has('file:b.ts')).toBe(true); // writes
            expect(overlay.answerIds.has('file:a.ts')).toBe(true); // writes from tool:6
        });
    });

    describe('helper functions', () => {
        it('litNodeIds returns answer + context', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            const lit = litNodeIds(overlay);
            for (const id of overlay.answerIds) expect(lit.has(id)).toBe(true);
            for (const id of overlay.contextIds) expect(lit.has(id)).toBe(true);
        });

        it('isLit checks answer or context', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            expect(isLit(overlay, 'tool:1')).toBe(true);
            expect(isLit(overlay, 'turn:1')).toBe(true);
            expect(isLit(overlay, 'session')).toBe(true);
            expect(isLit(overlay, 'tool:4')).toBe(false);
        });

        it('isAnswer checks only answer nodes', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            expect(isAnswer(overlay, 'tool:1')).toBe(true);
            expect(isAnswer(overlay, 'turn:1')).toBe(false);
        });

        it('isEdgeVisible checks visible edges', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            // e15: reads tool:1 -> file:a.ts (answer edge)
            expect(isEdgeVisible(overlay, 'e15')).toBe(true);
            // e17: writes tool:2 -> file:a.ts (answer edge)
            expect(isEdgeVisible(overlay, 'e17')).toBe(true);
        });

        it('isAnswerEdge checks only answer edges', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            expect(isAnswerEdge(overlay, 'e15')).toBe(true);
            // Context edges are not answer edges
        });

        it('stepLitNode steps through lit nodes', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            const lit = Array.from(litNodeIds(overlay));
            expect(stepLitNode(overlay, undefined, 1)).toBe(lit[0]);
            expect(stepLitNode(overlay, lit[0], 1)).toBe(lit[1]);
            expect(stepLitNode(overlay, lit[lit.length - 1], 1)).toBeUndefined();
            expect(stepLitNode(overlay, undefined, -1)).toBe(lit[lit.length - 1]);
        });

        it('copyTraceAsOutline produces markdown', () => {
            const overlay = traceWhy(config, 'file:a.ts');
            const breadcrumbs = (m: TraceModel, id: string) => {
                const node = m.nodes.find((n) => n.id === id);
                return node ? [node] : [];
            };
            const outline = copyTraceAsOutline(model, overlay, breadcrumbs);
            expect(outline).toContain('▸ read a.ts');
            expect(outline).toContain('▸ edit a.ts');
            expect(outline).toContain('▸ edit a.ts');
        });
    });
});