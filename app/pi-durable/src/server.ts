import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { BACKGROUND_CONTEXT } from '@earendil-works/chord/context';
import { createModels } from '@earendil-works/pi-ai/models';
import { fauxAssistantMessage, fauxProvider } from '@earendil-works/pi-ai/providers/faux';
import {
    AssistantEntry,
    createRegistry,
    defineExtension,
    defineSignal,
    defineTask,
    Harness,
    MemoryStorage,
    type Conversation,
    type TaskId,
} from '@earendil-works/pi-durable';
import { openNodeJsonlStorage } from '@earendil-works/pi-durable/storage/jsonl/node';
import { bool, obj } from '@earendil-works/pi-schema';
import { KernelCodec, SessionKernel } from '@spacegraphjs/kernel';
import { encodeOp, opID, type KernelOp } from 'pi-kit';
import { SCENARIOS } from './scenarios';
import { forkOps, translateTasks, translateView, type DurableTask, type DurableView } from './translator';

export const escapeXML = (value: string): string =>
    value.replace(/[<>&]/g, (char) => (char === '<' ? '&lt;' : char === '>' ? '&gt;' : '&amp;'));

const PORT = Number(process.env.PI_DURABLE_SERVER_PORT ?? 8788);
const STORAGE = process.env.PI_DURABLE_STORAGE ?? 'jsonl';
const DIR = resolve(process.cwd(), process.env.PI_DURABLE_DIR ?? '.pi-durable');
const SEED = process.env.PI_DURABLE_FAUX_SEED ?? 'fixed';
const PROVIDER = process.env.PI_DURABLE_PROVIDER ?? 'faux';
const MODEL = process.env.PI_DURABLE_MODEL ?? 'gpt-4o-mini';
const LIVE = PROVIDER === 'openai';
const PROVIDER_ERROR = LIVE && !process.env.OPENAI_API_KEY
    ? { error: 'no-provider', recovery: 'set OPENAI_API_KEY or unset PI_DURABLE_PROVIDER' }
    : undefined;
const Approval = defineSignal({ name: 'durable.approval', version: 1, schema: obj({ allow: bool() }) });
const APPROVAL_KEY = 'approve';

type ApprovalInput = { readonly question: string };
type ApprovalState = { readonly phase: 'ask' } | { readonly phase: 'answered' };
type ApprovalResult = string | null;

const ApprovalTask = defineTask<ApprovalInput, ApprovalState, ApprovalResult>({
    name: 'durable.approval',
    version: 1,
    initial: () => ({ phase: 'ask' }),
    phases: {
        ask: (_task, runtime, context) =>
            runtime.commit(
                () => ({
                    status: 'sleeping',
                    signals: [Approval.key(APPROVAL_KEY)],
                    checkpoint: { phase: 'answered' },
                }),
                context,
            ),
        answered: async (task, runtime, context) => {
            const signal = await runtime.readSignal(Approval, APPROVAL_KEY, context);
            const allowed = signal !== undefined && 'value' in signal && signal.value.allow;
            await runtime.commit(
                () => ({
                    status: 'terminal',
                    outcome: { status: 'completed', result: allowed ? task.input.question : null },
                }),
                context,
            );
        },
    },
    abort: (_task, runtime, context) =>
        runtime.commit(() => ({ status: 'terminal', outcome: { status: 'aborted' } }), context),
});

const faux = fauxProvider();
if (!LIVE) faux.setResponses([fauxAssistantMessage(answerFor('What can this workspace show?'))]);
const models = createModels();
if (LIVE && !PROVIDER_ERROR) {
    const { openaiProvider } = await import('@earendil-works/pi-ai/providers/openai');
    models.setProvider(openaiProvider());
} else models.setProvider(faux.provider);
const agentModel = LIVE && !PROVIDER_ERROR
    ? { provider: 'openai', modelId: MODEL }
    : { provider: 'faux', modelId: 'faux-1' };
const registry = createRegistry();
registry.install(defineExtension({ name: 'durable-workspace', tasks: [ApprovalTask] }));

const storage = STORAGE === 'jsonl' ? await openNodeJsonlStorage(DIR, BACKGROUND_CONTEXT) : new MemoryStorage();
const harness = await Harness.open(storage, { models, registry }, BACKGROUND_CONTEXT);
harness.resume();

