import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowMapper } from '../packages/n8n-bridge/src/WorkflowMapper';
import { N8nBridge } from '../packages/n8n-bridge/src/spacegraph-n8n-bridge';
import { N8nVisionHealer } from '../packages/n8n-bridge/src/N8nVisionHealer';
import { SpaceGraph } from '../src/SpaceGraph';
import type { N8nWorkflowJSON } from '../packages/n8n-bridge/src/types';
import { N8nScheduleNode } from '../src/nodes/N8nScheduleNode';
import { N8nCredentialNode } from '../src/nodes/N8nCredentialNode';
import { N8nHitlNode } from '../src/nodes/N8nHitlNode';
import { ExecutionLogPanel } from '../src/nodes/ExecutionLogPanel';
import { N8nCodeNode } from '../src/nodes/N8nCodeNode';
import { N8nHttpNode } from '../src/nodes/N8nHttpNode';
import { N8nAiNode } from '../src/nodes/N8nAiNode';
import { N8nPaletteNode } from '../src/nodes/N8nPaletteNode';
import { N8nVisionOptimizerNode } from '../src/nodes/N8nVisionOptimizerNode';

describe('WorkflowMapper', () => {
    it('toGraphSpec: should map n8n workflow JSON to SpaceGraph spec correctly', () => {
        const workflowJson: N8nWorkflowJSON = {
            id: 'wf-1',
            name: 'Test Workflow',
            active: true,
            settings: {},
            tags: [],
            nodes: [
                {
                    id: 'node-1',
                    name: 'Trigger Node',
                    type: 'n8n-nodes-base.webhook',
                    typeVersion: 1,
                    position: [100, 200],
                    parameters: { key: 'value' }
                },
                {
                    id: 'node-2',
                    name: 'AI Node',
                    type: '@n8n/n8n-nodes-langchain.agent',
                    typeVersion: 1,
                    position: [300, 200],
                    parameters: { prompt: 'hello' }
                }
            ],
            connections: {
                'Trigger Node': {
                    main: [
                        [
                            {
                                node: 'AI Node',
                                type: 'main',
                                index: 0
                            }
                        ]
                    ]
                }
            }
        };

        const spec = WorkflowMapper.toGraphSpec(workflowJson);

        expect(spec.nodes?.length).toBe(2);

        // Check node 1
        const sgNode1 = spec.nodes?.find(n => n.id === 'node-1');
        expect(sgNode1).toBeDefined();
        expect(sgNode1?.type).toBe('N8nTriggerNode');
        expect(sgNode1?.position).toEqual([100, -200, 0]); // Y inverted
        expect(sgNode1?.parameters?.key).toBe('value');

        // Check node 2
        const sgNode2 = spec.nodes?.find(n => n.id === 'node-2');
        expect(sgNode2).toBeDefined();
        expect(sgNode2?.type).toBe('N8nAiNode');

        // Check edges
        expect(spec.edges?.length).toBe(1);
        expect(spec.edges?.[0].source).toBe('node-1');
        expect(spec.edges?.[0].target).toBe('node-2');
        expect(spec.edges?.[0].type).toBe('FlowEdge'); // Default
    });

    it('toN8nJSON: should map SpaceGraph spec back to n8n workflow JSON', () => {
        const sgSpec = {
            nodes: [
                {
                    id: 'node-1',
                    type: 'N8nTriggerNode',
                    label: 'Trigger Node',
                    position: [100, -200, 0] as [number, number, number],
                    parameters: { key: 'value' }
                },
                {
                    id: 'node-2',
                    type: 'N8nAiNode',
                    label: 'AI Node',
                    position: [300, -200, 0] as [number, number, number],
                    parameters: { prompt: 'hello' }
                }
            ],
            edges: [
                {
                    id: 'edge-0',
                    source: 'node-1',
                    target: 'node-2',
                    type: 'FlowEdge'
                }
            ]
        };

        const workflowJson = WorkflowMapper.toN8nJSON(sgSpec);

        expect(workflowJson.nodes.length).toBe(2);
        const n8nNode1 = workflowJson.nodes.find(n => n.id === 'node-1');
        expect(n8nNode1?.type).toBe('n8n-nodes-base.webhook'); // Resolved correctly
        expect(n8nNode1?.position).toEqual([100, 200]); // Y inverted back

        expect(workflowJson.connections['Trigger Node']).toBeDefined();
        expect(workflowJson.connections['Trigger Node']['main'][0][0].node).toBe('AI Node');
    });
});

