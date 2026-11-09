import { defineConfig } from 'vitest/config';

// One self-contained classic script (IIFE) for Brightspace, with the web worker inlined.
// Everything in public/ (the site pages, data and sql-wasm.wasm) is copied to dist/.
export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: 'src/main.ts',
      name: 'Datab1',
      formats: ['iife'],
      fileName: () => 'datab1-component.js'
    },
    emptyOutDir: true,
    sourcemap: true
  },
  worker: { format: 'iife' },
  test: { include: ['test/**/*.test.ts'] }
});
