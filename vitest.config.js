import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
  },
  resolve: {
    alias: {
      // Permet d'importer depuis src/helpers/ dans les tests
      "#helpers": new URL("./src/helpers", import.meta.url).pathname,
    },
  },
});
