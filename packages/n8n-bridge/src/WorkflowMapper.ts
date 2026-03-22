import type { GraphSpec } from 'spacegraphjs';
import type { N8nWorkflowJSON, N8nNodeSpec, N8nConnectionSpec } from './types';

export class WorkflowMapper {
  // Map n8n node type string -> SpaceGraph node type class name
  static resolveNodeType(n8nType: string): string {
    const typeMapping: Record<string, string> = {
      trigger: 'N8nTriggerNode',
      webhook: 'N8nTriggerNode',
      schedule: 'N8nScheduleNode',
      cron: 'N8nScheduleNode',
      http: 'N8nHttpNode',
      ai: 'N8nAiNode',
      llm: 'N8nAiNode',
      chain: 'N8nAiNode',
      code: 'N8nCodeNode',
      vectorStore: 'ChartNode',
      subWorkflow: 'GroupNode',
      switch: 'ShapeNode',
      'if': 'ShapeNode',
      merge: 'ShapeNode',
      set: 'DataNode',
      noop: 'DataNode',
      credential: 'N8nCredentialNode',
      wait: 'N8nHitlNode',
      hitl: 'N8nHitlNode',
      SpaceGraphVisionOptimizerNode: 'N8nVisionOptimizerNode'
    };

    const typeKey = Object.keys(typeMapping).find((key) => n8nType.includes(key));
    return typeKey ? typeMapping[typeKey] : 'DataNode';
  }

  // n8n Workflow JSON -> SpaceGraph GraphSpec
  static toGraphSpec(workflow: N8nWorkflowJSON): GraphSpec {
    const nodes = workflow.nodes.map((n8nNode: N8nNodeSpec) => {
      const type = WorkflowMapper.resolveNodeType(n8nNode.type);
      return {
        id: n8nNode.id || n8nNode.name,
        type: type,
        label: n8nNode.name,
        position: [n8nNode.position[0], -n8nNode.position[1], 0] as [number, number, number], // Invert Y for 3D coordinates
        parameters: n8nNode.parameters,
        n8nType: n8nNode.type
      };
    });

    let edgeIdCounter = 0;

    const edges = Object.entries(workflow.connections).flatMap(([sourceNodeName, outputs]) => {
      const sourceNode = workflow.nodes.find((n) => n.name === sourceNodeName);
      if (!sourceNode) return [];
      const sourceId = sourceNode.id || sourceNode.name;

      return Object.entries(outputs).flatMap(([outputType, targets]) =>
        targets.flatMap((target) =>
          target.flatMap((t) => {
            const targetNode = workflow.nodes.find((n) => n.name === t.node);
            if (!targetNode) return [];
            const targetId = targetNode.id || targetNode.name;

            const edgeType = outputType === 'false' || outputType === 'true' ? 'CurvedEdge' : 'FlowEdge';

            return [{
              id: `edge-${edgeIdCounter++}`,
              source: sourceId,
              target: targetId,
              type: edgeType,
              n8nOutputIndex: t.index,
              n8nOutputType: outputType
            }];
          })
        )
      );
    });

    return {
      nodes,
      edges,
      layout: { type: 'HierarchicalLayout', direction: 'LR' }
    };
  }

  // Map SpaceGraph node type class name -> n8n node type string
  static resolveN8nType(sgType: string): string {
    const typeMap: Record<string, string> = {
      'N8nTriggerNode': 'n8n-nodes-base.webhook',
      'N8nScheduleNode': 'n8n-nodes-base.scheduleTrigger',
      'N8nHttpNode': 'n8n-nodes-base.httpRequest',
      'N8nAiNode': '@n8n/n8n-nodes-langchain.agent',
      'N8nCodeNode': 'n8n-nodes-base.code',
      'ChartNode': '@n8n/n8n-nodes-langchain.vectorStorePinecone',
      'GroupNode': 'n8n-nodes-base.subWorkflow',
      'ShapeNode': 'n8n-nodes-base.if',
      'DataNode': 'n8n-nodes-base.set',
      'N8nCredentialNode': 'n8n-nodes-base.credential',
      'N8nHitlNode': 'n8n-nodes-base.wait',
      'N8nVisionOptimizerNode': 'n8n-nodes-base.spaceGraphVisionOptimizer'
    };
    return typeMap[sgType] || 'n8n-nodes-base.noop';
  }

  // SpaceGraph GraphSpec -> n8n Workflow JSON
  static toN8nJSON(spec: GraphSpec): N8nWorkflowJSON {
    const nodes: N8nNodeSpec[] = (spec.nodes || []).map((sgNode) => {
      const type = (sgNode as any).n8nType || WorkflowMapper.resolveN8nType(sgNode.type);
      const name = sgNode.label || sgNode.id;

      return {
        id: sgNode.id,
        name,
        type,
        typeVersion: 1,
        position: sgNode.position ? [sgNode.position[0], -sgNode.position[1]] : [0, 0],
        parameters: (sgNode as any).parameters || {}
      };
    });

    const connections: N8nConnectionSpec = nodes.reduce((acc, node) => {
      acc[node.name] = { main: [[]] };
      return acc;
    }, {} as N8nConnectionSpec);

    (spec.edges || []).forEach((sgEdge) => {
      const sourceNode = nodes.find((n) => n.id === sgEdge.source);
      const targetNode = nodes.find((n) => n.id === sgEdge.target);

      if (sourceNode && targetNode) {
        const outputType = (sgEdge as any).n8nOutputType || 'main';
        const outputIndex = (sgEdge as any).n8nOutputIndex || 0;

        connections[sourceNode.name][outputType] ??= [];
        connections[sourceNode.name][outputType][0] ??= [];

        connections[sourceNode.name][outputType][0].push({
          node: targetNode.name,
          type: 'main',
          index: outputIndex
        });
      }
    });

    return {
      id: '',
      name: 'Exported SpaceGraph Workflow',
      active: false,
      nodes,
      connections,
      settings: {},
      tags: []
    };
  }
}
