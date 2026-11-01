import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        i18n: "src/i18n.ts",
        icons: "src/icons.tsx",
        popover: "src/popover.tsx",
        types: "src/types.ts",
        animations: "src/animations.ts",
        keyboard: "src/keyboard.ts",
        tokens: "src/tokens.ts",
        css: "src/css.ts",
        portal: "src/portal.tsx",
        hooks: "src/hooks.ts",
      },
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    outDir: "dist",
    rollupOptions: {
      external: ["solid-js"],
    },
  },
  plugins: [solid(), dts({ insertTypesEntry: true })],
})