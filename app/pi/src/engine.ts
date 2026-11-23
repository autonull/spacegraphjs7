import { SpaceGraph, PhysicsPlugin } from 'spacegraphjs';
import { agentDomain } from '@spacegraphjs/agent';
import { fixtureKernel } from './fixture';
import { agentScopes } from './scopes';
import { createPhysicsPlaySession } from 'spacegraphjs/world';

const view = agentDomain.build(fixtureKernel());
const scopes = agentScopes(view);
const physics = new PhysicsPlugin();

const spec = {
    nodes: view.nodes.map((node, index) => ({
        id: node.id,
        type: 'ShapeNode',
        label: node.label,
        position: [index * 180 - 900, (index % 5) * 100, 0] as [number, number, number],
    })),
    edges: view.edges.map((edge) => ({
        id: edge.id,
        type: 'Edge',
        source: edge.source,
        target: edge.target,
    })),
};

const boot = async (): Promise<void> => {
    const graph = await SpaceGraph.create(document.getElementById('canvas')!, spec, {
        chrome: false,
        global: true,
        reducedMotion: false,
        render: { projection: 'perspective' },
        plugins: [physics],
        scopes: {
            enabled: true,
            specs: scopes.specs,
            animate: true,
            forces: { repulsion: 1800 },
            createNodes: false,
        },
    });
    graph.vision.visionSystem.setStrategy('heuristics');

    const scopesPlugin = graph.scopes!;
    const session = createPhysicsPlaySession({ physics, simulation: scopesPlugin.simulation });
    const enablePlay = (): boolean => session.play('zero-g');
    const reconcile = (): boolean => session.reconcile();

    document.getElementById('status')!.textContent = `${view.nodes.length} nodes · ${scopes.specs.length} scopes`;
    Object.assign(window, {
        __engine: {
            ready: true,
            play: enablePlay,
            reconcile,
            physics: () => ({ ...physics.settings }),
            visionStrategy: () => graph.vision.strategy,
            scopes: () => scopes.specs.map((item) => item.id),
            settled: () => scopesPlugin.simulation.settled,
            energy: () => session.energy,
            playSession: () => ({ active: session.active, preset: session.preset }),
            positionOf: (id: string) => graph.graph.queryEngine.getNode(id)?.position.toArray(),
        },
    });
    document.getElementById('play')!.addEventListener('click', () => enablePlay());
    document.getElementById('reconcile')!.addEventListener('click', () => reconcile());
};

void boot();
