// Screen-space label decluttering. Pure: given measured rects and a priority, returns the ids that
// should be hidden. The renderer measures the CSS2D label elements and applies the result.

export interface LabelRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Higher wins when two labels overlap. Defaults to 0. */
  priority?: number;
}

const intersects = (a: LabelRect, b: LabelRect, padding: number): boolean =>
  a.left - padding < b.left + b.width &&
  a.left + a.width + padding > b.left &&
  a.top - padding < b.top + b.height &&
  a.top + a.height + padding > b.top;

export function declutterLabels(
  rects: readonly LabelRect[],
  padding = 4
): Set<string> {
  const ordered = [...rects].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id)
  );
  const kept: LabelRect[] = [];
  const hidden = new Set<string>();
  for (const rect of ordered) {
    if (kept.some((other) => intersects(other, rect, padding))) hidden.add(rect.id);
    else kept.push(rect);
  }
  return hidden;
}
