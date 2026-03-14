import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@brrr": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
});