describe('N8nBridge', () => {
    let bridge: N8nBridge;
    let sg: SpaceGraph;

    beforeEach(() => {
        // Mock global WebSocket
        (global as any).WebSocket = class {
            readyState = 1;
            send = vi.fn();
            close = vi.fn();
            onopen = null;
            onmessage = null;
            onclose = null;
        };

        // Mock SpaceGraph
        sg = {
            graph: { nodes: new Map(), edges: [] },
            loadSpec: vi.fn(),
            renderer: { scene: {} }
        } as unknown as SpaceGraph;

        bridge = new N8nBridge(sg, 'ws://mock');
        // Let the constructor's new WebSocket() take effect, then force readyState to OPEN
        // Since we are mocking the class, the instance was created inside bridge
        (bridge as any).wsClient = {
            readyState: 1, // WebSocket.OPEN
            send: vi.fn(),
            close: vi.fn()
        };
    });

    it('pushNodePositionUpdate: should format WS payload correctly', () => {
        const sendSpy = (bridge as any).wsClient.send;
        bridge.pushNodePositionUpdate('node-123', 100, -50);

        expect(sendSpy).toHaveBeenCalled();

        const payload = JSON.parse(sendSpy.mock.calls[0][0]);
        expect(payload.type).toBe('node:moved');
        expect(payload.nodeId).toBe('node-123');
        expect(payload.position).toEqual([100, 50]); // Y gets inverted -(-50) = 50
    });

    it('executeWorkflow: should send trigger payload and return an execution ID', async () => {
        const sendSpy = (bridge as any).wsClient.send;
        const executionIdPromise = bridge.executeWorkflow('wf-abc');

        expect(sendSpy).toHaveBeenCalled();

        const payload = JSON.parse(sendSpy.mock.calls[0][0]);
        expect(payload.type).toBe('execute:trigger');
        expect(payload.workflowId).toBe('wf-abc');
        expect(payload.executionId).toBeDefined();

        const executionId = await executionIdPromise;
        expect(executionId).toBe(payload.executionId);
    });
});

