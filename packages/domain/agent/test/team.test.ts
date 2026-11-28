import { describe, expect, it } from 'vitest';
import {
    reduceTeam,
    teamPanelHTML,
    teamScopeStats,
    type TeamAgent,
    type TeamState,
} from '../src/team';

const agents: readonly TeamAgent[] = [
    {
        id: 'lead',
        label: 'lead',
        role: 'coordinator',
        status: 'working',
        tool: 'plan()',
        tokens: 1200,
        files: ['AGENTS.md'],
    },
    {
        id: 'tester',
        label: 'tester',
        role: 'verifier',
        status: 'blocked',
        tool: 'test()',
        tokens: 400,
        files: ['t.test.ts'],
    },
];
const state: TeamState = { active: 'lead', scope: ['lead'], log: ['lead started'] };

describe('agent team model', () => {
    it('aggregates only scoped agents', () => {
        expect(teamScopeStats(agents, ['tester'])).toEqual({
            count: 1,
            tokens: 400,
            blocked: 1,
            labels: ['tester'],
        });
        expect(teamScopeStats(agents, []).tokens).toBe(0);
    });

    it('reduces steer and approve into the log without inventing facts', () => {
        const steered = reduceTeam(state, { type: 'steer', agentID: 'tester', text: 'run unit' });
        expect(steered.active).toBe('tester');
        expect(steered.log.at(-1)).toBe('operator: run unit');
        expect(state.log).toEqual(['lead started']);
        expect(reduceTeam(steered, { type: 'approve', agentID: 'tester' }).log.at(-1)).toBe(
            'operator approved tester',
        );
    });

    it('renders escaped agent chrome and derived links', () => {
        const html = teamPanelHTML({
            model: {
                operator: 'op',
                agents,
                links: [{ id: 'e1', source: 'lead', target: 'tester', kind: 'delegates' }],
            },
            state,
            stats: teamScopeStats(agents, ['lead']),
        });
        expect(html).toContain('data-team-agent="lead" data-active="true"');
        expect(html).toContain('lead → tester · delegates');
        expect(html).toContain('1 scoped · 1200 tokens · 0 blocked');
        expect(
            teamPanelHTML({
                model: { operator: '<img>', agents: [], links: [] },
                state,
                stats: teamScopeStats(agents, []),
            }),
        ).toContain('&lt;img&gt;');
    });
});
