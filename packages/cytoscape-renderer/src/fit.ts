import type { FitInsets } from '@spacegraphjs/renderer';

/** The content's box in Cytoscape's world units: the top-left corner plus a size. */
export type FitContent = { x: number; y: number; width: number; height: number };

/** What a frame needs to know to place the content inside a region of the surface. */
export type FitRequest = {
  content: FitContent;
  /** The surface, in CSS pixels. */
  surface: { width: number; height: number };
  /** Screen-space margins the content must stay clear of, in CSS pixels. */
  insets?: FitInsets;
  /** The margin around the content, in world units. */
  padding?: number;
  /** The renderer's own margin, in CSS pixels, for a fit that asks for none. */
  margin: number;
  /** The smallest scale the content may be shown at. */
  minScale?: number;
};

/** The frame: a zoom in pixels per world unit, and the pan in CSS pixels. */
export type FitFrame = { zoom: number; pan: { x: number; y: number } };

/**
 * Frames the content inside the region the insets leave free.
 *
 * Cytoscape's zoom is a linear scale in pixels per world unit, so the margin around the content is
 * a world-unit distance that scales with it, and the pan that puts the content in the middle of the
 * region is a screen-space distance.
 */
export function frameInRegion(request: FitRequest): FitFrame | null {
  const { content, margin, surface } = request;
  const left = request.insets?.left ?? 0;
  const right = request.insets?.right ?? 0;
  const top = request.insets?.top ?? 0;
  const bottom = request.insets?.bottom ?? 0;
  const regionWidth = surface.width - left - right;
  const regionHeight = surface.height - top - bottom;
  if (regionWidth <= 0 || regionHeight <= 0) return null;
  if (content.width <= 0 || content.height <= 0) return null;

  const fit = request.padding === undefined
    ? Math.min(
        (regionWidth - 2 * margin) / content.width,
        (regionHeight - 2 * margin) / content.height,
      )
    : Math.min(
        regionWidth / (content.width + 2 * request.padding),
        regionHeight / (content.height + 2 * request.padding),
      );

  // The floor wins over the frame: legibility comes first, and the reader pans the rest.
  const zoom = request.minScale === undefined ? fit : Math.max(request.minScale, fit);
  if (zoom > fit) {
    // The content does not fit: the frame starts at its first corner, inside the region.
    return { zoom, pan: { x: left - content.x * zoom, y: top - content.y * zoom } };
  }
  // Centre the content in the region. Cytoscape's world y points down, like the screen.
  return {
    zoom,
    pan: {
      x: left + regionWidth / 2 - (content.x + content.width / 2) * zoom,
      y: top + regionHeight / 2 - (content.y + content.height / 2) * zoom,
    },
  };
}
