import { describe, expect, it } from 'vitest';
import { registerSensory, sensoryAdapter, supportsSensory } from 'spacegraphjs/world';
import { createConsoleSensoryAdapter } from '../src/console-sensory';

describe('console sensory adapter', () => {
    it('gates a host sink and records emitted events', () => {
        const adapter = createConsoleSensoryAdapter();
        expect(adapter.id).toBe('sound');
        expect(supportsSensory({}, 'sound')).toBe(false);

        const dispose = registerSensory(adapter);
        expect(supportsSensory({ sensory: ['sound'] }, 'sound')).toBe(true);
        sensoryAdapter('sound')?.emit('reveal', 'node-1');
        expect(adapter.events).toEqual(['reveal:node-1']);

        dispose();
        expect(supportsSensory({}, 'sound')).toBe(false);
    });
});
