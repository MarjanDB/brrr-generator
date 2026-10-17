import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		// Vite resolves tsconfig `paths` natively since v8; vite-tsconfig-paths is no longer needed.
		tsconfigPaths: true,
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		globals: true,
		watch: false,
		setupFiles: [path.resolve(import.meta.dirname, "src/__tests__/support/Setup.ts")],
		coverage: {
			provider: "v8",
			reporter: ["json-summary", "json"],
			reportsDirectory: "coverage",
		},
	},
});
