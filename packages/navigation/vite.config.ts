import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import dts from "vite-plugin-dts"

export default defineConfig({
  plugins: [solid(), dts({ insertTypesEntry: true })],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        GraphBreadcrumbs: "src/GraphBreadcrumbs.tsx",
        GraphMinimap: "src/GraphMinimap.tsx",
        GraphLegend: "src/GraphLegend.tsx",
        GraphLegendBody: "src/GraphLegendBody.tsx",
      },
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    rollupOptions: {
      external: ["solid-js", "@spacegraphjs/shared"],
    },
  },
})