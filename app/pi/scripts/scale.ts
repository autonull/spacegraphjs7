import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { AgentEventMapper, agentDomain, type AgentEvent } from '@spacegraphjs/agent';
import { buildScopeTree, layoutScopes, ScopeSimulation } from 'spacegraphjs/layout';
import { createVisionLoop, HeuristicsStrategy } from 'spacegraphjs/vision';
import { Vector3 } from 'three';
import { windowedView } from '../src/policy';
import { foldKernelOps } from '../src/ops';
import { agentScopes } from '../src/scopes';
import { encodePermalink, decodePermalink, type PermalinkState } from '../src/permalink';

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

const playFrameMs = (() => {
    const simulation = new ScopeSimulation({
        forces: { repulsion: 1800, attraction: 0.018, cooling: 0.94, maxBodies: 120 },
    });
    simulation.setSpecs([
        { id: 'play', nodes: Array.from({ length: 120 }, (_, i) => ({ id: `body-${i}` })) },
    ]);
    simulation.setSignals(simulation.signals);
    const start = performance.now();
    for (let frame = 0; frame < 120; frame++) simulation.advance(1 / 60);
    const perFrame = ms(start) / 120;
    simulation.settle();
    return { ms: Number(perFrame.toFixed(3)), settled: simulation.settled };
})();

const visionLoopMs = await (async () => {
    const nodes = Array.from({ length: 300 }, (_, index) => ({
        id: `vision-${index}`,
        data: { color: '#ffffff', backgroundColor: '#1a1a2e', size: 60 },
        position: new Vector3((index % 20) * 220, Math.floor(index / 20) * 90, 0),
    }));
    const graph = { getNodes: () => nodes, getEdges: () => [] };
    const strategy = new HeuristicsStrategy();
    const loop = createVisionLoop(
        { strategy: strategy.id, analyze: () => strategy.analyze(graph, {}) },
        () => undefined,
    );
    const start = performance.now();
    for (let cycle = 0; cycle < 20; cycle++) await loop.cycle();
    return Number((ms(start) / 20).toFixed(3));
})();

const permalinkState: PermalinkState = {
    surface: 'hybrid',
    arrangement: 'side',
    depth: 'orbit',
    depthAxis: 'turn',
    level: 'auto',
    focus: 'turn-2:action-1',
    viewport: { zoom: 1, center: [0, 0, 0] },
    filter: '',
};
const permalinkMs = (() => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) decodePermalink(encodePermalink(permalinkState));
    return Number((ms(start) / 1000).toFixed(3));
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
            playSession120Bodies: playFrameMs,
            visionLoopCycle: { ms: visionLoopMs },
            permalinkRoundTrip: { ms: permalinkMs },
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
if (playFrameMs.ms >= 8) failures.push(`play frame ${playFrameMs.ms}ms >= 8ms`);
if (!playFrameMs.settled) failures.push('play session did not settle');
if (visionLoopMs >= 16) failures.push(`vision loop cycle ${visionLoopMs}ms >= 16ms`);
if (permalinkMs >= 2) failures.push(`permalink round-trip ${permalinkMs}ms >= 2ms`);
if (gzipChunk > 400 * 1024) failures.push(`3D chunk ${gzipChunk} bytes >= 400KB`);
if (failures.length) {
    console.error(`scale budgets exceeded:\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
}
console.log('scale budgets met');
