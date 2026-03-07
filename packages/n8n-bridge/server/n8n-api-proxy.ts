import { IncomingMessage, ServerResponse } from 'node:http';

export function handleRequest(req: IncomingMessage, res: ServerResponse) {
    // Add CORS headers so frontend widgets can communicate
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Stub for workflow saving
    if (url.pathname.startsWith('/api/v1/workflows')) {
        if (req.method === 'PATCH' || req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Workflow saved in memory' }));
            return;
        }
        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: 'stub-workflow', name: 'Stub Workflow', nodes: [], connections: {} }));
            return;
        }
    }

    // Stub for credentials
    if (url.pathname.startsWith('/api/v1/credentials')) {
        if (req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, id: 'cred-123' }));
            return;
        }
    }

    // Stub for HITL resume execution
    if (url.pathname.startsWith('/api/v1/executions/') && url.pathname.endsWith('/resume')) {
        if (req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Execution resumed' }));
            return;
        }
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
}
