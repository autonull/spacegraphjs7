import type { CodeDiff, CodeDiffSource } from "@spacegraphjs/shared"

/** One changed file of a finished turn, as reported by the host's turn-diff source. */
export type GraphDiff = CodeDiff

/**
 * Host-provided loader for a finished turn's changed-file diffs. `from` is the turn's opening
 * message id; the source is already scoped to the current session, so the graph never holds a session id.
 */
export type GraphDiffSource = CodeDiffSource

/** Tone of a unified diff line. */
export type DiffTone = "header" | "added" | "removed" | "context"

/** Returns the tone of a unified diff line. */
export function diffTone(line: string): DiffTone {
  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) return "header"
  if (line.startsWith("+")) return "added"
  if (line.startsWith("-")) return "removed"
  return "context"
}

/** CSS class for each diff tone. */
export const TONE_CLASS: Record<DiffTone, string> = {
  header: "text-text-weaker",
  added: "text-text-on-success-base",
  removed: "text-text-on-critical-base",
  context: "text-text-base",
}