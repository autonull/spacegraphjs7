/**
 * Minimal type definitions to keep kernel dependency-free.
 * These mirror the renderer contract types.
 */

/** 3D position. */
export interface Position {
  x: number
  y: number
  z: number
}

/** Axis-aligned bounding box. */
export interface ClusterBounds {
  min: Position
  max: Position
}

/** Minimal graph view data for sub-layout. */
export interface GraphViewData {
  root: string
  nodes: readonly GraphNode[]
  edges: readonly GraphEdge[]
  turns: readonly string[]
  turnByMessageID: Map<string, string>
  activeTurn?: string
}

/** Minimal graph node for sub-layout. */
export interface GraphNode {
  id: string
  kind: string
  label: string
  status?: string
  minLevel?: string
  turnID?: string
  messageID?: string
  partID?: string
  toolID?: string
  time?: number
  derived?: boolean
  clusterOf?: string[]
  data?: Record<string, unknown>
}

/** Minimal graph edge for sub-layout. */
export interface GraphEdge {
  id: string
  kind: string
  source: string
  target: string
  confidence?: string
}

/** Type for positions map. */
export type PositionsMap = Map<string, Position>

/** Group definition for sub-layout. */
export interface SubLayoutGroup {
  id: string
  kind: string
  clusterOf: string[]
}

/** Sub-layout policy function. */
export type SubLayoutPolicy = (
  group: SubLayoutGroup,
  model: GraphViewData,
  positions: PositionsMap,
  bounds: ClusterBounds,
) => PositionsMap

/**
 * Compute bounding box for a cluster of nodes.
 * @param positions - Current node positions
 * @param memberIds - IDs of nodes in the cluster
 * @returns ClusterBounds or undefined if no valid positions
 */
export function computeClusterBounds(
  positions: ReadonlyMap<string, Position>,
  memberIds: readonly string[],
): ClusterBounds | undefined {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  let found = false

  for (const id of memberIds) {
    const pos = positions.get(id)
    if (!pos) continue
    found = true
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    minZ = Math.min(minZ, pos.z)
    maxX = Math.max(maxX, pos.x)
    maxY = Math.max(maxY, pos.y)
    maxZ = Math.max(maxZ, pos.z)
  }

  if (!found) return undefined

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

/**
 * Generic sub-layout application.
 * Iterates over groups, computes bounds, applies host-provided policy.
 *
 * @param model - Full graph view data
 * @param positions - Current positions (will be mutated)
 * @param groups - Groups to apply sub-layout to
 * @param policy - Function that computes new positions for group members
 * @returns Updated positions map
 */
export function applySubLayouts(
  model: GraphViewData,
  positions: PositionsMap,
  groups: readonly SubLayoutGroup[],
  policy: SubLayoutPolicy,
): PositionsMap {
  const newPositions = new Map(positions)

  for (const group of groups) {
    if (!group.clusterOf || group.clusterOf.length === 0) continue

    const bounds = computeClusterBounds(newPositions, group.clusterOf)
    if (!bounds) continue

    const updated = policy(group, model, newPositions, bounds)
    // Merge updated positions back
    for (const [id, pos] of updated) {
      newPositions.set(id, pos)
    }
  }

  return newPositions
}

/**
 * Default policy: no-op (keeps original positions).
 * Useful for turn bands that don't need sub-layout.
 */
export function defaultSubLayoutPolicy(
  _group: SubLayoutGroup,
  _model: GraphViewData,
  positions: PositionsMap,
  _bounds: ClusterBounds,
): PositionsMap {
  return positions
}