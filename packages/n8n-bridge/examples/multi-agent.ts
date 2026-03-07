import { SpaceGraph, GraphSpec } from 'spacegraphjs';

const container = document.getElementById('spacegraph-container');
if (!container) throw new Error('Container not found');

const spec: GraphSpec = {
  nodes: [
    {
      id: 'user-input',
      type: 'N8nTriggerNode',
      position: [-600, 0, 0],
      parameters: { status: 'waiting' }
    },
    {
      id: 'router-agent',
      type: 'N8nAiNode',
      position: [-300, 0, 0],
      parameters: { model: 'gpt-4o', prompt: 'You are a routing agent. Route the request to the correct specialist.' }
    },
    {
      id: 'research-group',
      type: 'GroupNode',
      position: [200, 300, 0],
      parameters: { label: 'Research Sub-Workflow' }
    },
    {
      id: 'research-agent',
      type: 'N8nAiNode',
      position: [200, 300, 0], // Same position as group to be contained within
      parameters: { model: 'claude-3-5-sonnet', prompt: 'Research the internet for information on the topic.' }
    },
    {
      id: 'coding-group',
      type: 'GroupNode',
      position: [200, -300, 0],
      parameters: { label: 'Coding Sub-Workflow' }
    },
    {
      id: 'coding-agent',
      type: 'N8nAiNode',
      position: [200, -300, 0],
      parameters: { model: 'gpt-4o', prompt: 'Write code to solve the user request.' }
    },
    {
      id: 'aggregator-agent',
      type: 'N8nAiNode',
      position: [700, 0, 0],
      parameters: { model: 'gpt-4o', prompt: 'Aggregate the results from the specialists into a final answer.' }
    }
  ],
  edges: [
    { id: 'e1', source: 'user-input', target: 'router-agent', type: 'FlowEdge' },
    { id: 'e2', source: 'router-agent', target: 'research-group', type: 'FlowEdge' },
    { id: 'e3', source: 'router-agent', target: 'coding-group', type: 'FlowEdge' },
    { id: 'e4', source: 'research-group', target: 'aggregator-agent', type: 'FlowEdge' },
    { id: 'e5', source: 'coding-group', target: 'aggregator-agent', type: 'FlowEdge' }
  ],
  layout: { type: 'HierarchicalLayout' }
};

SpaceGraph.create(container, spec);