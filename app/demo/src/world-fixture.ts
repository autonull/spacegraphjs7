// The four domain views that both world demos mount: the one-canvas world root and the four-canvas
// separate-surface embedding case. Fixture data lives here so the two paths never drift.

import type { AdapterEdge, AdapterNode } from '@spacegraphjs/adapter';
import { AgentEventMapper, agentDomain } from '@spacegraphjs/agent';
import { foldKernelOps } from '@spacegraphjs/kernel';
import {
    fixtureOps as dataOps,
    foldDataOps,
    FIXTURE_POSITIONS as DATA_POSITIONS,
    dataDomain,
} from '@spacegraphjs/data';
import {
    fixtureOps as filesystemOps,
    foldFilesystemOps,
    FIXTURE_POSITIONS as FILESYSTEM_POSITIONS,
    filesystemDomain,
} from '@spacegraphjs/filesystem';
import {
    fixtureOps as workflowOps,
    FIXTURE_POSITIONS as WORKFLOW_POSITIONS,
    workflowDomain,
} from '@spacegraphjs/workflow';
import type { Position } from 'spacegraphjs/layout';
import { CROSS_TRACE_LINKS, type CrossTraceLink } from './cross-trace';
import type { WorldHostDomain, WorldHostNode } from './world-host';

export interface WorldFixtureDomain extends WorldHostDomain {
    readonly view: { nodes: readonly AdapterNode[]; edges: readonly AdapterEdge[] };
    readonly positions: ReadonlyMap<string, Position>;
}

export interface WorldFixture {
    readonly domains: readonly WorldFixtureDomain[];
    readonly links: readonly CrossTraceLink[];
    readonly nodesByDomain: Readonly<Record<string, readonly string[]>>;
}

const agentEvents = [
    { type: 'run-start', runId: 'r', at: 1 },
    { type: 'unit-start', runId: 'r', unitId: 'u1', at: 2 },
    {
        type: 'message',
        runId: 'r',
        unitId: 'u1',
        id: 'm1',
        role: 'user',
        text: 'Fix auth session',
        at: 3,
    },
    {
        type: 'action',
        runId: 'r',
        unitId: 'u1',
        id: 'a1',
        toolName: 'read',
        args: { path: 'src/auth/session.ts' },
        phase: 'end',
        at: 4,
    },
    {
        type: 'artifact',
        runId: 'r',
        unitId: 'u1',
        id: 'session',
        path: 'src/auth/session.ts',
        producerId: 'a1',
        at: 5,
    },
    { type: 'unit-end', runId: 'r', unitId: 'u1', at: 6 },
    { type: 'run-end', runId: 'r', at: 7 },
] as const;

const RUNNING = new Set(['active', 'streaming', 'running', 'pending']);
const FAILED = new Set(['failed', 'aborted', 'error']);

const statusOf = (status: string): WorldHostNode['status'] =>
    FAILED.has(status) ? 'error' : RUNNING.has(status) ? 'running' : 'success';

const describe = (id: string, view: WorldFixtureDomain['view']): WorldHostDomain => ({
    id,
    nodes: view.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        kind: node.kind,
        status: statusOf(node.status),
        data: (node as AdapterNode & { data?: Record<string, unknown> }).data,
    })),
    edges: view.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        label: edge.label,
    })),
});

/** Builds the four views once. `positions` are the embedding case; the world root uses its own solver. */
export const buildWorldFixture = (): WorldFixture => {
    const agentMapper = new AgentEventMapper('agent');
    const agentView = agentDomain.build(
        foldKernelOps(agentEvents.flatMap((event) => agentMapper.map(event))),
    );
    const workflowView = workflowDomain.build(foldKernelOps(workflowOps()));
    const filesystemView = filesystemDomain.build(foldFilesystemOps(filesystemOps()));
    const dataView = dataDomain.build(foldDataOps(dataOps()));

    const agentPositions = new Map<string, Position>(
        agentView.nodes.map((node, index) => {
            const angle = (index / agentView.nodes.length) * Math.PI * 2;
            return [
                node.id,
                {
                    x: Math.round(Math.cos(angle) * 170),
                    y: Math.round(Math.sin(angle) * 130),
                    z: 0,
                },
            ];
        }),
    );

    const entries: readonly [string, WorldFixtureDomain['view'], ReadonlyMap<string, Position>][] =
        [
            ['agent', agentView, agentPositions],
            ['workflow', workflowView, WORKFLOW_POSITIONS],
            ['filesystem', filesystemView, FILESYSTEM_POSITIONS],
            ['data', dataView, DATA_POSITIONS],
        ];
    const domains = entries.map(([id, view, positions]) => ({
        ...describe(id, view),
        view,
        positions,
    }));

    const nodesByDomain = Object.fromEntries(
        domains.map((domain) => [domain.id, domain.nodes.map((node) => node.id)]),
    );

    return { domains, links: CROSS_TRACE_LINKS, nodesByDomain };
};
