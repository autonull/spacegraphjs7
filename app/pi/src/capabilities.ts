import { buildManifest } from '@spacegraphjs/config';
import { libraryManifest, LIBRARY_CONTRACT_VERSION } from '@spacegraphjs/config/library';
import { agentDomain, agentFacetAccessors, agentVocabulary } from '@spacegraphjs/agent';
import {
    changedFiles,
    delegationContributions,
    downstream,
    failureDetails,
    ledHere,
    why,
} from '@spacegraphjs/agent';
import { KernelCodec, type Kernel } from '@spacegraphjs/kernel';
import { applyFacets } from '@spacegraphjs/search';
import type { GraphFacets } from '@spacegraphjs/shared';
import type { AgentView } from '@spacegraphjs/agent';
import type { RenderTheme } from '@spacegraphjs/renderer';

export type PiHostState = {
    readonly projection: string;
    readonly depth: string;
    readonly depthSupported: boolean;
    readonly level: string;
    readonly arrangement: string;
    readonly scopes: number;
    readonly simulation: { readonly settled: boolean; readonly energy: number; readonly steps: number };
    readonly motion: { readonly verbs: readonly string[]; readonly active: readonly string[] };
};

export type CapabilityContext = {
    readonly kernel: Kernel;
    readonly view: AgentView;
    readonly theme: RenderTheme;
    readonly follow?: { readonly mode: string; readonly frame: string };
    readonly host?: PiHostState;
};

export type Capability = {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly run: (context: CapabilityContext) => readonly string[];
};

const target = (view: AgentView, kind: string): string =>
    view.nodes.find((node) => node.kind === kind)?.id ?? view.nodes[0]?.id ?? '';

const emptyFacets: GraphFacets = {
    query: '',
    kinds: new Set(),
    statuses: new Set(),
    domains: new Set(),
};

const labelOf = (view: AgentView, id: string): string =>
    view.nodes.find((node) => node.id === id)?.label ?? id;
const labels = (view: AgentView, values: Iterable<string>): string => {
    const byID = new Map(view.nodes.map((node) => [node.id, node]));
    return [...values].map((id) => byID.get(id)?.label ?? id).join(', ') || 'none';
};
const nodeWith = (view: AgentView, predicate: (node: AgentView['nodes'][number]) => boolean) =>
    view.nodes.find(predicate)?.id ?? '';
const failingAction = (view: AgentView): string =>
    failureDetails(view).find((failure) => failure.id.endsWith(':retry') === false && byKind(view, failure.id) === 'action')?.id ?? '';
const byKind = (view: AgentView, id: string): string =>
    view.nodes.find((node) => node.id === id)?.kind ?? '';

const QUESTION_IDS = ['question-1', 'question-2', 'question-3', 'question-4', 'question-5'] as const;

