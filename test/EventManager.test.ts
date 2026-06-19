import { describe, it, expect, vi } from 'vitest';
import { EventSystem } from '../src/core/events/EventSystem';

describe('EventSystem', () => {
    it('should register and emit events', () => {
        const system = new EventSystem();
        const handlerSpy = vi.fn();

        system.on('node:added', handlerSpy);

        const nodeData = { id: 'test-node' };
        system.emit('node:added', { node: nodeData, timestamp: Date.now() } as any);

        expect(handlerSpy).toHaveBeenCalledTimes(1);
        expect(handlerSpy).toHaveBeenCalledWith({ node: nodeData, timestamp: expect.any(Number) });
    });

    it('should unregister events', () => {
        const system = new EventSystem();
        const handlerSpy = vi.fn();
        system.on('edge:removed', handlerSpy);
        system.off('edge:removed', handlerSpy);

        system.emit('edge:removed', { id: 'edge-1', timestamp: Date.now() } as any);

        expect(handlerSpy).not.toHaveBeenCalled();
    });

    it('should clear all event listeners', () => {
        const system = new EventSystem();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        system.on('node:click', handler1);
        system.on('graph:click', handler2);

        system.clear();

        system.emit('node:click', { node: {}, event: {} } as any);
        system.emit('graph:click', { event: {} } as any);

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });

    it('should batch emit events and fire all batched events sequentially per type', () => {
        vi.useFakeTimers();

        const system = new EventSystem();

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            return setTimeout(() => cb(Date.now()), 16) as any;
        });

        const handlerSpy = vi.fn();
        system.on('interaction:drag' as any, handlerSpy);

        system.emitBatched('interaction:drag' as any, {
            node: { id: 'test1', position: { x: 1 } },
            timestamp: Date.now(),
        });
        system.emitBatched('interaction:drag' as any, {
            node: { id: 'test2', position: { x: 2 } },
            timestamp: Date.now(),
        });
        system.emitBatched('interaction:drag' as any, {
            node: { id: 'test3', position: { x: 3 } },
            timestamp: Date.now(),
        });

        expect(handlerSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(20);

        expect(handlerSpy).toHaveBeenCalledTimes(3);

        vi.restoreAllMocks();
        vi.useRealTimers();
    });
});
