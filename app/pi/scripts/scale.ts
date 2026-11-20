import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { AgentEventMapper, agentDomain, type AgentEvent } from '@spacegraphjs/agent';
import { buildScopeTree, layoutScopes, ScopeSimulation } from 'spacegraphjs/layout';
import { windowedView } from '../src/policy';
import { foldKernelOps } from '../src/ops';
import { agentScopes } from '../src/scopes';

type Op = ReturnType<AgentEventMapper['map']>[number];
const ms = (start: number): number => Number((performance.now() - start).toFixed(1));

const buildEvents = (messages: number, turns: number): Op[] => {
    const mapper = new AgentEventMapper('pi');
    const ops: Op[] = [];
    const runId = 'scale';
    const emit = (unitId: string, event: Record<string, unknown>) => {
        ops.push(...mapper.map({ ...event, runId, unitId } as AgentEvent));
    };
    ops.push(...mapper.map({ type: 'run-start', runId }));
    const turnOf = (message: number) => Math.floor((message / messages) * turns);
    for (let message = 0; message < messages; message++) {
        const unitId = String(turnOf(message) + 1);
        if (message === 0 || turnOf(message - 1) !== turnOf(message)) {
            emit(unitId, { type: 'unit-start' });
        }
        const id = `msg-${message}`;
        emit(unitId, { type: 'message', id, role: 'user', text: `message ${message}`, final: true });
        for (let action = 0; action < 3; action++) {
            emit(unitId, {
                type: 'action',
                id: `action-${message}-${action}`,
                toolName: 'read',
                args: { path: `file-${action}.ts` },
                phase: 'end',
            });
        }
    }
    ops.push(...mapper.map({ type: 'run-settled', runId }));
    return ops;
};

const pipeline = (messages: number, turns: number) => {
    const ops = buildEvents(messages, turns);
    let start = performance.now();
    const kernel = foldKernelOps(ops);
    const build = ms(start);
    start = performance.now();
    const view = agentDomain.build(kernel);
    const full = ms(start);
    return { nodes: kernel.nodes.length, build, full, view };
};

const small = pipeline(300, 6);
const large = pipeline(5001, 100);

const windowMs = (() => {
    const start = performance.now();
    const view = windowedView(large.view, 60).view;
    const scopes = agentScopes(view);
    layoutScopes(buildScopeTree(scopes.specs), { seed: 7, gap: 190 });
    const simulation = new ScopeSimulation({ layout: { seed: 7 } });
    simulation.setSpecs(scopes.specs);
    simulation.settle();
    return ms(start);
})();

const gzipChunk = (() => {
    try {
        const dir = resolve(import.meta.dirname, '../dist/assets');
        const file = readdirSync(dir).find((name) => name.startsWith('activity-') && name.endsWith('.js'));
        return file ? gzipSync(readFileSync(resolve(dir, file))).length : 0;
    } catch {
        return 0;
    }
})();

console.log(
    JSON.stringify(
        {
            modelBuild300: { nodes: small.nodes, ms: small.build },
            fullPipeline5001: { nodes: large.nodes, ms: large.full },
            forceLayout60Turns: { ms: windowMs },
            lazy3DGzipBytes: gzipChunk,
        },
        null,
        2,
    ),
);

const failures: string[] = [];
if (small.build >= 50) failures.push(`model build ${small.build}ms >= 50ms`);
if (large.full >= 400) failures.push(`full pipeline ${large.full}ms >= 400ms`);
if (windowMs >= 1500) failures.push(`60-turn layout ${windowMs}ms >= 1500ms`);
if (gzipChunk > 400 * 1024) failures.push(`3D chunk ${gzipChunk} bytes >= 400KB`);
if (failures.length) {
    console.error(`scale budgets exceeded:\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
}
console.log('scale budgets met');
