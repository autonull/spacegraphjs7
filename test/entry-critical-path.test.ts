// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const recorders = vi.hoisted(() => ({ onnx: vi.fn(), monaco: vi.fn() }));

vi.mock('onnxruntime-web', () => {
  recorders.onnx();
  return {};
});

vi.mock('@monaco-editor/loader', () => {
  recorders.monaco();
  return { default: { init: () => Promise.resolve({ editor: {} }) } };
});

describe('entry critical path', () => {
  it('evaluates neither onnxruntime-web nor Monaco when importing the entry', async () => {
    const entry = await import('../src/index');

    expect(entry.SpaceGraph).toBeTypeOf('function');
    expect(recorders.onnx).not.toHaveBeenCalled();
    expect(recorders.monaco).not.toHaveBeenCalled();
  });

  it('exposes the lean activity entry without pulling heavy deps', async () => {
    const activity = await import('../src/activity');

    expect(activity.SpaceGraph).toBeTypeOf('function');
    expect(activity.HtmlNode).toBeTypeOf('function');
    expect(activity.CurvedEdge).toBeTypeOf('function');
    expect(recorders.onnx).not.toHaveBeenCalled();
    expect(recorders.monaco).not.toHaveBeenCalled();
  });
});
