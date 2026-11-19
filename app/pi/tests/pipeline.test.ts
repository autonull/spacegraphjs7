// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AgentEventMapper } from '@spacegraphjs/agent';
import { localKernel, localOps } from '../src/local-feed';
import { decodeOp, encodeOp, foldKernelOps } from '../src/ops';
import { PiEventTranslator } from '../src/pi-events';

describe('kernel op stream', () => {
    it('folds ops into a kernel and round-trips them through SSE', () => {
        const ops = localOps();
        const kernel = foldKernelOps(ops.map((op) => decodeOp(encodeOp(op).slice(6))));
        expect(kernel.nodes.length).toBe(localKernel().nodes.length);
        expect(kernel.edges.length).toBe(localKernel().edges.length);
        expect(kernel.diagnostics().danglingEdges).toEqual([]);
        expect(ops.some((op) => op.op === 'add-edge' && op.edge.kind === 'inferred-cause')).toBe(false);
    });
});

describe('Pi event translation', () => {
    it('maps a tool call, its artifact and a failed turn into generic ops', () => {
        const translator = new PiEventTranslator('live');
        const mapper = new AgentEventMapper('pi');
        const events = [
            { type: 'agent_start' },
            { type: 'turn_start' },
            {
                type: 'tool_execution_start',
                toolCallId: 'call-1',
                toolName: 'write',
                args: { path: 'a.ts' },
            },
            {
                type: 'tool_execution_end',
                toolCallId: 'call-1',
                toolName: 'write',
                result: { path: 'a.ts' },
                isError: true,
                durationMs: 4,
            },
            { type: 'turn_end', message: { role: 'assistant', stopReason: 'error' } },
            { type: 'agent_settled', aborted: false },
        ];
        const ops = events.flatMap((event) =>
            translator.translate(event).flatMap((agentEvent) => [...mapper.map(agentEvent)]),
        );
        const kernel = foldKernelOps(ops);
        const kinds = new Set(kernel.nodes.map((node) => node.kind));

        expect(kinds.has('run')).toBe(true);
        expect(kinds.has('unit')).toBe(true);
        expect(kinds.has('action')).toBe(true);
        expect(kinds.has('artifact')).toBe(true);
        expect(kinds.has('retry')).toBe(true);
        expect(kernel.edges.some((edge) => edge.kind === 'writes')).toBe(true);
        expect(kernel.edges.some((edge) => edge.kind === 'delegates')).toBe(false);
        expect(kernel.diagnostics().danglingEdges).toEqual([]);
    });

    it('records state changes without inventing a model_change event', () => {
        const translator = new PiEventTranslator('live');
        const events = translator.translate({
            type: 'entry_appended',
            entry: { type: 'model_change', provider: 'anthropic', modelId: 'claude' },
        });
        expect(events).toEqual([
            expect.objectContaining({ type: 'state', reason: 'model', level: 'anthropic:claude' }),
        ]);
    });
});
