import { defineConfig, presetIcons, presetWind4 } from "unocss";
import { ColorIntent } from "./app/types/ui";

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
		// Layout. Text is ink unless a role or a class says otherwise.
		["app-container", "min-h-screen max-w-screen bg-page text-ink"],
		["container-md", "max-w-screen-md mx-auto px-4"],

		// Surfaces & overlays
		["app-overlay", "bg-overlay"],
		["app-surface-overlay", "bg-page"],
		["app-surface-raised", "bg-surface-raised"],
		["app-surface-sunken", "bg-surface-hover"],
		["app-border", "border-edge"],
		["app-border-strong", "border-edge-strong"],
		["app-border-subtle", "border-edge-subtle"],
		// A broker or tax office logo keeps its published colours, which are made for a light page, so it
		// sits on a light tile. Its box is the logo plus the tile's padding.
		["logo-tile", "bg-surface-inverse p-1"],

		// Type: five roles, one family. Heading for a step's or an instrument's title, subheading for a
		// group, label for a field, a column or a small button, body for sentences and cells, meta for
		// identifiers, dates under a name and captions. No capitals, no letter spacing.
		["app-text", "text-ink"],
		["app-text-muted", "text-ink-muted"],
		["text-heading", "text-lg font-semibold"],
		["text-subheading", "text-sm font-semibold"],
		["text-label", "text-sm font-medium"],
		["text-body", "text-sm"],
		["text-meta", "text-xs text-ink-muted"],
		["text-error", "text-xs text-danger-ink"],

		// Card
		["card", "bg-surface border app-border-strong rounded-md"],
		["card-padding-md", "p-4"],

		// Tables: a step's own tables, and the denser ones inside a dialog. Cells leave their alignment
		// to the caller.
		["app-table", "w-full text-sm"],
		["app-table-head-row", "border-b app-border-strong"],
		["app-table-row", "border-b app-border last:border-0"],
		["app-table-th", "py-2 pr-4 font-medium app-text"],
		["app-table-td", "py-2 pr-4 app-text"],
		["app-table-head-row-dense", "border-b app-border"],
		["app-table-row-dense", "border-b app-border-subtle last:border-0"],
		["app-table-th-dense", "py-1.5 pr-3 font-medium app-text-muted"],
		["app-table-td-dense", "py-1.5 pr-3 app-text text-xs"],

		// Floating layers (reka-ui portals them to the body)
		[
			"tooltip-box",
			"z-50 max-w-80 whitespace-pre-line card px-2.5 py-1.5 text-xs shadow-md app-text select-none",
		],
		["menu-box", "z-50 min-w-40 card p-1 shadow-md"],
		[
			"menu-item",
			"flex items-center gap-2 h-8 px-3 text-sm rounded-sm cursor-pointer select-none outline-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
		],

		// A visible ring for keyboard focus, on anything that sets outline-none or draws its own focus.
		// The inset one is for a row or a tab, whose list clips what lies outside it.
		[
			"app-focus-ring",
			"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-edge",
		],
		[
			"app-focus-ring-inset",
			"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-edge",
		],

		// Controls. Every family has the same states: hover a step lighter, pressed a step darker, open
		// (aria-expanded) as hovered, keyboard focus the accent ring, disabled half faded and inert. A
		// size goes with a family: md (40 px) for forms and a step's main actions, sm (32 px) inside a
		// card, a popover or a table, icon (32 px square).
		[
			"control",
			"inline-flex items-center justify-center gap-2 whitespace-nowrap border cursor-pointer select-none transition-colors app-focus-ring disabled:opacity-50 disabled:pointer-events-none",
		],
		["control-md", "h-10 px-4 text-base rounded-md"],
		["control-sm", "h-8 px-3 text-sm font-medium rounded-sm"],
		["control-icon", "size-8 p-0 rounded-sm"],
		// The one filled button of a place.
		[
			"button-primary",
			"control bg-action text-action-on border-transparent hover:bg-action-hover active:bg-action-pressed",
		],
		// The others, on the surface with an edge. A picker (the tax year, a select) is one with a chevron;
		// pressed in, as a toggle, it takes the accent.
		[
			"button-secondary",
			"control bg-surface-raised text-ink border-edge-strong hover:bg-surface-hover active:bg-surface aria-expanded:bg-surface-hover aria-pressed:bg-accent-soft aria-pressed:border-accent-edge aria-pressed:text-accent-ink",
		],
		// Text or an icon, with no box until the pointer is on it. Pressed in, as a toggle, it takes the accent.
		[
			"button-quiet",
			"control bg-transparent text-ink-muted border-transparent hover:bg-surface-hover hover:text-ink active:bg-surface-raised active:text-ink aria-expanded:bg-surface-hover aria-expanded:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent-ink",
		],
		// Fields you type into show their focus on any focus, since that is where the caret is.
		[
			"field",
			"w-full h-10 px-3 text-base rounded-md bg-surface-raised text-ink border border-edge-strong transition-colors placeholder:text-ink-muted hover:border-ink-muted focus:outline-none focus:border-accent-edge focus:ring-1 focus:ring-accent-edge disabled:opacity-50 disabled:pointer-events-none",
		],
		["field-invalid", "!border-danger-edge focus:!ring-danger-edge"],
		[
			"checkbox",
			"size-4.5 rounded-sm border border-edge-strong bg-surface-raised transition-colors cursor-pointer hover:border-ink-muted data-[state=checked]:bg-accent-edge data-[state=checked]:border-accent-edge app-focus-ring disabled:opacity-50 disabled:pointer-events-none",
		],
		["checkbox-invalid", "!border-danger-edge"],

		// Rows to pick from (the instrument list, the tables under the timeline): square, tinted under the
		// pointer, and when selected tinted with the accent and a bar on their left, under the pointer too.
		[
			"row-selectable",
			"cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-raised",
		],
		[
			"row-selected",
			"cursor-pointer !bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent-edge)]",
		],

		// Misc
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
						[
							"DEFAULT",
							"hover",
							"pressed",
							"on",
							"soft",
							"soft-hover",
							"soft-pressed",
							"ink",
							"edge",
						].map((role) => [
							role,
							role === "DEFAULT" ? `var(--color-${intent})` : `var(--color-${intent}-${role})`,
						]),
					),
				]),
			),
		},
	},
});
