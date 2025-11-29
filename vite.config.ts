import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node18",
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["fs", "path", "fs/promises", "openai"],
    },
  },
  define: {
    global: "globalThis",
  },
  ssr: {
    noExternal: [],
  },
});
