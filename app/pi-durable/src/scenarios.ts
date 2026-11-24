import type { KernelOp } from '@spacegraphjs/kernel';
import {
    translateView,
    type DurableEntry,
    type DurableTask,
    type DurableView,
} from './translator';

export type ScenarioTier = 'Core' | 'Next';
export type ViewName = 'graph' | 'tasks' | 'timeline' | 'diff' | 'trace' | 'docs' | 'transcript';
export const VIEW_NAMES: readonly ViewName[] = [
    'graph', 'tasks', 'timeline', 'diff', 'trace', 'docs', 'transcript',
];

export type Scenario = {
    readonly id: string;
    readonly title: string;
    readonly question: string;
    readonly description: string;
    readonly tier: ScenarioTier;
    readonly row: string;
    readonly rail: ViewName;
    readonly view: DurableView;
    readonly tasks: readonly DurableTask[];
    readonly extraOps?: readonly KernelOp[];
    readonly fork?: boolean;
    readonly expected: {
        readonly nodes: readonly string[];
        readonly edges: readonly string[];
    };
    readonly test: string;
};

const message = (id: string, role: 'user' | 'assistant' | 'system', content: string): DurableEntry => ({
    id,
    kind: role === 'system' ? 'pi.system' : `pi.${role}`,
    model: [{ role, content }],
});

const tool = (id: string, name: string): DurableEntry => ({
    id,
    kind: 'pi.tool-result',
    model: [{ role: 'tool', content: [{ type: 'text', text: `${name} ok` }] }],
    data: { toolName: name, status: 'complete' },
});

const boundary = (id: string, kind: string, head?: string): DurableEntry => ({
    id,
    kind,
    head,
    model: [{ role: 'system', content: `${kind} boundary` }],
});

const sleeping = (id: string): DurableTask => ({
    id,
    kind: 'durable.approval',
    state: {
        status: 'sleeping',
        phase: 'ask',
        signals: [{ signal: 'durable.approval', key: 'approve' }],
        until: Date.UTC(2030, 0, 1),
    },
});

const answered = (id: string): DurableTask => ({
    id,
    kind: 'durable.approval',
    state: { status: 'terminal', phase: 'answered', outcome: 'completed' },
});

const base = (id: string, question: string, answer: string, docs: DurableView['docs'] = {}): DurableView => ({
    conversation: { id: Number(id) || 1 },
    entries: [message(`${id}-user`, 'user', question), message(`${id}-answer`, 'assistant', answer)],
    docs: {
        'pi.agent': { model: { provider: 'faux', modelId: 'faux-1' } },
        'pi.provider': { sessionId: id },
        'pi.usage': { totalTokens: 8 },
        'pi.inbox': { items: [] },
        'pi.live': {},
        ...docs,
    },
});

const scenario = (
    value: Omit<Scenario, 'view' | 'tasks' | 'expected'> & {
        readonly view?: DurableView;
        readonly tasks?: readonly DurableTask[];
        readonly expected?: Scenario['expected'];
    },
): Scenario => {
    const id = value.id;
    const view = value.view ?? base(id, value.question, value.description);
    const tasks = value.tasks ?? [];
    const prefix = `d:${view.conversation.id}`;
    return {
        ...value,
        view,
        tasks,
        expected: value.expected ?? {
            nodes: [`${prefix}:conversation`, `${prefix}:entry:${id}-user`, `${prefix}:entry:${id}-answer`],
            edges: ['orders'],
        },
    };
};

