import type { N8nWorkflowJSON, N8nNodeSpec, N8nConnectionSpec } from './types';

/**
 * A simple utility to migrate LangFlow JSON exports into n8n Workflow JSON format,
 * mapping common LangFlow AI components to n8n AI nodes.
 */
export class LangflowMigrator {
    static migrate(langflowJson: any): N8nWorkflowJSON {
        const nodes: N8nNodeSpec[] = [];
        const connections: Record<string, Record<string, N8nConnectionSpec[][]>> = {};

        if (!langflowJson || !langflowJson.data || !langflowJson.data.nodes) {
            throw new Error("Invalid LangFlow JSON format");
        }

        langflowJson.data.nodes.forEach((lfNode: any) => {
            const type = LangflowMigrator.mapNodeType(lfNode.data.type);
            const n8nNode: N8nNodeSpec = {
                id: lfNode.id,
                name: lfNode.data.id || lfNode.id,
                type: type,
                position: [
                    lfNode.position.x || 0,
                    lfNode.position.y || 0
                ],
                parameters: LangflowMigrator.mapParameters(lfNode.data)
            };
            nodes.push(n8nNode);
            connections[n8nNode.name] = { main: [] };
        });

        if (langflowJson.data.edges) {
            langflowJson.data.edges.forEach((lfEdge: any) => {
                const sourceNode = nodes.find(n => n.id === lfEdge.source);
                const targetNode = nodes.find(n => n.id === lfEdge.target);

                if (sourceNode && targetNode) {
                    if (!connections[sourceNode.name].main[0]) {
                        connections[sourceNode.name].main[0] = [];
                    }
                    connections[sourceNode.name].main[0].push({
                        node: targetNode.name,
                        type: 'main',
                        index: 0
                    });
                }
            });
        }

        return {
            nodes,
            connections
        };
    }

    private static mapNodeType(langflowType: string): string {
        const typeMap: Record<string, string> = {
            'LLMChain': '@n8n/n8n-nodes-langchain.chainLlm',
            'ChatOpenAI': '@n8n/n8n-nodes-langchain.modelOpenAi',
            'PromptTemplate': 'n8n-nodes-base.set',
            'Agent': '@n8n/n8n-nodes-langchain.agent',
            'VectorStore': '@n8n/n8n-nodes-langchain.vectorStorePinecone'
        };

        return typeMap[langflowType] || 'n8n-nodes-base.noop';
    }

    private static mapParameters(lfData: any): any {
        const params: any = {};

        if (lfData.node?.template) {
            Object.keys(lfData.node.template).forEach(key => {
                const field = lfData.node.template[key];
                if (field.value !== undefined) {
                     // Very naive parameter mapping
                     if (key === 'model_name') params.model = field.value;
                     if (key === 'template') params.prompt = field.value;
                }
            });
        }

        return params;
    }
}