type Client = { readonly response: ServerResponse };
const clients = new Set<Client>();
const conversations = new Map<string, Conversation>();
const views = new Map<string, DurableView>();
let tasks: readonly DurableTask[] = [];
let approvalTaskID: TaskId<ApprovalResult> | undefined;

function answerFor(text: string): string {
    const seed = SEED === 'fixed' ? '' : ` [${SEED}]`;
    return /capital of france/i.test(text) ? `Paris.${seed}` : `Durable facts, navigable as a graph.${seed}`;
}

const taskList = (): readonly DurableTask[] =>
    Object.values(taskGraph.tasks).map((task) => ({
        id: task.id,
        kind: task.kind,
        conversationId: task.conversationId,
        owner: task.owner,
        background: task.background,
        state: task.state as DurableTask['state'],
    }));

let taskGraph = (await harness.watchTaskGraph(BACKGROUND_CONTEXT)).value;
tasks = taskList();
approvalTaskID = Object.values(taskGraph.tasks).find((task) => task.kind === ApprovalTask.definition.name)
    ?.id as TaskId<ApprovalResult> | undefined;

const send = (client: Client, conversationID: string, ops: readonly KernelOp[]): void => {
    for (const op of ops) client.response.write(`id: ${conversationID}\n${encodeOp(op)}`);
};

const broadcast = (conversationID: string, ops: readonly KernelOp[]): void => {
    if (!ops.length) return;
    for (const client of clients) send(client, conversationID, ops);
};

const publish = (conversationID: string): void => {
    const view = views.get(conversationID);
    if (view) broadcast(conversationID, translateView(conversationID, view, tasks));
};

const watchConversation = async (conversation: Conversation): Promise<void> => {
    const id = String(conversation.id);
    if (views.has(id)) return;
    conversations.set(id, conversation);
    const watch = await conversation.watch(BACKGROUND_CONTEXT);
    views.set(id, watch.value as DurableView);
    watch.start(async (call) => {
        if (call.kind !== 'value') return;
        views.set(id, call.value as DurableView);
        publish(id);
    });
};

const seed = async (conversation: Conversation, question: string, requestID: string): Promise<void> => {
    const submission = await conversation.submit(
        { type: 'input', content: question, requestId: requestID },
        BACKGROUND_CONTEXT,
    );
    const settled = await submission.wait(BACKGROUND_CONTEXT);
    if (settled.status === 'done' && settled.type === 'input' && settled.answer !== undefined) {
        await conversation.commit((tx) => tx.entry(AssistantEntry, settled.answer!), BACKGROUND_CONTEXT);
    }
};

const idOf = (conversation: Conversation): string => String(conversation.id);

const root = await harness.root(BACKGROUND_CONTEXT, { agent: { model: agentModel } });
await watchConversation(root);
if (!LIVE && !views.get(idOf(root))?.entries.length) {
    await seed(root, 'What can this workspace show?', 'seed-1');
}
if (!approvalTaskID) {
    approvalTaskID = await root.commit(
        (tx) =>
            tx.createTask(ApprovalTask, { question: 'Allow the sleeping task to wake?' }, {
                ownership: { kind: 'conversation' },
            }),
        BACKGROUND_CONTEXT,
    );
}
const graphWatch = await harness.watchTaskGraph(BACKGROUND_CONTEXT);
graphWatch.start(async (call) => {
    if (call.kind !== 'value') return;
    taskGraph = call.value;
    tasks = taskList();
    for (const id of conversations.keys()) broadcast(id, translateTasks(id, tasks));
});

const json = (response: ServerResponse, status: number, body: unknown): void => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
};

const readBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const health = () => ({
    ok: true,
    storage: STORAGE,
    provider: LIVE ? 'openai' : 'faux',
    providerMode: LIVE ? 'live' : 'faux',
    model: LIVE ? MODEL : 'faux-1',
    ...(PROVIDER_ERROR ? { providerError: PROVIDER_ERROR } : {}),
    conversations: conversations.size,
    sleepingTasks: tasks.filter((task) => task.state.status === 'sleeping').length,
    recovered: tasks.length,
});

