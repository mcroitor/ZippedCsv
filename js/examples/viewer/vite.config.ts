import { defineConfig, Plugin } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vite inline plugin that stubs Node.js `fs` built-in so that Csv.load()
 * and Csv.save() (which are never called in the browser) don't prevent
 * bundling. All browser-side code only uses loadFromString() / toString().
 */
function nodeStubPlugin(): Plugin {
  return {
    name: "node-stubs",
    resolveId(id: string) {
      if (id === "fs") return "\0virtual:fs";
      return undefined;
    },
    load(id: string) {
      if (id === "\0virtual:fs") {
        return `
          export const readFileSync = () => "";
          export const writeFileSync = () => {};
          export const existsSync = () => false;
          export const mkdirSync = () => {};
          export default { readFileSync, writeFileSync, existsSync, mkdirSync };
        `;
      }
      return undefined;
    },
  };
}

export default defineConfig({
  root: __dirname,
  build: {
    outDir: `${__dirname}/dist`,
    emptyOutDir: true,
  },
  plugins: [nodeStubPlugin()],
});
