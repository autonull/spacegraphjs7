import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { DEFAULT_THEME, type RenderTheme } from '@spacegraphjs/renderer';
import { agentDomain, changedFiles, failureDetails } from '@spacegraphjs/agent';
import { Kernel, type KernelOp } from '@spacegraphjs/kernel';
import {
    computeFollowFrame,
    DEFAULT_LIVE_FOLLOW_MODE,
    type CameraMove,
    type FollowMode,
} from '@spacegraphjs/navigation/follow';
import { GraphController } from 'spacegraphjs/control';
import { Strategies } from 'spacegraphjs/layout';
import { AgentAdapter, toAdapterModel, type AgentAdapterNode, type AgentLevel } from './adapter';
import { CAPABILITIES, capabilityContext, runCapability } from './capabilities';
import { decodeOp, foldKernelOps } from './ops';
import { readTheme } from './theme';

const LAYOUT_CONFIG = {
    nodeSizeFn: () => [200, 64] as const,
    laneList: ['run', 'unit', 'message', 'action', 'artifact', 'state'],
    laneOfFn: (node: { readonly lane?: string }) => node.lane ?? 'action',
    depthMap: {
        run: 0,
        unit: 1,
        state: 2,
        message: 2,
        action: 3,
        artifact: 4,
        retry: 4,
    },
    turnIdFn: (node: AgentAdapterNode) =>
        typeof node.data?.unitId === 'string' ? String(node.data.unitId) : undefined,
    geometry: { standardSize: [200, 64] as const, indentStep: 120, depthLevels: 5, padding: 24 },
};

const FOLLOW_MODES: readonly FollowMode[] = ['off', 'turn', 'node', 'node+focus'];
const clientID = crypto.randomUUID();

const el = <T extends HTMLElement>(id: string): T => {
    const found = document.getElementById(id);
    if (!found) throw new Error(`pi app: missing #${id}`);
    return found as T;
};

let kernel = new Kernel();
let theme: RenderTheme = DEFAULT_THEME;
const controller = new GraphController({ trailMaxDepth: 8 });
const adapter = new AgentAdapter();
let renderer: SpaceGraphRenderer | undefined;
let evidence: readonly string[] = [];
let positions: ReadonlyMap<string, { x: number; y: number; z: number }> = new Map();
let followMode: FollowMode = DEFAULT_LIVE_FOLLOW_MODE;
let lastFollowFrame: CameraMove | null = null;
let attention = { failures: 0, latest: '', changed: 0 };

const paint = (): void => {
    const view = agentDomain.build(kernel);
    controller.setModel(view);
    const model = toAdapterModel(view);
    positions = Strategies.layoutGraph(
        { ...model, root: view.root, turns: [...(view.turns ?? [])] },
        LAYOUT_CONFIG,
        { strategy: 'lanes' },
    ).positions;
    renderer?.setModel(
        adapter.build(model, {
            level: 'execution' as AgentLevel,
            positions,
            edges: true,
            focus: controller.selection[0],
        }),
    );
    el('status').textContent = `${view.nodes.length} nodes · ${view.edges.length} edges`;

    const failures = failureDetails(view);
    attention = {
        failures: failures.length,
        latest: failures.at(-1)?.label ?? '',
        changed: changedFiles(view).length,
    };
    el('attention').textContent = attention.failures
        ? `${attention.failures} failure(s) · ${attention.changed} file(s) · ${attention.latest}`
        : `${attention.changed} file(s) changed`;
};

const renderFollow = (): void => {
    el('follow-state').textContent = lastFollowFrame?.nodeId ?? followMode;
};

const followContext = () => ({ mode: followMode, frame: lastFollowFrame?.nodeId ?? 'none' });

const showEvidence = (lines: readonly string[]): void => {
    evidence = lines;
    el('evidence').replaceChildren(
        ...lines.map((line) => {
            const item = document.createElement('li');
            item.textContent = line;
            return item;
        }),
    );
};

const renderGallery = (): void => {
    el('gallery').replaceChildren(
        ...CAPABILITIES.map((capability) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.capability = capability.id;
            button.textContent = capability.title;
            button.title = capability.summary;
            button.addEventListener('click', () => {
                showEvidence(
                    runCapability(capability.id, capabilityContext(kernel, agentDomain.build(kernel), theme, followContext())),
                );
            });
            return button;
        }),
    );
};

const consume = (op: KernelOp): void => {
    const before = new Set(kernel.nodes.map((node) => node.id));
    kernel = foldKernelOps([op], kernel);
    const newNodes = kernel.nodes
        .filter((node) => !before.has(node.id))
        .map((node) => ({ id: node.id, kind: node.kind, label: node.label, status: String(node.data?.status ?? '') }));
    paint();

    lastFollowFrame = computeFollowFrame({
        newNodes,
        currentViewport: renderer?.getViewport(),
        followMode,
        positionOf: (id) => positions.get(id),
    });
    renderFollow();
    if (lastFollowFrame?.viewport) renderer?.setViewport(lastFollowFrame.viewport);
    else if (lastFollowFrame?.nodeId) renderer?.focus(lastFollowFrame.nodeId);
};

const boot = async (): Promise<void> => {
    theme = readTheme();
    renderGallery();
    renderer = new SpaceGraphRenderer();
    await renderer.mount(el('canvas'), { theme, projection: '2d' });
    controller.bind(renderer);
    paint();
    renderFollow();

    const followSelect = el<HTMLSelectElement>('follow-mode');
    followSelect.value = followMode;
    followSelect.addEventListener('change', () => {
        followMode = followSelect.value as FollowMode;
        lastFollowFrame = null;
        renderFollow();
    });

    const events = new EventSource(`/events?client=${clientID}`);
    events.onmessage = (event) => consume(decodeOp(event.data as string));

    el<HTMLFormElement>('prompt-form').addEventListener('submit', async (submit) => {
        submit.preventDefault();
        const input = el<HTMLInputElement>('prompt-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        const mode = el<HTMLSelectElement>('prompt-mode').value;
        try {
            const response = await fetch('/prompt', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ client: clientID, text, mode: mode || undefined }),
            });
            if (!response.ok) {
                const body = (await response.json()) as { error?: string };
                showEvidence([body.error ?? `prompt failed (${response.status})`]);
            }
        } catch (error) {
            showEvidence([error instanceof Error ? error.message : String(error)]);
        }
    });

    Object.assign(window, {
        __pi: {
            capabilities: () => CAPABILITIES.map((capability) => capability.id),
            run: (id: string) => {
                const lines = runCapability(
                    id,
                    capabilityContext(kernel, agentDomain.build(kernel), theme, followContext()),
                );
                showEvidence(lines);
                return lines;
            },
            evidence: () => evidence,
            ops: () => kernel.nodes.length,
            follow: () => followMode,
            setFollow: (mode: FollowMode): FollowMode => {
                if (!FOLLOW_MODES.includes(mode)) return followMode;
                followMode = mode;
                lastFollowFrame = null;
                followSelect.value = mode;
                renderFollow();
                return followMode;
            },
            followFrame: () => lastFollowFrame,
            attention: () => attention,
            ready: true,
        },
    });
};

void boot();
