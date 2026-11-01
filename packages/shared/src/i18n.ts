/**
 * Internationalization abstraction for SpaceGraphJS components.
 * Hosts provide their own i18n implementation; this package only defines the contract.
 */

export type I18n = {
  /** Translate a key, optionally with interpolation values. */
  t: (key: string, values?: Record<string, string | number>) => string
  /** Plural form based on count. */
  plural: (key: string, count: number, values?: Record<string, string | number>) => string
}

/** No-op i18n for testing or when host doesn't provide one. */
export const noopI18n: I18n = {
  t: (key, values) => {
    let result = key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
      }
    }
    return result
  },
  plural: (key, count, values) => {
    const result = count === 1 ? key : `${key}Plural`
    if (values) {
      let str = result
      for (const [k, v] of Object.entries(values)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
      }
      return str
    }
    return result
  },
}

/** Default export for convenience. */
export default noopI18n