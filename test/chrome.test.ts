import { describe, expect, it } from 'vitest';
import { DEFAULT_CHROME_PLUGINS, DEFAULT_SYSTEM_PLUGINS } from '../src/core/defaults';

const chromeNames = DEFAULT_CHROME_PLUGINS.map(([, name]) => name);
const systemNames = DEFAULT_SYSTEM_PLUGINS.map(([, name]) => name);

describe('default plugin registry', () => {
  it('keeps chrome plugins opt-in', () => {
    expect(chromeNames).toEqual([
      'ZoomBandsPlugin',
      'ZoomUIPlugin',
      'MinimapPlugin',
      'HUDPlugin',
    ]);
  });

  it('never registers a chrome plugin as a system plugin', () => {
    for (const name of chromeNames) expect(systemNames).not.toContain(name);
  });

  it('always registers core interaction and LOD plugins', () => {
    expect(systemNames).toContain('InteractionPlugin');
    expect(systemNames).toContain('LODPlugin');
  });
});
