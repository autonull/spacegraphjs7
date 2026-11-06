// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { applySubLayouts, computeClusterBounds, defaultSubLayoutPolicy, type SubLayoutGroup, type PositionsMap } from '../src/sub-layout'
import type { GraphViewData, ClusterBounds, Position } from '@spacegraphjs/renderer'

function createMockModel(): GraphViewData {
  return {
    root: 'session',
    nodes: [],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }
}

function createPositions(nodes: Record<string, Position>): PositionsMap {
  const map = new Map<string, Position>()
  for (const [id, pos] of Object.entries(nodes)) {
    map.set(id, pos)
  }
  return map
}

describe('kernel/sub-layout', () => {
  describe('computeClusterBounds', () => {
    test('returns bounds for valid positions', () => {
      const positions = createPositions({
        'a': { x: 10, y: 20, z: 0 },
        'b': { x: 30, y: 40, z: 10 },
        'c': { x: 5, y: 50, z: 5 },
      })

      const bounds = computeClusterBounds(positions, ['a', 'b', 'c'])

      expect(bounds).toEqual({
        min: { x: 5, y: 20, z: 0 },
        max: { x: 30, y: 50, z: 10 },
      })
    })

    test('returns undefined for missing positions', () => {
      const positions = createPositions({
        'a': { x: 10, y: 20, z: 0 },
      })

      const bounds = computeClusterBounds(positions, ['a', 'missing'])

      // Only 'a' has a position, so bounds should be for 'a' only
      expect(bounds).toEqual({
        min: { x: 10, y: 20, z: 0 },
        max: { x: 10, y: 20, z: 0 },
      })
    })

    test('returns undefined for no valid positions', () => {
      const positions = createPositions({})

      const bounds = computeClusterBounds(positions, ['a', 'b'])

      expect(bounds).toBeUndefined()
    })
  })

  describe('applySubLayouts', () => {
    const model = createMockModel()

    test('applies policy to each group and merges results', () => {
      const positions = createPositions({
        'a': { x: 100, y: 100, z: 0 },
        'b': { x: 200, y: 100, z: 0 },
        'c': { x: 300, y: 100, z: 0 },
      })

      const groups: readonly SubLayoutGroup[] = [
        { id: 'group1', kind: 'test', clusterOf: ['a', 'b'] },
        { id: 'group2', kind: 'test', clusterOf: ['c'] },
      ]

      const customPolicy: typeof defaultSubLayoutPolicy = (_group, _model, positions, bounds) => {
        const newPositions = new Map(positions)
        // Move all members to center of bounds
        const centerX = (bounds.min.x + bounds.max.x) / 2
        const centerY = (bounds.min.y + bounds.max.y) / 2
        for (const id of _group.clusterOf) {
          newPositions.set(id, { x: centerX, y: centerY, z: 0 })
        }
        return newPositions
      }

      const result = applySubLayouts(model, positions, groups, customPolicy)

      // All members should be at center of their group bounds
      expect(result.get('a')?.x).toBe(150) // center of a(100) and b(200)
      expect(result.get('a')?.y).toBe(100)
      expect(result.get('b')?.x).toBe(150)
      expect(result.get('b')?.y).toBe(100)
      expect(result.get('c')?.x).toBe(300) // single member, center is itself
      expect(result.get('c')?.y).toBe(100)
    })

    test('skips groups with no members', () => {
      const positions = createPositions({
        'a': { x: 100, y: 100, z: 0 },
      })

      const groups: readonly SubLayoutGroup[] = [
        { id: 'empty', kind: 'test', clusterOf: [] },
      ]

      const result = applySubLayouts(model, positions, groups, defaultSubLayoutPolicy)

      expect(result.get('a')).toEqual({ x: 100, y: 100, z: 0 })
    })

    test('skips groups with no valid positions', () => {
      const positions = createPositions({
        'a': { x: 100, y: 100, z: 0 },
      })

      const groups: readonly SubLayoutGroup[] = [
        { id: 'group1', kind: 'test', clusterOf: ['missing'] },
      ]

      const result = applySubLayouts(model, positions, groups, defaultSubLayoutPolicy)

      expect(result.get('a')).toEqual({ x: 100, y: 100, z: 0 })
    })
  })

  describe('defaultSubLayoutPolicy', () => {
    test('returns positions unchanged', () => {
      const positions = createPositions({
        'a': { x: 100, y: 100, z: 0 },
      })

      const group: SubLayoutGroup = { id: 'g1', kind: 'test', clusterOf: ['a'] }
      const bounds: ClusterBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 200, y: 200, z: 0 } }

      const result = defaultSubLayoutPolicy(group, createMockModel(), positions, bounds)

      expect(result).toBe(positions)
    })
  })
})