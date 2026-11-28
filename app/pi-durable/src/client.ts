import '../../../packages/window-manager/src/graph-window.css';
import { addEdge, addNode } from '@spacegraphjs/kernel';
import { mountComposer, type ComposerController } from 'spacegraphjs/composer';
import {
    demuxOp,
    dispatchKeys,
    el,
    errorMessage,
    plainKey,
    renderShortcuts as renderShortcutList,
    shiftedKey,
    TabRegistry,
    type KeyBinding,
    type KernelOp,
} from 'pi-kit';
import { entryIDFromNode } from './actions';
import { getJSON, postJSON, type ConversationInfo, type Health, type Scenario } from './api';
import { decodeAddress } from './address';
import { DurableHost } from './host';
import { lensCompletions } from './lens';
import { localFeed } from './local-feed';
import { replayFeed } from './replay';
import { provenanceFor } from './provenance';
import { isRung } from './rungs';
import { SCENARIOS } from './scenarios';
import { STORIES } from './stories';
import { asOfFeed } from './time-travel';
import { forkOps } from './translator';

const params = new URLSearchParams(location.search);
const compact = decodeAddress(params.get('at'));
const shot = params.get('shot') ?? compact?.shot;
const scenario = params.get('scenario') ?? undefined;
const story = params.get('story')
    ?? STORIES.find((entry) => entry.frames.some((frame) => 'shot' in frame && frame.shot === shot))?.id;
const seed = params.get('seed') ?? 'fixed';
const replayID = params.get('replay') ?? undefined;
const asOf = params.get('asOf') === null ? compact?.asOf : Number(params.get('asOf'));
const observer = params.get('observer') === '1';
const rung = params.get('rung') ?? compact?.rung;
const initialRung = isRung(rung) ? rung : undefined;
const offline = Boolean(shot) || Boolean(scenario) || Boolean(replayID)
    || asOf !== undefined || params.get('offline') === '1';
const registry = new TabRegistry();
const labs = params.get('labs') === '1';
const host = new DurableHost(registry, offline, shot, seed, initialRung, labs);
const readOnly = (action: string): boolean => {
    if (!observer && asOf === undefined) return false;
    host.announce(`read-only — ${action} through the owner server`);
    return true;
};
const announceError = (error: unknown): void =>
    host.announce(errorMessage(error));
const visibleError = (id: 'prompt-error' | 'lens-error', message: string): void => {
    const target = el(id);
    target.textContent = message;
    target.hidden = false;
    host.announce(message);
};
const clearError = (id: 'prompt-error' | 'lens-error'): void => {
    const target = el(id);
    target.textContent = '';
    target.hidden = true;
};
if (observer) {
    el('app').dataset['observer'] = 'true';
    el('readonly-message').textContent =
        'Observer mode (read-only) — prompt and actions are hidden.';
}

const initialID = scenario ?? shot ?? replayID ?? (asOf === undefined ? undefined : 'time-travel') ?? 'basic-turn';
let selectedID = initialID;
host.setFeedID(initialID);
if (params.get('instruments') === '1') {
    el('app').dataset['instruments'] = 'true';
    el('instruments-block').hidden = false;
}
host.onScrub = (seq) => {
    host.loadFeed(seq === undefined
        ? replayID ? replayFeed(replayID, seed) : localFeed(shot, seed, selectedID)
        : asOfFeed(selectedID, seq));
};
if (asOf !== undefined) host.setAsOf(asOf);

let localOrdinal = 0;
let pendingRequestID: string | undefined;
let promptInFlight = false;

const setPromptBusy = (busy: boolean): void => {
    const button = el<HTMLButtonElement>('prompt-submit');
    button.dataset['busy'] = String(busy);
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
};

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

