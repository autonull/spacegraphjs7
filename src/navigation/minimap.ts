// Generic minimap projection: the overview of a graph's content in a small box. The core owns the
// geometry (the scale, the flip, the view rectangle); the host owns the dots and the interaction.

export interface MinimapPoint {
    x: number;
    y: number;
}

export interface MinimapBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface MinimapViewport {
    /** The centre of the visible area, in graph space. */
    center: readonly [number, number];
    /** The visible extent, in graph space. */
    extent: { width: number; height: number };
}

export interface MinimapViewRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MinimapProjection {
    /** The scale from graph space to box space. */
    readonly scale: number;
    /** The graph-space bounds of the projected content. */
    readonly bounds: MinimapBounds;
    /** Projects a graph-space point into the box; the box's Y axis points down. */
    project(point: MinimapPoint): MinimapPoint;
    /** Projects a box-space point back into graph space. */
    unproject(point: MinimapPoint): MinimapPoint;
    /** The visible rectangle in box space, when a viewport is known. */
    readonly viewRect?: MinimapViewRect;
}

export interface MinimapOptions {
    /** The positions of the nodes to show, in graph space. */
    positions: ReadonlyMap<string, MinimapPoint>;
    /** The size of the overview box. */
    box: { width: number; height: number };
    /** The room kept between the content and the box's edges. */
    padding?: number;
    /** The viewport of the renderer, in graph space. */
    viewport?: MinimapViewport;
}

/**
 * The projection of a set of positions into an overview box. The content is centred, the Y axis is
 * flipped (the graph grows upwards, the box grows downwards), and a single point stays centred
 * because the offsets use the raw span while the scale clamps a zero span to one pixel.
 */
export function project(options: MinimapOptions): MinimapProjection {
    const points = [...options.positions.values()];
    const bounds: MinimapBounds = points.length
        ? {
              minX: Math.min(...points.map((point) => point.x)),
              maxX: Math.max(...points.map((point) => point.x)),
              minY: Math.min(...points.map((point) => point.y)),
              maxY: Math.max(...points.map((point) => point.y)),
          }
        : { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const padding = options.padding ?? 0;
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;
    const scale = Math.min(
        (options.box.width - padding * 2) / Math.max(spanX, 1),
        (options.box.height - padding * 2) / Math.max(spanY, 1),
    );
    const offsetX = (options.box.width - spanX * scale) / 2;
    const offsetY = (options.box.height - spanY * scale) / 2;

    const projectPoint = (point: MinimapPoint): MinimapPoint => ({
        x: (point.x - bounds.minX) * scale + offsetX,
        y: (bounds.maxY - point.y) * scale + offsetY,
    });

    const unprojectPoint = (point: MinimapPoint): MinimapPoint => ({
        x: bounds.minX + (point.x - offsetX) / scale,
        y: bounds.maxY - (point.y - offsetY) / scale,
    });

    const viewport = options.viewport;
    const viewRect: MinimapViewRect | undefined = viewport
        ? (() => {
              const [cx, cy] = viewport.center;
              const topLeft = projectPoint({ x: cx - viewport.extent.width / 2, y: cy + viewport.extent.height / 2 });

              return {
                  x: topLeft.x,
                  y: topLeft.y,
                  width: viewport.extent.width * scale,
                  height: viewport.extent.height * scale,
              };
          })()
        : undefined;

    return { scale, bounds, project: projectPoint, unproject: unprojectPoint, viewRect };
}
