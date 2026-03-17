<script setup lang="ts">
const { $toggleTheme } = useNuxtApp();

const colorStops = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950];

const colors = [
	{ name: "primary",   filled: "button-filled-primary",   inverse: "button-inverse-primary"   },
	{ name: "secondary", filled: "button-filled-secondary", inverse: "button-inverse-secondary" },
	{ name: "accent",    filled: "button-filled-accent",    inverse: "button-inverse-accent"    },
	{ name: "neutral",   filled: "button-filled-neutral",   inverse: "button-inverse-neutral"   },
	{ name: "success",   filled: "button-filled-success",   inverse: "button-inverse-success"   },
	{ name: "error",     filled: "button-filled-error",     inverse: "button-inverse-error"     },
	{ name: "warning",   filled: "button-filled-warning",   inverse: "button-inverse-warning"   },
	{ name: "info",      filled: "button-filled-info",      inverse: "button-inverse-info"      },
];
</script>

<template>
	<div class="flex flex-col gap-5 app-text py-5">
		<div>
			<button type="button" class="button-filled-neutral" @click="$toggleTheme()">Toggle Theme</button>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Colors</h2>
			<div v-for="c in colors" :key="c.name" class="flex flex-row items-center gap-3">
				<span class="text-xs app-text-muted w-20 shrink-0">{{ c.name }}</span>
				<div class="flex flex-row flex-1">
					<div
						v-for="stop in colorStops"
						:key="stop"
						class="h-6 flex-1"
						:style="{ backgroundColor: `var(--${c.name}-${stop})` }"
					/>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Buttons</h2>
			<div v-for="c in colors" :key="c.name" class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-xs app-text-muted w-20">{{ c.name }}</span>
				<button type="button" :class="c.filled">filled</button>
				<button type="button" disabled :class="c.filled">disabled</button>
				<AppButton :class="c.filled" :loading="true">filled</AppButton>
				<button type="button" :class="c.inverse">inverse</button>
				<button type="button" disabled :class="c.inverse">disabled</button>
				<AppButton :class="c.inverse" :loading="true">inverse</AppButton>
			</div>
		</div>
	</div>
</template>