describe('N8nVisionHealer', () => {
    let healer: N8nVisionHealer;
    let bridge: N8nBridge;
    let sg: SpaceGraph;
    let mockForceLayoutRun: any;
    let mockErgonomicsFix: any;
    let mockAnalyzeVision: any;

    beforeEach(() => {
        (global as any).WebSocket = class {
            readyState = 1;
            send = vi.fn();
            close = vi.fn();
        };

        mockForceLayoutRun = vi.fn().mockResolvedValue(undefined);
        mockErgonomicsFix = vi.fn().mockResolvedValue(undefined);

        // First call returns bad score, second call returns good score
        mockAnalyzeVision = vi.fn()
            .mockResolvedValueOnce({ layoutScore: 50, overlap: { overlaps: [] }, legibility: { items: [] }, colorHarmony: { issues: [] } })
            .mockResolvedValueOnce({ layoutScore: 80, overlap: { overlaps: [] }, legibility: { items: [] }, colorHarmony: { issues: [] } });

        sg = {
            graph: { nodes: new Map(), edges: [] },
            pluginManager: {
                get: vi.fn((name) => {
                    if (name === 'ForceLayout') return { run: mockForceLayoutRun };
                    if (name === 'ErgonomicsPlugin') return { fixOverlaps: mockErgonomicsFix };
                    return null;
                })
            },
            vision: {
                analyzeVision: mockAnalyzeVision
            }
        } as unknown as SpaceGraph;

        bridge = new N8nBridge(sg);
        healer = new N8nVisionHealer(bridge, sg);
    });

    it('healLayout: should invoke ForceLayout if layoutScore is below threshold', async () => {
        const report = await healer.healLayout('wf-1');

        // Assert ForceLayout was run
        expect(mockForceLayoutRun).toHaveBeenCalled();
        expect(mockAnalyzeVision).toHaveBeenCalledTimes(2);

        // Final report should be the second one
        expect(report.layoutScore).toBe(80);
    });

    it('healLayout: should invoke ErgonomicsPlugin if overlaps are detected', async () => {
        mockAnalyzeVision = vi.fn().mockResolvedValue({
            layoutScore: 80, // High enough to not trigger force layout
            overlap: { overlaps: [{ nodeA: 'a', nodeB: 'b' }] }, // Has overlaps
            legibility: { items: [] },
            colorHarmony: { issues: [] }
        });

        // Re-assign mock
        (sg.vision.analyzeVision as any) = mockAnalyzeVision;

        const report = await healer.healLayout('wf-1');

        expect(mockForceLayoutRun).not.toHaveBeenCalled();
        expect(mockErgonomicsFix).toHaveBeenCalled();
    });
});

describe('N8nNodes LOD logic', () => {
    it('N8nScheduleNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
            }
        } as unknown as SpaceGraph;

        const spec = {
            id: 'node-sch',
            type: 'N8nScheduleNode',
            position: [0, 0, 0] as [number, number, number],
            data: { nextRun: 'in 5 mins' }, // also put in data just in case
        } as any;

        const domElement = document.createElement('div');

        // We can just construct N8nScheduleNode and see its content
        // N8nScheduleNode creates a DOMNode, which needs a domElement.
        // We override the object instantiation.
        const node = new N8nScheduleNode(sg, spec);
        node.parameters = { nextRun: 'in 5 mins' };

        // It creates its own domElement in HtmlNode constructor
        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Schedule Cron');
        expect(node.domElement?.innerHTML).toContain('in 5 mins');
        expect(node.domElement?.innerHTML).toContain('input');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('Schedule Node');
        expect(node.domElement?.innerHTML).toContain('in 5 mins');
        expect(node.domElement?.innerHTML).not.toContain('input');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('Schedule');
        expect(node.domElement?.innerHTML).not.toContain('in 5 mins');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('🕐');
        expect(node.domElement?.innerHTML).not.toContain('Schedule Node');
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
        node.parameters = { service: 'Github', apiKey: 'secret-key' };

        expect(node.domElement).toBeDefined();

        // 1. Full view
        node.updateLod(0);
        expect(node.domElement?.innerHTML).toContain('Github Credentials');
        expect(node.domElement?.innerHTML).toContain('input type="password"');
        expect(node.domElement?.innerHTML).toContain('Test Connection');

        // 2. Summary view
        node.updateLod(200);
        expect(node.domElement?.innerHTML).toContain('Github');
        expect(node.domElement?.innerHTML).toContain('Key Configured');
        expect(node.domElement?.innerHTML).not.toContain('input type="password"');

        // 3. Label view
        node.updateLod(500);
        expect(node.domElement?.innerHTML).toContain('Credential');
        expect(node.domElement?.innerHTML).not.toContain('Github');

        // 4. Icon view
        node.updateLod(1000);
        expect(node.domElement?.innerHTML).toContain('🔒');
        expect(node.domElement?.innerHTML).not.toContain('Credential');
    });

    it('N8nHitlNode should change HTML content based on camera distance (LOD)', () => {
        const sg = {
            events: {
                on: vi.fn(),
                emit: vi.fn()
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
