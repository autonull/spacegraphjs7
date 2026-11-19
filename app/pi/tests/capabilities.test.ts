// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { agentDomain } from '@spacegraphjs/agent';
import { DEFAULT_THEME } from '@spacegraphjs/renderer';
import { CAPABILITIES, capabilityContext, runCapability } from '../src/capabilities';
import { localKernel } from '../src/local-feed';

const context = () => {
    const kernel = localKernel();
    return capabilityContext(kernel, agentDomain.build(kernel), DEFAULT_THEME);
};

describe('capability gallery', () => {
    it('runs every capability against the local kernel-op feed', () => {
        for (const capability of CAPABILITIES) {
            const evidence = runCapability(capability.id, context());
            expect(evidence.length, capability.id).toBeGreaterThan(0);
            expect(evidence.every((line) => typeof line === 'string' && line.length > 0)).toBe(true);
        }
    });

    it('exposes unique ids and rejects unknown capabilities', () => {
        const ids = CAPABILITIES.map((capability) => capability.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(() => runCapability('missing', context())).toThrow(/unknown capability/);
    });
});
