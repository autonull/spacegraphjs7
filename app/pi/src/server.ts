import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { AgentEventMapper, type AgentEvent } from '@spacegraphjs/agent';
import type { KernelOp } from '@spacegraphjs/kernel';
import { localOps } from './local-feed';
import { encodeOp } from './ops';
import { PiEventTranslator, type PiEvent } from './pi-events';

const PORT = Number(process.env.PI_SERVER_PORT ?? 8787);
const RUN_ID = 'live';
const mapper = new AgentEventMapper('pi');

type LiveSession = {
    dispose(): void;
    prompt(text: string, options?: { streamingBehavior?: 'steer' | 'followUp' }): Promise<void>;
    subscribe(listener: (event: unknown) => void): () => void;
};

type Client = {
    response: ServerResponse;
    session?: LiveSession;
    translator?: PiEventTranslator;
    unavailable?: string;
};

const clients = new Map<string, Client>();

const send = (client: Client, ops: readonly KernelOp[]): void => {
    for (const op of ops) client.response.write(encodeOp(op));
};

const emit = (client: Client, event: AgentEvent): void => send(client, mapper.map(event));

const startSession = async (client: Client): Promise<LiveSession> => {
    if (client.session) return client.session;
    const { createAgentSession, SessionManager } = await import('@earendil-works/pi-coding-agent');
    const created = await createAgentSession({ sessionManager: SessionManager.inMemory() });
    client.session = created.session as unknown as LiveSession;
    client.translator = new PiEventTranslator(RUN_ID);
    emit(client, { type: 'run-start', runId: RUN_ID });
    client.session.subscribe((raw) => {
        const events = client.translator?.translate(raw as PiEvent) ?? [];
        for (const event of events) emit(client, event);
    });
    if (created.modelFallbackMessage) {
        client.unavailable = created.modelFallbackMessage;
        emit(client, { type: 'run-settled', runId: RUN_ID, aborted: true });
        emit(client, { type: 'state', runId: RUN_ID, unitId: '1', reason: 'no-provider' });
    }
    return client.session;
};

const json = (response: ServerResponse, status: number, body: unknown): void => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
};

const readBody = async (request: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
};

type PromptBody = { client?: string; text?: string; mode?: 'steer' | 'followUp' };

const parseBody = (raw: string): PromptBody | undefined => {
    try {
        return JSON.parse(raw) as PromptBody;
    } catch {
        return undefined;
    }
};

const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
    const clientID = url.searchParams.get('client') ?? '';

    if (url.pathname === '/events') {
        response.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
        });
        response.write(': connected\n\n');
        const client: Client = { response };
        clients.set(clientID, client);
        if (process.env.PI_LOCAL_FEED === '1') send(client, localOps());
        request.on('close', () => {
            client.session?.dispose();
            if (clients.get(clientID) === client) clients.delete(clientID);
        });
        return;
    }

    if (url.pathname === '/prompt' && request.method === 'POST') {
        const body = parseBody(await readBody(request));
        if (!body) return json(response, 400, { error: 'invalid JSON' });
        const client = clients.get(body.client ?? clientID);
        if (!client) return json(response, 400, { error: 'no connected page' });
        const text = body.text?.trim();
        if (!text) return json(response, 400, { error: 'empty prompt' });

        if (process.env.PI_LOCAL_FEED === '1') {
            send(client, localOps());
            return json(response, 202, { status: 'local' });
        }

        try {
            const active = await startSession(client);
            if (client.unavailable) return json(response, 503, { error: client.unavailable });
            void active
                .prompt(text, body.mode ? { streamingBehavior: body.mode } : undefined)
                .catch((error: unknown) => {
                    emit(client, {
                        type: 'state',
                        runId: RUN_ID,
                        unitId: '1',
                        reason: 'error',
                        level: error instanceof Error ? error.message : String(error),
                    });
                });
            return json(response, 202, { status: 'accepted' });
        } catch (error) {
            return json(response, 500, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return json(response, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`pi kernel-op server on http://127.0.0.1:${PORT}/events`);
});

process.on('SIGINT', () => {
    for (const client of clients.values()) client.session?.dispose();
    server.close();
    process.exit(0);
});
