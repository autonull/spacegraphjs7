import { addEdge, addNode } from '@spacegraphjs/kernel';
import { demuxOp, TabRegistry, type KernelOp } from 'pi-kit';
import { getJSON, postJSON, type ConversationInfo, type Health, type Scenario } from './api';
import { DurableHost } from './host';
import { localFeed } from './local-feed';
import { replayFeed } from './replay';
import { SCENARIOS } from './scenarios';
import { asOfFeed } from './time-travel';

const params = new URLSearchParams(location.search);
const shot = params.get('shot') ?? undefined;
const scenario = params.get('scenario') ?? undefined;
const seed = params.get('seed') ?? 'fixed';
const replayID = params.get('replay') ?? undefined;
const asOf = params.get('asOf') === null ? undefined : Number(params.get('asOf'));
const observer = params.get('observer') === '1';
const offline = Boolean(shot) || Boolean(scenario) || Boolean(replayID)
    || asOf !== undefined || params.get('offline') === '1';
const registry = new TabRegistry();
const host = new DurableHost(registry, offline, shot, seed);
const el = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
if (observer) el('app').dataset['observer'] = 'true';
if (asOf !== undefined) host.setAsOf(asOf);

let localOrdinal = 0;

const localPrompt = (id: string, text: string): void => {
    const ordinal = ++localOrdinal;
    const user = `d:${id}:entry:local-${ordinal}-user`;
    const answer = `d:${id}:entry:local-${ordinal}-assistant`;
    const ops: KernelOp[] = [
        addNode(user, 'message', text, { runId: id, role: 'user', text, status: 'complete', lane: 'message' }),
        addNode(answer, 'message', 'Durable facts, navigable as a graph.', {
            runId: id,
            role: 'assistant',
            text: 'Durable facts, navigable as a graph.',
            status: 'complete',
            lane: 'message',
        }),
        addEdge('orders', `d:${id}:conversation`, user),
        addEdge('orders', user, answer),
    ];
    for (const op of ops) host.consume(id, op);
    host.announce(`Local answer for conversation ${id}`);
};

const bindPrompt = (): void => {
    el<HTMLFormElement>('prompt-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = el<HTMLInputElement>('prompt-input');
        const text = input.value.trim();
        if (!text) return;
        if (observer || asOf !== undefined) {
            host.announce('read-only — commit through the owner server');
            return;
        }
        input.value = '';
        const mode = el<HTMLSelectElement>('prompt-mode').value as 'steer' | 'followUp';
        const button = el<HTMLButtonElement>('prompt-submit');
        button.dataset['busy'] = 'true';
        try {
            if (offline) {
                localPrompt(registry.activeID(), text);
            } else {
                const result = await postJSON<{ status: string }>(`/api/conversations/${registry.activeID()}/prompt`, {
                    text,
                    mode,
                    requestId: `ui-${Date.now()}`,
                });
                host.announce(`Prompt ${result.status}`);
            }
        } catch (error) {
            host.announce(error instanceof Error ? error.message : String(error));
        } finally {
            button.dataset['busy'] = 'false';
        }
    });
};

const bindFork = (): void => {
    el('fork-button').addEventListener('click', async () => {
        if (observer || asOf !== undefined) return host.announce('read-only — fork through the owner server');
        const from = registry.activeID();
        const to = String(Number(from) + Math.max(10, registry.list().length * 10));
        try {
            if (offline) {
                registry.fork(from, to);
                host.setTab(to);
                host.announce(`Forked conversation ${from} at the current entry`);
            } else {
                const result = await postJSON<{ id: string }>(`/api/conversations/${from}/fork`, {
                    entryId: undefined,
                });
                if (!registry.get(result.id)) registry.add(result.id);
                host.setTab(result.id);
                host.announce(`Forked conversation ${from}`);
            }
        } catch (error) {
            host.announce(error instanceof Error ? error.message : String(error));
        }
    });
};

const bindApprove = (): void => {
    el('approve-button').addEventListener('click', async () => {
        if (observer || asOf !== undefined) return host.announce('read-only — approve through the owner server');
        const id = registry.activeID();
        try {
            if (offline) {
                const task = registry
                    .get(id)
                    ?.session.state().nodes.find((node) => node.kind === 'task');
                if (task) {
                    host.consume(
                        id,
                        addNode(task.id, 'task', task.label, {
                            ...task.data,
                            status: 'complete',
                        }),
                    );
                }
                host.announce('Approved the sleeping task');
            } else {
                const result = await postJSON<{ status: string }>(`/api/conversations/${id}/signal`, { key: 'approve', value: true });
                host.announce(`Approval ${result.status}`);
            }
        } catch (error) {
            host.announce(error instanceof Error ? error.message : String(error));
        }
    });
};