const cancelPrompt = async (): Promise<boolean> => {
    if (readOnly('cancel')) return false;
    const requestID = pendingRequestID;
    setPromptBusy(false);
    if (!requestID) {
        host.announce(offline ? 'Local answers are immediate — nothing to cancel' : 'No prompt to cancel');
        return false;
    }
    pendingRequestID = undefined;
    promptInFlight = false;
    try {
        if (!offline) await postJSON(`/api/conversations/${registry.activeID()}/abort`);
        host.announce(`Cancelled ${requestID}`);
        return true;
    } catch (error) {
        announceError(error);
        return false;
    }
};

let composer: ComposerController | undefined;

const bindPrompt = (): void => {
    el('prompt-cancel').addEventListener('click', () => void cancelPrompt());
    composer = mountComposer(el<HTMLTextAreaElement>('prompt-input'), {
        onSubmit: (text) => void submitPrompt(text),
    });
    el<HTMLFormElement>('prompt-form').addEventListener('submit', (event) => {
        event.preventDefault();
        void submitPrompt(composer?.value().trim() ?? '');
    });
};

const submitPrompt = async (text: string): Promise<void> => {
    if (!text || promptInFlight || readOnly('commit')) return;
    clearError('prompt-error');
    const mode = el<HTMLSelectElement>('prompt-mode').value as 'steer' | 'followUp';
    const requestID = offline ? undefined : `ui-${crypto.randomUUID()}`;
    if (requestID) {
        pendingRequestID = requestID;
        promptInFlight = true;
        setPromptBusy(true);
    }
    try {
        if (offline) {
            localPrompt(registry.activeID(), text);
            host.announce(`Local answer accepted ui-local-${localOrdinal}`);
        } else {
            const result = await postJSON<{ status: string; requestId: string }>(
                `/api/conversations/${registry.activeID()}/prompt`,
                { text, mode, requestId: requestID },
            );
            host.announce(`Prompt ${result.status} ${result.requestId}`);
        }
        composer?.clear();
    } catch (error) {
        visibleError('prompt-error', errorMessage(error));
    } finally {
        if (requestID) {
            promptInFlight = false;
            setPromptBusy(false);
        }
    }
};

const forkConversation = async (): Promise<boolean> => {
    if (readOnly('fork')) return false;
    const from = registry.activeID();
    const focus = host.address().focus;
    const entryID = entryIDFromNode(focus);
    const version = focus ? provenanceFor(registry.get(from)!, focus)?.sequence : undefined;
    const to = String(Number(from) + Math.max(10, registry.list().length * 10));
    try {
        if (offline) {
            registry.fork(from, to, version);
            if (entryID) for (const op of forkOps(from, to, entryID)) host.consume(to, op);
            host.setTab(to);
            host.announce(entryID
                ? `Forked conversation ${from} at ${entryID}`
                : `Forked conversation ${from} at the current entry`);
        } else {
            const result = await postJSON<{ id: string; entryId: string }>(
                `/api/conversations/${from}/fork`,
                entryID ? { entryId: entryID } : {},
            );
            if (!registry.get(result.id)) registry.add(result.id);
            host.setTab(result.id);
            host.announce(`Forked conversation ${from} at ${result.entryId}`);
        }
        return true;
    } catch (error) {
        announceError(error);
        return false;
    }
};

const newConversation = async (): Promise<boolean> => {
    if (readOnly('create')) return false;
    try {
        if (offline) {
            const ids = registry.list().map((tab) => Number(tab.id)).filter(Number.isFinite);
            const to = String(Math.max(0, ...ids) + 1);
            registry.add(to);
            host.setTab(to);
            host.announce(`New conversation ${to} in the local feed`);
        } else {
            const result = await postJSON<{ id: string }>('/api/conversations');
            if (!registry.get(result.id)) registry.add(result.id);
            host.setTab(result.id);
            host.announce(`New conversation ${result.id}`);
        }
        return true;
    } catch (error) {
        announceError(error);
        return false;
    }
};

const bindFork = (): void => {
    el('fork-button').addEventListener('click', () => void forkConversation());
    el('new-button').addEventListener('click', () => void newConversation());
};

