import { describe, it, expect } from 'vitest'
import {
    PaletteSources,
    PALETTE_GROUP_ORDER,
    PALETTE_NODE_LIMIT,
    paletteEntries,
    paletteGroup,
} from './palette'
import type { GraphNode, GraphViewData } from '@spacegraphjs/shared'

const createModel = (nodes: Partial<GraphNode>[] = []): GraphViewData => ({
    nodes: nodes.map((n, i) => ({
        id: n.id ?? `node-${i}`,
        label: n.label ?? `Node ${i}`,
        kind: n.kind ?? 'tool',
        status: n.status ?? 'success',
        summary: n.summary,
        data: n.data,
        clusterOf: n.clusterOf,
    })),
    edges: [],
})

describe('palette', () => {
    const sources: PaletteSources = {
        actions: [
            { id: 'export', label: 'Export graph', detail: 'Save as JSON', keywords: ['save', 'download'] },
            { id: 'why', label: 'Why failed', detail: 'Show failure reason', keywords: ['failure', 'error'] },
        ],
        lenses: [
            { id: 'focus', label: 'Focus mode', description: 'Dim unrelated nodes' },
        ],
        surfaces: [
            { id: 'timeline', label: 'Timeline view' },
        ],
        savedQueries: [
            { label: 'Failed tools', query: 'kind:tool status:failed' },
            { label: 'Recent files', query: 'kind:file turn:recent' },
        ],
    }

    describe('paletteEntries', () => {
        it('returns actions, lenses, surfaces for empty query', () => {
            const model = createModel()
            const entries = paletteEntries(model, '', sources)
            const kinds = entries.map((e) => e.kind)
            expect(kinds).toContain('action')
            expect(kinds).toContain('lens')
            expect(kinds).toContain('surface')
            expect(kinds).toContain('saved-query')
            expect(kinds).not.toContain('node')
        })

        it('returns nodes for matching query', () => {
            const model = createModel([{ id: 'n1', label: 'Auth token', kind: 'tool' }, { id: 'n2', label: 'Config file', kind: 'file' }])
            const entries = paletteEntries(model, 'auth', sources)
            const nodes = entries.filter((e) => e.kind === 'node')
            expect(nodes).toHaveLength(1)
            expect(nodes[0].label).toBe('Auth token')
        })

        it('limits node results', () => {
            const model = createModel(Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, label: `Token ${i}`, kind: 'tool' })))
            const entries = paletteEntries(model, 'token', sources, 3)
            const nodes = entries.filter((e) => e.kind === 'node')
            expect(nodes.length).toBeLessThanOrEqual(3)
        })

        it('ranks nodes by search score', () => {
            const model = createModel([
                { id: 'n1', label: 'Auth token', kind: 'tool' },
                { id: 'n2', label: 'Token auth', kind: 'tool' },
                { id: 'n3', label: 'Auth config', kind: 'file' },
            ])
            const entries = paletteEntries(model, 'auth', sources)
            const nodes = entries.filter((e) => e.kind === 'node')
            expect(nodes[0].label).toBe('Auth token')
        })

        it('matches saved queries by label and query text', () => {
            const model = createModel()
            const entries = paletteEntries(model, 'failed', sources)
            const saved = entries.filter((e) => e.kind === 'saved-query')
            expect(saved.some((s) => s.savedQuery?.query.includes('failed'))).toBe(true)
        })

        it('groups entries by PALETTE_GROUP_ORDER', () => {
            const model = createModel([
                { id: 'n1', label: 'Export token', kind: 'tool' },
                { id: 'n2', label: 'Config file', kind: 'file' },
            ])
            const entries = paletteEntries(model, 'export', sources)
            const kinds = entries.map((e) => e.kind)
            // Find first occurrence of each kind that exists in results
            const existingKinds = [...new Set(kinds)]
            const indices = PALETTE_GROUP_ORDER.filter((k) => existingKinds.includes(k))
            // Verify they appear in PALETTE_GROUP_ORDER order
            for (let i = 1; i < indices.length; i++) {
                const prevIdx = kinds.indexOf(indices[i - 1])
                const currIdx = kinds.indexOf(indices[i])
                expect(prevIdx).toBeLessThan(currIdx)
            }
        })

        it('sorts by score within group', () => {
            const model = createModel()
            const entries = paletteEntries(model, '', sources)
            const actions = entries.filter((e) => e.kind === 'action')
            expect(actions[0].score).toBeGreaterThanOrEqual(actions[1].score)
        })
    })

    describe('paletteGroup', () => {
        it('filters entries by kind', () => {
            const model = createModel()
            const entries = paletteEntries(model, '', sources)
            const actions = paletteGroup(entries, 'action')
            expect(actions.every((e) => e.kind === 'action')).toBe(true)
            expect(actions.length).toBe(sources.actions?.length ?? 0)
        })

        it('returns empty array for missing kind', () => {
            const model = createModel()
            const entries = paletteEntries(model, '', sources)
            const nodes = paletteGroup(entries, 'node')
            expect(nodes).toHaveLength(0)
        })
    })

    describe('constants', () => {
        it('PALETTE_GROUP_ORDER has expected order', () => {
            expect(PALETTE_GROUP_ORDER).toEqual(['node', 'action', 'saved-query', 'lens', 'surface'])
        })

        it('PALETTE_NODE_LIMIT is 20', () => {
            expect(PALETTE_NODE_LIMIT).toBe(20)
        })
    })
})