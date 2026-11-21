import { AgentEventMapper, type AgentEvent } from '@spacegraphjs/agent';
import type { Kernel, KernelOp } from '@spacegraphjs/kernel';
import { foldKernelOps } from './ops';

export const FIXTURE_ID = 'pi:local';
export const fixtureID = (...parts: readonly string[]): string => ['pi', ...parts].join(':');

/** A provider-free run that contains all five investigative situations. */
export const fixtureEvents = (): readonly AgentEvent[] => {
    const run = 'local';
    const u1 = { runId: run, unitId: '1' } as const;
    const u2 = { runId: run, unitId: '2' } as const;
    return [
        { type: 'run-start', runId: run },
        { type: 'unit-start', ...u1 },
        { type: 'message', ...u1, id: 'ask', role: 'user', text: 'Fix auth session', final: true },
        { type: 'action', ...u1, id: 'read-auth', toolName: 'read', args: { path: 'src/auth/session.ts' }, phase: 'start' },
        { type: 'action', ...u1, id: 'read-auth', toolName: 'read', phase: 'end', durationMs: 8 },
        { type: 'action', ...u1, id: 'run-tests', toolName: 'test', args: { target: 'auth.test.ts' }, phase: 'start' },
        { type: 'action', ...u1, id: 'run-tests', toolName: 'test', result: { failing: 'auth.test.ts' }, isError: true, phase: 'end', durationMs: 30 },
        { type: 'unit-end', ...u1, stopReason: 'error' },
        { type: 'unit-start', ...u2 },
        { type: 'action', ...u2, id: 'delegate', toolName: 'delegate', phase: 'start' },
        { type: 'action', ...u2, id: 'subagent-fix', toolName: 'edit', args: { path: 'src/auth/session.ts' }, parentId: 'delegate', phase: 'start' },
        { type: 'action', ...u2, id: 'subagent-fix', toolName: 'edit', phase: 'end', durationMs: 12 },
        { type: 'artifact', ...u2, id: 'f-session', path: 'src/auth/session.ts', producerId: 'subagent-fix' },
        { type: 'action', ...u2, id: 'verify', toolName: 'test', phase: 'start' },
        { type: 'action', ...u2, id: 'verify', toolName: 'test', phase: 'end', durationMs: 20 },
        { type: 'artifact', ...u2, id: 'f-report', path: 'test-report.md', producerId: 'verify' },
        { type: 'message', ...u2, id: 'answer', role: 'assistant', text: 'Session fixed and verified.', final: true },
        { type: 'state', ...u2, id: 'direction', reason: 'direction-change', level: 'after failing test' },
        { type: 'unit-end', ...u2, stopReason: 'stop' },
        { type: 'run-settled', runId: run },
    ];
};

const orders = (source: string, target: string): KernelOp => ({
    op: 'add-edge',
    edge: { id: `orders:${source}:${target}`, kind: 'orders', source, target },
});

export const fixtureOps = (): KernelOp[] => {
    const mapper = new AgentEventMapper('pi');
    const sequence = [
        orders(fixtureID('local', 'read-auth'), fixtureID('local', 'run-tests')),
        orders(fixtureID('local', 'run-tests'), fixtureID('local', 'delegate')),
        orders(fixtureID('local', 'delegate'), fixtureID('local', 'subagent-fix')),
        orders(fixtureID('local', 'subagent-fix'), fixtureID('local', 'verify')),
        orders(fixtureID('local', 'verify'), fixtureID('local', 'answer')),
    ];
    return [...fixtureEvents().flatMap((event) => [...mapper.map(event)]), ...sequence];
};

export const fixtureKernel = (): Kernel => foldKernelOps(fixtureOps());
