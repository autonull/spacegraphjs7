import { facetsFromQuery, facetsToQuery, type GraphFacets } from './facets'

/**
 * A reader's saved question, stored as the same `q=` grammar a permalink carries. The facets stay
 * the single source of truth, so a saved query and a shared link never drift apart.
 */
export type SavedQuery = {
  /** The label the reader sees; the query grammar is the address. */
  label: string
  /** The serialized facets (`kind:tool status:failed token`). */
  query: string
}

/** Options for serializing facets with known values for canonical ordering. */
export interface SavedQuerySerializeOptions {
  knownKinds?: readonly string[]
  knownStatuses?: readonly string[]
  knownDomains?: readonly string[]
}

/** A bounded list keeps the facet menu scannable and the session store small. */
export const MAX_SAVED_QUERIES = 20

const known = (options: SavedQuerySerializeOptions) => [
  options.knownKinds ?? [],
  options.knownStatuses ?? [],
  options.knownDomains ?? [],
] as const

export const savedQueryFacets = (
  query: SavedQuery,
  options: SavedQuerySerializeOptions = {},
): GraphFacets => facetsFromQuery(query.query, ...known(options))

export const defaultSavedQueryLabel = (facets: GraphFacets, options: SavedQuerySerializeOptions = {}): string =>
  facetsToQuery(facets, ...known(options))

/**
 * Adds the current facets. The same question saved twice updates its label instead of duplicating
 * the row; the newest question goes first.
 */
export function saveQuery(
  queries: readonly SavedQuery[],
  facets: GraphFacets,
  label?: string,
  options: SavedQuerySerializeOptions = {},
): SavedQuery[] {
  const query = facetsToQuery(facets, ...known(options))
  const trimmed = label?.trim() ?? ''
  const next = [{ label: trimmed.length > 0 ? trimmed : query, query }]
  for (const entry of queries) if (entry.query !== query) next.push(entry)
  return next.slice(0, MAX_SAVED_QUERIES)
}

export function removeQuery(queries: readonly SavedQuery[], query: string): SavedQuery[] {
  return queries.filter((entry) => entry.query !== query)
}

export function isSavedQuery(queries: readonly SavedQuery[], facets: GraphFacets, options: SavedQuerySerializeOptions = {}): boolean {
  const query = facetsToQuery(facets, ...known(options))
  return queries.some((entry) => entry.query === query)
}

/** Validates the persisted list at the store boundary; malformed rows are dropped, duplicates collapse. */
export function normalizeSavedQueries(value: unknown): SavedQuery[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const queries: SavedQuery[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const label = 'label' in entry && typeof entry.label === 'string' ? entry.label.trim() : ''
    const query = 'query' in entry && typeof entry.query === 'string' ? entry.query.trim() : ''
    if (!query || seen.has(query)) continue
    seen.add(query)
    queries.push({ label: label.length > 0 ? label : query, query })
    if (queries.length === MAX_SAVED_QUERIES) break
  }
  return queries
}