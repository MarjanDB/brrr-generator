import { defineConfig, presetIcons, presetWind4 } from "unocss";

function buttonShortcuts(colors: string[]) {
	return colors.flatMap((color): [string, string][] => [
		[
			`button-filled-${color}`,
			[
				`button-md bg-${color}-300`,
				`text-${color}-990`,
				`hover:bg-${color}-350`,
				`disabled:opacity-70`,
				`disabled:hover:bg-${color}-300`,
			].join(" "),
		],
		[
			`button-inverse-${color}`,
			[
				`button-md bg-${color}-400`,
				`text-${color}-10`,
				`hover:bg-${color}-450`,
				`disabled:opacity-70`,
				`disabled:hover:bg-${color}-400`,
			].join(" "),
		],
	]);
}

export default defineConfig({
	presets: [
		presetWind4({
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
		["app-container", "min-h-screen max-w-screen bg-stale-50"],
		["container-md", "max-w-screen-md mx-auto px-4"],

		// Surfaces & overlays
		["app-overlay", "bg-black/40"],
		["app-surface-overlay", "bg-stale-50"],
		["app-border", "border-stale-200"],
		["app-border-strong", "border-stale-250"],
		["app-border-subtle", "border-stale-100"],
		["app-row-interactive", "cursor-pointer hover:bg-stale-100 transition-colors"],

		// Typography
		["app-text", "text-stale-900"],
		["app-text-sm", "text-sm app-text"],
		["app-text-md", "text-base app-text"],
		["app-text-lg", "text-lg app-text"],
		["app-text-muted", "text-stale-550"],
		["text-h1", "text-3xl font-bold app-text"],
		["text-h3", "text-xl font-semibold app-text"],
		["text-h5", "text-base font-semibold app-text"],
		["text-body-sm", "text-sm app-text-muted"],
		["text-label", "text-sm font-medium app-text"],
		["text-caption", "text-xs app-text-muted"],
		["text-error", "text-xs text-error-600"],
		["text-icon-confirm", "text-secondary-600"],

		// Card
		["card", "bg-stale-100 border app-border-strong rounded-md"],
		["card-padding-md", "p-4"],

		// Input base
		[
			"input-base",
			"bg-stale-150 text-stale-900 border border-stale-250 transition-colors hover:bg-stale-200 focus:outline-none focus:ring-2 focus:ring-secondary-600 disabled:opacity-70 disabled:cursor-not-allowed",
		],
		["input-error", "input-base border-error-500 focus:ring-error-500"],
		["input-md", "input-base px-3 py-2 text-base rounded-md"],
		["input-md-error", "input-error px-3 py-2 text-base rounded-md"],

		// Checkbox
		[
			"checkbox-base",
			"size-4.5 rounded-sm border border-stale-400 bg-stale-150 transition-colors cursor-pointer data-[state=checked]:bg-secondary-600 data-[state=checked]:border-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-600 disabled:opacity-70 disabled:cursor-not-allowed",
		],
		[
			"checkbox-error",
			"size-4.5 rounded-sm border border-error-500 bg-stale-150 transition-colors cursor-pointer data-[state=checked]:bg-error-600 data-[state=checked]:border-error-600 focus:outline-none focus:ring-2 focus:ring-error-500 disabled:opacity-70 disabled:cursor-not-allowed",
		],

		// Buttons
		["button", "transition-colors cursor-pointer disabled:cursor-not-allowed"],
		["button-sm", "button px-3 py-1.5 text-sm rounded-sm"],
		["button-md", "button px-4 py-2 text-base rounded-md"],
		["button-lg", "button px-5 py-2 text-lg rounded-md"],

		["button-ghost", "button rounded app-text-muted hover:app-text hover:bg-neutral-100/50"],

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
		["alert-error", "p-4 rounded-md border bg-error-150 text-error-900 border-error-300"],
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