const bindCatalog = (): void => {
    el('catalog-button').addEventListener('click', async () => {
        const catalog = el('catalog');
        catalog.hidden = !catalog.hidden;
        if (catalog.hidden || el('scenario-list').childElementCount > 0) return;
        const scenarios: readonly Scenario[] = offline
            ? SCENARIOS.map((entry) => ({ id: entry.id, question: entry.question, description: entry.description }))
            : await getJSON<readonly Scenario[]>('/api/scenarios');
        el('scenario-list').replaceChildren(
            ...scenarios.map((scenario) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'scenario';
                button.textContent = `${scenario.id} — ${scenario.description}`;
                button.addEventListener('click', async () => {
                    try {
                        const tier = SCENARIOS.find((entry) => entry.id === scenario.id)?.tier ?? 'Core';
                        if (offline || tier === 'Next') {
                            history.replaceState(null, '', `?scenario=${scenario.id}`);
                            host.loadFeed(localFeed(undefined, seed, scenario.id));
                            host.applyShot(scenario.id);
                            host.setStatus({ provider: 'local feed', storage: 'fixture', tasks: SCENARIOS.find((entry) => entry.id === scenario.id)?.tasks.length ?? 0 });
                        } else {
                            const result = await postJSON<{ id: string }>(`/api/scenarios/${scenario.id}/load`);
                            if (!registry.get(result.id)) registry.add(result.id);
                            host.setTab(result.id);
                        }
                        catalog.hidden = true;
                        host.announce(`Loaded ${scenario.id}`);
                    } catch (error) {
                        host.announce(error instanceof Error ? error.message : String(error));
                    }
                });
                return button;
            }),
        );
    });
};

const bindChrome = (): void => {
    bindPrompt();
    bindFork();
    bindApprove();
    bindCatalog();
    el('export-format').addEventListener('change', (event) =>
        host.export((event.target as HTMLSelectElement).value),
    );
    el('permalink-button').addEventListener('click', () => {
        const link = new URL(host.permalink(), location.href).href;
        history.replaceState(null, '', link);
        void navigator.clipboard?.writeText(link)?.catch(() => {});
        host.announce('Permalink copied');
    });
    document.addEventListener('keydown', (event) => {
        const target = event.target as HTMLElement;
        const typing = target.tagName === 'INPUT' || target.tagName === 'SELECT';
        if (event.key === 'Escape') {
            host.toggleHelp(false);
            el('catalog').hidden = true;
            return;
        }
        if (typing) return;
        if (event.key === '/') {
            event.preventDefault();
            el<HTMLInputElement>('prompt-input').focus();
        } else if (event.key === '?') {
            host.toggleHelp();
        } else if (event.key === 'g') {
            host.cycleView();
        } else if (event.key === '[' || event.key === ']') {
            const tabs = registry.list();
            const index = tabs.findIndex((tab) => tab.id === registry.activeID());
            const delta = event.key === ']' ? 1 : -1;
            host.setTab(tabs[(index + delta + tabs.length) % tabs.length]!.id);
        }
    });
};

const connect = async (): Promise<void> => {
    if (observer) {
        const info = await getJSON<{ readonly url: string | null; readonly readOnly: boolean }>('/api/observer');
        if (!info.url) {
            host.announce('No observer URL configured — set PI_DURABLE_OBSERVER_URL');
            return;
        }
        host.setStatus({ provider: 'observer', storage: 'read-only', tasks: 0 });
        const events = new EventSource(`${info.url}/events/observe`);
        events.onmessage = (event) =>
            demuxOp({ data: event.data, lastEventId: event.lastEventId }, (id, op) => host.consume(id, op));
        events.onerror = () => host.announce('Observer stream interrupted — reconnecting');
        host.announce('Observer connected — read-only');
        return;
    }
    if (offline) {
        const selected = scenario ?? shot ?? replayID ?? (asOf === undefined ? undefined : 'time-travel') ?? 'basic-turn';
        if (replayID) host.loadFeed(replayFeed(replayID, seed));
        else if (asOf !== undefined) host.loadFeed(asOfFeed(selected, asOf));
        else host.loadFeed(localFeed(shot, seed, selected));
        const source = replayID ? 'replay' : asOf !== undefined ? 'as-of' : 'fixture';
        const tasks = SCENARIOS.find((entry) => entry.id === selected)?.tasks.length ?? 0;
        host.setStatus({ provider: 'local feed', storage: source, tasks });
        host.applyShot(selected);
        if (replayID) host.announce(`Replayed ${replayID}`);
        else if (asOf !== undefined) host.announce(`Read-only view as of entry ${asOf}`);
        return;
    }
    try {
        const health = await getJSON<Health>('/api/health');
        host.setStatus({ provider: health.provider, storage: health.storage, tasks: health.sleepingTasks });
        const conversations = await getJSON<readonly ConversationInfo[]>('/api/conversations');
        for (const conversation of conversations) registry.add(conversation.id);
    } catch (error) {
        host.loadFeed(localFeed(shot, seed));
        host.setStatus({ provider: 'local feed', storage: 'fixture', tasks: 1 });
        host.announce(error instanceof Error ? error.message : String(error));
        return;
    }
    const events = new EventSource('/events');
    events.onmessage = (event) =>
        demuxOp({ data: event.data, lastEventId: event.lastEventId }, (id, op) => host.consume(id, op));
    events.onerror = () => host.announce('Event stream interrupted — reconnecting');
};

const boot = async (): Promise<void> => {
    await host.mount(el('canvas'));
    bindChrome();
    await connect();
    const permalink = params.get('s');
    if (permalink) host.applyPermalink(permalink);
    if (!host.registry.active()) host.loadFeed(localFeed(shot, seed));
    host.refresh();
    Object.assign(window, { __durable: host.hooks() });
};

void boot();
