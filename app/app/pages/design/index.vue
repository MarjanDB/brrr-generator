<script setup lang="ts">
const { $toggleTheme } = useNuxtApp();

const colors = [
	{ name: "primary",   filled: "btn-filled-primary",   subtle: "btn-subtle-primary"   },
	{ name: "secondary", filled: "btn-filled-secondary", subtle: "btn-subtle-secondary" },
	{ name: "accent",    filled: "btn-filled-accent",    subtle: "btn-subtle-accent"    },
	{ name: "neutral",   filled: "btn-filled-neutral",   subtle: "btn-subtle-neutral"   },
	{ name: "success",   filled: "btn-filled-success",   subtle: "btn-subtle-success"   },
	{ name: "error",     filled: "btn-filled-error",     subtle: "btn-subtle-error"     },
	{ name: "warning",   filled: "btn-filled-warning",   subtle: "btn-subtle-warning"   },
	{ name: "info",      filled: "btn-filled-info",      subtle: "btn-subtle-info"      },
];
</script>

<template>
	<div class="flex flex-col gap-5 app-text py-5">
		<div>
			<button type="button" class="btn-subtle-neutral" @click="$toggleTheme()">Toggle Theme</button>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Buttons</h2>
			<div v-for="c in colors" :key="c.name" class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-xs app-text-muted w-20">{{ c.name }}</span>
				<button type="button" :class="c.filled">filled</button>
				<button type="button" disabled :class="c.filled">disabled</button>
				<button type="button" :class="c.subtle">subtle</button>
				<button type="button" disabled :class="c.subtle">disabled</button>
			</div>
		</div>
	</div>
</template>