const bindApprove = (): void => {
    el('approve-button').addEventListener('click', async () => {
        if (readOnly('approve')) return;
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
            announceError(error);
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
                            selectedID = scenario.id;
                            host.setFeedID(scenario.id);
                            host.loadFeed(localFeed(undefined, seed, scenario.id));
                            host.applyShot(scenario.id);
                            host.setStatus({ provider: 'local feed', storage: 'fixture', tasks: SCENARIOS.find((entry) => entry.id === scenario.id)?.tasks.length ?? 0 });
                        } else {
                            const result = await postJSON<{ id: string }>(`/api/scenarios/${scenario.id}/load`);
                            if (!registry.get(result.id)) registry.add(result.id);
                            selectedID = scenario.id;
                            host.setFeedID(scenario.id);
                            host.setTab(result.id);
                        }
                        catalog.hidden = true;
                        host.announce(`Loaded ${scenario.id}`);
                    } catch (error) {
                        announceError(error);
                    }
                });
                return button;
            }),
        );
    });
};

const bindLens = (): void => {
    const input = el<HTMLInputElement>('lens-input');
    const history: string[] = [];
    let cursor = -1;
    host.lensHistorySource = () => history;
    el<HTMLFormElement>('lens-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const query = input.value.trim();
        if (!query) return;
        if (!host.lens(query)) {
            visibleError('lens-error', `Unknown command: ${query}. Try “view diff”.`);
            return;
        }
        clearError('lens-error');
        history.push(query);
        cursor = history.length;
        input.value = '';
    });
    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' && history.length) {
            event.preventDefault();
            cursor = Math.max(0, cursor - 1);
            input.value = history[cursor]!;
        } else if (event.key === 'ArrowDown' && history.length) {
            event.preventDefault();
            cursor = Math.min(history.length, cursor + 1);
            input.value = history[cursor] ?? '';
        } else if (
            event.key === 'Tab' &&
            !event.shiftKey &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey
        ) {
            const [completion] = lensCompletions(input.value);
            if (!completion) return;
            event.preventDefault();
            input.value = completion;
        }
    });
};

let drawerTrigger: HTMLElement | undefined;

const closeDrawer = (): void => {
    el('drawer').hidden = true;
    delete el('app').dataset['drawerOpen'];
    for (const button of document.querySelectorAll<HTMLButtonElement>('#rail .rail-icon[data-drawer]'))
        button.setAttribute('aria-expanded', 'false');
    drawerTrigger?.focus();
    drawerTrigger = undefined;
};

const openDrawer = (section: string, trigger: HTMLElement): void => {
    closeDrawer();
    drawerTrigger = trigger;
    el('drawer').hidden = false;
    el('app').dataset['drawerOpen'] = section;
    el('drawer-title').textContent = section;
    trigger.setAttribute('aria-expanded', 'true');
    host.refreshInsights();
    const panel = el('drawer').querySelector<HTMLElement>(`[data-section="${section}"]`);
    panel?.scrollIntoView({ block: 'nearest' });
    panel?.querySelector<HTMLElement>('button, input, select')?.focus();
};

const toggleRailMenu = (open?: boolean): void => {
    const next = open ?? el('app').dataset['railOpen'] !== 'true';
    el('app').dataset['railOpen'] = String(next);
    el('menu-button').setAttribute('aria-expanded', String(next));
    if (next) el('rail').querySelector<HTMLButtonElement>('.rail-icon')?.focus();
    else el('menu-button').focus();
};

const togglePresentation = (on?: boolean): void => {
    const next = on ?? el('app').dataset['present'] !== 'true';
    if (next) {
        closeDrawer();
        delete el('app').dataset['railOpen'];
        el('menu-button').setAttribute('aria-expanded', 'false');
    }
    el('app').dataset['present'] = String(next);
    const button = document.querySelector<HTMLButtonElement>('[data-action="present"]');
    button?.setAttribute('aria-pressed', String(next));
    (next ? el('present-exit') : button ?? el('menu-button')).focus();
    host.announce(next ? 'Presentation mode — Shift+F to exit' : 'Presentation exited');
};


