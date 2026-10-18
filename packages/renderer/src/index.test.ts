import { describe, expect, test } from 'bun:test';
import {
  CONTRACT_VERSION,
  negotiateContract,
  SUPPORTED_CONTRACT_VERSIONS,
  supports,
  supportsContractVersion,
  type RendererCapabilities,
} from './index';

const capabilities = (overrides: Partial<RendererCapabilities> = {}): RendererCapabilities => ({
  contractVersion: CONTRACT_VERSION,
  projections: ['2d'],
  domNodes: true,
  maxDomNodes: 40,
  edgeLabels: true,
  clusterNodes: true,
  minimap: false,
  maxRecommendedNodes: 300,
  ...overrides,
});

describe('@spacegraphjs/renderer contract', () => {
  test('CONTRACT_VERSION is a positive integer', () => {
    expect(Number.isInteger(CONTRACT_VERSION)).toBe(true);
    expect(CONTRACT_VERSION).toBeGreaterThan(0);
  });

  test('supports resolves projection capabilities', () => {
    expect(supports(capabilities(), '2d')).toBe(true);
    expect(supports(capabilities(), '3d')).toBe(false);
    expect(supports(capabilities({ projections: ['2d', '3d'] }), '3d')).toBe(true);
  });

  test('supports resolves boolean capabilities', () => {
    expect(supports(capabilities(), 'domNodes')).toBe(true);
    expect(supports(capabilities(), 'edgeLabels')).toBe(true);
    expect(supports(capabilities(), 'clusterNodes')).toBe(true);
    expect(supports(capabilities(), 'minimap')).toBe(false);
  });

  test('supports treats capability fields as authoritative, not inferred from contract version', () => {
    expect(supports(capabilities({ domNodes: false }), 'domNodes')).toBe(false);
    expect(supports(capabilities({ minimap: true }), 'minimap')).toBe(true);
  });

  test('contract version negotiation accepts the implemented version', () => {
    expect(SUPPORTED_CONTRACT_VERSIONS).toContain(CONTRACT_VERSION);
    expect(supportsContractVersion(CONTRACT_VERSION)).toBe(true);
    expect(negotiateContract(CONTRACT_VERSION)).toEqual({ ok: true });
  });

  test('contract version negotiation fails gracefully on a mismatch', () => {
    const future = CONTRACT_VERSION + 1;
    expect(supportsContractVersion(future)).toBe(false);
    const result = negotiateContract(future);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(String(future));
  });
});
