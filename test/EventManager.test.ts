import { describe, it, expect, vi } from 'vitest';
import { EventManager } from '../src/core/EventManager';
import type { SpaceGraph } from '../src/SpaceGraph';

describe('EventManager', () => {
    it('should register and emit events', () => {
        // Mock SpaceGraph
        const mockSg = {} as SpaceGraph;
        const manager = new EventManager(mockSg);

        const handlerSpy = vi.fn();

        manager.on('node:added', handlerSpy);

        const nodeData = { id: 'test-node' };
        manager.emit('node:added', { node: nodeData });

        expect(handlerSpy).toHaveBeenCalledTimes(1);
        expect(handlerSpy).toHaveBeenCalledWith({ node: nodeData });
    });

    it('should unregister events', () => {
        const mockSg = {} as SpaceGraph;
        const manager = new EventManager(mockSg);

        const handlerSpy = vi.fn();
        manager.on('edge:removed', handlerSpy);
        manager.off('edge:removed', handlerSpy);

        manager.emit('edge:removed', { id: 'edge-1' });

        expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should clear all event listeners', () => {
        const mockSg = {} as SpaceGraph;
        const manager = new EventManager(mockSg);

        const handler1 = vi.fn();
        const handler2 = vi.fn();

        manager.on('node:click', handler1);
        manager.on('graph:click', handler2);

        manager.clear();

        manager.emit('node:click', { node: {}, event: {} });
        manager.emit('graph:click', { event: {} });

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });

    it('should batch emit events and only fire the latest one', () => {
        vi.useFakeTimers();

        const mockSg = {} as SpaceGraph;
        const manager = new EventManager(mockSg);

        // Mock RAF since we are in node/jsdom
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            return setTimeout(() => cb(Date.now()), 16) as any;
        });

        const handlerSpy = vi.fn();
        manager.on('interaction:drag', handlerSpy);

        manager.emitBatched('interaction:drag', { node: { id: 'test', position: { x: 1 } } });
        manager.emitBatched('interaction:drag', { node: { id: 'test', position: { x: 2 } } });
        manager.emitBatched('interaction:drag', { node: { id: 'test', position: { x: 3 } } });

        // Has not fired synchronously
        expect(handlerSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(20);

        // Should have fired only once with the latest position
        expect(handlerSpy).toHaveBeenCalledTimes(1);
        expect(handlerSpy).toHaveBeenCalledWith({ node: { id: 'test', position: { x: 3 } } });

        vi.restoreAllMocks();
        vi.useRealTimers();
    });
});