export const CAPABILITIES: readonly Capability[] = [
    {
        id: 'stream',
        title: 'Kernel op stream',
        summary: 'Pi events become kernel ops; the client folds them into a Kernel.',
        run: ({ kernel }) => [
            `${kernel.nodes.length} nodes, ${kernel.edges.length} edges`,
            `version ${kernel.version}`,
            `diagnostics: ${JSON.stringify(kernel.diagnostics())}`,
        ],
    },
    {
        id: 'vocabulary',
        title: 'Open-ended agent vocabulary',
        summary: 'String kinds and advisory role tags; no host enum.',
        run: ({ view }) => [
            `kinds: ${[...new Set(view.nodes.map((node) => node.kind))].join(', ')}`,
            `lanes: ${agentVocabulary.lanes?.join(', ')}`,
            `domain: ${agentDomain.id}`,
        ],
    },
    {
        id: 'why',
        title: 'Why did this happen?',
        summary: 'Answer nodes behind an artifact through provenance edges.',
        run: ({ view }) => {
            const id = target(view, 'artifact');
            const trace = why(view, id);
            return [`from ${id}`, `answers: ${[...trace.answerIds].join(', ') || 'none'}`];
        },
    },
    {
        id: 'led-here',
        title: 'What led here?',
        summary: 'Forward sequence from the first unit.',
        run: ({ view }) => {
            const trace = ledHere(view, target(view, 'unit'));
            return [`answers: ${[...trace.answerIds].join(', ') || 'none'}`];
        },
    },
    {
        id: 'downstream',
        title: 'What came downstream?',
        summary: 'Sequence, writes and delegation edges.',
        run: ({ view }) => {
            const trace = downstream(view, target(view, 'action'));
            return [`answers: ${[...trace.answerIds].join(', ') || 'none'}`];
        },
    },
    {
        id: 'failures',
        title: 'Which actions failed?',
        summary: 'Failed statuses and retry nodes, with their turn context.',
        run: ({ view }) => {
            const found = failureDetails(view);
            return found.length
                ? found.map((failure) => `${failure.id} · turn ${failure.turnNumber || '?'} · ${failure.label}`)
                : ['failures: none'];
        },
    },
    {
        id: 'artifacts',
        title: 'Which files changed?',
        summary: 'Artifacts reached through writes edges, with their writers and readers.',
        run: ({ view }) => {
            const files = changedFiles(view);
            return files.length
                ? files.map((file) => `${file.path} · ${file.writers.length} writer(s) · ${file.readers.length} reader(s)`)
                : ['changed: none'];
        },
    },
    {
        id: 'follow',
        title: 'Live follow framing',
        summary: 'computeFollowFrame moves the camera to the newest node in a stream.',
        run: ({ follow }) => [
            `mode ${follow?.mode ?? 'off'}`,
            `last frame ${follow?.frame ?? 'none'}`,
        ],
    },
    {
        id: 'delegation',
        title: 'Delegation contributions',
        summary: 'Nested actions connected by delegates edges.',
        run: ({ view }) => {
            const id = target(view, 'action');
            return [`contributions: ${delegationContributions(view, id).join(', ') || 'none'}`];
        },
    },
    {
        id: 'facets',
        title: 'Faceted filtering',
        summary: 'The library filters the agent model through host accessors.',
        run: ({ view }) => {
            const result = applyFacets({ model: view, facets: emptyFacets, accessors: agentFacetAccessors });
            return [`kept ${result.nodes.length} of ${view.nodes.length} nodes`];
        },
    },
    {
        id: 'manifest',
        title: 'Manifest negotiation',
        summary: 'Library and domain contributions share one manifest.',
        run: () => {
            const manifest = buildManifest(LIBRARY_CONTRACT_VERSION, [
                ...libraryManifest().entries,
                ...agentDomain.manifest(),
            ]);
            return [`${manifest.entries.length} entries at contract ${manifest.contractVersion}`];
        },
    },
    {
        id: 'export',
        title: 'Kernel export',
        summary: 'The stream is portable through the kernel codec.',
        run: ({ kernel }) => [`${KernelCodec.encode(kernel).length} bytes encoded`],
    },
    {
        id: 'theme',
        title: 'Theme and contrast',
        summary: 'Host tokens resolve to a RenderTheme.',
        run: ({ theme }) => [
            `background ${theme.background}`,
            `accent ${theme.accent}`,
            `direction ${theme.direction ?? 'ltr'}`,
        ],
    },
    {
        id: 'freeform-layout',
        title: 'Freeform layout',
        summary: 'Seeded zero-gravity forces cool to a settled, reproducible rest state.',
        run: ({ host }) => [
            `simulation ${host?.simulation.settled ? 'settled' : 'moving'}`,
            `energy ${host?.simulation.energy.toFixed(4) ?? 'n/a'} · steps ${host?.simulation.steps ?? 'n/a'}`,
            `projection ${host?.projection ?? 'n/a'}`,
        ],
    },
    {
        id: 'scopes',
        title: 'Recursive scopes',
        summary: 'Runs, turns and delegated subtrees are independent scope bodies.',
        run: ({ host, view }) => [
            `scopes ${host?.scopes ?? 0}`,
            `turns ${(view.turns ?? []).length}`,
            `delegations ${view.edges.filter((edge) => edge.kind === 'delegates').length}`,
        ],
    },
    {
        id: 'levels',
        title: 'Semantic levels',
        summary: 'Overview, execution and detail levels own their own DOM card budgets.',
        run: ({ host }) => [
            `level ${host?.level ?? 'execution'}`,
            'budgets overview 12 · execution 40 · detail 24',
            `arrangement ${host?.arrangement ?? 'side'}`,
        ],
    },
    {
        id: 'depth',
        title: 'Depth modes',
        summary: 'The renderer declares depth support; the host never branches on its identity.',
        run: ({ host }) => [
            `projection ${host?.projection ?? 'n/a'}`,
            `depth ${host?.depth ?? 'n/a'}`,
            `supported ${host?.depthSupported ?? false}`,
        ],
    },
    {
        id: 'motion',
        title: 'Cinematic follow',
        summary: 'The motion director plays named flyTo/trace verbs on a host clock.',
        run: ({ host }) => [
            `verbs ${host?.motion.verbs.join(', ') || 'none'}`,
            `active ${host?.motion.active.join(', ') || 'none'}`,
            `clock ${host?.simulation.settled ? 'on-demand' : 'running'}`,
        ],
    },
    {
        id: 'five-questions',
        title: 'Five investigative questions',
        summary: 'Provenance selectors answer the five questions the flagship is measured on.',
        run: (context) => QUESTION_IDS.flatMap((id) => runCapability(id, context)),
    },
    {
        id: 'question-1',
        title: 'Why did the agent change src/auth/session.ts?',
        summary: 'Provenance walks backwards from the artifact to its writers and their turn.',
        run: ({ view }) => {
            const id = nodeWith(view, (node) => node.kind === 'artifact' && String(node.data?.path ?? '').endsWith('session.ts'));
            return id ? [`changed ${labelOf(view, id)}`, `answers: ${labels(view, why(view, id).answerIds)}`] : ['changed: none'];
        },
    },
    {
        id: 'question-2',
        title: 'Which tool calls led to the failing test?',
        summary: 'The failure node is the entry point for a forward ledHere trace.',
        run: ({ view }) => {
            const id = failingAction(view);
            return id ? [`failure ${labelOf(view, id)}`, `answers: ${labels(view, ledHere(view, id).answerIds)}`] : ['failures: none'];
        },
    },
    {
        id: 'question-3',
        title: 'What did the subagent contribute?',
        summary: 'Delegation edges project into contribution selectors across scopes.',
        run: ({ view }) => {
            const source = nodeWith(view, (node) => node.kind === 'action' && view.edges.some((edge) => edge.kind === 'delegates' && edge.source === node.id));
            return source
                ? [`from ${labelOf(view, source)}`, `contributions: ${labels(view, delegationContributions(view, source))}`]
                : ['delegations: none'];
        },
    },
    {
        id: 'question-4',
        title: 'Which changes were made after the failing test?',
        summary: 'Downstream sequence and writes expose the artifacts created after the failure.',
        run: ({ view }) => {
            const failure = failingAction(view);
            if (!failure) return ['changed after failure: none'];
            const answers = downstream(view, failure).answerIds;
            const artifacts = [...answers].filter((id) => byKind(view, id) === 'artifact');
            return [`after ${labelOf(view, failure)}`, `changed: ${labels(view, artifacts)}`];
        },
    },
    {
        id: 'question-5',
        title: 'Where did the agent retry or change direction?',
        summary: 'Retry nodes and explicit state changes mark reversals without inferred causes.',
        run: ({ view }) => {
            const retries = failureDetails(view).filter((failure) => byKind(view, failure.id) === 'retry').map((failure) => failure.id);
            const changes = view.nodes.filter((node) => node.kind === 'state' && String(node.data?.reason ?? '').includes('direction')).map((node) => node.id);
            return [`retries: ${labels(view, retries)}`, `direction changes: ${labels(view, changes)}`];
        },
    },
];

export const runCapability = (id: string, context: CapabilityContext): readonly string[] => {
    const capability = CAPABILITIES.find((entry) => entry.id === id);
    if (!capability) throw new Error(`unknown capability: ${id}`);
    return capability.run(context);
};

export const capabilityContext = (
    kernel: Kernel,
    view: AgentView,
    theme: RenderTheme,
    follow?: CapabilityContext['follow'],
    host?: PiHostState,
): CapabilityContext => ({ kernel, view, theme, follow, host });
