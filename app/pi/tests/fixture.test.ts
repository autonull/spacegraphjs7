// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    agentDomain,
    changedFiles,
    delegationContributions,
    downstream,
    failureDetails,
    ledHere,
    why,
} from '@spacegraphjs/agent';
import { DEFAULT_THEME } from '@spacegraphjs/renderer';
import { CAPABILITIES, capabilityContext, runCapability } from '../src/capabilities';
import {
    chaptersFixtureKernel,
    fixtureID,
    fixtureKernel,
    fixtureOps,
    richFixtureKernel,
    richFixtureOps,
} from '../src/fixture';
import { innerTree } from '../src/inner';

const kernel = fixtureKernel();
const view = agentDomain.build(kernel);
const context = capabilityContext(kernel, view, DEFAULT_THEME);

const sorted = (values: Iterable<string>): readonly string[] => [...values].sort();

describe('canonical fixture', () => {
    it('contains every investigative situation without inferred causes', () => {
        const kinds = new Set(view.nodes.map((node) => node.kind));
        for (const kind of ['artifact', 'action', 'retry', 'delegates', 'state']) {
            expect([...kinds, ...view.edges.map((edge) => edge.kind)]).toContain(kind);
        }
        expect(fixtureOps().some((op) => op.op === 'add-edge' && op.edge.kind === 'inferred-cause')).toBe(false);
        expect(changedFiles(view).map((file) => file.path)).toEqual(['src/auth/session.ts', 'test-report.md']);
    });

    it('pins the answer to each of the five questions byte-for-byte', () => {
        const failure = fixtureID('local', 'run-tests');
        expect(sorted(why(view, fixtureID('local', 'f-session')).answerIds)).toEqual([
            fixtureID('local', '2'),
            fixtureID('local', 'delegate'),
            fixtureID('local', 'run'),
            fixtureID('local', 'subagent-fix'),
        ]);
        expect(sorted(ledHere(view, failure).answerIds)).toEqual([
            fixtureID('local', 'answer'),
            fixtureID('local', 'delegate'),
            fixtureID('local', 'subagent-fix'),
            fixtureID('local', 'verify'),
        ]);
        expect(delegationContributions(view, fixtureID('local', 'delegate'))).toEqual([
            fixtureID('local', 'subagent-fix'),
        ]);
        expect(sorted([...downstream(view, failure).answerIds].filter((id) => id.endsWith('f-session') || id.endsWith('f-report')))).toEqual([
            fixtureID('local', 'f-report'),
            fixtureID('local', 'f-session'),
        ]);
        expect(sorted(failureDetails(view).map((item) => item.id))).toEqual([
            fixtureID('local', '1'),
            fixtureID('local', '1:retry'),
            failure,
        ]);
    });

    it('builds a deterministic showcase kernel denser than the canonical fixture', () => {
        const rich = richFixtureKernel();
        expect(rich.nodes.length).toBeGreaterThan(kernel.nodes.length);
        expect(rich.nodes.length).toBe(richFixtureKernel().nodes.length);
        expect(richFixtureOps().some((op) => op.op === 'add-edge' && op.edge.kind === 'inferred-cause')).toBe(false);
        expect(rich.nodes.some((node) => node.kind === 'approval')).toBe(true);
        expect(rich.nodes.some((node) => node.kind === 'error')).toBe(true);
    });

    it('gives the chapters shot two work chips per late turn card', () => {
        const chapters = agentDomain.build(chaptersFixtureKernel());
        for (const turn of ['x3', 'x4']) {
            const chips = innerTree(fixtureID('local', turn), chapters.nodes, chapters.edges, 2, 8).filter(
                (chip) => chip.kind !== 'run',
            );
            expect(chips.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('publishes each question as a deterministic capability', () => {
        const ids = CAPABILITIES.map((entry) => entry.id);
        expect(ids).toContain('question-1');
        expect(ids).toContain('question-5');
        expect(ids).toContain('five-questions');
        for (const id of ids.filter((entry) => entry.startsWith('question-'))) {
            expect(runCapability(id, context)).toEqual(expect.arrayContaining([expect.stringMatching(/:\s*\S+/)]));
        }
        expect(runCapability('five-questions', context)).toHaveLength(10);
    });
});
