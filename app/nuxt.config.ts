import { APP_CONFIG } from "./util/env.config";

const config = APP_CONFIG.resolve();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",

	devtools: { enabled: config.NODE_ENV === "development" },

	vite: {
		optimizeDeps: {
			include: ["buffer"],
		},
		define: {
			global: "globalThis",
		},
		plugins: [
			{
				name: "inject-buffer",
				transform(code, id) {
					if (id.includes("csv-stringify") && code.includes("Buffer")) {
						return `import { Buffer } from 'buffer';\n${code}`;
					}
				},
			},
		],
	},
	modules: ["@posthog/nuxt"],

	posthogConfig: {
		host: "https://eu.i.posthog.com",
		clientConfig: {
			defaults: "2026-01-30"
		}
	}
});
