# Policy vector version plan

The flagship permalink policy is a positional array encoded as `p<version>.<base64url(json)>`.
`POLICY_SCHEMA.version` is that number; `encodePolicyVector` emits it and `decodePolicyVector`
validates it. A knob added to the schema changes the array length, so the version must move with it.

## v1 → v2 (scale-aware packing)

- v1 ended with `theme.glow`. v2 appends `geometry.occupancyTarget` **after** every v1 knob so the
  positional prefix is unchanged. No existing knob moved or changed type.
- `decodePolicyVector` accepts `p1.` alongside `p2.`. A v1 array is padded with the schema defaults
  for trailing knobs, then passed through the same `sanitizeVector` boundary as a native v2 array.
  Unknown versions and arrays longer than the current schema are still rejected; rejected vectors
  are ignored by the host, never partially applied.
- `encodePolicyVector` now emits `p2.`. Named presets, experiments and the panel keep working because
  they address knobs by id; only the compact positional encoding changed.
- Old `p1.` permalinks therefore still open and resolve to the same values plus the new knob's
  default (`geometry.occupancyTarget = 0`, which keeps the shipped layout unchanged).

## Rule for the next knob

Append the knob, bump `POLICY_SCHEMA.version`, add the legacy prefix to `decodePolicyVector`, update
the `p<n>.` assertions in `policy-schema.test.ts`, `experiments.test.ts` and `policy.spec.ts`, and add
a migration test that decodes a vector from the previous version. A knob that changes a default also
needs the ADR 0008 comparison; a knob whose default is inert does not.
