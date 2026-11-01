import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import dts from "vite-plugin-dts"

export default defineConfig({
  plugins: [solid(), dts({ insertTypesEntry: true })],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        TurnMapInlineGraph: "src/TurnMapInlineGraph.tsx",
        TurnMapOverlay: "src/TurnMapOverlay.tsx",
      },
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    rollupOptions: {
      external: ["solid-js", "@spacegraphjs/renderer", "@spacegraphjs/svg-renderer", "@spacegraphjs/shared", "@spacegraphjs/overlays"],
    },
  },
})