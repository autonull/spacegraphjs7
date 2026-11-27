import type { IncomingMessage, ServerResponse } from 'node:http';

export const sendJSON = (
    response: ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
): void => {
    response.writeHead(status, { 'content-type': 'application/json', ...headers });
    response.end(JSON.stringify(body));
};

export const readRawBody = async (request: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
};