const routes: Record<string, (request: IncomingMessage, response: ServerResponse, id?: string) => Promise<void>> = {
    '/api/health': async (_request, response) => json(response, 200, health()),
    '/api/conversations': async (_request, response) =>
        json(
            response,
            200,
            [...conversations.values()].map((conversation) => ({
                id: idOf(conversation),
                status: taskGraph.tasks[String(conversation.id)]?.state.status ?? 'idle',
                agent: views.get(idOf(conversation))?.docs?.['pi.agent'] ?? null,
            })),
        ),
    '/api/scenarios': async (_request, response) => json(response, 200, SCENARIOS),
    '/api/export': async (request, response) => {
        const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
        const id = url.searchParams.get('id') ?? idOf(root);
        const view = views.get(id);
        if (!view) return json(response, 404, { error: 'unknown-conversation', recovery: 'choose another tab' });
        const ops = translateView(id, view, tasks);
        const session = new SessionKernel({ entries: ops.map((op) => ({ id: opID(op), op })) });
        const format = url.searchParams.get('format') ?? 'json';
        if (format === 'session') {
            response.writeHead(200, { 'content-type': 'application/json' });
            return void response.end(KernelCodec.encodeSession(session));
        }
        if (format === 'md') {
            const lines = view.entries.map((entry) => `- ${entry.kind}: ${JSON.stringify(entry.model?.[0]?.content ?? '')}`);
            response.writeHead(200, { 'content-type': 'text/markdown' });
            return void response.end(`# Conversation ${id}\n\n${lines.join('\n')}\n`);
        }
        if (format === 'svg') {
            const body = session
                .state()
                .nodes.map(
                    (node, index) =>
                        `<g><circle cx="${120 + (index % 4) * 180}" cy="${100 + Math.floor(index / 4) * 120}" r="18" /><text x="${120 + (index % 4) * 180}" y="${104 + Math.floor(index / 4) * 120}">${escapeXML(node.label)}</text></g>`,
                )
                .join('');
            response.writeHead(200, { 'content-type': 'image/svg+xml' });
            return void response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#0b1016"/>${body}</svg>`);
        }
        json(response, 200, { conversation: id, view, tasks, ops });
    },
};

