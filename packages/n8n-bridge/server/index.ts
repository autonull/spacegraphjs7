import { WebSocketServer, WebSocket } from 'ws';
// Using a stub implementation for the n8n start as n8n's programmatic API
// requires specific environment setup not fully specified here, but this
// acts as the bridge server.

async function main() {
    console.log('[N8nBridgeServer] Starting server...');

    const wss = new WebSocketServer({ port: 5679 });
    const clients = new Set<WebSocket>();

    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log('[N8nBridgeServer] Client connected.');

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                handleMessage(ws, data);
            } catch (e) {
                console.error('[N8nBridgeServer] Error handling message', e);
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            console.log('[N8nBridgeServer] Client disconnected.');
        });
    });

    console.log('[N8nBridgeServer] Listening on ws://localhost:5679');

    function broadcast(message: any) {
        const payload = JSON.stringify(message);
        for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        }
    }

    function handleMessage(ws: WebSocket, message: any) {
        switch (message.type) {
            case 'loadWorkflow':
                // Stub for workflow loading logic
                // Should fetch workflow from n8n DB or API
                console.log(`[N8nBridgeServer] Loading workflow ${message.workflowId}`);
                ws.send(JSON.stringify({
                    type: 'workflow:loaded',
                    data: {
                        id: message.workflowId,
                        name: 'Demo Workflow',
                        nodes: [],
                        connections: {},
                        active: true,
                        settings: {},
                        tags: []
                    }
                }));
                break;
            case 'node:moved':
                console.log(`[N8nBridgeServer] Node ${message.nodeId} moved to ${message.position}`);
                // Stub for patching workflow JSON in n8n DB
                break;
            case 'execute:trigger':
                console.log(`[N8nBridgeServer] Triggering execution ${message.executionId} for workflow ${message.workflowId}`);

                // Mock sequence of execution events
                const mockNodes = ['node1', 'node2', 'node3'];

                // 1. Set all to waiting
                mockNodes.forEach(nodeId => {
                    broadcast({
                        type: 'execution:progress',
                        data: { executionId: message.executionId, status: 'waiting', nodeId }
                    });
                });

                let delay = 500;

                // 2. Cycle through nodes running -> success/error
                mockNodes.forEach((nodeId, idx) => {
                    setTimeout(() => {
                        broadcast({
                            type: 'execution:progress',
                            data: { executionId: message.executionId, status: 'running', nodeId }
                        });
                    }, delay);

                    delay += 1000;

                    setTimeout(() => {
                        const isError = idx === mockNodes.length - 1; // Make the last node error
                        broadcast({
                            type: 'execution:progress',
                            data: {
                                executionId: message.executionId,
                                status: isError ? 'error' : 'success',
                                nodeId,
                                error: isError ? 'Mock error occurred' : undefined
                            }
                        });
                    }, delay);
                });

                // 3. Execution complete
                setTimeout(() => {
                    broadcast({
                        type: 'execution:complete',
                        data: {
                            executionId: message.executionId,
                            status: 'error'
                        }
                    });
                }, delay + 500);
                break;
            default:
                console.warn('[N8nBridgeServer] Unknown message type:', message.type);
        }
    }
}

main().catch(console.error);
