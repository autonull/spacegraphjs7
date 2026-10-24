export type Point2D = {
  readonly x: number
  readonly y: number
}

export type SpatialItem = Point2D & {
  readonly id: string
}

export type SpatialBounds = {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

const cellKey = (x: number, y: number, size: number): string =>
  `${Math.floor(x / size)}:${Math.floor(y / size)}`

export class SpatialIndex2D {
  private readonly points = new Map<string, Point2D>()
  private readonly cells = new Map<string, Set<string>>()
  readonly cellSize: number

  constructor(items: Iterable<SpatialItem> = [], cellSize = 120) {
    this.cellSize = cellSize
    for (const item of items) this.insert(item.id, item.x, item.y)
  }

  get size(): number {
    return this.points.size
  }

  has(id: string): boolean {
    return this.points.has(id)
  }

  get(id: string): Point2D | undefined {
    return this.points.get(id)
  }

  insert(id: string, x: number, y: number): void {
    this.remove(id)
    this.points.set(id, { x, y })
    const key = cellKey(x, y, this.cellSize)
    const bucket = this.cells.get(key)
    if (bucket) bucket.add(id)
    else this.cells.set(key, new Set([id]))
  }

  move(id: string, x: number, y: number): void {
    this.insert(id, x, y)
  }

  remove(id: string): void {
    const point = this.points.get(id)
    if (!point) return
    const key = cellKey(point.x, point.y, this.cellSize)
    const bucket = this.cells.get(key)
    if (bucket) {
      bucket.delete(id)
      if (bucket.size === 0) this.cells.delete(key)
    }
    this.points.delete(id)
  }

  near(x: number, y: number, radius: number, limit = Number.POSITIVE_INFINITY): string[] {
    const minX = Math.floor((x - radius) / this.cellSize)
    const maxX = Math.floor((x + radius) / this.cellSize)
    const minY = Math.floor((y - radius) / this.cellSize)
    const maxY = Math.floor((y + radius) / this.cellSize)
    const radiusSquared = radius * radius
    const found: { id: string; distance: number }[] = []
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const bucket = this.cells.get(`${cx}:${cy}`)
        if (!bucket) continue
        for (const id of bucket) {
          const point = this.points.get(id)
          if (!point) continue
          const dx = point.x - x
          const dy = point.y - y
          const distance = dx * dx + dy * dy
          if (distance <= radiusSquared) found.push({ id, distance })
        }
      }
    }
    found.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    return found.slice(0, limit).map((item) => item.id)
  }

  within(bounds: SpatialBounds): string[] {
    const minX = Math.floor(bounds.minX / this.cellSize)
    const maxX = Math.floor(bounds.maxX / this.cellSize)
    const minY = Math.floor(bounds.minY / this.cellSize)
    const maxY = Math.floor(bounds.maxY / this.cellSize)
    const found: string[] = []
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const bucket = this.cells.get(`${cx}:${cy}`)
        if (!bucket) continue
        for (const id of bucket) {
          const point = this.points.get(id)
          if (!point) continue
          if (
            point.x >= bounds.minX &&
            point.x <= bounds.maxX &&
            point.y >= bounds.minY &&
            point.y <= bounds.maxY
          )
            found.push(id)
        }
      }
    }
    return found.sort((a, b) => a.localeCompare(b))
  }
}
