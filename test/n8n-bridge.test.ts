import { describe, it, expect, vi } from 'vitest';
import { WorkflowMapper } from '../packages/n8n-bridge/src/WorkflowMapper';
import { N8nVisionHealer } from '../packages/n8n-bridge/src/N8nVisionHealer';
import type { N8nWorkflowJSON } from '../packages/n8n-bridge/src/types';

describe('n8n-bridge Unit Tests', () => {
    describe('WorkflowMapper', () => {
        it('should correctly map n8n JSON to SpaceGraph GraphSpec', () => {
            const n8nJson: N8nWorkflowJSON = {
                id: 'workflow-1',
                name: 'Test Workflow',
                active: true,
                settings: {},
                tags: [],
                nodes: [
                    {
                        id: 'node-1',
                        name: 'Webhook',
                        type: 'n8n-nodes-base.webhook',
                        typeVersion: 1,
                        position: [100, 200],
                        parameters: { path: 'test' }
                    },
                    {
                        id: 'node-2',
                        name: 'HTTP Request',
                        type: 'n8n-nodes-base.httpRequest',
                        typeVersion: 1,
                        position: [300, 200],
                        parameters: { url: 'https://example.com' }
                    }
                ],
                connections: {
                    'Webhook': {
                        'main': [
                            [
                                {
                                    node: 'HTTP Request',
                                    type: 'main',
                                    index: 0
                                }
                            ]
                        ]
                    }
                }
            };

            const spec = WorkflowMapper.toGraphSpec(n8nJson);

            expect(spec.nodes).toBeDefined();
            expect(spec.nodes?.length).toBe(2);

            // Check node 1 mapped correctly
            const node1 = spec.nodes?.find(n => n.id === 'node-1');
            expect(node1).toBeDefined();
            expect(node1?.type).toBe('N8nTriggerNode'); // Resolves webhook to trigger node
            expect(node1?.position).toEqual([100, -200, 0]); // Y is inverted for 3D

            // Check node 2 mapped correctly
            const node2 = spec.nodes?.find(n => n.id === 'node-2');
            expect(node2).toBeDefined();
            expect(node2?.type).toBe('N8nHttpNode');

            // Check edges mapped correctly
            expect(spec.edges).toBeDefined();
            expect(spec.edges?.length).toBe(1);
            expect(spec.edges?.[0].source).toBe('node-1');
            expect(spec.edges?.[0].target).toBe('node-2');
            expect(spec.edges?.[0].type).toBe('FlowEdge'); // Default to FlowEdge
        });

        it('should correctly map SpaceGraph GraphSpec to n8n JSON', () => {
            const spec = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'N8nTriggerNode',
                        label: 'Webhook',
                        position: [100, -200, 0] as [number, number, number],
                        parameters: { path: 'test' }
                    },
                    {
                        id: 'node-2',
                        type: 'N8nHttpNode',
                        label: 'HTTP Request',
                        position: [300, -200, 0] as [number, number, number],
                        parameters: { url: 'https://example.com' }
                    }
                ],
                edges: [
                    {
                        id: 'edge-1',
                        source: 'node-1',
                        target: 'node-2',
                        type: 'FlowEdge'
                    }
                ]
            };

            const n8nJson = WorkflowMapper.toN8nJSON(spec);

            expect(n8nJson.nodes).toBeDefined();
            expect(n8nJson.nodes.length).toBe(2);

            const node1 = n8nJson.nodes.find(n => n.id === 'node-1');
            expect(node1?.type).toBe('n8n-nodes-base.webhook');
            expect(node1?.position).toEqual([100, 200]); // Y is reverted

            expect(n8nJson.connections).toBeDefined();
            expect(n8nJson.connections['Webhook']).toBeDefined();
            expect(n8nJson.connections['Webhook']['main']).toBeDefined();
            expect(n8nJson.connections['Webhook']['main'][0][0].node).toBe('HTTP Request');
        });
    });

    describe('N8nVisionHealer', () => {
        it('should call vision analyze and fix layout if score is low', async () => {
            let score = 50;

            const mockVisionManager = {
                analyzeVision: vi.fn().mockImplementation(async () => {
                    return { layoutScore: score, overlap: { overlaps: [] } };
                })
            };

            const mockForceLayout = {
                update: vi.fn()
            };

            const mockPluginManager = {
                getPlugin: vi.fn().mockReturnValue(mockForceLayout)
            };

            const mockSg = {
                vision: mockVisionManager,
                pluginManager: mockPluginManager,
                graph: {
                    nodes: new Map()
                }
            };

            const mockBridge = {
                pushNodePositionUpdate: vi.fn()
            };

            const healer = new N8nVisionHealer(mockBridge as any, mockSg as any);

            // Run heal
            const reportPromise = healer.healLayout('wf-1');

            // On second call to analyzeVision, score should be updated if force layout did its job
            // For the mock, we'll just bump it
            score = 80;

            const report = await reportPromise;

            expect(mockVisionManager.analyzeVision).toHaveBeenCalledTimes(2);
            expect(mockForceLayout.update).toHaveBeenCalledTimes(100);
            expect(report.layoutScore).toBe(80);
        });
    });
});

