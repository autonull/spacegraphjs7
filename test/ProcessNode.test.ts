import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessNode } from '../src/nodes/ProcessNode';

describe('ProcessNode', () => {
    let sg: any;

    beforeEach(() => {
        // Simple mock of SpaceGraph for node testing
        sg = {
            renderer: {
                scene: { add: () => {}, remove: () => {} },
                cssScene: { add: () => {}, remove: () => {} }
            },
            events: { emit: () => {} },
            cullingManager: { registerNode: () => {}, unregisterNode: () => {} },
            poolManager: { release: () => {} }
        };
    });

    it('creates CSS3D element with process data', () => {
        const n = new ProcessNode(sg, {
            id: 'p1',
            type: 'ProcessNode',
            data: { pid: '1234', name: 'nginx', cpu: 45.2, memory: 12.5 }
        });

        expect(n.domElement).toBeTruthy();
        expect(n.domElement.innerHTML).toContain('nginx');
        expect(n.domElement.innerHTML).toContain('1234');
        expect(n.domElement.innerHTML).toContain('45.2%');
        expect(n.domElement.innerHTML).toContain('12.5%');
    });

    it('updates bars on updateSpec', () => {
        const n = new ProcessNode(sg, {
            id: 'p1',
            type: 'ProcessNode',
            data: { pid: '1234', name: 'nginx', cpu: 10, memory: 10 }
        });

        n.updateSpec({ data: { cpu: 90, memory: 95 } });
        expect(n.domElement.innerHTML).toContain('90.0%');
        expect(n.domElement.innerHTML).toContain('95.0%');
    });
});
