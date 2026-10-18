// Stopgap declarations for the lean `spacegraphjs/activity` entry.
//
// Phase 0 consumes SpaceGraphJS from `src/` at runtime (Vite and Bun follow the `default` export condition).
// The library source does not yet satisfy the stricter consumer compiler options used across this repo, notably
// `noUnusedLocals`, and carries a few pre-existing type errors (see SPACEGRAPH.TODO.1.md L1.1 and L1.18). The
// `types` export condition points here so `packages/session-graph` typechecks against a stable surface without
// pulling the library source into its program. Replace with generated declarations once L1.1 lands.

export type NodeData = Record<string, unknown>
export type EdgeData = Record<string, unknown>

export interface NodeSpec {
  id: string
  type: string
  label?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  data?: NodeData
  parameters?: Record<string, unknown>
}

export interface EdgeSpec {
  id: string
  source: string
  target: string
  type?: string
  data?: EdgeData
}

export interface GraphSpec {
  nodes?: NodeSpec[]
  edges?: EdgeSpec[]
  camera?: { position: [number, number, number]; target: [number, number, number] }
}

export interface SpaceGraphOptions {
  initialLayout?: string
  chrome?: boolean
  doubleClickFocus?: boolean
  render?: {
    backgroundColor?: string | number
    transparent?: boolean
    antialias?: boolean
    pixelRatio?: number
    preserveDrawingBuffer?: boolean
    projection?: 'perspective' | 'orthographic'
  }
  theme?: {
    background?: string | number
    node?: { fill?: string | number; stroke?: string | number }
    edge?: { color?: string | number; labelColor?: string; labelBackground?: string }
    label?: { color?: string; fontFamily?: string; fontSize?: number }
    selection?: string | number
    hover?: string | number
    focus?: string | number
  }
  [key: string]: unknown
}

export type SpaceGraphTheme = NonNullable<SpaceGraphOptions['theme']>

export interface GraphViewport {
  zoom: number
  center: [number, number, number]
  distance: number
  extent?: { width: number; height: number }
  band?: string
}

export declare class SpaceGraph {
  constructor(container: HTMLElement, options?: SpaceGraphOptions)
  readonly container: HTMLElement
  readonly options: SpaceGraphOptions
  readonly nodeCount: number
  readonly edgeCount: number
  readonly isEmpty: boolean
  readonly selected: string[]
  readonly zoom: number
  readonly viewport: GraphViewport
  cameraControls: {
    target: { x: number; y: number; z: number }
    setTarget(x: number, y: number, z: number): void
  }
  events: EventEmitter
  static instances: Set<SpaceGraph>
  static create(
    container: string | HTMLElement,
    spec: GraphSpec,
    options?: SpaceGraphOptions,
  ): Promise<SpaceGraph>
  init(): Promise<void>
  loadSpec(spec: GraphSpec): this
  addNode(spec: NodeSpec): this
  addEdge(spec: EdgeSpec): this
  removeNode(id: string): boolean
  removeEdge(id: string): boolean
  hide(id: string): unknown
  show(id: string, visible?: boolean): unknown
  setPositions(positions: Record<string, [number, number, number]>): this
  setProjection(projection: 'perspective' | 'orthographic'): this
  setOrbitEnabled(enabled: boolean): this
  setPolar(phi: number, theta: number, duration?: number): this
  setZoom(value: number): this
  select(target: string | readonly string[] | null): this
  clearSelection(): this
  clear(): void
  fitView(padding?: number, duration?: number, ids?: readonly string[]): this
  focusNode(id: string, padding?: number, duration?: number): this
  watch(type: string, handler: (data: any) => void): () => void
  render(): this
  pause(): void
  dispose(): void
  destroy(): void
}

export declare class Graph {}
export declare class EventEmitter {
  on(type: string, handler: (payload: any) => void): void
  off(type: string, handler: (payload: any) => void): void
  emit(type: string, payload?: any): void
  clear(): void
}
export declare class ShapeNode {}
export declare class HtmlNode {}
export declare class DOMNode {}
export declare class NoteNode {}
export declare class PanelNode {}
export declare class TextMeshNode {}
export declare class GroupNode {}
export declare class CurvedEdge {}
export declare class LabeledEdge {}
export declare class GridLayout {}
export declare class HierarchicalLayout {}
export declare class TimelineLayout {}
export declare class LODPlugin {}
