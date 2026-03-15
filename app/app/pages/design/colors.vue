<script setup lang="ts">
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const proposed = {
	primary: {
		50: "#fec3bf", 100: "#fea5a0", 200: "#f58985", 300: "#e96e6c",
		400: "#d95455", 500: "#c63c41", 600: "#b02630", 700: "#971322",
		800: "#7e0116", 900: "#62000e", 950: "#470007",
	},
	secondary: {
		50: "#a3e2e3", 100: "#89cfd0", 200: "#6ebcbd", 300: "#53aaab",
		400: "#379799", 500: "#188487", 600: "#057173", 700: "#035e5f",
		800: "#004b4c", 900: "#00393a", 950: "#002829",
	},
	accent: {
		50: "#c7d7e0", 100: "#b2c3cd", 200: "#9db0ba", 300: "#899da8",
		400: "#768a96", 500: "#637883", 600: "#526671", 700: "#42545e",
		800: "#33434c", 900: "#25333b", 950: "#17242a",
	},
	success: {
		50: "#b4e2b8", 100: "#95d29b", 200: "#75c27d", 300: "#53b160",
		400: "#2da045", 500: "#088d31", 600: "#057829", 700: "#026320",
		800: "#004f17", 900: "#003d0f", 950: "#002b07",
	},
	error: {
		50: "#fec3c1", 100: "#fea4a2", 200: "#fb8484", 300: "#f0676a",
		400: "#e14a53", 500: "#ce2e3e", 600: "#b7102d", 700: "#9a0423",
		800: "#7d011a", 900: "#620011", 950: "#470009",
	},
	warning: {
		50: "#e1d3b5", 100: "#d0be9a", 200: "#c0aa7e", 300: "#af9662",
		400: "#9e8348", 500: "#8d702f", 600: "#7b5e18", 700: "#684d01",
		800: "#533d00", 900: "#402d00", 950: "#2e1f00",
	},
	info: {
		50: "#bad6fe", 100: "#99c3fe", 200: "#76aefe", 300: "#5199fd",
		400: "#2482fc", 500: "#056fe5", 600: "#035ec4", 700: "#014da4",
		800: "#003d86", 900: "#002e69", 950: "#001f4e",
	},
	neutral: {
		50: "#cdd6db", 100: "#b9c2c7", 200: "#a6aeb3", 300: "#939ba0",
		400: "#80888d", 500: "#6e767a", 600: "#5c6468", 700: "#4b5357",
		800: "#3b4246", 900: "#2b3236", 950: "#1c2326",
	},
} as const;

const colorScales = [
	{ name: "primary" as const, label: "Primary — Vibrant Coral" },
	{ name: "secondary" as const, label: "Secondary — Stormy Teal" },
	{ name: "accent" as const, label: "Accent — Platinum blue-gray" },
	{ name: "success" as const, label: "Success" },
	{ name: "error" as const, label: "Error" },
	{ name: "warning" as const, label: "Warning" },
	{ name: "info" as const, label: "Info" },
	{ name: "neutral" as const, label: "Neutral" },
];
</script>

<template>
	<div class="flex flex-col gap-10 app-text py-8 px-6">
		<h1 class="text-2xl font-bold">Color Scale Comparison</h1>
		<p class="text-sm opacity-60">Current (top row) vs Proposed (bottom row). Proposed scales use OKLCH with compressed lightness range (L 0.195–0.925) and saturation-boosted extremes.</p>

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
							class="w-full h-14 rounded-sm"
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
							class="w-full h-14 rounded-sm"
							:style="{ backgroundColor: proposed[scale.name][step] }"
						/>
						<span class="text-xs opacity-40">{{ step }}</span>
					</div>
				</div>
			</div>

			<!-- Text legibility test -->
			<div class="flex flex-row gap-2 flex-wrap">
				<div
					v-for="step in steps"
					:key="step"
					class="px-2 py-1 rounded text-xs font-mono"
					:style="{ backgroundColor: proposed[scale.name][step], color: step <= 400 ? proposed[scale.name][900] : proposed[scale.name][50] }"
				>
					{{ step }}
				</div>
			</div>

			<hr class="opacity-10" />
		</div>
	</div>
</template>
