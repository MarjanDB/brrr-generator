// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
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
});