const closePriority = (): void => {
    if (host.threadActive()) {
        host.exitThread();
        return;
    }
    if (host.consoleGrown()) {
        host.consoleGrow();
        return;
    }
    if (host.focusLensActive()) {
        host.exitFocusLens();
        return;
    }
    if (!el('help').hidden) host.toggleHelp(false);
    else if (!el('catalog').hidden) el('catalog').hidden = true;
    else if (!el('drawer').hidden) closeDrawer();
    else if (el('app').dataset['railOpen'] === 'true') toggleRailMenu(false);
};

const focusSelection = (): void => {
    const focus = host.address().focus;
    if (focus) host.focus(focus);
    else host.announce('Select a node to focus it');
};

const switchTab = (event: KeyboardEvent): void => {
    const tabs = registry.list();
    const index = tabs.findIndex((tab) => tab.id === registry.activeID());
    const delta = event.key === ']' ? 1 : -1;
    host.setTab(tabs[(index + delta + tabs.length) % tabs.length]!.id);
};

const KEY_BINDINGS: readonly KeyBinding[] = [
    { keys: 'Ctrl/⌘ K', label: 'Open Lens', whileTyping: true,
      match: (event) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k',
      run: () => el<HTMLInputElement>('lens-input').focus() },
    { keys: 'Ctrl/⌘ F', label: 'Find in console', whileTyping: true,
      match: (event) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f',
      run: () => host.consoleFocusSearch() },
    { keys: 'F3 / Shift+F3', label: 'Next / previous console match', whileTyping: true,
      match: (event) => event.key === 'F3',
      run: (event) => { host.consoleFindNext(event.shiftKey ? -1 : 1); } },
    { keys: 'Esc', label: 'Close panels', whileTyping: true,
      match: (event) => event.key === 'Escape', run: closePriority },
    { keys: 'Alt+← / →', label: 'View history back and forward', whileTyping: true,
      match: (event) => event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight'),
      run: (event) => { if (event.key === 'ArrowLeft') host.historyBack(); else host.historyForward(); } },
    { keys: '/', label: 'Focus prompt', match: plainKey('/'), run: () => composer?.focus() },
    { keys: '?', label: 'Show shortcuts',
      match: (event) => event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey,
      run: () => host.toggleHelp() },
    { keys: 'Shift+F', label: 'Presentation mode',
      match: (event) => event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'f',
      run: () => togglePresentation() },
    { keys: 'g', label: 'Cycle views', match: plainKey('g'), run: () => host.cycleView() },
    { keys: 'f', label: 'Focus selection', match: plainKey('f'), run: focusSelection },
    { keys: '0', label: 'Reset view', match: plainKey('0'), run: () => host.resetView() },
    { keys: 'm', label: 'Reset muting filters', match: plainKey('m'), run: () => host.resetFilters() },
    { keys: 'e', label: 'Focus neighbourhood', match: plainKey('e'), run: () => host.toggleFocusLens() },
    { keys: 'x', label: 'Grow graph from console line', match: plainKey('x'),
      run: () => { host.setView('transcript'); host.consoleGrow(); } },
    { keys: 'Ctrl+Enter', label: 'Cancel prompt', whileTyping: true,
      match: (event) => (event.ctrlKey || event.metaKey) && event.key === 'Enter',
      run: () => void cancelPrompt() },
    { keys: 'Shift+R', label: 'Fork at selected entry', match: shiftedKey('r'), run: () => void forkConversation() },
    { keys: 'n', label: 'New conversation', match: plainKey('n'), run: () => void newConversation() },
    { keys: '[ / ]', label: 'Switch tabs',
      match: (event) => event.key === '[' || event.key === ']', run: switchTab },
];


