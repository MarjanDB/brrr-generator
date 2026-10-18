import { APP_CONFIG } from "./util/env.config";

const config = APP_CONFIG.resolve();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",

	devtools: { enabled: config.NODE_ENV === "development" },

	vite: {
		build: {
			// The wizard page's chunk carries chart.js and the tax engine (~686 kB); the entry carries
			// PostHog and i18n (~509 kB). The download step is a lazy component, so its panel, timeline
			// and sentences load on their own after a report is generated. Kept just above the page
			// chunk so growth still warns.
			chunkSizeWarningLimit: 700,
		},
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

	ogImage: {
		zeroRuntime: true,
	},

	sitemap: {
		zeroRuntime: true,
	},

	posthogConfig: {
		clientConfig: {
			defaults: "2026-01-30",
		},
	},
});
