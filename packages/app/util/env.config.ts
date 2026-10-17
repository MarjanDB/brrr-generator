import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { z } from "zod/v4";

const envFile = path.resolve(import.meta.dirname, "..", ".env");
if (fs.existsSync(envFile)) {
	loadEnvFile(envFile);
}

export const APP_CONFIG = {
	Schema: z.object({
		PORT: z.string().transform(Number).default(3000),
		HOST: z.string().default("0.0.0.0"),

		NODE_ENV: z.enum(["development", "production"]).default("production"),

		NUXT_PUBLIC_POSTHOG_PUBLIC_KEY: z.string().optional(),
		NUXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
	}),

	resolve: () => {
		try {
			return APP_CONFIG.Schema.parse(process.env);
		} catch (error) {
			console.error("Configuration validation failed");
			throw error;
		}
	},
};

export type APP_CONFIG = z.output<typeof APP_CONFIG.Schema>;
