<script setup lang="ts">
const steps = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950] as const;

const proposed = {
	primary: {
		50: "#eee8d3", 100: "#e8e0c3", 150: "#e2d8b3", 200: "#dcd0a4", 250: "#d6c894",
		300: "#d1c085", 350: "#cbb875", 400: "#c5b065", 450: "#bfa856", 500: "#b9a046",
		550: "#a99340", 600: "#9a853a", 650: "#8a7734", 700: "#7a6a2e", 750: "#6b5c29",
		800: "#5b4f23", 850: "#4c411d", 900: "#3c3417", 950: "#2c2611",
	},
	secondary: {
		50: "#d7e2ea", 100: "#c8d8e3", 150: "#bacedc", 200: "#acc3d4", 250: "#9eb9cd",
		300: "#90afc6", 350: "#81a5be", 400: "#739bb7", 450: "#6590b0", 500: "#5786a8",
		550: "#4f7b9a", 600: "#48708c", 650: "#41647e", 700: "#39596f", 750: "#324e61",
		800: "#2b4253", 850: "#233745", 900: "#1c2c37", 950: "#152028",
	},
	accent: {
		50: "#dddee4", 100: "#d1d2db", 150: "#c5c6d1", 200: "#b9bac8", 250: "#acafbe",
		300: "#a0a3b5", 350: "#9497ab", 400: "#888ba2", 450: "#7c8098", 500: "#70748f",
		550: "#676a83", 600: "#5d6077", 650: "#54566b", 700: "#4a4d5f", 750: "#414353",
		800: "#373946", 850: "#2e2f3a", 900: "#24262e", 950: "#1b1c22",
	},
	neutral: {
		50: "#dfdfe2", 100: "#d4d4d7", 150: "#c9c9cd", 200: "#bebec3", 250: "#b2b3b8",
		300: "#a7a8ae", 350: "#9c9da4", 400: "#919299", 450: "#86878f", 500: "#7a7c85",
		550: "#707179", 600: "#66676e", 650: "#5b5c63", 700: "#515258", 750: "#47474d",
		800: "#3c3d41", 850: "#323336", 900: "#28282b", 950: "#1d1e20",
	},
	stale: {
		50: "#e3e2de", 100: "#d9d7d3", 150: "#cfcdc7", 200: "#c5c3bc", 250: "#bab8b0",
		300: "#b0aea5", 350: "#a6a499", 400: "#9c998e", 450: "#928f82", 500: "#888577",
		550: "#7d796d", 600: "#716e63", 650: "#666359", 700: "#5a584f", 750: "#4f4d45",
		800: "#43413a", 850: "#383630", 900: "#2c2b26", 950: "#21201c",
	},
	success: {
		50: "#d8e9df", 100: "#cae1d4", 150: "#bcd9c8", 200: "#aed2bd", 250: "#a1cab2",
		300: "#93c2a7", 350: "#85ba9b", 400: "#77b390", 450: "#6aab85", 500: "#5ca37a",
		550: "#54956f", 600: "#4c8865", 650: "#457a5b", 700: "#3d6c50", 750: "#355e46",
		800: "#2d513c", 850: "#264332", 900: "#1e3527", 950: "#16271d",
	},
	error: {
		50: "#ecd5d7", 100: "#e5c6c9", 150: "#dfb7ba", 200: "#d8a8ac", 250: "#d1999e",
		300: "#cb8a90", 350: "#c47c82", 400: "#bd6d73", 450: "#b75e65", 500: "#b04f57",
		550: "#a14850", 600: "#924248", 650: "#833b41", 700: "#75343a", 750: "#662e32",
		800: "#57272b", 850: "#482024", 900: "#391a1c", 950: "#2a1315",
	},
	warning: {
		50: "#ece4d5", 100: "#e5dbc6", 150: "#dfd1b7", 200: "#d8c8a8", 250: "#d1bf99",
		300: "#cbb58a", 350: "#c4ac7c", 400: "#bda26d", 450: "#b7995e", 500: "#b0904f",
		550: "#a18448", 600: "#927742", 650: "#836b3b", 700: "#755f34", 750: "#66532e",
		800: "#574727", 850: "#483b20", 900: "#392f1a", 950: "#2a2213",
	},
	info: {
		50: "#d7e0ea", 100: "#c8d6e3", 150: "#bacbdc", 200: "#acc0d4", 250: "#9eb5cd",
		300: "#90abc6", 350: "#81a0be", 400: "#7395b7", 450: "#658ab0", 500: "#5780a8",
		550: "#4f759a", 600: "#486a8c", 650: "#415f7e", 700: "#39546f", 750: "#324a61",
		800: "#2b3f53", 850: "#233445", 900: "#1c2937", 950: "#151f28",
	},
} as const;

const colorScales = [
	{ name: "primary" as const, label: "Primary — Pearl Beige" },
	{ name: "secondary" as const, label: "Secondary — Powder Blue" },
	{ name: "accent" as const, label: "Accent — Blue Slate" },
	{ name: "neutral" as const, label: "Neutral — Graphite (UI elements)" },
	{ name: "stale" as const, label: "Stale — Warm Graphite (backgrounds)" },
	{ name: "success" as const, label: "Success" },
	{ name: "error" as const, label: "Error" },
	{ name: "warning" as const, label: "Warning" },
	{ name: "info" as const, label: "Info" },
];
</script>

<template>
	<div class="flex flex-col gap-10 app-text py-8 px-6">
		<h1 class="text-2xl font-bold">Color Scale Comparison</h1>
		<p class="text-sm opacity-60">Current (top row) vs Proposed (bottom row). 19 stops, L 88% (50) → 12% (950).</p>

		<div
			v-for="scale in colorScales"
			:key="scale.name"
			class="flex flex-col gap-3"
		>
			<h2 class="text-sm font-semibold">{{ scale.label }}</h2>

			<!-- Current -->
			<div class="flex flex-col gap-1">
				<span class="text-xs opacity-40">Current</span>
				<div class="flex flex-row">
					<div
						v-for="step in steps"
						:key="step"
						class="flex flex-col items-center gap-1 flex-1"
					>
						<div
							class="w-full h-10 rounded-sm"
							:style="{ backgroundColor: `var(--${scale.name}-${step})` }"
						/>
						<span class="text-xs opacity-40">{{ step }}</span>
					</div>
				</div>
			</div>

			<!-- Proposed -->
			<div class="flex flex-col gap-1">
				<span class="text-xs opacity-40">Proposed</span>
				<div class="flex flex-row">
					<div
						v-for="step in steps"
						:key="step"
						class="flex flex-col items-center gap-1 flex-1"
					>
						<div
							class="w-full h-10 rounded-sm"
							:style="{ backgroundColor: proposed[scale.name][step] }"
						/>
						<span class="text-xs opacity-40">{{ step }}</span>
					</div>
				</div>
			</div>

			<!-- Text legibility test -->
			<div class="flex flex-row gap-1 flex-wrap">
				<div
					v-for="step in steps"
					:key="step"
					class="px-2 py-1 rounded text-xs font-mono"
					:style="{ backgroundColor: proposed[scale.name][step], color: step <= 450 ? proposed[scale.name][950] : proposed[scale.name][50] }"
				>
					{{ step }}
				</div>
			</div>

			<hr class="opacity-10" />
		</div>
	</div>
</template>
