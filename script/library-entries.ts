// The published surface of the root package: one entry per export subpath.
//
// `source` is the module the bundler takes, `name` is the flat file name it emits under `dist/`, and
// `types` is the declaration file `vite-plugin-dts` writes for that entry. The package's `exports` map
// and the build read the same list, and `test/package-exports.test.ts` asserts the two agree, so a
// subpath cannot be published without a build artifact behind it.
export type LibraryEntry = {
  /** The export subpath, "." for the package root. */
  subpath: string
  /** The flat file name under `dist/`. */
  name: string
  /** The module the bundler takes, relative to the repository root. */
  source: string
  /** The declaration file under `dist/`, relative to the repository root. */
  types: string
}

export const LIBRARY_ENTRIES: LibraryEntry[] = [
  { subpath: ".", name: "index", source: "src/index.ts", types: "dist/index.d.ts" },
  { subpath: "./activity", name: "activity", source: "src/activity.ts", types: "dist/activity.d.ts" },
  { subpath: "./core", name: "core", source: "src/core/index.ts", types: "dist/core/index.d.ts" },
  { subpath: "./edges", name: "edges", source: "src/edges/index.ts", types: "dist/edges/index.d.ts" },
  { subpath: "./nodes", name: "nodes", source: "src/nodes/index.ts", types: "dist/nodes/index.d.ts" },
  { subpath: "./plugins", name: "plugins", source: "src/plugins/index.ts", types: "dist/plugins/index.d.ts" },
  {
    subpath: "./plugins/mermaid",
    name: "plugins-mermaid",
    source: "src/plugins/mermaid/index.ts",
    types: "dist/plugins/mermaid/index.d.ts",
  },
  { subpath: "./input", name: "input", source: "src/input/index.ts", types: "dist/input/index.d.ts" },
  { subpath: "./utils", name: "utils", source: "src/utils/index.ts", types: "dist/utils/index.d.ts" },
  { subpath: "./types", name: "types", source: "src/types.ts", types: "dist/types.d.ts" },
  { subpath: "./builder", name: "builder", source: "src/builder.ts", types: "dist/builder.d.ts" },
  { subpath: "./zoom", name: "zoom", source: "src/zoom/index.ts", types: "dist/zoom/index.d.ts" },
  { subpath: "./layout", name: "layout", source: "src/layout/index.ts", types: "dist/layout/index.d.ts" },
  { subpath: "./levels", name: "levels", source: "src/levels/index.ts", types: "dist/levels/index.d.ts" },
  {
    subpath: "./representations",
    name: "representations",
    source: "src/representations/index.ts",
    types: "dist/representations/index.d.ts",
  },
  { subpath: "./a11y", name: "a11y", source: "src/a11y/index.ts", types: "dist/a11y/index.d.ts" },
  {
    subpath: "./navigation",
    name: "navigation",
    source: "src/navigation/index.ts",
    types: "dist/navigation/index.d.ts",
  },
  { subpath: "./overlays", name: "overlays", source: "src/overlays/index.ts", types: "dist/overlays/index.d.ts" },
  { subpath: "./depth", name: "depth", source: "src/depth/index.ts", types: "dist/depth/index.d.ts" },
  { subpath: "./control", name: "control", source: "src/control/index.ts", types: "dist/control/index.d.ts" },
  { subpath: "./vision", name: "vision", source: "src/vision/index.ts", types: "dist/vision/index.d.ts" },
]
