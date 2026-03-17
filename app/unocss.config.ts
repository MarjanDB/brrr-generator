import { defineConfig, presetIcons, presetWind4 } from "unocss";

function buttonShortcuts(colors: string[]) {
	return colors.flatMap((color): [string, string][] => [
		[
			`button-filled-${color}`,
			[
				`button-md bg-${color}-300 dark:bg-${color}-700`,
				`text-${color}-990 dark:text-${color}-10`,
				`hover:bg-${color}-350 dark:hover:bg-${color}-650`,
				`disabled:opacity-70`,
				`disabled:hover:bg-${color}-300 dark:disabled:hover:bg-${color}-700`,
			].join(" "),
		],
		[
			`button-inverse-${color}`,
			[
				`button-md bg-${color}-400 dark:bg-${color}-600`,
				`text-${color}-10 dark:text-${color}-990`,
				`hover:bg-${color}-450 dark:hover:bg-${color}-550`,
				`disabled:opacity-70`,
				`disabled:hover:bg-${color}-400 dark:disabled:hover:bg-${color}-600`,
			].join(" "),
		],
	]);
}

export default defineConfig({
	presets: [
		presetWind4({
			dark: "class",
			preflights: { theme: true },
		}),
		presetIcons({
			extraProperties: {
				display: "inline-block",
				"vertical-align": "middle",
			},
		}),
	],
	shortcuts: [
		// Layout
		["app-container", "min-h-screen max-w-screen bg-stale-50 dark:bg-stale-950"],
		["container-md", "max-w-screen-md mx-auto px-4"],

		// Typography
		["app-text", "text-stale-900 dark:text-stale-100"],
		["app-text-sm", "text-sm app-text"],
		["app-text-md", "text-base app-text"],
		["app-text-lg", "text-lg app-text"],
		["app-text-muted", "text-stale-550 dark:text-stale-450"],
		["text-h1", "text-3xl font-bold app-text"],
		["text-h3", "text-xl font-semibold app-text"],
		["text-h5", "text-base font-semibold app-text"],
		["text-body-sm", "text-sm app-text-muted"],
		["text-label", "text-sm font-medium app-text"],
		["text-caption", "text-xs app-text-muted"],
		["text-error", "text-xs text-error-600 dark:text-error-400"],

		// Card
		[
			"card",
			"bg-stale-100 dark:bg-stale-900 border border-stale-250 dark:border-stale-750 rounded-md",
		],
		["card-padding-md", "p-4"],

		// Input base
		[
			"input-base",
			"bg-stale-150 dark:bg-stale-850 text-stale-900 dark:text-stale-100 border border-stale-250 dark:border-stale-750 transition-colors hover:bg-stale-200 dark:hover:bg-stale-800 focus:outline-none focus:ring-2 focus:ring-secondary-600 dark:focus:ring-secondary-400 disabled:opacity-70 disabled:cursor-not-allowed",
		],
		[
			"input-error",
			"input-base border-error-500 dark:border-error-500 focus:ring-error-500 dark:focus:ring-error-500",
		],
		["input-md", "input-base px-3 py-2 text-base rounded-md"],
		["input-md-error", "input-error px-3 py-2 text-base rounded-md"],

		// Checkbox
		[
			"checkbox-base",
			"size-4.5 rounded-sm border border-stale-400 dark:border-stale-600 bg-stale-150 dark:bg-stale-850 transition-colors cursor-pointer data-[state=checked]:bg-secondary-600 dark:data-[state=checked]:bg-secondary-400 data-[state=checked]:border-secondary-600 dark:data-[state=checked]:border-secondary-400 focus:outline-none focus:ring-2 focus:ring-secondary-600 dark:focus:ring-secondary-400 disabled:opacity-70 disabled:cursor-not-allowed",
		],
		[
			"checkbox-error",
			"size-4.5 rounded-sm border border-error-500 dark:border-error-500 bg-stale-150 dark:bg-stale-850 transition-colors cursor-pointer data-[state=checked]:bg-error-600 dark:data-[state=checked]:bg-error-400 data-[state=checked]:border-error-600 dark:data-[state=checked]:border-error-400 focus:outline-none focus:ring-2 focus:ring-error-500 dark:focus:ring-error-500 disabled:opacity-70 disabled:cursor-not-allowed",
		],

		// Buttons
		["button", "transition-colors cursor-pointer disabled:cursor-not-allowed"],
		["button-sm", "button px-3 py-1.5 text-sm rounded-sm"],
		["button-md", "button px-4 py-2 text-base rounded-md"],
		["button-lg", "button px-5 py-2 text-lg rounded-md"],

		// Generated button variants
		...buttonShortcuts([
			"primary",
			"secondary",
			"accent",
			"neutral",
			"success",
			"error",
			"warning",
			"info",
		]),

		// Misc
		["state-loading", "opacity-70 cursor-wait"],
		[
			"alert-error",
			"p-4 rounded-md border bg-error-150 dark:bg-error-850 text-error-900 dark:text-error-100 border-error-300 dark:border-error-700",
		],
	],
	theme: {
		colors: Object.fromEntries(
			[
				"primary",
				"secondary",
				"accent",
				"neutral",
				"stale",
				"success",
				"warning",
				"error",
				"info",
			].map((name) => [
				name,
				Object.fromEntries(
					[
						10, 20, 30, 40, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700,
						750, 800, 850, 900, 950, 960, 970, 980, 990,
					].map((stop) => [stop, `var(--${name}-${stop})`]),
				),
			]),
		),
	},
});
