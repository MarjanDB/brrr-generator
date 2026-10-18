import { defineConfig, presetIcons, presetWind4 } from "unocss";
import { ColorIntent } from "./app/types/ui";

function buttonShortcuts() {
	return Object.values(ColorIntent).map((color): [string, string] => [
		`button-filled-${color}`,
		[
			`button-md bg-${color} text-${color}-on`,
			`hover:bg-${color}-hover`,
			`disabled:opacity-70`,
			`disabled:hover:bg-${color}`,
		].join(" "),
	]);
}

export default defineConfig({
	content: {
		pipeline: {
			// UnoCSS's default list plus the app's TypeScript, whose class maps (`utils/nodeLook.ts`)
			// aren't in a .vue file.
			include: [
				/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
				/app\/(utils|composables)\/.*\.ts($|\?)/,
			],
		},
	},
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
		["app-container", "min-h-screen max-w-screen bg-page"],
		["container-md", "max-w-screen-md mx-auto px-4"],

		// Surfaces & overlays
		["app-overlay", "bg-overlay"],
		["app-surface-overlay", "bg-page"],
		["app-surface-raised", "bg-surface-raised"],
		["app-surface-sunken", "bg-surface-hover"],
		["app-border", "border-edge"],
		["app-border-strong", "border-edge-strong"],
		["app-border-subtle", "border-edge-subtle"],
		["app-row-interactive", "cursor-pointer hover:bg-surface-hover transition-colors"],

		// Typography
		["app-text", "text-ink"],
		["app-text-sm", "text-sm app-text"],
		["app-text-md", "text-base app-text"],
		["app-text-lg", "text-lg app-text"],
		["app-text-muted", "text-ink-muted"],
		["text-h1", "text-3xl font-bold app-text"],
		["text-h3", "text-xl font-semibold app-text"],
		["text-h5", "text-base font-semibold app-text"],
		["text-body-sm", "text-sm app-text-muted"],
		["text-label", "text-sm font-medium app-text"],
		["text-caption", "text-xs app-text-muted"],
		["text-error", "text-xs text-danger-ink"],
		["text-icon-confirm", "text-accent-edge"],

		// Card
		["card", "bg-surface border app-border-strong rounded-md"],
		["card-padding-md", "p-4"],

		// Floating layers (reka-ui portals them to the body)
		[
			"tooltip-box",
			"z-50 px-2.5 py-1.5 rounded-md text-xs bg-surface-inverse text-ink-inverse shadow-md select-none",
		],

		// Input base
		[
			"input-base",
			"bg-surface-raised text-ink border border-edge-strong transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent-edge disabled:opacity-70 disabled:cursor-not-allowed",
		],
		["input-error", "input-base border-danger-edge focus:ring-danger-edge"],
		["input-md", "input-base px-3 py-2 text-base rounded-md"],
		["input-md-error", "input-error px-3 py-2 text-base rounded-md"],

		// Checkbox
		[
			"checkbox-base",
			"size-4.5 rounded-sm border border-edge-strong bg-surface-raised transition-colors cursor-pointer data-[state=checked]:bg-accent-edge data-[state=checked]:border-accent-edge focus:outline-none focus:ring-2 focus:ring-accent-edge disabled:opacity-70 disabled:cursor-not-allowed",
		],
		[
			"checkbox-error",
			"size-4.5 rounded-sm border border-danger-edge bg-surface-raised transition-colors cursor-pointer data-[state=checked]:bg-danger-edge data-[state=checked]:border-danger-edge focus:outline-none focus:ring-2 focus:ring-danger-edge disabled:opacity-70 disabled:cursor-not-allowed",
		],

		// A visible ring for keyboard focus, on anything that sets outline-none or draws its own focus
		[
			"app-focus-ring",
			"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-edge",
		],

		// Buttons
		["button", "transition-colors cursor-pointer disabled:cursor-not-allowed"],
		["button-sm", "button px-3 py-1.5 text-sm rounded-sm"],
		["button-md", "button px-4 py-2 text-base rounded-md"],
		["button-lg", "button px-5 py-2 text-lg rounded-md"],

		["button-ghost", "button rounded app-text-muted hover:app-text hover:bg-surface-hover/50"],

		// Generated button variants: button-filled-<intent>
		...buttonShortcuts(),

		// Misc
		["state-loading", "opacity-70 cursor-wait"],
		["alert-error", "p-4 rounded-md border bg-danger-soft text-danger-ink border-danger"],
	],
	theme: {
		colors: {
			page: "var(--color-page)",
			surface: {
				DEFAULT: "var(--color-surface)",
				raised: "var(--color-surface-raised)",
				hover: "var(--color-surface-hover)",
				inverse: "var(--color-surface-inverse)",
			},
			ink: {
				DEFAULT: "var(--color-ink)",
				muted: "var(--color-ink-muted)",
				inverse: "var(--color-ink-inverse)",
			},
			edge: {
				DEFAULT: "var(--color-edge)",
				strong: "var(--color-edge-strong)",
				subtle: "var(--color-edge-subtle)",
			},
			overlay: "var(--color-overlay)",
			...Object.fromEntries(
				Object.values(ColorIntent).map((intent) => [
					intent,
					Object.fromEntries(
						["DEFAULT", "hover", "on", "soft", "ink", "edge"].map((role) => [
							role,
							role === "DEFAULT" ? `var(--color-${intent})` : `var(--color-${intent}-${role})`,
						]),
					),
				]),
			),
		},
	},
});
