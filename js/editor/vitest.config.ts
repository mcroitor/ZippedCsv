import { fileURLToPath } from "url";
import { dirname } from "path";
import { defineConfig } from "vitest/config";

// Scoped to the editor's own tests; library tests stay with jest.
// The editor runs headless logic tests in a node environment — AG Grid DOM
// rendering is exercised by the end-to-end suite (issue #31), not here.
export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
