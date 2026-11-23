import { AgentEventMapper, type AgentEvent } from '@spacegraphjs/agent';
import type { Kernel, KernelOp } from '@spacegraphjs/kernel';
import { localOps } from './local-feed';
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

const richNode = (
    id: string,
    kind: string,
    label: string,
    unitId: string,
    role: string,
    status = 'complete',
): KernelOp => ({
    op: 'add-node',
    node: { id: fixtureID('local', id), kind, label, data: { unitId, role, status } },
});

const richEdge = (id: string, kind: string, source: string, target: string): KernelOp => ({
    op: 'add-edge',
    edge: {
        id: fixtureID('local', `e-${id}`),
        kind,
        source: fixtureID('local', source),
        target: fixtureID('local', target),
    },
});

/** A denser, deterministic scenario for showcases; the canonical fixture stays unchanged. */
export const richFixtureOps = (): KernelOp[] => [
    ...(['x3', 'x4'] as const).flatMap((unit, index) => {
        const tool = index === 0 ? 'grep' : 'edit';
        const artifact = index === 0 ? 'auth.ts' : 'patch.diff';
        return [
            richNode(unit, 'unit', `Turn ${index + 3}`, unit, 'unit'),
            richNode(`q${index + 3}`, 'message', 'user message', unit, 'message'),
            richNode(tool, 'action', tool, unit, 'action'),
            richNode(artifact, 'artifact', artifact, unit, 'artifact'),
            richEdge(`contains-${unit}`, 'contains', 'run', unit),
            richEdge(`asks-${unit}`, 'orders', unit, `q${index + 3}`),
            richEdge(`reads-${unit}`, 'reads', `q${index + 3}`, tool),
            richEdge(`produces-${unit}`, 'produces', tool, artifact),
        ];
    }),
    richNode('x6', 'unit', 'Turn 5', 'x6', 'unit'),
    richNode('approve', 'approval', 'Approve patch', 'x6', 'approval', 'pending'),
    richNode('failed', 'error', 'test failed', 'x6', 'error', 'failed'),
    richNode('report', 'artifact', 'incident.md', 'x6', 'artifact'),
    richEdge('contains-x6', 'contains', 'run', 'x6'),
    richEdge('gates', 'gates', 'approve', 'x6'),
    richEdge('fails', 'orders', 'x6', 'failed'),
    richEdge('reports', 'produces', 'failed', 'report'),
];

export const richFixtureKernel = (): Kernel => foldKernelOps([...localOps(), ...richFixtureOps()]);

/** The chapters shot gives Turn 3/4 contained work so every chapter card carries real chips. */
export const chaptersFixtureOps = (): KernelOp[] => [
    ...richFixtureOps(),
    ...([
        ['x3', 'grep', 'auth.ts'],
        ['x4', 'edit', 'patch.diff'],
    ] as const).flatMap(([unit, tool, artifact]) => [
        richEdge(`contains-${unit}-${tool}`, 'contains', unit, tool),
        richEdge(`contains-${unit}-${artifact}`, 'contains', unit, artifact),
    ]),
];

export const chaptersFixtureKernel = (): Kernel =>
    foldKernelOps([...localOps(), ...chaptersFixtureOps()]);

/** A symmetric three-level tree: one root, four branches, three leaves each. Pure scale evidence. */
export const octavesFixtureOps = (): KernelOp[] => {
    const root = fixtureID('local', 'oroot');
    const ops: KernelOp[] = [
        {
            op: 'add-node',
            node: {
                id: root,
                kind: 'run',
                label: 'Root',
                data: { unitId: 'oroot', role: 'run', status: 'complete' },
            },
        },
    ];
    for (let branch = 1; branch <= 4; branch++) {
        const parent = fixtureID('local', `obranch${branch}`);
        ops.push(
            {
                op: 'add-node',
                node: {
                    id: parent,
                    kind: 'unit',
                    label: `Level ${branch}`,
                    data: { unitId: `obranch${branch}`, role: 'unit', status: 'complete' },
                },
            },
            {
                op: 'add-edge',
                edge: { id: `ocontains-root-${branch}`, kind: 'contains', source: root, target: parent },
            },
            {
                op: 'add-edge',
                edge: { id: `oorders-root-${branch}`, kind: 'orders', source: root, target: parent },
            },
        );
        for (let leaf = 1; leaf <= 3; leaf++) {
            const child = fixtureID('local', `oleaf${branch}-${leaf}`);
            ops.push(
                {
                    op: 'add-node',
                    node: {
                        id: child,
                        kind: 'action',
                        label: `work ${leaf}`,
                        data: { unitId: `obranch${branch}`, role: 'action', status: 'complete' },
                    },
                },
                {
                    op: 'add-edge',
                    edge: { id: `ocontains-${branch}-${leaf}`, kind: 'contains', source: parent, target: child },
                },
                {
                    op: 'add-edge',
                    edge: { id: `oorders-${branch}-${leaf}`, kind: 'orders', source: parent, target: child },
                },
            );
        }
    }
    return ops;
};

export const octavesFixtureKernel = (): Kernel => foldKernelOps(octavesFixtureOps());

export const fixtureFor = (
    fixture: string | null,
    scenario: string | null,
): Kernel | undefined =>
    fixture === 'octaves'
        ? octavesFixtureKernel()
        : fixture === 'chapters'
          ? chaptersFixtureKernel()
          : scenario === 'rich'
            ? richFixtureKernel()
            : undefined;
