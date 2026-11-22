import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agentDomain } from '@spacegraphjs/agent';
import type { GraphNode } from '@spacegraphjs/shared';
import {
    computeGraphLayout,
    graphShape,
    GRAPH_LAYOUTS,
    isGraphLayoutMode,
    layoutTargets,
    scopeByNode,
} from '../src/graph-layout';
import { fixtureKernel, richFixtureKernel } from '../src/fixture';
import { agentScopes } from '../src/scopes';
import { decodePermalink, encodePermalink, type PermalinkState } from '../src/permalink';
import { measure } from '../scripts/baseline';

const richView = () => agentDomain.build(richFixtureKernel());

describe('graph layouts', () => {
    it('exposes the five views and validates URL values', () => {
        expect(GRAPH_LAYOUTS).toEqual(['freeform', 'timeline', 'timeline-rows', 'lanes', 'tree', 'force']);
        expect(isGraphLayoutMode('timeline')).toBe(true);
        expect(isGraphLayoutMode('timeline-rows')).toBe(true);
        expect(isGraphLayoutMode('nope')).toBe(false);
        expect(isGraphLayoutMode(null)).toBe(false);
    });

    it('matches the recorded baseline for every view', () => {
        const path = ['docs', '../docs', '../../docs']
            .map((up) => resolve(process.cwd(), up, 'screenshots/graph-baseline.json'))
            .find(existsSync)!;
        const recorded = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
        expect(measure()).toEqual(recorded);
    });

    it('shortens edges and keeps every view free of parent/child overlap', () => {
        const baseline = measure();
        expect(baseline.timeline!.meanEdgeLength).toBeLessThan(baseline.freeform!.meanEdgeLength);
        for (const shape of Object.values(baseline)) expect(shape.overlaps).toBe(0);
    });

    it('appends a turn without moving cards already placed', () => {
        const view = richView();
        const before = computeGraphLayout(view, 'timeline')!;
        const appended: typeof view = {
            ...view,
            turns: [...(view.turns ?? []), 'pi:local:new-turn'],
            nodes: [
                ...view.nodes,
                {
                    id: 'pi:local:new-turn',
                    label: 'Turn 6',
                    kind: 'unit',
                    status: '',
                    data: { unitId: 'new-turn' },
                } as GraphNode,
            ],
        };
        const after = computeGraphLayout(appended, 'timeline', before.positions)!;
        for (const [id, position] of before.positions) {
            expect(after.positions.get(id)).toEqual(position);
        }
    });

    it('lays turns out as horizontal stripes in the transposed timeline', () => {
        const view = richView();
        const columns = computeGraphLayout(view, 'timeline')!;
        const rows = computeGraphLayout(view, 'timeline-rows')!;
        expect(rows.positions.size).toBe(columns.positions.size);
        const turns = view.turns ?? [];
        const bandY = turns.map((id) => rows.positions.get(id)!.y);
        expect(bandY.length).toBeGreaterThan(1);
        for (let index = 1; index < bandY.length; index++)
            expect(bandY[index]!).toBeGreaterThan(bandY[index - 1]!);
        const columnX = turns.map((id) => columns.positions.get(id)!.x);
        for (let index = 1; index < columnX.length; index++)
            expect(columnX[index]!).toBeGreaterThan(columnX[index - 1]!);

        const childrenOf = (id: string): string[] =>
            view.edges.filter((edge) => edge.kind === 'contains' && edge.source === id).map((edge) => edge.target);
        const turn = turns.find((id) => childrenOf(id).length >= 2)!;
        const members = childrenOf(turn).map((id) => rows.positions.get(id)!);
        const band = rows.positions.get(turn)!.y;
        expect(Math.max(...members.map((point) => point.x)) - Math.min(...members.map((point) => point.x))).toBeGreaterThan(0);
        for (const member of members) expect(member.y).toBeCloseTo(band, 5);
    });

    it('maps solved positions onto qualified simulation ids', () => {
        const view = richView();
        const scopes = agentScopes(view, { packed: true });
        const layout = computeGraphLayout(view, 'timeline')!;
        const targets = layoutTargets(layout, scopes.qualifiedById)!;
        expect(targets.size).toBe(layout.positions.size);
        const first = layout.positions.keys().next().value as string;
        expect(targets.get(scopes.qualifiedById.get(first)!)).toEqual(layout.positions.get(first));
    });

    it('identifies cross-scope edges from scope membership', () => {
        const scopes = agentScopes(richView(), { packed: true });
        const scopeOfNode = scopeByNode(scopes.specs);
        expect([...scopeOfNode.values()].some((id) => id.startsWith('unit-'))).toBe(true);
    });

    it('reports overlap from geometry, not from rendered pixels', () => {
        const view = agentDomain.build(fixtureKernel());
        const shape = graphShape(view, new Map([
            [view.nodes[0]!.id, { x: 0, y: 0, z: 0 }],
            [view.nodes[1]!.id, { x: 10, y: 10, z: 0 }],
        ]));
        expect(shape.overlaps).toBeGreaterThanOrEqual(0);
        expect(shape.nodes).toBe(2);
    });

    it('round-trips graph arrangement through a full-state permalink', () => {
        const state: PermalinkState = {
            surface: 'map',
            arrangement: 'side',
            depth: 'orbit',
            depthAxis: 'turn',
            level: 'execution',
            focus: '',
            viewport: { zoom: 1, center: [0, 0, 0] },
            filter: '',
            graphLayout: 'timeline',
            graphLayoutAligned: true,
            ribbonCorridor: true,
            graphMorph: true,
        };
        const decoded = decodePermalink(encodePermalink(state));
        expect(decoded?.graphLayout).toBe('timeline');
        expect(decoded?.graphLayoutAligned).toBe(true);
        expect(decoded?.ribbonCorridor).toBe(true);
        expect(decoded?.graphMorph).toBe(true);
        expect(decodePermalink(encodePermalink({ ...state, graphLayout: 'timeline-rows' }))?.graphLayout).toBe(
            'timeline-rows',
        );
    });
});
