import { describe, expect, test } from "bun:test"
import { SpatialIndex2D } from "./spatial"

describe("SpatialIndex2D", () => {
  test("finds items inside the radius, nearest first", () => {
    const index = new SpatialIndex2D([
      { id: "far", x: 100, y: 0 },
      { id: "near", x: 10, y: 0 },
      { id: "mid", x: 50, y: 0 },
      { id: "outside", x: 500, y: 0 },
    ])

    expect(index.near(0, 0, 60)).toEqual(["near", "mid"])
  })

  test("supports negative coordinates and movement", () => {
    const index = new SpatialIndex2D([{ id: "a", x: -100, y: -100 }])
    expect(index.near(-100, -100, 1)).toEqual(["a"])

    index.move("a", 0, 0)
    expect(index.near(-100, -100, 1)).toEqual([])
    expect(index.near(0, 0, 1)).toEqual(["a"])
  })

  test("removes items and keeps buckets clean", () => {
    const index = new SpatialIndex2D([{ id: "a", x: 0, y: 0 }])
    index.remove("a")
    index.remove("a")

    expect(index.size).toBe(0)
    expect(index.has("a")).toBe(false)
    expect(index.near(0, 0, 10)).toEqual([])
  })

  test("limits results and sorts ties by id", () => {
    const index = new SpatialIndex2D([
      { id: "b", x: 10, y: 0 },
      { id: "a", x: 10, y: 0 },
      { id: "c", x: 20, y: 0 },
    ])

    expect(index.near(0, 0, 30)).toEqual(["a", "b", "c"])
    expect(index.near(0, 0, 30, 2)).toEqual(["a", "b"])
  })

  test("finds items inside rectangular bounds", () => {
    const index = new SpatialIndex2D(
      [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 50, y: 50 },
        { id: "c", x: 500, y: 500 },
      ],
      10,
    )

    expect(index.within({ minX: -10, minY: -10, maxX: 60, maxY: 60 })).toEqual(["a", "b"])
  })

  test("re-inserting updates the position", () => {
    const index = new SpatialIndex2D()
    index.insert("a", 0, 0)
    index.insert("a", 100, 0)

    expect(index.size).toBe(1)
    expect(index.near(0, 0, 1)).toEqual([])
    expect(index.near(100, 0, 1)).toEqual(["a"])
  })
})