/** One named, deterministic scenario per coverage row in TODO12 §2. */
export const SCENARIOS: readonly Scenario[] = [
    scenario({
        id: 'basic-turn', title: 'One durable turn', question: 'Capital of France?',
        description: 'A faux answer committed as an assistant entry.', tier: 'Core', row: 'Quick Start',
        rail: 'graph', view: base('1', 'Capital of France?', 'Paris.'), tasks: [sleeping('2')],
        test: 'first-run.spec.ts',
        expected: { nodes: ['d:1:conversation', 'd:1:entry:1-user', 'd:1:entry:1-answer', 'd:1:task:2'], edges: ['orders'] },
    }),
    scenario({
        id: 'sleeping-approval', title: 'A parked approval', question: 'Allow the sleeping task to wake?',
        description: 'A task asleep on the approve signal with a deadline.', tier: 'Core', row: 'Hooks',
        rail: 'tasks', view: base('1', 'Allow the sleeping task to wake?', 'Waiting on approval.'),
        tasks: [sleeping('2')], test: 'first-run.spec.ts',
        expected: { nodes: ['d:1:task:2', 'd:1:signal:approve'], edges: ['sleeps-on'] },
    }),
    scenario({
        id: 'fork-tabs', title: 'Forked tabs', question: 'Can two conversations stay open with independent state?',
        description: 'A child conversation with a fork edge back to its source.', tier: 'Core',
        row: 'More Conversations and Forks', rail: 'graph', fork: true,
        view: base('2', 'Capital of France?', 'Paris.'), test: 'tabs.test.ts',
        expected: { nodes: ['d:2:fork'], edges: ['fork', 'forkedFrom'] },
    }),
    scenario({
        id: 'resumed', title: 'Resumed without duplicates', question: 'Does a retried request id produce one answer?',
        description: 'A reopened conversation with a settled submission.', tier: 'Core',
        row: 'Persist and Resume', rail: 'graph',
        view: base('1', 'Capital of France?', 'Paris.'), tasks: [answered('2')], test: 'first-run.spec.ts',
        expected: { nodes: ['d:1:task:2'], edges: ['orders'] },
    }),
    scenario({
        id: 'task-graph', title: 'Task graph', question: 'Can I see committed task owners and waits?',
        description: 'The same kernel placed as a task view.', tier: 'Next', row: 'Task Graph',
        rail: 'tasks', view: base('1', 'What can this workspace show?', 'Durable facts, navigable as a graph.'),
        tasks: [sleeping('2')], test: 'first-run.spec.ts',
        expected: { nodes: ['d:1:task:2', 'd:1:signal:approve'], edges: ['sleeps-on'] },
    }),
    scenario({
        id: 'timeline', title: 'Timeline', question: 'Can I read the committed transcript in order?',
        description: 'The same kernel placed as an ordered timeline.', tier: 'Next', row: 'Watching a Conversation',
        rail: 'timeline', view: base('1', 'What can this workspace show?', 'Durable facts, navigable as a graph.'),
        tasks: [sleeping('2')], test: 'first-run.spec.ts',
        expected: { nodes: ['d:1:entry:1-user', 'd:1:entry:1-answer'], edges: ['orders'] },
    }),
    scenario({
        id: 'busy-inbox', title: 'Busy inbox', question: 'Can steers queue while a run is busy?',
        description: 'Two inbox submissions parked before delivery.', tier: 'Next', row: 'Busy Conversations',
        rail: 'graph', view: base('1', 'Steer while busy', 'Queued.', {
            'pi.inbox': { items: [{ id: 'steer-1' }, { id: 'follow-2' }] },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:inbox:steer-1', 'd:1:inbox:follow-2'], edges: ['orders'] },
    }),
    scenario({
        id: 'extension-section', title: 'Extension sections', question: 'Can an extension add sections and hooks?',
        description: 'A registered section with a beforeTool hook and a task.', tier: 'Next', row: 'Extensions',
        rail: 'graph', view: base('1', 'Load an extension', 'Section registered.', {
            'pi.extension': { name: 'terse', sections: ['answer'], hooks: ['beforeTool'], wraps: [], tasks: ['durable.approval'] },
        }), tasks: [sleeping('2')], test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:extension'], edges: ['sleeps-on'] },
    }),
    scenario({
        id: 'tool-call', title: 'Tool call', question: 'Does a tool result become an action node?',
        description: 'One committed tool call with a text result.', tier: 'Next', row: 'Tools',
        rail: 'graph', view: {
            ...base('1', 'Read a file', 'Read.'),
            entries: [message('1-user', 'user', 'Read a file'), tool('1-tool', 'read'), message('1-answer', 'assistant', 'Read.')],
        }, test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:tool:1-tool'], edges: ['orders'] },
    }),
    scenario({
        id: 'system-prompt', title: 'System prompt', question: 'Are instructions a committed entry?',
        description: 'A system entry with instructions and a positional message.', tier: 'Next', row: 'System Prompt',
        rail: 'graph', view: {
            ...base('1', 'Follow the style guide', 'Done.', { 'pi.instructions': { style: 'terse', position: 'head' } }),
            entries: [message('1-system', 'system', 'Answer in one line.'), message('1-user', 'user', 'Follow the style guide'), message('1-answer', 'assistant', 'Done.')],
        }, test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:entry:1-system', 'd:1:instructions'], edges: ['orders'] },
    }),
    scenario({
        id: 'agent-settings', title: 'Per-conversation agent', question: 'Can a tab keep its own agent?',
        description: 'A conversation-level agent and provider document.', tier: 'Next', row: 'Per-Conversation Agent',
        rail: 'graph', view: base('1', 'Use the terse agent', 'Terse.', {
            'pi.agent': { model: { provider: 'faux', modelId: 'faux-terse' }, maxTurns: 2 },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:agent', 'd:1:provider'], edges: ['orders'] },
    }),
    scenario({
        id: 'configure', title: 'Settings', question: 'Can settings round-trip through the session?',
        description: 'Compaction, modes and afterFailedRun in a settings document.', tier: 'Next', row: 'Settings',
        rail: 'graph', view: base('1', 'Configure the run', 'Configured.', {
            'pi.settings': { compaction: { keepRecentTokens: 200 }, modes: ['steer'], afterFailedRun: 'retry' },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:settings'], edges: ['orders'] },
    }),
    scenario({
        id: 'environment', title: 'Environment', question: 'Is the execution environment inspectable?',
        description: 'A cwd and environment document with no host filesystem.', tier: 'Next', row: 'Environment',
        rail: 'graph', view: base('1', 'Inspect the environment', 'cwd: /workspace.', {
            'pi.env': { cwd: '/workspace', keys: ['PATH', 'PI_DURABLE_FAUX_SEED'] },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:env'], edges: ['orders'] },
    }),
    scenario({
        id: 'reload-extension', title: 'Reload extension', question: 'Can an installed extension be replaced?',
        description: 'A second registry install shown as one updated config node.', tier: 'Next', row: 'Reload',
        rail: 'graph', view: base('1', 'Reload the extension', 'Replaced.', {
            'pi.extension': { name: 'terse', version: 2, reloaded: true },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:extension'], edges: ['orders'] },
    }),
    scenario({
        id: 'reset-handoff', title: 'Reset and handoff', question: 'Does a handoff keep its boundary id?',
        description: 'A reset entry that hands control to a new context.', tier: 'Next', row: 'Reset and Handoff',
        rail: 'timeline', view: {
            ...base('1', 'Hand off to a new run', 'Handed off.'),
            entries: [
                message('1-user', 'user', 'Hand off to a new run'),
                boundary('1-reset', 'pi.reset', '1-user'),
                message('1-answer', 'assistant', 'Handed off.'),
            ],
        }, test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:entry:1-reset'], edges: ['checkpoint', 'orders'] },
    }),
    scenario({
        id: 'compaction', title: 'Compaction', question: 'Can a compacted transcript stay navigable?',
        description: 'A compaction boundary with a head and a recent-token window.', tier: 'Next', row: 'Compaction',
        rail: 'timeline', view: {
            ...base('1', 'Compact this conversation', 'Compacted.', {
                'pi.settings': { compaction: { head: '1-user', keepRecentTokens: 50 } },
            }),
            entries: [message('1-user', 'user', 'Compact this conversation'), boundary('1-compact', 'pi.compaction', '1-user'), message('1-answer', 'assistant', 'Compacted.')],
        }, test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:entry:1-compact'], edges: ['checkpoint'] },
    }),
    scenario({
        id: 'agent-events', title: 'Agent events', question: 'Are span events kept off the causal graph?',
        description: 'pi.durable spans recorded as trace data, never as edges.', tier: 'Next', row: 'Agent Events',
        rail: 'graph', view: base('1', 'Trace the run', 'Traced.', {
            'pi.trace': { spans: ['pi.durable.tool.call', 'pi.durable.llm.stream'] },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:trace'], edges: ['orders'] },
    }),
    scenario({
        id: 'subagent-report', title: 'Subagent report', question: 'Does a child report back to its owner?',
        description: 'A foreground child with a delegates edge and a report-back id.', tier: 'Next',
        row: 'Abort and Subagents', rail: 'tasks', view: base('1', 'Delegate a question', 'Reported.', {
            'pi.inbox': { items: [] },
        }), tasks: [
            { id: '2', kind: 'durable.research', state: { status: 'running', mode: 'foreground' }, delegates: ['3'], reportBack: '2' },
            { id: '3', kind: 'durable.research', state: { status: 'complete', outcome: 'reported' }, owner: '2', reportBack: '2' },
        ], test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:task:2', 'd:1:task:3'], edges: ['delegates', 'owns'] },
    }),
    scenario({
        id: 'checkout-children', title: 'Child tasks', question: 'Can child tasks restart or abort independently?',
        description: 'Two owned children with failFast, an attempt, and a wait edge.', tier: 'Next',
        row: 'Child Tasks', rail: 'tasks', view: base('1', 'Check out child tasks', 'Checked.', {
            'pi.inbox': { items: [] },
        }), tasks: [
            { id: '2', kind: 'durable.checkout', state: { status: 'running', failFast: true } },
            { id: '3', kind: 'durable.checkout', owner: '2', background: true, state: { status: 'waiting', on: ['2'], attempt: 2 } },
        ], test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:task:2', 'd:1:task:3'], edges: ['owns', 'waiting.on'] },
    }),
    scenario({
        id: 'app-state', title: 'Host-owned documents', question: 'Can host state be shown without becoming a fact?',
        description: 'A deferred app.todos document rendered beside committed facts.', tier: 'Next',
        row: 'Your Own State', rail: 'graph', view: base('1', 'Track host todos', 'Tracked.', {
            'app.todos': { items: [{ id: 't1', text: 'Review draft', done: false }] },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:app.todos'], edges: ['orders'] },
    }),
    scenario({
        id: 'usage', title: 'Usage and cost', question: 'Can token usage be inspected offline?',
        description: 'A pi.usage document with tokens and an estimated cost.', tier: 'Next', row: 'Usage and Cost',
        rail: 'graph', view: base('1', 'Show usage', '8 tokens.', {
            'pi.usage': { totalTokens: 8, inputTokens: 5, outputTokens: 3, cost: 0.0002 },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:usage'], edges: ['orders'] },
    }),
    scenario({
        id: 'typed-errors', title: 'Typed errors', question: 'Does a run failure offer a recovery action?',
        description: 'A turn_limit failure with a typed reason and recovery.', tier: 'Core', row: 'Errors',
        rail: 'graph', view: base('1', 'Hit the turn limit', 'Stopped.', {
            'pi.error': { reason: 'turn_limit', recovery: 'raise maxTurns and retry' },
        }), test: 'scenarios.test.ts',
        expected: { nodes: ['d:1:error'], edges: ['orders'] },
    }),
    scenario({
        id: 'diff', title: 'Tab diff', question: 'What changed between this tab and its peer?',
        description: 'A child tab compared with its parent through diffKernels.', tier: 'Next',
        row: 'More Conversations and Forks', rail: 'diff', fork: true,
        view: base('2', 'Capital of France?', 'Paris.'), test: 'representations.spec.ts',
        expected: { nodes: ['d:2:fork'], edges: ['fork', 'forkedFrom'] },
    }),
    scenario({
        id: 'trace', title: 'Trace facet', question: 'Can spans be read without inventing causes?',
        description: 'pi.durable spans shown as a trace facet with no edges.', tier: 'Next',
        row: 'Agent Events', rail: 'trace',
        view: base('1', 'Trace the run', 'Traced.', {
            'pi.trace': { spans: ['pi.durable.tool.call', 'pi.durable.llm.stream', 'pi.durable.session.prompt'] },
        }), test: 'representations.spec.ts',
        expected: { nodes: ['d:1:trace'], edges: ['orders'] },
    }),
    scenario({
        id: 'docs', title: 'Documents', question: 'Can built-in and host documents stay distinct?',
        description: 'Documents rendered as committed or deferred, never as facts.', tier: 'Next',
        row: 'Design Documents', rail: 'docs',
        view: base('1', 'Inspect documents', 'Inspected.', {
            'pi.inbox': { items: [] },
            'app.todos': { items: [{ id: 't1', text: 'Review draft', done: false }] },
        }), test: 'representations.spec.ts',
        expected: { nodes: ['d:1:usage', 'd:1:app.todos', 'd:1:agent'], edges: ['orders'] },
    }),
    scenario({
        id: 'transcript', title: 'Transcript', question: 'Can the committed transcript carry boundaries and heads?',
        description: 'Ordered entries with compact text, a tool result and a checkpoint.',
        tier: 'Next', row: 'Watching a Conversation', rail: 'transcript',
        view: {
            ...base('1', 'Compact this transcript', 'Compacted.'),
            entries: [
                message('1-user', 'user', 'Compact this transcript'),
                tool('1-tool', 'read'),
                boundary('1-compact', 'pi.compaction', '1-user'),
                message('1-answer', 'assistant', 'Compacted.'),
            ],
        }, test: 'representations.spec.ts',
        expected: { nodes: ['d:1:tool:1-tool', 'd:1:entry:1-compact'], edges: ['orders', 'checkpoint'] },
    }),
];

export const scenarioByID = (id: string | null | undefined): Scenario | undefined =>
    SCENARIOS.find((entry) => entry.id === id);

export const CORE_SCENARIOS = SCENARIOS.filter((entry) => entry.tier === 'Core');
export const NEXT_SCENARIOS = SCENARIOS.filter((entry) => entry.tier === 'Next');

/** Every row in TODO12 §2 that claims Core coverage names a scenario and its test. */
export const CORE_COVERAGE: readonly { readonly row: string; readonly scenario: string; readonly test: string }[] = [
    { row: 'Installation', scenario: 'basic-turn', test: 'first-run.spec.ts' },
    { row: 'Quick Start', scenario: 'basic-turn', test: 'first-run.spec.ts' },
    { row: 'Concepts', scenario: 'basic-turn', test: 'translator.test.ts' },
    { row: 'Persist and Resume', scenario: 'resumed', test: 'first-run.spec.ts' },
    { row: 'Storage', scenario: 'basic-turn', test: 'first-run.spec.ts' },
    { row: 'Watching a Conversation', scenario: 'basic-turn', test: 'first-run.spec.ts' },
    { row: 'Busy Conversations', scenario: 'busy-inbox', test: 'scenarios.test.ts' },
    { row: 'Hooks', scenario: 'sleeping-approval', test: 'first-run.spec.ts' },
    { row: 'Errors', scenario: 'typed-errors', test: 'scenarios.test.ts' },
    { row: 'More Conversations and Forks', scenario: 'fork-tabs', test: 'tabs.test.ts' },
    { row: 'Task Graph', scenario: 'sleeping-approval', test: 'first-run.spec.ts' },
    { row: 'Design Documents', scenario: 'basic-turn', test: 'scenarios.test.ts' },
];

/** Translate a scenario without depending on a live server; the test boundary owns the fixtures. */
export const scenarioOps = (value: Scenario): readonly KernelOp[] => [
    ...translateView(value.view.conversation.id, value.view, value.tasks),
    ...(value.extraOps ?? []),
];