const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
    try {
        if (url.pathname === '/events') {
            response.writeHead(200, {
                'content-type': 'text/event-stream',
                'cache-control': 'no-cache',
                connection: 'keep-alive',
            });
            response.write(': connected\n\n');
            const client: Client = { response };
            clients.add(client);
            for (const id of conversations.keys()) {
                send(client, id, translateView(id, views.get(id)!, tasks));
                send(client, id, translateTasks(id, tasks));
            }
            request.on('close', () => clients.delete(client));
            return;
        }
        if (url.pathname === '/api/conversations' && request.method === 'POST') {
            const body = await readBody(request);
            const conversation = await harness.createConversation(
                {
                    ownership: { kind: 'ownerless' },
                    ...(LIVE && !PROVIDER_ERROR
                        ? { agent: { model: agentModel } }
                        : text(body.agent)
                          ? { agent: { model: { provider: 'faux', modelId: text(body.agent) } } }
                          : {}),
                },
                BACKGROUND_CONTEXT,
            );
            await watchConversation(conversation);
            broadcast(idOf(conversation), translateView(idOf(conversation), views.get(idOf(conversation))!, tasks));
            return json(response, 201, { id: idOf(conversation) });
        }
        const promptMatch = /^\/api\/conversations\/([^/]+)\/prompt$/.exec(url.pathname);
        if (promptMatch && request.method === 'POST') {
            if (PROVIDER_ERROR) return json(response, 503, PROVIDER_ERROR);
            const id = promptMatch[1]!;
            const conversation = conversations.get(id);
            if (!conversation) return json(response, 404, { error: 'unknown-conversation', recovery: 'choose another tab' });
            const body = await readBody(request);
            const prompt = text(body.text).trim();
            if (!prompt) return json(response, 400, { error: 'empty-prompt', recovery: 'type a question' });
            const requestID = text(body.requestId) || crypto.randomUUID();
            const mode = text(body.mode) === 'followUp' ? 'followUp' : 'steer';
            if (await storage.submissionByRequest(Number(id) as never, requestID, BACKGROUND_CONTEXT)) {
                return json(response, 200, { status: 'duplicate', requestId: requestID });
            }
            if (!LIVE) faux.appendResponses([fauxAssistantMessage(answerFor(prompt))]);
            const submission = await conversation.submit(
                { type: 'input', content: prompt, requestId: requestID, whenBusy: mode },
                BACKGROUND_CONTEXT,
            );
            void submission.wait(BACKGROUND_CONTEXT).then(async (settled) => {
                if (settled.status === 'done' && settled.type === 'input' && settled.answer !== undefined) {
                    await conversation.commit((tx) => tx.entry(AssistantEntry, settled.answer!), BACKGROUND_CONTEXT);
                }
            });
            return json(response, 202, { status: 'accepted', requestId: requestID });
        }
        const forkMatch = /^\/api\/conversations\/([^/]+)\/fork$/.exec(url.pathname);
        if (forkMatch && request.method === 'POST') {
            const id = forkMatch[1]!;
            const conversation = conversations.get(id);
            if (!conversation) return json(response, 404, { error: 'unknown-conversation', recovery: 'choose another tab' });
            const body = await readBody(request);
            const entryID = body.entryId ?? views.get(id)?.entries.at(-1)?.id;
            if (typeof entryID !== 'string' && typeof entryID !== 'number')
                return json(response, 400, { error: 'no-entry', recovery: 'select an entry first' });
            const child = await conversation.fork(entryID as never, {
                ownership: { kind: 'ownerless' },
                agent: { model: agentModel },
            }, BACKGROUND_CONTEXT);
            await watchConversation(child);
            const childID = idOf(child);
            broadcast(childID, forkOps(id, childID, entryID));
            broadcast(childID, translateView(childID, views.get(childID)!, tasks));
            return json(response, 201, { id: childID, from: id, entryId: String(entryID) });
        }
        const signalMatch = /^\/api\/conversations\/([^/]+)\/signal$/.exec(url.pathname);
        if (signalMatch && request.method === 'POST') {
            if (!approvalTaskID) return json(response, 404, { error: 'no-task', recovery: 'reload the page' });
            const body = await readBody(request);
            const result = await harness.signal(
                approvalTaskID as unknown as TaskId<{ readonly allow: boolean }>,
                Approval,
                text(body.key) || APPROVAL_KEY,
                { allow: body.value !== false },
                BACKGROUND_CONTEXT,
            );
            broadcast(signalMatch[1]!, translateTasks(signalMatch[1]!, tasks));
            return json(response, 200, { status: result });
        }
        const abortMatch = /^\/api\/conversations\/([^/]+)\/abort$/.exec(url.pathname);
        if (abortMatch && request.method === 'POST') {
            const conversation = conversations.get(abortMatch[1]!);
            if (!conversation) return json(response, 404, { error: 'unknown-conversation', recovery: 'choose another tab' });
            await conversation.abort(BACKGROUND_CONTEXT);
            return json(response, 200, { status: 'aborted' });
        }
        const loadMatch = /^\/api\/scenarios\/([^/]+)\/load$/.exec(url.pathname);
        if (loadMatch && request.method === 'POST') {
            const scenario = SCENARIOS.find((entry) => entry.id === loadMatch[1]);
            if (!scenario) return json(response, 404, { error: 'unknown-scenario', recovery: 'pick a listed scenario' });
            if (LIVE)
                return json(response, 400, {
                    error: 'scenario-unavailable',
                    recovery: 'use ?scenario=<id> in faux mode; live mode does not seed fixture answers',
                });
            const conversation = await harness.createConversation(
                { ownership: { kind: 'ownerless' }, agent: { model: agentModel } },
                BACKGROUND_CONTEXT,
            );
            await watchConversation(conversation);
            faux.appendResponses([fauxAssistantMessage(answerFor(scenario.question))]);
            await seed(conversation, scenario.question, `${scenario.id}-${idOf(conversation)}`);
            const id = idOf(conversation);
            broadcast(id, translateView(id, views.get(id)!, tasks));
            return json(response, 201, { id, scenario: scenario.id });
        }
        const route = routes[url.pathname];
        if (route && request.method === 'GET') return route(request, response);
        return json(response, 404, { error: 'not-found', recovery: 'check the URL' });
    } catch (error) {
        return json(response, 500, {
            error: error instanceof Error ? error.message : String(error),
            recovery: 'reload and retry',
        });
    }
});

server.listen(PORT, '127.0.0.1', () => console.log(`pi-durable server on http://127.0.0.1:${PORT}`));

process.on('SIGINT', () => {
    void harness.close(BACKGROUND_CONTEXT).finally(() => {
        server.close();
        process.exit(0);
    });
});
