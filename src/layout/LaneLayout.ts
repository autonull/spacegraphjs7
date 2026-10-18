// Generic lane layout: deterministic, append-only assignment of positions from lanes, ordinals, and
// hierarchy depth. No renderer, session, or contract dependency. Hosts layer semantics (turns,
// phases, event ordinals) on top; this only owns geometry.

export type LaneLayoutPosition = [number, number, number];

export interface LaneLayoutConfig {
  /** Ordered lane ids; lane index defines Y. */
  lanes: readonly string[];
  /** Y distance between lanes. */
  laneGap?: number;
  /** X distance between ordinals within a group. */
  step?: number;
  /** X distance between groups. */
  groupGap?: number;
  /** Z distance per hierarchy depth. */
  depthStep?: number;
  /** Lane used when an item names an unknown or missing lane. */
  defaultLane?: string;
}

export interface LaneItem {
  id: string;
  lane?: string;
  /** Items sharing a group share an X base (e.g. one turn). Ungrouped items share one default group. */
  group?: string;
  /** Ordinal within the group; defaults to insertion order within the group. */
  ordinal?: number;
  /** Hierarchy depth recorded in Z. */
  depth?: number;
}

export interface LaneBounds {
  min: LaneLayoutPosition;
  max: LaneLayoutPosition;
  center: LaneLayoutPosition;
  size: LaneLayoutPosition;
}

const DEFAULT_LANE = '__default__';

export class LaneLayout {
  readonly #lanes: readonly string[];
  readonly #laneGap: number;
  readonly #step: number;
  readonly #groupGap: number;
  readonly #depthStep: number;
  readonly #defaultLane: string;
  readonly #positions: Record<string, LaneLayoutPosition> = {};
  readonly #groupBase: Record<string, number> = {};
  readonly #groupCount: Record<string, number> = {};
  #nextGroupX = 0;

  constructor(config: LaneLayoutConfig) {
    const defaultLane = config.defaultLane ?? config.lanes[0];
    if (!config.lanes.length && !defaultLane) throw new Error('LaneLayout requires at least one lane');
    this.#lanes = config.lanes;
    this.#laneGap = config.laneGap ?? 56;
    this.#step = config.step ?? 48;
    this.#groupGap = config.groupGap ?? 320;
    this.#depthStep = config.depthStep ?? 64;
    this.#defaultLane = defaultLane ?? DEFAULT_LANE;
  }

  get positions(): Readonly<Record<string, LaneLayoutPosition>> {
    return this.#positions;
  }

  get lanes(): readonly string[] {
    return this.#lanes;
  }

  // Assign a position for `item`, once. Re-placing a known id returns the stored position, so graph
  // mutations never move earlier items.
  place(item: LaneItem): LaneLayoutPosition {
    const placed = this.#positions[item.id];
    if (placed) return placed;
    const group = item.group ?? DEFAULT_LANE;
    const ordinal = item.ordinal ?? this.#groupCount[group] ?? 0;
    this.#groupCount[group] = Math.max(this.#groupCount[group] ?? 0, ordinal + 1);
    const position: LaneLayoutPosition = [
      this.#groupX(group) + ordinal * this.#step,
      this.#laneY(item.lane),
      (item.depth ?? 0) * this.#depthStep,
    ];
    this.#positions[item.id] = position;
    return position;
  }

  placeAll(items: readonly LaneItem[]): Readonly<Record<string, LaneLayoutPosition>> {
    for (const item of items) this.place(item);
    return this.#positions;
  }

  // Reserve X span for a group before its items arrive, so an in-flight group cannot shift later
  // groups when it fills.
  reserve(group: string, span: number): void {
    const base = (this.#groupBase[group] ??= this.#nextGroupX);
    this.#nextGroupX = Math.max(this.#nextGroupX, base + span + this.#groupGap);
  }

  bounds(ids?: readonly string[]): LaneBounds | undefined {
    const points = (ids ?? Object.keys(this.#positions))
      .map((id) => this.#positions[id])
      .filter((p): p is LaneLayoutPosition => p !== undefined);
    if (!points.length) return undefined;
    const min: LaneLayoutPosition = [Infinity, Infinity, Infinity];
    const max: LaneLayoutPosition = [-Infinity, -Infinity, -Infinity];
    for (const point of points) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], point[i]);
        max[i] = Math.max(max[i], point[i]);
      }
    }
    const center = [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as LaneLayoutPosition;
    const size = [0, 1, 2].map((i) => max[i] - min[i]) as LaneLayoutPosition;
    return { min, max, center, size };
  }

  clear(): void {
    for (const key of Object.keys(this.#positions)) delete this.#positions[key];
    for (const key of Object.keys(this.#groupBase)) delete this.#groupBase[key];
    for (const key of Object.keys(this.#groupCount)) delete this.#groupCount[key];
    this.#nextGroupX = 0;
  }

  #laneY(lane?: string): number {
    const index = this.#lanes.indexOf(lane ?? this.#defaultLane);
    const fallback = this.#lanes.indexOf(this.#defaultLane);
    return (index >= 0 ? index : Math.max(fallback, 0)) * this.#laneGap;
  }

  #groupX(group: string): number {
    const base = (this.#groupBase[group] ??= this.#nextGroupX);
    if (base === this.#nextGroupX) this.#nextGroupX += this.#groupGap;
    return base;
  }
}
