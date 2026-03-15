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
	modules: ["@posthog/nuxt", "@unocss/nuxt", "@vueuse/nuxt"],

	css: ["~/assets/styles.css"],

	app: {
		head: {
			script: [
				{
					innerHTML: `(function(){var s=localStorage.getItem('vueuse-color-scheme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s!=='light'&&prefersDark)){document.documentElement.classList.add('dark')}})()`,
					tagPosition: "head",
				},
			],
		},
	},

	posthogConfig: {
		clientConfig: {
			defaults: "2026-01-30",
		},
	},
});
