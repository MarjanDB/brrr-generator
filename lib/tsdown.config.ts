import path from "path";
import { defineConfig } from "tsdown";

const tsconfigPath = path.resolve(import.meta.url, "tsconfig.json");

export default defineConfig({
	entry: "src/**/*.ts",
	dts: true,
	outDir: "dist",
	format: ["esm"],
	unbundle: true,
	clean: true,
	sourcemap: "inline",
	target: "esnext",
	tsconfig: tsconfigPath,
	deps: {
		skipNodeModulesBundle: true,
	},
});
