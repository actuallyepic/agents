import { defineConfig } from 'tsup'

export default defineConfig({
    entryPoints: ["src/**/*.ts", "src/**/*.tsx"],
    clean: true,
    dts: true,
    format: ["cjs", "esm"],
    splitting: false,
    sourcemap: true,
    outDir: "dist",
})