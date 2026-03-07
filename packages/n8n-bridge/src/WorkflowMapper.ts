import type { GraphSpec } from 'spacegraphjs';
import type { N8nWorkflowJSON, N8nNodeSpec, N8nConnectionSpec } from './types';

export class WorkflowMapper {
  // Map n8n node type string -> SpaceGraph node type class name
  static resolveNodeType(n8nType: string): string {
    if (n8nType.includes('trigger') || n8nType.includes('webhook')) {
      return 'N8nTriggerNode';
    }
    if (n8nType.includes('schedule') || n8nType.includes('cron')) {
      return 'N8nScheduleNode';
    }
    if (n8nType.includes('http')) {
      return 'N8nHttpNode';
    }
    if (n8nType.includes('ai') || n8nType.includes('llm') || n8nType.includes('chain')) {
      return 'N8nAiNode';
    }
    if (n8nType.includes('code')) {
      return 'N8nCodeNode';
    }
    if (n8nType.includes('vectorStore')) {
      return 'ChartNode'; // Existing
    }
    if (n8nType.includes('subWorkflow')) {
      return 'GroupNode'; // Existing
    }
    if (n8nType.includes('switch') || n8nType.includes('if')) {
      return 'ShapeNode'; // Existing
    }
    if (n8nType.includes('merge')) {
      return 'ShapeNode'; // Existing
    }
    if (n8nType.includes('set') || n8nType.includes('noop')) {
      return 'DataNode'; // Existing
    }
    if (n8nType.includes('credential')) {
      return 'N8nCredentialNode';
    }
    if (n8nType.includes('wait') || n8nType.includes('hitl')) {
      return 'N8nHitlNode';
    }
    if (n8nType.includes('SpaceGraphVisionOptimizerNode')) {
      return 'N8nVisionOptimizerNode';
    }

    // Default to a basic node for unknown types
    return 'DataNode';
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

    const edges: any[] = [];
    let edgeIdCounter = 0;

    Object.entries(workflow.connections).forEach(([sourceNodeName, outputs]) => {
      const sourceNode = workflow.nodes.find(n => n.name === sourceNodeName);
      if (!sourceNode) return;
      const sourceId = sourceNode.id || sourceNode.name;

      Object.entries(outputs).forEach(([outputType, targets]) => {
        targets.forEach(target => {
          target.forEach(t => {
            const targetNode = workflow.nodes.find(n => n.name === t.node);
            if (!targetNode) return;
            const targetId = targetNode.id || targetNode.name;

            // Determine edge type based on logic
            let edgeType = 'FlowEdge';
            if (outputType === 'false') {
               edgeType = 'CurvedEdge'; // Red
            } else if (outputType === 'true') {
               edgeType = 'CurvedEdge'; // Green
            }

            edges.push({
              id: `edge-${edgeIdCounter++}`,
              source: sourceId,
              target: targetId,
              type: edgeType,
              // Store connection metadata if needed
              n8nOutputIndex: t.index,
              n8nOutputType: outputType
            });
          });
        });
      });
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
    const nodes: N8nNodeSpec[] = [];
    const connections: N8nConnectionSpec = {};

    // 1. Map nodes
    if (spec.nodes) {
      spec.nodes.forEach(sgNode => {
        // Find existing n8nType if stored, otherwise derive it
        const type = sgNode.n8nType || WorkflowMapper.resolveN8nType(sgNode.type);
        const name = sgNode.label || sgNode.id;

        const n8nNode: N8nNodeSpec = {
          id: sgNode.id,
          name: name,
          type: type,
          typeVersion: 1,
          position: sgNode.position ? [sgNode.position[0], -sgNode.position[1]] : [0, 0], // Invert Y back
          parameters: sgNode.parameters || {}
        };
        nodes.push(n8nNode);

        // Initialize connections for this node
        connections[name] = { main: [[]] };
      });
    }

    // 2. Map edges
    if (spec.edges) {
      spec.edges.forEach(sgEdge => {
        const sourceNode = nodes.find(n => n.id === sgEdge.source);
        const targetNode = nodes.find(n => n.id === sgEdge.target);

        if (sourceNode && targetNode) {
          const outputType = sgEdge.n8nOutputType || 'main';
          const outputIndex = sgEdge.n8nOutputIndex || 0;

          if (!connections[sourceNode.name][outputType]) {
            connections[sourceNode.name][outputType] = [];
          }
          if (!connections[sourceNode.name][outputType][0]) {
            connections[sourceNode.name][outputType][0] = [];
          }

          connections[sourceNode.name][outputType][0].push({
            node: targetNode.name,
            type: 'main',
            index: outputIndex
          });
        }
      });
    }

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
