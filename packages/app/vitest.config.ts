import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"~~": import.meta.dirname,
			"~": path.resolve(import.meta.dirname, "app"),
		},
	},
	test: {
		environment: "node",
		include: ["app/**/*.test.ts"],
		watch: false,
	},
});