import { N8nScheduleNode } from '../src/nodes/N8nScheduleNode';
import { N8nCredentialNode } from '../src/nodes/N8nCredentialNode';
import { N8nHitlNode } from '../src/nodes/N8nHitlNode';
import { ExecutionLogPanel } from '../src/nodes/ExecutionLogPanel';
import { N8nCodeNode } from '../src/nodes/N8nCodeNode';
import { N8nHttpNode } from '../src/nodes/N8nHttpNode';
import { N8nAiNode } from '../src/nodes/N8nAiNode';
import { N8nPaletteNode } from '../src/nodes/N8nPaletteNode';
import { N8nVisionOptimizerNode } from '../src/nodes/N8nVisionOptimizerNode';
import { SpaceGraph } from '../src/SpaceGraph';

describe('N8n Nodes LOD Tests', () => {
    it('N8nScheduleNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-1',
            type: 'N8nScheduleNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nScheduleNode(sg, spec);
        node.parameters = { cronExpression: '0 0 * * *' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Schedule Cron');
        expect(node.domElement?.innerHTML).toContain('Cron Expression');
        expect(node.domElement?.innerHTML).toContain('input');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('Schedule Node');
        expect(node.domElement?.innerHTML).toContain('Next Run');
        expect(node.domElement?.innerHTML).not.toContain('Cron Expression');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('Schedule');
        expect(node.domElement?.innerHTML).not.toContain('Schedule Node');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('🕐');
        expect(node.domElement?.innerHTML).not.toContain('Schedule');
    });

    it('N8nCredentialNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-cred',
            type: 'N8nCredentialNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nCredentialNode(sg, spec);
        node.parameters = { service: 'AWS', apiKey: 'test-key' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('AWS Credentials');
        expect(node.domElement?.innerHTML).toContain('API Key');
        expect(node.domElement?.innerHTML).toContain('input type="password"');
        expect(node.domElement?.innerHTML).toContain('Test Connection');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('AWS');
        expect(node.domElement?.innerHTML).toContain('Key Configured');
        expect(node.domElement?.innerHTML).not.toContain('input type="password"');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('Credential');
        expect(node.domElement?.innerHTML).not.toContain('AWS');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('🔒');
        expect(node.domElement?.innerHTML).not.toContain('Credential');
    });

    it('N8nHitlNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn(),
                pluginManager: { getPlugin: vi.fn() }
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-hitl',
            type: 'N8nHitlNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nHitlNode(sg, spec);
        node.parameters = { taskSummary: 'Please approve the transaction', status: 'waiting' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Human Intervention');
        expect(node.domElement?.innerHTML).toContain('Please approve the transaction');
        expect(node.domElement?.innerHTML).toContain('Approve');
        expect(node.domElement?.innerHTML).toContain('Reject');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('Human in Loop');
        expect(node.domElement?.innerHTML).toContain('Please approve the transaction');
        expect(node.domElement?.innerHTML).not.toContain('Approve');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('HITL');
        expect(node.domElement?.innerHTML).not.toContain('Human in Loop');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('👤');
        expect(node.domElement?.innerHTML).not.toContain('HITL');
    });

    it('ExecutionLogPanel should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-log',
            type: 'ExecutionLogPanel',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new ExecutionLogPanel(sg, spec);

        expect(node.domElement).toBeDefined();

        // Add a log to see if it renders
        node.addLog('Started execution', 'info');

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Execution Log');
        expect(node.domElement?.innerHTML).toContain('Started execution');
        expect(node.domElement?.textContent).toContain('Started execution'); // in the logsContainer

        // 2. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('Exec Log');
        // Because display is none, text might still be in innerHTML, but let's just check the title change
        expect(node.domElement?.textContent).toContain('Exec Log');

        // 3. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('📄');
    });

    it('N8nCodeNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-code',
            type: 'N8nCodeNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nCodeNode(sg, spec);
        node.parameters = { jsCode: 'console.log("hello");\nreturn items;' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Code Editor');
        const textarea = node.domElement?.querySelector('textarea');
        expect(textarea?.value).toContain('console.log("hello");');
        expect(node.domElement?.innerHTML).toContain('textarea');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('Code');
        expect(node.domElement?.innerHTML).toContain('console.log("hello");');
        expect(node.domElement?.innerHTML).not.toContain('textarea');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('JS Code');
        expect(node.domElement?.innerHTML).not.toContain('console.log');

        // 4. Icon view
        node.updateLod(1000);
        // It renders 'JS' in icon view as well as label/summary (in the badge)
        // But in icon view, it should just be 'JS' with no 'Code'
        expect(node.domElement?.innerHTML).toContain('JS');
        expect(node.domElement?.innerHTML).not.toContain('Code');
    });

    it('N8nHttpNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-http',
            type: 'N8nHttpNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nHttpNode(sg, spec);
        node.parameters = { requestMethod: 'POST', url: 'https://api.github.com' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('HTTP Request');
        const input = node.domElement?.querySelector('input');
        expect(input?.value).toBe('https://api.github.com');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('api.github.com');
        expect(node.domElement?.innerHTML).not.toContain('input type="text"');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('HTTP Request');
        expect(node.domElement?.innerHTML).not.toContain('api.github.com');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('🌐');
        expect(node.domElement?.innerHTML).not.toContain('HTTP Request');
    });

    it('N8nAiNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-ai',
            type: 'N8nAiNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nAiNode(sg, spec);
        node.parameters = { model: 'gpt-4', prompt: 'You are a helpful assistant.' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('AI Agent');
        expect(node.domElement?.innerHTML).toContain('textarea');
        // it sets textarea value but it's not reflected in innerHTML always, let's test content of textarea directly or just check it rendered.
        const textarea = node.domElement?.querySelector('textarea');
        expect(textarea?.value).toBe('You are a helpful assistant.');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('AI Agent');
        expect(node.domElement?.innerHTML).toContain('gpt-4');
        expect(node.domElement?.innerHTML).toContain('You are a helpful assistant.');
        expect(node.domElement?.innerHTML).not.toContain('textarea');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('AI Agent');
        expect(node.domElement?.innerHTML).not.toContain('gpt-4');
        expect(node.domElement?.innerHTML).not.toContain('You are a helpful assistant.');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('✨');
        expect(node.domElement?.innerHTML).not.toContain('AI Agent');
    });

    it('N8nPaletteNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-palette',
            type: 'N8nPaletteNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nPaletteNode(sg, spec);

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Node Palette');
        expect(node.domElement?.innerHTML).toContain('TriggerNode');

        // 2. Label view (Palette has no summary, skips straight to label at 400+)
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('🎨 Palette');
        expect(node.domElement?.innerHTML).not.toContain('TriggerNode');

        // 3. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('🎨');
        expect(node.domElement?.innerHTML).not.toContain('Palette');
    });

    it('N8nVisionOptimizerNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-opt',
            type: 'N8nVisionOptimizerNode',
            position: [0, 0, 0] as [number, number, number],
        } as any;

        const node = new N8nVisionOptimizerNode(sg, spec);
        node.parameters = { score: 85 };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Vision Optimizer');
        expect(node.domElement?.innerHTML).toContain('Auto-Fix Layout');
        expect(node.domElement?.innerHTML).toContain('85/100');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('Optimizer');
        expect(node.domElement?.innerHTML).toContain('Score: 85');
        expect(node.domElement?.innerHTML).not.toContain('Auto-Fix Layout');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('Vision Opt.');
        expect(node.domElement?.innerHTML).not.toContain('Score: 85');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('👁️');
        expect(node.domElement?.innerHTML).not.toContain('Vision Opt.');
    });
});
