<script setup lang="ts">
const { $toggleTheme } = useNuxtApp();
</script>

<template>
	<div class="flex flex-col gap-5 app-text py-5">
		<div>
			<button type="button" class="button-primary" @click="$toggleTheme()">Toggle Theme</button>
		</div>

		<div class="flex flex-col gap-2 b-1 p-5">
			<h2 class="text-h3">Buttons</h2>

			<div class="flex flex-row gap-5 items-start">
				<button type="button" class="button-primary">Primary</button>
				<button type="button" disabled="true" class="button-primary">Primary Disabled</button>
			</div>

			<div class="flex flex-row gap-5 items-center">
				<button type="button" class="button-lg bg-neutral-500">Large</button>
				<button type="button" class="button-md bg-neutral-500">Medium</button>
				<button type="button" class="button-sm bg-neutral-500">Small</button>
			</div>
		</div>
	</div>
</template>
