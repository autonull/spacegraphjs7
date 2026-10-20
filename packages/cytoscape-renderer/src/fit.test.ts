import { describe, expect, test } from 'bun:test';
import { frameInRegion } from './fit';

const surface = { width: 1000, height: 800 };
const content = { x: -500, y: -250, width: 1000, height: 500 };

describe('frameInRegion', () => {
  test('frames the content with the renderer margin when the host asks for none', () => {
    const frame = frameInRegion({ content, surface, margin: 30 });

    expect(frame).not.toBeNull();
    expect(frame!.zoom).toBeCloseTo((1000 - 60) / 1000, 6);
    // The content's centre lands in the middle of the surface.
    expect(frame!.pan.x).toBeCloseTo(500 - 0 * frame!.zoom, 6);
    expect(frame!.pan.y).toBeCloseTo(400 - 0 * frame!.zoom, 6);
  });

  test('keeps the content clear of an inset on the right', () => {
    const frame = frameInRegion({
      content,
      surface,
      margin: 30,
      insets: { right: 200 },
    });

    // The region is 800 wide, so the content shrinks into it.
    expect(frame!.zoom).toBeCloseTo((800 - 60) / 1000, 6);
    // And it is centred in the region, not on the surface.
    const centre = (content.x + content.width / 2) * frame!.zoom + frame!.pan.x;
    expect(centre).toBeCloseTo(400, 6);
  });

  test('keeps the content clear of an inset at the top', () => {
    const frame = frameInRegion({
      content,
      surface,
      margin: 30,
      insets: { top: 100 },
    });

    const centre = (content.y + content.height / 2) * frame!.zoom + frame!.pan.y;
    expect(centre).toBeCloseTo(100 + (800 - 100) / 2, 6);
  });

  test('takes the margin in world units when the host gives one', () => {
    const frame = frameInRegion({ content, surface, margin: 30, padding: 100 });

    // The margin is a world-unit distance, so it scales with the zoom.
    expect(frame!.zoom).toBeCloseTo(1000 / (1000 + 200), 6);
  });

  test('the legibility floor wins over the frame, and the content starts at the region corner', () => {
    const frame = frameInRegion({
      content,
      surface,
      margin: 30,
      minScale: 2,
      insets: { left: 100, top: 50 },
    });

    expect(frame!.zoom).toBe(2);
    // The content's first corner lands on the region's first corner.
    expect(content.x * frame!.zoom + frame!.pan.x).toBeCloseTo(100, 6);
    expect(content.y * frame!.zoom + frame!.pan.y).toBeCloseTo(50, 6);
  });

  test('a region with no room frames nothing', () => {
    expect(frameInRegion({ content, surface, margin: 30, insets: { left: 600, right: 600 } })).toBeNull();
    expect(frameInRegion({ content: { ...content, width: 0 }, surface, margin: 30 })).toBeNull();
  });
});
