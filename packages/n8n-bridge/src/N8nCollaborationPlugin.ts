import type { SpaceGraph, SpaceGraphPlugin, SpecUpdate } from 'spacegraphjs';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export class N8nCollaborationPlugin implements SpaceGraphPlugin {
    name = 'N8nCollaborationPlugin';
    private sg!: SpaceGraph;
    private ydoc!: Y.Doc;
    private provider!: WebsocketProvider;
    private yNodes!: Y.Map<any>;
    private isUpdatingFromYjs = false;
    private roomName: string;
    private serverUrl: string;

    constructor(roomName: string = 'n8n-workflow-room', serverUrl: string = 'ws://localhost:1234') {
        this.roomName = roomName;
        this.serverUrl = serverUrl;
    }

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this.ydoc = new Y.Doc();

        // Connect to Y-Websocket server
        this.provider = new WebsocketProvider(this.serverUrl, this.roomName, this.ydoc, { connect: false });

        // Gracefully handle connection errors to avoid flooding console if server is absent
        this.provider.on('connection-error', () => {
            console.warn(`[N8nCollaborationPlugin] Could not connect to sync server at ${this.serverUrl}. Operating in local mode.`);
        });
        this.provider.connect();

        this.yNodes = this.ydoc.getMap('nodes');

        // Listen for remote changes
        this.yNodes.observe((event) => {
            this.isUpdatingFromYjs = true;

            const updates: any[] = [];
            event.changes.keys.forEach((change, key) => {
                if (change.action === 'add' || change.action === 'update') {
                    const data = this.yNodes.get(key);
                    if (data) updates.push(data);
                } else if (change.action === 'delete') {
                    // Logic to handle deletion
                }
            });

            if (updates.length > 0) {
                 this.sg.update({ nodes: updates } as SpecUpdate);
            }

            this.isUpdatingFromYjs = false;
        });

        // Listen for local graph changes (e.g. dragging a node)
        this.sg.events.on('node:moved', (payload: any) => {
            if (this.isUpdatingFromYjs) return;
            const { node } = payload;

            const state = this.yNodes.get(node.id) || {};
            this.yNodes.set(node.id, {
                ...state,
                id: node.id,
                position: [node.position.x, node.position.y, node.position.z]
            });
        });

        // Listen for parameter changes
        this.sg.events.on('node:param:changed', (payload: any) => {
            if (this.isUpdatingFromYjs) return;
            const { id, parameters } = payload;

            const state = this.yNodes.get(id) || {};
            this.yNodes.set(id, {
                ...state,
                id: id,
                parameters: { ...(state.parameters || {}), ...parameters }
            });
        });
    }

    update(_delta: number): void {
        // Continuous updates if needed
    }

    dispose(): void {
        if (this.provider) {
            this.provider.disconnect();
            this.provider.destroy();
        }
        if (this.ydoc) {
            this.ydoc.destroy();
        }
    }
}
