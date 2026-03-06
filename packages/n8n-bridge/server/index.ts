import '../src/bootstrap';

import { WebSocketServer, WebSocket } from 'ws';
import { Workflow, ExecutionService } from 'n8n-core';
// import { LoadNodeDetailsFromDisk } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import fs from 'node:fs';

const executionService = new ExecutionService();
let nodeTypes: any;

async function initN8n() {
    console.log('[N8nBridgeServer] Initializing n8n execution engine...');
    // In a real implementation we would load actual node types:
    // nodeTypes = await LoadNodeDetailsFromDisk(['n8n-nodes-base.httpRequest', ...]);
    // For now we mock nodeTypes or leave them generic if possible
    nodeTypes = {
        getByNameAndVersion: (name: string, version: number) => {
            return {
                description: { name, version },
            };
        },
        getKnownTypes: () => ({})
    };
}

async function main() {
    await initN8n();
    console.log('[N8nBridgeServer] Starting server...');

    const wss = new WebSocketServer({ port: 5679 });
    const clients = new Set<WebSocket>();

    executionService.on('workflowExecuteAfter', (data: any) => {
        broadcast(clients, { type: 'execution:complete', data });

        // Phase 6: SpaceGraph OS Integration
        // Emit OS-level process entries for n8n workflows
        const osProcessEntry = {
            pid: data.executionId,
            name: data.workflowName || 'Unknown Workflow',
            status: data.status,
            cpu: data.metrics?.cpuUsage || Math.random() * 5, // mock CPU % if undefined
            memory: data.metrics?.memUsage || Math.random() * 50 + 10, // mock Memory MB if undefined
        };

        broadcast(clients, { type: 'os:process:update', data: osProcessEntry });
    });

    // Mock progress events since we don't have real n8n nodes executing in this stub environment
    // In a fully integrated environment, we would listen to node execution events from executionService.

    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log('[N8nBridgeServer] Client connected.');

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                await handleMessage(ws, clients, data);
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

    // Hot-reload safety
    process.on('SIGUSR2', () => {
        fs.rmSync('/tmp/spacegraph-n8n.sqlite', { force: true });
        process.exit(0);
    });
}

function broadcast(clients: Set<WebSocket>, message: any) {
    const payload = JSON.stringify(message);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

export async function runWorkflow(workflowData: IWorkflowBase): Promise<string> {
    const workflow = new Workflow({
        id: workflowData.id ?? 'sg-ephemeral',
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        active: false,
        nodeTypes,
    });
    const result = await executionService.run(workflow, undefined, { mode: 'manual' });
    return result.executionId;
}

async function handleMessage(ws: WebSocket, clients: Set<WebSocket>, message: any) {
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
                broadcast(clients, {
                    type: 'execution:progress',
                    data: { executionId: message.executionId, status: 'waiting', nodeId }
                });
            });

            let delay = 500;

            // 2. Cycle through nodes running -> success/error
            mockNodes.forEach((nodeId, idx) => {
                setTimeout(() => {
                    broadcast(clients, {
                        type: 'execution:progress',
                        data: { executionId: message.executionId, status: 'running', nodeId }
                    });
                }, delay);

                delay += 1000;

                setTimeout(() => {
                    const isError = idx === mockNodes.length - 1; // Make the last node error
                    broadcast(clients, {
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
                broadcast(clients, {
                    type: 'execution:complete',
                    data: {
                        executionId: message.executionId,
                        status: 'error'
                    }
                });

                // Emit OS-level process update
                broadcast(clients, {
                    type: 'os:process:update',
                    data: {
                        pid: message.executionId,
                        name: `Workflow ${message.workflowId}`,
                        status: 'error',
                        cpu: 0,
                        memory: 0
                    }
                });
            }, delay + 500);
            break;
        default:
            console.warn('[N8nBridgeServer] Unknown message type:', message.type);
    }
}

main().catch(console.error);
