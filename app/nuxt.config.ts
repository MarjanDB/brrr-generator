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
	components: [{ path: "~/components", pathPrefix: false }],

	modules: [
		"@posthog/nuxt",
		"@unocss/nuxt",
		"@vueuse/nuxt",
		"reka-ui/nuxt",
		"@nuxtjs/i18n",
		"@nuxtjs/seo",
	],

	css: ["~/assets/styles.css"],

	app: {
		head: {
			script: [
				{
					innerHTML: `(function(){var m=document.cookie.match(/(?:^|;\\s*)color-scheme=([^;]*)/);var s=m?m[1]:null;var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s!=='light'&&prefersDark)){document.documentElement.classList.add('dark')}})()`,
					tagPosition: "head",
				},
			],
		},
	},

	i18n: {
		strategy: "prefix",
		locales: [
			{ code: "en", language: "en-US", name: "English", file: "en.json" },
			{ code: "sl", language: "sl-SI", name: "Slovenščina", file: "sl.json" },
		],
		defaultLocale: "en",
		langDir: "locales",
	},

	site: {
		url: "https://taxesgobrrr.com",
		name: "BRRR Generator",
		description: "Generate Tax Authority import forms using your broker's export files",
	},

	posthogConfig: {
		clientConfig: {
			defaults: "2026-01-30",
		},
	},
});
