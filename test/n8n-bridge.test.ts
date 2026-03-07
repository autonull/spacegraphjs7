import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowMapper } from '../packages/n8n-bridge/src/WorkflowMapper';
import { N8nBridge } from '../packages/n8n-bridge/src/spacegraph-n8n-bridge';
import { N8nVisionHealer } from '../packages/n8n-bridge/src/N8nVisionHealer';
import { SpaceGraph } from '../src/SpaceGraph';
import type { N8nWorkflowJSON } from '../packages/n8n-bridge/src/types';

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
