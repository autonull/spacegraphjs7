// The placement seam. A layout strategy decides which boxes exist and what they mean; a placement
// engine answers where a box goes. The grid is the first engine; a tree and a force simulation are
// others, and none of them knows about the others.
//
// The core owns the geometry; a host binds its vocabulary (which nodes participate, what an edge
// means) through the strategy's config. Nothing here imports a renderer, a contract, or a session.

/** A position in the layout's world space. The renderer places boxes on their centre. */
export interface Position {
    x: number;
    y: number;
    z: number;
}

/** A box a placement engine places. */
export interface PlacementItem<Meta = unknown> {
    id: string;
    /** The box's width. */
    width: number;
    /** The box's height, for the engines that measure it. */
    height?: number;
    /** The depth recorded in Z. */
    depth?: number;
    /** The engine's own vocabulary: what the box means to the engine that places it. */
    meta?: Meta;
}

/**
 * A placement engine. It answers "where does this box go"; it never decides which boxes exist.
 *
 * `previous` holds the positions a layout already assigned. An engine that honours the append-only
 * rule keeps them and places only the boxes it has not seen, so a streamed session never moves a
 * node the reader is looking at.
 */
export interface Placement<Meta = unknown> {
    /** The engine's name, for the layout's diagnostics. */
    readonly name: string;
    place(
        items: readonly PlacementItem<Meta>[],
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position>;
}
