import { readFileSync } from 'node:fs';
import { AgentEventMapper, agentDomain, changedFiles, failureDetails } from '@spacegraphjs/agent';
import { Kernel, type KernelOp } from '@spacegraphjs/kernel';

const mapper = new AgentEventMapper('pi');
const ops: KernelOp[] = [
    ...mapper.map({ type: 'run-start', runId: 'r1' }),
    ...mapper.map({ type: 'unit-start', runId: 'r1', unitId: 'u1' }),
    ...mapper.map({
        type: 'action',
        runId: 'r1',
        unitId: 'u1',
        id: 't1',
        toolName: 'write',
        phase: 'end',
        isError: true,
    }),
    ...mapper.map({ type: 'artifact', runId: 'r1', unitId: 'u1', id: 'f1', path: 'src/a.ts', producerId: 't1' }),
];

const kernel = ops.reduce(
    (current, op) =>
        current.modify((builder) => {
            if (op.op === 'add-node') builder.nodes.set(op.node.id, op.node);
            if (op.op === 'add-edge') builder.edges.set(op.edge.id, op.edge);
        }),
    new Kernel(),
);
const view = agentDomain.build(kernel);
const failures = failureDetails(view);
const files = changedFiles(view);

if (!failures.some((failure) => failure.id === 'pi:r1:t1')) throw new Error('packed agent lost its failure selector');
if (!files.some((file) => file.path === 'src/a.ts' && file.writers.includes('pi:r1:t1')))
    throw new Error('packed agent lost its changed-file selector');

const manifest = JSON.parse(readFileSync('node_modules/@spacegraphjs/agent/package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
};
const dependencies = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies });
if (dependencies.some((name) => name.startsWith('@earendil-works/')))
    throw new Error(`packed agent leaks a Pi dependency: ${dependencies.join(', ')}`);

console.log(`pi publish check: ${failures.length} failure, ${files.length} file, no Pi dependency`);
