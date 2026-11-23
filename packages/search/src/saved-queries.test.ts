import { describe, it, expect } from 'vitest'
import {
    SavedQuery,
    MAX_SAVED_QUERIES,
    savedQueryFacets,
    defaultSavedQueryLabel,
    saveQuery,
    removeQuery,
    isSavedQuery,
    normalizeSavedQueries,
} from './saved-queries'
import type { GraphFacets } from './facets'

const knownKinds = ['tool', 'file', 'agent'] as const
const knownStatuses = ['success', 'failed', 'running'] as const
const knownDomains = ['session', 'code', 'test'] as const

const serializeOptions = { knownKinds, knownStatuses, knownDomains }

describe('saved-queries', () => {
    const sampleFacets: GraphFacets = {
        query: 'auth',
        kinds: new Set(['tool']),
        statuses: new Set(['failed']),
        domains: new Set(['session', 'code']),
    }

    // Serialized with canonical ordering from knownDomains = ['session', 'code', 'test']
    const serializedSample = 'auth kind:tool status:failed domain:session,code'

    describe('savedQueryFacets', () => {
        it('parses saved query back to facets', () => {
            const saved: SavedQuery = { label: 'Failed tools', query: 'kind:tool status:failed' }
            const facets = savedQueryFacets(saved, serializeOptions)
            expect(facets.kinds).toEqual(new Set(['tool']))
            expect(facets.statuses).toEqual(new Set(['failed']))
            expect(facets.query).toBe('')
            // Default domain is always included
            expect(facets.domains).toEqual(new Set(['session']))
        })

        it('parses query with domain', () => {
            const saved: SavedQuery = { label: 'Failed tools', query: 'kind:tool status:failed domain:code' }
            const facets = savedQueryFacets(saved, serializeOptions)
            expect(facets.domains).toEqual(new Set(['session', 'code']))
        })
    })

    describe('defaultSavedQueryLabel', () => {
        it('serializes facets to query string with canonical domain ordering', () => {
            const label = defaultSavedQueryLabel(sampleFacets, serializeOptions)
            expect(label).toBe(serializedSample)
        })
    })

    describe('saveQuery', () => {
        it('adds new query to empty list', () => {
            const result = saveQuery([], sampleFacets, undefined, serializeOptions)
            expect(result).toHaveLength(1)
            expect(result[0].query).toBe(serializedSample)
        })

        it('updates label for duplicate query', () => {
            const existing: SavedQuery[] = [{ label: 'Old label', query: serializedSample }]
            const result = saveQuery(existing, sampleFacets, 'New label', serializeOptions)
            expect(result).toHaveLength(1)
            expect(result[0].label).toBe('New label')
        })

        it('keeps newest first', () => {
            const existing: SavedQuery[] = [{ label: 'First', query: 'query1' }]
            const result = saveQuery(existing, { query: 'query2', kinds: new Set(), statuses: new Set(), domains: new Set(['session']) }, undefined, serializeOptions)
            expect(result[0].query).toBe('query2 domain:session')
            expect(result[1].query).toBe('query1')
        })

        it('enforces MAX_SAVED_QUERIES limit', () => {
            const existing: SavedQuery[] = Array.from({ length: MAX_SAVED_QUERIES }, (_, i) => ({ label: `Query ${i}`, query: `query${i}` }))
            const result = saveQuery(existing, { query: 'new', kinds: new Set(), statuses: new Set(), domains: new Set(['session']) }, undefined, serializeOptions)
            expect(result).toHaveLength(MAX_SAVED_QUERIES)
            expect(result[0].query).toBe('new domain:session')
        })
    })

    describe('removeQuery', () => {
        it('removes matching query', () => {
            const queries: SavedQuery[] = [{ label: 'A', query: 'query1' }, { label: 'B', query: 'query2' }]
            const result = removeQuery(queries, 'query1')
            expect(result).toHaveLength(1)
            expect(result[0].query).toBe('query2')
        })

        it('returns empty when removing only entry', () => {
            const queries: SavedQuery[] = [{ label: 'A', query: 'query1' }]
            const result = removeQuery(queries, 'query1')
            expect(result).toHaveLength(0)
        })
    })

    describe('isSavedQuery', () => {
        it('returns true for matching facets', () => {
            const queries: SavedQuery[] = [{ label: 'A', query: serializedSample }]
            expect(isSavedQuery(queries, sampleFacets, serializeOptions)).toBe(true)
        })

        it('returns false for non-matching facets', () => {
            const queries: SavedQuery[] = [{ label: 'A', query: 'query1' }]
            expect(isSavedQuery(queries, sampleFacets, serializeOptions)).toBe(false)
        })
    })

    describe('normalizeSavedQueries', () => {
        it('returns empty array for non-array input', () => {
            expect(normalizeSavedQueries(null)).toEqual([])
            expect(normalizeSavedQueries('string')).toEqual([])
            expect(normalizeSavedQueries(123)).toEqual([])
        })

        it('filters out malformed entries', () => {
            const input = [
                { label: 'Valid', query: 'query1' },
                { label: 123, query: 'query2' }, // invalid label type - uses query as label
                { query: 'query3' }, // missing label - uses query as label
                { label: 'Also valid', query: 'query4' },
                'not an object',
                null,
                [], // array should be filtered
            ]
            const result = normalizeSavedQueries(input)
            // Valid entries: all 4 objects with valid queries (invalid label becomes query)
            // Invalid: 'not an object', null, []
            expect(result).toHaveLength(4)
            expect(result[0].query).toBe('query1')
            expect(result[1].query).toBe('query2')
            expect(result[1].label).toBe('query2') // label becomes query
            expect(result[2].query).toBe('query3')
            expect(result[2].label).toBe('query3') // label becomes query
            expect(result[3].query).toBe('query4')
        })

        it('deduplicates by query', () => {
            const input = [
                { label: 'First', query: 'query1' },
                { label: 'Second', query: 'query1' },
                { label: 'Third', query: 'query2' },
            ]
            const result = normalizeSavedQueries(input)
            expect(result).toHaveLength(2)
            expect(result[0].label).toBe('First')
        })

        it('enforces MAX_SAVED_QUERIES limit', () => {
            const input = Array.from({ length: MAX_SAVED_QUERIES + 5 }, (_, i) => ({ label: `Query ${i}`, query: `query${i}` }))
            const result = normalizeSavedQueries(input)
            expect(result).toHaveLength(MAX_SAVED_QUERIES)
        })

        it('uses query as label when label is empty', () => {
            const input = [{ label: '', query: 'query1' }, { label: '  ', query: 'query2' }]
            const result = normalizeSavedQueries(input)
            expect(result[0].label).toBe('query1')
            expect(result[1].label).toBe('query2')
        })

        it('trims label and query', () => {
            const input = [{ label: '  Label  ', query: '  query1  ' }]
            const result = normalizeSavedQueries(input)
            expect(result[0].label).toBe('Label')
            expect(result[0].query).toBe('query1')
        })
    })
})