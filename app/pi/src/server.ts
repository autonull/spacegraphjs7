import { createServer, type ServerResponse } from 'node:http';
import { AgentEventMapper, type AgentEvent } from '@spacegraphjs/agent';
import type { KernelOp } from '@spacegraphjs/kernel';
import { localOps } from './local-feed';
import { encodeOp } from './ops';
import { PiEventTranslator, type PiEvent } from './pi-events';

const PORT = Number(process.env.PI_SERVER_PORT ?? 8787);
const RUN_ID = 'live';
const mapper = new AgentEventMapper('pi');
const clients = new Set<ServerResponse>();

type LiveSession = {
    dispose(): void;
    prompt(text: string, options?: { streamingBehavior?: 'steer' | 'followUp' }): Promise<void>;
    subscribe(listener: (event: unknown) => void): () => void;
};

let session: LiveSession | undefined;
let translator: PiEventTranslator | undefined;
let unavailable: string | undefined;

const broadcast = (ops: readonly KernelOp[]): void => {
    for (const client of clients) for (const op of ops) client.write(encodeOp(op));
};

const emit = (event: AgentEvent): void => broadcast(mapper.map(event));

const startSession = async (): Promise<LiveSession> => {
    if (session) return session;
    const { createAgentSession, SessionManager } = await import('@earendil-works/pi-coding-agent');
    const created = await createAgentSession({ sessionManager: SessionManager.inMemory() });
    session = created.session as unknown as LiveSession;
    translator = new PiEventTranslator(RUN_ID);
    emit({ type: 'run-start', runId: RUN_ID });
    session.subscribe((raw) => {
        const events = translator?.translate(raw as PiEvent) ?? [];
        for (const event of events) emit(event);
    });
    if (created.modelFallbackMessage) {
        unavailable = created.modelFallbackMessage;
        emit({ type: 'run-settled', runId: RUN_ID, aborted: true });
        emit({ type: 'state', runId: RUN_ID, unitId: '1', reason: 'no-provider' });
    }
    return session;
};

const json = (response: ServerResponse, status: number, body: unknown): void => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
};

const readBody = async (request: import('node:http').IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
};

const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);

    if (url.pathname === '/events') {
        response.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
        });
        response.write(': connected\n\n');
        clients.add(response);
        if (process.env.PI_LOCAL_FEED === '1') broadcast(localOps());
        request.on('close', () => clients.delete(response));
        return;
    }

    if (url.pathname === '/prompt' && request.method === 'POST') {
        const body = JSON.parse(await readBody(request)) as {
            text?: string;
            mode?: 'steer' | 'followUp';
        };
        const text = body.text?.trim();
        if (!text) return json(response, 400, { error: 'empty prompt' });

        if (process.env.PI_LOCAL_FEED === '1') {
            broadcast(localOps());
            return json(response, 202, { status: 'local' });
        }

        try {
            const active = await startSession();
            if (unavailable) return json(response, 503, { error: unavailable });
            void active.prompt(text, body.mode ? { streamingBehavior: body.mode } : undefined).catch((error: unknown) => {
                emit({
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
    session?.dispose();
    server.close();
    process.exit(0);
});
