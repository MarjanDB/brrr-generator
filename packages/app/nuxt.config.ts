// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",

	// Devtools only ever start under `nuxt dev`; enabling them explicitly shows their floating button.
	devtools: { enabled: true },

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

	// The report flow's pages hold nothing worth indexing, and what they show exists only in the
	// browser: they render there alone. The landing page is rendered on the server.
	routeRules: {
		"/en/report/**": { ssr: false },
		"/sl/report/**": { ssr: false },
	},

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
			// The names are what the language switch shows.
			{ code: "en", language: "en-US", name: "🇬🇧 English", file: "en.json" },
			{ code: "sl", language: "sl-SI", name: "🇸🇮 Slovenščina", file: "sl.json" },
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
		// Each language gets its own copy of these.
		exclude: ["/report", "/report/**"],
	},

	posthogConfig: {
		clientConfig: {
			defaults: "2026-01-30",
		},
	},
});
