import path from "path";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const tsconfigPath = path.resolve(import.meta.dirname, "tsconfig.json");

export default defineConfig({
  plugins: [viteTsconfigPaths({ projects: [tsconfigPath] })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    watch: false,
    coverage: {
      provider: "v8",
      reporter: ["lcovonly"],
      reportsDirectory: "coverage",
    },
  },
});