const bindPanelChrome = (): void => {
    for (const button of document.querySelectorAll<HTMLButtonElement>('#rail .rail-icon')) {
        button.addEventListener('click', () => {
            const section = button.dataset['drawer'];
            if (section) {
                if (el('app').dataset['drawerOpen'] === section && !el('drawer').hidden) closeDrawer();
                else openDrawer(section, button);
            } else if (button.dataset['focus'] === 'lens') {
                closeDrawer();
                el<HTMLInputElement>('lens-input').focus();
            } else if (button.dataset['action'] === 'present') togglePresentation();
        });
    }
    el('drawer-close').addEventListener('click', closeDrawer);
    el('console-reading-close').addEventListener('click', () => host.closeConsoleReading());
    el('menu-button').addEventListener('click', () => toggleRailMenu());
    el('present-exit').addEventListener('click', () => togglePresentation(false));
};

const raisedDots = new Set<string>();
const bindCardFocus = (): void => {
    el('canvas').addEventListener('focusin', (event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>('.durable-card');
        const band = card?.dataset['band'];
        const id = card?.closest<HTMLElement>('[data-node-id]')?.dataset['nodeId'];
        if (!id || !card || (band !== 'dot' && band !== 'chip') || raisedDots.has(id)) return;
        raisedDots.add(id);
        host.focus(id);
        queueMicrotask(() => {
            el('canvas').querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"] .durable-card`)?.focus();
            raisedDots.delete(id);
        });
    });
    el('canvas').addEventListener('contextmenu', (event) => {
        if (host.address().view !== 'transcript') return;
        event.preventDefault();
        host.openConsoleMenu(event.clientX, event.clientY);
    });
};

const bindChrome = (): void => {
    host.onAbort = cancelPrompt;
    host.onFork = forkConversation;
    host.onNew = newConversation;
    bindPrompt();
    bindLens();
    bindFork();
    bindApprove();
    bindCatalog();
    bindPanelChrome();
    bindCardFocus();
    el('export-button').addEventListener('click', () => {
        const format = el<HTMLSelectElement>('export-format').value;
        host.export(format);
        host.announce(`Exporting ${format}`);
    });
    el('permalink-button').addEventListener('click', () => {
        const link = new URL(host.permalink(), location.href).href;
        history.replaceState(null, '', link);
        void navigator.clipboard
            ?.writeText(link)
            ?.then(() => host.announce('Permalink copied'))
            ?.catch(() => host.announce('Could not copy permalink'));
    });
    el<HTMLInputElement>('time-scrub').addEventListener('change', (event) =>
        host.scrubTo(Number((event.target as HTMLInputElement).value)));
    el('time-present').addEventListener('click', () => host.scrubTo(undefined));
    el('readonly-return').addEventListener('click', () => host.scrubTo(undefined));
    el('route-prev').addEventListener('click', () => host.routeStep(-1));
    el('route-next').addEventListener('click', () => host.routeStep(1));
    el('compare-pin').addEventListener('click', () => host.pinCompare());
    el('compare-clear').addEventListener('click', () => host.clearCompare());
    el('filter-reset').addEventListener('click', () => host.resetFilters());
    el('inspector').addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.id === 'fork-here') void forkConversation();
        if (target.id === 'read-in-transcript') host.readInTranscript();
    });
    el('thread-follow').addEventListener('click', () => {
        const id = host.address().focus;
        if (id) host.followThread(id);
        else host.announce('Select a node to follow its thread');
    });
    el('thread-next').addEventListener('click', () => host.nextThreadStep());
    renderShortcutList(el('help-shortcuts'), KEY_BINDINGS);
    document.addEventListener('keydown', (event) => dispatchKeys(event, KEY_BINDINGS));
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
        announceError(error);
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
    if (story) host.setStory(story);
    if (['s', 'view', 'rung', 'layout', 'asOf', 'zoom'].some((key) => params.has(key)))
        host.applyPermalink(location.href);
    if (compact) host.applyAddress(compact);
    if (!host.registry.active()) host.loadFeed(localFeed(shot, seed));
    host.refresh();
    Object.assign(window, { __durable: host.hooks() });
};

void boot();
