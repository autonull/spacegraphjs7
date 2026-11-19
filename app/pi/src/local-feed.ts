import { AgentEventMapper } from '@spacegraphjs/agent';
import type { KernelOp } from '@spacegraphjs/kernel';
import { foldKernelOps } from './ops';

/** A deterministic op feed so tests and a provider-free page can exercise the same pipeline. */
export const localOps = (): KernelOp[] => {
    const mapper = new AgentEventMapper('pi');
    return [
        ...mapper.map({ type: 'run-start', runId: 'local' }),
        ...mapper.map({ type: 'unit-start', runId: 'local', unitId: '1' }),
        ...mapper.map({
            type: 'message',
            runId: 'local',
            unitId: '1',
            id: 'm1',
            role: 'user',
            text: 'Summarise the repo',
            final: true,
        }),
        ...mapper.map({
            type: 'action',
            runId: 'local',
            unitId: '1',
            id: 'read',
            toolName: 'read',
            args: JSON.stringify({ path: 'README.md' }),
            phase: 'start',
        }),
        ...mapper.map({
            type: 'action',
            runId: 'local',
            unitId: '1',
            id: 'read',
            toolName: 'read',
            phase: 'end',
            durationMs: 12,
        }),
        ...mapper.map({
            type: 'artifact',
            runId: 'local',
            unitId: '1',
            id: 'f1',
            path: 'README.md',
            producerId: 'read',
        }),
        ...mapper.map({
            type: 'message',
            runId: 'local',
            unitId: '1',
            id: 'm2',
            role: 'assistant',
            text: 'The repo is a graph library.',
            final: true,
            stopReason: 'stop',
            usage: { input: 120, output: 40, totalTokens: 160, cost: 0.001 },
        }),
        ...mapper.map({ type: 'unit-end', runId: 'local', unitId: '1', stopReason: 'stop' }),
        ...mapper.map({ type: 'run-settled', runId: 'local' }),
    ];
};

export const localKernel = () => foldKernelOps(localOps());
