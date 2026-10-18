import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
	test: {
		// Every test runs inside Nuxt (happy-dom), so composables get their auto-imports and i18n.
		environment: "nuxt",
		environmentOptions: {
			nuxt: {
				// The tests render no pages, and OG images need SSR, which the test environment turns off.
				overrides: { ogImage: { enabled: false } },
			},
		},
		include: ["app/**/*.test.ts"],
		watch: false,
	},
});
